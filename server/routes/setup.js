import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { connectDb, testConnection } from '../db.js';
import { isConfigured, markConfigured, buildEnvFile, writeEnvFile, ENV_PATH } from '../setup.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

router.get('/status', (req, res) => {
  res.json({ needsSetup: !isConfigured() });
});

// Everything below is only reachable until setup completes.
router.use(limiter, (req, res, next) => {
  if (isConfigured()) return res.status(403).json({ error: 'Setup has already been completed' });
  next();
});

function readDb(body) {
  const db = body?.db ?? {};
  const config = {
    host: String(db.host ?? '').trim() || 'localhost',
    port: Number(db.port) || 3306,
    user: String(db.user ?? '').trim(),
    password: String(db.password ?? ''),
    database: String(db.database ?? '').trim(),
  };
  if (!config.user || !config.database) throw new Error('Database user and database name are required');
  if (config.port < 1 || config.port > 65535) throw new Error('Database port is invalid');
  return config;
}

function dbErrorMessage(err) {
  const hints = {
    ER_ACCESS_DENIED_ERROR: 'Access denied — check the database user and password.',
    ER_BAD_DB_ERROR: 'Database not found — check the database name.',
    ECONNREFUSED: 'Connection refused — check the host and port.',
    ENOTFOUND: 'Host not found — check the database host.',
    ETIMEDOUT: 'Connection timed out — check the host and port.',
  };
  // Never echo raw driver messages: before setup this endpoint is public.
  return hints[err.code] || `Could not connect to the database${err.code ? ` (${err.code})` : ''}.`;
}

router.post('/test-db', async (req, res) => {
  let config;
  try {
    config = readDb(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const version = await testConnection(config);
    res.json({ ok: true, version });
  } catch (err) {
    res.status(400).json({ error: dbErrorMessage(err) });
  }
});

// Only one setup submission may run at a time; otherwise two concurrent requests could
// both pass the isConfigured() check and the later one would overwrite the first.
let setupInProgress = false;

router.post('/', async (req, res) => {
  let db;
  try {
    db = readDb(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const adminEmail = String(req.body?.adminEmail ?? '').trim();
  const adminPassword = String(req.body?.adminPassword ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return res.status(400).json({ error: 'Enter a valid admin email' });
  if (adminPassword.length < 10) return res.status(400).json({ error: 'Admin password must be at least 10 characters' });

  let baseUrl = String(req.body?.baseUrl ?? '').trim().replace(/\/+$/, '');
  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      baseUrl = url.origin;
    } catch {
      return res.status(400).json({ error: 'Site URL must look like https://go.example.com' });
    }
  }

  // Validation above is synchronous, so this check-and-set cannot interleave with another request.
  if (setupInProgress) return res.status(409).json({ error: 'Setup is already in progress' });
  setupInProgress = true;
  try {
    await completeSetup(req, res, { db, baseUrl, adminEmail, adminPassword });
  } finally {
    setupInProgress = false;
  }
});

async function completeSetup(req, res, { db, baseUrl, adminEmail, adminPassword }) {
  if (isConfigured()) return res.status(403).json({ error: 'Setup has already been completed' });

  try {
    await testConnection(db);
  } catch (err) {
    return res.status(400).json({ error: dbErrorMessage(err) });
  }

  const values = {
    // Secure cookies require HTTPS, so only switch to production mode for https sites.
    NODE_ENV: baseUrl.startsWith('https://') ? 'production' : 'development',
    BASE_URL: baseUrl,
    DB_HOST: db.host,
    DB_PORT: String(db.port),
    DB_USER: db.user,
    DB_PASSWORD: db.password,
    DB_NAME: db.database,
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD: adminPassword,
    JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  };

  let content;
  try {
    content = buildEnvFile(values);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  let envWritten = true;
  let writeError = null;
  try {
    writeEnvFile(content);
  } catch (err) {
    envWritten = false;
    writeError = err.message;
    console.error(`Could not write ${ENV_PATH}:`, err.message);
  }

  Object.assign(process.env, values);
  await connectDb();
  markConfigured();
  console.log('Setup complete — portal is live.');

  res.json({ ok: true, envWritten, writeError, envPath: ENV_PATH, env: content });
}

export default router;
