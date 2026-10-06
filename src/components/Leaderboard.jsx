const MEDALS = {
  1: 'bg-gradient-to-b from-[#F6DCA4] to-[#C9973F] text-kin-night',
  2: 'bg-gradient-to-b from-[#EDE3D1] to-[#A99D88] text-kin-night',
  3: 'bg-gradient-to-b from-[#E2A47A] to-[#A0603A] text-kin-night',
};

const SIZES = {
  md: { row: 'gap-3 px-3 py-2', medal: 'h-8 w-8 text-base', name: 'text-base', score: 'text-xl' },
  lg: { row: 'gap-4 px-4 py-2', medal: 'h-9 w-9 text-lg', name: 'text-xl', score: 'text-2xl' },
};

export function Leaderboard({ entries, highlightId, showDelta = false, size = 'md' }) {
  if (!entries?.length) {
    return <p className="text-kin-cream/70">Aucun joueur classé pour l’instant.</p>;
  }
  const s = SIZES[size];
  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry, i) => (
        <li
          key={entry.publicId}
          style={{ animationDelay: `${i * 45}ms` }}
          className={`flex animate-slide-up items-center rounded-xl ${s.row} ${
            entry.publicId === highlightId
              ? 'bg-kin-terracotta/25 ring-2 ring-kin-terracotta'
              : 'bg-kin-night/45 ring-1 ring-kin-gold/15'
          }`}
        >
          <span
            className={`grid shrink-0 place-items-center rounded-full font-display ${s.medal} ${
              MEDALS[entry.rank] ?? 'bg-kin-bark text-kin-cream ring-1 ring-kin-gold/40'
            }`}
          >
            {entry.rank}
          </span>
          <span className={`min-w-0 flex-1 truncate font-semibold ${s.name}`}>{entry.name}</span>
          {showDelta && entry.lastPoints > 0 && (
            <span className="rounded-full bg-kin-leaf/20 px-2 py-0.5 text-sm font-bold text-kin-leaf">
              +{entry.lastPoints}
            </span>
          )}
          <span className={`font-display tabular-nums text-kin-gold ${s.score}`}>{entry.score}</span>
        </li>
      ))}
    </ol>
  );
}
