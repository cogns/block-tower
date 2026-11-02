import { describe, expect, it } from 'vitest';
import { advanceMovement, type Motion } from '../src/game/systems/MovementSystem';
import { axisForFloor, GAME_CONFIG, speedForFloor } from '../src/game/GameConfig';

describe('delta-time movement', () => {
  it('has the same position at 30, 60 and 120 FPS', () => {
    const simulate = (fps: number): Motion => {
      let motion: Motion = { position: -4, direction: 1 };
      for (let i = 0; i < fps * 5; i++) motion = advanceMovement(motion.position, motion.direction, 2.8, 1 / fps, -4, 4);
      return motion;
    };
    expect(simulate(30).position).toBeCloseTo(simulate(120).position, 10);
    expect(simulate(60).position).toBeCloseTo(simulate(120).position, 10);
    expect(simulate(30).direction).toBe(simulate(120).direction);
  });
  it('preserves overshoot at a boundary', () => {
    expect(advanceMovement(0.9, 1, 2, 0.2, -1, 1).position).toBeCloseTo(0.7);
    expect(advanceMovement(0.9, 1, 2, 0.2, -1, 1).direction).toBe(-1);
  });
  it('supports several reflections without teleporting outside the range', () => {
    const result = advanceMovement(0, 1, 2, 3, -1, 1);
    expect(result.position).toBe(0);
    expect(result.direction).toBe(-1);
  });
  it('handles a degenerate range', () => {
    expect(advanceMovement(0, 1, 2, 1, 3, 3)).toEqual({ position: 3, direction: 1 });
  });
  it('alternates axes and caps increasing speed', () => {
    expect(Array.from({ length: 10 }, (_, i) => axisForFloor(i))).toEqual(['x', 'z', 'x', 'z', 'x', 'z', 'x', 'z', 'x', 'z']);
    expect(speedForFloor(0)).toBe(2.8);
    expect(speedForFloor(10)).toBeCloseTo(3.6);
    expect(speedForFloor(1000)).toBe(GAME_CONFIG.maxSpeed);
  });
});
