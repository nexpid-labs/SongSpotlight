# How to set up a D1 database

> [!NOTE]
> If you still have the `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_D1_BEARER_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` variables in `.dev.vars`, you can delete those and follow this guide instead

Song Spotlight uses an SQL [D1 database](https://developers.cloudflare.com/d1/) with the name of `VendettaSongSpotlight`[^1] to store user data.

## Steps

1. Pick a name and location (optional) for the database
   - You can list the available locations by running `bunx wrangler d1 create`
2. Create the database

   ```bash
   $ bunx wrangler d1 create [name] --location [location]
   ```

3. Copy the `database_name` and `database_id` values from the previous command and replace them in `wrangler.jsonc`

4. Run database migrations both locally (miniflare) and on the production database

   ```bash
   $ bunx wrangler d1 migrations apply DB --local
   $ bunx wrangler d1 migrations apply DB --remote
   ```

5. You're done!

[^1]: from the ye olden days, which is why it doesn't follow the [naming convention](https://developers.cloudflare.com/d1/get-started/#2-create-a-database) (cloudflare doesn't let you rename databases for whatever reason)
