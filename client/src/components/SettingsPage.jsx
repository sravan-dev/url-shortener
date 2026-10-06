import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useSettings } from '../settings.js';
import { Dots } from './Logo.jsx';

const MAX_BYTES = 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/x-icon,.ico';

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let result = String(reader.result);
      // Browsers often report .ico files without a MIME type.
      if (/\.ico$/i.test(file.name)) result = result.replace(/^data:[^;]*;/, 'data:image/x-icon;');
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

function ImageSetting({ kind, label, hint, custom, version, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (file.size > MAX_BYTES) return setError('Image must be 1 MB or smaller');
    setBusy(true);
    try {
      onChange(await api.uploadImage(kind, await readAsDataUrl(file)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setError('');
    try {
      onChange(await api.removeImage(kind));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-setting">
      <div className={`image-preview ${kind}`}>
        <img src={`/brand/${kind}?v=${version}`} alt={`Current ${label.toLowerCase()}`} />
      </div>
      <div className="image-info">
        <strong>{label}</strong>
        <span className="hint">{hint}</span>
        <span className="hint">{custom ? 'Custom image' : 'Using the default Tiju’s Academy image'}</span>
        <div className="row">
          <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFile} hidden />
          <button type="button" className="btn small" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : 'Upload'}
          </button>
          {custom && (
            <button type="button" className="btn small" onClick={reset} disabled={busy}>
              Reset to default
            </button>
          )}
        </div>
        {error && <p className="alert error">{error}</p>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, setSettings } = useSettings();
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle);
  const [noindex, setNoindex] = useState(settings.noindex);
  const [notFoundUrl, setNotFoundUrl] = useState(settings.notFoundUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }

  // Pick up values once the settings request resolves (or after another tab saves).
  useEffect(() => {
    setSiteTitle(settings.siteTitle);
    setNoindex(settings.noindex);
    setNotFoundUrl(settings.notFoundUrl);
  }, [settings.siteTitle, settings.noindex, settings.notFoundUrl]);

  const dirty =
    siteTitle !== settings.siteTitle || noindex !== settings.noindex || notFoundUrl !== settings.notFoundUrl;

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      setSettings(await api.saveSettings({ siteTitle, noindex, notFoundUrl }));
      setMessage({ ok: true, text: 'Settings saved' });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container stack">
      <div>
        <p className="kicker">Admin</p>
        <h1>
          Settings <Dots />
        </h1>
      </div>

      <form className="stack-tight" onSubmit={handleSubmit}>
        <section className="card settings-section edge-yellow">
          <h2>General</h2>
          <label className="field">
            <span>Website title</span>
            <input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} maxLength={120} required />
          </label>
          <p className="hint">Shown in the browser tab, the top bar and the sign-in page.</p>
        </section>

        <section className="card settings-section edge-blue">
          <h2>Search engines</h2>
          <label className="toggle">
            <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
            <span className="toggle-track" aria-hidden="true" />
            <span>
              <strong>Hide from search engines (noindex)</strong>
              <span className="hint block">
                Adds <code>noindex, nofollow</code> to every page and short-link redirect so Google and others don’t
                list them. Recommended for a private link portal.
              </span>
            </span>
          </label>
        </section>

        <section className="card settings-section edge-green">
          <h2>Short links</h2>
          <label className="field">
            <span>Redirect unknown links to (optional)</span>
            <input
              type="text"
              inputMode="url"
              value={notFoundUrl}
              onChange={(e) => setNotFoundUrl(e.target.value)}
              placeholder="https://tijusacademy.com"
            />
          </label>
          <p className="hint">Leave empty to show a “Link not found” page instead.</p>
        </section>

        <div className="row save-row">
          <button className="btn primary" disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          {message && <span className={message.ok ? 'status ok' : 'status bad'}>{message.text}</span>}
        </div>
      </form>

      <section className="card settings-section edge-red">
        <h2>Branding</h2>
        <p className="hint">Images save as soon as you upload them. PNG, JPG, WebP, GIF or ICO, up to 1 MB.</p>
        <ImageSetting
          kind="logo"
          label="Logo"
          hint="Top bar and sign-in page. A wide image around 400×230 px works best."
          custom={settings.hasLogo}
          version={settings.version}
          onChange={setSettings}
        />
        <ImageSetting
          kind="favicon"
          label="Favicon"
          hint="Browser tab icon. Use a square image, at least 64×64 px."
          custom={settings.hasFavicon}
          version={settings.version}
          onChange={setSettings}
        />
      </section>
    </main>
  );
}
