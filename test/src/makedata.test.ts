// Generates example data for testing

import type { Song, UserData } from "@song-spotlight/api/structs";

// Mainly uses songs of/references to Kevin Macleod (KM) and Jane Remover (JR)
export const mockRecord = {
	spotify: {
		track: [
			"2UeMTAj1omK9Vh8UtiSyt9", // KM
			"4Y8zeYUPDn22jIsYJId8KI", // KM
			"2AjTT2CBthpsIQtyxzhSr4", // JR
			"75Wgg4LerPD3mVO5hEyUN9", // JR
		],
		album: [
			"3bC3ooOMFW7z14KKUkpsdm", // KM
			"1uJT1My0wIUMJw0awyrUog", // KM
			"21b4cDNse2AMpj94ykfuON", // JR
			"4ZtC6HhG26hK47TkNhrWT1", // JR
		],
		playlist: [
			"37i9dQZF1DZ06evO2uiXZQ", // KM
			"676LzNuSbxkw3oWhwhDkbh", // KM
			"37i9dQZF1DZ06evO1oQtnY", // JR
			"4gjVvxadXVSWV0lZNNfNfw", // JR
		],
		artist: [
			"4fSMtiyC6lF5BUO1tUMWMs", // KM
			"0gxyHStUsqpMadRV0Di1Qt",
			"2rLGlNI6htigNxx172qxLu", // JR
			"48wt14F9gzlkNDRdXyJTQz",
		],
	},
	soundcloud: {
		user: [
			"1764285", // KM
			"207997261",
			"603043044", // JR
			"52019567",
		],
		track: [
			"1013787601", // NCS
			"2287384898", // NCS
			"2152314354", // JR
			"2051221096", // JR
		],
		playlist: [
			"287487354", // KM
			"276024169", // KM
			"1591842514", // JR
			"1948226087", // JR
		],
	},
	applemusic: {
		artist: [
			"204264696", // KM
			"669771",
			"1448393745", // JR
			"1274240597",
		],
		song: [
			"945174697", // KM
			"1667934060", // KM
			"1800020689", // JR
			"1800020676", // JR
		],
		album: [
			"1680716145", // KM
			"1779127650", // KM
			"1800020675", // JR
			"1856018518", // JR
		],
		playlist: [
			// Apple Music doesn't let me search public playlists, so
			// I'm sourcing from https://music.apple.com/us/new/top-charts/playlists
			"pl.0ef59752c0cd457dbf1391f08cbd936f",
			"pl.87bb5b36a9bd49db8c975607452bfa2b",
			"pl.e79d63bcaead407fb44a0c19380822e6",
			"pl.f4d106fed2bd41149aaacabb233eb5eb",
		],
	},
	tidal: {
		artist: [
			"3879950", // KM
			"1798",
			"32199968", // JR
			"7274907",
		],
		track: [
			"273418079", // KM
			"273419652", // KM
			"421826031", // JR
			"421826030", // JR
		],
		album: [
			"49651290", // KM
			"49651257", // KM
			"421826023", // JR
			"476707123", // JR
		],
		playlist: [
			"24a4254c-9e8a-4fb2-a23a-3ae0dd5d3f52",
			"298aa047-e23a-46ad-ac98-527572313803",
			"a8f12586-f37d-4a46-bd34-636f56198a72",
			"5c5b6b67-2fa3-4a00-b9fd-814d1a7a4d5d",
		],
	},
};

export const mockData: UserData = Object.entries(mockRecord).flatMap(([service, x]) =>
	Object.entries(x).flatMap(([type, x]) =>
		x.map(id =>
			({
				service,
				type,
				id,
			}) as Song
		)
	)
).sort(() => Math.random() > 0.5 ? -1 : 1);

if (require.main === module) console.log(JSON.stringify(mockData));
