import type { Song } from "structs/types";

import { clean } from "./common";
import type { RenderSongInfo, SongParser, SongService } from "./helpers";

// introducing... a pointer! resolves the circular dependency
export const $ = {
	services: [] as SongService[],
	parsers: [] as SongParser[],
};

function sid(song: Song) {
	return [song.service, song.type, song.id].join(":");
}

// parseLink -> parseCache, validateCache
// rebuildLink -> linkCache, validateCache
// renderSong -> renderCache, validateCache
// validateSong -> validateCache

const parseCache = new Map<string, Song | null>();
const validateCache = new Map<string, boolean>();
/**
 * Tries to parse the provided **link**. Returns a **Song** if successful, or `null` if nothing was found. Either response is temporarily cached.
 * @example ```ts
 * await parseLink("https://soundcloud.com/c0ncernn");
 * // { service: "soundcloud", type: "user", id: "914653456" }
 * ```
 */
export async function parseLink(link: string): Promise<Song | null> {
	const cleaned = clean(link);
	if (parseCache.has(cleaned)) return parseCache.get(cleaned)!;

	const { hostname, pathname } = new URL(cleaned);
	const path = pathname.slice(1).split(/\/+/);

	let song: Song | null = null;
	for (const parser of $.parsers) {
		if (parser.hosts.includes(hostname)) {
			song = await parser.parse(cleaned, hostname, path);
			if (song) break;
		}
	}

	parseCache.set(cleaned, song);
	if (song) validateCache.set(sid(song), true);
	return song;
}

const linkCache = new Map<string, string | null>();
/**
 * Tries to recreate the link to the provided **Song**. Returns `string` if successful, or `null` if nothing was found. Either response is temporarily cached.
 * @example ```ts
 * await parseLink({ service: "soundcloud", type: "user", id: "914653456" });
 * // https://soundcloud.com/c0ncernn
 * ```
 */
export async function rebuildLink(song: Song): Promise<string | null> {
	const id = sid(song);
	if (linkCache.has(id)) return linkCache.get(id)!;

	let link = null;
	const service = $.services.find(x => x.name === song.service);
	if (service?.types.includes(song.type)) link = await service.rebuild(song.type, song.id);

	linkCache.set(id, link);
	if (link) validateCache.set(id, true);
	return link;
}

const renderCache = new Map<string, RenderSongInfo | null>();
/**
 * Tries to render the provided **Song**. Returns `RenderSongInfo` if successful, or `null` if nothing was found. Either response is temporarily cached.
 * @example ```ts
 * await renderSong({ service: "soundcloud", type: "user", id: "914653456" });
 * // { label: "leroy", sublabel: "Top tracks", explicit: false, form: "list", ... }
 * ```
 */
export async function renderSong(song: Song): Promise<RenderSongInfo | null> {
	const id = sid(song);
	if (renderCache.has(id)) return renderCache.get(id)!;

	let info: RenderSongInfo | null = null;
	const service = $.services.find(x => x.name === song.service);
	if (service?.types.includes(song.type)) info = await service.render(song.type, song.id);

	renderCache.set(id, info);
	if (song) validateCache.set(sid(song), true);
	return info;
}

/**
 * Validates if the provided **Song** exists. Returns a `boolean` depending on if the check was successful or not. Either response is temporarily cached.
 * @example ```ts
 * await renderSong({ service: "soundcloud", type: "user", id: "914653456" });
 * // true
 * ```
 */
export async function validateSong(song: Song): Promise<boolean> {
	const id = sid(song);
	if (validateCache.has(id)) return validateCache.get(id)!;

	let valid = false;
	const service = $.services.find(x => x.name === song.service);
	if (service?.types.includes(song.type)) valid = await service.validate(song.type, song.id);

	validateCache.set(id, valid);
	return valid;
}

/** Clears the cache for all handler functions */
export function clearCache() {
	parseCache.clear();
	linkCache.clear();
	renderCache.clear();
	validateCache.clear();
}
