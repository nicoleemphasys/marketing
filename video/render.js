#!/usr/bin/env node
// Renders the loop with headless Chromium and pipes frames into ffmpeg.
//   node render.js video [--out out/file.mp4] [--from 0 --to 1799] [--scale 0.5] [--crf 18]
//   node render.js loopcheck            (frames 1740-1799 then 0-150)
//   node render.js stills 0,40,85       (PNG stills, no grain)
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const args = process.argv.slice(2);
const mode = args[0] || 'video';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const WORKERS = +opt('workers', 4);
const GRAIN = opt('grain', '4'); // ffmpeg temporal film grain (strength 0-100)

async function main() {
  let frames, out;
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  if (mode === 'stills') {
    frames = args[1].split(',').map(Number);
  } else if (mode === 'loopcheck') {
    frames = [...range(1740, 1799), ...range(0, 150)];
    out = opt('out', 'out/loop-check.mp4');
  } else {
    frames = range(+opt('from', 0), +opt('to', 1799));
    out = opt('out', 'out/emphasys-nahro-2026-loop.mp4');
  }

  const browser = await chromium.launch({ args: ['--disable-web-security', '--allow-file-access-from-files'] });
  const pages = await Promise.all(range(1, WORKERS).map(async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
    page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
    await page.goto('file://' + path.join(__dirname, 'index.html'));
    await page.waitForFunction(() => window.READY === true);
    return page;
  }));
  const grab = (page, f) => page.evaluate(n => {
    window.draw(n);
    return document.getElementById('c').toDataURL('image/png').split(',')[1];
  }, f).then(b64 => Buffer.from(b64, 'base64'));

  if (mode === 'stills') {
    fs.mkdirSync(path.join(__dirname, 'out/stills'), { recursive: true });
    await Promise.all(frames.map((f, i) => grab(pages[i % WORKERS], f).then(buf =>
      fs.writeFileSync(path.join(__dirname, `out/stills/frame${String(f).padStart(4, '0')}.png`), buf))));
    await browser.close();
    return;
  }

  const scale = +opt('scale', 1);
  const vf = [`noise=alls=${GRAIN}:allf=t`];
  if (scale !== 1) vf.push(`scale=${Math.round(1920 * scale / 2) * 2}:-2:flags=lanczos`);
  vf.push('format=yuv420p');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-vf', vf.join(','), '-an', '-c:v', 'libx264', '-preset', opt('preset', 'slow'), '-crf', opt('crf', '18'), '-maxrate', opt('maxrate', '14M'), '-bufsize', '28M',
    '-movflags', '+faststart', path.join(__dirname, out)], { stdio: ['pipe', 'inherit', 'inherit'] });

  // Render in parallel, write to ffmpeg in order.
  const done = new Map();
  let nextWrite = 0, nextJob = 0;
  const t0 = Date.now();
  async function worker(page) {
    while (nextJob < frames.length) {
      const i = nextJob++;
      done.set(i, await grab(page, frames[i]));
      while (done.has(nextWrite)) {
        const buf = done.get(nextWrite); done.delete(nextWrite);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        nextWrite++;
        if (nextWrite % 150 === 0) console.log(`${nextWrite}/${frames.length} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }
  }
  await Promise.all(pages.map(worker));
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('wrote', out);
}
function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
main().catch(e => { console.error(e); process.exit(1); });
