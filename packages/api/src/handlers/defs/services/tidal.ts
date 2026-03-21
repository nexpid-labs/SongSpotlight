import { PLAYLIST_LIMIT, request } from "handlers/common";
import type { RenderInfoBase, SongService } from "handlers/helpers";

interface TidalInfo {
	type: string;
	url: string;
	title?: string;
	name?: string;
	explicit?: boolean;
	duration?: number;
	picture?: string;
	squareImage?: string;
	album?: {
		cover: string;
	};
	creator?: {
		name: string;
	};
	artists?: {
		name: string;
	}[];
}

interface TidalTracks {
	items: {
		id: number;
		title: string;
		url: string;
		explicit: boolean;
		duration?: number;
		artists: {
			name: string;
		}[];
	}[];
}

interface TidalPlaybackInfo {
	manifest?: string;
}

// hasn't been changed in ~3 years
const tidalToken = "vNVdglQOjFJJGG2U";

async function getInfo<T>(
	type: string,
	id: string | number,
	path = "",
	query: Record<string, string> = {},
) {
	return await request({
		url: `https://api.tidal.com/v1/${type}s/${id}/${path}`,
		query: {
			countryCode: "US",
			...query,
		},
		headers: {
			"X-Tidal-Token": tidalToken,
		},
	}).then(x => x.ok ? x.json as T : undefined);
}

async function getAudioPreview(id: string | number) {
	const info = await getInfo<TidalPlaybackInfo>("track", id, "playbackinfo", {
		audioquality: "HIGH",
		playbackmode: "STREAM",
		assetpresentation: "FULL",
	});
	if (!info?.manifest) return;

	const dec = JSON.parse(atob(info.manifest)) as { urls: [string] };
	return dec.urls[0];
}

function prettyLink(link: string) {
	try {
		const url = new URL(link);
		url.protocol = "https://";
		return url.toString();
	} catch {
		return link;
	}
}

export const tidal: SongService = {
	name: "tidal",
	label: "Tidal",
	hosts: [
		"tidal.com",
		"listen.tidal.com",
	],
	types: ["artist", "album", "playlist", "track"],
	async parse(_link, _host, path) {
		const [typeFoo, idFoo, typeBar, idBar] = path;

		// /album/273418078/track/273418079
		const type = typeBar && idBar ? typeBar : typeFoo,
			id = typeBar && idBar ? idBar : idFoo;
		if (!type || !this.types.includes(type) || !id) return null;

		if (type === "playlist" && !/^[-a-f0-9]+$/.test(id)) return null;
		else if (type !== "playlist" && Number.isNaN(Number(id))) return null;

		if (!await this.validate(type, id)) return null;

		return {
			service: this.name,
			type,
			id,
		};
	},
	async render(type, id) {
		const data = await getInfo<TidalInfo>(type, id);
		if (!data) return null;

		const defaultSublabel = data.type === "playlist" ? "TIDAL" : "Top tracks";
		const base: RenderInfoBase = {
			label: data.title || data.name || "Unknown",
			sublabel: data.artists?.map(x => x.name).join(", ") || data.creator?.name || defaultSublabel,
			link: prettyLink(data.url),
			explicit: Boolean(data.explicit),
		};
		const thumbnailKey = data.picture ?? data.squareImage ?? data.album?.cover;
		const thumbnailUrl = thumbnailKey
			? `https://resources.tidal.com/images/${thumbnailKey.replace(/-/g, "/")}/160x160.jpg`
			: undefined;

		if (type === "track") {
			const previewUrl = data.duration && await getAudioPreview(id).catch(() => undefined);

			return {
				form: "single",
				...base,
				thumbnailUrl,
				single: {
					audio: previewUrl && data.duration
						? {
							previewUrl,
							duration: data.duration * 1e3,
						}
						: undefined,
				},
			};
		} else {
			const tracks = await getInfo<TidalTracks>(
				type,
				id,
				type === "artist" ? "toptracks" : "tracks",
				{
					limit: String(PLAYLIST_LIMIT),
				},
			);

			return {
				form: "list",
				...base,
				thumbnailUrl,
				list: await Promise.all(
					tracks?.items.slice(0, PLAYLIST_LIMIT).map(async (track) => {
						const previewUrl = track.duration
							&& await getAudioPreview(track.id).catch(() => undefined);

						return {
							label: track.title,
							sublabel: track.artists.map(x => x.name).join(", "),
							link: prettyLink(track.url),
							explicit: Boolean(track.explicit),
							audio: previewUrl && track.duration
								? {
									previewUrl,
									duration: track.duration * 1e3,
								}
								: undefined,
						};
					}) ?? [],
				),
			};
		}
	},
	async validate(type, id) {
		return !!(await getInfo<TidalInfo>(type, id));
	},
};
