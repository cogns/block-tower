import type * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';
import { Block, BlockResources } from './Block';

export class Tower {
  readonly blocks: Block[] = [];
  constructor(private readonly scene: THREE.Scene, private readonly resources: BlockResources) {}
  get top(): Block { return this.blocks[this.blocks.length - 1]!; }

  add(block: Block): void {
    block.fix();
    this.blocks.push(block);
    this.scene.add(block.mesh);
  }

  reset(): void {
    this.clear();
    this.add(new Block({ x: 0, y: 0, z: 0, width: GAME_CONFIG.initialBlockWidth, depth: GAME_CONFIG.initialBlockDepth }, this.resources.baseMaterial, this.resources));
  }

  cullBelow(y: number): void {
    for (const block of this.blocks) block.mesh.visible = block.spec.y >= y;
  }

  clear(): void { this.blocks.forEach(block => block.remove()); this.blocks.length = 0; }
}
