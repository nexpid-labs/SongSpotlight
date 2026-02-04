import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	RESTPostAPIApplicationCommandsJSONBody,
	RouteBases,
	Routes,
} from "discord-api-types/v10";

const { CLIENT_ID, CLIENT_TOKEN } = process.env;

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
	{
		type: ApplicationCommandType.ChatInput,
		name: "songspotlight",
		description: "View someone's Song Spotlight",
		options: [{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "Who to check",
			required: false,
		}, {
			type: ApplicationCommandOptionType.Boolean,
			name: "raw",
			description: "View raw JSON data",
			required: false,
		}, {
			type: ApplicationCommandOptionType.Boolean,
			name: "quiet",
			description: "Sends the message as ephemeral",
			required: false,
		}],
	},
	{
		type: ApplicationCommandType.User,
		name: "View Song Spotlight",
	},
];

const res = await fetch(
	RouteBases.api + Routes.applicationCommands(CLIENT_ID),
	{
		method: "PUT",
		headers: {
			"content-type": "application/json",
			authorization: CLIENT_TOKEN,
		},
		body: JSON.stringify(commands),
	},
);

if (res.ok) console.log("Updated commands!");
else console.log(await res.json());
