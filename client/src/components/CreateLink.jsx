import { useState } from 'react';
import { api } from '../api.js';
import CopyButton from './CopyButton.jsx';
import { Dots } from './Logo.jsx';

export default function CreateLink({ onCreated }) {
  const [url, setUrl] = useState('');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const link = await api.createLink({ url, code: code.trim() || undefined, title: title.trim() || undefined });
      setCreated(link);
      setUrl('');
      setCode('');
      setTitle('');
      onCreated(link);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <form onSubmit={handleSubmit}>
        <h2>
          Shorten a link <Dots />
        </h2>
        <div className="row">
          <input
            className="grow"
            type="text"
            inputMode="url"
            placeholder="Paste a long URL, e.g. https://example.com/very/long/page"
            aria-label="Long URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button className="btn primary" disabled={busy}>
            {busy ? 'Shortening…' : 'Shorten'}
          </button>
        </div>

        <button type="button" className="link-btn" onClick={() => setShowOptions((v) => !v)} aria-expanded={showOptions}>
          {showOptions ? '− Hide options' : '+ Custom alias & title'}
        </button>

        {showOptions && (
          <div className="options">
            <label className="field">
              <span>Custom alias (optional)</span>
              <div className="prefixed">
                <span className="prefix">{window.location.host}/</span>
                <input
                  type="text"
                  placeholder="my-link"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  pattern="[A-Za-z0-9_\-]{3,64}"
                  title="3–64 characters: letters, numbers, - or _"
                />
              </div>
            </label>
            <label className="field">
              <span>Title (optional)</span>
              <input type="text" placeholder="Spring campaign" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
            </label>
          </div>
        )}

        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
      </form>

      {created && (
        <div className="alert success result">
          <a href={created.shortUrl} target="_blank" rel="noreferrer" className="short-url">
            {created.shortUrl}
          </a>
          <CopyButton text={created.shortUrl} className="btn small primary" />
        </div>
      )}
    </section>
  );
}
