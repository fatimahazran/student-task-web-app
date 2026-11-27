// Top-down ant drawn in SVG, facing right. Uses currentColor.
// walking: legs move. carrying: holds a crumb in its mandibles.
export function Ant({ size = 40, walking = false, carrying = false, className = "" }) {
  return (
    <svg
      className={`ant ${walking ? "walking" : ""} ${className}`}
      width={size}
      height={(size * 32) / 48}
      viewBox="0 0 48 32"
      aria-hidden="true"
    >
      <g className="legs-a" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 13 L34 6 L38 4" />
        <path d="M27 19 L27 27 L24 30" />
        <path d="M24 13 L19 6 L14 4" />
      </g>
      <g className="legs-b" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 19 L34 26 L38 28" />
        <path d="M27 13 L27 5 L24 2" />
        <path d="M24 19 L19 26 L14 28" />
      </g>
      <g stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round">
        <path d="M39 13.5 Q42 7 46 6" />
        <path d="M39 18.5 Q42 25 46 26" />
      </g>
      <g fill="currentColor">
        <ellipse cx="12" cy="16" rx="9" ry="6.5" />
        <circle cx="21.5" cy="16" r="1.9" />
        <ellipse cx="27" cy="16" rx="5" ry="3.6" />
        <ellipse cx="36" cy="16" rx="4.6" ry="4.1" />
      </g>
      <ellipse cx="9" cy="14" rx="3.5" ry="1.6" fill="#fff" opacity="0.18" />
      {carrying && <circle className="crumb" cx="43" cy="16" r="3.6" />}
    </svg>
  );
}

// A line of ants marching across their container (decoration).
export function AntTrail({ count = 5, className = "" }) {
  return (
    <div className={`ant-trail ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(-i * 14) / count}s` }}>
          <Ant size={26} walking carrying={i % 2 === 0} />
        </span>
      ))}
    </div>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <span className="logo-badge"><Ant size={26} /></span>
      <span className="logo-text">Ant<b>Work</b></span>
    </span>
  );
}
