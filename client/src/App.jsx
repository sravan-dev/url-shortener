import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import NotFound from './components/NotFound.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const isHome = window.location.pathname === '/';
  const signOut = useCallback(() => setUser(null), []);

  useEffect(() => {
    if (!isHome) return;
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, [isHome]);

  if (!isHome) return <NotFound />;
  if (user === undefined) return <div className="splash" aria-busy="true" />;
  if (!user) return <Login onSignedIn={setUser} />;
  return <Dashboard user={user} onSignedOut={signOut} />;
}
