import { describe, expect, it } from 'vitest';
import { calculatePlacement } from '../src/game/systems/PlacementSystem';
import { intersectIntervals } from '../src/game/systems/CollisionSystem';
import { axisForFloor, type BlockSpec } from '../src/game/GameConfig';

const base: BlockSpec = { x: 0, y: 0, z: 0, width: 4, depth: 4 };

describe('AABB intersection and placement', () => {
  it('intersects unequal intervals using their actual endpoints', () => {
    expect(intersectIntervals(0, 6, 1, 2)).toEqual({ min: 0, max: 2, length: 2 });
    const result = calculatePlacement({ ...base, width: 6, x: 0 }, { ...base, width: 2, x: 1 }, 'x');
    expect(result.kind).toBe('cut');
    if (result.kind === 'miss') throw new Error('Unexpected miss');
    expect(result.retained.width).toBe(2);
    expect(result.retained.x).toBe(1);
    expect(result.pieces.map(piece => piece.width)).toEqual([3, 1]);
  });

  it.each([0, 0.079, -0.079])('snaps a near-perfect offset of %s without changing size', offset => {
    const result = calculatePlacement({ ...base, x: offset, y: 0.5 }, base, 'x');
    expect(result).toEqual({ kind: 'perfect', retained: { ...base, y: 0.5 }, pieces: [] });
  });

  it.each(['x', 'z'] as const)('cuts only the moving %s axis and conserves the original volume', axis => {
    const moving = { ...base, x: 1.3, z: -2.7, y: 3 };
    const target = { ...moving, [axis]: moving[axis] - 0.7 };
    const result = calculatePlacement(moving, target, axis);
    expect(result.kind).toBe('cut');
    if (result.kind === 'miss') throw new Error('Unexpected miss');
    const size = axis === 'x' ? 'width' : 'depth';
    const otherSize = axis === 'x' ? 'depth' : 'width';
    const otherAxis = axis === 'x' ? 'z' : 'x';
    expect(result.retained[size]).toBeCloseTo(3.3);
    expect(result.retained[axis]).toBeCloseTo(moving[axis] - 0.35);
    expect(result.retained[otherSize]).toBe(moving[otherSize]);
    expect(result.retained[otherAxis]).toBe(moving[otherAxis]);
    expect(result.retained.y).toBe(moving.y);
    expect(result.pieces).toHaveLength(1);
    expect(result.retained[size] + result.pieces[0]![size]).toBeCloseTo(4);
    expect(result.pieces[0]![axis]).toBeCloseTo(moving[axis] + 1.65);
  });

  it.each([4, -4, 4.1, -5])('treats an offset of %s as zero overlap, including exact edge contact', offset => {
    const moving = { ...base, x: offset };
    expect(calculatePlacement(moving, base, 'x')).toEqual({ kind: 'miss', pieces: [moving] });
  });

  it('keeps a positive sliver rather than imposing an arbitrary minimum block size', () => {
    const result = calculatePlacement({ ...base, x: 4 - 1e-9 }, base, 'x');
    expect(result.kind).toBe('cut');
    if (result.kind !== 'miss') expect(result.retained.width).toBeGreaterThan(0);
  });

  it('caps perfect tolerance for a very narrow block and never rescues a miss', () => {
    const tiny = { ...base, width: 0.01 };
    expect(calculatePlacement({ ...tiny, x: 0.0009 }, tiny, 'x').kind).toBe('perfect');
    expect(calculatePlacement({ ...tiny, x: 0.002 }, tiny, 'x').kind).toBe('cut');
    expect(calculatePlacement({ ...tiny, x: 0.02 }, tiny, 'x').kind).toBe('miss');
  });

  it('passes the exact retained coordinates through 10 alternating X/Z placements', () => {
    let target = { ...base };
    for (let floor = 0; floor < 10; floor++) {
      const axis = axisForFloor(floor);
      const dimension = axis === 'x' ? 'width' : 'depth';
      const other = axis === 'x' ? 'depth' : 'width';
      const offset = floor % 3 === 0 ? -0.17 : 0.12;
      const result = calculatePlacement({ ...target, y: target.y + 0.5, [axis]: target[axis] + offset }, target, axis);
      expect(result.kind).toBe('cut');
      if (result.kind === 'miss') throw new Error('Unexpected miss');
      expect(result.retained[dimension]).toBeCloseTo(target[dimension] - Math.abs(offset));
      expect(result.retained[other]).toBe(target[other]);
      expect(result.retained[axis]).toBeCloseTo(target[axis] + offset / 2);
      target = result.retained;
    }
    expect(target.y).toBe(5);
  });

  it('supports 160 progressively narrower placements without NaN or negative dimensions', () => {
    let target = { ...base };
    for (let floor = 0; floor < 160; floor++) {
      const axis = axisForFloor(floor);
      const dimension = axis === 'x' ? 'width' : 'depth';
      const offset = target[dimension] * 0.15 * (floor % 4 < 2 ? 1 : -1);
      const result = calculatePlacement({ ...target, y: target.y + 0.5, [axis]: target[axis] + offset }, target, axis);
      expect(result.kind).toBe('cut');
      if (result.kind === 'miss') throw new Error('Unexpected miss');
      expect(result.retained.width).toBeGreaterThan(0);
      expect(result.retained.depth).toBeGreaterThan(0);
      expect(Object.values(result.retained).every(Number.isFinite)).toBe(true);
      target = result.retained;
    }
    expect(target.width).toBeLessThan(0.0001);
  });
});
