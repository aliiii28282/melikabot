import { db, initDb, pool, runWithCronLock } from './db.js';
import { bot } from './telegram.js';
import { runScheduledJobs } from './guard.js';

try {
  await initDb();
  const result = await runWithCronLock(() => runScheduledJobs(bot, db));
  console.log(JSON.stringify({ ok: true, ...result }));
} catch (error) {
  console.error('Scheduled job failed:', error?.stack || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
