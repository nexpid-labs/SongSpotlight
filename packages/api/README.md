# @song-spotlight/api

A helper npm package that provides validation, parsing and rendering of songs for the [Song Spotlight](https://github.com/nexpid-labs/SongSpotlight) API

## Installation

Like you usually would:

```sh
bun add @song-spotlight/api
# or
pnpm add @song-spotlight/api
# or
yarn add @song-spotlight/api
# or
npm install @song-spotlight/api
```

## Structs

The `@song-spotlight/api/structs` import gives you API types and Zod structures for **Song** and **UserData**.

Note that up until version **1.2.1**, this package automatically came with `zod` installed. Since `zod` is a very big library, it's now an optional dependency and must be installed manually in your project's cwd:

```
bun install zod
```

Trying to import `@song-spotlight/api/structs`'s **SongSchema** or **UserDataSchema** without `zod` installed will throw an error.

```ts
import { UserDataSchema } from "@song-spotlight/api/structs";

const unvalidated = userData as unknown;

const { data, error } = UserDataSchema.safeParse(unvalidated);
if (error) throw error;

// data is UserData 🎉
```

## Handlers

From `@song-spotlight/api/handlers`

### `parseLink(link: string): Promise<Song?>`

Tries to parse the provided **link**. Returns a **Song** if successful, or `null` if nothing was found. Either response is temporarily cached.

### `rebuildLink(song: Song): Promise<string?>`

Tries to recreate the link to the provided **Song**. Returns `string` if successful, or `null` if nothing was found. Either response is temporarily cached.

### `renderSong(song: Song): Promise<RenderSongInfo?>`

Tries to render the provided **Song**. Returns `RenderSongInfo` if successful, or `null` if nothing was found. Either response is temporarily cached.

### `validateSong(song: Song): Promise<boolean>`

Validates if the provided **Song** exists. Returns a `boolean` depending on if the check was successful or not. Either response is temporarily cached.

### `clearCache()`

Clears the cache for all handler functions

```ts
import { clearCache, parseLink, renderSong, validateSong } from "@song-spotlight/api/handlers";

const song = await parseLink("https://soundcloud.com/c0ncernn");
// { service: "soundcloud", type: "user", id: "914653456" }

await validateSong(song);
// true

const render = await renderSong(song);
// { label: "leroy", sublabel: "Top tracks", explicit: false, form: "list", ... }

clearCache();
```

## Util

From `@song-spotlight/api/util`

### `setFetchHandler(fetcher: typeof fetch)`

Lets you to set a custom `fetch()` function. Useful for passing requests through Electron's [net.fetch](https://www.electronjs.org/docs/latest/api/net#netfetchinput-init) for example.

```ts
import { setFetchHandler } from "@song-spotlight/api/util";
import { net } from "electron";

setFetchHandler(net.fetch as unknown as typeof fetch);
```
