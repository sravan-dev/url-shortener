import { useEffect, useState } from 'react';

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // Fallback for non-secure contexts (plain http).
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  el.remove();
}

export default function CopyButton({ text, className = 'btn small' }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => copyText(text).then(() => setCopied(true))}
      aria-live="polite"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
