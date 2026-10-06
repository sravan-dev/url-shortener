import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { DEFAULT_SETTINGS, SettingsContext, applyDocumentSettings } from './settings.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import Topbar from './components/Topbar.jsx';
import NotFound from './components/NotFound.jsx';
import Setup from './components/Setup.jsx';

const APP_PATHS = new Set(['/', '/settings']);

export default function App() {
  const [needsSetup, setNeedsSetup] = useState(undefined);
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [path, setPath] = useState(window.location.pathname);
  const isAppPath = APP_PATHS.has(path);
  const signOut = useCallback(() => setUser(null), []);

  const navigate = useCallback((to) => {
    if (to === window.location.pathname) return;
    window.history.pushState(null, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    api
      .setupStatus()
      .then(({ needsSetup }) => setNeedsSetup(needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  useEffect(() => {
    if (needsSetup !== false) return;
    api.publicSettings().then(setSettings).catch(() => {});
  }, [needsSetup]);

  useEffect(() => {
    if (needsSetup === false) applyDocumentSettings(settings);
  }, [needsSetup, settings]);

  useEffect(() => {
    if (needsSetup !== false || !isAppPath) return;
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, [needsSetup, isAppPath]);

  const contextValue = useMemo(() => ({ settings, setSettings }), [settings]);

  let content;
  if (needsSetup === undefined) {
    content = <div className="splash" aria-busy="true" />;
  } else if (needsSetup) {
    content = (
      <Setup
        onComplete={() => {
          window.history.replaceState(null, '', '/');
          window.location.reload();
        }}
      />
    );
  } else if (!isAppPath) {
    content = <NotFound />;
  } else if (user === undefined) {
    content = <div className="splash" aria-busy="true" />;
  } else if (!user) {
    content = <Login onSignedIn={setUser} />;
  } else {
    content = (
      <>
        <Topbar user={user} path={path} navigate={navigate} onSignedOut={signOut} />
        {path === '/settings' ? <SettingsPage /> : <Dashboard onSignedOut={signOut} />}
      </>
    );
  }

  return <SettingsContext.Provider value={contextValue}>{content}</SettingsContext.Provider>;
}
