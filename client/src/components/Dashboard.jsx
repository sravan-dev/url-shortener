import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Dots } from './Logo.jsx';
import CreateLink from './CreateLink.jsx';
import LinkRow from './LinkRow.jsx';

export default function Dashboard({ onSignedOut }) {
  const [links, setLinks] = useState([]);
  const [totals, setTotals] = useState({ links: 0, clicks: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (query) => {
      try {
        const data = await api.listLinks(query);
        setLinks(data.links);
        setTotals(data.totals);
        setError('');
      } catch (err) {
        if (err.status === 401) return onSignedOut();
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [onSignedOut],
  );

  // Debounced search; also does the initial load.
  useEffect(() => {
    const timer = setTimeout(() => load(search.trim()), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, load]);

  function handleCreated(link) {
    setLinks((prev) => [link, ...prev]);
    setTotals((t) => ({ ...t, links: t.links + 1 }));
  }

  function handleUpdated(link) {
    setLinks((prev) => prev.map((l) => (l.id === link.id ? link : l)));
  }

  function handleDeleted(id) {
    const removed = links.find((l) => l.id === id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    setTotals((t) => ({ links: t.links - 1, clicks: t.clicks - (removed?.clicks ?? 0) }));
  }

  return (
    <>
      <main className="container stack">
        <div className="stats">
          <div className="card stat stat-yellow">
            <span>Total links</span>
            <strong>{totals.links.toLocaleString()}</strong>
          </div>
          <div className="card stat stat-blue">
            <span>Total clicks</span>
            <strong>{totals.clicks.toLocaleString()}</strong>
          </div>
        </div>

        <CreateLink onCreated={handleCreated} />

        <section className="card">
          <div className="row between list-head">
            <h2>
              Your links <Dots />
            </h2>
            <input
              type="search"
              placeholder="Search links…"
              aria-label="Search links"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search"
            />
          </div>

          {error && <p className="alert error">{error}</p>}

          {loading ? (
            <p className="muted empty">Loading…</p>
          ) : links.length === 0 ? (
            <p className="muted empty">{search ? 'No links match your search.' : 'No links yet — shorten your first one above.'}</p>
          ) : (
            <ul className="link-list">
              {links.map((link) => (
                <LinkRow key={link.id} link={link} onUpdated={handleUpdated} onDeleted={handleDeleted} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
