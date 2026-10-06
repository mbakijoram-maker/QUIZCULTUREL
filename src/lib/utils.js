// localStorage peut être indisponible (navigation privée, stockage bloqué).
export function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignoré */
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignoré */
  }
}

/**
 * Le serveur envoie le temps restant, pas une heure absolue : on le convertit en
 * échéance locale (horloge monotone), ce qui évite tout souci de décalage d'horloge.
 */
export function withDeadline(question) {
  return { ...question, deadline: performance.now() + question.remainingMs };
}
