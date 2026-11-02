import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await use(errors);
    expect(errors, 'No JavaScript or browser console errors').toEqual([]);
  }, { auto: true }],
});

async function boot(page: Page): Promise<void> {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__BLOCK_TOWER_QA__));
  await page.evaluate(() => window.__BLOCK_TOWER_QA__!.freeze());
}

async function snapshot(page: Page) { return page.evaluate(() => window.__BLOCK_TOWER_QA__!.snapshot()); }
async function advance(page: Page, seconds = 0.22): Promise<void> { await page.evaluate(value => window.__BLOCK_TOWER_QA__!.advance(value), seconds); }
async function align(page: Page, offset = 0): Promise<void> { await page.evaluate(value => window.__BLOCK_TOWER_QA__!.align(value), offset); }

async function tap(page: Page, isMobile: boolean): Promise<void> {
  const viewport = page.viewportSize()!;
  if (isMobile) await page.touchscreen.tap(viewport.width / 2, viewport.height * 0.58);
  else await page.mouse.click(viewport.width / 2, viewport.height * 0.58);
}

async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
  const folder = path.join('.qa', 'screenshots', info.project.name);
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: path.join(folder, `${name}.png`), animations: 'disabled' });
}

function assertVisible(bounds: { left: number; right: number; top: number; bottom: number } | null): void {
  expect(bounds).not.toBeNull();
  expect(bounds!.left).toBeGreaterThan(-1);
  expect(bounds!.right).toBeLessThan(1);
  expect(bounds!.top).toBeLessThan(1);
  expect(bounds!.bottom).toBeGreaterThan(-1);
}

test('complete visual journey: start, perfect, cut, falling, 5/10/25 floors, miss and retry', async ({ page, isMobile }, info) => {
  await boot(page);
  await expect(page.getByRole('heading', { name: 'BLOCK TOWER.' })).toBeVisible();
  const intro = await page.locator('.intro').boundingBox();
  const preview = await snapshot(page);
  expect((1 - preview.targetBounds.top) * page.viewportSize()!.height / 2).toBeGreaterThan(intro!.y + intro!.height);
  await capture(page, info, '01-start');
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'START' }).click();
  let state = await snapshot(page);
  expect(state.phase).toBe('moving');
  expect(state.floors).toBe(0);
  expect(state.axis).toBe('x');
  assertVisible(state.bounds);
  await capture(page, info, '02-first-moving');

  await align(page);
  await tap(page, isMobile);
  state = await snapshot(page);
  expect(state.phase).toBe('placing');
  expect(state.floors).toBe(1);
  expect(state.falling).toHaveLength(0);
  expect(state.blocks.at(-1)!.width).toBe(4);
  expect(state.blocks.at(-1)!.x).toBe(0);
  await expect(page.getByRole('status')).toHaveText('PERFECT');
  await capture(page, info, '03-perfect');
  await advance(page);
  state = await snapshot(page);
  expect(state.axis).toBe('z');
  expect(state.moving!.width).toBe(4);

  await align(page, 0.65);
  await tap(page, isMobile);
  state = await snapshot(page);
  const retained = state.blocks.at(-1)!;
  expect(retained.width).toBe(4);
  expect(retained.depth).toBeCloseTo(3.35);
  expect(retained.z).toBeCloseTo(0.325);
  expect(state.falling).toHaveLength(1);
  expect(state.falling[0]!.depth).toBeCloseTo(0.65);
  expect(state.falling[0]!.z).toBeCloseTo(2.325);
  await capture(page, info, '04-partial-cut');
  await advance(page, 0.12);
  state = await snapshot(page);
  expect(state.falling[0]!.actualY).toBeLessThan(state.falling[0]!.y);
  await capture(page, info, '05-falling-piece');
  await advance(page);

  for (let floor = 2; floor < 25; floor++) {
    const before = await snapshot(page);
    expect(before.axis).toBe(floor % 2 === 0 ? 'x' : 'z');
    const offset = floor < 10 ? (floor % 3 === 0 ? -0.12 : 0.12) : 0;
    await align(page, offset);
    await tap(page, isMobile);
    const after = await snapshot(page);
    expect(after.floors).toBe(floor + 1);
    const other = before.axis === 'x' ? 'depth' : 'width';
    expect(after.blocks.at(-1)![other]).toBe(before.blocks.at(-1)![other]);
    await advance(page);
    if ([5, 10, 25].includes(floor + 1)) {
      await advance(page, 1);
      const settled = await snapshot(page);
      assertVisible(settled.bounds);
      assertVisible(settled.targetBounds);
      await capture(page, info, `06-tower-${floor + 1}`);
    }
  }

  state = await snapshot(page);
  await align(page, (state.axis === 'x' ? state.moving!.width : state.moving!.depth) + 0.2);
  await tap(page, isMobile);
  expect((await snapshot(page)).floors).toBe(25);
  await advance(page, 0.75);
  expect((await snapshot(page)).phase).toBe('gameover');
  await expect(page.getByRole('button', { name: 'RETRY' })).toBeVisible();
  await expect(page.locator('#final-score')).toHaveText('25');
  await expect(page.locator('#result-best')).toHaveText('25');
  const resultBest = await page.locator('.result-best').boundingBox();
  const resultState = await snapshot(page);
  expect((1 - resultState.targetBounds.top) * page.viewportSize()!.height / 2).toBeGreaterThan(resultBest!.y + resultBest!.height + 10);
  await capture(page, info, '09-game-over');

  await page.getByRole('button', { name: 'RETRY' }).click();
  state = await snapshot(page);
  expect(state.phase).toBe('moving');
  expect(state.floors).toBe(0);
  expect(state.best).toBe(25);
  expect(state.blocks).toHaveLength(1);
  expect(state.falling).toHaveLength(0);
  expect(state.axis).toBe('x');
  expect(state.cameraY).toBe(1.3);
  expect(state.moving!.width).toBe(4);
  await capture(page, info, '10-retry');
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__BLOCK_TOWER_QA__));
  expect((await snapshot(page)).best).toBe(25);
  await expect(page.locator('[data-best]')).toHaveText('25');
});

test('burst input, secondary pointers and held Space cannot place duplicate blocks', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'START' }).click();
  await align(page);
  await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas')!;
    for (let i = 0; i < 40; i++) canvas.dispatchEvent(new PointerEvent('pointerdown', { isPrimary: false, pointerId: 2, button: 0 }));
  });
  expect((await snapshot(page)).floors).toBe(0);
  await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas')!;
    for (let i = 0; i < 80; i++) canvas.dispatchEvent(new PointerEvent('pointerdown', { isPrimary: true, pointerId: 1, button: 0 }));
  });
  expect((await snapshot(page)).floors).toBe(1);
  expect((await snapshot(page)).blocks).toHaveLength(2);
  await advance(page);
  await align(page);
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  // Move keyboard focus off START; gameplay Space is handled independently of button activation.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.down('Space');
  await advance(page);
  await align(page);
  await page.keyboard.down('Space');
  expect((await snapshot(page)).floors).toBe(2);
  await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  expect((await snapshot(page)).floors).toBe(3);
});

test('128 floors follow the camera, clean offcuts and reuse GPU resources through retries', async ({ page }, info) => {
  await boot(page);
  await page.getByRole('button', { name: 'START' }).click();
  const run = async (floors: number) => page.evaluate(count => {
    const qa = window.__BLOCK_TOWER_QA__!;
    const canvas = document.querySelector('#game-canvas')!;
    for (let floor = 0; floor < count; floor++) {
      qa.align(floor % 7 === 0 ? 0.12 : 0);
      canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true }));
      qa.advance(0.22);
    }
    qa.advance(4);
    return qa.snapshot();
  }, floors);
  let state = await run(128);
  expect(state.floors).toBe(128);
  expect(state.blocks).toHaveLength(129);
  expect(state.falling).toHaveLength(0);
  expect(state.cameraY).toBeGreaterThan(60);
  expect(state.speed).toBe(6);
  expect(state.geometries).toBeLessThanOrEqual(4);
  expect(state.drawCalls).toBeLessThan(90);
  expect(state.blocks.every(block => Object.values(block).every(Number.isFinite) && block.width > 0 && block.depth > 0)).toBe(true);
  assertVisible(state.bounds);
  assertVisible(state.targetBounds);
  await capture(page, info, '11-tower-128');
  const highTower = { ...state, blocks: state.blocks.length };
  const geometryCount = state.geometries;
  for (let retry = 0; retry < 3; retry++) {
    await align(page, 6);
    await page.evaluate(() => document.querySelector('#game-canvas')!.dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true })));
    await advance(page, 0.8);
    await page.getByRole('button', { name: 'RETRY' }).click();
    state = await snapshot(page);
    expect(state.blocks).toHaveLength(1);
    expect(state.falling).toHaveLength(0);
    expect(state.best).toBe(128);
    state = await run(12);
    expect(state.geometries).toBeLessThanOrEqual(geometryCount);
  }
  await mkdir('.qa', { recursive: true });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path.join('.qa', `metrics-${info.project.name}.json`), JSON.stringify({ highTower, afterRetries: { ...state, blocks: state.blocks.length } }, null, 2));
});

test('80 fractional cuts remain valid when blocks become very thin', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'START' }).click();
  const state = await page.evaluate(() => {
    const qa = window.__BLOCK_TOWER_QA__!;
    const canvas = document.querySelector('#game-canvas')!;
    for (let floor = 0; floor < 80; floor++) {
      const snapshot = qa.snapshot();
      const size = snapshot.axis === 'x' ? snapshot.moving!.width : snapshot.moving!.depth;
      qa.align(size * 0.15 * (floor % 4 < 2 ? 1 : -1));
      canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true }));
      qa.advance(0.22);
    }
    return qa.snapshot();
  });
  expect(state.floors).toBe(80);
  expect(state.moving!.width).toBeGreaterThan(0);
  expect(state.moving!.width).toBeLessThan(0.01);
  expect(state.blocks.every(block => Object.values(block).every(Number.isFinite))).toBe(true);
});

test('actual movement advances and stays in the viewport, including a resize', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'START' }).click();
  await page.evaluate(() => window.__BLOCK_TOWER_QA__!.freeze(false));
  const before = (await snapshot(page)).moving!.x;
  await page.waitForTimeout(250);
  const after = await snapshot(page);
  expect(after.moving!.x).toBeGreaterThan(before + 0.2);
  assertVisible(after.bounds);
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: viewport.height, height: viewport.width });
  await page.waitForTimeout(100);
  assertVisible((await snapshot(page)).bounds);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test('visibility suspension ignores accumulated time and blocks input', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'START' }).click();
  await align(page);
  const before = await snapshot(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.__BLOCK_TOWER_QA__!.freeze(false);
    window.__BLOCK_TOWER_QA__!.advance(5);
    document.querySelector('#game-canvas')!.dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true }));
  });
  const paused = await snapshot(page);
  expect(paused.suspended).toBe(true);
  expect(paused.floors).toBe(0);
  expect(paused.moving).toEqual(before.moving);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    window.__BLOCK_TOWER_QA__!.freeze();
  });
  expect((await snapshot(page)).suspended).toBe(false);
  const resumed = (await snapshot(page)).moving!.x;
  expect(Math.abs(resumed - before.moving!.x)).toBeLessThan(0.2);
  await page.evaluate(() => {
    const qa = window.__BLOCK_TOWER_QA__!;
    qa.freeze(false);
    qa.advance(0.2);
    qa.freeze();
  });
  expect((await snapshot(page)).moving!.x).toBeGreaterThan(resumed + 0.3);
});

test('blocked score storage still allows game over and retry', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key: string) {
      if (key === 'block-tower-challenge.best.v1') throw new DOMException('Blocked', 'SecurityError');
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key === 'block-tower-challenge.best.v1') throw new DOMException('Full', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
  });
  await boot(page);
  await page.getByRole('button', { name: 'START' }).click();
  await align(page);
  await tap(page, isMobile);
  await advance(page);
  await align(page, 6);
  await tap(page, isMobile);
  await advance(page, 0.8);
  expect((await snapshot(page)).best).toBe(1);
  await page.getByRole('button', { name: 'RETRY' }).click();
  expect((await snapshot(page)).floors).toBe(0);
  expect((await snapshot(page)).best).toBe(1);
});
