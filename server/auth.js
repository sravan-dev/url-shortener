import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

// Compare digests so timingSafeEqual always receives equal-length buffers.
export function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

export function checkCredentials(email, password) {
  const emailOk = safeEqual(String(email).trim().toLowerCase(), process.env.ADMIN_EMAIL.trim().toLowerCase());
  const passwordOk = safeEqual(password, process.env.ADMIN_PASSWORD);
  return emailOk && passwordOk;
}

export function setSessionCookie(res, email) {
  const token = jwt.sign({ sub: email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}
