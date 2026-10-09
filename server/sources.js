// Works out where a short-link click came from, without storing IPs or full user agents.

// Link-preview crawlers and search bots fetch the URL without a human clicking it.
const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|twitterbot|skypeuripreview|embedly|preview|headlesschrome|curl|wget|python-requests|go-http-client/i;

// In-app browsers identify themselves in the user agent even when no referrer is sent.
const IN_APP = [
  [/Instagram/i, 'instagram'],
  [/FBAN|FBAV|FB_IAB|FB4A/i, 'facebook'],
  [/LinkedInApp/i, 'linkedin'],
  [/musical_ly|Bytedance|TikTok/i, 'tiktok'],
  [/Snapchat/i, 'snapchat'],
  [/Twitter/i, 'x'],
  [/Pinterest/i, 'pinterest'],
  [/Line\//i, 'line'],
];

// Order matters: web mail comes before search so mail.google.com isn't counted as Google search.
const REFERRER_HOSTS = [
  [/(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com)$/, 'email'],
  [/(^|\.)google\./, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)yahoo\./, 'yahoo'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'facebook'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'x'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$/, 'telegram'],
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/(^|\.)pinterest\./, 'pinterest'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)snapchat\.com$/, 'snapchat'],
];

export function isBot(userAgent) {
  return !userAgent || BOT_RE.test(userAgent);
}

function cleanTag(value) {
  const tag = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return tag || null;
}

export function referrerHost(referrer) {
  try {
    const url = new URL(referrer);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.hostname.toLowerCase().replace(/^www\./, '').slice(0, 255);
  } catch {
    return null;
  }
}

/**
 * @returns {{ source: string, referrer: string | null }}
 */
export function detectSource(req) {
  const referrer = referrerHost(req.get('referer'));

  // 1. Explicit tag on the short link, e.g. /abc123?src=whatsapp — the only reliable signal
  //    for apps that send no referrer (WhatsApp, SMS, email clients, QR codes).
  const tag = cleanTag(req.query.src ?? req.query.utm_source);
  if (tag) return { source: tag, referrer };

  // 2. In-app browsers.
  const ua = req.get('user-agent') || '';
  for (const [re, source] of IN_APP) if (re.test(ua)) return { source, referrer };

  // 3. Referring site.
  if (referrer) {
    for (const [re, source] of REFERRER_HOSTS) if (re.test(referrer)) return { source, referrer };
    return { source: referrer, referrer };
  }

  // 4. Nothing to go on: typed, bookmarked, or opened from an app that strips the referrer.
  return { source: 'direct', referrer: null };
}
