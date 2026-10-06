// Chaque proposition a une forme et une couleur : on la retrouve sur l'écran géant et sur le mobile.
const SYMBOLS = [
  { label: 'Triangle', color: '#E07A5F', shape: <path d="M12 3 L22 20 H2 Z" /> },
  { label: 'Losange', color: '#F2C77E', shape: <path d="M12 2 L22 12 L12 22 L2 12 Z" /> },
  { label: 'Cercle', color: '#9CB380', shape: <circle cx="12" cy="12" r="9.5" /> },
  { label: 'Carré', color: '#FAEDCD', shape: <rect x="3" y="3" width="18" height="18" rx="2" /> },
];

export function AnswerSymbol({ index, size = 44 }) {
  const symbol = SYMBOLS[index];
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-xl bg-kin-night/60 shadow-inner ring-1 ring-black/40"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill={symbol.color}>
        {symbol.shape}
      </svg>
    </span>
  );
}
