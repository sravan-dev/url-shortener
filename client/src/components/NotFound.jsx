import Logo, { Dots } from './Logo.jsx';

export default function NotFound() {
  return (
    <main className="auth">
      <div className="card auth-card center">
        <Logo height={84} />
        <h1>Link not found</h1>
        <Dots className="rule" />
        <p className="muted">This short link doesn’t exist or has been removed.</p>
        <a className="btn primary block" href="https://tijusacademy.com">
          Visit tijusacademy.com
        </a>
      </div>
    </main>
  );
}
