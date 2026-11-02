export const GAME_CONFIG = {
  initialBlockWidth: 4, // World units (all lengths below use the same unit).
  initialBlockDepth: 4,
  blockHeight: 0.5,
  initialSpeed: 2.8, // World units per second.
  speedIncreasePerFloor: 0.08,
  maxSpeed: 6,
  movementRange: 6, // Maximum distance from the target center, in either direction.
  movementMargin: 0.12, // Travel just beyond a complete miss, even on the first floor.
  perfectTolerance: 0.08, // Absolute center error allowed for a perfect placement.
  perfectSizeRatio: 0.1, // Tolerance is also capped at 10% of the moving dimension.
  placementDelay: 0.18, // Seconds; also locks repeated input during the cut.
  gameOverDelay: 0.65, // Seconds of falling animation before the result appears.
  gravity: -15, // World units per second squared.
  pieceLifetime: 3, // Seconds before offcuts are reclaimed, even far above the ground.
  cameraFollowSpeed: 3.5, // Exponential follow rate per second.
  cameraWorldWidth: 12.6, // Portrait framing fits the complete initial travel envelope.
  maxPixelRatio: 1.75, // Cap mobile GPU resolution.
  maxFrameDelta: 0.05, // Ignore suspension-sized deltas; never fast-forward on tab return.
} as const;

export type Axis = 'x' | 'z';
export interface BlockSpec {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
}

export function speedForFloor(floor: number): number {
  return Math.min(GAME_CONFIG.maxSpeed, GAME_CONFIG.initialSpeed + floor * GAME_CONFIG.speedIncreasePerFloor);
}

export function axisForFloor(floor: number): Axis {
  return floor % 2 === 0 ? 'x' : 'z';
}
