import { useEffect, useRef } from 'react';

/**
 * Stable interval hook for polling without stale closures.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) {
      return undefined;
    }

    const id = window.setInterval(() => callbackRef.current(), delayMs);
    return () => window.clearInterval(id);
  }, [delayMs]);
}
