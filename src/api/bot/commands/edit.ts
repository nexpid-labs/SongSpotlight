import {
	APIInteractionResponse,
	APIMessageComponentButtonInteraction,
	APIMessageComponentSelectMenuInteraction,
	APIUser,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { Context } from "hono";
import { ApiUserData, getUserData } from "lib/db";

async function getData(id: string): Promise<ApiUserData | null> {
	return await getUserData(id).catch(() => null);
}

export async function editSongs(
	c: Context,
	interaction: APIMessageComponentButtonInteraction | APIMessageComponentSelectMenuInteraction,
	user: APIUser,
	selected: number,
) {
	return c.json({
		type: InteractionResponseType.DeferredChannelMessageWithSource,
		data: {
			flags: MessageFlags.Ephemeral,
		},
	} as APIInteractionResponse);
}
