import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool, connectDb } from './db.js';
import { CODE_RE } from './codes.js';
import { isBot, detectSource } from './sources.js';
import authRouter from './routes/auth.js';
import linksRouter from './routes/links.js';
import setupRouter from './routes/setup.js';
import settingsRouter from './routes/settings.js';
import { getSettings, loadSettings } from './settings.js';
import { isConfigured, markConfigured, missingEnv } from './setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../client/dist');
const indexHtml = path.join(distDir, 'index.html');
// Pages the single-page app renders itself; everything else is a short code or 404.
const APP_PATHS = new Set(['/', '/settings']);

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
// Image uploads arrive as base64 data URLs, so that one route gets a bigger body limit.
const smallJson = express.json({ limit: '32kb' });
const imageJson = express.json({ limit: '2mb' });
app.use((req, res, next) => (req.path.startsWith('/api/settings/image/') ? imageJson : smallJson)(req, res, next));
app.use(cookieParser());

app.use((req, res, next) => {
  if (isConfigured() && getSettings().noindex) res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.use('/api/setup', setupRouter);

// Until setup is finished, only the setup API and the static app are available.
app.use('/api', (req, res, next) => {
  if (isConfigured()) return next();
  res.status(503).json({ error: 'Setup required', setupRequired: true });
});

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});
app.use('/api/auth', authRouter);
app.use('/api/links', linksRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Uploaded logo/favicon from the database, falling back to the bundled brand files.
app.get('/brand/:kind', (req, res, next) => {
  const { kind } = req.params;
  if (kind !== 'logo' && kind !== 'favicon') return next();
  const image = isConfigured() ? getSettings()[kind] : null;
  res.set('X-Content-Type-Options', 'nosniff');
  if (image) {
    res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
    return res.type(image.type).send(image.data);
  }
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, kind === 'logo' ? 'logo.png' : 'favicon.svg'), (err) => err && next());
});

// Hashed build assets can be cached forever; index.html is served below with no-cache.
app.use('/assets', express.static(path.join(distDir, 'assets'), { maxAge: '1y', immutable: true }));
app.use(express.static(distDir, { index: false }));

// Short link redirect.
app.get('/:code', async (req, res, next) => {
  const { code } = req.params;
  if (!isConfigured() || !CODE_RE.test(code)) return next();
  const [rows] = await pool.query('SELECT id, url FROM links WHERE code = ? LIMIT 1', [code]);
  if (!rows.length) return next();
  // Link previews (WhatsApp, Facebook, Telegram…) and crawlers still get redirected but aren't counted.
  if (!isBot(req.get('user-agent'))) {
    const { id } = rows[0];
    const { source, referrer } = detectSource(req);
    Promise.all([
      pool.query('UPDATE links SET clicks = clicks + 1, last_clicked_at = UTC_TIMESTAMP() WHERE id = ?', [id]),
      pool.query('INSERT INTO clicks (link_id, source, referrer) VALUES (?, ?, ?)', [id, source, referrer]),
    ]).catch((err) => console.error('Click tracking failed:', err.message));
  }
  res.set('Cache-Control', 'no-store');
  res.redirect(302, rows[0].url);
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let indexTemplate = null;
function renderIndex() {
  indexTemplate ??= fs.readFileSync(indexHtml, 'utf8');
  if (!isConfigured()) return indexTemplate;
  const settings = getSettings();
  return indexTemplate
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(settings.siteTitle)}</title>`)
    .replace(/<meta name="robots"[^>]*>/, () => `<meta name="robots" content="${settings.noindex ? 'noindex, nofollow' : 'index, follow'}" />`)
    .replace(/<link rel="icon"[^>]*>/, () => `<link rel="icon" href="/brand/favicon?v=${settings.version}" />`);
}

// App pages render the SPA; unknown paths go to the fallback URL if one is set, else the not-found view.
app.use((req, res) => {
  if (req.method !== 'GET' || !fs.existsSync(indexHtml)) {
    return res.status(404).send('Not found');
  }
  const ok = APP_PATHS.has(req.path) || !isConfigured();
  if (!ok && getSettings().notFoundUrl) {
    res.set('Cache-Control', 'no-store');
    return res.redirect(302, getSettings().notFoundUrl);
  }
  res.set('Cache-Control', 'no-cache');
  res.status(ok ? 200 : 404).type('html').send(renderIndex());
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Server error' });
});

const port = Number(process.env.PORT) || 3000;

async function start() {
  const missing = missingEnv();
  if (missing.length) {
    console.log(`Setup required (missing: ${missing.join(', ')}). Open the site in your browser to finish setup.`);
  } else {
    await connectDb();
    await loadSettings();
    markConfigured();
  }
  app.listen(port, () => console.log(`URL shortener running on http://localhost:${port}`));
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
