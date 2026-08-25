import { join } from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
	const migrations = await readD1Migrations(join(import.meta.dirname, "migrations"));

	return {
		resolve: {
			tsconfigPaths: true,
		},
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					bindings: {
						JWT_SECRET: "jwt-access-secret",
						JWT_REFRESH_SECRET: "jwt-refresh-secret",
						ADMIN_USER_ID: "643945264868098049",
						TEST_MIGRATIONS: migrations,
					},
				},
			}),
		],
		test: {
			setupFiles: ["./test/setup-vitest.ts"],
		},
	};
});
