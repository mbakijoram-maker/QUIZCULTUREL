import { useCallback, useEffect, useState } from 'react';
import { request, socket } from './socket.js';
import { useConnected, useSocketEvent } from './hooks/useSocket.js';
import { PointsMeter, TierStrip, TimerRing, useCountdown } from './components/Timer.jsx';
import { Leaderboard } from './components/Leaderboard.jsx';
import { AnswerSymbol } from './components/AnswerSymbol.jsx';
import { AmberButton, ConnectionDot, Eyebrow, Illustration, KubaBand, Logo, Panel, Spinner, WoodButton } from './components/ui.jsx';
import { POINT_TIERS, QUESTIONS_PER_GAME } from '../shared/scoring.js';
import { readJSON, removeKey, withDeadline, writeJSON } from './lib/utils.js';

const ADMIN_KEY = 'kinquiz:admin';
const EMPTY_STATS = { playerCount: 0, connectedCount: 0, answeredCount: 0, recentNames: [] };

export default function AdminView() {
  const connected = useConnected();
  const [pin, setPin] = useState(() => readJSON(ADMIN_KEY)?.pin ?? null);
  const [phase, setPhase] = useState(() => (readJSON(ADMIN_KEY) ? 'resuming' : 'idle'));
  const [stats, setStats] = useState(EMPTY_STATS);
  const [question, setQuestion] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [final, setFinal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const applySnapshot = useCallback((snap) => {
    setPin(snap.pin);
    setStats(snap.stats);
    setQuestion(snap.question ? withDeadline(snap.question) : null);
    setReveal(snap.reveal);
    setFinal(snap.final);
    setPhase(snap.state);
  }, []);

  // Rafraîchir la page ou perdre le réseau ne tue pas la partie : on la reprend.
  useEffect(() => {
    const resume = async () => {
      const saved = readJSON(ADMIN_KEY);
      if (!saved) return;
      const res = await request('admin:resume', saved);
      if (res.ok) applySnapshot(res.snapshot);
      else if (res.code !== 'timeout') {
        removeKey(ADMIN_KEY);
        setPin(null);
        setPhase('idle');
      }
    };
    socket.on('connect', resume);
    if (socket.connected) resume();
    return () => socket.off('connect', resume);
  }, [applySnapshot]);

  useSocketEvent('admin:stats', setStats);
  useSocketEvent('game:question', (q) => {
    setQuestion(withDeadline(q));
    setReveal(null);
    setPhase('question');
  });
  useSocketEvent('game:reveal', (r) => {
    setReveal(r);
    setPhase('reveal');
  });
  useSocketEvent('game:over', (f) => {
    setFinal(f);
    setPhase('finished');
  });

  const run = async (event) => {
    setBusy(true);
    setError('');
    const res = await request(event);
    setBusy(false);
    if (!res.ok) setError(res.error);
    return res;
  };

  const createSession = async () => {
    const res = await run('admin:create');
    if (res.ok) {
      writeJSON(ADMIN_KEY, { pin: res.pin, adminToken: res.adminToken });
      applySnapshot(res.snapshot);
    }
  };

  const closeSession = async () => {
    const count = stats.playerCount;
    const ok = window.confirm(
      `Terminer la session ${pin} ?${count ? ` Les ${count} joueur${count > 1 ? 's' : ''} seront déconnectés.` : ''}`,
    );
    if (!ok) return;
    await run('admin:close');
    removeKey(ADMIN_KEY);
    setPin(null);
    setStats(EMPTY_STATS);
    setPhase('idle');
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Logo size="lg" />
        <div className="flex flex-wrap items-center gap-3">
          {pin && phase !== 'idle' && (
            <>
              <span className="chip text-base">
                PIN <span className="font-display text-xl tracking-widest text-kin-gold">{pin}</span>
              </span>
              <span className="chip text-base">
                <span className="font-display text-xl text-kin-gold">{stats.connectedCount}</span> connecté
                {stats.connectedCount > 1 ? 's' : ''}
              </span>
            </>
          )}
          <ConnectionDot connected={connected} />
          <button type="button" className="btn-ghost" onClick={toggleFullscreen} title="Plein écran (écran géant)">
            Plein écran
          </button>
          {pin && phase !== 'idle' && (
            <button type="button" className="btn-ghost" onClick={closeSession}>
              Terminer la session
            </button>
          )}
        </div>
      </header>
      <KubaBand />

      {error && (
        <div role="alert" className="mx-auto mt-4 w-full max-w-[1600px] px-6">
          <p className="rounded-2xl border border-kin-terracotta/60 bg-kin-terracotta/15 px-4 py-3 font-medium">{error}</p>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-6 py-6">
        {phase === 'resuming' && (
          <div className="flex flex-1 items-center justify-center gap-3 text-xl text-kin-cream/80">
            <Spinner className="text-kin-gold" /> Reprise de la session…
          </div>
        )}
        {phase === 'idle' && <IdleScreen onCreate={createSession} busy={busy} />}
        {phase === 'lobby' && (
          <LobbyScreen pin={pin} stats={stats} busy={busy} onStart={() => run('admin:start')} />
        )}
        {phase === 'question' && question && (
          <QuestionScreen key={question.index} question={question} stats={stats} busy={busy} onReveal={() => run('admin:reveal')} />
        )}
        {phase === 'reveal' && reveal && <RevealScreen reveal={reveal} busy={busy} onNext={() => run('admin:next')} />}
        {phase === 'finished' && final && <FinalScreen final={final} busy={busy} onNew={createSession} />}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- Accueil */

function IdleScreen({ onCreate, busy }) {
  return (
    <section className="grid flex-1 items-center gap-10 lg:grid-cols-[1fr_minmax(0,40rem)_1fr]">
      <Illustration name="masque" className="hidden h-80 animate-float justify-self-end lg:block" />
      <Panel className="flex flex-col items-center gap-6 p-10 text-center">
        <Eyebrow>Culture générale congolaise</Eyebrow>
        <h1 className="font-display text-[clamp(3rem,6vw,5.5rem)] leading-none">
          Kin Quiz <span className="text-kin-terracotta">Live</span>
        </h1>
        <p className="max-w-md text-lg text-kin-cream/80">
          {QUESTIONS_PER_GAME} questions, 30 secondes chacune. Plus on répond vite, plus on gagne : la valeur baisse de 10 points
          toutes les 5 secondes.
        </p>
        <ol className="flex flex-wrap justify-center gap-2" aria-label="Barème">
          {POINT_TIERS.map((points, i) => (
            <li key={points} className="rounded-xl bg-kin-night/60 px-3 py-2 ring-1 ring-kin-gold/30">
              <span className="block font-display text-2xl text-kin-gold">{points}</span>
              <span className="text-xs text-kin-cream/70">
                {i * 5}–{(i + 1) * 5}s
              </span>
            </li>
          ))}
        </ol>
        <AmberButton onClick={onCreate} disabled={busy} className="px-10 py-5 text-3xl">
          {busy && <Spinner />}
          Lancer une session
        </AmberButton>
      </Panel>
      <Illustration name="djembe" className="hidden h-64 animate-drum justify-self-start lg:block" />
    </section>
  );
}

/* ------------------------------------------------------------------ Lobby */

function LobbyScreen({ pin, stats, busy, onStart }) {
  return (
    <section className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Panel className="flex flex-col items-center justify-center gap-8 p-8 text-center">
        <Eyebrow>Rejoins depuis ton téléphone</Eyebrow>
        <div>
          <p className="text-xl text-kin-cream/80">Va sur</p>
          <p className="mt-1 break-all font-display text-[clamp(1.75rem,3.2vw,3rem)] leading-tight text-kin-gold">
            {window.location.host}
          </p>
        </div>
        <div className="wood rounded-2xl border-4 border-kin-night/60 px-10 py-6 shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-kin-cream/80 text-engraved">Code PIN</p>
          <p className="font-display text-[clamp(4.5rem,10vw,9rem)] leading-none tracking-[0.12em] text-kin-cream text-engraved">{pin}</p>
        </div>
        <Illustration name="masque" className="h-32 animate-float" />
      </Panel>

      <Panel className="flex flex-col gap-6 p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow>Joueurs connectés</Eyebrow>
            <p key={stats.connectedCount} className="animate-pop font-display text-[clamp(5rem,9vw,8rem)] leading-none text-kin-gold">
              {stats.connectedCount}
            </p>
          </div>
          <Illustration name="djembe" className="h-32 animate-drum" />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {stats.recentNames.length ? (
            <ul className="flex flex-wrap gap-2">
              {[...stats.recentNames].reverse().map((name) => (
                <li key={name} className="animate-pop rounded-full bg-kin-caramel px-4 py-2 text-lg font-bold text-kin-night shadow-lg">
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-kin-gold/30 p-8 text-center">
              <p className="font-display text-2xl">En attente des premiers joueurs…</p>
              <p className="text-kin-cream/70">Les pseudos apparaîtront ici dès qu’ils rejoignent la partie.</p>
            </div>
          )}
        </div>

        <AmberButton onClick={onStart} disabled={busy || stats.playerCount === 0} className="w-full py-5 text-3xl">
          {busy && <Spinner />}
          Démarrer le quiz
        </AmberButton>
      </Panel>
    </section>
  );
}

/* --------------------------------------------------------------- Question */

function QuestionScreen({ question, stats, busy, onReveal }) {
  const { remainingMs, elapsedMs } = useCountdown(question.deadline, question.durationMs);
  const expected = Math.max(stats.connectedCount, 1);
  const progress = Math.min(100, Math.round((stats.answeredCount / expected) * 100));

  return (
    <section className="flex flex-1 animate-slide-up flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <span className="chip px-5 py-2 text-lg">
            Question {question.index + 1} / {question.total}
          </span>
          <span className="chip px-5 py-2 text-lg text-kin-gold">{question.category}</span>
        </div>
        <span className="chip px-5 py-2 text-lg">
          <span className="font-display text-2xl text-kin-gold">{stats.answeredCount}</span> / {stats.connectedCount} réponses
        </span>
      </div>

      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="caramel-card flex min-h-[11rem] items-center p-8">
          <h2 className="font-display text-[clamp(2rem,3.4vw,3.5rem)] leading-tight">{question.text}</h2>
        </div>
        <div className="flex items-center justify-center gap-6">
          <TimerRing remainingMs={remainingMs} durationMs={question.durationMs} size={176} stroke={14} />
          <PointsMeter elapsedMs={elapsedMs} size="lg" />
        </div>
      </div>

      <TierStrip elapsedMs={elapsedMs} />

      <div className="grid gap-4 md:grid-cols-2">
        {question.options.map((option, i) => (
          <div key={option} className={`wood-btn wood-tone-${i + 1} pointer-events-none min-h-[5rem] text-[clamp(1.25rem,1.8vw,1.85rem)]`}>
            <AnswerSymbol index={i} size={56} />
            <span className="leading-snug">{option}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-6">
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-kin-night/70 ring-1 ring-kin-gold/30">
          <div className="h-full rounded-full bg-kin-terracotta transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <WoodButton onClick={onReveal} disabled={busy} className="w-auto px-8 text-lg">
          Révéler maintenant
        </WoodButton>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Révélation */

function RevealScreen({ reveal, busy, onNext }) {
  const { question, correctIndex, distribution, fact, leaderboard, isLast, answeredCount, playerCount } = reveal;
  const maxCount = Math.max(1, ...distribution);

  return (
    <section className="grid flex-1 animate-slide-up gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <span className="chip px-5 py-2 text-lg">
            Question {question.index + 1} / {question.total} · Réponse
          </span>
          <span className="chip px-5 py-2 text-lg">
            {answeredCount} / {playerCount} ont répondu
          </span>
        </div>
        <div className="caramel-card p-6">
          <h2 className="font-display text-[clamp(1.6rem,2.6vw,2.6rem)] leading-tight">{question.text}</h2>
        </div>

        <ul className="flex flex-col gap-3">
          {question.options.map((option, i) => {
            const correct = i === correctIndex;
            return (
              <li
                key={option}
                className={`wood-btn wood-tone-${i + 1} pointer-events-none overflow-hidden !py-3 text-[clamp(1.1rem,1.5vw,1.6rem)] ${
                  correct ? 'shadow-gold-ring' : 'opacity-45 saturate-50'
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 ${correct ? 'bg-kin-leaf/30' : 'bg-kin-night/30'} transition-[width] duration-700`}
                  style={{ width: `${(distribution[i] / maxCount) * 100}%` }}
                />
                <span className="relative flex flex-1 items-center gap-4">
                  <AnswerSymbol index={i} size={46} />
                  <span className="flex-1 leading-snug">{option}</span>
                  {correct && <span className="font-display text-3xl text-kin-leaf">✓</span>}
                  <span className="font-display text-3xl tabular-nums">{distribution[i]}</span>
                </span>
              </li>
            );
          })}
        </ul>

        {fact && (
          <Panel className="flex items-center gap-5 px-6 py-4">
            <Illustration name="masque" className="h-16 shrink-0" />
            <div>
              <Eyebrow>Le savais-tu ?</Eyebrow>
              <p className="mt-1 text-xl leading-snug">{fact}</p>
            </div>
          </Panel>
        )}
      </div>

      <Panel className="flex flex-col gap-5 p-6">
        <h3 className="font-display text-4xl">Classement live</h3>
        <div className="flex-1">
          <Leaderboard entries={leaderboard} showDelta size="lg" />
        </div>
        <AmberButton onClick={onNext} disabled={busy} className="w-full py-5 text-3xl">
          {busy && <Spinner />}
          {isLast ? 'Voir le classement final' : 'Question suivante'}
        </AmberButton>
      </Panel>
    </section>
  );
}

/* ------------------------------------------------------------------- Final */

const PODIUM = [
  { place: 1, height: 'h-52', order: 'order-2', tone: 2 },
  { place: 2, height: 'h-36', order: 'order-1', tone: 1 },
  { place: 3, height: 'h-24', order: 'order-3', tone: 3 },
];

function FinalScreen({ final, busy, onNew }) {
  const { leaderboard, playerCount } = final;
  const rest = leaderboard.slice(3);
  const half = Math.ceil(rest.length / 2);

  return (
    <section className="flex flex-1 animate-slide-up flex-col items-center gap-8">
      <div className="text-center">
        <Eyebrow>
          {playerCount} joueur{playerCount > 1 ? 's' : ''} · Partie terminée
        </Eyebrow>
        <h2 className="mt-2 font-display text-[clamp(2.75rem,5vw,4.5rem)] leading-none">Classement final</h2>
      </div>

      <div className="flex w-full max-w-4xl items-end justify-center gap-4 md:gap-8">
        {PODIUM.map(({ place, height, order, tone }) => {
          const entry = leaderboard[place - 1];
          return (
            <div key={place} className={`flex flex-1 flex-col items-center gap-3 ${order}`}>
              {entry ? (
                <>
                  {place === 1 && <Illustration name="pretre" className="h-24 animate-float" />}
                  <p className="max-w-full truncate text-center font-display text-[clamp(1.25rem,2.4vw,2.25rem)]">{entry.name}</p>
                  <p className="font-display text-3xl text-kin-gold">{entry.score} pts</p>
                </>
              ) : (
                <p className="text-kin-cream/50">—</p>
              )}
              <div className={`wood wood-tone-${tone} grid w-full place-items-center rounded-t-2xl border-4 border-b-0 border-kin-night/60 shadow-2xl ${height}`}>
                <span className="font-display text-7xl text-kin-cream text-engraved">{place}</span>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <Panel className="grid w-full max-w-5xl gap-3 p-5 lg:grid-cols-2">
          <Leaderboard entries={rest.slice(0, half)} />
          <Leaderboard entries={rest.slice(half)} />
        </Panel>
      )}

      <AmberButton onClick={onNew} disabled={busy} className="px-10 py-5 text-3xl">
        {busy && <Spinner />}
        Nouvelle session
      </AmberButton>
    </section>
  );
}
