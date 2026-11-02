import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Run against npm run preview -- --port 4174; never deploys or accesses external services.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 100000 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const started = Date.now();
  await page.goto('http://127.0.0.1:4174/');
  await page.getByRole('button', { name: 'START' }).waitFor();
  const startScreenMs = Date.now() - started;
  await mkdir('.qa/screenshots/production', { recursive: true });
  await page.screenshot({ path: '.qa/screenshots/production/cold-load.png' });
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ name: new URL(r.name).pathname, encodedBytes: r.encodedBodySize, durationMs: r.duration })));
  const result = { startScreenMs, latencyMs: 150, downloadBytesPerSecond: 200000, cacheDisabled: true, resources, errors,
    limitation: 'Local Vite Preview, SwiftShader, synthetic network throttling; not Cloudflare CDN, a phone, or real internet measurements. Recorded encoded sizes reflect negotiated HTTP compression.' };
  await writeFile('.qa/loading-throttled.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
