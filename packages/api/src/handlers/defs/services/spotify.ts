import { parseNextData, PLAYLIST_LIMIT, request } from "handlers/common";
import { type RenderInfoBase, type SongService } from "handlers/helpers";

interface Next {
	props: {
		pageProps: {
			title?: string;
			state?: {
				data: {
					entity: {
						uri: string;
						title: string;
						subtitle: string;
						isExplicit: boolean;
						artists?: {
							name: string;
						}[];
						duration?: number;
						audioPreview?: {
							url: string;
						};
						trackList?: {
							uri: string;
							title: string;
							subtitle: string;
							isExplicit: boolean;
							artists?: {
								name: string;
							}[];
							duration?: number;
							audioPreview?: {
								url: string;
							};
						}[];
						visualIdentity: {
							image: {
								url: string;
								maxWidth: number;
							}[];
						};
					};
				};
			};
		};
	};
}

async function parseEmbed(type: string, id: string) {
	return parseNextData<Next>(
		(await request({
			url: `https://open.spotify.com/embed/${type}/${id}`,
		})).text,
	);
}

function fromUri(uri: string) {
	const [sanityCheck, type, id] = uri.split(":");
	if (sanityCheck === "spotify" && type && id) return `https://open.spotify.com/${type}/${id}`;
	else return null;
}

export const spotify: SongService = {
	name: "spotify",
	label: "Spotify",
	hosts: [
		"open.spotify.com",
	],
	types: ["track", "album", "playlist", "artist"],
	async parse(_link, _host, path) {
		const [type, id, third] = path;
		if (!type || !this.types.includes(type as never) || !id || third) return null;

		if (!await this.validate(type, id)) return null;

		return {
			service: this.name,
			type,
			id,
		};
	},
	async render(type, id) {
		const data = (await parseEmbed(type, id) as Next)?.props?.pageProps?.state?.data?.entity;
		if (!data) return null;

		const base: RenderInfoBase = {
			label: data.title,
			sublabel: data.subtitle ?? data.artists?.map(x => x.name).join(", "),
			link: fromUri(data.uri)!,
			explicit: Boolean(data.isExplicit),
		};
		const thumbnailUrl = data.visualIdentity.image.sort((a, b) => a.maxWidth - b.maxWidth)[0]
			?.url.replace(/:\/\/.*?\.spotifycdn\.com\/image/, "://i.scdn.co/image");

		if (type === "track") {
			return {
				form: "single",
				...base,
				thumbnailUrl,
				single: {
					audio: (data.audioPreview && data.duration)
						? {
							duration: data.duration,
							previewUrl: data.audioPreview.url,
						}
						: undefined,
				},
			};
		} else {
			return {
				form: "list",
				...base,
				thumbnailUrl,
				list: (data.trackList ?? []).slice(0, PLAYLIST_LIMIT).map((track) => ({
					label: track.title,
					sublabel: track.subtitle ?? track.artists?.map(x => x.name).join(", "),
					link: fromUri(track.uri)!,
					explicit: Boolean(track.isExplicit),
					audio: (track.audioPreview && track.duration)
						? {
							duration: track.duration,
							previewUrl: track.audioPreview.url,
						}
						: undefined,
				})),
			};
		}
	},
	async validate(type, id) {
		return !(await parseEmbed(type, id))?.props?.pageProps?.title;
	},
};
