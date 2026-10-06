import { api } from '../api.js';
import { useSettings } from '../settings.js';
import Logo from './Logo.jsx';

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function Topbar({ user, path, navigate, onSignedOut }) {
  const { settings } = useSettings();

  async function signOut() {
    await api.logout().catch(() => {});
    onSignedOut();
  }

  function go(event, to) {
    event.preventDefault();
    navigate(to);
  }

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <a href="/" className="row brand" onClick={(e) => go(e, '/')}>
          <Logo height={50} />
          <span className="product hide-sm">{settings.siteTitle}</span>
        </a>
        <nav className="row">
          <a href="/" className={`nav-link hide-sm${path === '/' ? ' active' : ''}`} onClick={(e) => go(e, '/')}>
            Links
          </a>
          <a
            href="/settings"
            className={`icon-btn${path === '/settings' ? ' active' : ''}`}
            onClick={(e) => go(e, '/settings')}
            aria-label="Settings"
            title="Settings"
            aria-current={path === '/settings' ? 'page' : undefined}
          >
            <GearIcon />
          </a>
          <span className="muted hide-sm user-email">{user.email}</span>
          <button className="btn small" onClick={signOut}>
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
