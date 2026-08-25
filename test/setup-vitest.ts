import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { expect, vi } from "vitest";

vi.mock(import("@song-spotlight/api/handlers"), async (importOriginal) => {
	const module = await importOriginal();
	return {
		...module,
		validateSong: vi.fn(() => Promise.resolve(true)),
	};
});

expect.extend({
	async toHaveStatus(response: Response, expectedStatus: number) {
		const { isNot } = this;
		let text = await response.clone().text();
		try {
			text = JSON.stringify(JSON.parse(text), undefined, 2);
		} catch {
			// fine
		}

		return {
			pass: response.status === expectedStatus,
			message: () => `expected ${response.status} to${isNot ? " not" : ""} equal ${expectedStatus}`,
			actual: `${response.status}\n${text.split("\n").map(x => `> ${x}`).join("\n")}`,
			expected: String(expectedStatus),
		};
	},
});

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
