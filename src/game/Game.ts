import * as THREE from 'three';
import { GAME_CONFIG, axisForFloor, speedForFloor, type Axis, type BlockSpec } from './GameConfig';
import { GameState } from './GameState';
import { Block, BlockResources } from './objects/Block';
import { Tower } from './objects/Tower';
import { FallingPiece } from './objects/FallingPiece';
import { advanceMovement } from './systems/MovementSystem';
import { calculatePlacement } from './systems/PlacementSystem';
import { FallingSystem } from './systems/FallingSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { GameScene } from './rendering/Scene';
import { TowerCamera } from './rendering/Camera';
import { StartScreen } from '../ui/StartScreen';
import { GameHUD } from '../ui/GameHUD';
import { ResultScreen } from '../ui/ResultScreen';

export class Game {
  private readonly state = new GameState();
  private readonly score = new ScoreSystem();
  private readonly graphics: GameScene;
  private readonly camera = new TowerCamera();
  private readonly resources = new BlockResources();
  private readonly tower: Tower;
  private readonly falling = new FallingSystem();
  private readonly startScreen: StartScreen;
  private readonly hud: GameHUD;
  private readonly resultScreen: ResultScreen;
  private readonly events = new AbortController();
  private readonly resizeObserver: ResizeObserver;
  private readonly flashGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 0, -0.5),
    new THREE.Vector3(0.5, 0, 0.5), new THREE.Vector3(-0.5, 0, 0.5),
  ]);
  private readonly flashMaterial = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false });
  private readonly flash = new THREE.LineLoop(this.flashGeometry, this.flashMaterial);
  private flashAge = 1;
  private current: Block | null = null;
  private axis: Axis = 'x';
  private direction: 1 | -1 = 1;
  private rangeMin = 0;
  private rangeMax = 0;
  private transitionTime = 0;
  private pendingMiss = false;
  private newBest = false;
  private lastTime = performance.now();
  private animationId = 0;
  private suspended = document.hidden;
  private contextLost = false;
  private disposed = false;
  private freezeMovement = false;

  constructor(private readonly container: HTMLElement) {
    this.graphics = new GameScene(container);
    this.tower = new Tower(this.graphics.scene, this.resources);
    this.startScreen = new StartScreen(container, () => this.start());
    this.hud = new GameHUD(container);
    this.resultScreen = new ResultScreen(container, () => this.start());
    this.flash.visible = false;
    this.graphics.scene.add(this.flash);
    this.makePreview();
    this.startScreen.show(this.score.best);
    const signal = this.events.signal;
    this.graphics.renderer.domElement.addEventListener('pointerdown', this.onPointer, { signal });
    window.addEventListener('keydown', this.onKey, { signal });
    document.addEventListener('visibilitychange', this.onVisibility, { signal });
    this.graphics.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost, { signal });
    this.graphics.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored, { signal });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.animationId = requestAnimationFrame(this.frame);
  }

  private makePreview(): void {
    this.tower.reset();
    for (let floor = 1; floor <= 7; floor++) {
      this.tower.add(new Block({ x: floor * 0.09 - 0.2, y: floor * GAME_CONFIG.blockHeight, z: -floor * 0.035,
        width: 4 - floor * 0.17, depth: 4 - floor * 0.1 }, this.resources.material(floor * 2), this.resources));
    }
    this.camera.reset(true);
  }

  private start(): void {
    if (this.disposed || this.contextLost || !['ready', 'gameover'].includes(this.state.phase)) return;
    this.current?.remove();
    this.current = null;
    this.falling.clear();
    this.tower.reset();
    this.score.reset();
    this.state.reset();
    this.transitionTime = 0;
    this.pendingMiss = false;
    this.newBest = false;
    this.axis = 'x';
    this.direction = 1;
    this.flash.visible = false;
    this.flashAge = 1;
    this.camera.reset();
    this.startScreen.hide();
    this.resultScreen.hide();
    this.hud.show();
    this.spawn();
    this.state.transition('moving');
    this.lastTime = performance.now();
  }

  private spawn(): void {
    const top = this.tower.top.spec;
    this.axis = axisForFloor(this.score.floors);
    const size = this.axis === 'x' ? top.width : top.depth;
    const radius = Math.min(GAME_CONFIG.movementRange, size + GAME_CONFIG.movementMargin);
    this.rangeMin = top[this.axis] - radius;
    this.rangeMax = top[this.axis] + radius;
    const side = Math.floor(this.score.floors / 2) % 2 === 0 ? -1 : 1;
    this.direction = side === -1 ? 1 : -1;
    const spec: BlockSpec = { ...top, y: top.y + GAME_CONFIG.blockHeight, [this.axis]: top[this.axis] + radius * side };
    this.current = new Block(spec, this.resources.material(this.score.floors), this.resources);
    this.graphics.scene.add(this.current.mesh);
    this.camera.follow(spec.y, top.x, top.z);
  }

  private place(): void {
    if (this.disposed || this.suspended || this.contextLost || this.state.phase !== 'moving' || !this.current) return;
    // Sample motion at the event timestamp, rather than waiting for the following frame.
    this.advanceTo(performance.now());
    if (!this.state.transition('placing')) return;
    const moving = this.current;
    this.current = null;
    const target = this.tower.top.spec;
    const result = calculatePlacement(moving.spec, target, this.axis);
    moving.remove();
    for (const spec of result.pieces) {
      const piece = new Block(spec, moving.material, this.resources);
      this.graphics.scene.add(piece.mesh);
      const sign = Math.sign(spec[this.axis] - target[this.axis]) || 1;
      this.falling.add(new FallingPiece(piece, this.axis, sign));
    }
    this.pendingMiss = result.kind === 'miss';
    if (result.kind === 'miss') {
      this.transitionTime = GAME_CONFIG.gameOverDelay;
      this.newBest = this.score.finish();
      this.camera.showResult();
      return;
    }
    const retained = new Block(result.retained, moving.material, this.resources);
    this.tower.add(retained);
    this.hud.setScore(this.score.addFloor());
    this.transitionTime = GAME_CONFIG.placementDelay;
    this.camera.follow(retained.spec.y + GAME_CONFIG.blockHeight, retained.spec.x, retained.spec.z);
    if (result.kind === 'perfect') {
      this.hud.perfect();
      this.flashAge = 0;
      this.flash.position.set(retained.spec.x, retained.spec.y + GAME_CONFIG.blockHeight / 2 + 0.012, retained.spec.z);
      this.flash.scale.set(retained.spec.width, 1, retained.spec.depth);
      this.flash.visible = true;
    }
  }

  private readonly onPointer = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    this.place();
  };

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'Space' || event.repeat || event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    if (this.state.phase === 'ready' || this.state.phase === 'gameover') this.start();
    else this.place();
  };

  private readonly onVisibility = (): void => {
    this.suspended = document.hidden;
    this.lastTime = performance.now();
  };

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    const notice = document.createElement('div');
    notice.className = 'connection-notice';
    notice.id = 'context-notice';
    notice.setAttribute('role', 'alert');
    notice.textContent = 'Graphics paused. Waiting for your browser to reconnect…';
    this.container.append(notice);
  };

  private readonly onContextRestored = (): void => {
    this.contextLost = false;
    this.lastTime = performance.now();
    this.container.querySelector('#context-notice')?.remove();
  };

  private resize(): void {
    const { width, height } = this.container.getBoundingClientRect();
    this.graphics.resize(width, height);
    this.camera.resize(width, height);
  }

  private advanceTo(now: number): void {
    const dt = Math.min(Math.max(0, (now - this.lastTime) / 1000), GAME_CONFIG.maxFrameDelta);
    this.lastTime = now;
    if (!this.suspended && !this.contextLost) this.update(dt);
  }

  private update(dt: number): void {
    if (this.state.phase === 'moving' && this.current && !this.freezeMovement) {
      const motion = advanceMovement(this.current.spec[this.axis], this.direction, speedForFloor(this.score.floors), dt, this.rangeMin, this.rangeMax);
      this.direction = motion.direction;
      this.current.spec[this.axis] = motion.position;
      this.current.mesh.position[this.axis] = motion.position;
    } else if (this.state.phase === 'placing') {
      this.transitionTime -= dt;
      if (this.transitionTime <= 0) {
        if (this.pendingMiss) {
          this.state.transition('gameover');
          this.hud.hide();
          this.resultScreen.show(this.score.floors, this.score.best, this.newBest);
        } else {
          this.spawn();
          this.state.transition('moving');
        }
      }
    }
    this.camera.update(dt);
    this.graphics.lighting.follow(this.camera.focusY);
    this.tower.cullBelow(this.camera.focusY - 17);
    this.falling.update(dt, this.camera.focusY);
    this.hud.update(dt);
    if (this.flash.visible) {
      this.flashAge += dt;
      this.flashMaterial.opacity = Math.max(0, 0.85 * (1 - this.flashAge / 0.45));
      if (this.flashAge >= 0.45) this.flash.visible = false;
    }
  }

  private readonly frame = (now: number): void => {
    if (this.disposed) return;
    this.advanceTo(now);
    if (!this.suspended && !this.contextLost) this.graphics.renderer.render(this.graphics.scene, this.camera.camera);
    this.animationId = requestAnimationFrame(this.frame);
  };

  /** Attached only in Vite development mode with ?qa=1; production never exposes this API. */
  createQATools() {
    return {
      freeze: (value = true) => { this.freezeMovement = value; },
      align: (offset = 0) => {
        if (!this.current) throw new Error('No moving block');
        this.current.spec[this.axis] = this.tower.top.spec[this.axis] + offset;
        this.current.mesh.position[this.axis] = this.current.spec[this.axis];
      },
      advance: (seconds: number) => {
        let remaining = Math.min(Math.max(seconds, 0), 10);
        while (remaining > 0) {
          const dt = Math.min(remaining, GAME_CONFIG.maxFrameDelta);
          if (!this.suspended && !this.contextLost) this.update(dt);
          remaining -= dt;
        }
        this.graphics.renderer.render(this.graphics.scene, this.camera.camera);
      },
      snapshot: () => ({
        phase: this.state.phase, floors: this.score.floors, best: this.score.best, axis: this.axis,
        speed: speedForFloor(this.score.floors), direction: this.direction,
        moving: this.current ? { ...this.current.spec } : null,
        blocks: this.tower.blocks.map(block => ({ ...block.spec })),
        falling: this.falling.pieces.map(piece => ({ ...piece.block.spec, actualY: piece.position.y })),
        cameraY: this.camera.focusY,
        drawCalls: this.graphics.renderer.info.render.calls,
        geometries: this.graphics.renderer.info.memory.geometries,
        textures: this.graphics.renderer.info.memory.textures,
        suspended: this.suspended,
        contextLost: this.contextLost,
        bounds: this.current ? this.boundsOf(this.current) : null,
        targetBounds: this.boundsOf(this.tower.top),
      }),
    };
  }

  private boundsOf(block: Block) {
    const { x, y, z, width, depth } = block.spec;
    const points: THREE.Vector3[] = [];
    for (const dx of [-width / 2, width / 2]) for (const dy of [-0.25, 0.25]) for (const dz of [-depth / 2, depth / 2]) {
      points.push(new THREE.Vector3(x + dx, y + dy, z + dz).project(this.camera.camera));
    }
    return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
      bottom: Math.min(...points.map(p => p.y)), top: Math.max(...points.map(p => p.y)) };
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.events.abort();
    this.resizeObserver.disconnect();
    this.current?.remove();
    this.tower.clear();
    this.falling.clear();
    this.flashGeometry.dispose();
    this.flashMaterial.dispose();
    this.resources.dispose();
    this.graphics.dispose();
    this.startScreen.element.remove();
    this.hud.element.remove();
    this.resultScreen.element.remove();
  }
}

export type QATools = ReturnType<Game['createQATools']>;
