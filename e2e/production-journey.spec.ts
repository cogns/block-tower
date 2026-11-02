import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('production assets, perfect, cut, 12 floors, record, retry and reload', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => failedAssets.push(request.url()));
  await page.clock.install({ time: new Date('2026-11-02T00:00:00Z') });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  await expect(page).toHaveTitle('Block Tower Challenge');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Block Tower Challenge');
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ name: r.name, duration: r.duration, bytes: (r as PerformanceResourceTiming).encodedBodySize })));
  const folder = `.qa/screenshots/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/start.png` });
  await page.clock.pauseAt(new Date('2026-11-02T01:00:00Z'));
  await page.getByRole('button', { name: 'START' }).click();
  await expect(page.locator('#score')).toHaveText('0');
  const viewport = page.viewportSize()!;
  const tap = async () => page.touchscreen.tap(viewport.width / 2, viewport.height * 0.58);
  await page.clock.runFor(1472);
  await tap();
  await expect(page.locator('#score')).toHaveText('1');
  await expect(page.getByRole('status')).toHaveText('PERFECT');
  await page.clock.runFor(200);
  // Z block: overshoot the center deliberately to produce a ~0.65-unit offcut.
  await page.clock.runFor(Math.round((4.12 + 0.65) / 2.88 * 1000) - 8);
  await tap();
  await expect(page.locator('#score')).toHaveText('2');
  await page.clock.runFor(64);
  await page.screenshot({ path: `${folder}/cut-falling.png`, animations: 'disabled' });
  // Finish the placement interval; screenshot does not advance the paused game clock.
  await page.clock.runFor(136);
  for (let floor = 2; floor < 12; floor++) {
    const size = floor % 2 === 0 ? 4 : 3.35;
    const speed = 2.8 + floor * 0.08;
    await page.clock.runFor(Math.round((size + 0.12) / speed * 1000) - 8);
    await tap();
    await expect(page.locator('#score')).toHaveText(String(floor + 1));
    await expect(page.getByRole('status')).toHaveText('PERFECT');
    await page.clock.runFor(200);
  }
  await page.screenshot({ path: `${folder}/tower-12.png`, animations: 'disabled' });
  // A fresh block is just beyond the support, so an immediate tap must miss.
  await tap();
  await page.clock.runFor(800);
  await expect(page.locator('#final-score')).toHaveText('12');
  await expect(page.locator('#result-best')).toHaveText('12');
  await page.screenshot({ path: `${folder}/result.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'RETRY' }).click();
  await expect(page.locator('#score')).toHaveText('0');
  await page.reload();
  await expect(page.locator('[data-best]')).toHaveText('12');
  expect(await page.evaluate(() => window.__BLOCK_TOWER_QA__)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
  await writeFile(`.qa/loading-${info.project.name}.json`, JSON.stringify({ resources, errors, failedAssets, note: 'Local SwiftShader measurements, not network or phone benchmarks' }, null, 2));
});
