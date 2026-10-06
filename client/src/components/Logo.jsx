export default function Logo({ height = 40 }) {
  return <img src="/logo.png" alt="Tiju's Academy" className="logo" style={{ height }} />;
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
