/** Capture rights-safe social and Devpost images from the built site itself. */
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const SITE = process.env.SITE_URL ?? 'http://127.0.0.1:4175/crepusculum-dream-webmcp/';
const OUTPUT = 'submission-media';

function chromePath() {
  const candidates = process.platform === 'win32'
    ? [
        join(process.env.PROGRAMFILES ?? '', 'Google/Chrome/Application/chrome.exe'),
        join(process.env['PROGRAMFILES(X86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
        join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
      ]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error('Google Chrome was not found.');
  return found;
}

async function settle(page, selector = '#app') {
  await page.waitForSelector(selector);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
  });
  await new Promise((resolve) => setTimeout(resolve, 900));
}

let captureSequence = 0;

async function open(page, hash = '', mock = false) {
  // A hash-only page.goto is a same-document navigation. Give every capture a
  // unique query value so the deliberately frozen Home banner and visible tour
  // cannot leak into Research, Mods, and About screenshots.
  const suffix = `?${mock ? 'mockmcp&' : ''}capture=${++captureSequence}${hash}`;
  console.log(`Opening ${SITE}${suffix}`);
  await page.goto(`${SITE}${suffix}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  console.log(`Loaded ${SITE}${suffix}`);
  // The app intentionally begins behind a black fader, then clears it with a
  // 0.55 s transition after the requested level mounts. Wait for both states
  // so a capture can never land on a partially black frame.
  await page.waitForSelector('#fader.clear');
  await new Promise((resolve) => setTimeout(resolve, 600));
  await settle(page);
}

async function holdHomeBanner(page) {
  await page.waitForSelector('#banner');
  await page.evaluate(() => {
    const banner = document.querySelector('#banner');
    if (!(banner instanceof HTMLElement)) return;
    // The live banner intentionally fades after 2.4 s. Submission captures
    // freeze the same fully visible state so network/font timing cannot catch
    // an arbitrary point in its fade-out transition.
    banner.classList.add('show');
    banner.style.transition = 'none';
    banner.style.opacity = '1';
  });
}

await mkdir(OUTPUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: true,
  args: ['--no-first-run', '--no-default-browser-check'],
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(10_000);

  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await open(page, '', true);
  await page.waitForFunction(() => window.__mcp?.tools?.length === 7);
  await holdHomeBanner(page);
  await page.screenshot({ path: 'public/og-image.jpg', type: 'jpeg', quality: 90 });

  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  await open(page, '', true);
  await page.waitForFunction(() => window.__mcp?.tools?.length === 7);
  await holdHomeBanner(page);
  await page.screenshot({ path: `${OUTPUT}/thumbnail.png` });

  // Devpost recommends 3:2 gallery media; keep every gallery frame at
  // 1500 × 1000 so the carousel does not crop the page composition.
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 });
  await open(page, '', true);
  await page.waitForFunction(() => window.__mcp?.tools?.length === 7);
  await holdHomeBanner(page);
  await page.screenshot({ path: `${OUTPUT}/gallery-home.png` });

  await open(page, '', true);
  await page.waitForFunction(() => window.__mcp?.tools?.length === 7);
  await page.evaluate(() => window.__mcp.call('create-portfolio-tour', { goal: 'technical-reviewer' }));
  await settle(page, '#portfolio-tour');
  await holdHomeBanner(page);
  await page.screenshot({ path: `${OUTPUT}/gallery-tour.png` });

  await open(page, '#/research', true);
  await page.waitForFunction(() => window.__mcp?.tools?.length === 10);
  await page.screenshot({ path: `${OUTPUT}/gallery-research.png` });

  await open(page, '#/mods', true);
  await page.waitForFunction(() => window.__mcp?.tools?.length === 9);
  await page.screenshot({ path: `${OUTPUT}/gallery-mods.png` });

  await open(page, '#/about', true);
  await page.waitForFunction(() => window.__mcp?.tools?.length === 8);
  await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h2')]
      .find((element) => element.textContent?.trim() === 'WEBMCP INTERFACE');
    const scroller = document.querySelector('.article');
    if (!(heading instanceof HTMLElement) || !(scroller instanceof HTMLElement)) return;
    const topBarHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 100;
    const targetTop = heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      + scroller.scrollTop - topBarHeight - 24;
    scroller.scrollTo({ top: targetTop, left: 0 });
  });
  await new Promise((resolve) => setTimeout(resolve, 450));
  await page.screenshot({ path: `${OUTPUT}/gallery-webmcp-interface.png` });

  console.log(`Captured Open Graph image and Devpost media from ${SITE}`);
} finally {
  await browser.close();
}
