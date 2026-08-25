import { UserData } from "@song-spotlight/api/structs";

const latestDataVersion = 2;

export interface RawSQLUserData {
	user: string;
	version: typeof latestDataVersion;
	songs: string;
	at: string;
}

export interface APIUserData {
	data: UserData;
	at?: string;
}

let env: Env;
export function assignEnv(_env: Env) {
	env = _env;
}

export async function getUserData(userId: string): Promise<APIUserData> {
	const data = await env.DB.prepare("SELECT * FROM data WHERE user = ?").bind(userId).first<
		RawSQLUserData
	>();
	if (!data) {
		return {
			data: [],
		};
	}

	return {
		data: JSON.parse(data.songs) as UserData,
		at: data.at,
	};
}

export async function saveUserData(
	userId: string,
	data: UserData,
	at: string,
) {
	if (data.length === 0) return await deleteUserData(userId);

	return await env.DB.prepare(
		"INSERT INTO data (user, version, songs, at) VALUES (?, ?, ?, ?) ON CONFLICT (user) DO UPDATE SET version = excluded.version, songs = excluded.songs, at = excluded.at",
	).bind(
		userId,
		latestDataVersion,
		JSON.stringify(data),
		at,
	).run();
}

export async function deleteUserData(userId: string) {
	return await env.DB.prepare("DELETE FROM data WHERE user = ?").bind(userId).run();
}
