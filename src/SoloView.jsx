import { useCallback, useEffect, useState } from 'react';
import { ROUNDS, ROUND_SIZE } from '../questions.js';
import { MAX_POINTS, POINT_TIERS, QUESTION_DURATION_MS, TIER_DURATION_MS, badgeForScore, pointsForElapsed } from '../shared/scoring.js';
import { TimerRing, useCountdown } from './components/Timer.jsx';
import { BoardLeaves, Foliage } from './components/Foliage.jsx';
import { AmberButton, Eyebrow, Illustration, KubaBand, MaskFigure } from './components/ui.jsx';
import { BADGES } from './badges.js';
import { MASKS } from './masks.js';
import { readJSON, removeKey, writeJSON } from './lib/utils.js';

// Mode solo : tout se joue dans le navigateur, sans serveur.
// 4 tours de difficulté croissante, débloqués dans l'ordre. Chaque tour ne se
// joue qu'UNE fois. On peut quitter un tour : il se termine aussitôt. Un tour
// interrompu (page fermée) reprend là où il s'est arrêté, et la question qui
// était affichée compte comme temps écoulé.

const RESULTS_KEY = 'kinquiz:v2:results';
const PROGRESS_KEY = 'kinquiz:v2:progress';
const NAME_KEY = 'kinquiz:v2:name';
const RULES_KEY = 'kinquiz:v2:rules-seen';
const LETTERS = ['A', 'B', 'C', 'D'];
const TIMEOUT = { choice: null, correct: false, points: 0, elapsedMs: QUESTION_DURATION_MS };
const SKIPPED = { ...TIMEOUT, skipped: true };
const roundMax = () => ROUND_SIZE * MAX_POINTS;
const TOTAL_MAX = ROUNDS.length * ROUND_SIZE * MAX_POINTS;
const fmt = (n) => n.toLocaleString('fr-FR');
const sumPoints = (history) => history.reduce((sum, h) => sum + h.points, 0);

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Évite deux questions consécutives du même sujet ou du même format quand c'est possible. */
function spread(questions) {
  const rest = shuffle(questions);
  const out = [];
  while (rest.length) {
    const prev = out[out.length - 1];
    let i = rest.findIndex((q) => !prev || (q.category !== prev.category && q.type !== prev.type));
    if (i === -1) i = rest.findIndex((q) => q.category !== prev.category);
    if (i === -1) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

/** 10 questions tirées parmi 15 : au moins un Vrai/Faux et une œuvre à reconnaître. */
function prepareRound(round) {
  const byType = (t) => shuffle(round.pool.filter((q) => q.type === t));
  const images = byType('image').slice(0, 2);
  const tfs = byType('tf').slice(0, 2);
  const choices = byType('choice').slice(0, ROUND_SIZE - images.length - tfs.length);
  return spread([...images, ...tfs, ...choices]).map((q) => {
    const indexes = q.options.map((_, i) => i);
    const order = q.fixed ? indexes : shuffle(indexes);
    return { ...q, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correct) };
  });
}

function loadActive(results) {
  const saved = readJSON(PROGRESS_KEY);
  const round = ROUNDS[saved?.roundIndex];
  if (!round || results[round.id] || !Array.isArray(saved.questions) || !Array.isArray(saved.history)) return null;
  const history = saved.history.length === saved.qIndex ? [...saved.history, TIMEOUT] : saved.history;
  return { roundIndex: saved.roundIndex, questions: saved.questions, history, qIndex: saved.qIndex };
}

const scrollTop = () => window.scrollTo({ top: 0 });

export default function SoloView() {
  const [results, setResults] = useState(() => readJSON(RESULTS_KEY) ?? {});
  const [active, setActive] = useState(() => loadActive(readJSON(RESULTS_KEY) ?? {}));
  const [screen, setScreen] = useState(() => (active ? 'play' : 'home'));
  const [name, setName] = useState(() => readJSON(NAME_KEY) ?? '');
  const [lastRun, setLastRun] = useState(null);

  useEffect(() => writeJSON(RESULTS_KEY, results), [results]);
  useEffect(() => {
    if (active) writeJSON(PROGRESS_KEY, active);
    else removeKey(PROGRESS_KEY);
  }, [active]);

  const nextRoundIndex = ROUNDS.findIndex((r) => !results[r.id]);
  const nameLocked = Boolean(active) || Object.keys(results).length > 0;

  const startRound = (index) => {
    setActive({ roundIndex: index, questions: prepareRound(ROUNDS[index]), history: [], qIndex: 0 });
    setScreen('play');
    scrollTop();
  };

  const play = (index) => {
    if (results[ROUNDS[index].id]) return; // un tour terminé ne se rejoue pas
    if (active) {
      if (active.roundIndex === index) setScreen('play');
      return;
    }
    if (index !== nextRoundIndex) return; // les tours se débloquent dans l'ordre
    if (!readJSON(RULES_KEY)) {
      setScreen('rules');
      scrollTop();
      return;
    }
    startRound(index);
  };

  const confirmName = (value) => {
    const clean = value.trim().replace(/\s+/g, ' ').slice(0, 16);
    setName(clean);
    writeJSON(NAME_KEY, clean);
  };

  const finishRules = () => {
    writeJSON(RULES_KEY, true);
    startRound(nextRoundIndex);
  };

  const answer = useCallback((entry) => {
    setActive((a) => (a.history.length > a.qIndex ? a : { ...a, history: [...a.history, entry] }));
  }, []);

  const finish = (run) => {
    const round = ROUNDS[run.roundIndex];
    const score = sumPoints(run.history);
    setResults((r) => ({ ...r, [round.id]: { score, correct: run.history.filter((h) => h.correct).length, quit: run.quit ?? false, at: Date.now() } }));
    setLastRun(run);
    setActive(null);
    setScreen('end');
    scrollTop();
  };

  const next = () => {
    if (active.qIndex < active.questions.length - 1) {
      setActive((a) => ({ ...a, qIndex: a.qIndex + 1 }));
      scrollTop();
    } else {
      finish(active);
    }
  };

  const [quitOpen, setQuitOpen] = useState(false);

  const quit = () => {
    const history = [...active.history];
    while (history.length < active.questions.length) history.push(SKIPPED);
    setQuitOpen(false);
    finish({ ...active, history, quit: true });
  };

  const liveScore = active ? sumPoints(active.history) : 0;
  const playing = screen === 'play' && Boolean(active);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-clip">
      <Foliage dense={playing || screen === 'rules'} />
      <SiteHeader
        name={name}
        playing={playing}
        round={active ? ROUNDS[active.roundIndex] : null}
        roundIndex={active?.roundIndex}
        score={liveScore}
        // Pendant un tour, le logo ne fait pas sortir en douce : il propose de quitter (et donc de terminer) le tour.
        onHome={() => (playing ? setQuitOpen(true) : setScreen('home'))}
      />
      {quitOpen && <QuitDialog onConfirm={quit} onCancel={() => setQuitOpen(false)} />}

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 sm:px-6">
        {screen === 'home' && (
          <HomeScreen
            name={name}
            nameLocked={nameLocked}
            onConfirmName={confirmName}
            results={results}
            active={active}
            nextRoundIndex={nextRoundIndex}
            onPlay={play}
          />
        )}
        {screen === 'rules' && <RulesScreen name={name} onDone={finishRules} onBack={() => setScreen('home')} />}
        {playing && <PlayScreen active={active} score={liveScore} onAnswer={answer} onNext={next} onQuit={() => setQuitOpen(true)} />}
        {screen === 'end' && lastRun && (
          <EndScreen run={lastRun} results={results} nextRoundIndex={nextRoundIndex} onPlay={play} onHome={() => setScreen('home')} />
        )}
      </main>

      <footer className="relative z-10 mx-auto mt-14 max-w-3xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-kin-cream/40">
        Œuvres : Cleveland Museum of Art, Open Access · Plantes : rawpixel, domaine public
      </footer>
    </div>
  );
}

/* ================================================================= En-tête */

function SiteHeader({ name, playing, round, roundIndex, score, onHome }) {
  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-3 rounded-xl text-left"
          aria-label={playing ? 'Quitter le tour' : 'Accueil'}
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-kin-gold/70 bg-kin-night shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
            <img src={MASKS['pende-gambanda'].src} alt="" className="h-10 w-auto translate-y-0.5" draggable={false} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[1.9rem] tracking-[0.04em] text-kin-cream [text-shadow:0_2px_0_rgba(0,0,0,0.5)]">
              Kin <span className="text-kin-gold">Quiz</span>
            </span>
            <span className="mt-1 block text-[0.66rem] font-bold uppercase tracking-[0.26em] text-kin-cream/60">Culture congolaise</span>
          </span>
        </button>

        {playing ? (
          <div className="flex items-center gap-4">
            <span className="hidden text-right leading-tight md:block">
              <span className="block text-xs uppercase tracking-[0.18em] text-kin-cream/55">Tour {roundIndex + 1}</span>
              <span className="block font-display text-lg text-kin-cream">{round.title}</span>
            </span>
            <span className="score-plaque">
              <span className="font-num text-2xl">{fmt(score)}</span>
              <span className="text-xs font-bold">pts</span>
            </span>
          </div>
        ) : (
          name && (
            <span className="hidden text-sm text-kin-cream/65 sm:block">
              Joueur : <span className="font-bold text-kin-cream">{name}</span>
            </span>
          )
        )}
      </div>
      <KubaBand />
    </header>
  );
}

/* =========================================================== Bouton tambour */

function CtaButton({ label, sub, type = 'button', onClick, className = '' }) {
  return (
    <button type={type} onClick={onClick} className={`btn-cta ${className}`}>
      <span className="btn-cta-drum" aria-hidden>
        <Illustration name="djembe" className="h-9 w-auto drop-shadow-none" />
      </span>
      <span className="flex-1 leading-tight">
        <span className="block font-display text-[1.6rem] uppercase tracking-[0.03em]">{label}</span>
        {sub && <span className="block text-sm font-bold text-kin-night/75">{sub}</span>}
      </span>
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-kin-night text-xl text-kin-gold">
        →
      </span>
    </button>
  );
}

/* ================================================================= Accueil */

function HomeScreen({ name, nameLocked, onConfirmName, results, active, nextRoundIndex, onPlay }) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState('');
  const doneCount = ROUNDS.filter((r) => results[r.id]).length;
  const allDone = nextRoundIndex === -1;
  const total = ROUNDS.reduce((sum, r) => sum + (results[r.id]?.score ?? 0), 0);
  const ctaIndex = active ? active.roundIndex : nextRoundIndex;
  const ctaRound = ROUNDS[ctaIndex];

  const validate = (value) => {
    const clean = value.trim();
    if (!clean) return 'Entre ton pseudo pour pouvoir jouer.';
    if (clean.length < 2) return 'Ton pseudo doit faire au moins 2 caractères.';
    return '';
  };

  const submit = (event) => {
    event.preventDefault();
    if (!nameLocked) {
      const problem = validate(draft);
      setError(problem);
      if (problem) {
        document.getElementById('solo-name')?.focus();
        return;
      }
      onConfirmName(draft);
    }
    onPlay(ctaIndex);
  };

  return (
    <div className="flex flex-col gap-16">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-6">
          <Eyebrow>Culture générale congolaise</Eyebrow>
          <h1 className="font-display text-[clamp(2.6rem,6.5vw,5rem)] leading-[0.98] [text-shadow:0_3px_0_rgba(0,0,0,0.45)]">
            Le grand quiz <span className="text-kin-gold">du Congo</span>
          </h1>
          <p className="max-w-[52ch] text-lg leading-relaxed text-kin-cream/80">
            Histoire, rumba, nature, masques et saveurs : 4 tours de 10 questions, de plus en plus corsés. Prêt à devenir
            Grand Prêtre de Kin ?
          </p>

          {allDone ? (
            <JourneySummary results={results} total={total} />
          ) : (
            <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-4">
              {nameLocked ? (
                <p className="text-kin-cream/75">
                  Joueur : <span className="font-bold text-kin-cream">{name}</span>
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <label htmlFor="solo-name" className="text-sm font-bold text-kin-sand">
                    Ton pseudo <span className="text-kin-terracotta">*</span>
                  </label>
                  <input
                    id="solo-name"
                    className="field max-w-sm"
                    value={draft}
                    maxLength={16}
                    required
                    autoComplete="nickname"
                    autoCapitalize="words"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'solo-name-error' : undefined}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      if (error) setError(validate(e.target.value));
                    }}
                    onBlur={() => draft && setError(validate(draft))}
                  />
                  {error && (
                    <p id="solo-name-error" className="text-sm font-semibold text-kin-terracotta">
                      {error}
                    </p>
                  )}
                </div>
              )}
              <CtaButton
                type="submit"
                label={active ? 'Reprendre' : doneCount === 0 ? 'Jouer' : 'Continuer'}
                sub={`Tour ${ctaIndex + 1} · ${ctaRound.title}`}
                className="w-full max-w-sm"
              />
            </form>
          )}
        </div>

        <MaskFigure name="pende-gambanda" caption sun className="mx-auto h-[21rem] w-full max-w-sm sm:h-[25rem]" />
      </section>

      <section aria-labelledby="tours-title" className="flex flex-col gap-5">
        <h2 id="tours-title" className="font-display text-3xl">
          Les tours
          <span className="kuba-mini" aria-hidden />
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROUNDS.map((r, i) => (
            <li key={r.id}>
              <RoundCard
                round={r}
                index={i}
                result={results[r.id]}
                inProgress={active?.roundIndex === i}
                playable={active ? active.roundIndex === i : i === nextRoundIndex}
                onPlay={onPlay}
                needsName={!nameLocked}
              />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function RoundCard({ round, index, result, inProgress, playable, onPlay, needsName }) {
  const locked = !result && !playable;
  const content = (
    <>
      <MaskFigure name={round.mask} decorative className={`h-40 w-full ${locked ? 'opacity-35 grayscale' : ''}`} />
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-kin-gold">Tour {index + 1}</p>
      <h3 className="mt-1 font-display text-2xl leading-tight">{round.title}</h3>
      <p className="mt-1 text-sm text-kin-cream/65">{round.subtitle}</p>
      <div className="mt-auto pt-5 text-sm">
        {result ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className={`font-semibold ${result.quit ? 'text-kin-terracotta' : 'text-kin-leaf'}`}>{result.quit ? 'Abandonné' : '✓ Terminé'}</span>
              <span className="font-num text-lg text-kin-gold">
                {fmt(result.score)} <span className="text-sm text-kin-cream/50">/ {fmt(roundMax())}</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-kin-night/70">
              <div className="h-full rounded-full bg-kin-gold" style={{ width: `${(result.score / roundMax()) * 100}%` }} />
            </div>
          </>
        ) : locked ? (
          <span className="text-kin-cream/45">Verrouillé · termine le tour {index}</span>
        ) : (
          <span className="font-semibold text-kin-gold">{inProgress ? 'En cours · Reprendre →' : needsName ? 'Entre ton pseudo pour jouer' : '10 questions · Jouer →'}</span>
        )}
      </div>
    </>
  );

  if (playable && !result && !needsName) {
    return (
      <button type="button" onClick={() => onPlay(index)} className="surface round-card border-kin-gold/50 p-5">
        {content}
      </button>
    );
  }
  return <div className={`surface round-card p-5 ${locked ? 'opacity-80' : ''}`}>{content}</div>;
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-kin-cream/50">{label}</dt>
      <dd className="mt-1 font-num text-3xl text-kin-cream">
        {value} {unit && <span className="text-base font-semibold text-kin-cream/50">{unit}</span>}
      </dd>
    </div>
  );
}

function JourneySummary({ results, total }) {
  const badge = BADGES[badgeForScore(total, TOTAL_MAX)];
  return (
    <div className="wood-board max-w-xl p-6">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-kin-night/70">Parcours terminé</p>
      <p className="mt-2 font-num text-5xl text-burnt">
        {fmt(total)} <span className="text-xl text-kin-night/60">/ {fmt(TOTAL_MAX)}</span>
      </p>
      <p className="mt-1 font-display text-2xl text-burnt">{badge.label}</p>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-bold text-kin-night/80">
        {ROUNDS.map((r) => (
          <li key={r.id} className="flex justify-between gap-2">
            <span>{r.title}</span>
            <span className="tabular-nums">{fmt(results[r.id]?.score ?? 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================== Flashcards */

function RulesScreen({ name, onDone, onBack }) {
  const [index, setIndex] = useState(0);
  const cards = [
    {
      title: `Mbote, ${name} !`,
      text: 'Bienvenue dans le grand quiz du Congo. Avant de commencer, voici les règles en quelques cartes.',
      visual: <MaskFigure name="pende-gambanda" decorative className="h-44 w-full" />,
    },
    {
      title: '4 tours, de plus en plus corsés',
      text: 'Chaque tour compte 10 questions. Termine un tour pour débloquer le suivant.',
      visual: (
        <ol className="grid grid-cols-4 gap-2">
          {ROUNDS.map((r, i) => (
            <li key={r.id} className="flex flex-col items-center gap-1 text-center">
              <MaskFigure name={r.mask} decorative className="h-20 w-full" />
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-kin-night/70">Tour {i + 1}</span>
              <span className="font-display text-sm leading-tight text-burnt">{r.title}</span>
            </li>
          ))}
        </ol>
      ),
    },
    {
      title: '30 secondes par question',
      text: 'Réponds avant la fin du chrono. Si le temps est écoulé, la question ne rapporte rien.',
      visual: (
        <div className="flex justify-center">
          <div className="rounded-full bg-kin-night p-3">
            <TimerRing remainingMs={QUESTION_DURATION_MS} size={120} stroke={10} />
          </div>
        </div>
      ),
    },
    {
      title: 'Plus tu es rapide, plus tu gagnes',
      text: 'Une bonne réponse vaut 60 points, puis perd 10 points toutes les 5 secondes.',
      visual: (
        <ol className="grid grid-cols-6 gap-2" aria-label="Barème">
          {POINT_TIERS.map((points, i) => (
            <li key={points} className="flex flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-kin-night/25">
                <div className="wood w-full rounded-t-md border border-kin-night/50" style={{ height: `${(points / 60) * 100}%` }} />
              </div>
              <span className="font-num text-base leading-none text-burnt">{points}</span>
              <span className="text-[0.65rem] font-bold text-kin-night/65">
                {i * 5}–{(i + 1) * 5}s
              </span>
            </li>
          ))}
        </ol>
      ),
    },
    {
      title: 'Des questions variées',
      text: 'Des QCM, des Vrai ou Faux, et des masques du Congo à reconnaître en photo.',
      visual: (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-kin-night/85 p-3 text-kin-cream">
            <span className="font-num text-2xl text-kin-gold">A B C D</span>
            <span className="text-xs font-bold">QCM</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl bg-kin-night/85 p-3 text-kin-cream">
            <span className="font-num text-2xl text-kin-gold">V / F</span>
            <span className="text-xs font-bold">Vrai ou Faux</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-kin-night/85 p-2 text-kin-cream">
            <MaskFigure name="kuba-bwoom" decorative className="h-10 w-full" />
            <span className="text-xs font-bold">Masques</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Une seule chance',
      text: 'Chaque tour ne se joue qu’une fois. Tu peux quitter un tour à tout moment, mais il se termine aussitôt. Fais au moins la moitié des points pour devenir GRAND PRÊTRE DE KIN… sinon : YUMA CERTIFIÉ !',
      visual: (
        <div className="flex items-end justify-center gap-6">
          <MaskFigure name="songye-nkishi" decorative className="h-36 w-24" />
          <MaskFigure name="bembe-emangungu" decorative className="h-28 w-16" />
        </div>
      ),
    },
  ];
  const card = cards[index];
  const last = index === cards.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(cards.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards.length]);

  return (
    <section aria-labelledby="rule-title" className="mx-auto flex w-full max-w-lg flex-col gap-6 pt-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold uppercase tracking-[0.2em] text-kin-gold">Les règles</span>
        <span className="font-num text-kin-cream/60">
          {index + 1} / {cards.length}
        </span>
      </div>

      <div className="flashcard-deck relative">
        <article className="flashcard wood-board relative z-10 flex min-h-[27rem] flex-col gap-5 p-6 sm:p-8" aria-live="polite">
          <BoardLeaves />
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-kin-night/65">Carte {index + 1}</p>
          <h2 id="rule-title" className="font-display text-[2rem] leading-[1.05] text-burnt">
            {card.title}
          </h2>
          <p className="text-[1.05rem] font-semibold leading-relaxed text-kin-night/85">{card.text}</p>
          <div className="mt-auto">{card.visual}</div>
        </article>
      </div>

      <div className="flex justify-center gap-2" aria-hidden>
        {cards.map((_, i) => (
          <span key={i} className={`h-2 rounded-full ${i === index ? 'w-6 bg-kin-gold' : 'w-2 bg-kin-cream/25'}`} />
        ))}
      </div>

      {last ? (
        <CtaButton label="C’est parti !" sub="Tour 1 · Découverte" onClick={onDone} className="w-full" />
      ) : (
        <div className="flex gap-3">
          <button type="button" className="btn-ghost flex-1" onClick={() => (index === 0 ? onBack() : setIndex(index - 1))}>
            {index === 0 ? 'Retour' : '← Précédent'}
          </button>
          <AmberButton onClick={() => setIndex(index + 1)} className="flex-[2]">
            Suivant →
          </AmberButton>
        </div>
      )}
    </section>
  );
}

/* ================================================================== Partie */

/** Cauri : coquillage-monnaie d'Afrique, utilisé ici comme jeton de réponse. */
const COWRIE_TONES = {
  correct: { shell: '#f4e6c8', slit: '#2b1704', ring: '#9cb380' },
  wrong: { shell: '#b8664f', slit: '#2b1704', ring: '#e07a5f' },
  current: { shell: '#f2c77e', slit: '#2b1704', ring: '#f2c77e' },
  upcoming: { shell: 'transparent', slit: 'rgba(250,237,205,0.3)', ring: 'rgba(250,237,205,0.3)' },
  skipped: { shell: 'transparent', slit: 'rgba(250,237,205,0.25)', ring: 'rgba(250,237,205,0.25)' },
};

function Cowrie({ state, size = 20 }) {
  const t = COWRIE_TONES[state];
  return (
    <svg viewBox="0 0 24 32" width={size} height={size * (32 / 24)} aria-hidden>
      <ellipse cx="12" cy="16" rx="10" ry="14" fill={t.shell} stroke={t.ring} strokeWidth="1.6" strokeDasharray={state === 'skipped' ? '3 2.5' : undefined} />
      <path d="M12 5.5C10.3 12 10.3 20 12 26.5" stroke={t.slit} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M9.4 10h1.6M9 14h1.8M8.9 18h1.9M9 22h1.8M13 10h1.6M13.2 14h1.8M13.2 18h1.9M13.2 22h1.8" stroke={t.slit} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

const cowrieState = (h) => (!h ? 'upcoming' : h.skipped ? 'skipped' : h.correct ? 'correct' : 'wrong');

function Progress({ total, history, current }) {
  return (
    <ol className="flex items-center justify-between gap-1" aria-label={`Question ${current + 1} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <li key={i} className={i === current && !history[i] ? 'scale-125' : ''}>
          <Cowrie state={history[i] ? cowrieState(history[i]) : i === current ? 'current' : 'upcoming'} size={18} />
        </li>
      ))}
    </ol>
  );
}

function QuitControl({ onQuit }) {
  return (
    <button type="button" className="btn-ghost w-full text-sm" onClick={onQuit}>
      Quitter le tour
    </button>
  );
}

function QuitDialog({ onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="quit-title"
        aria-describedby="quit-text"
        className="wood-board w-full max-w-md p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="quit-title" className="font-display text-3xl text-burnt">
          Quitter ce tour ?
        </h2>
        <p id="quit-text" className="mt-3 font-semibold leading-relaxed text-kin-night/85">
          Le tour se termine maintenant : les questions restantes comptent 0 point et tu ne pourras pas le rejouer.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" autoFocus className="btn-amber flex-1" onClick={onCancel}>
            Continuer à jouer
          </button>
          <button
            type="button"
            className="flex-1 rounded-[0.8rem] border-2 border-kin-night/70 px-4 py-3 font-bold text-kin-night hover:bg-kin-night/10"
            onClick={onConfirm}
          >
            Terminer le tour
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayScreen({ active, score, onAnswer, onNext, onQuit }) {
  const { roundIndex, questions, history, qIndex } = active;
  const round = ROUNDS[roundIndex];
  const correct = history.filter((h) => h.correct).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-kin-cream/70">
            Tour {roundIndex + 1} · <span className="text-kin-cream">{round.title}</span>
          </span>
          <span className="font-num text-kin-cream/70">
            {qIndex + 1} / {questions.length}
          </span>
        </div>
        <Progress total={questions.length} history={history} current={qIndex} />
        <QuestionPanel
          key={`${roundIndex}-${qIndex}`}
          question={questions[qIndex]}
          result={history[qIndex]}
          isLast={qIndex === questions.length - 1}
          onAnswer={onAnswer}
          onNext={onNext}
        />
        <div className="lg:hidden">
          <QuitControl onQuit={onQuit} />
        </div>
      </div>

      <aside className="hidden flex-col gap-4 lg:flex">
        <div className="surface flex flex-col items-center p-6 text-center">
          <MaskFigure name={round.mask} caption sun className="h-60 w-full" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-kin-gold">Tour {roundIndex + 1}</p>
          <h2 className="mt-1 font-display text-2xl">{round.title}</h2>
          <p className="mt-1 text-sm text-kin-cream/60">{round.subtitle}</p>
        </div>
        <div className="surface grid grid-cols-2 divide-x divide-kin-gold/15 p-4 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-kin-cream/50">Score</p>
            <p className="font-num text-2xl text-kin-gold">{fmt(score)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-kin-cream/50">Justes</p>
            <p className="font-num text-2xl">
              {correct}
              <span className="text-base text-kin-cream/50"> / {history.length}</span>
            </p>
          </div>
        </div>
        <QuitControl onQuit={onQuit} />
      </aside>
    </div>
  );
}

const VERDICTS = {
  correct: { title: 'Malamu !', icon: '✓', tone: 'text-kin-leaf', ring: 'ring-kin-leaf/70 bg-kin-leaf/15' },
  wrong: { title: 'Raté !', icon: '✕', tone: 'text-kin-terracotta', ring: 'ring-kin-terracotta/70 bg-kin-terracotta/15' },
  timeout: { title: 'Temps écoulé', icon: '⏱', tone: 'text-kin-gold', ring: 'ring-kin-gold/70 bg-kin-gold/15' },
};

const TYPE_LABEL = { choice: null, tf: 'Vrai ou faux ?', image: 'Reconnais l’œuvre' };

/** Chrono + points en jeu : seul ce petit bloc se redessine à chaque tic. */
function LiveClock({ deadline }) {
  const { remainingMs, elapsedMs } = useCountdown(deadline);
  const points = pointsForElapsed(elapsedMs);
  const nextDropIn = Math.ceil((TIER_DURATION_MS - (elapsedMs % TIER_DURATION_MS)) / 1000);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-kin-night/90 py-1.5 pl-4 pr-1.5">
      <div className="text-right leading-tight">
        <span className="block font-num text-3xl text-kin-gold">{points}</span>
        <span className="block text-[0.7rem] font-semibold text-kin-cream/70">
          {points > 10 ? `pts · ${points - 10} dans ${nextDropIn} s` : 'pts en jeu'}
        </span>
      </div>
      <TimerRing remainingMs={remainingMs} size={58} stroke={5} />
    </div>
  );
}

function QuestionPanel({ question, result, isLast, onAnswer, onNext }) {
  const [deadline] = useState(() => performance.now() + QUESTION_DURATION_MS);
  const isTf = question.type === 'tf';

  // Une seule minuterie pour le temps écoulé, au lieu de vérifier à chaque tic.
  useEffect(() => {
    if (result) return undefined;
    const id = setTimeout(() => onAnswer(TIMEOUT), Math.max(0, deadline - performance.now()));
    return () => clearTimeout(id);
  }, [result, deadline, onAnswer]);

  const choose = (choice) => {
    if (result) return;
    const elapsed = Math.min(QUESTION_DURATION_MS, performance.now() - (deadline - QUESTION_DURATION_MS));
    const correct = choice === question.correctIndex;
    navigator.vibrate?.(25);
    onAnswer({ choice, correct, points: correct ? pointsForElapsed(elapsed) : 0, elapsedMs: elapsed });
  };

  const verdict = result ? VERDICTS[result.choice === null ? 'timeout' : result.correct ? 'correct' : 'wrong'] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="wood-board flex flex-col gap-5 p-5 sm:p-7">
        <BoardLeaves />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-kin-night/85 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-kin-gold">
              {question.category}
            </span>
            {TYPE_LABEL[question.type] && (
              <span className="rounded-full border border-kin-night/40 px-3 py-1 text-xs font-bold text-kin-night/75">{TYPE_LABEL[question.type]}</span>
            )}
          </span>
          {verdict ? (
            <span aria-live="polite" className="flex items-center gap-3 rounded-xl bg-kin-night/90 px-3 py-2">
              <span className={`grid h-9 w-9 place-items-center rounded-full text-lg font-bold ring-2 ${verdict.ring} ${verdict.tone}`}>
                {verdict.icon}
              </span>
              <span className="text-right leading-tight">
                <span className={`block font-display text-lg ${verdict.tone}`}>{verdict.title}</span>
                <span className="block text-xs font-semibold tabular-nums text-kin-cream/75">
                  +{result.points} pts
                  {result.choice !== null &&
                    ` · ${(result.elapsedMs / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`}
                </span>
              </span>
            </span>
          ) : (
            <LiveClock deadline={deadline} />
          )}
        </div>
        <div className={`relative z-10 ${question.type === 'image' ? 'grid items-center gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]' : ''}`}>
          {question.type === 'image' && (
            <div className="mx-auto w-32 rounded-2xl bg-kin-night/85 p-3 sm:w-full">
              <MaskFigure name={question.mask} className="h-36 w-full" />
            </div>
          )}
          <h2 className="font-num text-[clamp(1.3rem,2.6vw,1.9rem)] leading-[1.25] text-burnt">{question.text}</h2>
        </div>
      </div>

      <div className={`grid gap-3 ${isTf ? 'grid-cols-2' : 'sm:grid-cols-2'}`} role="group" aria-label="Propositions">
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          const isChosen = result?.choice === i;
          let state = '';
          if (result) {
            if (isCorrect) state = 'ring-[3px] ring-kin-leaf';
            else if (isChosen) state = 'ring-[3px] ring-kin-terracotta';
            else state = 'opacity-45 saturate-50';
          }
          return (
            <button
              key={option}
              type="button"
              disabled={Boolean(result)}
              onClick={() => choose(i)}
              className={`wood-btn wood-tone-${i + 1} ${isTf ? 'min-h-[5.5rem] justify-center text-center' : 'min-h-[4.25rem]'} text-[1.02rem] ${state}`}
            >
              {isTf ? (
                <span className="font-display text-3xl tracking-wide">{option}</span>
              ) : (
                <>
                  <span className="answer-key" aria-hidden>
                    {LETTERS[i]}
                  </span>
                  <span className="flex-1 leading-snug">{option}</span>
                </>
              )}
              {result && isCorrect && <span className="text-xl font-bold text-kin-leaf">✓</span>}
              {result && isChosen && !isCorrect && <span className="text-xl font-bold text-kin-terracotta">✕</span>}
            </button>
          );
        })}
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <div className="surface flex items-center gap-4 p-4 sm:p-5">
            <MaskFigure name="pende-munyangi" decorative className="h-20 w-14 shrink-0" />
            <div className="min-w-0">
              <Eyebrow>Le savais-tu ?</Eyebrow>
              <p className="mt-1 leading-relaxed text-kin-cream/90">{question.fact}</p>
            </div>
          </div>
          <AmberButton onClick={onNext} className="w-full sm:ml-auto sm:w-auto" autoFocus>
            {isLast ? 'Voir le bilan du tour' : 'Question suivante'} <span aria-hidden>→</span>
          </AmberButton>
        </div>
      )}
    </div>
  );
}

/* ============================================================ Fin de tour */

function EndScreen({ run, results, nextRoundIndex, onPlay, onHome }) {
  const { roundIndex, questions, history, quit } = run;
  const round = ROUNDS[roundIndex];
  const score = sumPoints(history);
  const max = roundMax();
  const badge = BADGES[badgeForScore(score, max)];
  const correctCount = history.filter((h) => h.correct).length;
  const rightAnswers = history.filter((h) => h.correct);
  const avg = rightAnswers.length ? rightAnswers.reduce((s, h) => s + h.elapsedMs, 0) / rightAnswers.length / 1000 : null;
  const total = ROUNDS.reduce((sum, r) => sum + (results[r.id]?.score ?? 0), 0);
  const nextRound = nextRoundIndex === -1 ? null : ROUNDS[nextRoundIndex];

  return (
    <div className="flex flex-col gap-8">
      <section className="surface relative overflow-hidden p-6 sm:p-10">
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-kin-gold">
              Tour {roundIndex + 1} {quit ? 'abandonné' : 'terminé'} · {round.title}
            </p>
            <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] [text-shadow:0_3px_0_rgba(0,0,0,0.45)]">
              {badge.label}
              <span className="kuba-mini" aria-hidden />
            </h1>
            <p className="max-w-[46ch] text-lg text-kin-cream/75">{badge.description}</p>
            <dl className="mt-2 grid max-w-lg grid-cols-3 gap-4">
              <Stat label="Score" value={fmt(score)} unit={`/ ${fmt(max)}`} />
              <Stat label="Justes" value={correctCount} unit={`/ ${history.length}`} />
              <Stat label="Rapidité" value={avg === null ? '–' : avg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} unit={avg === null ? '' : 's'} />
            </dl>
          </div>
          <MaskFigure name={badge.mask} caption sun className="mx-auto h-72 w-full max-w-[16rem]" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="surface p-5 sm:p-7">
          <h2 className="font-display text-2xl">
            Tes réponses
            <span className="kuba-mini" aria-hidden />
          </h2>
          <ol className="mt-5 flex flex-col">
            {questions.map((q, i) => {
              const h = history[i];
              const state = cowrieState(h);
              const label = { correct: 'Juste', wrong: 'Faux', skipped: 'Non jouée', upcoming: 'Non jouée' }[state];
              return (
                <li key={q.text} className="flex items-start gap-4 border-b border-dashed border-kin-gold/20 py-3.5 last:border-b-0">
                  <span className="mt-0.5 shrink-0" title={label}>
                    <Cowrie state={state} size={22} />
                    <span className="sr-only">{label}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug text-kin-cream/90">{q.text}</span>
                    <span className="mt-1 block text-sm leading-snug">
                      {state === 'skipped' ? (
                        <span className="italic text-kin-cream/45">Non jouée</span>
                      ) : (
                        <>
                          <span className="text-kin-cream/50">Réponse : </span>
                          <span className="font-semibold text-kin-gold">{q.options[q.correctIndex]}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span
                    className={`wood shrink-0 rounded-lg border border-kin-night/70 px-2.5 py-1 font-num text-sm text-[#fff6e3] shadow-[0_2px_0_#2b1704] ${
                      h?.points ? '' : 'opacity-50'
                    }`}
                  >
                    +{h?.points ?? 0}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-col gap-4">
          {nextRound ? (
            <div className="surface flex flex-col gap-4 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-kin-gold">Tour suivant</p>
              <div className="flex items-center gap-4">
                <MaskFigure name={nextRound.mask} decorative className="h-24 w-20 shrink-0" />
                <div>
                  <h2 className="font-display text-2xl leading-tight">{nextRound.title}</h2>
                  <p className="text-sm text-kin-cream/65">{nextRound.subtitle}</p>
                </div>
              </div>
              <CtaButton label="Tour suivant" sub={`Tour ${nextRoundIndex + 1} · ${nextRound.title}`} onClick={() => onPlay(nextRoundIndex)} className="w-full" />
            </div>
          ) : (
            <JourneySummary results={results} total={total} />
          )}
          <button type="button" className="btn-ghost" onClick={onHome}>
            Retour à l’accueil
          </button>
        </div>
      </section>
    </div>
  );
}
