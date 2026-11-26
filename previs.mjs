// Previs stills per beat untuk Daun Kompos.
// Pakai: node previs.mjs  (tulis ke previs/beatN_tX.png)
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { startServer } from './server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const TIMES = [
  [1, 2.0], [1, 4.2], [2, 5.5], [2, 8.0], [2, 10.5], [3, 13.0], [3, 17.0],
  [4, 28.0], [4, 32.5], [5, 34.2], [5, 35.5], [6, 44.0], [7, 57.0], [7, 59.5],
];
const CHROME_PATH = process.env.CHROME_PATH || '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const PORT = Number(process.env.PORT || 8133);

await mkdir(path.join(here, 'previs'), { recursive: true });
const server = await startServer(PORT);
const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 576, height: 1024 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.error('browser:', m.text()); });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/render.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  for (const [beat, t] of TIMES) {
    await page.evaluate((tt) => window.renderAt(tt), t);
    const name = `beat${beat}_t${String(t).replace('.', '_')}.png`;
    await page.screenshot({ path: path.join(here, 'previs', name) });
    console.log(`beat ${beat} t=${t}s -> ${name}`);
  }
} finally {
  await browser.close();
  server.close();
}
console.log('Previs selesai.');
