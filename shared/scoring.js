// Règles de score partagées par le serveur (autorité) et le client (affichage).

export const QUESTIONS_PER_GAME = 5;
export const QUESTION_DURATION_MS = 30_000;
export const TIER_DURATION_MS = 5_000;
export const MAX_POINTS = 60;
export const POINTS_STEP = 10;
export const MAX_SCORE = QUESTIONS_PER_GAME * MAX_POINTS;

// 0-5s : 60 · 5-10s : 50 · 10-15s : 40 · 15-20s : 30 · 20-25s : 20 · 25-30s : 10
export const POINT_TIERS = Array.from(
  { length: QUESTION_DURATION_MS / TIER_DURATION_MS },
  (_, i) => MAX_POINTS - POINTS_STEP * i,
);

/** Points gagnés pour une bonne réponse donnée après `elapsedMs`. 0 si le temps est écoulé. */
export function pointsForElapsed(elapsedMs) {
  if (!(elapsedMs < QUESTION_DURATION_MS)) return 0;
  const tier = Math.floor(Math.max(0, elapsedMs) / TIER_DURATION_MS);
  return MAX_POINTS - POINTS_STEP * tier;
}

/** Badge final : la moitié du score maximum suffit pour être sacré. */
export function badgeForScore(score, maxScore = MAX_SCORE) {
  return score >= maxScore / 2 ? 'pretre' : 'yuma';
}
