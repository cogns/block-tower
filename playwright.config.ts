import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: '.qa/test-results',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: '.qa/report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    ...[
      { name: 'mobile-375', width: 375, height: 812 },
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'mobile-430', width: 430, height: 932 },
      { name: 'desktop', width: 1280, height: 720 },
    ].map(({ name, width, height }) => ({
      name, testMatch: 'game.spec.ts',
      use: { viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700, deviceScaleFactor: width < 700 ? 2 : 1 },
    })),
    ...[
      { name: 'production', width: 390, height: 844 },
      { name: 'production-375', width: 375, height: 812 },
      { name: 'production-430', width: 430, height: 932 },
      { name: 'production-desktop', width: 1280, height: 720 },
    ].map(({ name, width, height }) => ({ name, testMatch: 'production*.spec.ts',
      use: { baseURL: 'http://127.0.0.1:4174', viewport: { width, height }, hasTouch: true, isMobile: width < 700 } })),
  ],
  webServer: [
    // Never reuse an unrelated preview/dev server on these ports: their QA APIs differ.
    { command: 'npm run dev -- --port 4173 --host 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 30_000 },
    { command: 'npm run preview -- --port 4174 --host 127.0.0.1', url: 'http://127.0.0.1:4174', reuseExistingServer: false, timeout: 30_000 },
  ],
});
