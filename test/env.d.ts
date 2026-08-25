declare namespace Cloudflare {
	interface Env {
		DB: D1Database;
		ADMIN_USER_ID: string;
		TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
	}
}