import { useState } from 'react';
import { api } from '../api.js';
import Logo, { Dots } from './Logo.jsx';
import CopyButton from './CopyButton.jsx';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const s = Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
  return `${s.slice(0, 6)}-${s.slice(6, 12)}-${s.slice(12)}`;
}

export default function Setup({ onComplete }) {
  const [db, setDb] = useState({ host: 'localhost', port: '3306', database: '', user: '', password: '' });
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [dbStatus, setDbStatus] = useState(null); // { ok, message }
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const updateDb = (field) => (e) => {
    setDb((prev) => ({ ...prev, [field]: e.target.value }));
    setDbStatus(null);
  };

  async function testDb() {
    setTesting(true);
    setDbStatus(null);
    try {
      const { version } = await api.setupTestDb({ db });
      setDbStatus({ ok: true, message: `Connected — server version ${version}` });
    } catch (err) {
      setDbStatus({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  }

  function fillPassword() {
    const value = generatePassword();
    setAdminPassword(value);
    setConfirmPassword(value);
    setShowPassword(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (adminPassword !== confirmPassword) return setError('Admin passwords do not match');
    setBusy(true);
    try {
      setResult(await api.setupComplete({ db, baseUrl, adminEmail, adminPassword }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <main className="auth">
        <div className="card auth-card setup-card">
          <Logo height={84} />
          <p className="kicker">Setup complete</p>
          <h1>Your portal is ready</h1>
          <Dots className="rule" />
          {result.envWritten ? (
            <p className="alert success">
              Configuration saved to <code>{result.envPath}</code>.
            </p>
          ) : (
            <p className="alert error">
              Could not write the .env file ({result.writeError}). The portal is running with these settings until the
              next restart — add them as environment variables to make them permanent.
            </p>
          )}
          <p className="muted small">
            On Hostinger, a redeploy can replace the app folder. To be safe, also copy these values into hPanel →
            your Node.js app → Environment variables. Keep them private.
          </p>
          <div className="env-block">
            <div className="row between">
              <strong>.env</strong>
              <CopyButton text={result.env} />
            </div>
            <pre>{result.env}</pre>
          </div>
          <button className="btn primary block" onClick={onComplete}>
            Continue to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="auth">
      <form className="card auth-card setup-card" onSubmit={handleSubmit}>
        <Logo height={84} />
        <p className="kicker">First-time setup</p>
        <h1>Configure Link Portal</h1>
        <Dots className="rule" />
        <p className="muted">Connect your MySQL database and create the admin login. This generates the .env file.</p>

        <fieldset>
          <legend>
            <span className="step step-1">1</span> Database
          </legend>
          <div className="grid-2">
            <label className="field">
              <span>Host</span>
              <input value={db.host} onChange={updateDb('host')} required autoFocus />
            </label>
            <label className="field">
              <span>Port</span>
              <input value={db.port} onChange={updateDb('port')} inputMode="numeric" required />
            </label>
          </div>
          <label className="field">
            <span>Database name</span>
            <input value={db.database} onChange={updateDb('database')} placeholder="u123456789_links" required />
          </label>
          <label className="field">
            <span>Database user</span>
            <input value={db.user} onChange={updateDb('user')} placeholder="u123456789_links" required autoComplete="off" />
          </label>
          <label className="field">
            <span>Database password</span>
            <input type="password" value={db.password} onChange={updateDb('password')} autoComplete="new-password" />
          </label>
          <div className="row test-row">
            <button type="button" className="btn small" onClick={testDb} disabled={testing || !db.user || !db.database}>
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            {dbStatus && <span className={dbStatus.ok ? 'status ok' : 'status bad'}>{dbStatus.message}</span>}
          </div>
        </fieldset>

        <fieldset>
          <legend>
            <span className="step step-2">2</span> Site
          </legend>
          <label className="field">
            <span>Site URL (used to build short links)</span>
            <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://go.example.com" />
          </label>
          <p className="hint">Use your live https:// domain in production. https enables secure login cookies.</p>
        </fieldset>

        <fieldset>
          <legend>
            <span className="step step-3">3</span> Admin login
          </legend>
          <label className="field">
            <span>Admin email</span>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required autoComplete="off" />
          </label>
          <label className="field">
            <span className="row between">
              Admin password
              <button type="button" className="link-btn inline" onClick={fillPassword}>
                Generate strong password
              </button>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              minLength={10}
              required
              autoComplete="new-password"
            />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={10}
              required
              autoComplete="new-password"
            />
          </label>
          <label className="check">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Show passwords
          </label>
        </fieldset>

        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Saving…' : 'Finish setup'}
        </button>
      </form>
    </main>
  );
}
