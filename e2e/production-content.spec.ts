import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

test('static information, icons and advertising preparation preserve the game entry', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto('/about.html');
  await expect(page.getByRole('heading', { name: '게임 이용 방법' })).toBeVisible();
  await expect(page.getByText(/최고 기록은 이 브라우저의 localStorage/)).toBeVisible();
  const icon = await request.get('/assets/icon.svg');
  expect(icon.ok()).toBe(true);
  expect(icon.headers()['content-type']).toContain('image/svg+xml');
  const notFound = await request.get('/404.html');
  expect(await notFound.text()).toContain('페이지를 찾을 수 없습니다');
  expect(existsSync('dist/ads.txt')).toBe(false);
  expect(existsSync('dist/docs/privacy-policy.template.md')).toBe(false);
  await page.getByRole('link', { name: '게임 시작하기' }).click();
  await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  await expect(page.locator('script[src*="googlesyndication"], ins.adsbygoogle')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  expect(errors).toEqual([]);
});
