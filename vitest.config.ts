import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const schema = readFileSync(join(import.meta.dirname, "schema.sql"), "utf8");

export default defineConfig({
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
					ADMIN_USER_ID: "admin",
					TEST_SCHEMA: schema,
				},
			},
		}),
	],
	test: {
		setupFiles: ["./test/apply-schema.ts"],
	},
});
