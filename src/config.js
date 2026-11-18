import 'dotenv/config';

const required = ['BOT_TOKEN', 'OWNER_ID', 'DATABASE_URL', 'WEBHOOK_SECRET', 'CRON_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const ownerId = Number(process.env.OWNER_ID);
if (!Number.isSafeInteger(ownerId) || ownerId <= 0) throw new Error('OWNER_ID must be a valid Telegram numeric user ID');
if (process.env.WEBHOOK_SECRET.length < 16) throw new Error('WEBHOOK_SECRET must be at least 16 characters');

export const config = Object.freeze({
  botToken: process.env.BOT_TOKEN,
  ownerId,
  databaseUrl: process.env.DATABASE_URL,
  webhookSecret: process.env.WEBHOOK_SECRET,
  cronSecret: process.env.CRON_SECRET,
  port: Number(process.env.PORT || 3000),
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  pgSsl: process.env.PGSSL === 'true'
});
