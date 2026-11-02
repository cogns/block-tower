import { describe, expect, it } from 'vitest';
import { Block, BlockResources } from '../src/game/objects/Block';
import { FallingPiece } from '../src/game/objects/FallingPiece';
import { FallingSystem } from '../src/game/systems/FallingSystem';

describe('resource ownership and falling lifetime', () => {
  it('shares a geometry and bounded materials across 150 blocks and offcuts', () => {
    const resources = new BlockResources();
    const blocks = Array.from({ length: 150 }, (_, i) => new Block({ x: 0, y: i * 0.5, z: 0, width: 4, depth: 4 }, resources.material(i), resources));
    expect(new Set(blocks.map(block => block.mesh.geometry)).size).toBe(1);
    expect(new Set(blocks.map(block => block.mesh.material)).size).toBe(32);
    const falling = new FallingSystem();
    falling.add(new FallingPiece(blocks[149]!, 'z', 1));
    const y = blocks[149]!.mesh.position.y;
    falling.update(0.1, 75);
    expect(falling.pieces[0]!.position.y).toBeLessThan(y);
    for (let i = 0; i < 65; i++) falling.update(0.05, 75);
    expect(falling.pieces).toHaveLength(0);
    blocks.forEach(block => block.remove());
    resources.dispose();
  });
  it('renders very thin positive dimensions and rejects malformed geometry inputs', () => {
    const resources = new BlockResources();
    const spec = { x: 0, y: 0.5, z: 0, width: 1e-9, depth: 1e-8 };
    const block = new Block(spec, resources.material(0), resources);
    expect(block.mesh.scale.x).toBe(1e-9);
    expect(() => block.apply({ ...spec, width: -1 })).toThrow();
    expect(() => block.apply({ ...spec, x: NaN })).toThrow();
    resources.dispose();
  });
});
