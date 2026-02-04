import { rebuildLink, renderSong } from "@song-spotlight/api/handlers";
import { deferReply, editReply } from "api/bot/rest";
import { FmtUser, lines, quietFlags, textOrSection } from "api/bot/utils";
import {
	APIButtonComponent,
	APIChatInputApplicationCommandInteraction,
	APIContextMenuInteraction,
	APIMessageTopLevelComponent,
	APITextDisplayComponent,
	ButtonStyle,
	ComponentType,
	MessageFlags,
} from "discord-api-types/v10";
import { ApiUserData, getUserData } from "lib/db";

const serviceEmojis = {
	spotify: "<:spotifyicon:1468330196414369905>",
	soundcloud: "<:soundcloudicon:1468330194971394339>",
	applemusic: "<:applemusicicon:1468330193688199250>",
} as Record<string, string>;

export function formatDurationMs(ms: number) {
	const secs = Math.floor(ms / 1000);
	return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
}

function clamp(text: string) {
	return text.length > 100 ? `${text.slice(0, 99)}…` : text;
}

export async function viewSongs(
	interaction: APIChatInputApplicationCommandInteraction | APIContextMenuInteraction,
	author: FmtUser,
	user: FmtUser,
	quiet?: boolean,
) {
	await deferReply(interaction, quietFlags(quiet));

	let userData: ApiUserData;
	try {
		userData = await getUserData(user.id);
	} catch {
		return await editReply(interaction, {
			content: `❌ Failed to fetch ${
				author.id === user.id ? "your" : `**${user.name}**'s`
			} Song Spotlight! Please try again later.`,
		});
	}

	const { data, at } = userData;
	const renders = await Promise.allSettled(
		data.map((song) => renderSong(song).then(render => render ? { song, render } : null)),
	).then(renders => renders.map(x => x.status === "fulfilled" && x.value).filter(x => !!x));

	const components: APIMessageTopLevelComponent[] = [];
	if (!data[0]) {
		components.push({
			type: ComponentType.TextDisplay,
			content: `Looks like ${
				author.id === user.id
					? "you don't"
					: `**${user.name}** doesn't`
			} have any Song Spotlight songs added!`,
		});
	} else {
		components.push({
			type: ComponentType.TextDisplay,
			content: lines([
				`# ${user.name}'s Song Spotlight`,
				`-# Last updated <t:${Math.floor(new Date(at).getTime() / 1000)}:F>`,
			]),
		});

		for (const { song, render } of renders) {
			const isUser = ["user", "artist"].includes(song.type);
			const extra = render.form === "single" && render.single.audio?.duration
				? `\`${formatDurationMs(render.single.audio.duration)}\``
				: render.form === "list"
					&& `${render.list.length} track${render.list.length !== 1 ? "s" : ""}`;

			components.push({
				type: ComponentType.Container,
				components: [
					textOrSection(
						{
							type: ComponentType.TextDisplay,
							content: lines([
								`### [${clamp(render.label)}](${await rebuildLink(song)}) ${
									serviceEmojis[song.service]
								}`,
								isUser ? clamp(render.sublabel) : `by **${clamp(render.sublabel)}**`,
							]),
						},
						render.thumbnailUrl
							? {
								type: ComponentType.Thumbnail,
								media: {
									url: render.thumbnailUrl,
								},
							}
							: undefined,
					),
					extra
						? {
							type: ComponentType.TextDisplay,
							content: extra,
						} as APITextDisplayComponent
						: undefined,
				].filter(x => !!x),
			});
		}

		if (renders.length !== data.length) {
			const i = data.length - renders.length;
			components.push({
				type: ComponentType.TextDisplay,
				content: `-# ${i} song${i !== 1 ? "s" : ""} failed to load and ${
					i === 1 ? "isn't" : "aren't"
				} being displayed`,
			});
		}
	}

	const buttons: APIButtonComponent[] = [];
	if (data[0]) {
		buttons.push({
			type: ComponentType.Button,
			label: "View raw JSON",
			custom_id: `raw-${user.id}`,
			style: ButtonStyle.Secondary,
		});
	}
	if (author.id === user.id) {
		buttons.push({
			type: ComponentType.Button,
			label: "Edit songs",
			style: ButtonStyle.Secondary,
			custom_id: `edit-${user.id}`,
		});
	}

	if (buttons[0]) {
		components.push({
			type: ComponentType.ActionRow,
			components: buttons,
		});
	}

	await editReply(interaction, {
		components,
		allowed_mentions: {
			parse: [],
		},
		flags: MessageFlags.IsComponentsV2,
	});
}
