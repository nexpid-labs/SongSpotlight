import { join } from "node:path";

import type { UserData } from "@song-spotlight/api/structs";

export async function makeRealData() {
	const data = Bun.JSONC.parse(
		await Bun.file(join(import.meta.dir, "example-data.jsonc")).text(),
	) as Record<string, Record<string, string[]>>;

	return Object.entries(data).flatMap(([service, types]) =>
		Object.entries(types).flatMap(([type, ids]) =>
			ids.map((id) => ({
				service,
				type,
				id,
			}))
		)
	).sort(() => Math.random() > 0.5 ? -1 : 1) as UserData;
}

if (require.main === module) process.stdout.write(JSON.stringify(await makeRealData()));
