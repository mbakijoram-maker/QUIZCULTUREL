import { useCallback, useEffect, useRef, useState } from 'react';
import { request, socket } from './socket.js';
import { useConnected, useSocketEvent } from './hooks/useSocket.js';
import { PointsMeter, TimerRing, useCountdown } from './components/Timer.jsx';
import { Leaderboard } from './components/Leaderboard.jsx';
import { AnswerSymbol } from './components/AnswerSymbol.jsx';
import { AmberButton, ConnectionDot, Eyebrow, Illustration, KubaBand, Logo, Panel, Spinner, WoodButton } from './components/ui.jsx';
import { BADGES } from './badges.js';
import { pointsForElapsed } from '../shared/scoring.js';
import { readJSON, removeKey, withDeadline, writeJSON } from './lib/utils.js';

const PLAYER_KEY = 'kinquiz:player';

export default function PlayerView() {
  const connected = useConnected();
  const [session, setSession] = useState(() => readJSON(PLAYER_KEY));
  const [step, setStep] = useState(() => (readJSON(PLAYER_KEY) ? 'reconnecting' : 'login'));
  const [started, setStarted] = useState(false);
  const [me, setMe] = useState({ score: 0, rank: null, playerCount: 0 });
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [final, setFinal] = useState(null);
  const [board, setBoard] = useState([]);
  const [notice, setNotice] = useState('');
  const stepRef = useRef(step);
  stepRef.current = step;

  const applySnapshot = useCallback((snap) => {
    setMe({ score: snap.score, rank: snap.rank, playerCount: snap.playerCount });
    setStarted(snap.state !== 'lobby');
    if (snap.state === 'finished' && snap.final) {
      setFinal(snap.final);
      setBoard(snap.leaderboard ?? []);
      setStep('final');
    } else if (snap.state === 'question' && snap.question) {
      setQuestion(withDeadline(snap.question));
      setAnswer(snap.answer ?? null);
      setResult(null);
      setStep('question');
    } else if (snap.state === 'reveal' && snap.result) {
      setResult(snap.result);
      setStep('result');
    } else {
      setStep('lobby');
    }
  }, []);

  const join = useCallback(
    async (pin, name, playerId) => {
      const res = await request('player:join', { pin, name, playerId });
      if (res.ok) {
        const next = { pin, name: res.name, playerId: res.playerId, publicId: res.publicId };
        writeJSON(PLAYER_KEY, next);
        setSession(next);
        setNotice('');
        applySnapshot(res.snapshot);
      }
      return res;
    },
    [applySnapshot],
  );

  // Reconnexion automatique (écran verrouillé, Wi-Fi qui saute…) avec le jeton stocké.
  useEffect(() => {
    const rejoin = async () => {
      const saved = readJSON(PLAYER_KEY);
      if (!saved) return;
      const res = await join(saved.pin, saved.name, saved.playerId);
      if (res.ok) return;
      if (res.code !== 'timeout') {
        removeKey(PLAYER_KEY);
        setSession(null);
      }
      if (stepRef.current !== 'final') {
        setNotice(res.error);
        setStep('login');
      }
    };
    socket.on('connect', rejoin);
    if (socket.connected) rejoin();
    return () => socket.off('connect', rejoin);
  }, [join]);

  useSocketEvent('game:players', ({ count }) => setMe((m) => ({ ...m, playerCount: count })));
  useSocketEvent('game:question', (q) => {
    setStarted(true);
    setQuestion(withDeadline(q));
    setAnswer(null);
    setResult(null);
    setStep('question');
  });
  useSocketEvent('player:result', (r) => {
    setResult(r);
    setMe({ score: r.score, rank: r.rank, playerCount: r.playerCount });
    setStep('result');
  });
  useSocketEvent('game:over', ({ leaderboard }) => setBoard(leaderboard));
  useSocketEvent('player:final', (f) => {
    setFinal(f);
    setMe({ score: f.score, rank: f.rank, playerCount: f.playerCount });
    setStep('final');
  });
  useSocketEvent('game:closed', () => {
    removeKey(PLAYER_KEY);
    setSession(null);
    // Les résultats finaux restent affichés même si l'animateur relance une session.
    if (stepRef.current !== 'final') {
      setNotice('L’animateur a fermé la session. Entrez le nouveau code PIN pour rejouer.');
      setStep('login');
    }
  });

  const submitAnswer = (choice, elapsedLocalMs) => {
    if (answer || !question) return;
    navigator.vibrate?.(25);
    setAnswer({ choice, pending: true, potentialPoints: pointsForElapsed(elapsedLocalMs) });
    request('player:answer', { index: question.index, choice }, 5000).then((res) => {
      if (res.ok) {
        setAnswer({ choice, pending: false, elapsedMs: res.elapsedMs, potentialPoints: res.potentialPoints });
      } else if (res.code === 'timeout') {
        setAnswer(null);
        setNotice('Réponse non reçue, touchez à nouveau votre choix.');
      } else if (res.code !== 'already') {
        setAnswer((a) => ({ ...a, pending: false, rejected: res.error }));
      }
    });
  };

  const pinFromUrl = new URLSearchParams(window.location.search).get('pin') ?? '';

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3 py-2">
        <Logo />
        {session && step !== 'login' ? (
          <div className="flex flex-col items-end leading-tight">
            <span className="max-w-[9rem] truncate text-sm font-semibold text-kin-cream/80">{session.name}</span>
            <span className="font-display text-xl tabular-nums text-kin-gold">{me.score} pts</span>
          </div>
        ) : (
          <ConnectionDot connected={connected} />
        )}
      </header>
      <KubaBand className="mb-4 rounded" />

      {notice && (
        <div role="alert" className="mb-4 flex animate-slide-up items-start gap-3 rounded-2xl border border-kin-terracotta/60 bg-kin-terracotta/15 px-4 py-3">
          <p className="flex-1 text-sm font-medium">{notice}</p>
          <button type="button" className="text-sm font-bold text-kin-gold" onClick={() => setNotice('')}>
            Fermer
          </button>
        </div>
      )}

      {session && step !== 'login' && !connected && (
        <p className="mb-3 text-center text-sm text-kin-terracotta">Connexion perdue, reconnexion en cours…</p>
      )}

      <main className="flex flex-1 flex-col">
        {step === 'login' && (
          <LoginStep onJoin={(pin, name) => join(pin, name)} defaultPin={pinFromUrl || session?.pin || ''} defaultName={session?.name ?? ''} />
        )}
        {step === 'reconnecting' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-kin-cream/80">
            <Spinner className="h-10 w-10 text-kin-gold" />
            <p>Retour dans la partie…</p>
          </div>
        )}
        {step === 'lobby' && <WaitingStep name={session?.name} started={started} me={me} />}
        {step === 'question' && question && (
          <QuestionStep key={question.index} question={question} answer={answer} onAnswer={submitAnswer} />
        )}
        {step === 'result' && result && <ResultStep result={result} />}
        {step === 'final' && final && (
          <FinalStep final={final} board={board} publicId={session?.publicId} />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------- Step 1 */

function validateName(name) {
  const clean = name.trim();
  if (clean.length < 2) return 'Au moins 2 caractères.';
  if (clean.length > 16) return '16 caractères maximum.';
  return '';
}

function validatePin(pin) {
  return /^\d{6}$/.test(pin) ? '' : 'Le code PIN contient 6 chiffres.';
}

function LoginStep({ onJoin, defaultPin, defaultName }) {
  const [name, setName] = useState(defaultName);
  const [pin, setPin] = useState(defaultPin);
  const [touched, setTouched] = useState({ name: false, pin: false });
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);

  const nameError = touched.name ? validateName(name) : '';
  const pinError = touched.pin ? validatePin(pin) : '';

  const submit = async (event) => {
    event.preventDefault();
    setTouched({ name: true, pin: true });
    if (validateName(name) || validatePin(pin)) return;
    setBusy(true);
    setServerError(null);
    const res = await onJoin(pin, name.trim());
    setBusy(false);
    if (!res.ok) setServerError({ field: res.code === 'name' ? 'name' : 'pin', message: res.error });
  };

  const nameMessage = nameError || (serverError?.field === 'name' ? serverError.message : '');
  const pinMessage = pinError || (serverError?.field === 'pin' ? serverError.message : '');

  return (
    <div className="flex flex-1 animate-slide-up flex-col">
      <div className="relative mb-2 flex items-end justify-center gap-2 pt-2">
        <Illustration name="djembe" className="h-24 -rotate-6" />
        <Illustration name="masque" className="h-36 animate-float" />
        <Illustration name="djembe" className="h-20 rotate-6 scale-x-[-1]" />
      </div>

      <Panel as="form" onSubmit={submit} noValidate className="flex flex-col gap-5 p-6">
        <div className="text-center">
          <Eyebrow>Culture générale congolaise</Eyebrow>
          <h1 className="mt-2 font-display text-4xl leading-tight">Prêt à défier Kinshasa ?</h1>
          <p className="mt-2 text-sm text-kin-cream/75">5 questions · 30 secondes · jusqu’à 60 pts par réponse</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="pseudo" className="text-sm font-bold text-kin-sand">
            Ton pseudo
          </label>
          <input
            id="pseudo"
            className="field"
            value={name}
            maxLength={16}
            autoComplete="nickname"
            autoCapitalize="words"
            onChange={(e) => {
              setName(e.target.value);
              if (serverError?.field === 'name') setServerError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            aria-invalid={Boolean(nameMessage)}
            aria-describedby={nameMessage ? 'pseudo-error' : undefined}
          />
          {nameMessage && (
            <p id="pseudo-error" className="text-sm font-medium text-kin-terracotta">
              {nameMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="pin" className="text-sm font-bold text-kin-sand">
            Code PIN <span className="font-normal text-kin-cream/60">(affiché sur l’écran géant)</span>
          </label>
          <input
            id="pin"
            className="field text-center font-display text-3xl tracking-[0.4em]"
            value={pin}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              if (serverError?.field === 'pin') setServerError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, pin: true }))}
            aria-invalid={Boolean(pinMessage)}
            aria-describedby={pinMessage ? 'pin-error' : undefined}
          />
          {pinMessage && (
            <p id="pin-error" className="text-sm font-medium text-kin-terracotta">
              {pinMessage}
            </p>
          )}
        </div>

        <AmberButton type="submit" disabled={busy} className="mt-1 w-full text-2xl">
          {busy ? <Spinner /> : null}
          {busy ? 'Connexion…' : 'Rejoindre la partie'}
        </AmberButton>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------- Step 2 */

function WaitingStep({ name, started, me }) {
  return (
    <div className="flex flex-1 animate-slide-up flex-col items-center justify-center gap-8 text-center">
      <div className="relative grid place-items-center">
        <span className="absolute h-44 w-44 animate-ripple rounded-full border-4 border-kin-gold/50" />
        <span className="absolute h-44 w-44 animate-ripple rounded-full border-4 border-kin-terracotta/40 [animation-delay:1.2s]" />
        <div className="grid h-44 w-44 place-items-center rounded-full bg-kin-bark/80 ring-2 ring-kin-gold/50">
          <Illustration name="djembe" className="h-28 animate-drum" />
        </div>
      </div>

      {started ? (
        <div>
          <Eyebrow>Prépare-toi</Eyebrow>
          <h2 className="mt-2 font-display text-4xl">La prochaine question arrive !</h2>
          <p className="mt-3 text-kin-cream/80">
            Tu as <span className="font-bold text-kin-gold">{me.score} pts</span>
            {me.rank ? (
              <>
                {' '}· <span className="font-bold">#{me.rank}</span> sur {me.playerCount}
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <div>
          <Eyebrow>Tu es dans la partie</Eyebrow>
          <h2 className="mt-2 font-display text-4xl">
            Mbote, <span className="text-kin-gold">{name}</span> !
          </h2>
          <p className="mt-3 text-kin-cream/80">Garde les yeux sur l’écran géant, le quiz va commencer.</p>
        </div>
      )}

      <span className="chip text-base">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-kin-leaf" />
        {me.playerCount} joueur{me.playerCount > 1 ? 's' : ''} dans la partie
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- Step 3 */

function QuestionStep({ question, answer, onAnswer }) {
  const { remainingMs, elapsedMs } = useCountdown(question.deadline, question.durationMs);
  const timeUp = remainingMs <= 0;

  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className="chip">
        Question {question.index + 1}/{question.total}
      </span>
      <span className="chip text-kin-gold">{question.category}</span>
    </div>
  );

  if (answer) {
    return (
      <div className="flex flex-1 animate-slide-up flex-col gap-5">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <TimerRing remainingMs={remainingMs} durationMs={question.durationMs} size={88} stroke={8} />
          <div>
            <Eyebrow>{answer.rejected ? 'Oups' : 'Réponse verrouillée'}</Eyebrow>
            <h2 className="mt-2 font-display text-3xl">{answer.rejected ?? 'Le verdict tombe à la fin du chrono…'}</h2>
          </div>
          <div className="wood-btn wood-tone-2 pointer-events-none shadow-gold-ring">
            <AnswerSymbol index={answer.choice} />
            <span className="text-lg">{question.options[answer.choice]}</span>
          </div>
          {!answer.rejected && (
            <p className="text-kin-cream/80">
              Si c’est juste, tu gagnes{' '}
              <span className="font-display text-2xl text-kin-gold">{answer.potentialPoints} pts</span>
            </p>
          )}
          {answer.pending && <Spinner className="text-kin-gold" />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 animate-slide-up flex-col gap-4">
      {header}
      <div className="flex items-center justify-around gap-4 rounded-2xl bg-kin-bark/60 py-3 ring-1 ring-kin-gold/25">
        <TimerRing remainingMs={remainingMs} durationMs={question.durationMs} size={92} stroke={9} />
        <PointsMeter elapsedMs={elapsedMs} />
      </div>
      <div className="caramel-card p-5">
        <p className="font-display text-2xl leading-snug">{question.text}</p>
      </div>
      <div className="mt-auto grid gap-3 pb-2" role="group" aria-label="Propositions">
        {question.options.map((option, i) => (
          <WoodButton
            key={option}
            tone={i + 1}
            disabled={timeUp}
            onClick={() => onAnswer(i, elapsedMs)}
            className={`min-h-[4.5rem] text-lg ${timeUp ? 'opacity-50' : ''}`}
          >
            <AnswerSymbol index={i} />
            <span className="leading-snug">{option}</span>
          </WoodButton>
        ))}
      </div>
      {timeUp && <p className="text-center font-display text-2xl text-kin-terracotta">Temps écoulé !</p>}
    </div>
  );
}

/* ---------------------------------------------------- Résultat question */

const RESULT_COPY = {
  correct: { eyebrow: 'Bonne réponse', title: 'Malamu !', tone: 'text-kin-leaf', ring: 'ring-kin-leaf bg-kin-leaf/20', icon: '✓' },
  wrong: { eyebrow: 'Mauvaise réponse', title: 'Raté !', tone: 'text-kin-terracotta', ring: 'ring-kin-terracotta bg-kin-terracotta/20', icon: '✗' },
  timeout: { eyebrow: 'Pas de réponse', title: 'Temps écoulé !', tone: 'text-kin-gold', ring: 'ring-kin-gold bg-kin-gold/15', icon: '⏱' },
};

function ResultStep({ result }) {
  const status = !result.answered ? 'timeout' : result.correct ? 'correct' : 'wrong';
  const copy = RESULT_COPY[status];

  return (
    <div className="flex flex-1 animate-slide-up flex-col items-center justify-center gap-6 text-center">
      <span className={`grid h-28 w-28 animate-pop place-items-center rounded-full font-display text-6xl ring-4 ${copy.ring} ${copy.tone} ${status === 'wrong' ? 'animate-shake' : ''}`}>
        {copy.icon}
      </span>
      <div>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h2 className={`mt-2 font-display text-5xl ${copy.tone}`}>{copy.title}</h2>
      </div>

      <p className="animate-pop font-display text-7xl tabular-nums text-kin-gold [animation-delay:150ms]">+{result.points}</p>

      {!result.correct && (
        <Panel className="w-full p-4">
          <p className="text-sm text-kin-cream/70">La bonne réponse était</p>
          <p className="mt-1 flex items-center justify-center gap-3 text-lg font-bold">
            <AnswerSymbol index={result.correctIndex} size={34} />
            {result.correctText}
          </p>
        </Panel>
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-kin-cream/60">Score</p>
          <p className="font-display text-3xl tabular-nums">{result.score}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-kin-cream/60">Classement</p>
          <p className="font-display text-3xl tabular-nums">
            #{result.rank}
            <span className="text-lg text-kin-cream/60"> / {result.playerCount}</span>
          </p>
        </Panel>
      </div>

      <p className="text-sm text-kin-cream/70">
        {result.isLast ? 'Classement final dans un instant…' : 'Question suivante dans un instant…'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- Step 4 */

function FinalStep({ final, board, publicId }) {
  const badge = BADGES[final.badge];
  const top = board.slice(0, 5);
  const inTop = top.some((entry) => entry.publicId === publicId);

  return (
    <div className="flex flex-1 animate-slide-up flex-col gap-5 pb-4">
      <div className="caramel-card relative overflow-hidden p-6 text-center">
        <div className="pointer-events-none absolute inset-0 bg-motif-bogolan bg-[length:90px] opacity-10" />
        {final.isWinner && (
          <span className="relative mb-2 inline-block rounded-full bg-kin-night px-3 py-1 text-xs font-bold uppercase tracking-widest text-kin-gold">
            Champion de la partie
          </span>
        )}
        <Illustration name={badge.illustration} className="relative mx-auto h-40 w-40 animate-float" />
        <p className="relative mt-3 text-xs font-bold uppercase tracking-[0.25em] text-kin-night/70">Ton badge</p>
        <h2 className="relative mt-1 font-display text-3xl leading-tight text-kin-night">{badge.label}</h2>
        <p className="relative mt-2 text-sm font-medium text-kin-night/80">{badge.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Panel className="p-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-kin-cream/60">Score</p>
          <p className="font-display text-2xl tabular-nums text-kin-gold">{final.score}</p>
          <p className="text-xs text-kin-cream/60">/ {final.maxScore}</p>
        </Panel>
        <Panel className="p-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-kin-cream/60">Rang</p>
          <p className="font-display text-2xl tabular-nums">#{final.rank}</p>
          <p className="text-xs text-kin-cream/60">sur {final.playerCount}</p>
        </Panel>
        <Panel className="p-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-kin-cream/60">Justes</p>
          <p className="font-display text-2xl tabular-nums">{final.correctCount}</p>
          <p className="text-xs text-kin-cream/60">/ {final.total}</p>
        </Panel>
      </div>

      <ol className="flex justify-center gap-2" aria-label="Détail par question">
        {final.history.map((h, i) => (
          <li
            key={i}
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl text-xs font-bold ring-2 ${
              h.correct ? 'bg-kin-leaf/20 text-kin-leaf ring-kin-leaf/60' : 'bg-kin-night/50 text-kin-cream/50 ring-kin-terracotta/40'
            }`}
            title={`Question ${i + 1} : ${h.points} pts`}
          >
            <span className="font-display text-lg leading-none">{h.correct ? '✓' : '✗'}</span>
            {h.points}
          </li>
        ))}
      </ol>

      <Panel className="p-4">
        <h3 className="mb-3 font-display text-2xl">Classement</h3>
        <Leaderboard entries={top} highlightId={publicId} />
        {!inTop && (
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-kin-terracotta/25 px-3 py-2 ring-2 ring-kin-terracotta">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-kin-bark font-display">{final.rank}</span>
            <span className="flex-1 font-semibold">Toi</span>
            <span className="font-display text-xl text-kin-gold">{final.score}</span>
          </div>
        )}
      </Panel>

      <p className="text-center text-sm text-kin-cream/60">Merci d’avoir joué ! Ton résultat est définitif.</p>
    </div>
  );
}
