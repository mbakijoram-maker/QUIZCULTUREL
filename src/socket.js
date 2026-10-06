import { io } from 'socket.io-client';

// Même origine que la page : en dev, Vite proxifie /socket.io vers le serveur Node.
// WebSocket d'abord (pas de long-polling inutile), polling en secours.
export const socket = io({
  transports: ['websocket', 'polling'],
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
});

/** emit avec accusé de réception et délai max ; ne rejette jamais. */
export function request(event, payload = {}, timeoutMs = 6000) {
  return new Promise((resolve) => {
    socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) resolve({ ok: false, code: 'timeout', error: 'Le serveur ne répond pas. Vérifiez la connexion et réessayez.' });
      else resolve(res ?? { ok: false, error: 'Réponse vide du serveur.' });
    });
  });
}
