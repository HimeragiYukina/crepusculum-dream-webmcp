/**
 * End-to-end WebMCP smoke test using the site's ?mockmcp host.
 *
 * This exercises the same tool definitions, router, DOM, and route-owned
 * AbortControllers as a native host, while remaining runnable in headless
 * Chrome where document.modelContext is otherwise unavailable.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}`;
const SITE = `${BASE}/crepusculum-dream-webmcp/`;
const EXPECTED = {
  home: ['list-site-pages', 'get-about-me', 'goto-site-page', 'set-language', 'create-portfolio-tour', 'walk-hero-to-landmark', 'get-hero-status'],
  projects: ['list-site-pages', 'get-about-me', 'goto-site-page', 'set-language', 'create-portfolio-tour', 'get-page-overview', 'focus-page-section', 'get-fluid-simulation'],
  research: ['list-site-pages', 'get-about-me', 'goto-site-page', 'set-language', 'create-portfolio-tour', 'get-page-overview', 'focus-page-section', 'get-publications', 'get-citation'],
  mods: ['list-site-pages', 'get-about-me', 'goto-site-page', 'set-language', 'create-portfolio-tour', 'get-page-overview', 'focus-page-section', 'get-mod-details', 'goto_workshop_page'],
  zine: ['list-site-pages', 'get-about-me', 'goto-site-page', 'set-language', 'create-portfolio-tour', 'get-page-overview', 'focus-page-section', 'read-zine-piece'],
  about: ['list-site-pages', 'get-about-me', 'goto-site-page', 'set-language', 'create-portfolio-tour', 'get-page-overview', 'focus-page-section', 'get-photography-captions'],
};

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
  if (!found) throw new Error('Google Chrome was not found. Install Chrome or update scripts/webmcp-smoke.mjs.');
  return found;
}

const server = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js',
  'preview',
  '--host', '127.0.0.1',
  '--port', String(PORT),
  '--strictPort',
], { stdio: 'ignore' });

let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(SITE);
      if (response.ok) break;
    } catch {
      // The preview server is still starting.
    }
    if (attempt >= 40) throw new Error('Vite preview did not start.');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log('preview ready');
  browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  console.log('browser launched');
  const page = await browser.newPage();
  console.log('page opened');
  page.setDefaultTimeout(5_000);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  // Content pages intentionally stream large video assets; the WebMCP surface
  // is ready at DOMContentLoaded and should not wait for media idleness.
  await page.goto(`${SITE}?mockmcp`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  console.log('page loaded');

  const names = () => page.evaluate(() => window.__mcp.tools.map((tool) => tool.name));
  const call = (name, params = {}) => page.evaluate(
    ({ toolName, toolParams }) => window.__mcp.call(toolName, toolParams),
    { toolName: name, toolParams: params },
  );
  const waitForToolCount = async (area) => {
    const count = EXPECTED[area].length;
    try {
      await page.waitForFunction((expected) => window.__mcp?.tools.length === expected, { timeout: 5_000 }, count);
    } catch {
      throw new Error(`${area} registered ${JSON.stringify(await names())}; expected ${JSON.stringify(EXPECTED[area])}`);
    }
  };
  const goToArea = async (area) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = await call('goto-site-page', { page: area });
      if (result.startsWith('Navigated') || result.startsWith('Already on')) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`goto-site-page could not reach ${area}`);
  };
  const assertRoute = async (area) => {
    const actual = await names();
    assert.deepEqual([...actual].sort(), [...EXPECTED[area]].sort(), `${area} tool surface drifted`);
    assert.equal(new Set(actual).size, actual.length, `${area} contains duplicate tool names`);
    const overview = area === 'home' ? null : await call('get-page-overview');
    if (overview) assert.ok(overview.length <= 1500, `${area} overview exceeds 1,500 characters`);
  };

  await waitForToolCount('home');
  await assertRoute('home');
  console.log('checked home');

  const biographyState = await page.evaluate(async () => {
    const before = {
      hash: location.hash,
      scrollY,
      focusEffects: document.querySelectorAll('.webmcp-focus, .about-flash').length,
    };
    const result = await window.__mcp.call('get-about-me');
    return {
      before,
      after: {
        hash: location.hash,
        scrollY,
        focusEffects: document.querySelectorAll('.webmcp-focus, .about-flash').length,
      },
      result,
    };
  });
  assert.deepEqual(biographyState.after, biographyState.before, 'get-about-me changed visible page state');
  assert.match(biographyState.result, /Yunhao Luo/);

  await call('create-portfolio-tour', { goal: 'technical-reviewer' });
  assert.equal((await page.$$('#portfolio-tour')).length, 1, 'portfolio tour was not rendered');
  assert.equal((await page.$$('#portfolio-tour .is-current')).length, 0, 'tour highlighted a stop while home is outside this route');
  console.log('checked visible tour');

  const results = { home: EXPECTED.home.length };
  const technicalTourPages = new Set(['projects', 'research', 'mods']);
  for (const area of ['projects', 'research', 'mods', 'zine', 'about']) {
    await goToArea(area);
    await waitForToolCount(area);
    await assertRoute(area);
    const highlightedTourPages = await page.$$eval(
      '#portfolio-tour button.is-current',
      (buttons) => buttons.map((button) => button.dataset.page),
    );
    assert.deepEqual(
      highlightedTourPages,
      technicalTourPages.has(area) ? [area] : [],
      `tour highlight did not follow WebMCP navigation to ${area}`,
    );
    results[area] = EXPECTED[area].length;
    console.log(`checked ${area}`);

    if (area === 'projects') {
      const details = await call('get-fluid-simulation');
      assert.ok(details.length <= 1500, 'get-fluid-simulation exceeds 1,500 characters');
      await call('focus-page-section', { section: 'system-capabilities' });
      assert.equal((await page.$$('.webmcp-focus')).length, 1, 'focused section has no visible effect');
    }
    if (area === 'research') {
      const citation = await call('get-citation');
      assert.match(citation, /^@inproceedings\{/);
      for (const field of ['author =', 'title =', 'year =', 'booktitle =', 'doi =']) assert.ok(citation.includes(field));
      assert.ok(citation.length <= 1500, 'BibTeX citation exceeds 1,500 characters');
    }
    if (area === 'zine') {
      const piece = await call('read-zine-piece', { piece: 'intro' });
      assert.ok(piece.length <= 1500, 'read-zine-piece exceeds 1,500 characters');
    }
  }

  const initialHighlightCases = [
    { area: 'projects', goal: 'technical-reviewer' },
    { area: 'research', goal: 'recruiter' },
    { area: 'mods', goal: 'recruiter' },
    { area: 'zine', goal: 'creative-explorer' },
    { area: 'about', goal: 'recruiter' },
  ];
  for (const { area, goal } of initialHighlightCases) {
    await goToArea(area);
    await waitForToolCount(area);
    await call('create-portfolio-tour', { goal });
    const highlightedTourPages = await page.$$eval(
      '#portfolio-tour button.is-current',
      (buttons) => buttons.map((button) => button.dataset.page),
    );
    assert.deepEqual(
      highlightedTourPages,
      [area],
      `${goal} tour created on ${area} did not initialize its current-page highlight`,
    );
  }
  console.log('checked initial tour highlights on every content page');

  const budgets = await page.evaluate(() => window.__mcp.tools.map((tool) => ({
    name: tool.name,
    nameLength: tool.name.length,
    descriptionLength: tool.description.length,
    parameterDescriptions: Object.values(tool.inputSchema?.properties ?? {})
      .map((property) => property.description?.length ?? 0),
  })));
  for (const tool of budgets) {
    assert.ok(tool.nameLength <= 30, `${tool.name} exceeds the 30-character name budget`);
    assert.ok(tool.descriptionLength <= 500, `${tool.name} exceeds the 500-character description budget`);
    assert.ok(tool.parameterDescriptions.every((length) => length <= 150), `${tool.name} exceeds a parameter-description budget`);
  }

  console.log(`WebMCP smoke test passed: ${Object.entries(results).map(([area, count]) => `${area}=${count}`).join(', ')}`);
} finally {
  await browser?.close();
  server.kill();
}
