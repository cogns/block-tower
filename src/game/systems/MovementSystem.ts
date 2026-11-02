export interface Motion { position: number; direction: 1 | -1 }

/** Triangle-wave reflection preserves overshoot, including multiple bounces in one update. */
export function advanceMovement(position: number, direction: 1 | -1, speed: number, dt: number, min: number, max: number): Motion {
  const span = max - min;
  if (span <= 0) return { position: min, direction };
  const bounded = Math.max(min, Math.min(max, position));
  const phase = direction === 1 ? bounded - min : 2 * span - (bounded - min);
  const next = ((phase + speed * Math.max(0, dt)) % (2 * span) + 2 * span) % (2 * span);
  return next < span
    ? { position: min + next, direction: 1 }
    : { position: max - (next - span), direction: -1 };
}
