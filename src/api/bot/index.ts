import {
	isChatInputApplicationCommandInteraction,
	isContextMenuApplicationCommandInteraction,
	isMessageComponentButtonInteraction,
} from "discord-api-types/utils";
import {
	type APIInteraction,
	APIInteractionResponse,
	APITextDisplayComponent,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
} from "discord-api-types/v10";
import { verifyKey } from "discord-interactions";
import { Context, Hono } from "hono";
import { HttpStatus } from "lib/http-status";

import { viewRaw } from "./commands/raw";
import { viewSongs } from "./commands/view";
import { fmtUser, getOption, okResponse } from "./utils";

function showMessage(c: Context, content: string) {
	return c.json(
		{
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content,
				flags: MessageFlags.Ephemeral,
			},
		} satisfies APIInteractionResponse,
	);
}

function handle(c: Context, response: unknown): Response {
	if (response instanceof Response) return response;
	else return okResponse(c);
}

const bot = new Hono<{ Bindings: Env }>();

bot.post("/interaction", async (c) => {
	if (!c.env.CLIENT_TOKEN || !c.env.PUBLIC_KEY) {
		return c.text("Bot is not enabled", HttpStatus.BAD_REQUEST);
	}

	const signature = c.req.header("X-Signature-Ed25519");
	const timestamp = c.req.header("X-Signature-Timestamp");
	if (!signature || !timestamp) return c.text("Bad request", HttpStatus.BAD_REQUEST);

	const body = await c.req.text();
	const valid = await verifyKey(body, signature, timestamp, c.env.PUBLIC_KEY);
	if (!valid) return c.text("Unauthorized", HttpStatus.UNAUTHORIZED);

	const interaction = JSON.parse(body) as APIInteraction;
	if (interaction.type === InteractionType.Ping) {
		return c.json(
			{
				type: InteractionResponseType.Pong,
			} satisfies APIInteractionResponse,
		);
	}

	const author = fmtUser(interaction.user, interaction.member);
	if (!author) return showMessage(c, "❌ Unknown author");

	if (interaction.type === InteractionType.ApplicationCommand) {
		if (isChatInputApplicationCommandInteraction(interaction)) {
			if (interaction.data.name === "songspotlight") {
				const { options, resolved } = interaction.data;

				const quiet = getOption(options, ApplicationCommandOptionType.Boolean, "quiet")?.value;

				let user = author;
				const target = getOption(options, ApplicationCommandOptionType.User, "user")?.value;
				if (target) {
					const maybeUser = fmtUser(
						resolved?.users?.[target],
						resolved?.members?.[target],
					);
					if (!maybeUser) return showMessage(c, "❌ Unknown user");

					user = maybeUser;
				}

				const raw = getOption(options, ApplicationCommandOptionType.Boolean, "raw")?.value;
				if (raw) return handle(c, await viewRaw(interaction, author, user, quiet));

				return handle(
					c,
					await viewSongs(
						interaction,
						author,
						user,
						quiet,
					),
				);
			} else {
				return showMessage(c, "❌ Unknown command");
			}
		} else if (isContextMenuApplicationCommandInteraction(interaction)) {
			if (interaction.data.name === "View Song Spotlight") {
				if (interaction.data.type !== ApplicationCommandType.User) {
					return showMessage(c, "Unknown context menu");
				}

				const { resolved } = interaction.data;

				const user = fmtUser(
					resolved?.users?.[interaction.data.target_id],
					resolved?.members?.[interaction.data.target_id],
				);
				if (!user) return showMessage(c, "❌ Unknown user");

				return handle(c, await viewSongs(interaction, author, user));
			} else {
				return showMessage(c, "❌ Unknown context menu");
			}
		}
	} else if (interaction.type === InteractionType.MessageComponent) {
		if (isMessageComponentButtonInteraction(interaction)) {
			const [foo, bar] = interaction.data.custom_id.split("-");
			if (foo === "raw" && bar) {
				const user = bar === author.id ? author : undefined;

				// cursed
				const name = (interaction.message.components?.[0] as APITextDisplayComponent)?.content
					?.match(/^# (.*?)'s Song Spotlight\n/)?.[1];

				return handle(
					c,
					await viewRaw(interaction, author, user ?? { id: bar, name }, true),
				);
			} else if (foo === "edit") {
				if (bar !== author.id) return showMessage(c, "This button isn't for you");

				return showMessage(
					c,
					"To edit your Song Spotlight songs, use the [**Vencord plugin**](<https://vencord.dev/plugins/SongSpotlight> \"this doesn't exist yet\") or install the [**Revenge plugin**](<https://revenge.nexpid.xyz/song-spotlight>)! <:blobcatcozy:1468372941858410546>",
				);
			}

			return showMessage(c, "❌ Unknown button");
		}
	} else {
		return showMessage(c, "❌ Unknown interaction type");
	}

	return showMessage(c, "❌ Unknown interaction");
});

export default bot;
