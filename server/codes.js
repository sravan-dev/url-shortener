import crypto from 'node:crypto';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const CODE_RE = /^[A-Za-z0-9_-]{3,64}$/;

// Paths used by the app itself; never hand them out as short codes.
export const RESERVED = new Set(['api', 'assets', 'login', 'logout', 'admin', 'dashboard', 'favicon.ico', 'robots.txt']);

export function randomCode(length = 6) {
  let out = '';
  const bytes = crypto.randomBytes(length * 2);
  for (let i = 0; out.length < length && i < bytes.length; i++) {
    // Rejection sampling keeps the distribution uniform.
    if (bytes[i] < 256 - (256 % ALPHABET.length)) out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out.length === length ? out : randomCode(length);
}

export function normalizeUrl(input) {
  let value = String(input ?? '').trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.toString();
  } catch {
    return null;
  }
}
