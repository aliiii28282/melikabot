/**
 * ============================================================================
 * ربات نگهبان گروه تلگرام — نسخه کامل برای Telegram Serverless (JavaScript)
 * ============================================================================
 * 
 * راهنمای قرارگیری در بخش‌های پنل Serverless تلگرام (مطابق تصویر):
 * 
 * 1. بخش Database:
 *    محتوای قسمت [PART 1: DATABASE SCHEMA] را در بخش Database کپی کنید.
 * 
 * 2. بخش Library (با نام guardLib.js):
 *    محتوای قسمت [PART 2: LIBRARY] را در بخش Library ذخیره کنید.
 * 
 * 3. بخش Handlers:
 *    محتوای قسمت [PART 3: HANDLERS] را در هندلرهای مربوطه (message, edited_message,
 *    callback_query, my_chat_member, scheduled/cron) قرار دهید.
 * 
 * نکته مهم: مقدار OWNER_ID را در ابتدای Library با آیدی عددی خودتان جایگزین کنید.
 * ============================================================================
 */


/* ============================================================================
 * [PART 1: DATABASE SCHEMA] -> کپی در بخش Database
 * ============================================================================ */
/*
export default {
  chats: {
    chat_id: 'number',
    title: 'string',
    added_at: 'number'
  },
  roles: {
    id: 'string', // `${chat_id}_${user_id}`
    chat_id: 'number',
    user_id: 'number',
    role: 'string' // 'special_admin' | 'admin' | 'exempt'
  },
  warnings: {
    id: 'string', // `${chat_id}_${user_id}`
    chat_id: 'number',
    user_id: 'number',
    count: 'number'
  },
  settings: {
    chat_id: 'number',
    lock_link: 'number',
    lock_photo: 'number',
    lock_video: 'number',
    lock_gif: 'number',
    lock_forward: 'number',
    lock_phone: 'number'
  },
  global_settings: {
    key: 'string',
    value: 'string'
  },
  words: {
    word: 'string'
  },
  schedules: {
    id: 'number',
    run_at: 'number',
    kind: 'string',
    payload: 'string',
    done: 'number'
  },
  user_stats: {
    id: 'string', // `${chat_id}_${user_id}`
    chat_id: 'number',
    user_id: 'number',
    name: 'string',
    msgs: 'number',
    chars: 'number',
    texts: 'number',
    photos: 'number',
    videos: 'number',
    stickers: 'number',
    voices: 'number',
    docs: 'number',
    gifs: 'number',
    viol: 'number',
    first_seen: 'number',
    last_seen: 'number'
  },
  chat_daily: {
    id: 'string', // `${chat_id}_${day}_${hour}`
    chat_id: 'number',
    day: 'number',
    hour: 'number',
    msgs: 'number'
  },
  user_daily: {
    id: 'string', // `${chat_id}_${user_id}_${day}`
    chat_id: 'number',
    user_id: 'number',
    day: 'number',
    msgs: 'number'
  },
  chat_counters: {
    id: 'string', // `${chat_id}_${key}`
    chat_id: 'number',
    key: 'string',
    value: 'number'
  },
  spam_history: {
    id: 'string', // `${chat_id}_${user_id}`
    items: 'string' // JSON array of [ts, msg_id, sig]
  },
  captcha_pending: {
    id: 'string', // `${chat_id}_${user_id}`
    chat_id: 'number',
    user_id: 'number',
    msg_id: 'number',
    expires_at: 'number'
  },
  owner_state: {
    user_id: 'number',
    mode: 'string',
    data: 'string'
  }
};
*/


/* ============================================================================
 * [PART 2: LIBRARY] -> کپی در بخش Library (مثلاً با نام guard.js)
 * ============================================================================ */

// آیدی عددی مالک ربات:
import { config } from "./config.js";

export const OWNER_ID = Number(config.ownerId);

const IRAN_OFFSET_SEC = 3 * 3600 + 30 * 60; // UTC+3:30 (بدون تغییر ساعت تابستانی)
const ANON_IDS = new Set([1087968824, 777000]);

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];
const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const MEDALS = ["🥇", "🥈", "🥉"];

export const LOCKS = {
  link: ["lock_link", "لینک"],
  photo: ["lock_photo", "عکس"],
  video: ["lock_video", "ویدیو"],
  gif: ["lock_gif", "گیف"],
  forward: ["lock_forward", "فوروارد"],
  phone: ["lock_phone", "شماره تلفن"]
};

const SEED_WORDS = [
  "کیر", "کیری", "کون", "کونی", "جنده", "کصکش", "کسکش",
  "حرومزاده", "حرامزاده", "گاییدم", "مادرجنده"
];

// ============================ ابزارهای تاریخ شمسی و اعداد فارسی ============================

export function toFa(str) {
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  return String(str).replace(/\d/g, d => faDigits[Number(d)]);
}

export function toEn(str) {
  return String(str)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

export function fnum(n) {
  const formatted = Math.round(Number(n || 0)).toLocaleString("en-US").replace(/,/g, "٬");
  return toFa(formatted);
}

export function nowTs() {
  return Math.floor(Date.now() / 1000);
}

export function getTehranParts(tsSec = nowTs()) {
  const d = new Date((tsSec + IRAN_OFFSET_SEC) * 1000);
  return {
    gy: d.getUTCFullYear(),
    gm: d.getUTCMonth() + 1,
    gd: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay()
  };
}

export function g2j(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 273 + 31, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
             Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export function j2g(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd;
  days += jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186;
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const months = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > months[gm]) {
    gd -= months[gm];
    gm += 1;
  }
  return [gy, gm, gd];
}

const pad2 = n => String(n).padStart(2, "0");

export function fmtJalali(tsSec = nowTs(), secs = false) {
  const p = getTehranParts(tsSec);
  const [jy, jm, jd] = g2j(p.gy, p.gm, p.gd);
  const out = `${jy}/${pad2(jm)}/${pad2(jd)} ${pad2(p.hour)}:${pad2(p.minute)}` + (secs ? `:${pad2(p.second)}` : "");
  return toFa(out);
}

export function fmtJalaliLong(tsSec = nowTs(), secs = false) {
  const p = getTehranParts(tsSec);
  const [jy, jm, jd] = g2j(p.gy, p.gm, p.gd);
  const clock = `${pad2(p.hour)}:${pad2(p.minute)}` + (secs ? `:${pad2(p.second)}` : "");
  return toFa(`${WEEKDAYS[p.weekday]} ${jd} ${JALALI_MONTHS[jm - 1]} ${jy}، ساعت ${clock}`);
}

export function dayInt(tsSec = nowTs()) {
  const p = getTehranParts(tsSec);
  const [jy, jm, jd] = g2j(p.gy, p.gm, p.gd);
  return jy * 10000 + jm * 100 + jd;
}

export function daysBack(n) {
  const now = nowTs();
  const arr = [];
  for (let k = 0; k < n; k++) arr.push(dayInt(now - k * 86400));
  return arr;
}

export function dayFa(d) {
  return toFa(`${Math.floor(d / 10000)}/${pad2(Math.floor((d / 100) % 100))}/${pad2(d % 100)}`);
}

export function dayToEpoch(d) {
  const [gy, gm, gd] = j2g(Math.floor(d / 10000), Math.floor((d / 100) % 100), d % 100);
  return Math.floor(Date.UTC(gy, gm - 1, gd) / 1000) - IRAN_OFFSET_SEC;
}

export function parseDurationSec(s) {
  if (!s || s.length < 2) return null;
  const t = toEn(s.trim()).toLowerCase();
  const m = t.match(/^(\d+)([mhd])$/);
  if (!m) return null;
  const n = Number(m[1]);
  const mult = { m: 60, h: 3600, d: 86400 }[m[2]];
  return n * mult;
}

export function parseWhenTs(text) {
  const t = toEn(text.trim());
  const now = nowTs();
  let targetTs = null;

  let m = t.match(/^\+?\s*(\d+)$/);
  if (m) {
    targetTs = now + Number(m[1]) * 60;
  } else if (/^\+?\d+[mhdMHD]$/.test(t)) {
    const sec = parseDurationSec(t.replace(/^\+/, ""));
    if (!sec) throw new Error("مدت نامعتبر است.");
    targetTs = now + sec;
  } else {
    m = t.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\s*[ ,T]\s*(\d{1,2}):(\d{2})$/);
    if (m) {
      const [jy, jm, jd, hh, mm] = m.slice(1).map(Number);
      if (!(jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31 && hh < 24 && mm < 60)) {
        throw new Error("تاریخ یا ساعت نامعتبر است.");
      }
      const [gy, gm, gd] = j2g(jy, jm, jd);
      const [checkY, checkM, checkD] = g2j(gy, gm, gd);
      if (checkY !== jy || checkM !== jm || checkD !== jd) {
        throw new Error("این روز در تقویم شمسی وجود ندارد.");
      }
      targetTs = Math.floor(Date.UTC(gy, gm - 1, gd, hh, mm, 0) / 1000) - IRAN_OFFSET_SEC;
    } else {
      m = t.match(/^(\d{1,2}):(\d{2})$/);
      if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) {
        throw new Error("فرمت زمان نامعتبر. مثال: 1405/09/05 23:30  یا  +90  یا  23:30");
      }
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      const p = getTehranParts(now);
      targetTs = Math.floor(Date.UTC(p.gy, p.gm - 1, p.gd, hh, mm, 0) / 1000) - IRAN_OFFSET_SEC;
      if (targetTs <= now) targetTs += 86400;
    }
  }
  if (targetTs <= now) throw new Error("این زمان گذشته است.");
  return targetTs;
}

export function parseRange(text) {
  const t = toEn(text.trim()).toLowerCase();
  if (t === "off") return "off";
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?$/);
  if (!m) throw new Error("فرمت نامعتبر. مثال: 23:30-07:00 یا off");
  const h1 = Number(m[1]), m1 = Number(m[2] || 0);
  const h2 = Number(m[3]), m2 = Number(m[4] || 0);
  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59 || (h1 === h2 && m1 === m2)) {
    throw new Error("ساعت یا دقیقه نامعتبر است.");
  }
  return `${pad2(h1)}:${pad2(m1)}-${pad2(h2)}:${pad2(m2)}`;
}

export function inRange(rng, tsSec = nowTs()) {
  const [a, b] = rng.split("-");
  const s = Number(a.slice(0, 2)) * 60 + Number(a.slice(3));
  const e = Number(b.slice(0, 2)) * 60 + Number(b.slice(3));
  const p = getTehranParts(tsSec);
  const cur = p.hour * 60 + p.minute;
  return s < e ? (cur >= s && cur < e) : (cur >= s || cur < e);
}

export function humanDelta(seconds) {
  let sec = Math.max(0, Math.floor(seconds));
  const d = Math.floor(sec / 86400); sec %= 86400;
  const h = Math.floor(sec / 3600); sec %= 3600;
  const parts = [];
  if (d) parts.push(`${d} روز`);
  if (h) parts.push(`${h} ساعت`);
  if (Math.floor(sec / 60) || !parts.length) parts.push(`${Math.floor(sec / 60)} دقیقه`);
  return toFa(parts.join(" و "));
}

// ============================ قالب‌بندی HTML و کارت‌ها ============================

export function E(x) {
  return String(x ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function mention(user) {
  const name = E(user.first_name || user.name || "کاربر");
  return `<a href="tg://user?id=${user.id}">${name}</a>`;
}

export function card(emoji, title, lines = [], note = null) {
  let out = `${emoji} <b>${title}</b>`;
  if (lines && lines.length) {
    out += `\n<blockquote>${lines.map(String).join("\n")}</blockquote>`;
  }
  if (note) {
    out += `\n<i>${note}</i>`;
  }
  return out;
}

export function failCard(err) {
  const msg = err?.message || String(err);
  return card("❌", "خطا", [E(msg)], "دسترسی‌های ربات (ادمین بودن، حذف پیام، محدود کردن کاربران) را بررسی کنید 🔧");
}

export function usageCard(...lines) {
  let title = "راهنمای دستور";
  if (lines.length && typeof lines[lines.length - 1] === "object" && lines[lines.length - 1].title) {
    title = lines.pop().title;
  }
  return card("💡", title, lines, "برای راهنمای کامل: /help 📖");
}

export function bar(frac, n = 10) {
  const k = Math.round(Math.max(0, Math.min(1, frac)) * n);
  return "▰".repeat(k) + "▱".repeat(n - k);
}

export function spark(values) {
  const chars = "▁▂▃▄▅▆▇█";
  const mx = values.length ? Math.max(...values) : 0;
  return values.map(v => (mx && v ? chars[Math.min(7, Math.floor((v / mx) * 7.999))] : "▁")).join("");
}

// ============================ لایه انتزاعی دیتابیس Serverless ============================
// سازگار با API دیتابیس Telegram Serverless (db.table.get / put / delete / find)

async function dbGet(db, table, keyObj) {
  try {
    return await db[table].get(keyObj);
  } catch {
    return null;
  }
}

async function dbPut(db, table, row) {
  return await db[table].put(row);
}

async function dbDelete(db, table, keyObj) {
  try {
    return await db[table].delete(keyObj);
  } catch {
    return null;
  }
}

async function dbFind(db, table, filter = {}) {
  try {
    const res = await db[table].find(filter);
    return Array.isArray(res) ? res : (res?.items || []);
  } catch {
    return [];
  }
}

export async function getGlobal(db, key, def = null) {
  const r = await dbGet(db, "global_settings", { key });
  return r && r.value !== undefined && r.value !== null ? String(r.value) : def;
}

export async function setGlobal(db, key, value) {
  await dbPut(db, "global_settings", { key, value: String(value) });
}

export async function ensureSeeded(db) {
  if ((await getGlobal(db, "words_seeded")) === "1") return;
  for (const w of SEED_WORDS) {
    await dbPut(db, "words", { word: w });
  }
  await setGlobal(db, "words_seeded", "1");
}

export async function addChat(db, chatId, title) {
  const existing = await dbGet(db, "chats", { chat_id: chatId });
  if (existing) {
    if (title && existing.title !== title) {
      await dbPut(db, "chats", { ...existing, title });
    }
    return;
  }
  await dbPut(db, "chats", { chat_id: chatId, title: title || "بدون نام", added_at: nowTs() });
}

export async function getAllChats(db) {
  return await dbFind(db, "chats", {});
}

export async function removeChat(db, chatId) {
  await dbDelete(db, "chats", { chat_id: chatId });
}

export async function addRole(db, cid, uid, role) {
  await dbPut(db, "roles", { id: `${cid}_${uid}`, chat_id: cid, user_id: uid, role });
}

export async function removeRole(db, cid, uid) {
  await dbDelete(db, "roles", { id: `${cid}_${uid}` });
}

export async function getRole(db, cid, uid) {
  const r = await dbGet(db, "roles", { id: `${cid}_${uid}` });
  return r ? r.role : null;
}

export async function listRoles(db, cid, role) {
  const rows = await dbFind(db, "roles", { chat_id: cid, role });
  return rows.map(r => r.user_id);
}

export async function getWarn(db, cid, uid) {
  const r = await dbGet(db, "warnings", { id: `${cid}_${uid}` });
  return r ? (r.count || 0) : 0;
}

export async function addWarn(db, cid, uid) {
  const cur = await getWarn(db, cid, uid);
  await dbPut(db, "warnings", { id: `${cid}_${uid}`, chat_id: cid, user_id: uid, count: cur + 1 });
  return cur + 1;
}

export async function resetWarn(db, cid, uid) {
  await dbDelete(db, "warnings", { id: `${cid}_${uid}` });
}

export async function resetAllWarns(db, cid) {
  const rows = await dbFind(db, "warnings", { chat_id: cid });
  for (const r of rows) await dbDelete(db, "warnings", { id: r.id });
}

export async function getLock(db, cid, key) {
  if ((await getGlobal(db, "glock_" + key)) === "1") return true;
  const col = LOCKS[key][0];
  const r = await dbGet(db, "settings", { chat_id: cid });
  return r ? Boolean(r[col]) : false;
}

export async function setLock(db, cid, key, value) {
  const col = LOCKS[key][0];
  const cur = (await dbGet(db, "settings", { chat_id: cid })) || {
    chat_id: cid,
    lock_link: 0, lock_photo: 0, lock_video: 0, lock_gif: 0, lock_forward: 0, lock_phone: 0
  };
  cur[col] = value ? 1 : 0;
  await dbPut(db, "settings", cur);
}

export async function botIsOn(db) {
  return (await getGlobal(db, "maintenance_mode", "0")) !== "1";
}

export async function setBotActive(db, active) {
  await setGlobal(db, "maintenance_mode", active ? "0" : "1");
}

// ============================ موتور ضدفحش ============================

export function normalizeBase(text) {
  return toEn(text)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ةۀ]/g, "ه")
    .replace(/[أإٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/\u200c/g, " ")
    .replace(/[\u064B-\u065F\u0670\u0640\u200B\u200D-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
    .toLowerCase();
}

function collapseRepeats(s, n) {
  const re = new RegExp(`(.)\\1{${n - 1},}`, "gu");
  return s.replace(re, "$1");
}

function mergeSingles(tokens) {
  const out = [];
  let buf = "";
  for (const t of tokens) {
    if ([...t].length === 1) {
      buf += t;
    } else {
      if (buf) { out.push(buf); buf = ""; }
      out.push(t);
    }
  }
  if (buf) out.push(buf);
  return out;
}

export async function containsProfanity(db, text) {
  if (!text) return false;
  await ensureSeeded(db);
  const rows = await dbFind(db, "words", {});
  if (!rows.length) return false;

  const raw = rows.map(r => normalizeBase(r.word)).filter(Boolean);
  const w3 = new Set(raw.map(w => collapseRepeats(w, 3)));
  const w2 = new Set(raw.map(w => collapseRepeats(w, 2)));
  const long3 = [...w3].filter(w => w.length >= 4);
  const long2 = [...w2].filter(w => w.length >= 4);

  const base = normalizeBase(text);
  const tokenRe = /[\p{L}\p{N}]+/gu;

  for (const [n, wset, longs] of [[3, w3, long3], [2, w2, long2]]) {
    const collapsed = collapseRepeats(base, n);
    const rawTokens = collapsed.match(tokenRe) || [];
    const tokens = mergeSingles(rawTokens);
    for (const t of tokens) {
      if (wset.has(t) || longs.some(w => t.includes(w))) {
        return true;
      }
    }
  }
  return false;
}

// ============================ مجوزها و API تلگرام ============================

export async function tgStatus(bot, cid, uid) {
  try {
    const cm = await bot.getChatMember({ chat_id: cid, user_id: uid });
    return cm?.status || null;
  } catch {
    return null;
  }
}

export async function userLevel(bot, db, cid, uid) {
  if (uid === OWNER_ID) return 3;
  const role = await getRole(db, cid, uid);
  if (role === "special_admin") return 2;
  if (role === "admin") return 1;
  const st = await tgStatus(bot, cid, uid);
  if (st === "creator") return 2;
  if (st === "administrator") return 1;
  return 0;
}

export async function isExempt(db, cid, uid) {
  return (await getRole(db, cid, uid)) === "exempt";
}

export async function fullDefaultPerms(bot, cid) {
  try {
    const chat = await bot.getChat({ chat_id: cid });
    if (chat?.permissions) return chat.permissions;
  } catch {}
  return {
    can_send_messages: true,
    can_send_polls: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
    can_invite_users: true,
    can_send_audios: true,
    can_send_documents: true,
    can_send_photos: true,
    can_send_videos: true,
    can_send_video_notes: true,
    can_send_voice_notes: true
  };
}

export async function setChatClosed(bot, db, cid, closed) {
  if (closed) {
    if ((await getGlobal(db, `chat_closed_${cid}`)) !== "1") {
      try {
        const chat = await bot.getChat({ chat_id: cid });
        if (chat?.permissions) {
          await setGlobal(db, `closed_perms_${cid}`, JSON.stringify(chat.permissions));
        }
      } catch {}
    }
    await bot.setChatPermissions({
      chat_id: cid,
      permissions: { can_send_messages: false }
    });
    await setGlobal(db, `chat_closed_${cid}`, "1");
  } else {
    const saved = await getGlobal(db, `closed_perms_${cid}`);
    let perms = saved ? JSON.parse(saved) : await fullDefaultPerms(bot, cid);
    if (!perms.can_send_messages) perms = await fullDefaultPerms(bot, cid);
    await bot.setChatPermissions({ chat_id: cid, permissions: perms });
    await setGlobal(db, `chat_closed_${cid}`, "0");
  }
}

export async function sendHtml(bot, chatId, text, extra = {}) {
  return await bot.sendMessage({
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra
  });
}

export async function sendEphemeral(bot, chatId, user, text) {
  try {
    return await bot.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ephemeral_message_parameters: { receiver_user_id: user.id }
    });
  } catch {
    return await sendHtml(bot, chatId, text);
  }
}

// ============================ سیستم آمار (مستقیم در Database) ============================

export async function bumpCounter(db, cid, key, n = 1) {
  const id = `${cid}_${key}`;
  const cur = await dbGet(db, "chat_counters", { id });
  await dbPut(db, "chat_counters", { id, chat_id: cid, key, value: (cur?.value || 0) + n });
}

export async function bumpUserViol(db, cid, uid, n = 1) {
  const id = `${cid}_${uid}`;
  const cur = await dbGet(db, "user_stats", { id });
  if (cur) {
    await dbPut(db, "user_stats", { ...cur, viol: (cur.viol || 0) + n });
  } else {
    await dbPut(db, "user_stats", {
      id, chat_id: cid, user_id: uid, name: "",
      msgs: 0, chars: 0, texts: 0, photos: 0, videos: 0, stickers: 0,
      voices: 0, docs: 0, gifs: 0, viol: n, first_seen: nowTs(), last_seen: nowTs()
    });
  }
}

export async function recordMessage(db, msg, chat, user) {
  const cid = chat.id;
  const ts = msg.date || nowTs();
  const p = getTehranParts(ts);
  const day = dayInt(ts);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "";

  const uidKey = `${cid}_${user.id}`;
  const cur = (await dbGet(db, "user_stats", { id: uidKey })) || {
    id: uidKey, chat_id: cid, user_id: user.id, name: fullName,
    msgs: 0, chars: 0, texts: 0, photos: 0, videos: 0, stickers: 0,
    voices: 0, docs: 0, gifs: 0, viol: 0, first_seen: ts, last_seen: ts
  };

  cur.name = fullName || cur.name;
  cur.msgs += 1;
  cur.last_seen = Math.max(cur.last_seen || 0, ts);
  if (!cur.first_seen) cur.first_seen = ts;

  if (msg.text) {
    cur.texts += 1;
    cur.chars += msg.text.length;
  } else {
    if (msg.caption) cur.chars += msg.caption.length;
    if (msg.photo) cur.photos += 1;
    else if (msg.video || msg.video_note) cur.videos += 1;
    else if (msg.sticker) cur.stickers += 1;
    else if (msg.voice || msg.audio) cur.voices += 1;
    else if (msg.animation) cur.gifs += 1;
    else if (msg.document) cur.docs += 1;
  }
  await dbPut(db, "user_stats", cur);

  const cdKey = `${cid}_${day}_${p.hour}`;
  const cd = await dbGet(db, "chat_daily", { id: cdKey });
  await dbPut(db, "chat_daily", { id: cdKey, chat_id: cid, day, hour: p.hour, msgs: (cd?.msgs || 0) + 1 });

  const udKey = `${cid}_${user.id}_${day}`;
  const ud = await dbGet(db, "user_daily", { id: udKey });
  await dbPut(db, "user_daily", { id: udKey, chat_id: cid, user_id: user.id, day, msgs: (ud?.msgs || 0) + 1 });
}

export const CS_VIEWS = [
  ["top", "🏆 فعال‌ترین‌ها"],
  ["total", "📈 مجموع و روند"],
  ["hours", "⏰ ساعت‌های اوج"],
  ["types", "🎨 نوع پیام‌ها"],
  ["members", "👥 اعضای فعال"],
  ["today", "🔥 امروز"],
  ["bot", "🛡️ عملکرد ربات"]
];

export function csKb(view, cid) {
  const btns = CS_VIEWS.map(([k, t]) => ({
    text: (k === view ? "• " : "") + t,
    callback_data: `cs:${k}:${cid}`
  }));
  const rows = [];
  for (let i = 0; i < btns.length; i += 2) rows.push(btns.slice(i, i + 2));
  rows.push([{ text: "🔄 بروزرسانی", callback_data: `cs:${view}:${cid}` }]);
  return { inline_keyboard: rows };
}

export async function chatstatsText(db, view, cid) {
  const allUsers = await dbFind(db, "user_stats", { chat_id: cid });
  const allDaily = await dbFind(db, "chat_daily", { chat_id: cid });
  const firstDay = allDaily.length ? Math.min(...allDaily.map(r => r.day)) : 0;
  const since = firstDay ? `📅 آمار از ${dayFa(firstDay)} (به وقت تهران)` : "🌱 هنوز آماری ثبت نشده";
  const total = allUsers.reduce((s, r) => s + (r.msgs || 0), 0);

  if (!total && view !== "bot") {
    return card("📊", "آمار گپ", ["هنوز پیامی ثبت نشده 🌱"], "با فعالیت اعضا آمار ساخته می‌شود ✨");
  }

  const uname = r => E((r.name || `کاربر ${r.user_id}`).slice(0, 22));

  if (view === "top") {
    const top10 = [...allUsers].filter(r => r.msgs > 0).sort((a, b) => b.msgs - a.msgs).slice(0, 10);
    const lines = top10.map((r, i) => {
      const icon = i < 3 ? MEDALS[i] : `${toFa(i + 1)}.`;
      const share = r.msgs / total;
      return `${icon} <b>${uname(r)}</b> — ${fnum(r.msgs)} پیام\n      ${bar(share)} ${toFa(Math.round(share * 100))}٪`;
    });
    const members = allUsers.filter(r => r.msgs > 0).length;
    return card("🏆", "آمار گپ — فعال‌ترین‌ها", lines) +
           `\n\n💬 مجموع پیام‌ها: <b>${fnum(total)}</b>  •  👥 اعضای ثبت‌شده: <b>${fnum(members)}</b>\n<i>${since}</i>`;
  }

  if (view === "total") {
    const sumDays = dList => {
      const set = new Set(dList);
      return allDaily.filter(r => set.has(r.day)).reduce((s, r) => s + (r.msgs || 0), 0);
    };
    const d1 = daysBack(1);
    const d2 = [daysBack(2)[1]];
    const tToday = sumDays(d1);
    const tYest = sumDays(d2);
    const t7 = sumDays(daysBack(7));
    const t30 = sumDays(daysBack(30));

    let ndays = 1;
    if (firstDay) {
      ndays = Math.max(1, Math.floor((nowTs() - dayToEpoch(firstDay)) / 86400) + 1);
    }

    const byDay = {};
    for (const r of allDaily) byDay[r.day] = (byDay[r.day] || 0) + (r.msgs || 0);
    const bestEntry = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    const vals = daysBack(14).reverse().map(d => byDay[d] || 0);

    const lines = [
      `🌍 کل پیام‌ها: <b>${fnum(total)}</b>`,
      `☀️ امروز: <b>${fnum(tToday)}</b>  •  🌙 دیروز: <b>${fnum(tYest)}</b>`,
      `🗓️ ۷ روز اخیر: <b>${fnum(t7)}</b>  •  ۳۰ روز اخیر: <b>${fnum(t30)}</b>`,
      `⚖️ میانگین روزانه: <b>${fnum(Math.round(total / ndays))}</b>`
    ];
    if (bestEntry) {
      lines.push(`🏅 رکورد یک روز: <b>${fnum(bestEntry[1])}</b> پیام (${dayFa(Number(bestEntry[0]))})`);
    }
    lines.push(`📊 ۱۴ روز اخیر: ${spark(vals)}`);
    if (tYest) {
      const ch = ((tToday - tYest) / tYest) * 100;
      const sign = ch >= 0 ? "+" : "";
      lines.push(`${ch >= 0 ? "📈" : "📉"} نسبت به دیروز: ${toFa(sign + Math.round(ch))}٪`);
    }
    return card("📈", "آمار گپ — مجموع و روند", lines, since);
  }

  if (view === "hours") {
    const vals = Array(24).fill(0);
    for (const r of allDaily) vals[r.hour] = (vals[r.hour] || 0) + (r.msgs || 0);
    const tot = vals.reduce((a, b) => a + b, 0) || 1;
    const hoursSorted = [...Array(24).keys()].sort((a, b) => vals[b] - vals[a]);
    const top3 = hoursSorted.slice(0, 3);
    const quiet = hoursSorted[23];
    const sumSlice = (a, b) => vals.slice(a, b).reduce((x, y) => x + y, 0);
    const parts = [
      ["🌅 صبح (۶ تا ۱۲)", sumSlice(6, 12)],
      ["☀️ ظهر و عصر (۱۲ تا ۱۸)", sumSlice(12, 18)],
      ["🌆 غروب و شب (۱۸ تا ۲۴)", sumSlice(18, 24)],
      ["🌙 نیمه‌شب (۰ تا ۶)", sumSlice(0, 6)]
    ];
    const lines = [`🕛 ${spark(vals)} 🕚`, "<i>(از ساعت ۰۰ تا ۲۳ به وقت تهران)</i>", ""];
    top3.forEach((h, i) => {
      lines.push(`${MEDALS[i]} ساعت ${toFa(pad2(h))} تا ${toFa(pad2((h + 1) % 24))} — ${fnum(vals[h])} پیام (${toFa(Math.round((vals[h] / tot) * 100))}٪)`);
    });
    lines.push(`😴 ساکت‌ترین: ساعت ${toFa(pad2(quiet))}`, "");
    for (const [n, v] of parts) {
      lines.push(`${n}: ${bar(v / tot, 8)} ${toFa(Math.round((v / tot) * 100))}٪`);
    }
    return card("⏰", "آمار گپ — ساعت‌های اوج", lines, since);
  }

  if (view === "types") {
    const sumF = k => allUsers.reduce((s, r) => s + (r[k] || 0), 0);
    const items = [
      ["📝 متن", sumF("texts")],
      ["🖼️ عکس", sumF("photos")],
      ["🎬 ویدیو", sumF("videos")],
      ["🎭 استیکر", sumF("stickers")],
      ["🎙️ ویس و صوت", sumF("voices")],
      ["📎 فایل", sumF("docs")],
      ["🎞️ گیف", sumF("gifs")]
    ].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const lines = items.map(([n, v]) => `${n}: <b>${fnum(v)}</b>  ${bar(v / total, 8)} ${toFa(Math.round((v / total) * 100))}٪`);
    return card("🎨", "آمار گپ — ترکیب پیام‌ها", lines, since);
  }

  if (view === "members") {
    const allUD = await dbFind(db, "user_daily", { chat_id: cid });
    const today = daysBack(1)[0];
    const set7 = new Set(daysBack(7));
    const set30 = new Set(daysBack(30));

    const aToday = new Set(allUD.filter(r => r.day === today).map(r => r.user_id)).size;
    const a7 = new Set(allUD.filter(r => set7.has(r.day)).map(r => r.user_id)).size;
    const a30 = new Set(allUD.filter(r => set30.has(r.day)).map(r => r.user_id)).size;
    const tracked = allUsers.filter(r => r.msgs > 0).length;
    const quiet = allUsers.filter(r => r.msgs > 0 && r.msgs < 5).length;

    const p = getTehranParts(nowTs());
    const midnight = Math.floor(Date.UTC(p.gy, p.gm - 1, p.gd, 0, 0, 0) / 1000) - IRAN_OFFSET_SEC;
    const newToday = allUsers.filter(r => (r.first_seen || 0) >= midnight).length;

    const writer = [...allUsers]
      .filter(r => (r.texts || 0) >= 20)
      .sort((a, b) => (b.chars / b.texts) - (a.chars / a.texts))[0];

    const lines = [
      `🔥 فعال امروز: <b>${fnum(aToday)}</b> نفر`,
      `📅 فعال ۷ روز اخیر: <b>${fnum(a7)}</b> نفر`,
      `🗓️ فعال ۳۰ روز اخیر: <b>${fnum(a30)}</b> نفر`,
      `👥 کل اعضای ثبت‌شده: <b>${fnum(tracked)}</b>`,
      `🆕 اولین پیام‌شان امروز: <b>${fnum(newToday)}</b> نفر`,
      `👻 کم‌حرف‌ها (کمتر از ۵ پیام): <b>${fnum(quiet)}</b> نفر`,
      `⚖️ میانگین پیام برای هر نفر: <b>${fnum(Math.round(total / Math.max(1, tracked)))}</b>`
    ];
    if (writer) {
      lines.push(`✍️ پرحرف‌ترین (طول پیام): <b>${uname(writer)}</b> — ${fnum(writer.chars / writer.texts)} حرف`);
    }
    return card("👥", "آمار گپ — اعضای فعال", lines, since);
  }

  if (view === "today") {
    const today = daysBack(1)[0];
    const todayRows = (await dbFind(db, "user_daily", { chat_id: cid, day: today }))
      .sort((a, b) => b.msgs - a.msgs)
      .slice(0, 5);
    const tToday = allDaily.filter(r => r.day === today).reduce((s, r) => s + (r.msgs || 0), 0);
    if (!todayRows.length) {
      return card("🔥", "آمار گپ — امروز", ["امروز هنوز پیامی ثبت نشده 🌙"], dayFa(today));
    }
    const nameMap = Object.fromEntries(allUsers.map(u => [u.user_id, u.name]));
    const lines = [`💬 مجموع پیام‌های امروز: <b>${fnum(tToday)}</b>`, ""];
    todayRows.forEach((r, i) => {
      const icon = i < 3 ? MEDALS[i] : "🏅";
      const nm = E((nameMap[r.user_id] || `کاربر ${r.user_id}`).slice(0, 22));
      lines.push(`${icon} <b>${nm}</b> — ${fnum(r.msgs)} پیام (${toFa(Math.round((r.msgs / Math.max(1, tToday)) * 100))}٪)`);
    });
    return card("🔥", "آمار گپ — امروز", lines, `📅 ${fmtJalaliLong(nowTs())}`);
  }

  // view === "bot"
  const cRows = await dbFind(db, "chat_counters", { chat_id: cid });
  const c = Object.fromEntries(cRows.map(r => [r.key, r.value || 0]));
  const lines = [
    `🗑️ پیام حذف‌شده: <b>${fnum(c.deleted || 0)}</b>`,
    `🚨 اسپم مهارشده: <b>${fnum(c.spam || 0)}</b>`,
    `🤬 الفاظ نامناسب: <b>${fnum(c.profanity || 0)}</b>`,
    `🔒 تخلف قفل‌ها: <b>${fnum(c.locks || 0)}</b>`,
    `⚠️ اخطار صادرشده: <b>${fnum(c.warns || 0)}</b>`,
    `🔇 سکوت: <b>${fnum(c.mutes || 0)}</b>  •  🚫 بن: <b>${fnum(c.bans || 0)}</b>`
  ];
  const viol = [...allUsers].filter(r => (r.viol || 0) > 0).sort((a, b) => b.viol - a.viol).slice(0, 3);
  if (viol.length) {
    lines.push("", "🚔 بیشترین تخلف:");
    viol.forEach((r, i) => lines.push(`${MEDALS[i]} ${uname(r)} — ${fnum(r.viol)}`));
  }
  return card("🛡️", "آمار گپ — عملکرد ربات", lines, since);
}

// ============================ ضد اسپم و اخطار ============================

function msgSignature(msg) {
  const text = msg.text || msg.caption;
  if (text) return "t:" + normalizeBase(text).trim();
  if (msg.photo?.length) return "photo:" + msg.photo[msg.photo.length - 1].file_unique_id;
  for (const attr of ["sticker", "video", "animation", "voice", "audio", "document", "video_note"]) {
    if (msg[attr]) return `${attr}:${msg[attr].file_unique_id}`;
  }
  return "other";
}

async function deleteIds(bot, cid, ids) {
  for (const mid of ids) {
    try { await bot.deleteMessage({ chat_id: cid, message_id: mid }); } catch {}
  }
}

export async function doWarn(bot, db, chat, target, reason = "") {
  const cid = chat.id;
  if (await isExempt(db, cid, target.id)) return;
  const count = await addWarn(db, cid, target.id);
  await bumpCounter(db, cid, "warns");
  const limit = Math.max(1, Number(await getGlobal(db, "warn_limit", "3")));
  const why = reason ? [`📝 دلیل: <i>${E(reason)}</i>`] : [];

  if (count >= limit) {
    try {
      await bot.banChatMember({ chat_id: cid, user_id: target.id });
      await resetWarn(db, cid, target.id);
      await bumpCounter(db, cid, "bans");
      await sendHtml(bot, cid, card(
        "🚫", "کاربر به‌خاطر اخطارها بن شد",
        [`👤 کاربر: ${mention(target)}`, `⚠️ اخطار: ${toFa(count)}/${toFa(limit)} ${bar(1, limit)}`, ...why],
        "قوانین گروه را جدی بگیریم 🤝"
      ));
    } catch (e) {
      await sendHtml(bot, cid, failCard(e));
    }
  } else {
    await sendHtml(bot, cid, card(
      "⚠️", "اخطار ثبت شد",
      [`👤 کاربر: ${mention(target)}`, `📊 اخطار: ${toFa(count)}/${toFa(limit)} ${bar(count / limit, limit)}`, ...why],
      `با ${toFa(limit - count)} اخطار دیگر بن می‌شوید ‼️`
    ));
  }
}

export async function checkSpam(bot, db, chat, user, msg) {
  const cid = chat.id;
  if ((await getGlobal(db, `spam_on_${cid}`, "1")) !== "1") return false;
  const [nStr, sStr] = (await getGlobal(db, `spam_limit_${cid}`, "5/8")).split("/");
  const n = Number(nStr) || 5;
  const secs = Number(sStr) || 8;

  const now = nowTs();
  const key = `${cid}_${user.id}`;
  const rec = await dbGet(db, "spam_history", { id: key });
  let hist = [];
  try { hist = rec ? JSON.parse(rec.items) : []; } catch {}

  const sig = msgSignature(msg);
  hist = hist.filter(x => now - x[0] <= 60).slice(-29);
  hist.push([now, msg.message_id, sig]);

  const recent = hist.filter(x => now - x[0] <= secs);
  const same = hist.filter(x => x[2] === sig);

  let victims = null;
  let why = "";
  if (recent.length >= n) {
    victims = recent;
    why = "ارسال پیام پشت‌سرهم";
  } else if (same.length >= 3) {
    victims = same;
    why = "تکرار یک پیام";
  } else {
    await dbPut(db, "spam_history", { id: key, items: JSON.stringify(hist) });
    return false;
  }

  await dbDelete(db, "spam_history", { id: key });
  const victimIds = [...new Set(victims.map(x => x[1]))];
  await bumpCounter(db, cid, "spam");
  await bumpCounter(db, cid, "deleted", victimIds.length);
  await bumpUserViol(db, cid, user.id);
  await deleteIds(bot, cid, victimIds);

  const until = now + 600;
  let extra = "";
  try {
    await bot.restrictChatMember({
      chat_id: cid,
      user_id: user.id,
      permissions: { can_send_messages: false },
      until_date: until
    });
    extra = `تا ${fmtJalali(until)} سکوت شد.`;
    await bumpCounter(db, cid, "mutes");
  } catch {
    extra = "(ربات دسترسی محدود کردن کاربران را ندارد)";
  }

  await sendHtml(bot, cid, card(
    "🚨", "اسپم شناسایی شد",
    [`👤 کاربر: ${mention(user)}`, `📌 دلیل: ${why}`, `🔇 ${extra}`],
    "لطفاً آرام‌تر پیام بدهید 🙏"
  ));
  return true;
}

// ============================ دستورات گروه و مالک ============================

export async function locksText(db, cid) {
  const lines = [];
  for (const [k, v] of Object.entries(LOCKS)) {
    const locked = await getLock(db, cid, k);
    lines.push(`${locked ? "🔒" : "🔓"} ${v[1]} — <code>${k}</code>`);
  }
  return card("🔐", "وضعیت قفل‌ها", lines, "/lock نوع  •  /unlock نوع 🗝️");
}

export async function addSchedule(db, runAtTs, kind, payload = "") {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  await dbPut(db, "schedules", {
    id, run_at: Math.floor(runAtTs), kind, payload, done: 0
  });
  return id;
}

export async function broadcast(bot, db, fromChat, messageId) {
  let ok = 0, fail = 0;
  const chats = await getAllChats(db);
  for (const c of chats) {
    try {
      await bot.copyMessage({
        chat_id: c.chat_id,
        from_chat_id: fromChat,
        message_id: messageId
      });
      ok += 1;
    } catch {
      fail += 1;
    }
  }
  return [ok, fail];
}

// ============================ متن‌های راهنما ============================

const RAW_HELP = [
`📖 <b>راهنمای مدیر @P@ — شروع و نقش‌ها</b>

<b>راه‌اندازی</b>
۱. ربات را به گروه اضافه و ادمین کنید (دسترسی‌ها: حذف پیام، محدود کردن کاربران، دعوت کاربران).
۲. برای کانال: ربات را ادمین کانال کنید و دسترسی ارسال پیام بدهید.
۳. گروه با افزودن ربات یا اولین پیام، خودکار ثبت می‌شود.

<b>نقش‌ها</b>
👑 مالک: همه‌چیز + پنل و تنظیمات سراسری
⭐ مدیر ویژه: بن، رفع بن، معاف، مدیر کردن
🛡️ مدیر: سکوت، اخطار، اسپم، قفل‌ها
✅ معاف: هیچ فیلتر و محدودیتی روی او اعمال نمی‌شود
ادمین‌های خود تلگرام خودکار «مدیر» و سازنده گروه «مدیر ویژه» حساب می‌شود. هیچ‌کس روی هم‌سطح یا بالاتر از خودش اقدام نمی‌کند.

<b>دستور فارسی</b>
مدیران می‌توانند دستورها را بدون اسلش و فارسی بنویسند؛ مثلاً ریپلای روی پیام کاربر و نوشتن «بن» یا «سکوت 30m».

<b>ساعت و تاریخ</b>
همه زمان‌ها شمسی و به وقت واقعی تهران است. دستور /time`,

`📖 <b>راهنمای مدیر @P@ — دستورهای مدیریتی</b>
(روی پیام کاربر ریپلای کنید)

/ban یا «بن» — بن؛ مدت اختیاری: 30m ، 2h ، 1d (مثال: «بن 1d»). [مدیر ویژه]
/unban یا «آنبن» + user_id — رفع بن [مدیر ویژه]
/mute یا «سکوت» — پیش‌فرض ۱ ساعت؛ مثال: «سکوت 30m» [مدیر]
/unmute یا «حذف_سکوت»
/warn یا «اخطار» + دلیل اختیاری — با رسیدن به سقف اخطار، کاربر بن می‌شود
/unwarn یا «حذف_اخطار» — پاک کردن اخطارها
/spam یا «اسپم» — حذف پیام + پیام‌های اخیر او، سکوت (پیش‌فرض ۱ ساعت) و یک اخطار
/whisper یا «نجوا» + متن — پیامی که فقط همان کاربر می‌بیند
/exempt یا «معاف» ، /unexempt یا «حذف_معاف» [مدیر ویژه]
/special یا «مدیر_ویژه» [مالک] ، /admin یا «مدیر» [مدیر ویژه]
/demote یا «عزل» [مالک]
/specials یا «لیست_ویژه» — لیست مدیران
/rules یا «قوانین» — قوانین گروه (همه)

«گپ بسته» / «گپ باز» (یا با ساعت: «گپ بسته 23:45») — بستن و باز کردن گپ [مدیر]
«آمار» — آمار شما یا (با ریپلای) هر کاربر ، «آمار گپ» — آمار گروه`,

`📖 <b>راهنمای مدیر @P@ — قفل‌ها، ضدفحش، ضد اسپم</b>

<b>قفل‌ها</b>
/lock نوع ، /unlock نوع ، /locks
نوع‌ها: link photo video gif forward phone
مثال: «قفل link» یا «بازکردن photo»

<b>ضدفحش</b>
متن و کپشن بررسی می‌شود (حروف کشیده، فاصله‌دار و عربی/فارسی هم گرفته می‌شود). پیام حذف و اخطار ثبت می‌شود.
کلمات (فقط مالک): /addword ، /delword ، /listwords

<b>ضد اسپم</b> (روی همه نوع پیام)
• فلود: پیش‌فرض ۵ پیام در ۸ ثانیه ← حذف پیام‌ها + ۱۰ دقیقه سکوت
• تکرار: یک پیام/فایل یکسان ۳ بار در ۱ دقیقه
/antispam on|off ، /spamlimit 5 8 (تعداد و ثانیه)`,

`📖 <b>راهنمای مدیر @P@ — آمار و باز/بسته کردن گپ</b>

<b>🔒 بستن و باز کردن گپ</b> (مدیران)
«گپ بسته» — همین الان بسته می‌شود
«گپ باز» — همین الان باز می‌شود
«گپ بسته 23:45» — ساعت ۲۳:۴۵ (تهران) بسته می‌شود
«گپ باز 07:30» — ساعت ۰۷:۳۰ باز می‌شود
دستورها: /closechat ، /openchat ، /schedules ، /unschedule شماره

<b>📊 آمار کاربر</b> — «آمار» یا /stats
<b>🏆 آمار گپ</b> — «آمار گپ» یا /chatstats`,

`📖 <b>راهنمای مدیر @P@ — پنل مالک</b>
پنل: /panel در پی‌وی ربات

📢 ارسال سراسری • 📊 آمار • ✏️ تغییر نام ربات • 📋 لیست گروه‌ها • 🚫 کلمات فیلتر • 🛡️ ضدفحش • 🔌 روشن/خاموش ربات • ⚠️ محدودیت اخطار • 🔒 قفل رسانه سراسری • ✉️ پیام به یک گروه • 💬 متن خوش‌آمد • 📜 قوانین • 🤖 کپچا • 🌙 سکوت شبانه • ⏱️ زمان‌بندی و ساعت

برای لغو هر مرحله: /cancel`
];

export const HELP_PAGES = RAW_HELP.map((h, i) => h.replace("@P@", toFa(`${i + 1}/${RAW_HELP.length}`)));

export function helpKb(page, ownerPrivate) {
  const nav = [];
  if (page > 0) nav.push({ text: "◀️ قبلی", callback_data: `help:${page - 1}` });
  if (page < HELP_PAGES.length - 1) nav.push({ text: "بعدی ▶️", callback_data: `help:${page + 1}` });
  const rows = nav.length ? [nav] : [];
  if (ownerPrivate) rows.push([{ text: "🎛️ پنل", callback_data: "p:home" }]);
  return { inline_keyboard: rows };
}

// ============================ پنل مالک ============================

const MAIN_ROWS = [
  [["📢 ارسال سراسری", "bc"], ["📊 آمار", "stats"]],
  [["✏️ تغییر نام ربات", "rename"], ["⚙️ خلاصه تنظیمات", "summary"]],
  [["💾 دریافت پشتیبان", "backup"], ["📤 بازیابی پشتیبان", "restore"]],
  [["📋 لیست گروه‌ها", "chats"], ["🗑️ حذف گروه", "rmchat"]],
  [["🚫 کلمات فیلتر", "words"], ["🛡️ ضدفحش روشن/خاموش", "antispam"]],
  [["🛡️ مدیران", "gadmins"], ["✅ معاف‌ها", "gexempts"]],
  [["🔌 روشن/خاموش ربات", "maint"], ["⚠️ محدودیت اخطار", "warnlim"]],
  [["🔒 قفل رسانه سراسری", "glocks"], ["⏱️ زمان‌بندی و ساعت", "timers"]],
  [["✉️ پیام به یک گروه", "msgchat"], ["🧹 پاکسازی اخطار گروه", "clrgroup"]],
  [["🧹 پاکسازی اخطار کاربر", "clruser"], ["📊 اخطارهای کاربر", "userwarns"]],
  [["🔍 وضعیت قفل‌ها", "locks"], ["💬 متن خوش‌آمد", "welcometext"]],
  [["🔛 خوش‌آمد روشن/خاموش", "welcometoggle"], ["📜 قوانین گروه", "rules"]],
  [["🤖 کپچا روشن/خاموش", "captcha"], ["🌙 سکوت شبانه", "night"]],
  [["🏷️ نام و توضیحات", "botinfo"], ["🚪 خروج از گروه", "leave"]]
];

export function mainPanelKb() {
  const rows = MAIN_ROWS.map(row => row.map(([t, k]) => ({ text: t, callback_data: "p:" + k })));
  rows.push([{ text: "📖 راهنمای کامل", callback_data: "help:0" }]);
  return { inline_keyboard: rows };
}

export function backPanelKb(extra = []) {
  return { inline_keyboard: [...extra, [{ text: "🔙 بازگشت", callback_data: "p:home" }]] };
}

export async function panelText(db) {
  const chats = await getAllChats(db);
  const name = await getGlobal(db, "bot_name", "🛡️ ربات نگهبان");
  const anti = (await getGlobal(db, "global_antispam", "1")) === "1" ? "🟢 روشن" : "🔴 خاموش";
  const active = (await botIsOn(db)) ? "🟢 روشن" : "🔴 خاموش";
  return card("🎛️", `پنل مدیریت ${E(name)}`, [
    `📊 گروه‌ها و کانال‌های فعال: <b>${fnum(chats.length)}</b>`,
    `🛡️ ضدفحش: ${anti}`,
    `🔌 وضعیت ربات: ${active}`,
    `🕒 ${fmtJalali(nowTs())} (تهران)`
  ], "یک گزینه را انتخاب کنید 👇✨");
}

// ============================ هندلر اصلی پیام‌ها ============================

const ALIASES = {
  "بن": "ban", "آنبن": "unban", "حذف_بن": "unban",
  "سکوت": "mute", "حذف_سکوت": "unmute",
  "اخطار": "warn", "حذف_اخطار": "unwarn",
  "معاف": "exempt", "حذف_معاف": "unexempt",
  "عزل": "demote", "مدیر": "admin", "مدیر_ویژه": "special",
  "لیست_ویژه": "specials", "قوانین": "rules",
  "قفل": "lock", "بازکردن": "unlock", "قفل‌ها": "locks",
  "نجوا": "whisper", "اسپم": "spam", "ساعت": "time", "راهنما": "help",
  "ضداسپم": "antispam", "حد_اسپم": "spamlimit",
  "آمار": "stats", "امار": "stats"
};

export async function handleMessage(update, bot, db) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.from) return;
  const chat = msg.chat;
  const user = msg.from;
  const isEdited = Boolean(update.edited_message);
  const text = (msg.text || "").trim();

  // 1. اعضای جدید (خوش‌آمد و کپچا)
  if (msg.new_chat_members && chat.type !== "private") {
    await addChat(db, chat.id, chat.title);
    if (!(await botIsOn(db))) return;
    for (const m of msg.new_chat_members) {
      if (m.is_bot || (await isExempt(db, chat.id, m.id))) continue;
      if ((await getGlobal(db, "captcha_enabled", "0")) === "1") {
        try {
          await bot.restrictChatMember({
            chat_id: chat.id, user_id: m.id, permissions: { can_send_messages: false }
          });
          const sent = await sendHtml(bot, chat.id, card(
            "🤖", "تأیید هویت",
            [`👤 ${mention(m)}`, "برای فعال شدن ارسال پیام، دکمه‌ی زیر را بزن 👇", "⏳ ۲ دقیقه فرصت داری"],
            "کاربرانی که تأیید نکنند اخراج می‌شوند 🚪"
          ), {
            reply_markup: { inline_keyboard: [[{ text: "🤖 من ربات نیستم", callback_data: `cap:${m.id}` }]] }
          });
          await dbPut(db, "captcha_pending", {
            id: `${chat.id}_${m.id}`,
            chat_id: chat.id,
            user_id: m.id,
            msg_id: sent.message_id,
            expires_at: nowTs() + 120
          });
        } catch {}
      } else if ((await getGlobal(db, "welcome_enabled", "1")) === "1") {
        const custom = await getGlobal(db, "welcome_text");
        const wText = custom
          ? "🎉 " + E(custom).replace(/{name}/g, mention(m)).replace(/{chat}/g, E(chat.title || ""))
          : card("🎉", `خوش آمدی ${mention(m)}!`, [
              `🏠 به گروه <b>${E(chat.title || "")}</b> خوش اومدی ✨`,
              "📜 قبل از شروع، قوانین را با /rules بخوان",
              "💬 راحت باش، سؤال بپرس و لذت ببر 💕"
            ], "امیدواریم لحظات خوبی داشته باشی 🌸");
        await sendEphemeral(bot, chat.id, m, wText);
      }
    }
    return;
  }

  // 2. چت خصوصی (پی‌وی)
  if (chat.type === "private") {
    if (text.startsWith("/start")) {
      const bName = await getGlobal(db, "bot_name", "ربات نگهبان");
      const lines = [
        "👋 سلام! من نگهبان گروه شما هستم.",
        "➕ مرا به گروه اضافه و ادمین کنید تا محافظت را شروع کنم.",
        "📖 راهنما: /help  •  🕒 ساعت: /time"
      ];
      if (user.id === OWNER_ID) lines.push("🎛️ پنل مدیریت: /panel");
      return await sendHtml(bot, chat.id, card("🛡️", E(bName), lines, "با عشق ساخته شد 💕"));
    }
    if (text.startsWith("/help")) {
      return await sendHtml(bot, chat.id, HELP_PAGES[0], { reply_markup: helpKb(0, user.id === OWNER_ID) });
    }
    if (text.startsWith("/time")) {
      const now = nowTs();
      return await sendHtml(bot, chat.id, `🕒 <b>ساعت تهران</b>\n${fmtJalaliLong(now, true)}`);
    }

    if (user.id !== OWNER_ID) return;

    if (text.startsWith("/cancel")) {
      await dbDelete(db, "owner_state", { user_id: OWNER_ID });
      return await sendHtml(bot, chat.id, card("↩️", "لغو شد", ["عملیات قبلی لغو شد."], "برای ادامه از /panel استفاده کنید 🎛️"));
    }
    if (text.startsWith("/panel")) {
      await dbDelete(db, "owner_state", { user_id: OWNER_ID });
      return await sendHtml(bot, chat.id, await panelText(db), { reply_markup: mainPanelKb() });
    }
    if (text.startsWith("/addword")) {
      const args = text.split(/\s+/).slice(1);
      if (!args.length) return await sendHtml(bot, chat.id, "استفاده: /addword کلمه");
      for (const w of args) await dbPut(db, "words", { word: w.trim() });
      return await sendHtml(bot, chat.id, `✅ ${toFa(args.length)} کلمه اضافه شد.`);
    }
    if (text.startsWith("/delword")) {
      const args = text.split(/\s+/).slice(1);
      if (!args.length) return await sendHtml(bot, chat.id, "استفاده: /delword کلمه");
      for (const w of args) await dbDelete(db, "words", { word: w.trim() });
      return await sendHtml(bot, chat.id, "✅ حذف شد.");
    }
    if (text.startsWith("/listwords")) {
      const rows = await dbFind(db, "words", {});
      const list = rows.map(r => r.word).sort().join(" ، ").slice(0, 3800) || "—";
      return await sendHtml(bot, chat.id, `🚫 کلمات فیلتر (${toFa(rows.length)}):\n${E(list)}`);
    }
    if (text.startsWith("/schedule_broadcast")) {
      const arg = text.replace(/^\/schedule_broadcast\s*/, "").trim();
      if (!msg.reply_to_message || !arg) {
        return await sendHtml(bot, chat.id, "روی پیام ریپلای کنید و بنویسید:\n/schedule_broadcast 1405/09/05 23:30");
      }
      try {
        const ts = parseWhenTs(arg);
        const sid = await addSchedule(db, ts, "broadcast", JSON.stringify({
          from_chat: chat.id, message_id: msg.reply_to_message.message_id
        }));
        return await sendHtml(bot, chat.id, `⏰ ارسال #${sid} برای ${fmtJalali(ts)} (تهران) زمان‌بندی شد.`);
      } catch (e) {
        return await sendHtml(bot, chat.id, `❌ ${E(e.message)}`);
      }
    }
    if (text.startsWith("/send")) {
      const parts = text.split(/\s+/);
      if (parts.length < 2) return await sendHtml(bot, chat.id, "استفاده: /send chat_id متن یا ریپلای");
      try {
        const targetRef = /^-?\d+$/.test(parts[1]) ? Number(parts[1]) : (parts[1].startsWith("@") ? parts[1] : "@" + parts[1]);
        const targetChat = await bot.getChat({ chat_id: targetRef });
        if (msg.reply_to_message) {
          await bot.copyMessage({ chat_id: targetChat.id, from_chat_id: chat.id, message_id: msg.reply_to_message.message_id });
        } else {
          const body = text.split(/\s+/).slice(2).join(" ");
          if (!body) return await sendHtml(bot, chat.id, "متن پیام را بنویسید یا روی پیام ریپلای کنید.");
          await bot.sendMessage({ chat_id: targetChat.id, text: body });
        }
        return await sendHtml(bot, chat.id, `✅ به «${E(targetChat.title || targetChat.username)}» ارسال شد.`);
      } catch (e) {
        return await sendHtml(bot, chat.id, `❌ خطا: ${E(e.message)}`);
      }
    }

    // بررسی وضعیت گفتگوی مالک (State Machine)
    const st = await dbGet(db, "owner_state", { user_id: OWNER_ID });
    if (!st) return await sendHtml(bot, chat.id, "از /panel استفاده کنید.");
    const mode = st.mode;
    const data = st.data ? JSON.parse(st.data) : null;

    if (mode === "restore") {
      if (!msg.document) return await sendHtml(bot, chat.id, "لطفاً فایل پشتیبان را به‌صورت Document ارسال کن. برای لغو: /cancel");
      if (Number(msg.document.file_size || 0) > 15 * 1024 * 1024) {
        return await sendHtml(bot, chat.id, "❌ حجم فایل بیشتر از سقف ۱۵ مگابایت است.");
      }
      try {
        const fileBuffer = await bot.downloadFile(msg.document.file_id);
        const safetyCopy = await db.exportBackup();
        await bot.sendDocument({
          chat_id: OWNER_ID,
          document: safetyCopy,
          filename: `guard-bot-before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`,
          caption: "🛟 نسخه خودکار از دیتابیس فعلی، پیش از بازیابی فایل جدید"
        });
        const result = await db.restoreBackup(fileBuffer);
        await dbDelete(db, "owner_state", { user_id: OWNER_ID });
        return await sendHtml(bot, chat.id, `✅ بازیابی کامل شد.\nرکوردهای بازیابی‌شده: ${toFa(result.records)}\nزمان پشتیبان: ${E(result.createdAt)}`);
      } catch (error) {
        return await sendHtml(bot, chat.id, `❌ فایل بازیابی نشد و اطلاعات فعلی حفظ شدند.\n${E(error.message)}`);
      }
    }

    if (mode === "bc") {
      await dbDelete(db, "owner_state", { user_id: OWNER_ID });
      const [ok, fail] = await broadcast(bot, chat.id, msg.message_id);
      return await sendHtml(bot, chat.id, `✅ ارسال کامل شد\nموفق: ${toFa(ok)}\nناموفق: ${toFa(fail)}`);
    }
    if (["sched_when", "sch_off", "sch_on"].includes(mode)) {
      try {
        const ts = parseWhenTs(text);
        if (mode === "sched_when") {
          await dbPut(db, "owner_state", { user_id: OWNER_ID, mode: "sched_msg", data: JSON.stringify(ts) });
          return await sendHtml(bot, chat.id, `زمان: ${fmtJalali(ts)} (تهران)\nحالا پیامی که باید ارسال شود را بفرستید:`);
        }
        await dbDelete(db, "owner_state", { user_id: OWNER_ID });
        const sid = await addSchedule(db, ts, mode === "sch_off" ? "off" : "on");
        return await sendHtml(bot, chat.id, `✅ زمان‌بندی #${sid} در ${fmtJalali(ts)} ثبت شد.`);
      } catch (e) {
        return await sendHtml(bot, chat.id, `❌ ${E(e.message)}\nدوباره بفرستید یا /cancel`);
      }
    }
    if (mode === "sched_msg") {
      await dbDelete(db, "owner_state", { user_id: OWNER_ID });
      const sid = await addSchedule(db, Number(data), "broadcast", JSON.stringify({
        from_chat: chat.id, message_id: msg.message_id
      }));
      return await sendHtml(bot, chat.id, `⏰ ارسال سراسری #${sid} برای ${fmtJalali(Number(data))} زمان‌بندی شد.`);
    }
    if (mode === "autohours") {
      try {
        const rng = parseRange(text);
        await dbDelete(db, "owner_state", { user_id: OWNER_ID });
        await setGlobal(db, "auto_hours", rng);
        await setGlobal(db, "auto_state", "");
        return await sendHtml(bot, chat.id, rng === "off" ? "✅ بازه‌ی روزانه غیرفعال شد." : `✅ بازه روزانه: ${toFa(rng)}`);
      } catch (e) {
        return await sendHtml(bot, chat.id, `❌ ${E(e.message)}`);
      }
    }
    if (mode === "schdel") {
      await dbDelete(db, "owner_state", { user_id: OWNER_ID });
      const pending = await dbFind(db, "schedules", { done: 0 });
      if (text.toLowerCase() === "all") {
        for (const r of pending) await dbPut(db, "schedules", { ...r, done: 1 });
        return await sendHtml(bot, chat.id, "✅ همه‌ی زمان‌بندی‌ها لغو شد.");
      }
      const sid = Number(toEn(text).replace(/^#/, ""));
      const target = pending.find(r => r.id === sid);
      if (target) {
        await dbPut(db, "schedules", { ...target, done: 1 });
        return await sendHtml(bot, chat.id, `✅ زمان‌بندی #${sid} لغو شد.`);
      }
      return await sendHtml(bot, chat.id, "شماره نامعتبر.");
    }
    if (mode === "msgchat_id") {
      try {
        const ref = /^-?\d+$/.test(text) ? Number(text) : (text.startsWith("@") ? text : "@" + text);
        const c = await bot.getChat({ chat_id: ref });
        await dbPut(db, "owner_state", { user_id: OWNER_ID, mode: "msgchat_msg", data: JSON.stringify([c.id, c.title || c.username || String(c.id)]) });
        return await sendHtml(bot, chat.id, `مقصد: «${E(c.title || c.username)}»\nحالا پیام را بفرستید:`);
      } catch (e) {
        return await sendHtml(bot, chat.id, `❌ پیدا نشد: ${E(e.message)}`);
      }
    }
    if (mode === "msgchat_msg") {
      await dbDelete(db, "owner_state", { user_id: OWNER_ID });
      try {
        await bot.copyMessage({ chat_id: data[0], from_chat_id: chat.id, message_id: msg.message_id });
        return await sendHtml(bot, chat.id, `✅ به «${E(data[1])}» ارسال شد.`);
      } catch (e) {
        return await sendHtml(bot, chat.id, `❌ خطا: ${E(e.message)}`);
      }
    }

    await dbDelete(db, "owner_state", { user_id: OWNER_ID });
    if (["rmchat", "clrgroup", "clruser", "userwarns", "locks", "leave"].includes(mode)) {
      const val = Number(toEn(text));
      if (Number.isNaN(val)) return await sendHtml(bot, chat.id, "یک عدد معتبر بفرستید.");
      if (mode === "rmchat") { await removeChat(db, val); return await sendHtml(bot, chat.id, "✅ از لیست گروه‌ها حذف شد."); }
      if (mode === "clrgroup") { await resetAllWarns(db, val); return await sendHtml(bot, chat.id, "✅ اخطارهای گروه پاک شد."); }
      if (mode === "clruser") {
        const rows = await dbFind(db, "warnings", { user_id: val });
        for (const r of rows) await dbDelete(db, "warnings", { id: r.id });
        return await sendHtml(bot, chat.id, "✅ اخطارهای کاربر پاک شد.");
      }
      if (mode === "userwarns") {
        const rows = await dbFind(db, "warnings", { user_id: val });
        const out = rows.map(r => `گروه ${r.chat_id}: ${toFa(r.count)} اخطار`).join("\n") || "این کاربر اخطاری ندارد.";
        return await sendHtml(bot, chat.id, out);
      }
      if (mode === "locks") return await sendHtml(bot, chat.id, await locksText(db, val));
      if (mode === "leave") {
        await bot.leaveChat({ chat_id: val });
        await removeChat(db, val);
        return await sendHtml(bot, chat.id, "🚪 ربات از گروه خارج شد.");
      }
    }
    if (mode === "warn") {
      const n = Number(toEn(text));
      if (n >= 1) { await setGlobal(db, "warn_limit", n); return await sendHtml(bot, chat.id, `✅ محدودیت اخطار: ${toFa(n)}`); }
      return await sendHtml(bot, chat.id, "عدد نامعتبر.");
    }
    if (mode === "welcome") { await setGlobal(db, "welcome_text", text); return await sendHtml(bot, chat.id, "✅ متن خوش‌آمد ذخیره شد."); }
    if (mode === "rules") { await setGlobal(db, "rules_text", text); return await sendHtml(bot, chat.id, "✅ قوانین ذخیره شد."); }
    if (mode === "night") {
      try {
        const rng = parseRange(text);
        await setGlobal(db, "night_range", rng);
        return await sendHtml(bot, chat.id, rng === "off" ? "✅ سکوت شبانه غیرفعال شد." : `✅ سکوت شبانه: ${toFa(rng)}`);
      } catch (e) {
        return await sendHtml(bot, chat.id, `❌ ${E(e.message)}`);
      }
    }
    if (mode === "rename") {
      await bot.setMyName({ name: text.slice(0, 64) });
      await setGlobal(db, "bot_name", text.slice(0, 64));
      return await sendHtml(bot, chat.id, `✅ نام ربات به «${E(text.slice(0, 64))}» تغییر کرد.`);
    }
    if (mode === "botinfo") {
      if (!text.includes("|")) return await sendHtml(bot, chat.id, "فرمت باید «نام|توضیحات» باشد.");
      const [name, desc] = text.split("|", 2).map(s => s.trim());
      await bot.setMyName({ name: name.slice(0, 64) });
      await bot.setMyDescription({ description: desc.slice(0, 512) });
      await setGlobal(db, "bot_name", name.slice(0, 64));
      return await sendHtml(bot, chat.id, "✅ نام و توضیحات ربات به‌روز شد.");
    }
    return;
  }

  // 3. پیام‌های گروه و سوپرگروه
  if (ANON_IDS.has(user.id)) return;
  await addChat(db, chat.id, chat.title);
  if (!isEdited) await recordMessage(db, msg, chat, user);

  const active = await botIsOn(db);
  if (!active && user.id !== OWNER_ID) return;

  const cid = chat.id;
  const level = await userLevel(bot, db, cid, user.id);

  // تشخیص دستور (اسلش‌دار یا فارسی)
  let cmd = null;
  let args = [];

  if (text.startsWith("/")) {
    const parts = text.split(/\s+/);
    cmd = parts[0].slice(1).split("@")[0].toLowerCase();
    args = parts.slice(1);
  } else if (text) {
    const toggleMatch = text.match(/^\+?\s*گپ\s*(باز|بسته)\s*((?:[+\d۰-۹].*)?)$/);
    const statsMatch = text.match(/^\+?\s*(?:آمار|امار)(\s+(?:گپ|گروه))?$/);
    if (toggleMatch) {
      cmd = toggleMatch[1] === "بسته" ? "closechat" : "openchat";
      args = toggleMatch[2] ? toggleMatch[2].trim().split(/\s+/) : [];
    } else if (statsMatch) {
      cmd = statsMatch[1] ? "chatstats" : "stats";
    } else {
      const parts = text.split(/\s+/);
      if (ALIASES[parts[0]]) {
        cmd = ALIASES[parts[0]];
        args = parts.slice(1);
      }
    }
  }

  if (cmd) {
    const handled = await runGroupCommand(cmd, args, msg, chat, user, level, bot, db);
    if (handled) return;
  }

  // 4. نظارت و فیلترها (فقط برای کاربران عادی و غیرمعاف)
  if (!active || level >= 1 || (await isExempt(db, cid, user.id))) return;

  const punish = async (warnText = null, warnReason = null, key = "locks") => {
    try { await bot.deleteMessage({ chat_id: cid, message_id: msg.message_id }); } catch {}
    await bumpCounter(db, cid, "deleted");
    await bumpCounter(db, cid, key);
    await bumpUserViol(db, cid, user.id);
    if (warnReason) {
      await doWarn(bot, db, chat, user, warnReason);
    } else if (warnText) {
      await sendEphemeral(bot, cid, user, card(
        "🔒", "پیام شما حذف شد", [`👤 ${mention(user)}`, warnText], "این نوع پیام در گروه ممنوع است ⛔"
      ));
    }
  };

  if (await checkSpam(bot, db, chat, user, msg)) return;

  const body = msg.text || msg.caption || "";
  if ((await getGlobal(db, "global_antispam", "1")) === "1" && (await containsProfanity(db, body))) {
    return await punish(null, "استفاده از الفاظ نامناسب", "profanity");
  }

  if (msg.photo && (await getLock(db, cid, "photo"))) return await punish("🖼️ ارسال عکس ممنوع است.");
  if (msg.video && (await getLock(db, cid, "video"))) return await punish("🎬 ارسال ویدیو ممنوع است.");
  if (msg.animation && (await getLock(db, cid, "gif"))) return await punish("🎞️ ارسال گیف ممنوع است.");
  if (msg.forward_origin && (await getLock(db, cid, "forward"))) return await punish("↩️ فوروارد ممنوع است.");

  const ents = [...(msg.entities || []), ...(msg.caption_entities || [])];
  const urlRe = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|@[A-Za-z0-9_]{5,}\b)/i;
  if (await getLock(db, cid, "link")) {
    if (ents.some(e => ["url", "text_link", "mention"].includes(e.type)) || urlRe.test(body)) {
      return await punish("🔗 ارسال لینک ممنوع است.");
    }
  }
  const phoneRe = /(?<!\d)(\+?98|0)?9\d{9}(?!\d)/;
  if (await getLock(db, cid, "phone")) {
    if (ents.some(e => e.type === "phone_number") || phoneRe.test(normalizeBase(body))) {
      return await punish("📞 ارسال شماره ممنوع است.");
    }
  }
}

async function runGroupCommand(cmd, args, msg, chat, user, actorLevel, bot, db) {
  const cid = chat.id;
  const actorTag = mention(user);
  const reply = (txt, extra = {}) => sendHtml(bot, cid, txt, { reply_to_message_id: msg.message_id, ...extra });

  const needLevel = async min => {
    if (actorLevel < min) {
      await reply(card("⛔", "دسترسی ندارید", ["این دستور مخصوص مدیران است."], "اگر فکر می‌کنید اشتباه است با مدیر گروه صحبت کنید 💬"));
      return false;
    }
    return true;
  };

  const getTarget = async () => {
    const t = msg.reply_to_message?.from;
    if (t) return t;
    await reply(card("↩️", "ریپلای کنید", ["روی پیام کاربر ریپلای کنید و دستور را بفرستید."], "مثال: ریپلای + «بن» 😉"));
    return null;
  };

  const canActOn = async target => {
    const tLevel = await userLevel(bot, db, cid, target.id);
    if ((await isExempt(db, cid, target.id)) || tLevel >= actorLevel) {
      await reply(card("🛡️", "اقدام ممکن نیست", ["این کاربر معاف یا هم‌سطح/بالاتر از شماست."], "ربات روی مدیران و معاف‌ها اقدامی نمی‌کند 🙏"));
      return false;
    }
    return true;
  };

  if (cmd === "rules") {
    const rules = await getGlobal(db, "rules_text");
    await reply(rules ? card("📜", "قوانین گروه", [E(rules)], "رعایت قوانین = گروهی شاد و آرام 🌸")
                      : card("📜", "قوانین گروه", ["هنوز قوانینی تنظیم نشده است."]));
    return true;
  }
  if (cmd === "help") {
    await reply(HELP_PAGES[0], { reply_markup: helpKb(0, false) });
    return true;
  }
  if (cmd === "time") {
    await reply(`🕒 <b>ساعت تهران</b>\n${fmtJalaliLong(nowTs(), true)}`);
    return true;
  }
  if (cmd === "chatstats") {
    await reply(await chatstatsText(db, "top", cid), { reply_markup: csKb("top", cid) });
    return true;
  }
  if (cmd === "stats") {
    const target = msg.reply_to_message?.from || user;
    const row = await dbGet(db, "user_stats", { id: `${cid}_${target.id}` });
    const tLevel = await userLevel(bot, db, cid, target.id);
    const roleMap = { 3: "👑 مالک ربات", 2: "⭐ مدیر ویژه", 1: "🛡️ مدیر", 0: "👤 عضو عادی" };
    const warns = await getWarn(db, cid, target.id);
    const limit = Math.max(1, Number(await getGlobal(db, "warn_limit", "3")));
    const head = card("📊", "آمار کاربر", [
      `👤 نام: ${mention(target)}`,
      `🆔 شناسه: <code>${target.id}</code>`,
      `🎖️ مقام: <b>${roleMap[tLevel]}</b>`,
      `🛡️ معافیت: ${(await isExempt(db, cid, target.id)) ? "✅ معاف است" : "❌ معاف نیست"}`,
      `⚠️ اخطار: <b>${toFa(warns)}/${toFa(limit)}</b> ${bar(warns / limit, limit)}`
    ]);
    if (!row || !row.msgs) {
      await reply(head + "\n\n" + card("💬", "فعالیت", ["هنوز پیامی از این کاربر ثبت نشده 🌱"]));
      return true;
    }
    const allUsers = await dbFind(db, "user_stats", { chat_id: cid });
    const total = allUsers.reduce((s, r) => s + (r.msgs || 0), 0);
    const sorted = [...allUsers].filter(r => r.msgs > 0).sort((a, b) => b.msgs - a.msgs);
    const rank = sorted.findIndex(r => r.user_id === target.id) + 1;
    const share = total ? row.msgs / total : 0;
    const act = [
      `✉️ مجموع پیام: <b>${fnum(row.msgs)}</b>`,
      `🏆 رتبه: <b>${toFa(rank)}</b> از ${toFa(sorted.length)}  •  سهم: ${bar(share, 8)} ${toFa(Math.round(share * 100))}٪`,
      `🚨 تخلف ثبت‌شده: <b>${fnum(row.viol || 0)}</b>`
    ];
    await reply(head + "\n\n" + card("💬", "فعالیت", act));
    return true;
  }

  // دستورات مدیریتی
  if (cmd === "closechat" || cmd === "openchat") {
    if (!(await needLevel(1))) return true;
    const closed = cmd === "closechat";
    const word = closed ? "بسته" : "باز";
    const arg = args.join(" ").trim();
    if (arg) {
      try {
        const ts = parseWhenTs(arg);
        const sid = await addSchedule(db, ts, closed ? "chat_close" : "chat_open", JSON.stringify({ chat_id: cid }));
        await reply(card("⏰", "زمان‌بندی ثبت شد", [
          `${closed ? "🔒" : "🔓"} گپ در <b>${fmtJalali(ts)}</b> ${word} می‌شود`,
          `⌛ تا آن موقع: ${humanDelta(ts - nowTs())}`,
          `🆔 شماره: <code>#${sid}</code>`,
          `👮 توسط: ${actorTag}`
        ], "لغو: /unschedule شماره 🗑️"));
      } catch (e) {
        await reply(card("❌", "زمان نامعتبر", [E(e.message)], `مثال: «گپ ${word} 23:45» یا «گپ ${word} +30» ⏰`));
      }
      return true;
    }
    try {
      await setChatClosed(bot, db, cid, closed);
      await reply(closed
        ? card("🔒", "گپ بسته شد", [`👮 توسط: ${actorTag}`, `🕒 ${fmtJalali(nowTs())} (تهران)`, "💬 فقط مدیران می‌توانند پیام بدهند"], "برای باز کردن: «گپ باز» 🔓")
        : card("🔓", "گپ باز شد", [`👮 توسط: ${actorTag}`, `🕒 ${fmtJalali(nowTs())} (تهران)`, "💬 همه می‌توانند پیام بدهند 🎉"], "گپ را گرم نگه دارید 💕"));
    } catch (e) {
      await reply(failCard(e));
    }
    return true;
  }

  if (cmd === "schedules") {
    if (!(await needLevel(1))) return true;
    const all = await dbFind(db, "schedules", { done: 0 });
    const mine = all.filter(r => {
      if (!["chat_open", "chat_close"].includes(r.kind)) return false;
      try { return JSON.parse(r.payload || "{}").chat_id === cid; } catch { return false; }
    }).sort((a, b) => a.run_at - b.run_at);
    const lines = mine.map(r => `<code>#${r.id}</code> ${r.kind === "chat_close" ? "🔒 بستن" : "🔓 باز کردن"} — ${fmtJalali(r.run_at)}`);
    await reply(card("⏰", "زمان‌بندی‌های این گروه", lines.length ? lines : ["زمان‌بندی فعالی برای این گروه نیست 🌿"], "لغو: /unschedule شماره 🗑️"));
    return true;
  }

  if (cmd === "unschedule") {
    if (!(await needLevel(1))) return true;
    const sid = Number(toEn(args[0] || "").replace(/^#/, ""));
    if (!sid) { await reply(usageCard("/unschedule 3", { title: "لغو زمان‌بندی" })); return true; }
    const row = await dbGet(db, "schedules", { id: sid });
    if (!row || row.done) { await reply(card("🔎", "پیدا نشد", ["چنین زمان‌بندی‌ای نیست."])); return true; }
    await dbPut(db, "schedules", { ...row, done: 1 });
    await reply(card("🗑️", "زمان‌بندی لغو شد", [`🆔 شماره: <code>#${sid}</code>`, `👮 توسط: ${actorTag}`]));
    return true;
  }

  if (cmd === "ban") {
    if (!(await needLevel(2))) return true;
    const target = await getTarget();
    if (!target || !(await canActOn(target))) return true;
    const dur = args[0] ? parseDurationSec(args[0]) : null;
    const until = dur ? nowTs() + dur : undefined;
    try {
      await bot.banChatMember({ chat_id: cid, user_id: target.id, until_date: until });
      await bumpCounter(db, cid, "bans");
      await reply(card("🚫", "کاربر بن شد", [
        `👤 کاربر: ${mention(target)}`,
        `⏳ مدت: ${dur ? "تا " + fmtJalali(until) : "دائمی ♾️"}`,
        `👮 توسط: ${actorTag}`
      ], "رعایت قوانین باعث آرامش همه است 🕊️"));
    } catch (e) { await reply(failCard(e)); }
    return true;
  }

  if (cmd === "unban") {
    if (!(await needLevel(2))) return true;
    const uid = Number(toEn(args[0] || ""));
    if (!uid) { await reply(usageCard("/unban user_id", { title: "رفع بن" })); return true; }
    try {
      await bot.unbanChatMember({ chat_id: cid, user_id: uid, only_if_banned: true });
      await reply(card("✅", "بن برداشته شد", [`🆔 کاربر: <code>${uid}</code>`, `👮 توسط: ${actorTag}`]));
    } catch (e) { await reply(failCard(e)); }
    return true;
  }

  if (cmd === "mute") {
    if (!(await needLevel(1))) return true;
    const target = await getTarget();
    if (!target || !(await canActOn(target))) return true;
    const dur = args[0] ? parseDurationSec(args[0]) : 3600;
    if (!dur) { await reply(usageCard("مدت نامعتبر ⏳", "مثال: 30m ، 2h ، 1d", { title: "سکوت" })); return true; }
    const until = nowTs() + dur;
    try {
      await bot.restrictChatMember({
        chat_id: cid, user_id: target.id, permissions: { can_send_messages: false }, until_date: until
      });
      await bumpCounter(db, cid, "mutes");
      await reply(card("🔇", "کاربر در سکوت قرار گرفت", [
        `👤 کاربر: ${mention(target)}`, `⏳ تا: ${fmtJalali(until)}`, `👮 توسط: ${actorTag}`
      ]));
    } catch (e) { await reply(failCard(e)); }
    return true;
  }

  if (cmd === "unmute") {
    if (!(await needLevel(1))) return true;
    const target = await getTarget();
    if (!target) return true;
    try {
      await bot.restrictChatMember({ chat_id: cid, user_id: target.id, permissions: await fullDefaultPerms(bot, cid) });
      await reply(card("🔊", "سکوت برداشته شد", [`👤 کاربر: ${mention(target)}`, `👮 توسط: ${actorTag}`]));
    } catch (e) { await reply(failCard(e)); }
    return true;
  }

  if (cmd === "warn") {
    if (!(await needLevel(1))) return true;
    const target = await getTarget();
    if (!target || !(await canActOn(target))) return true;
    await doWarn(bot, db, chat, target, args.join(" "));
    return true;
  }

  if (cmd === "unwarn") {
    if (!(await needLevel(1))) return true;
    const target = await getTarget();
    if (!target) return true;
    await resetWarn(db, cid, target.id);
    await reply(card("🧹", "اخطارها پاک شد", [`👤 کاربر: ${mention(target)}`, `👮 توسط: ${actorTag}`]));
    return true;
  }

  if (cmd === "exempt" || cmd === "unexempt") {
    if (!(await needLevel(2))) return true;
    const target = await getTarget();
    if (!target) return true;
    if (cmd === "exempt") {
      await addRole(db, cid, target.id, "exempt");
      await reply(card("✅", "کاربر معاف شد", [`👤 کاربر: ${mention(target)}`, `👮 توسط: ${actorTag}`]));
    } else {
      if ((await getRole(db, cid, target.id)) === "exempt") await removeRole(db, cid, target.id);
      await reply(card("❎", "معافیت برداشته شد", [`👤 کاربر: ${mention(target)}`, `👮 توسط: ${actorTag}`]));
    }
    return true;
  }

  if (cmd === "special") {
    if (!(await needLevel(3))) return true;
    const target = await getTarget();
    if (!target) return true;
    await addRole(db, cid, target.id, "special_admin");
    await reply(card("⭐", "مدیر ویژه جدید", [`👤 کاربر: ${mention(target)}`], "مبارک باشد 🎉"));
    return true;
  }

  if (cmd === "admin") {
    if (!(await needLevel(2))) return true;
    const target = await getTarget();
    if (!target) return true;
    await addRole(db, cid, target.id, "admin");
    await reply(card("🛡️", "مدیر جدید", [`👤 کاربر: ${mention(target)}`], "موفق باشید 🌟"));
    return true;
  }

  if (cmd === "demote") {
    if (!(await needLevel(3))) return true;
    const target = await getTarget();
    if (!target) return true;
    await removeRole(db, cid, target.id);
    await reply(card("⬇️", "مدیر عزل شد", [`👤 کاربر: ${mention(target)}`, `👮 توسط: ${actorTag}`]));
    return true;
  }

  if (cmd === "specials") {
    if (!(await needLevel(1))) return true;
    const sList = (await listRoles(db, cid, "special_admin")).map(u => `• <code>${u}</code>`);
    const aList = (await listRoles(db, cid, "admin")).map(u => `• <code>${u}</code>`);
    await reply(card("👑", "مدیران ربات در این گروه", [
      `👑 مالک: <code>${OWNER_ID}</code>`, "",
      "⭐ <b>مدیران ویژه</b>", ...(sList.length ? sList : ["—"]), "",
      "🛡️ <b>مدیران</b>", ...(aList.length ? aList : ["—"])
    ]));
    return true;
  }

  if (cmd === "lock" || cmd === "unlock") {
    if (!(await needLevel(1))) return true;
    const key = (args[0] || "").toLowerCase();
    if (!LOCKS[key]) {
      await reply(usageCard("/lock نوع  •  /unlock نوع", "نوع‌ها: " + Object.keys(LOCKS).map(k => `<code>${k}</code>`).join(" ، "), { title: "قفل‌ها" }));
      return true;
    }
    const val = cmd === "lock" ? 1 : 0;
    await setLock(db, cid, key, val);
    await reply(card(val ? "🔒" : "🔓", val ? "قفل فعال شد" : "قفل باز شد", [`📌 ${LOCKS[key][1]}`, `👮 توسط: ${actorTag}`]));
    return true;
  }

  if (cmd === "locks") {
    if (!(await needLevel(1))) return true;
    await reply(await locksText(db, cid));
    return true;
  }

  if (cmd === "spam") {
    if (!(await needLevel(1))) return true;
    const target = await getTarget();
    if (!target || !(await canActOn(target))) return true;
    const dur = args[0] ? parseDurationSec(args[0]) : 3600;
    if (!dur) { await reply(usageCard("مدت نامعتبر ⏳", { title: "اسپم" })); return true; }
    const hKey = `${cid}_${target.id}`;
    const rec = await dbGet(db, "spam_history", { id: hKey });
    let hist = [];
    try { hist = rec ? JSON.parse(rec.items) : []; } catch {}
    await dbDelete(db, "spam_history", { id: hKey });
    const ids = [...new Set([msg.reply_to_message.message_id, msg.message_id, ...hist.map(x => x[1])])];
    await deleteIds(bot, cid, ids);
    await bumpCounter(db, cid, "spam");
    await bumpCounter(db, cid, "deleted", ids.length);
    await bumpUserViol(db, cid, target.id);
    try {
      await bot.restrictChatMember({
        chat_id: cid, user_id: target.id, permissions: { can_send_messages: false }, until_date: nowTs() + dur
      });
      await bumpCounter(db, cid, "mutes");
    } catch {}
    await doWarn(bot, db, chat, target, "اسپم");
    return true;
  }

  if (cmd === "antispam") {
    if (!(await needLevel(1))) return true;
    const v = (args[0] || "").toLowerCase();
    if (["on", "روشن"].includes(v)) await setGlobal(db, `spam_on_${cid}`, "1");
    else if (["off", "خاموش"].includes(v)) await setGlobal(db, `spam_on_${cid}`, "0");
    const on = (await getGlobal(db, `spam_on_${cid}`, "1")) === "1";
    const [n, s] = (await getGlobal(db, `spam_limit_${cid}`, "5/8")).split("/");
    await reply(card("🚨", "ضد اسپم", [`📡 وضعیت: ${on ? "🟢 روشن" : "🔴 خاموش"}`, `⚡ حد مجاز: <b>${toFa(n)}</b> پیام در <b>${toFa(s)}</b> ثانیه`]));
    return true;
  }

  if (cmd === "spamlimit") {
    if (!(await needLevel(1))) return true;
    const n = Number(toEn(args[0] || ""));
    const s = Number(toEn(args[1] || ""));
    if (!(n >= 2 && n <= 30 && s >= 2 && s <= 60)) {
      await reply(usageCard("/spamlimit تعداد ثانیه", "مثال: /spamlimit 5 8", { title: "حد اسپم" }));
      return true;
    }
    await setGlobal(db, `spam_limit_${cid}`, `${n}/${s}`);
    await reply(card("✅", "حد اسپم ثبت شد", [`⚡ ${toFa(n)} پیام در ${toFa(s)} ثانیه`, `👮 توسط: ${actorTag}`]));
    return true;
  }

  if (cmd === "whisper") {
    if (!(await needLevel(1))) return true;
    const target = await getTarget();
    if (!target) return true;
    if (!args.length) { await reply(usageCard("ریپلای + /whisper متن پیام", { title: "پیام محرمانه" })); return true; }
    await sendEphemeral(bot, cid, target, card("🤫", `پیام محرمانه برای ${mention(target)}`, [E(args.join(" "))], "این پیام فقط برای شماست 💌"));
    try { await bot.deleteMessage({ chat_id: cid, message_id: msg.message_id }); } catch {}
    return true;
  }

  return false;
}

// ============================ هندلر دکمه‌ها (CallbackQuery) ============================

const PANEL_PROMPTS = {
  bc: ["bc", "📢 پیام خود را (متن/عکس/ویدیو/...) بفرستید تا به همه گروه‌ها ارسال شود."],
  rename: ["rename", "✏️ نام جدید ربات را بفرستید (حداکثر ۶۴ کاراکتر):"],
  rmchat: ["rmchat", "🗑️ chat_id گروهی که از لیست حذف شود:"],
  warnlim: ["warn", "⚠️ عدد جدید محدودیت اخطار (مثلاً 3):"],
  sched: ["sched_when", "⏰ زمان ارسال سراسری (شمسی، به وقت تهران):\nمثال: 1405/09/05 23:30 یا +30"],
  sch_off: ["sch_off", "🔴 زمان خاموش شدن ربات (شمسی، به وقت تهران):"],
  sch_on: ["sch_on", "🟢 زمان روشن شدن ربات (شمسی، به وقت تهران):"],
  autohours: ["autohours", "🕒 بازه‌ای که ربات هر روز روشن است (مثل 07:00-23:30 یا off):"],
  schdel: ["schdel", "🗑 شماره‌ی زمان‌بندی یا all برای لغو همه:"],
  clrgroup: ["clrgroup", "🧹 chat_id گروه:"],
  clruser: ["clruser", "🧹 user_id کاربر:"],
  userwarns: ["userwarns", "📊 user_id کاربر:"],
  welcometext: ["welcome", "💬 متن خوش‌آمد را بفرستید ({name} و {chat}):"],
  rules: ["rules", "📜 متن قوانین را بفرستید:"],
  night: ["night", "🌙 بازه‌ی سکوت شبانه‌ی گروه‌ها (مثل 23:30-07:00 یا off):"],
  locks: ["locks", "🔍 chat_id گروه:"],
  botinfo: ["botinfo", "🏷️ بفرستید با فرمت:  نام|توضیحات"],
  leave: ["leave", "🚪 chat_id گروهی که ربات از آن خارج شود:"]
};

export async function handleCallbackQuery(update, bot, db) {
  const query = update.callback_query;
  if (!query || !query.data) return;
  const data = query.data;
  const fromId = query.from.id;
  const chatId = query.message.chat.id;
  const msgId = query.message.message_id;

  const edit = async (text, kb = null) => {
    try {
      await bot.editMessageText({
        chat_id: chatId, message_id: msgId, text, parse_mode: "HTML",
        reply_markup: kb || backPanelKb()
      });
    } catch {}
  };

  // دکمه راهنما
  if (data.startsWith("help:")) {
    const page = Math.max(0, Math.min(Number(data.split(":")[1]), HELP_PAGES.length - 1));
    await bot.answerCallbackQuery({ callback_query_id: query.id });
    const ownerPrivate = fromId === OWNER_ID && query.message.chat.type === "private";
    await edit(HELP_PAGES[page], helpKb(page, ownerPrivate));
    return;
  }

  // دکمه آمار گپ
  if (data.startsWith("cs:")) {
    const [, view, cidStr] = data.split(":");
    await bot.answerCallbackQuery({ callback_query_id: query.id, text: "⏳" });
    await edit(await chatstatsText(db, view, Number(cidStr)), csKb(view, Number(cidStr)));
    return;
  }

  // دکمه کپچا
  if (data.startsWith("cap:")) {
    const targetId = Number(data.split(":")[1]);
    if (fromId !== targetId) {
      await bot.answerCallbackQuery({ callback_query_id: query.id, text: "این دکمه برای شما نیست.", show_alert: true });
      return;
    }
    await dbDelete(db, "captcha_pending", { id: `${chatId}_${targetId}` });
    try {
      await bot.restrictChatMember({ chat_id: chatId, user_id: targetId, permissions: await fullDefaultPerms(bot, chatId) });
    } catch {}
    await bot.answerCallbackQuery({ callback_query_id: query.id, text: "✅ تایید شد." });
    try { await bot.deleteMessage({ chat_id: chatId, message_id: msgId }); } catch {}
    return;
  }

  // دکمه‌های پنل مالک
  if (data.startsWith("p:")) {
    if (fromId !== OWNER_ID) {
      await bot.answerCallbackQuery({ callback_query_id: query.id, text: "⛔ فقط مالک.", show_alert: true });
      return;
    }
    await bot.answerCallbackQuery({ callback_query_id: query.id });
    const parts = data.split(":");
    const key = parts[1];

    if (key === "home") {
      await dbDelete(db, "owner_state", { user_id: OWNER_ID });
      return await edit(await panelText(db), mainPanelKb());
    }
    if (key === "timers") {
      const pending = (await dbFind(db, "schedules", { done: 0 })).sort((a, b) => a.run_at - b.run_at).slice(0, 15);
      const labels = { off: "🔴 خاموش شدن", on: "🟢 روشن شدن", broadcast: "📢 ارسال سراسری", chat_close: "🔒 بستن گپ", chat_open: "🔓 باز کردن گپ" };
      const lst = pending.map(r => `#${r.id} — ${labels[r.kind] || r.kind} — ${fmtJalali(r.run_at)}`).join("\n") || "—";
      const txt = `⏱️ <b>زمان‌بندی و ساعت</b>\n\n🕒 اکنون (تهران): ${fmtJalaliLong(nowTs(), true)}\n` +
                  `🔌 وضعیت ربات: ${(await botIsOn(db)) ? "🟢 روشن" : "🔴 خاموش"}\n` +
                  `🕒 بازه روزانه: ${E(await getGlobal(db, "auto_hours", "off"))}\n` +
                  `🌙 سکوت شبانه: ${E(await getGlobal(db, "night_range", "off"))}\n\n<b>زمان‌بندی‌های در انتظار:</b>\n${lst}`;
      return await edit(txt, backPanelKb([
        [{ text: "🔴 خاموش شدن در زمان", callback_data: "p:sch_off" }, { text: "🟢 روشن شدن در زمان", callback_data: "p:sch_on" }],
        [{ text: "🕒 بازه روزانه", callback_data: "p:autohours" }, { text: "🌙 سکوت شبانه", callback_data: "p:night" }],
        [{ text: "⏰ ارسال زمان‌بندی‌شده", callback_data: "p:sched" }, { text: "🗑 لغو زمان‌بندی", callback_data: "p:schdel" }],
        [{ text: "🔌 روشن/خاموش فوری", callback_data: "p:maint" }]
      ]));
    }
    if (key === "msgchat") {
      const chats = (await getAllChats(db)).slice(0, 40);
      const rows = chats.map(c => [{ text: (c.title || String(c.chat_id)).slice(0, 40), callback_data: `p:to:${c.chat_id}` }]);
      rows.push([{ text: "✍️ وارد کردن دستی (chat_id یا @username)", callback_data: "p:tomanual" }]);
      return await edit("✉️ مقصد را انتخاب کنید:", backPanelKb(rows));
    }
    if (key === "tomanual") {
      await dbPut(db, "owner_state", { user_id: OWNER_ID, mode: "msgchat_id", data: "" });
      return await edit("✉️ chat_id یا @username گروه/کانال مقصد را بفرستید:\n\nبرای لغو: /cancel");
    }
    if (key === "to" && parts[2]) {
      const cid = Number(parts[2]);
      const chats = await getAllChats(db);
      const title = chats.find(c => c.chat_id === cid)?.title || String(cid);
      await dbPut(db, "owner_state", { user_id: OWNER_ID, mode: "msgchat_msg", data: JSON.stringify([cid, title]) });
      return await edit(`✉️ پیام خود را بفرستید تا به «${E(title)}» ارسال شود:\n\nبرای لغو: /cancel`);
    }
    if (PANEL_PROMPTS[key]) {
      const [mode, prompt] = PANEL_PROMPTS[key];
      await dbPut(db, "owner_state", { user_id: OWNER_ID, mode, data: "" });
      return await edit(`✍️ ${E(prompt)}\n\n<i>برای لغو: /cancel ↩️</i>`);
    }
    if (key === "stats") {
      const chats = await getAllChats(db);
      const warns = (await dbFind(db, "warnings", {})).reduce((s, r) => s + (r.count || 0), 0);
      const roles = (await dbFind(db, "roles", {})).length;
      return await edit(`📊 <b>آمار کلی</b>\n\n👥 گروه‌ها: ${toFa(chats.length)}\n⚠️ مجموع اخطارها: ${toFa(warns)}\n🎭 نقش‌های ثبت‌شده: ${toFa(roles)}`);
    }
    if (key === "backup") {
      try {
        const archive = await db.exportBackup();
        await bot.sendDocument({
          chat_id: OWNER_ID,
          document: archive,
          filename: `guard-bot-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`,
          caption: "💾 نسخه پشتیبان کامل اطلاعات و تنظیمات ربات\nاین فایل را در جای امن نگه دار."
        });
        return await edit("✅ فایل پشتیبان برای مالک ارسال شد.");
      } catch (error) {
        return await edit(`❌ تهیه پشتیبان ناموفق بود: ${E(error.message)}`);
      }
    }
    if (key === "restore") {
      await dbPut(db, "owner_state", { user_id: OWNER_ID, mode: "restore", data: "" });
      return await edit("📤 فایل پشتیبان .json.gz را همین‌جا برای ربات ارسال کن.\n\nقبل از بازیابی، از دیتابیس فعلی نیز نسخه پشتیبان خودکار گرفته می‌شود. برای لغو: /cancel");
    }
    if (key === "summary") {
      const words = await dbFind(db, "words", {});
      const onoff = v => (v ? "روشن" : "خاموش");
      return await edit(
        `⚙️ <b>خلاصه تنظیمات</b>\n\n` +
        `⚠️ محدودیت اخطار: ${toFa(await getGlobal(db, "warn_limit", "3"))}\n` +
        `🛡️ ضدفحش: ${onoff((await getGlobal(db, "global_antispam", "1")) === "1")}\n` +
        `🔌 ربات: ${(await botIsOn(db)) ? "روشن" : "خاموش"}\n` +
        `🕒 بازه روزانه: ${E(await getGlobal(db, "auto_hours", "off"))}\n` +
        `🔛 خوش‌آمد: ${onoff((await getGlobal(db, "welcome_enabled", "1")) === "1")}\n` +
        `🤖 کپچا: ${onoff((await getGlobal(db, "captcha_enabled", "0")) === "1")}\n` +
        `🌙 سکوت شبانه: ${E(await getGlobal(db, "night_range", "off"))}\n` +
        `🚫 تعداد کلمات فیلتر: ${toFa(words.length)}`
      );
    }
    if (key === "chats") {
      const chats = await getAllChats(db);
      const text = chats.slice(0, 40).map(c => `• ${E(c.title || "")} (<code>${c.chat_id}</code>)`).join("\n") || "گروهی ثبت نشده.";
      return await edit(`📋 <b>گروه‌ها (${toFa(chats.length)})</b>\n\n${text}`);
    }
    if (key === "words") {
      const n = (await dbFind(db, "words", {})).length;
      return await edit(`🚫 <b>کلمات فیلتر</b> (${toFa(n)})\n\nافزودن: <code>/addword کلمه</code>\nحذف: <code>/delword کلمه</code>\nلیست: /listwords`);
    }
    if (key === "gadmins" || key === "gexempts") {
      const allRoles = await dbFind(db, "roles", {});
      const filtered = key === "gadmins"
        ? allRoles.filter(r => r.role === "special_admin" || r.role === "admin")
        : allRoles.filter(r => r.role === "exempt");
      const text = filtered.map(r => `• ${r.user_id} (${r.role}) — گروه ${r.chat_id}`).join("\n") || "—";
      return await edit(`${key === "gadmins" ? "🛡️ مدیران" : "✅ معاف‌ها"}:\n${text}`);
    }
    if (key === "maint") {
      const cur = await botIsOn(db);
      await setBotActive(db, !cur);
      return await edit(`🔌 ربات: ${!cur ? "🟢 روشن شد" : "🔴 خاموش شد"}`);
    }
    if (key === "antispam") {
      const cur = (await getGlobal(db, "global_antispam", "1")) === "1";
      await setGlobal(db, "global_antispam", cur ? "0" : "1");
      return await edit(`🛡️ ضدفحش: ${cur ? "خاموش" : "روشن"}`);
    }
    if (key === "glocks") {
      const rows = [];
      for (const [k, v] of Object.entries(LOCKS)) {
        const locked = (await getGlobal(db, "glock_" + k)) === "1";
        rows.push([{ text: `${locked ? "🔒" : "🔓"} ${v[1]}`, callback_data: `p:gl:${k}` }]);
      }
      return await edit("🔒 قفل سراسری (روی همه گروه‌ها اعمال می‌شود):", backPanelKb(rows));
    }
    if (key === "gl" && parts[2] && LOCKS[parts[2]]) {
      const k = "glock_" + parts[2];
      const cur = (await getGlobal(db, k)) === "1";
      await setGlobal(db, k, cur ? "0" : "1");
      const rows = [];
      for (const [lk, v] of Object.entries(LOCKS)) {
        const locked = (await getGlobal(db, "glock_" + lk)) === "1";
        rows.push([{ text: `${locked ? "🔒" : "🔓"} ${v[1]}`, callback_data: `p:gl:${lk}` }]);
      }
      return await edit("🔒 قفل سراسری (روی همه گروه‌ها اعمال می‌شود):", backPanelKb(rows));
    }
    if (key === "welcometoggle") {
      const cur = (await getGlobal(db, "welcome_enabled", "1")) === "1";
      await setGlobal(db, "welcome_enabled", cur ? "0" : "1");
      return await edit(`🔛 خوش‌آمد: ${cur ? "خاموش" : "روشن"}`);
    }
    if (key === "captcha") {
      const cur = (await getGlobal(db, "captcha_enabled", "0")) === "1";
      await setGlobal(db, "captcha_enabled", cur ? "0" : "1");
      return await edit(`🤖 کپچا: ${cur ? "غیرفعال" : "فعال"}`);
    }
  }
}

// ============================ هندلر وضعیت عضویت ربات و زمان‌بندی‌ها ============================

export async function handleMyChatMember(update, db) {
  const cm = update.my_chat_member;
  if (!cm || cm.chat.type === "private") return;
  const status = cm.new_chat_member.status;
  if (status === "member" || status === "administrator") {
    const icon = cm.chat.type === "channel" ? "📢 " : "";
    await addChat(db, cm.chat.id, icon + (cm.chat.title || "بدون نام"));
  } else if (status === "left" || status === "kicked") {
    await removeChat(db, cm.chat.id);
  }
}

export async function runScheduledJobs(bot, db) {
  const now = nowTs();

  // 1. تایم‌اوت کپچا
  const captchas = await dbFind(db, "captcha_pending", {});
  for (const c of captchas) {
    if (now >= c.expires_at) {
      await dbDelete(db, "captcha_pending", { id: c.id });
      try {
        await bot.banChatMember({ chat_id: c.chat_id, user_id: c.user_id });
        await bot.unbanChatMember({ chat_id: c.chat_id, user_id: c.user_id });
        await bot.deleteMessage({ chat_id: c.chat_id, message_id: c.msg_id });
      } catch {}
    }
  }

  // 2. زمان‌بندی‌های ثبت‌شده
  const pending = await dbFind(db, "schedules", { done: 0 });
  for (const r of pending) {
    if (r.run_at > now) continue;
    await dbPut(db, "schedules", { ...r, done: 1 });
    if (r.kind === "off" || r.kind === "on") {
      await setBotActive(db, r.kind === "on");
      try { await sendHtml(bot, OWNER_ID, `⏰ زمان‌بندی #${r.id} اجرا شد (${fmtJalali(now)})`); } catch {}
    } else if (r.kind === "chat_close" || r.kind === "chat_open") {
      try {
        const d = JSON.parse(r.payload);
        if (now - r.run_at <= 3600) {
          const closed = r.kind === "chat_close";
          await setChatClosed(bot, db, d.chat_id, closed);
          await sendHtml(bot, d.chat_id, card(
            closed ? "🔒" : "🔓",
            closed ? "گپ طبق برنامه بسته شد" : "گپ طبق برنامه باز شد",
            [`🕒 ${fmtJalali(now)} (به وقت تهران)`],
            "زمان‌بندی خودکار ⏰"
          ));
        }
      } catch {}
    } else if (r.kind === "broadcast") {
      if (now - r.run_at <= 3600) {
        try {
          const d = JSON.parse(r.payload);
          const [ok, fail] = await broadcast(bot, db, d.from_chat, d.message_id);
          await sendHtml(bot, OWNER_ID, `⏰ ارسال زمان‌بندی‌شده #${r.id} اجرا شد.\nموفق: ${toFa(ok)} | ناموفق: ${toFa(fail)}`);
        } catch {}
      }
    }
  }

  // 3. بازه روزانه روشن بودن ربات
  const autoRng = await getGlobal(db, "auto_hours", "off");
  if (autoRng !== "off") {
    const desired = inRange(autoRng, now);
    const flag = desired ? "1" : "0";
    if ((await getGlobal(db, "auto_state")) !== flag) {
      await setGlobal(db, "auto_state", flag);
      await setBotActive(db, desired);
      try {
        await sendHtml(bot, OWNER_ID, `${desired ? "🟢 ربات طبق بازه روزانه روشن شد" : "🔴 ربات طبق بازه روزانه خاموش شد"}\n🕒 ${fmtJalali(now)}`);
      } catch {}
    }
  }

  // 4. سکوت شبانه گروه‌ها
  const nightRng = await getGlobal(db, "night_range", "off");
  if (nightRng !== "off") {
    const active = inRange(nightRng, now);
    const was = (await getGlobal(db, "night_active", "0")) === "1";
    if (active !== was) {
      await setGlobal(db, "night_active", active ? "1" : "0");
      for (const c of await getAllChats(db)) {
        try { await setChatClosed(bot, db, c.chat_id, active); } catch {}
      }
    }
  }
}


/* ============================================================================
 * [PART 3: HANDLERS] -> کپی در بخش Handlers پنل Serverless تلگرام
 * ============================================================================ */
/*
import {
  handleMessage,
  handleCallbackQuery,
  handleMyChatMember,
  runScheduledJobs
} from './guard.js';

// 1. هندلر message و edited_message:
export async function onMessage(update, { bot, db }) {
  await handleMessage(update, bot, db);
}

// 2. هندلر callback_query:
export async function onCallbackQuery(update, { bot, db }) {
  await handleCallbackQuery(update, bot, db);
}

// 3. هندلر my_chat_member:
export async function onMyChatMember(update, { bot, db }) {
  await handleMyChatMember(update, bot, db);
}

// 4. هندلر زمان‌بندی (Cron / Scheduled Trigger - هر ۱ دقیقه):
export async function onSchedule(event, { bot, db }) {
  await runScheduledJobs(bot, db);
}
*/