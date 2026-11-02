export interface Interval { min: number; max: number; length: number }

/** True AABB interval intersection, including unequal-sized blocks and touching edges. */
export function intersectIntervals(centerA: number, sizeA: number, centerB: number, sizeB: number): Interval {
  const min = Math.max(centerA - sizeA / 2, centerB - sizeB / 2);
  const max = Math.min(centerA + sizeA / 2, centerB + sizeB / 2);
  return { min, max, length: Math.max(0, max - min) };
}
