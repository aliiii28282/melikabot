import pg from 'pg';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { config } from './config.js';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.pgSsl ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PGPOOL_MAX || 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000
});

const KEY_FIELDS = Object.freeze({
  chats: 'chat_id', roles: 'id', warnings: 'id', settings: 'chat_id',
  global_settings: 'key', words: 'word', schedules: 'id', user_stats: 'id',
  chat_daily: 'id', user_daily: 'id', chat_counters: 'id', spam_history: 'id',
  captcha_pending: 'id', owner_state: 'user_id'
});
const TABLES = new Set(Object.keys(KEY_FIELDS));
const FORMAT = 'telegram-guard-bot-backup';
const BACKUP_VERSION = 1;

export async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS guard_records (
    table_name TEXT NOT NULL,
    record_key TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (table_name, record_key)
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS guard_records_table_idx ON guard_records(table_name)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS processed_updates (
    update_id BIGINT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

function validateTable(table) {
  if (!TABLES.has(table)) throw new Error(`Unknown database table: ${table}`);
}

function getKey(table, row) {
  validateTable(table);
  const field = KEY_FIELDS[table];
  if (row?.[field] === undefined || row?.[field] === null) {
    throw new Error(`Missing key field ${field} for ${table}`);
  }
  return String(row[field]);
}

function makeTable(table) {
  validateTable(table);
  return {
    async get(keyObject) {
      const key = getKey(table, keyObject);
      const r = await pool.query('SELECT data FROM guard_records WHERE table_name=$1 AND record_key=$2', [table, key]);
      return r.rows[0]?.data ?? null;
    },
    async put(row) {
      const key = getKey(table, row);
      await pool.query(
        `INSERT INTO guard_records(table_name,record_key,data) VALUES($1,$2,$3::jsonb)
         ON CONFLICT(table_name,record_key) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()`,
        [table, key, JSON.stringify(row)]
      );
      return row;
    },
    async delete(keyObject) {
      const key = getKey(table, keyObject);
      const r = await pool.query('DELETE FROM guard_records WHERE table_name=$1 AND record_key=$2', [table, key]);
      return r.rowCount > 0;
    },
    async find(filter = {}) {
      const r = await pool.query(
        'SELECT data FROM guard_records WHERE table_name=$1 AND data @> $2::jsonb ORDER BY record_key',
        [table, JSON.stringify(filter || {})]
      );
      return r.rows.map(x => x.data);
    }
  };
}

export const db = new Proxy({
  async exportBackup() {
    const r = await pool.query('SELECT table_name,record_key,data FROM guard_records ORDER BY table_name,record_key');
    const payload = {
      format: FORMAT,
      schemaVersion: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      tables: r.rows.map(x => ({ table: x.table_name, key: x.record_key, data: x.data }))
    };
    const canonical = JSON.stringify(payload);
    const archive = { ...payload, sha256: createHash('sha256').update(canonical).digest('hex') };
    const compressed = gzipSync(Buffer.from(JSON.stringify(archive), 'utf8'), { level: 9 });
    if (compressed.length > 15 * 1024 * 1024) throw new Error('Backup exceeds Telegram 15 MB transfer limit');
    return compressed;
  },
  async restoreBackup(input) {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    if (buffer.length > 15 * 1024 * 1024) throw new Error('Backup exceeds 15 MB limit');
    let raw;
    try { raw = buffer[0] === 0x1f && buffer[1] === 0x8b ? gunzipSync(buffer) : buffer; }
    catch { throw new Error('Compressed backup is corrupt'); }
    if (raw.length > 80 * 1024 * 1024) throw new Error('Uncompressed backup is too large');
    let archive;
    try { archive = JSON.parse(raw.toString('utf8')); }
    catch { throw new Error('Backup is not valid JSON'); }
    if (archive?.format !== FORMAT || archive?.schemaVersion !== BACKUP_VERSION || !Array.isArray(archive.tables)) {
      throw new Error('Unsupported backup format or version');
    }
    const { sha256, ...payload } = archive;
    const expected = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    if (typeof sha256 !== 'string' || sha256.length !== 64 || sha256 !== expected) throw new Error('Backup checksum validation failed');
    if (archive.tables.length > 100000) throw new Error('Backup contains too many records');
    for (const row of archive.tables) {
      validateTable(row.table);
      if (!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) throw new Error('Invalid backup record');
      if (getKey(row.table, row.data) !== String(row.key)) throw new Error('Backup key mismatch');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM guard_records');
      if (archive.tables.length > 100000) throw new Error('Backup contains too many records');
    for (const row of archive.tables) {
        await client.query(
          'INSERT INTO guard_records(table_name,record_key,data) VALUES($1,$2,$3::jsonb)',
          [row.table, String(row.key), JSON.stringify(row.data)]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return { records: archive.tables.length, createdAt: archive.createdAt };
  }
}, {
  get(target, property) {
    if (property in target) return target[property];
    if (typeof property === 'string' && TABLES.has(property)) return makeTable(property);
    return undefined;
  }
});

export async function claimUpdate(updateId) {
  const r = await pool.query(
    'INSERT INTO processed_updates(update_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING update_id',
    [updateId]
  );
  return r.rowCount === 1;
}

export async function releaseUpdate(updateId) {
  await pool.query('DELETE FROM processed_updates WHERE update_id=$1', [updateId]);
}

export async function runWithCronLock(fn) {
  const client = await pool.connect();
  try {
    const lock = await client.query("SELECT pg_try_advisory_lock(hashtext('telegram-guard-bot-cron')) AS locked");
    if (!lock.rows[0].locked) return { skipped: true };
    try { return await fn(); }
    finally { await client.query("SELECT pg_advisory_unlock(hashtext('telegram-guard-bot-cron'))"); }
  } finally { client.release(); }
}
