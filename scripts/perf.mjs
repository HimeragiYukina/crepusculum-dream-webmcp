/**
 * Local Lighthouse sweep: serves the production build (`vite preview`) and
 * audits every route sequentially, printing a score table. Full reports land
 * in tmp/lighthouse-<page>.report.{html,json} (tmp/ is gitignored).
 *
 * Run with `npm run perf` (which builds first). Requires Chrome installed;
 * the audits run headless. Scores vary a few points between runs — re-run
 * before trusting a small dip.
 *
 * The agentic-browsing category is included when the installed Lighthouse
 * provides it, BUT its WebMCP audits (webmcp-registered-tools /
 * webmcp-schema-validity) may report n/a here: headless Chrome exposes no
 * `document.modelContext`, so the page registers no tools for Lighthouse to
 * inspect; besides, the lighthouse CLI cannot pass in the WebMCP flags to Chrome yet.
 * To audit the WebMCP surface, test manually: open the site in a WebMCP-enabled Chrome
 * and run the DevTools Lighthouse panel.
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const PAGES = [
  { name: 'home', path: '/#/' },
  { name: 'projects', path: '/#/projects' },
  { name: 'research', path: '/#/research' },
  { name: 'mods', path: '/#/mods' },
  { name: 'zine', path: '/#/zine' },
  { name: 'about', path: '/#/about' },
];

mkdirSync('tmp', { recursive: true });

// serve dist/ — assumes `npm run build` already ran (the perf script chains it)
const spawn_string = `npx vite preview --port ${PORT} --strictPort`;
const server = spawn(spawn_string, {
  shell: true,
  stdio: 'ignore',
});
const stopServer = () => {
  if (process.platform === 'win32') {
    try { execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' }); } catch { /* already gone */ }
  } else {
    server.kill();
  }
};
process.on('exit', stopServer);
process.on('SIGINT', () => process.exit(130));

// wait for the server to answer
for (let i = 0; ; i++) {
  try {
    await fetch(BASE);
    break;
  } catch {
    if (i > 60) { console.error('preview server never came up'); process.exit(1); }
    await new Promise((r) => setTimeout(r, 250));
  }
}

const rows = [];
for (const { name, path } of PAGES) {
  process.stdout.write(`auditing ${name} ...`);
  const jsonPath = `tmp/lighthouse-${name}.report.json`;
  rmSync(jsonPath, { force: true }); // never read a stale report
  try {
    execSync(
      `npx lighthouse "${BASE}${path}" --preset=desktop --quiet ` +
        '--chrome-flags="--headless=new" --output=json --output=html ' +
        '--throttling-method=simulate --throttling.rttMs=150 ' +
        '--throttling.throughputKbps=1600 --throttling.cpuSlowdownMultiplier=4 ' +
        `--output-path=tmp/lighthouse-${name}`,
      { stdio: 'ignore' },
    );
  } catch {
    // lighthouse can exit non-zero AFTER writing the report (on Windows,
    // chrome-launcher often fails to delete its temp profile — EPERM);
    // the report on disk is what matters
    if (!existsSync(jsonPath)) throw new Error(`lighthouse failed for ${name}`);
  }
  const r = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const cat = (id) => (r.categories[id] ? Math.round(r.categories[id].score * 100) : '—');
  const m = r.audits.metrics?.details?.items?.[0] ?? {};
  rows.push({
    page: name,
    perf: cat('performance'),
    a11y: cat('accessibility'),
    bp: cat('best-practices'),
    seo: cat('seo'),
    agentic: cat('agentic-browsing'),
    lcp: `${((m.largestContentfulPaint ?? 0) / 1000).toFixed(1)}s`,
    cls: (m.cumulativeLayoutShift ?? 0).toFixed(3),
  });
  console.log(' done');
}

console.log('\npage      perf  a11y  bp    seo   agentic  LCP    CLS');
for (const r of rows) {
  console.log(
    `${r.page.padEnd(10)}${String(r.perf).padEnd(6)}${String(r.a11y).padEnd(6)}` +
      `${String(r.bp).padEnd(6)}${String(r.seo).padEnd(6)}${String(r.agentic).padEnd(9)}` +
      `${r.lcp.padEnd(7)}${r.cls}`,
  );
}
console.log('\nfull reports: tmp/lighthouse-<page>.report.html');
console.log(
  'note: the WebMCP audits inside agentic-browsing are n/a for headless — audit them\n' +
    'manually from the DevTools Lighthouse panel in a WebMCP-enabled Chrome.',
);

process.exit(0);
