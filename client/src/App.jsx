import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import NotFound from './components/NotFound.jsx';
import Setup from './components/Setup.jsx';

export default function App() {
  const [needsSetup, setNeedsSetup] = useState(undefined);
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const isHome = window.location.pathname === '/';
  const signOut = useCallback(() => setUser(null), []);

  useEffect(() => {
    api
      .setupStatus()
      .then(({ needsSetup }) => setNeedsSetup(needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  useEffect(() => {
    if (needsSetup !== false || !isHome) return;
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, [needsSetup, isHome]);

  if (needsSetup === undefined) return <div className="splash" aria-busy="true" />;
  if (needsSetup) {
    return (
      <Setup
        onComplete={() => {
          window.history.replaceState(null, '', '/');
          window.location.reload();
        }}
      />
    );
  }
  if (!isHome) return <NotFound />;
  if (user === undefined) return <div className="splash" aria-busy="true" />;
  if (!user) return <Login onSignedIn={setUser} />;
  return <Dashboard user={user} onSignedOut={signOut} />;
}
