import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkCredentials, setSessionCookie, clearSessionCookie, requireAuth } from '../auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

router.post('/login', loginLimiter, (req, res) => {
  const { email = '', password = '' } = req.body ?? {};
  if (!checkCredentials(email, password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  setSessionCookie(res, process.env.ADMIN_EMAIL);
  res.json({ email: process.env.ADMIN_EMAIL });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ email: req.user.sub });
});

export default router;
