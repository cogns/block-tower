import { test, expect } from '@playwright/test';

test('production build starts, accepts real touch, finishes, retries and has no debug API', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?qa=1');
  await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  expect(await page.evaluate(() => window.__BLOCK_TOWER_QA__)).toBeUndefined();
  await page.getByRole('button', { name: 'START' }).click();
  await page.waitForTimeout(1050);
  const viewport = page.viewportSize()!;
  await page.touchscreen.tap(viewport.width / 2, viewport.height * 0.58);
  await expect(page.locator('#score')).toHaveText('1');
  // Follow the game frame cadence: hit the next block at its initial disjoint position.
  // Uses the public canvas input path, with no development API or fixed spawn wait.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const canvas = document.querySelector('#game-canvas')!;
    let frames = 0;
    function tapNextFrame() {
      if (document.querySelector<HTMLElement>('#retry-button')?.offsetParent) return resolve();
      if (++frames > 300) return reject(new Error('Production run did not finish'));
      canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true }));
      requestAnimationFrame(tapNextFrame);
    }
    requestAnimationFrame(tapNextFrame);
  }));
  await expect(page.getByRole('button', { name: 'RETRY' })).toBeVisible();
  await expect(page.locator('#final-score')).toHaveText('1');
  await page.getByRole('button', { name: 'RETRY' }).click();
  await expect(page.locator('#score')).toHaveText('0');
  expect(errors).toEqual([]);
});
