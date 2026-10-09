import { useState } from 'react';

const LABELS = {
  direct: 'Direct',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  bing: 'Bing',
  yahoo: 'Yahoo',
  duckduckgo: 'DuckDuckGo',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  telegram: 'Telegram',
  reddit: 'Reddit',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  email: 'Email',
  sms: 'SMS',
  qr: 'QR code',
  line: 'LINE',
};

export function sourceLabel(source) {
  return LABELS[source] ?? source;
}

const VISIBLE = 3;

// Click counts per source for one link. Clicks recorded before source tracking existed show as "Earlier".
export default function Sources({ sources = [], clicks }) {
  const [expanded, setExpanded] = useState(false);
  const tracked = sources.reduce((sum, s) => sum + s.clicks, 0);
  const earlier = Math.max(0, clicks - tracked);
  const items = earlier ? [...sources, { source: '__earlier', clicks: earlier }] : sources;

  if (!items.length) return <div className="sources empty-sources">No clicks yet</div>;

  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hidden = items.length - shown.length;

  return (
    <ul className="sources" aria-label="Clicks by source">
      {shown.map(({ source, clicks: count }, index) => (
        <li key={source} className={source === '__earlier' ? 'chip muted-chip' : `chip dot-${index % 4}`}>
          <span className="chip-label" title={source === '__earlier' ? 'Clicks before source tracking was added' : source}>
            {source === '__earlier' ? 'Earlier' : sourceLabel(source)}
          </span>
          <strong>{count.toLocaleString()}</strong>
        </li>
      ))}
      {(hidden > 0 || expanded) && items.length > VISIBLE && (
        <li>
          <button type="button" className="link-btn inline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `+${hidden} more`}
          </button>
        </li>
      )}
    </ul>
  );
}
