export class ResultScreen {
  readonly element = document.createElement('section');
  constructor(parent: HTMLElement, onRetry: () => void) {
    this.element.className = 'screen result-screen';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', 'Game result');
    this.element.innerHTML = `
      <div class="brand"><img src="./assets/icon.svg" alt="" /> EVERY BLOCK COUNTS.</div>
      <div class="result-copy"><p class="eyebrow">GAME OVER</p><h2><span id="final-score">0</span><span class="result-unit">FLOORS</span></h2>
      <p class="record-note">A little higher next time.</p>
      <p class="result-best">BEST <span id="result-best">0</span></p></div>
      <div class="screen-bottom"><button class="primary-button" id="retry-button" type="button"><span>RETRY</span><span class="button-arrow" aria-hidden="true">↗</span></button>
      <p class="best-line">ONE MORE BLOCK. ONE MORE TRY.</p></div>`;
    this.element.querySelector('button')!.addEventListener('click', onRetry);
    parent.append(this.element);
  }
  show(floors: number, best: number, newBest: boolean): void {
    this.element.querySelector('#final-score')!.textContent = String(floors);
    this.element.querySelector('#result-best')!.textContent = String(best);
    this.element.querySelector('.record-note')!.textContent = newBest ? 'A new personal best. Nicely stacked.' : 'A little higher next time.';
    this.element.hidden = false;
  }
  hide(): void { this.element.hidden = true; }
}
