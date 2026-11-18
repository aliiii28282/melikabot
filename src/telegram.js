import { config } from './config.js';

const apiBase = `https://api.telegram.org/bot${config.botToken}`;
const fileBase = `https://api.telegram.org/file/bot${config.botToken}`;
const snake = value => value.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);

async function apiCall(method, payload = {}) {
  const response = await fetch(`${apiBase}/${snake(method)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram API ${method} failed (${response.status})`);
  return data.result;
}

async function sendDocument({ chat_id, document, filename = 'backup.json.gz', caption }) {
  const form = new FormData();
  form.set('chat_id', String(chat_id));
  if (caption) form.set('caption', caption);
  const blob = new Blob([document], { type: 'application/gzip' });
  form.set('document', blob, filename);
  const response = await fetch(`${apiBase}/sendDocument`, { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram sendDocument failed (${response.status})`);
  return data.result;
}

async function downloadFile(fileId) {
  const info = await apiCall('getFile', { file_id: fileId });
  if (!info?.file_path) throw new Error('Telegram did not return a file path');
  const response = await fetch(`${fileBase}/${info.file_path}`);
  if (!response.ok) throw new Error(`Telegram file download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 15 * 1024 * 1024) throw new Error('File exceeds 15 MB limit');
  return bytes;
}

export const bot = new Proxy({ sendDocument, downloadFile }, {
  get(target, property) {
    if (property in target) return target[property];
    if (typeof property === 'string' && /^[a-z][A-Za-z0-9]*$/.test(property)) {
      return payload => apiCall(property, payload || {});
    }
    return undefined;
  }
});
