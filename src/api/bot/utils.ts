import {
	APIApplicationCommandInteractionDataOption,
	APIGuildMember,
	APIInteractionDataResolvedGuildMember,
	APISectionAccessoryComponent,
	APISectionComponent,
	APITextDisplayComponent,
	APIUser,
	ApplicationCommandOptionType,
	ComponentType,
	InteractionType,
	MessageFlags,
} from "discord-api-types/v10";
import { Context } from "hono";
import { HttpStatus } from "lib/http-status";

export function okResponse(c: Context) {
	return c.body(null, HttpStatus.ACCEPTED);
}

export function textOrSection(
	text: APITextDisplayComponent,
	accessory?: APISectionAccessoryComponent,
) {
	if (accessory) {
		return {
			type: ComponentType.Section,
			accessory,
			components: [text],
		} as APISectionComponent;
	} else return text;
}

export function lines(text: unknown[]) {
	return text.filter(x => typeof x === "string").join("\n");
}

export interface FmtUser extends APIUser {
	name: string;
}

export type PartialUser = {
	id: string;
	name?: string;
};

export function fmtUser(
	user?: APIUser,
	member?: APIGuildMember | APIInteractionDataResolvedGuildMember,
): FmtUser | undefined {
	if (!user && member && "user" in member) user = member.user;
	if (!user) return;

	return Object.assign(user, {
		name: member?.nick || user.global_name || user.username,
	});
}

type CommandOption = APIApplicationCommandInteractionDataOption<InteractionType.ApplicationCommand>;
type CommandOptionByType<T extends ApplicationCommandOptionType> = Extract<
	CommandOption,
	{ type: T }
>;

export function getOption<T extends ApplicationCommandOptionType>(
	options: CommandOption[] | undefined,
	type: T,
	name: string,
): CommandOptionByType<T> | undefined {
	for (const option of options ?? []) {
		if (option.type === type && option.name === name) return option as CommandOptionByType<T>;
	}
}

export function quietFlags(quiet?: boolean) {
	return (quiet ? MessageFlags.Ephemeral : 0) as MessageFlags;
}
