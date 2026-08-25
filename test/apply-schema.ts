import { env } from "cloudflare:workers";

await env.DB.exec(env.TEST_SCHEMA);
