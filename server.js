import express from 'express';
import { createServer } from 'node:http';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { QUESTION_BANK } from './questions.js';
import {
  MAX_SCORE,
  QUESTION_DURATION_MS,
  QUESTIONS_PER_GAME,
  badgeForScore,
  pointsForElapsed,
} from './shared/scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3001;

// Tolérance réseau : une réponse partie à 29,9 s côté joueur peut arriver un peu après 30 s.
const LATENCY_GRACE_MS = 500;
// Les compteurs (joueurs, réponses) sont regroupés puis diffusés au plus toutes les 250 ms,
// pour ne pas inonder l'écran admin quand des centaines de joueurs répondent en même temps.
const STATS_FLUSH_MS = 250;
// Petit délai avant la révélation quand tout le monde a répondu, pour que le dernier
// joueur voie sa réponse se verrouiller.
const EARLY_REVEAL_DELAY_MS = 600;
const MAX_PLAYERS_PER_GAME = 5000;
const LEADERBOARD_SIZE = 10;
const RECENT_NAMES_SIZE = 80;
const NAME_MAX_LENGTH = 16;
const GAME_IDLE_TTL_MS = 6 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ HTTP */

const app = express();
app.disable('x-powered-by');

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, games: games.size, uptime: process.uptime() });
});


if (existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      index: false,
      setHeaders(res, filePath) {
        // Fichiers fingerprintés par Vite : cache long. Le reste : revalidation.
        res.setHeader(
          'Cache-Control',
          filePath.includes(`${path.sep}assets${path.sep}`)
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
        );
      },
    }),
  );
  // Fallback SPA : /admin et toute autre route servent index.html.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res
      .type('text')
      .send(
        'Aucun build trouvé. Lancez "npm run build" puis "npm start", ou "npm run dev" et ouvrez http://localhost:5173',
      );
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  // La compression par message coûte beaucoup de CPU pour des messages minuscules.
  perMessageDeflate: false,
  // Aucun message client ne dépasse quelques centaines d'octets.
  maxHttpBufferSize: 1e4,
  pingInterval: 20_000,
  pingTimeout: 25_000,
});

/* ----------------------------------------------------------------- Jeux */

/** @type {Map<string, any>} pin -> partie */
const games = new Map();

const playersRoom = (pin) => `game:${pin}`;
const adminRoom = (pin) => `admin:${pin}`;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickQuestions() {
  return shuffle(QUESTION_BANK)
    .slice(0, QUESTIONS_PER_GAME)
    .map((q) => {
      const indexes = q.options.map((_, i) => i);
      const order = q.fixed ? indexes : shuffle(indexes);
      return {
        category: q.category,
        text: q.text,
        fact: q.fact,
        options: order.map((i) => q.options[i]),
        correctIndex: order.indexOf(q.correct ?? 0),
      };
    });
}

function generatePin() {
  let pin;
  do pin = String(randomInt(100_000, 1_000_000));
  while (games.has(pin));
  return pin;
}

function createGame() {
  const game = {
    pin: generatePin(),
    adminToken: randomBytes(16).toString('hex'),
    state: 'lobby', // lobby | question | reveal | finished
    questions: pickQuestions(),
    currentIndex: -1,
    players: new Map(), // playerId (secret) -> joueur
    names: new Set(), // pseudos en minuscules, pour l'unicité
    recentNames: [],
    connectedCount: 0,
    answers: new Map(), // playerId -> réponse, pour la question en cours
    distribution: [0, 0, 0, 0],
    questionStartedAt: 0,
    questionEndsAt: 0,
    questionTimer: null,
    earlyRevealTimer: null,
    flushTimer: null,
    lastReveal: null,
    finalBoard: null,
    lastActivity: Date.now(),
  };
  games.set(game.pin, game);
  return game;
}

function closeGame(game, reason = 'closed') {
  clearTimeout(game.questionTimer);
  clearTimeout(game.earlyRevealTimer);
  clearTimeout(game.flushTimer);
  io.to(playersRoom(game.pin)).emit('game:closed', { reason });
  io.in(playersRoom(game.pin)).socketsLeave(playersRoom(game.pin));
  io.in(adminRoom(game.pin)).socketsLeave(adminRoom(game.pin));
  games.delete(game.pin);
}

const compareRank = (a, b) =>
  b.score - a.score || a.totalTimeMs - b.totalTimeMs || a.joinedAt - b.joinedAt;

function rankPlayers(game) {
  const sorted = [...game.players.values()].sort(compareRank);
  sorted.forEach((player, i) => {
    player.rank = i + 1;
  });
  return sorted;
}

// Seul le publicId circule vers les autres joueurs : le playerId sert de jeton de reconnexion.
const boardEntry = (p) => ({
  publicId: p.publicId,
  name: p.name,
  score: p.score,
  rank: p.rank,
  lastPoints: p.lastPoints,
  correctCount: p.correctCount,
});

function publicQuestion(game) {
  const q = game.questions[game.currentIndex];
  return {
    index: game.currentIndex,
    total: game.questions.length,
    category: q.category,
    text: q.text,
    options: q.options,
    durationMs: QUESTION_DURATION_MS,
    remainingMs: Math.max(0, game.questionEndsAt - Date.now()),
  };
}

function statsFor(game) {
  return {
    playerCount: game.players.size,
    connectedCount: game.connectedCount,
    answeredCount: game.state === 'question' ? game.answers.size : 0,
    recentNames: game.recentNames,
  };
}

function adminSnapshot(game) {
  return {
    pin: game.pin,
    state: game.state,
    stats: statsFor(game),
    question: game.state === 'question' ? publicQuestion(game) : null,
    reveal: game.state === 'reveal' ? game.lastReveal : null,
    final: game.state === 'finished' ? game.finalBoard : null,
  };
}

function finalFor(game, p) {
  return {
    score: p.score,
    rank: p.rank,
    playerCount: game.players.size,
    correctCount: p.correctCount,
    total: game.questions.length,
    maxScore: MAX_SCORE,
    badge: badgeForScore(p.score),
    isWinner: p.rank === 1 && p.score > 0,
    history: p.history,
  };
}

function playerSnapshot(game, p) {
  const snapshot = {
    state: game.state,
    score: p.score,
    rank: p.rank,
    playerCount: game.players.size,
  };
  if (game.state === 'question') {
    snapshot.question = publicQuestion(game);
    const answer = game.answers.get(p.id);
    snapshot.answer = answer
      ? { choice: answer.choice, elapsedMs: answer.elapsedMs, potentialPoints: answer.potentialPoints }
      : null;
  } else if (game.state === 'reveal') {
    snapshot.result = p.lastResult;
  } else if (game.state === 'finished') {
    snapshot.final = finalFor(game, p);
    snapshot.leaderboard = game.finalBoard.leaderboard;
  }
  return snapshot;
}

function scheduleStatsFlush(game) {
  if (game.flushTimer) return;
  game.flushTimer = setTimeout(() => {
    game.flushTimer = null;
    if (!games.has(game.pin)) return;
    const stats = statsFor(game);
    io.to(adminRoom(game.pin)).emit('admin:stats', stats);
    if (game.state === 'lobby') {
      io.to(playersRoom(game.pin)).emit('game:players', { count: stats.playerCount });
    }
  }, STATS_FLUSH_MS);
}

function startQuestion(game) {
  game.currentIndex += 1;
  game.state = 'question';
  game.answers = new Map();
  game.distribution = game.questions[game.currentIndex].options.map(() => 0);
  game.questionStartedAt = Date.now();
  game.questionEndsAt = game.questionStartedAt + QUESTION_DURATION_MS;
  game.lastActivity = Date.now();

  const index = game.currentIndex;
  game.questionTimer = setTimeout(() => revealQuestion(game, index), QUESTION_DURATION_MS + LATENCY_GRACE_MS);

  io.to(playersRoom(game.pin)).to(adminRoom(game.pin)).emit('game:question', publicQuestion(game));
  scheduleStatsFlush(game);
}

function maybeRevealEarly(game) {
  if (game.state !== 'question' || game.earlyRevealTimer) return;
  if (game.connectedCount === 0 || game.answers.size < game.connectedCount) return;
  const index = game.currentIndex;
  game.earlyRevealTimer = setTimeout(() => {
    game.earlyRevealTimer = null;
    revealQuestion(game, index);
  }, EARLY_REVEAL_DELAY_MS);
}

function revealQuestion(game, index) {
  if (!games.has(game.pin) || game.state !== 'question' || game.currentIndex !== index) return;
  clearTimeout(game.questionTimer);
  clearTimeout(game.earlyRevealTimer);
  game.earlyRevealTimer = null;
  game.state = 'reveal';

  // Les points ne sont crédités qu'à la révélation : personne ne devine la bonne
  // réponse en regardant les scores bouger pendant la question.
  for (const p of game.players.values()) {
    const answer = game.answers.get(p.id);
    const points = answer ? answer.points : 0;
    p.score += points;
    p.lastPoints = points;
    if (answer?.correct) {
      p.correctCount += 1;
      p.totalTimeMs += answer.elapsedMs;
    }
    p.history.push({ correct: Boolean(answer?.correct), answered: Boolean(answer), points });
  }

  const ranking = rankPlayers(game);
  const q = game.questions[index];
  const isLast = index === game.questions.length - 1;

  game.lastReveal = {
    question: { index, total: game.questions.length, category: q.category, text: q.text, options: q.options },
    correctIndex: q.correctIndex,
    distribution: game.distribution,
    fact: q.fact,
    answeredCount: game.answers.size,
    playerCount: game.players.size,
    leaderboard: ranking.slice(0, LEADERBOARD_SIZE).map(boardEntry),
    isLast,
  };
  io.to(adminRoom(game.pin)).emit('game:reveal', game.lastReveal);

  // Résultat individuel : chaque joueur reçoit uniquement le sien.
  for (const p of ranking) {
    const answer = game.answers.get(p.id);
    p.lastResult = {
      index,
      answered: Boolean(answer),
      choice: answer ? answer.choice : null,
      correct: Boolean(answer?.correct),
      points: p.lastPoints,
      score: p.score,
      rank: p.rank,
      playerCount: game.players.size,
      correctIndex: q.correctIndex,
      correctText: q.options[q.correctIndex],
      isLast,
    };
    if (p.connected) io.to(p.socketId).emit('player:result', p.lastResult);
  }
}

function finishGame(game) {
  game.state = 'finished';
  game.lastActivity = Date.now();
  const ranking = rankPlayers(game);
  game.finalBoard = {
    leaderboard: ranking.slice(0, LEADERBOARD_SIZE).map(boardEntry),
    playerCount: game.players.size,
    maxScore: MAX_SCORE,
  };
  io.to(adminRoom(game.pin)).emit('game:over', game.finalBoard);
  io.to(playersRoom(game.pin)).emit('game:over', { leaderboard: game.finalBoard.leaderboard });
  for (const p of ranking) {
    if (p.connected) io.to(p.socketId).emit('player:final', finalFor(game, p));
  }
}

function sanitizeName(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX_LENGTH);
}

/* -------------------------------------------------------------- Sockets */

io.on('connection', (socket) => {
  const handle = (event, fn) => {
    socket.on(event, (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        fn(payload ?? {}, reply);
      } catch (err) {
        console.error(`[${event}]`, err);
        reply({ ok: false, error: 'Erreur serveur, réessayez.' });
      }
    });
  };

  const adminGame = () => {
    const game = games.get(socket.data.adminPin);
    if (game) game.lastActivity = Date.now();
    return game ?? null;
  };

  /* ---------- Admin */

  handle('admin:create', (_payload, reply) => {
    const previous = adminGame();
    if (previous) closeGame(previous, 'replaced');
    const game = createGame();
    socket.data.adminPin = game.pin;
    socket.join(adminRoom(game.pin));
    console.log(`Nouvelle partie ${game.pin}`);
    reply({ ok: true, pin: game.pin, adminToken: game.adminToken, snapshot: adminSnapshot(game) });
  });

  handle('admin:resume', ({ pin, adminToken }, reply) => {
    const game = games.get(String(pin));
    if (!game || game.adminToken !== adminToken) {
      return reply({ ok: false, error: 'Session introuvable ou expirée.' });
    }
    socket.data.adminPin = game.pin;
    socket.join(adminRoom(game.pin));
    reply({ ok: true, snapshot: adminSnapshot(game) });
  });

  handle('admin:start', (_payload, reply) => {
    const game = adminGame();
    if (!game) return reply({ ok: false, error: 'Aucune session active.' });
    if (game.state !== 'lobby') return reply({ ok: false, error: 'Le quiz a déjà commencé.' });
    if (game.players.size === 0) return reply({ ok: false, error: 'Attendez au moins un joueur.' });
    startQuestion(game);
    reply({ ok: true });
  });

  handle('admin:reveal', (_payload, reply) => {
    const game = adminGame();
    if (!game || game.state !== 'question') return reply({ ok: false, error: 'Aucune question en cours.' });
    revealQuestion(game, game.currentIndex);
    reply({ ok: true });
  });

  handle('admin:next', (_payload, reply) => {
    const game = adminGame();
    if (!game || game.state !== 'reveal') return reply({ ok: false, error: 'Révélez d’abord la réponse.' });
    if (game.currentIndex < game.questions.length - 1) startQuestion(game);
    else finishGame(game);
    reply({ ok: true });
  });

  handle('admin:close', (_payload, reply) => {
    const game = adminGame();
    if (game) closeGame(game);
    socket.data.adminPin = undefined;
    reply({ ok: true });
  });

  /* ---------- Joueurs */

  handle('player:join', ({ pin, name, playerId }, reply) => {
    const game = games.get(String(pin ?? '').trim());
    if (!game) return reply({ ok: false, code: 'pin', error: 'Code PIN introuvable. Vérifiez-le sur l’écran géant.' });

    let player = playerId ? game.players.get(String(playerId)) : undefined;

    if (!player) {
      if (game.state === 'finished') return reply({ ok: false, code: 'finished', error: 'Cette partie est terminée.' });
      if (game.players.size >= MAX_PLAYERS_PER_GAME) return reply({ ok: false, code: 'full', error: 'La partie est complète.' });
      const cleanName = sanitizeName(name);
      if (cleanName.length < 2) return reply({ ok: false, code: 'name', error: 'Choisissez un pseudo d’au moins 2 caractères.' });
      if (game.names.has(cleanName.toLowerCase())) {
        return reply({ ok: false, code: 'name', error: `« ${cleanName} » est déjà pris, essayez une variante.` });
      }
      player = {
        id: randomUUID(),
        publicId: randomBytes(6).toString('hex'),
        name: cleanName,
        score: 0,
        totalTimeMs: 0,
        correctCount: 0,
        lastPoints: 0,
        rank: null,
        history: [],
        lastResult: null,
        joinedAt: Date.now(),
        socketId: null,
        connected: false,
      };
      game.players.set(player.id, player);
      game.names.add(cleanName.toLowerCase());
      game.recentNames = [...game.recentNames, cleanName].slice(-RECENT_NAMES_SIZE);
    }

    // Changement de partie sur le même socket : on quitte l'ancienne salle.
    if (socket.data.pin && socket.data.pin !== game.pin) socket.leave(playersRoom(socket.data.pin));

    player.socketId = socket.id;
    if (!player.connected) {
      player.connected = true;
      game.connectedCount += 1;
    }
    socket.data.pin = game.pin;
    socket.data.playerId = player.id;
    socket.join(playersRoom(game.pin));
    game.lastActivity = Date.now();
    scheduleStatsFlush(game);

    reply({
      ok: true,
      playerId: player.id,
      publicId: player.publicId,
      name: player.name,
      snapshot: playerSnapshot(game, player),
    });
  });

  handle('player:answer', ({ index, choice }, reply) => {
    const game = games.get(socket.data.pin);
    const player = game?.players.get(socket.data.playerId);
    if (!player) return reply({ ok: false, code: 'not-joined', error: 'Vous n’êtes plus dans la partie.' });
    if (game.state !== 'question' || index !== game.currentIndex) {
      return reply({ ok: false, code: 'closed', error: 'Trop tard, la question est fermée.' });
    }
    if (!Number.isInteger(choice) || choice < 0 || choice >= game.questions[index].options.length) {
      return reply({ ok: false, code: 'invalid', error: 'Réponse invalide.' });
    }
    if (game.answers.has(player.id)) return reply({ ok: false, code: 'already', error: 'Réponse déjà enregistrée.' });

    // Le temps est mesuré par le serveur : impossible de tricher avec l'horloge du téléphone.
    const elapsedMs = Date.now() - game.questionStartedAt;
    if (elapsedMs > QUESTION_DURATION_MS + LATENCY_GRACE_MS) {
      return reply({ ok: false, code: 'late', error: 'Temps écoulé !' });
    }
    const potentialPoints = pointsForElapsed(Math.min(elapsedMs, QUESTION_DURATION_MS - 1));
    const correct = choice === game.questions[index].correctIndex;

    game.answers.set(player.id, { choice, elapsedMs, correct, potentialPoints, points: correct ? potentialPoints : 0 });
    game.distribution[choice] += 1;

    // On renvoie le gain potentiel (lié à la vitesse) sans dire si c'est juste.
    reply({ ok: true, elapsedMs, potentialPoints });
    scheduleStatsFlush(game);
    maybeRevealEarly(game);
  });

  handle('player:leave', (_payload, reply) => {
    const game = games.get(socket.data.pin);
    const player = game?.players.get(socket.data.playerId);
    if (player && player.socketId === socket.id && player.connected) {
      player.connected = false;
      game.connectedCount -= 1;
      scheduleStatsFlush(game);
    }
    if (game) socket.leave(playersRoom(game.pin));
    socket.data.pin = undefined;
    socket.data.playerId = undefined;
    reply({ ok: true });
  });

  socket.on('disconnect', () => {
    const game = games.get(socket.data.pin);
    const player = game?.players.get(socket.data.playerId);
    // Un joueur reconnecté a déjà un nouveau socketId : on ne le marque pas déconnecté.
    if (!player || player.socketId !== socket.id || !player.connected) return;
    player.connected = false;
    game.connectedCount -= 1;
    scheduleStatsFlush(game);
    maybeRevealEarly(game);
  });
});

// Ménage des parties abandonnées.
setInterval(() => {
  const now = Date.now();
  for (const game of games.values()) {
    if (now - game.lastActivity > GAME_IDLE_TTL_MS) closeGame(game, 'expired');
  }
}, 10 * 60 * 1000).unref();

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Kin Quiz Live — serveur sur le port ${PORT}`);
});
