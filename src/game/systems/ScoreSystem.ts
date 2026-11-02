export const BEST_KEY = 'block-tower-challenge.best.v1';
type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): ScoreStorage | undefined {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}

export class ScoreSystem {
  floors = 0;
  best = 0;
  private storage: ScoreStorage | undefined;

  constructor(storage: ScoreStorage | undefined = browserStorage()) {
    this.storage = storage;
    try {
      const saved = Number(this.storage?.getItem(BEST_KEY));
      this.best = Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
    } catch { /* Private browsing and blocked storage must not prevent play. */ }
  }

  reset(): void { this.floors = 0; }
  addFloor(): number { return ++this.floors; }
  finish(): boolean {
    const improved = this.floors > this.best;
    if (improved) {
      this.best = this.floors;
      try { this.storage?.setItem(BEST_KEY, String(this.best)); } catch { /* Session best still works. */ }
    }
    return improved;
  }
}
