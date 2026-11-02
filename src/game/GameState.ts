export type GamePhase = 'ready' | 'moving' | 'placing' | 'gameover';

const transitions: Record<GamePhase, readonly GamePhase[]> = {
  ready: ['moving'],
  moving: ['placing'],
  placing: ['moving', 'gameover'],
  gameover: ['ready'],
};

export class GameState {
  private current: GamePhase = 'ready';
  get phase(): GamePhase { return this.current; }

  transition(next: GamePhase): boolean {
    if (!transitions[this.current].includes(next)) return false;
    this.current = next;
    return true;
  }

  /** A new run always resets the one authoritative state machine. */
  reset(): void { this.current = 'ready'; }
}
