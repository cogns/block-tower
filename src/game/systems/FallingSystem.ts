import { GAME_CONFIG } from '../GameConfig';
import { FallingPiece } from '../objects/FallingPiece';

export class FallingSystem {
  readonly pieces: FallingPiece[] = [];
  add(piece: FallingPiece): void { this.pieces.push(piece); }
  update(dt: number, cameraY: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i]!;
      piece.update(dt);
      if (piece.age > GAME_CONFIG.pieceLifetime || piece.position.y < cameraY - 20) {
        piece.remove();
        this.pieces.splice(i, 1);
      }
    }
  }
  clear(): void { this.pieces.forEach(piece => piece.remove()); this.pieces.length = 0; }
}
