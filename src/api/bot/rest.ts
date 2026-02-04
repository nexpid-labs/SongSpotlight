import {
	APIInteraction,
	InteractionResponseType,
	MessageFlags,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	RESTPostAPIInteractionCallbackJSONBody,
	RouteBases,
	Routes,
} from "discord-api-types/v10";

interface RestOptions {
	query?: Record<string, string>;
	headers?: Record<string, string>;
	body?: object;
}

export async function rest(
	method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
	route: `/${string}`,
	options: RestOptions = {},
) {
	const { query = {}, headers = {} } = options;

	let body: BodyInit | undefined;
	if (options.body) {
		headers["content-type"] ??= "application/json";
		body = JSON.stringify(options.body);
	}

	const url = new URL(RouteBases.api + route);
	for (const key in query) url.searchParams.append(key, query[key]);

	headers.authorization ??= process.env.CLIENT_TOKEN;
	const res = await fetch(url, {
		method,
		headers,
		body,
	});

	const text = await res.text();
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		// not json
	}

	return {
		ok: res.ok,
		status: res.status,
		url: res.url,
		headers: Object.fromEntries(res.headers.entries()),
		text,
		body: json,
	};
}

export async function sendReply(
	interaction: APIInteraction,
	reply: RESTPostAPIInteractionCallbackJSONBody,
) {
	return await rest("POST", Routes.interactionCallback(interaction.id, interaction.token), {
		body: reply,
	});
}

export async function deferReply(interaction: APIInteraction, flags?: MessageFlags) {
	return await sendReply(interaction, {
		type: InteractionResponseType.DeferredChannelMessageWithSource,
		data: {
			flags,
		},
	});
}

export async function editReply(
	interaction: APIInteraction,
	message: RESTPatchAPIWebhookWithTokenMessageJSONBody,
) {
	return await rest("PATCH", Routes.webhookMessage(interaction.application_id, interaction.token), {
		body: message,
	});
}
