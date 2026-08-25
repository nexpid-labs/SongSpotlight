import { UserData } from "@song-spotlight/api/structs";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { createAccessToken } from "lib/auth";
import { HttpStatus } from "lib/http-status";
import { makeSnowflake } from "lib/snowflake";
import { describe, expect, it } from "vitest";

import { makeMockData } from "../scripts/mockdata";
import * as app from "../src";

async function request(input: Request | string | URL, requestInit?: RequestInit) {
	const ctx = createExecutionContext();
	const res = await app.request(input, requestInit, env, ctx);
	await waitOnExecutionContext(ctx);
	return res;
}

const testUser = makeSnowflake();
const headers: HeadersInit = {
	Authorization: await createAccessToken(testUser),
};
const adminHeaders: HeadersInit = {
	Authorization: await createAccessToken(env.ADMIN_USER_ID),
};

describe("core", () => {
	it("redirects to github on main page", async () => {
		const res = await request("/");
		await expect(res).toHaveStatus(HttpStatus.PERMANENT_REDIRECT);
		expect(res.headers.get("Location")).toBeTypeOf("string");
	});

	it("throws 404 on unknown pages", async () => {
		const res = await request("/api");
		await expect(res).toHaveStatus(HttpStatus.NOT_FOUND);
		expect(await res.text()).toBe("404 Not Found");
	});
});

describe("data getters", () => {
	it("gets empty user data", async () => {
		const res = await request("/api/data", { headers });
		await expect(res).toHaveStatus(HttpStatus.OK);
		expect(await res.json()).toEqual([]);
		expect(res.headers.get("CF-Cache-Status")).toBe(null);
		expect(res.headers.get("Last-Modified")).toBe(null);
	});

	it("gets cached user data", async () => {
		const res = await request("/api/data", { headers });
		await expect(res).toHaveStatus(HttpStatus.OK);
		expect(await res.json()).toEqual([]);
		expect(res.headers.get("CF-Cache-Status")).toBe("HIT");
		expect(res.headers.get("Last-Modified")).toBe(null);
	});

	const mockData = makeMockData();
	it("puts user data", async () => {
		async function run(data: UserData) {
			const res = await request("/api/data", {
				method: "PUT",
				headers: {
					...headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			await expect(res).toHaveStatus(HttpStatus.OK);
			expect(await res.json()).toBe(true);
		}

		// creates entry
		await run(makeMockData());
		// updates entry
		await run(mockData);
	});

	let lastModified: string | null = null;
	it("gets updated user data", async () => {
		const res = await request("/api/data", { headers });
		await expect(res).toHaveStatus(HttpStatus.OK);
		expect(await res.json()).toEqual(mockData);
		expect(res.headers.get("CF-Cache-Status")).toBe(null);
		lastModified = res.headers.get("Last-Modified");
		expect(res.headers.get("Last-Modified")).toBeTypeOf("string");
	});

	it("gets updated data of other user", async () => {
		const res = await request(`/api/data/${testUser}`, { headers: adminHeaders });
		await expect(res).toHaveStatus(HttpStatus.OK);
		expect(await res.json()).toEqual(mockData);
		expect(res.headers.get("CF-Cache-Status")).toBe("HIT");
		expect(res.headers.get("Last-Modified")).toBe(lastModified);
	});

	it("deletes user data", async () => {
		const res = await request("/api/data", { method: "DELETE", headers });
		await expect(res).toHaveStatus(HttpStatus.OK);
		expect(await res.json()).toBe(true);
	});

	const adminMockData = makeMockData();
	it("puts data of other user via admin", async () => {
		const res = await request(`/api/data/${testUser}`, {
			method: "PUT",
			headers: {
				...adminHeaders,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(adminMockData),
		});
		await expect(res).toHaveStatus(HttpStatus.OK);
		expect(await res.json()).toBe(true);
	});

	it("gets admin-updated user data", async () => {
		const res = await request("/api/data", { headers });
		await expect(res).toHaveStatus(HttpStatus.OK);
		expect(await res.json()).toEqual(adminMockData);
		expect(res.headers.get("CF-Cache-Status")).toBe(null);
		expect(res.headers.get("Last-Modified")).toBe(new Date(0).toISOString());
	});
});

describe("data errors", () => {
	it("rejects unauthorized user data request", async () => {
		const res = await request("/api/data");
		await expect(res).toHaveStatus(HttpStatus.UNAUTHORIZED);
	});

	it("rejects invalid snowflake", async () => {
		const res = await request("/api/data/hello", { headers });
		await expect(res).toHaveStatus(HttpStatus.BAD_REQUEST);
		expect(await res.text()).toBe("User ID is not a valid snowflake");
	});

	it("rejects malformed json data update", async () => {
		const res = await request(`/api/data/${testUser}`, {
			method: "PUT",
			headers: {
				...adminHeaders,
				"Content-Type": "application/json",
			},
			body: "example",
		});
		await expect(res).toHaveStatus(HttpStatus.BAD_REQUEST);
		expect(await res.text()).toBe("Malformed JSON in request body");
	});

	it("rejects invalid data update", async () => {
		const res = await request(`/api/data/${testUser}`, {
			method: "PUT",
			headers: {
				...adminHeaders,
				"Content-Type": "application/json",
			},
			body: JSON.stringify([
				{ service: "foo" },
			]),
		});
		await expect(res).toHaveStatus(HttpStatus.BAD_REQUEST);
	});

	it("rejects data update of other user without admin", async () => {
		const res = await request(`/api/data/${makeSnowflake()}`, {
			method: "PUT",
			headers: {
				...headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify([]),
		});
		await expect(res).toHaveStatus(HttpStatus.FORBIDDEN);
	});
});

describe("bench", () => {
	it("rejects unauthorized user", async () => {
		const res = await request("/api/bench/example", { headers });
		await expect(res).toHaveStatus(HttpStatus.FORBIDDEN);
	});

	it("returns teapot", async () => {
		const res = await request("/api/bench/example", { headers: adminHeaders });
		await expect(res).toHaveStatus(HttpStatus.IM_A_TEAPOT);
	});

	it("returns client error", async () => {
		const res = await request("/api/bench/will-error-client", { headers: adminHeaders });
		await expect(res).toHaveStatus(HttpStatus.BAD_REQUEST);
		expect(await res.text()).toBe("The client is dead");
	});

	it("returns server error", async () => {
		const res = await request("/api/bench/will-crash-server", { headers: adminHeaders });
		await expect(res).toHaveStatus(HttpStatus.INTERNAL_SERVER_ERROR);
		expect(await res.text()).toContain("The server is dead");
	});
});
