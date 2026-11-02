export class GameHUD {
  readonly element = document.createElement('section');
  private readonly score: HTMLElement;
  private readonly feedback: HTMLElement;
  private readonly hint: HTMLElement;
  private feedbackTime = 0;
  constructor(parent: HTMLElement) {
    this.element.className = 'hud';
    this.element.hidden = true;
    this.element.innerHTML = `
      <div class="hud-wordmark" aria-hidden="true">BLOCK / TOWER</div>
      <div class="scoreboard"><span class="score" id="score" aria-live="polite">0</span><span class="score-unit">FLOORS</span></div>
      <div class="placement-feedback" role="status" aria-live="polite"></div>
      <p class="tap-hint"><span class="tap-symbol" aria-hidden="true"></span>TAP ANYWHERE TO STACK</p>`;
    this.score = this.element.querySelector('.score')!;
    this.feedback = this.element.querySelector('.placement-feedback')!;
    this.hint = this.element.querySelector('.tap-hint')!;
    parent.append(this.element);
  }
  show(): void { this.element.hidden = false; this.setScore(0); this.feedbackTime = 0; this.feedback.classList.remove('visible'); }
  hide(): void { this.element.hidden = true; }
  setScore(floors: number): void {
    this.score.textContent = String(floors);
    this.hint.classList.toggle('quiet', floors >= 2);
    this.score.animate?.([{ transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
  }
  perfect(): void {
    this.feedback.textContent = 'PERFECT';
    this.feedback.classList.remove('visible');
    // Restart a short entrance even on consecutive perfect placements.
    void this.feedback.offsetWidth;
    this.feedback.classList.add('visible');
    this.feedbackTime = 0.8;
  }
  update(dt: number): void {
    if (this.feedbackTime > 0) {
      this.feedbackTime -= dt;
      if (this.feedbackTime <= 0) this.feedback.classList.remove('visible');
    }
  }
}
