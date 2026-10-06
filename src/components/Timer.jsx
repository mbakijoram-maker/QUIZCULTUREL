import { useEffect, useState } from 'react';
import { POINT_TIERS, QUESTION_DURATION_MS, TIER_DURATION_MS, pointsForElapsed } from '../../shared/scoring.js';

/** Compte à rebours basé sur une échéance locale (performance.now()). */
export function useCountdown(deadline, durationMs = QUESTION_DURATION_MS) {
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (deadline == null) return undefined;
    setNow(performance.now());
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t >= deadline) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [deadline]);

  const remainingMs = deadline == null ? durationMs : Math.max(0, deadline - now);
  return { remainingMs, elapsedMs: durationMs - remainingMs };
}

export function TimerRing({ remainingMs, durationMs = QUESTION_DURATION_MS, size = 112, stroke = 10 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, remainingMs / durationMs));
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = seconds <= 5;

  return (
    <div
      className={`relative shrink-0 ${urgent && seconds > 0 ? 'animate-pulse' : ''}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${seconds} secondes restantes`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="#2B1704" stroke="#5A3418" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? '#E07A5F' : '#D4A373'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 100ms linear, stroke 200ms' }}
        />
      </svg>
      <span
        className={`absolute inset-0 grid place-items-center font-num ${urgent ? 'text-kin-terracotta' : 'text-kin-cream'}`}
        style={{ fontSize: size * 0.36 }}
      >
        {seconds}
      </span>
    </div>
  );
}

/** Points encore gagnables, en très gros : ils baissent de 10 toutes les 5 secondes. */
export function PointsMeter({ elapsedMs, size = 'md' }) {
  const points = pointsForElapsed(elapsedMs);
  const sizes = {
    md: 'text-6xl',
    lg: 'text-[clamp(3.5rem,5.5vw,6rem)]',
  };
  return (
    <div className="flex flex-col items-center leading-none" aria-live="polite">
      <span key={points} className={`animate-pop font-display tabular-nums text-kin-gold ${sizes[size]}`}>
        {points}
      </span>
      <span className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-kin-cream/75">pts à gagner</span>
    </div>
  );
}

/** Frise des paliers 60 → 10, le palier en cours est mis en valeur. */
export function TierStrip({ elapsedMs }) {
  const current = Math.floor(elapsedMs / TIER_DURATION_MS);
  return (
    <ol className="grid grid-cols-6 gap-2" aria-label="Paliers de points">
      {POINT_TIERS.map((points, i) => {
        const state = i < current ? 'past' : i === current ? 'now' : 'next';
        return (
          <li
            key={points}
            className={`rounded-xl px-2 py-2 text-center transition-all duration-300 ${
              state === 'now'
                ? 'scale-105 bg-kin-terracotta text-kin-night shadow-terracotta-ring'
                : state === 'past'
                  ? 'bg-kin-night/50 text-kin-cream/30 line-through'
                  : 'bg-kin-bark/80 text-kin-cream/80 ring-1 ring-kin-gold/30'
            }`}
          >
            <span className="block font-display text-2xl leading-none">{points}</span>
            <span className="block text-[0.7rem] font-semibold opacity-80">
              {i * 5}–{(i + 1) * 5}s
            </span>
          </li>
        );
      })}
    </ol>
  );
}
