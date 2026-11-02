import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';
import { Lighting } from './Lighting';

export class GameScene {
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  readonly lighting: Lighting;
  private readonly floorGeometry = new THREE.PlaneGeometry(240, 240);
  private readonly floorMaterial = new THREE.ShadowMaterial({ opacity: 0.09 });

  constructor(container: HTMLElement) {
    this.scene.background = new THREE.Color('#edf1eb');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GAME_CONFIG.maxPixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.domElement.setAttribute('aria-label', 'Tap to place the moving block. Space also works.');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.id = 'game-canvas';
    container.prepend(this.renderer.domElement);
    this.lighting = new Lighting(this.scene);
    const ground = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.26;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  resize(width: number, height: number): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GAME_CONFIG.maxPixelRatio));
    this.renderer.setSize(width, height, false);
  }
  dispose(): void {
    this.lighting.dispose();
    this.floorGeometry.dispose();
    this.floorMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
