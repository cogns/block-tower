import * as THREE from 'three';

export class Lighting {
  private readonly sun = new THREE.DirectionalLight('#fff8e9', 2.6);
  constructor(scene: THREE.Scene) {
    scene.add(new THREE.HemisphereLight('#f7fcff', '#a2b4a5', 2.1));
    this.sun.position.set(-5, 12, 7);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -9, right: 9, top: 11, bottom: -11, near: 0.1, far: 40 });
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.radius = 3;
    scene.add(this.sun, this.sun.target);
  }
  follow(y: number): void {
    this.sun.position.set(-5, y + 12, 7);
    this.sun.target.position.set(0, y, 0);
  }
  dispose(): void { this.sun.shadow.dispose(); }
}
