import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

export default defineConfig({
	input: {
		handlers: "./src/handlers/index.ts",
		structs: "./src/structs/index.ts",
		util: "./src/util.ts",
	},
	platform: "node",
	external: ["zod"],
	plugins: [dts()],
	tsconfig: "./tsconfig.json",
	output: {
		entryFileNames: "[name].js",
		format: "esm",
		sourcemap: "hidden",
	},
});
