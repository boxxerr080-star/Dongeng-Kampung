// Render katak-penjaga-padi: Playwright + Chromium headless -> PNG -> ffmpeg.
// Resumable: manifest fingerprint; CHUNK_SIZE membatasi frame baru per jalan.
// Pakai: FRAME_COUNT=1800 CHUNK_SIZE=60 node capture.mjs
// Encode akhir otomatis kalau semua frame lengkap (mux voiceover, -t DUR, TANPA -shortest).
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = Number(process.env.FPS || 30);
const WIDTH = Number(process.env.WIDTH || 576);
const HEIGHT = Number(process.env.HEIGHT || 1024);
const FRAME_COUNT = Number(process.env.FRAME_COUNT || 1800);
const FRAME_START = Math.max(0, Number(process.env.FRAME_START || 0));
const FRAME_END = Math.min(FRAME_COUNT, Number(process.env.FRAME_END || FRAME_COUNT));
const DUR = FRAME_COUNT / FPS;
const OUT = process.env.OUT || path.join(here, 'katak-penjaga-padi.mp4');
const SILENT = process.env.SILENT || path.join(here, 'katak-silent.mp4');
const AUDIO = process.env.AUDIO || path.join(here, 'voice', 'voiceover-katak.mp3'); // nama file hasil decode di render.yml (workflow) — isi audionya voiceover daun kompos
const FRAMES_DIR = path.join(here, 'frames');
const MANIFEST = path.join(FRAMES_DIR, 'render_manifest.json');
const RESUME = !['0', 'false', 'no'].includes((process.env.RESUME || '1').toLowerCase());
const CHUNK_SIZE = Math.max(0, Number(process.env.CHUNK_SIZE || 0));
const CHROME_PATH = process.env.CHROME_PATH || '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const PORT = Number(process.env.PORT || 8132);
const MIN_FRAME_BYTES = 1000;

function fingerprint() {
  const h = createHash('sha256');
  for (const name of ['render.html', 'scene.js']) {
    const p = path.join(here, name);
    if (fs.existsSync(p)) { h.update(name); h.update(fs.readFileSync(p)); }
  }
  h.update(`${FRAME_COUNT}|${FPS}|${WIDTH}|${HEIGHT}`);
  return h.digest('hex');
}

async function validFrames() {
  try {
    const files = await readdir(FRAMES_DIR);
    const ok = new Set();
    for (const f of files) {
      if (!/^f_\d+\.png$/.test(f)) continue;
      try {
        const st = fs.statSync(path.join(FRAMES_DIR, f));
        if (st.size >= MIN_FRAME_BYTES) ok.add(f);
      } catch { /* abaikan */ }
    }
    return ok;
  } catch { return new Set(); }
}

async function prepare() {
  const expected = { fingerprint: fingerprint(), frames: FRAME_COUNT, fps: FPS, width: WIDTH, height: HEIGHT };
  if (RESUME) {
    try {
      const saved = JSON.parse(await readFile(MANIFEST, 'utf8'));
      if (JSON.stringify(saved) === JSON.stringify(expected)) {
        const files = await readdir(FRAMES_DIR);
        for (const f of files) if (f.endsWith('.tmp.png')) await rm(path.join(FRAMES_DIR, f), { force: true });
        return await validFrames();
      }
      console.log('Fingerprint berubah, mulai bersih.');
    } catch { /* manifest tidak ada */ }
  }
  await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(FRAMES_DIR, { recursive: true });
  await writeFile(MANIFEST, JSON.stringify(expected, null, 2));
  return new Set();
}

async function renderFrames(todo) {
  const server = await startServer(PORT);
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
      headless: true,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--no-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    page.on('console', (m) => { if (m.type() === 'error') console.error('browser:', m.text()); });
    page.on('pageerror', (e) => console.error('pageerror:', e.message));
    await page.goto(`http://127.0.0.1:${PORT}/render.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const t0 = Date.now();
    for (let n = 0; n < todo.length; n++) {
      const i = todo[n];
      await page.evaluate((t) => window.renderAt(t), i / FPS);
      const target = path.join(FRAMES_DIR, `f_${String(i).padStart(4, '0')}.png`);
      const tmp = target.replace(/\.png$/, '.tmp.png');
      await page.screenshot({ path: tmp });
      fs.renameSync(tmp, target);
      if (n % 25 === 0) console.log(`frame ${i}/${FRAME_COUNT} (${n + 1}/${todo.length}, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    console.log(`render chunk selesai dalam ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

function encode() {
  const args = ['-y', '-framerate', String(FPS), '-start_number', '0', '-i', path.join(FRAMES_DIR, 'f_%04d.png')];
  const hasAudio = fs.existsSync(AUDIO);
  if (hasAudio) {
    args.push('-i', AUDIO);
    args.push('-filter_complex', `[1:a]adelay=1000|1000,apad=whole_dur=${DUR},atrim=0:${DUR},afade=t=out:st=${DUR - 0.5}:d=0.5[aout]`);
    args.push('-map', '0:v:0', '-map', '[aout]');
  } else {
    console.error(`Audio tidak ditemukan: ${AUDIO} — encode tanpa suara`);
    args.push('-map', '0:v:0');
  }
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-r', String(FPS), '-frames:v', String(FRAME_COUNT));
  if (hasAudio) args.push('-c:a', 'aac', '-b:a', '128k');
  else args.push('-an');
  args.push('-t', String(DUR), '-movflags', '+faststart', OUT);
  console.log('encode:', OUT);
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,nb_frames',
    '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1', OUT], { encoding: 'utf8' });
  console.log(probe.stdout || '');
  console.log(`Selesai: ${OUT}`);
}

const existing = await prepare();
let todo = [];
for (let i = FRAME_START; i < FRAME_END; i++) if (!existing.has(`f_${String(i).padStart(4, '0')}.png`)) todo.push(i);
if (CHUNK_SIZE > 0) todo = todo.slice(0, CHUNK_SIZE);
if (todo.length > 0) {
  console.log(`Render ${todo.length} frame (RESUME: ${existing.size} sudah ada)`);
  await renderFrames(todo);
}
const after = await validFrames();
const missing = [];
for (let i = 0; i < FRAME_COUNT; i++) if (!after.has(`f_${String(i).padStart(4, '0')}.png`)) missing.push(i);
if (missing.length > 0) {
  console.log(`Chunk selesai. ${missing.length} frame tersisa. Jalankan lagi untuk melanjutkan.`);
} else {
  console.log(`Semua ${FRAME_COUNT} frame lengkap, encoding...`);
  encode();
}
