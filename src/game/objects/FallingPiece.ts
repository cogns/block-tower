import type * as THREE from 'three';
import { GAME_CONFIG, type Axis } from '../GameConfig';
import { Block } from './Block';

export class FallingPiece {
  velocityY = -0.6;
  age = 0;
  private readonly drift: number;
  constructor(readonly block: Block, private readonly axis: Axis, sign: number) {
    block.mesh.matrixAutoUpdate = true;
    this.drift = sign * 0.55;
  }

  update(dt: number): void {
    this.age += dt;
    this.velocityY += GAME_CONFIG.gravity * dt;
    this.block.mesh.position.y += this.velocityY * dt;
    this.block.mesh.position[this.axis] += this.drift * dt;
    this.block.mesh.rotation[this.axis === 'x' ? 'z' : 'x'] -= this.drift * dt * 1.3;
  }

  get position(): THREE.Vector3 { return this.block.mesh.position; }
  remove(): void { this.block.remove(); }
}
