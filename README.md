# Telegram Guard Bot — Railway / JavaScript

This project ports the supplied Telegram Serverless JavaScript guard bot to a normal Node.js 20+ Railway web service.
The existing moderation, statistics, group controls, owner panel and scheduled-job logic are retained in `src/guard.js`.

## Railway variables

Create a Railway PostgreSQL service and add its `DATABASE_URL` to the bot service. Add:

- `BOT_TOKEN`: token from BotFather
- `OWNER_ID`: owner's numeric Telegram user ID (moved out of source code)
- `DATABASE_URL`: Railway PostgreSQL connection URL
- `WEBHOOK_SECRET`: random secret, at least 16 characters
- `CRON_SECRET`: another random secret
- `PUBLIC_URL`: public HTTPS Railway domain, no trailing slash
- `PGSSL`: `true` only if the selected PostgreSQL endpoint requires SSL

The service creates its required tables automatically. It does not use a local SQLite file or Railway's ephemeral filesystem for persistent bot data.

## Deploy

1. Push this folder to a private GitHub repository.
2. In Railway, create a project from that repository.
3. Add a PostgreSQL service.
4. Add the variables above to the bot service. Set `PUBLIC_URL` to the Railway public domain.
5. Deploy. On startup, the app initializes PostgreSQL and registers the Telegram webhook.
6. Open `https://YOUR_DOMAIN/health`; expect `{ "ok": true, ... }`.
7. Add the bot to a test group and grant the Telegram permissions required by the moderation features.

## Scheduled jobs

The source bot includes captcha expiry, scheduled broadcasts, bot on/off windows and night-time group restrictions. They require a scheduled trigger. Configure a Railway Cron service for this same repository with command `npm run cron`, using the same environment variables and database. Set the interval supported by your Railway plan. A cron lock prevents overlapping runs.

Alternatively call `POST /internal/cron` from an external scheduler with header `x-cron-secret: <CRON_SECRET>`.

## Backup and restore from the owner panel

In the bot's private chat, send `/panel`:

- **💾 دریافت پشتیبان** sends a compressed `.json.gz` file containing every bot record.
- **📤 بازیابی پشتیبان** then upload the backup file as a Telegram Document.

The archive includes a format/version marker and SHA-256 integrity checksum. Restore validates the whole archive and runs inside a PostgreSQL transaction; invalid imports leave the current data unchanged. Keep copies outside Railway (phone, computer or private cloud). Do not share the backup: it contains group IDs, roles, moderation settings, statistics and other bot data.

The Telegram upload/download limit in this implementation is 15 MB. For larger datasets, use a database-native export procedure instead of increasing this limit blindly.

## Important operational notes

- Keep PostgreSQL as a separate persistent service. Re-deploying/restarting the web service must not reset data.
- Do not commit `.env`, tokens, secrets, or backup files.
- Do not run two web services with the same bot token/webhook unless you intentionally design a multi-worker deployment.
- This is an infrastructure port, not proof of production readiness. Run the test checklist below before using it in a live group.

## Test checklist

- [ ] `npm run check`
- [ ] `/health` reports database connected
- [ ] `/start`, `/help`, `/time` respond
- [ ] Owner `/panel` opens and non-owner cannot access it
- [ ] Add bot to a test group; group is listed in owner panel
- [ ] Test warn, mute, ban, unban, exemptions and media locks with a test account
- [ ] Test captcha and scheduled jobs using the cron service
- [ ] Download a backup, test restore in a separate test database, then verify groups/settings/statistics
- [ ] Verify webhook retries and service restart do not duplicate moderation actions
