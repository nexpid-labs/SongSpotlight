import { UserData } from "@song-spotlight/api/structs";

import { latestDataVersion, migrateUserData, RawSQLUserData } from "./migration";

export type ApiUserData = {
	data: UserData;
	at?: string;
};

let env: Env;
export function assignEnv(_env: Env) {
	env = _env;
}

export async function saveUserData(
	userId: string,
	data: UserData,
	at: string,
) {
    if (data.length === 0) return await deleteUserData(userId);

	return await env.DB.prepare(
		"INSERT INTO data (user, version, songs, at) VALUES (?, ?, ?, ?) ON CONFLICT (user) DO UPDATE SET songs = excluded.songs, at = excluded.at",
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

export async function getUserData(userId: string): Promise<ApiUserData> {
	const data = await retrieveUserData(userId);
	if (!data) {
		return {
			data: []
		};
	}

	return {
		data: JSON.parse(data.data) as UserData,
		at: data.at,
	};
}

export async function retrieveUserData(
	userId: string,
): Promise<{ data: string; at: string } | null> {
	const data = await env.DB.prepare("SELECT * FROM data WHERE user = ?").bind(userId).first<
		RawSQLUserData
	>();
	if (!data) return null;

	return migrateUserData(data, saveUserData);
}
