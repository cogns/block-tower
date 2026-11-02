import { GAME_CONFIG, type Axis, type BlockSpec } from '../GameConfig';
import { intersectIntervals } from './CollisionSystem';

export type PlacementResult =
  | { kind: 'miss'; pieces: BlockSpec[] }
  | { kind: 'perfect' | 'cut'; retained: BlockSpec; pieces: BlockSpec[] };

export function calculatePlacement(moving: BlockSpec, target: BlockSpec, axis: Axis): PlacementResult {
  const dimension = axis === 'x' ? 'width' : 'depth';
  const overlap = intersectIntervals(moving[axis], moving[dimension], target[axis], target[dimension]);
  // Never reject a positive sliver, and never let PERFECT rescue a genuine miss.
  if (overlap.length <= 0) return { kind: 'miss', pieces: [{ ...moving }] };

  const tolerance = Math.min(GAME_CONFIG.perfectTolerance, target[dimension] * GAME_CONFIG.perfectSizeRatio);
  if (Math.abs(moving[axis] - target[axis]) <= tolerance &&
      Math.abs(moving[dimension] - target[dimension]) < Number.EPSILON * 8) {
    return { kind: 'perfect', retained: { ...moving, [axis]: target[axis] }, pieces: [] };
  }

  const retained = { ...moving, [axis]: (overlap.min + overlap.max) / 2, [dimension]: overlap.length };
  const pieces: BlockSpec[] = [];
  const movingMin = moving[axis] - moving[dimension] / 2;
  const movingMax = moving[axis] + moving[dimension] / 2;
  if (movingMin < overlap.min) {
    pieces.push({ ...moving, [axis]: (movingMin + overlap.min) / 2, [dimension]: overlap.min - movingMin });
  }
  if (movingMax > overlap.max) {
    pieces.push({ ...moving, [axis]: (overlap.max + movingMax) / 2, [dimension]: movingMax - overlap.max });
  }
  return { kind: 'cut', retained, pieces };
}
