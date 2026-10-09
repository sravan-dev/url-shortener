import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { CODE_RE, RESERVED, randomCode, normalizeUrl } from '../codes.js';

const router = Router();
router.use(requireAuth);

function baseUrl(req) {
  return (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

function serialize(req, row, sources = []) {
  return {
    id: row.id,
    code: row.code,
    url: row.url,
    title: row.title,
    clicks: row.clicks,
    lastClickedAt: row.last_clicked_at,
    createdAt: row.created_at,
    shortUrl: `${baseUrl(req)}/${row.code}`,
    sources,
  };
}

// Per-link click counts grouped by source, most clicks first.
async function sourcesByLink(ids) {
  const map = new Map();
  if (!ids.length) return map;
  const [rows] = await pool.query(
    'SELECT link_id, source, COUNT(*) AS clicks FROM clicks WHERE link_id IN (?) GROUP BY link_id, source ORDER BY clicks DESC, source',
    [ids],
  );
  for (const row of rows) {
    if (!map.has(row.link_id)) map.set(row.link_id, []);
    map.get(row.link_id).push({ source: row.source, clicks: Number(row.clicks) });
  }
  return map;
}

function cleanTitle(title) {
  const value = String(title ?? '').trim();
  return value ? value.slice(0, 255) : null;
}

router.get('/', async (req, res) => {
  const search = String(req.query.search ?? '').trim();
  const params = [];
  let where = '';
  if (search) {
    where = 'WHERE code LIKE ? OR url LIKE ? OR title LIKE ?';
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    params.push(like, like, like);
  }
  const [rows] = await pool.query(`SELECT * FROM links ${where} ORDER BY created_at DESC, id DESC LIMIT 1000`, params);
  const [[totals]] = await pool.query('SELECT COUNT(*) AS links, COALESCE(SUM(clicks), 0) AS clicks FROM links');
  const sources = await sourcesByLink(rows.map((row) => row.id));
  res.json({
    links: rows.map((row) => serialize(req, row, sources.get(row.id))),
    totals: { links: Number(totals.links), clicks: Number(totals.clicks) },
  });
});

router.post('/', async (req, res) => {
  const url = normalizeUrl(req.body?.url);
  if (!url) return res.status(400).json({ error: 'Enter a valid http(s) URL' });

  const custom = String(req.body?.code ?? '').trim();
  if (custom && (!CODE_RE.test(custom) || RESERVED.has(custom.toLowerCase()))) {
    return res
      .status(400)
      .json({ error: 'Alias must be 3–64 characters: letters, numbers, - or _ (and not a reserved word)' });
  }

  const title = cleanTitle(req.body?.title);
  const attempts = custom ? 1 : 5;
  for (let i = 0; i < attempts; i++) {
    const code = custom || randomCode(i < 3 ? 6 : 8);
    try {
      const [result] = await pool.query('INSERT INTO links (code, url, title) VALUES (?, ?, ?)', [code, url, title]);
      const [[row]] = await pool.query('SELECT * FROM links WHERE id = ?', [result.insertId]);
      return res.status(201).json(serialize(req, row));
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      if (custom) return res.status(409).json({ error: `Alias "${custom}" is already taken` });
    }
  }
  res.status(500).json({ error: 'Could not generate a unique code, try again' });
});

router.patch('/:id', async (req, res) => {
  const fields = [];
  const params = [];
  if (req.body?.url !== undefined) {
    const url = normalizeUrl(req.body.url);
    if (!url) return res.status(400).json({ error: 'Enter a valid http(s) URL' });
    fields.push('url = ?');
    params.push(url);
  }
  if (req.body?.title !== undefined) {
    fields.push('title = ?');
    params.push(cleanTitle(req.body.title));
  }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  const [result] = await pool.query(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`, [...params, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Link not found' });
  const [[row]] = await pool.query('SELECT * FROM links WHERE id = ?', [req.params.id]);
  res.json(serialize(req, row));
});

router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM links WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Link not found' });
  res.json({ ok: true });
});

export default router;
