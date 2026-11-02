import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GAME_CONFIG, type BlockSpec } from '../GameConfig';

/** One shared beveled geometry and a bounded material palette for the entire run. */
export class BlockResources {
  readonly geometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.025);
  readonly materials: THREE.MeshStandardMaterial[];
  readonly baseMaterial = new THREE.MeshStandardMaterial({ color: '#47766a', roughness: 0.72 });

  constructor() {
    this.materials = Array.from({ length: 32 }, (_, i) => new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(((148 + i * 360 / 32) % 360) / 360, 0.34, 0.57),
      roughness: 0.65,
      metalness: 0.03,
    }));
  }

  material(floor: number): THREE.MeshStandardMaterial { return this.materials[floor % this.materials.length]!; }
  dispose(): void {
    this.geometry.dispose();
    this.materials.forEach(material => material.dispose());
    this.baseMaterial.dispose();
  }
}

export class Block {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  spec: BlockSpec;

  constructor(spec: BlockSpec, readonly material: THREE.MeshStandardMaterial, resources: BlockResources) {
    this.spec = { ...spec };
    this.mesh = new THREE.Mesh(resources.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.apply(spec);
  }

  apply(spec: BlockSpec): void {
    if (!Object.values(spec).every(Number.isFinite) || spec.width <= 0 || spec.depth <= 0) {
      throw new Error('Invalid block dimensions');
    }
    this.spec = { ...spec };
    this.mesh.position.set(spec.x, spec.y, spec.z);
    this.mesh.scale.set(spec.width, GAME_CONFIG.blockHeight, spec.depth);
    this.mesh.updateMatrix();
  }

  fix(): void { this.mesh.updateMatrix(); this.mesh.matrixAutoUpdate = false; }

  /** Shared GPU resources belong to BlockResources, not individual meshes. */
  remove(): void { this.mesh.removeFromParent(); }
}
