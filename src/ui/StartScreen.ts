export class StartScreen {
  readonly element = document.createElement('section');
  private readonly best: HTMLElement;
  constructor(parent: HTMLElement, onStart: () => void) {
    this.element.className = 'screen start-screen';
    this.element.setAttribute('aria-label', 'Start game');
    this.element.innerHTML = `
      <div class="brand"><img src="./assets/icon.svg" alt="" /> ONE TAP. A LITTLE HIGHER.</div>
      <div class="intro"><p class="eyebrow">THE ONE-TAP CHALLENGE</p>
        <h1>BLOCK<br /><span>TOWER</span><span class="title-dot">.</span></h1>
        <p class="description">Tap to stack the blocks.<br />Find your rhythm. Reach a little higher.</p>
      </div>
      <div class="screen-bottom">
        <button class="primary-button" type="button" id="start-button"><span>START</span><span class="button-arrow" aria-hidden="true">↗</span></button>
        <p class="best-line">PERSONAL BEST <span data-best>0</span> <span class="best-unit">FLOORS</span></p>
      </div>`;
    this.best = this.element.querySelector('[data-best]')!;
    this.element.querySelector('button')!.addEventListener('click', onStart);
    parent.append(this.element);
  }
  show(best: number): void { this.best.textContent = String(best); this.element.hidden = false; }
  hide(): void { this.element.hidden = true; }
}
