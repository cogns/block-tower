import './style.css';
import { Game, type QATools } from './game/Game';

declare global { interface Window { __BLOCK_TOWER_QA__?: QATools } }

const app = document.querySelector<HTMLElement>('#app')!;

try {
  const game = new Game(app);
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('qa') === '1') {
    window.__BLOCK_TOWER_QA__ = game.createQATools();
  }
  import.meta.hot?.dispose(() => { game.dispose(); delete window.__BLOCK_TOWER_QA__; });
} catch (error) {
  app.innerHTML = `<section class="fallback" role="alert"><p class="eyebrow">BLOCK TOWER</p><h1>A little more<br />graphics power.</h1>
    <p>This game needs WebGL 2. Please open it in a recent browser with hardware acceleration enabled.</p>
    <button class="primary-button" type="button">TRY AGAIN <span aria-hidden="true">↗</span></button></section>`;
  app.querySelector('button')!.addEventListener('click', () => location.reload());
  console.error('Block Tower could not initialize:', error);
}
