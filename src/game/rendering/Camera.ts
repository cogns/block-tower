import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';

export class TowerCamera {
  readonly camera = new THREE.OrthographicCamera(-6, 6, 10, -10, 0.1, 150);
  private readonly offset = new THREE.Vector3(12, 13, 12);
  private readonly target = new THREE.Vector3(0, 1.3, 0);
  private readonly desired = this.target.clone();
  get focusY(): number { return this.target.y; }

  constructor() { this.apply(); }
  resize(width: number, height: number): void {
    const aspect = width / Math.max(height, 1);
    // Wide screens keep a generous vertical field; portrait keeps a safe horizontal field.
    const viewWidth = Math.max(GAME_CONFIG.cameraWorldWidth, 16 * aspect);
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewWidth / aspect / 2;
    this.camera.bottom = -viewWidth / aspect / 2;
    this.camera.updateProjectionMatrix();
  }
  follow(topY: number, x: number, z: number): void {
    this.desired.set(x, Math.max(1.3, topY - 2.6), z);
  }
  showResult(): void {
    // Keep result copy clear without changing the viewing angle or zoom.
    this.desired.y += 3.8;
  }
  reset(preview = false): void {
    this.target.set(0, preview ? 3.7 : 1.3, 0);
    this.desired.copy(this.target);
    this.apply();
  }
  update(dt: number): void {
    this.target.lerp(this.desired, 1 - Math.exp(-GAME_CONFIG.cameraFollowSpeed * dt));
    this.apply();
  }
  private apply(): void {
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }
}
