import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';

export function useConnected() {
  const [connected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
    };
  }, []);
  return connected;
}

/** Abonnement à un événement socket ; le handler peut changer sans réabonnement. */
export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const listener = (...args) => ref.current(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [event]);
}
