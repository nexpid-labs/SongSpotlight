import { parseNextData, request } from "handlers/common";
import { parseLink } from "handlers/finders";
import { type SongParser } from "handlers/helpers";

interface Next {
	props: {
		pageProps: {
			pageData: {
				sections: {
					links: {
						platform: string;
						url: string;
					}[];
				}[];
			};
		};
	};
}

const alphabeticRegex = /^[^-_][a-z0-9-_]+[^-_]$/i;
const platforms = ["spotify", "soundcloud", "appleMusic", "tidal"];

export const songdotlink: SongParser = {
	name: "song.link",
	label: "song.link",
	hosts: [
		"song.link",
		"album.link",
		"artist.link",
		"pods.link",
		"playlist.link",
		"mylink.page",
		"odesli.co",
	],
	async parse(link, _host, path) {
		const [first, second, third] = path;
		if (!first || third) return null;

		if (second && !alphabeticRegex.test(second)) return null;
		else if (!second && !alphabeticRegex.test(first)) return null;

		const html = (await request({
			url: link,
		})).text;

		const sections = parseNextData<Next>(html)?.props?.pageProps?.pageData?.sections;
		if (!sections) return null;

		const links = sections.flatMap(x => x.links ?? []).filter(x => x.url && x.platform);

		for (const platform of platforms) {
			const link = links.find(x => x.platform === platform);
			if (link) {
				const parsed = await parseLink(link.url);
				if (parsed) return parsed;
			}
		}

		return null;
	},
};
