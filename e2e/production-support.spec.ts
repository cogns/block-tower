import { test, expect } from '@playwright/test';

test('production WebGL context loss pauses input and restores play', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'START' }).click();
  const extension = await page.evaluateHandle(() => document.querySelector<HTMLCanvasElement>('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context'));
  expect(await extension.evaluate(ext => Boolean(ext))).toBe(true);
  await extension.evaluate(ext => ext!.loseContext());
  await expect(page.getByRole('alert')).toContainText('Graphics paused');
  await page.keyboard.press('Space');
  await expect(page.locator('#score')).toHaveText('0');
  await extension.evaluate(ext => ext!.restoreContext());
  await expect(page.getByRole('alert')).toBeHidden();
  await page.waitForTimeout(900);
  const viewport = page.viewportSize()!;
  await page.touchscreen.tap(viewport.width / 2, viewport.height * 0.58);
  await expect(page.locator('#score')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('production unsupported WebGL gives an actionable fallback', async ({ page }) => {
  const exceptions: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', e => exceptions.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(target, canvas, args) { return args[0] === 'webgl2' ? null : Reflect.apply(target, canvas, args); },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('This game needs WebGL 2');
  await expect(page.getByRole('button', { name: 'TRY AGAIN' })).toBeVisible();
  expect(exceptions).toEqual([]);
  expect(errors.length).toBeGreaterThan(0);
  expect(errors.every(error => /WebGL|Block Tower could not initialize/.test(error))).toBe(true);
});
