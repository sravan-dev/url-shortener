import { useSettings } from '../settings.js';

export default function Logo({ height = 40 }) {
  const { settings } = useSettings();
  return <img src={`/brand/logo?v=${settings.version}`} alt={settings.siteTitle} className="logo" style={{ height }} />;
}

// Brand "loading to success" motif: four growing dots, yellow → blue → green → red.
export function Dots({ className = '' }) {
  return (
    <span className={`dots ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
