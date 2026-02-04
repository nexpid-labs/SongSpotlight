import { deferReply, editReply } from "api/bot/rest";
import { FmtUser, PartialUser, quietFlags } from "api/bot/utils";
import {
	APIChatInputApplicationCommandInteraction,
	APIMessageComponentButtonInteraction,
} from "discord-api-types/v10";
import { ApiUserData, getUserData } from "lib/db";

export async function viewRaw(
	interaction: APIMessageComponentButtonInteraction | APIChatInputApplicationCommandInteraction,
	author: FmtUser,
	user: FmtUser | PartialUser,
	quiet?: boolean,
) {
	await deferReply(interaction, quietFlags(quiet));

	const who = author.id === user.id ? "your" : user.name ? `**${user.name}**'s` : "their";

	let userData: ApiUserData;
	try {
		userData = await getUserData(user.id);
	} catch {
		return await editReply(interaction, {
			content: `❌ Failed to fetch ${who} Song Spotlight! Please try again later.`,
		});
	}

	return await editReply(interaction, {
		content: `Here is ${who} Song Spotlight data as raw JSON:\`\`\`json\n${
			JSON.stringify(userData.data)
		}\`\`\``,
	});
}
