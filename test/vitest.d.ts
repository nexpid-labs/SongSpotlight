/* eslint-disable @typescript-eslint/no-empty-object-type */
import "vitest";

interface CustomMatchers<R = unknown> {
	toHaveStatus(expectedStatus: number): Promise<R>;
}

declare module "vitest" {
	interface Assertion<T> extends CustomMatchers<T> {}
	interface AsymmetricMatchersContaining extends CustomMatchers {}
}
