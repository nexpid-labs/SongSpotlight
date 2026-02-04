import type { RenderSongInfo } from "@song-spotlight/api/handlers";
import { $ } from "handlers/finders";
import type { Song } from "structs/types";

export { setFetchHandler } from "./handlers/common";

/**
 * Returns whether the specified **Song** should have a tall layout (for **playlists**, **albums** and **artists**) or a short layout (for **tracks**).
 * @example ```ts
 * isListLayout({ service: "soundcloud", type: "user", id: "914653456" });
 * // true
 * ```
 */
export function isListLayout(song: Song, render?: RenderSongInfo) {
	return render?.form === "list" || !["track", "song"].includes(song.type);
}

/**
 * Loops through all **services** and returns the corresponding **service**'s label.
 * @example ```ts
 * getServiceLabel("applemusic");
 * // "Apple Music"
 * ```
 */
export function getServiceLabel(service: string) {
	for (const serviced of $.services) {
		if (serviced.name === service) return serviced.label;
	}
}

/**
 * Helper function which stringifies a **Song**, useful for caching or for using as keys.
 * @example ```ts
 * sid({ service: "soundcloud", type: "user", id: "914653456" });
 * // "soundcloud:user:914653456"
 * ```
 */
export function sid(song: Song) {
	return [song.service, song.type, song.id].join(":");
}
