import { pool } from './db.js';

export const DEFAULTS = {
  siteTitle: "Tiju's Academy · Link Portal",
  noindex: true,
  notFoundUrl: '',
};

export const IMAGE_KINDS = ['logo', 'favicon'];
export const MAX_IMAGE_BYTES = 1024 * 1024;

const IMAGE_TYPES = {
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/gif': (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  'image/x-icon': (b) => b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0,
};

let cache = { ...DEFAULTS, logo: null, favicon: null, version: 0 };

export function getSettings() {
  return cache;
}

export function publicSettings() {
  return {
    siteTitle: cache.siteTitle,
    noindex: cache.noindex,
    notFoundUrl: cache.notFoundUrl,
    hasLogo: Boolean(cache.logo),
    hasFavicon: Boolean(cache.favicon),
    version: cache.version,
  };
}

function decodeStoredImage(value) {
  if (!value) return null;
  try {
    const { type, data } = JSON.parse(value);
    return { type, data: Buffer.from(data, 'base64') };
  } catch {
    return null;
  }
}

export async function loadSettings() {
  const [rows] = await pool.query('SELECT name, value FROM settings');
  const map = Object.fromEntries(rows.map((row) => [row.name, row.value]));
  cache = {
    siteTitle: map.siteTitle ?? DEFAULTS.siteTitle,
    noindex: map.noindex === undefined ? DEFAULTS.noindex : map.noindex === '1',
    notFoundUrl: map.notFoundUrl ?? DEFAULTS.notFoundUrl,
    logo: decodeStoredImage(map.logo),
    favicon: decodeStoredImage(map.favicon),
    version: Number(map.version) || 0,
  };
  return cache;
}

async function upsert(name, value) {
  if (value === null) {
    await pool.query('DELETE FROM settings WHERE name = ?', [name]);
  } else {
    await pool.query(
      'INSERT INTO settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP',
      [name, value],
    );
  }
}

export async function saveSettings({ siteTitle, noindex, notFoundUrl }) {
  if (siteTitle !== undefined) await upsert('siteTitle', siteTitle);
  if (noindex !== undefined) await upsert('noindex', noindex ? '1' : '0');
  if (notFoundUrl !== undefined) await upsert('notFoundUrl', notFoundUrl);
  // Clients append the version to logo/favicon URLs, so bumping it busts their caches.
  await upsert('version', String(Date.now()));
  return loadSettings();
}

// Parses a data: URL, checks the declared type against the file's magic bytes and the size limit.
export function parseImageDataUrl(dataUrl) {
  const match = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(dataUrl ?? ''));
  if (!match) throw new Error('Upload a PNG, JPG, WebP, GIF or ICO image');
  let type = match[1].toLowerCase();
  if (type === 'image/vnd.microsoft.icon') type = 'image/x-icon';
  const check = IMAGE_TYPES[type];
  if (!check) throw new Error('Upload a PNG, JPG, WebP, GIF or ICO image (SVG is not allowed)');
  const data = Buffer.from(match[2], 'base64');
  if (data.length > MAX_IMAGE_BYTES) throw new Error('Image must be 1 MB or smaller');
  if (!check(data)) throw new Error('The file content does not match its image type');
  return { type, data };
}

export async function saveImage(kind, image) {
  await upsert(kind, image ? JSON.stringify({ type: image.type, data: image.data.toString('base64') }) : null);
  await upsert('version', String(Date.now()));
  return loadSettings();
}
