import { renderSong } from "@song-spotlight/api/handlers";
import { callLastFm, isLastFmSupported } from "api/bot/lastfm";
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
		const adminAbuse = at === new Date(0).toISOString();
		components.push({
			type: ComponentType.TextDisplay,
			content: lines([
				`# ${user.name}'s Song Spotlight`,
				adminAbuse
					? `-# Last updated by a moderator`
					: `-# Last updated <t:${Math.floor(new Date(at).getTime() / 1000)}:F>`,
			]),
		});

		for (const { song, render } of renders) {
			const isUser = ["user", "artist"].includes(song.type);
			const isAlbum = song.type === "album"
				|| (song.service === "soundcloud" && song.type === "playlist");
			const isTrack = ["song", "track"].includes(song.type);

			let scrobbles = 0;
			if (isLastFmSupported()) {
				if (isUser) {
					scrobbles = await callLastFm("artist.getInfo", {
						artist: render.label,
					}).then(x => x.ok ? Number(x.data.artist.stats.playcount) : 0).catch(() => 0);
				} else if (isAlbum) {
					scrobbles = await callLastFm("album.getInfo", {
						album: render.label,
						artist: render.sublabel,
					}).then(x => x.ok ? Number(x.data.album.playcount) : 0).catch(() => 0);
				} else if (isTrack) {
					scrobbles = await callLastFm("track.getInfo", {
						track: render.label,
						artist: render.sublabel,
					}).then(x => x.ok ? Number(x.data.track.playcount) : 0).catch(() => 0);
				}
			}

			components.push({
				type: ComponentType.Container,
				components: [
					textOrSection(
						{
							type: ComponentType.TextDisplay,
							content: lines([
								`### [${clamp(render.label)}](${render.link}) ${serviceEmojis[song.service]}`,
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
					{
						type: ComponentType.TextDisplay,
						content: [
							render.form === "single" && render.single.audio?.duration
							&& `\`${formatDurationMs(render.single.audio.duration)}\``,
							render.form === "list"
							&& `**${render.list.length.toLocaleString("en-US")}** track${
								render.list.length !== 1 ? "s" : ""
							}`,
							scrobbles
							&& `**${scrobbles.toLocaleString("en-US")}** scrobble${scrobbles !== 1 ? "s" : ""}`,
						].filter(x => !!x).join(" ・ "),
					} as APITextDisplayComponent,
				].filter(x => !!x),
			});
		}

		if (renders.length !== data.length) {
			const i = data.length - renders.length;
			components.push({
				type: ComponentType.TextDisplay,
				content: `-# ⚠️ **${i.toLocaleString("en-US")}** song${
					i !== 1 ? "s" : ""
				} failed to load and ${i === 1 ? "isn't" : "aren't"} being displayed`,
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
