import express from 'express';
import { config } from './config.js';
import { db, initDb, pool, claimUpdate, releaseUpdate, runWithCronLock } from './db.js';
import { bot } from './telegram.js';
import { handleMessage, handleCallbackQuery, handleMyChatMember, runScheduledJobs } from './guard.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ok: true, service: 'telegram-guard-bot', database: 'connected' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.post('/telegram/webhook', async (req, res) => {
  if (req.get('x-telegram-bot-api-secret-token') !== config.webhookSecret) return res.sendStatus(401);
  const update = req.body;
  if (!update || !Number.isSafeInteger(update.update_id)) return res.sendStatus(400);
  let claimed = false;
  try {
    claimed = await claimUpdate(update.update_id);
    if (!claimed) return res.sendStatus(200);
    if (update.message || update.edited_message) await handleMessage(update, bot, db);
    else if (update.callback_query) await handleCallbackQuery(update, bot, db);
    else if (update.my_chat_member) await handleMyChatMember(update, db);
    return res.sendStatus(200);
  } catch (error) {
    if (claimed) await releaseUpdate(update.update_id).catch(() => {});
    console.error('Telegram update failed:', error?.stack || error);
    return res.sendStatus(500);
  }
});

app.post('/internal/cron', async (req, res) => {
  if (req.get('x-cron-secret') !== config.cronSecret) return res.sendStatus(401);
  try {
    const result = await runWithCronLock(() => runScheduledJobs(bot, db));
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Cron execution failed:', error?.stack || error);
    return res.status(500).json({ ok: false });
  }
});

await initDb();
if (config.publicUrl) {
  const webhookUrl = `${config.publicUrl}/telegram/webhook`;
  await bot.setWebhook({
    url: webhookUrl,
    secret_token: config.webhookSecret,
    allowed_updates: ['message', 'edited_message', 'callback_query', 'my_chat_member'],
    drop_pending_updates: false
  });
  console.log('Telegram webhook configured.');
}

const server = app.listen(config.port, '0.0.0.0', () => console.log(`Listening on ${config.port}`));

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
