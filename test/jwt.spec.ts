import { env } from "cloudflare:workers";
import { createAccessToken, createRefreshToken, getUser } from "lib/auth";
import { describe, expect, it, vi } from "vitest";

describe("jwt", () => {
	const userId = env.ADMIN_USER_ID;

	it("creates and validates access token", async () => {
		const token = await createAccessToken(userId);
		const user = await getUser(token);
		expect(user?.userId).toBe(userId);
	});

	it("rejects expired access token", async () => {
		vi.setSystemTime(0);
		const token = await createAccessToken(userId);
		vi.useRealTimers();

		const user = await getUser(token);
		expect(user).toBe(null);
	});

	it("creates and validates refresh token", async () => {
		const token = await createRefreshToken(userId);
		const user = await getUser(token, "refresh");
		expect(user?.userId).toBe(userId);
	});

	it("rejects expired refresh token", async () => {
		vi.setSystemTime(0);
		const token = await createRefreshToken(userId);
		vi.useRealTimers();

		const user = await getUser(token, "refresh");
		expect(user).toBe(null);
	});
});
