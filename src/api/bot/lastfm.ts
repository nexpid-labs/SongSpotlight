export function isLastFmSupported() {
	return !!process.env.LASTFM_API_KEY;
}

type LastFmResponse<T> = {
	ok: true;
	data: T;
} | {
	ok: false;
	data: {
		error: number;
		message: string;
	};
};

interface LastFmMethods {
	"artist.getInfo": {
		artist: {
			stats: {
				playcount: string;
			};
		};
	};
	"album.getInfo": {
		album: {
			playcount: string;
		};
	};
	"track.getInfo": {
		track: {
			playcount: string;
		};
	};
}

export async function callLastFm<Method extends keyof LastFmMethods>(
	method: Method,
	params: Record<string, string>,
) {
	const url = new URL("https://ws.audioscrobbler.com/2.0");
	url.searchParams.append("api_key", process.env.LASTFM_API_KEY);
	url.searchParams.append("format", "json");
	url.searchParams.append("method", method);
	for (const param in params) url.searchParams.append(param, params[param]);

	const res = await fetch(url, {
		headers: {
			"user-agent": "SongSpotlight",
		},
		cf: {
			cacheTtl: 43200, // 12 hours
			cacheEverything: true,
		},
	});

	const json = await res.json();

	return {
		ok: res.ok,
		data: json,
	} as LastFmResponse<LastFmMethods[Method]>;
}
