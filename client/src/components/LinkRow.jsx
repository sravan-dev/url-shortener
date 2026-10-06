import { useState } from 'react';
import { api } from '../api.js';
import CopyButton from './CopyButton.jsx';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function LinkRow({ link, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(link.url);
  const [title, setTitle] = useState(link.title ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function startEdit() {
    setUrl(link.url);
    setTitle(link.title ?? '');
    setError('');
    setEditing(true);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onUpdated(await api.updateLink(link.id, { url, title }));
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${link.shortUrl}? The short link will stop working.`)) return;
    setBusy(true);
    try {
      await api.deleteLink(link.id);
      onDeleted(link.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="link-item editing">
        <form onSubmit={save} className="edit-form">
          <label className="field">
            <span>Destination URL</span>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span>Title</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
          </label>
          {error && <p className="alert error">{error}</p>}
          <div className="row end">
            <button type="button" className="btn" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="link-item">
      <div className="link-main">
        {link.title && <div className="link-title">{link.title}</div>}
        <a href={link.shortUrl} target="_blank" rel="noreferrer" className="short-url">
          {link.shortUrl.replace(/^https?:\/\//, '')}
        </a>
        <a href={link.url} target="_blank" rel="noreferrer" className="dest" title={link.url}>
          {link.url}
        </a>
        <div className="meta">
          Created {dateFormat.format(new Date(link.createdAt))}
          {link.lastClickedAt && <> · Last click {dateTimeFormat.format(new Date(link.lastClickedAt))}</>}
        </div>
        {error && <p className="alert error">{error}</p>}
      </div>
      <div className="clicks" title="Total clicks">
        <strong>{link.clicks.toLocaleString()}</strong>
        <span>clicks</span>
      </div>
      <div className="actions">
        <CopyButton text={link.shortUrl} />
        <button type="button" className="btn small" onClick={startEdit} disabled={busy}>
          Edit
        </button>
        <button type="button" className="btn small danger" onClick={remove} disabled={busy}>
          Delete
        </button>
      </div>
    </li>
  );
}
