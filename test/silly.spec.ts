import { initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import { makeSilly } from "silly/index";
import { describe, expect, it } from "vitest";

describe("silly", () => {
	it("loads revsg", async () => {
		await initWasm(resvgWasm);
	});

	it("renders silly", () => {
		const silly = makeSilly();
		expect(silly.colors.bg).toBeTypeOf("string");
		expect(silly.colors.bgWhiter).toBeTypeOf("string");
		expect(silly.colors.cloud).toBeTypeOf("string");
		expect(silly.colors.cloudOutline).toBeTypeOf("string");
		expect(silly.avatarSvg).toBeTypeOf("string");
		expect(silly.bannerSvg).toBeTypeOf("string");
		expect(silly.fpte).toBeTypeOf("string");
	});
});
