import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { normalizeUrl } from '../codes.js';
import { IMAGE_KINDS, publicSettings, saveSettings, saveImage, parseImageDataUrl } from '../settings.js';

const router = Router();

// Needed by the login page before anyone is signed in.
router.get('/public', (req, res) => {
  res.json(publicSettings());
});

router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(publicSettings());
});

router.put('/', async (req, res) => {
  const body = req.body ?? {};
  const update = {};

  if (body.siteTitle !== undefined) {
    const title = String(body.siteTitle).trim();
    if (!title) return res.status(400).json({ error: 'Site title cannot be empty' });
    if (title.length > 120) return res.status(400).json({ error: 'Site title must be 120 characters or fewer' });
    update.siteTitle = title;
  }
  if (body.noindex !== undefined) update.noindex = Boolean(body.noindex);
  if (body.notFoundUrl !== undefined) {
    const raw = String(body.notFoundUrl).trim();
    if (raw) {
      const url = normalizeUrl(raw);
      if (!url) return res.status(400).json({ error: 'Fallback URL must be a valid http(s) URL' });
      update.notFoundUrl = url;
    } else {
      update.notFoundUrl = '';
    }
  }

  await saveSettings(update);
  res.json(publicSettings());
});

router.put('/image/:kind', async (req, res) => {
  const { kind } = req.params;
  if (!IMAGE_KINDS.includes(kind)) return res.status(404).json({ error: 'Unknown image' });
  let image;
  try {
    image = parseImageDataUrl(req.body?.dataUrl);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  await saveImage(kind, image);
  res.json(publicSettings());
});

router.delete('/image/:kind', async (req, res) => {
  const { kind } = req.params;
  if (!IMAGE_KINDS.includes(kind)) return res.status(404).json({ error: 'Unknown image' });
  await saveImage(kind, null);
  res.json(publicSettings());
});

export default router;
