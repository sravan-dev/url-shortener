import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool, initDb } from './db.js';
import { CODE_RE } from './codes.js';
import authRouter from './routes/auth.js';
import linksRouter from './routes/links.js';

const REQUIRED_ENV = ['DB_USER', 'DB_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../client/dist');
const indexHtml = path.join(distDir, 'index.html');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});
app.use('/api/auth', authRouter);
app.use('/api/links', linksRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Hashed build assets can be cached forever; index.html is served below with no-cache.
app.use('/assets', express.static(path.join(distDir, 'assets'), { maxAge: '1y', immutable: true }));
app.use(express.static(distDir, { index: false }));

// Short link redirect.
app.get('/:code', async (req, res, next) => {
  const { code } = req.params;
  if (!CODE_RE.test(code)) return next();
  const [rows] = await pool.query('SELECT id, url FROM links WHERE code = ? LIMIT 1', [code]);
  if (!rows.length) return next();
  pool
    .query('UPDATE links SET clicks = clicks + 1, last_clicked_at = UTC_TIMESTAMP() WHERE id = ?', [rows[0].id])
    .catch((err) => console.error('Click count failed:', err.message));
  res.set('Cache-Control', 'no-store');
  res.redirect(302, rows[0].url);
});

// SPA: "/" renders the portal; any other path renders the app's not-found view with a 404 status.
app.use((req, res) => {
  if (req.method !== 'GET' || !fs.existsSync(indexHtml)) {
    return res.status(404).send('Not found');
  }
  res.set('Cache-Control', 'no-cache');
  res.status(req.path === '/' ? 200 : 404).sendFile(indexHtml);
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Server error' });
});

const port = Number(process.env.PORT) || 3000;

initDb()
  .then(() => {
    app.listen(port, () => console.log(`URL shortener running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('Database initialisation failed:', err.message);
    process.exit(1);
  });
