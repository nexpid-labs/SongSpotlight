-- Migration number: 0000 	 2026-08-25T19:16:08.411Z
CREATE TABLE IF NOT EXISTS data (
    "user" text PRIMARY KEY,
    "version" integer NOT NULL DEFAULT 2,
    "songs" text NOT NULL DEFAULT '[]',
    "at" text NOT NULL
);