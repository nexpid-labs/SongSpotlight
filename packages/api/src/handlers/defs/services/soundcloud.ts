import { PLAYLIST_LIMIT, request } from "handlers/common";
import { parseLink } from "handlers/finders";
import { type RenderInfoBase, type RenderInfoEntry, type SongService } from "handlers/helpers";

interface oEmbedData {
	html: string;
}

interface Transcoding {
	duration: number;
	url: string;
	format: {
		protocol: string;
		mime_type: string;
	};
}

interface WidgetData {
	artwork_url: string;
	avatar_url?: string;
	title: string;
	policy: string;
	uri: string;
	id: number;
	permalink_url: string;
	username?: string;
	user?: {
		username: string;
	};
	publisher_metadata?: {
		explicit: boolean;
	};
	media?: {
		transcodings: Transcoding[];
	};
	tracks?: WidgetData[];
}

interface TracksWidgetData {
	collection: WidgetData[];
}

interface PreviewResponse {
	url: string;
}

const client_id = "nIjtjiYnjkOhMyh5xrbqEW12DxeJVnic",
	// app version changes often but let's hope soundcloud doesnt mind :) :) :)
	app_version = "1782997503";

function parseWidget(type: string, id: string, tracks: true): Promise<TracksWidgetData | null>;
function parseWidget(type: string, id: string, tracks?: false): Promise<WidgetData | null>;
async function parseWidget(type: string, id: string, tracks?: boolean) {
	return (await request({
		url: `https://api-widget.soundcloud.com/${type}s/${id}${tracks ? "/tracks" : ""}`,
		query: {
			format: "json",
			limit: "20",
			client_id,
			app_version,
		},
	})).json;
}

async function parsePlaylistTracks(
	playlistId: string,
	trackIds: number[],
) {
	return (await request({
		url: `https://api-widget.soundcloud.com/tracks`,
		query: {
			ids: trackIds.join(","),
			playlistId,
			playlistSecretToken: "",
			format: "json",
			client_id,
			app_version,
		},
	})).json as WidgetData[] | null;
}

function filterPreview(track: Transcoding) {
	return track.format.protocol === "progressive" && track.format.mime_type === "audio/mpeg"
		&& track?.url && track?.duration;
}

const previewPoint = 0.4;
const previewDuration = 30e3;

async function parsePreview(
	transcodings: Transcoding[],
): Promise<NonNullable<RenderInfoEntry["audio"]> | undefined> {
	const preview = transcodings.sort((a, b) => {
		return +filterPreview(b) - +filterPreview(a);
	})?.[0];

	if (preview?.url && preview?.duration) {
		const link = (await request({
			url: preview.url,
			query: {
				client_id,
			},
		}))
			.json as PreviewResponse;
		if (!link?.url) return;

		// check if its valid
		if (preview.duration >= 1e3) {
			const previewChunk = Math.min(previewDuration, preview.duration);
			const previewStart = Math.ceil(preview.duration * previewPoint);

			return {
				duration: preview.duration,
				previewUrl: link.url,
				previewStart,
				previewSlice: Math.min(previewChunk, preview.duration - previewStart),
			};
		} else {
			return {
				duration: preview.duration,
				previewUrl: link.url,
			};
		}
	}
}

interface CFPolicy {
	Statement: [{
		Condition: {
			DateLessThan: {
				["AWS:EpochTime"]: number;
			};
		};
	}];
}

function extractExpiry(url: string) {
	try {
		const policy = new URL(url).searchParams.get("Policy");
		if (!policy) return undefined;

		const data = JSON.parse(atob(policy.replace(/_/g, "="))) as CFPolicy;
		const expiry = data.Statement[0].Condition.DateLessThan["AWS:EpochTime"];
		return expiry * 1e3;
	} catch {
		return undefined;
	}
}

export const soundcloud: SongService = {
	name: "soundcloud",
	label: "Soundcloud",
	hosts: [
		"soundcloud.com",
		"m.soundcloud.com",
		"on.soundcloud.com",
	],
	types: ["user", "track", "playlist"],
	async parse(link, host, path) {
		if (host === "on.soundcloud.com") {
			if (!path[0] || path[1]) return null;
			const { url, status } = await request({
				url: link,
			});
			return status === 200 ? await parseLink(url) : null;
		} else {
			const [user, second, track, fourth] = path;

			let valid = false;
			if (user && !second) valid = true; // user
			else if (user && second && second !== "sets" && !track) valid = true; // playlist
			else if (user && second === "sets" && track && !fourth) valid = true; // track

			if (!valid) return null;

			const data = (await request({
				url: "https://soundcloud.com/oembed",
				query: {
					format: "json",
					url: link,
				},
			})).json as oEmbedData;
			if (!data?.html) return null;

			// https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F1053322828&show_artwork=true
			const rawUrl = data.html.match(/w\.soundcloud\.com.*?url=(.*?)[&"]/)?.[1];
			if (!rawUrl) return null;

			// https://api.soundcloud.com/tracks/1053322828
			const splits = decodeURIComponent(rawUrl).split(/\/+/);
			const kind = splits[2], id = splits[3];
			if (!kind || !id) return null;

			return {
				service: this.name,
				type: kind.slice(0, -1), // turns tracks -> track
				id,
			};
		}
	},
	async render(type, id) {
		const data = await parseWidget(type, id);
		if (!data?.id) return null;

		const base: RenderInfoBase = {
			label: data.title ?? data.username,
			sublabel: data.user?.username ?? "Top tracks",
			link: data.permalink_url,
			explicit: Boolean(data.publisher_metadata?.explicit),
		};
		const thumbnailUrl = data.artwork_url ?? data.avatar_url;

		if (type === "track") {
			const audio = await parsePreview(data.media?.transcodings ?? []).catch(() => undefined);

			return {
				form: "single",
				...base,
				thumbnailUrl,
				single: {
					audio,
				},
				expiresAt: audio ? extractExpiry(audio.previewUrl) : undefined,
			};
		} else {
			let tracks: WidgetData[] = [];
			if (type === "user") {
				const got = await parseWidget(type, id, true).catch(() => undefined);
				if (got?.collection) tracks = got.collection;
			} else if (data.tracks) {
				tracks = data.tracks;

				const missingIds = tracks.filter(x => x.policy === "ALLOW" && !x.uri).map(x => x.id).slice(
					0,
					PLAYLIST_LIMIT,
				);
				const retrieved = missingIds.length >= 1 && await parsePlaylistTracks(id, missingIds);
				if (retrieved) {
					for (let i = 0; i < tracks.length; i++) {
						const replaced = retrieved.find(x => x.id === tracks[i]?.id);
						if (replaced) tracks[i] = replaced;
					}
				}
			}

			const list = await Promise.all(
				tracks.filter(x => x.uri).slice(0, PLAYLIST_LIMIT).map(async (track) => ({
					label: track.title,
					sublabel: track.user?.username ?? "unknown",
					link: track.permalink_url,
					explicit: Boolean(track.publisher_metadata!.explicit),
					audio: await parsePreview(track.media?.transcodings ?? []).catch(() => undefined),
				})),
			);
			const expires = list.map(({ audio }) => audio ? extractExpiry(audio.previewUrl) : undefined)
				.filter(x => typeof x === "number");

			return {
				form: "list",
				...base,
				thumbnailUrl,
				list,
				expiresAt: expires[0] ? Math.min(...expires) : undefined,
			};
		}
	},
	async validate(type, id) {
		return (await parseWidget(type, id))?.id !== undefined;
	},
};
