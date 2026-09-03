/** About — professional profile of the site's author, and the WebMCP tools. */
import { Router } from '../router';
import { makeArticleLevel } from './article';
import { describeTools, type ToolDocScope } from '../webmcp';
import { ABOUT_ME_HTML } from '../content/aboutMe';
// intrinsic sizes of the wall photos (regenerated with the WebP encodes) —
// lets each <img> declare width/height so the wall never layout-shifts
import PHOTO_DIMS from '../content/photo-dims.json';

/** Photography — the wall composes every photo in src/assets/photography/display
 *  (any extension, any case); the filename becomes the caption. Drop a
 *  web-ready file into the folder and it joins the wall on the next build.
 *  Full-resolution source photographs are intentionally not distributed. */
const PHOTOS: { src: string; caption: string; w?: number; h?: number }[] = Object.entries(
  import.meta.glob<string>('../assets/photography/display/*', { eager: true, import: 'default', query: '?url' }),
).map(([path, src]) => {
  const caption = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  const dims = (PHOTO_DIMS as Record<string, { w: number; h: number }>)[caption];
  return { src, caption, w: dims?.w, h: dims?.h };
});

const TOOL_GROUPS: { scope: ToolDocScope; title: string; note: string }[] = [
  { scope: 'global', title: 'GLOBAL', note: 'Registered throughout the site' },
  { scope: 'home', title: 'HOME WORLD', note: 'Registered only in Crepusculum Dream' },
  { scope: 'content', title: 'EVERY CONTENT PAGE', note: 'Redefined to match the mounted page' },
  { scope: 'projects', title: 'PROJECTS', note: 'Fluid-simulation data' },
  { scope: 'research', title: 'RESEARCH', note: 'Publication and citation data' },
  { scope: 'mods', title: 'MODS', note: 'Mod systems data and Workshop action' },
  { scope: 'zine', title: 'THE ZINE', note: 'Poetry and editorial content' },
  { scope: 'about', title: 'ABOUT', note: 'Photography data' },
];

export function makeAboutLevel(router: Router) {
  return makeArticleLevel(router, 'about', 'ABOUT', (inner) => {
    const tools = describeTools();
    inner.innerHTML = `
      <h1>About</h1>
      <p class="abstract">A little bit about me and this page. Have fun playing on my website!</p>
      <div class="rule"></div>

      <section id="about-me">
        <h2>ABOUT ME</h2>
        ${ABOUT_ME_HTML.map((p) => `<p>${p}</p>`).join('')}
      </section>

      <section>
        <h2>INTERESTS</h2>
        <p>
          Video games (as a player and an indie developer), poetry, board games, and photography.

          Here's <a href="#/zine">a zine I made for my modern poetry class</a>.
          Also, enjoy some of my photography below:
        </p>
        <div class="photo-grid">
          ${PHOTOS.map((ph) => `
          <figure class="photo-card${ph.w && ph.h && ph.w > ph.h ? ' landscape' : ''}">
            <img src="${ph.src}" alt="${ph.caption}" loading="lazy"${ph.w && ph.h ? ` width="${ph.w}" height="${ph.h}"` : ''}>
            <figcaption>${ph.caption}<span class="credit">© Yunhao Luo</span></figcaption>
          </figure>`).join('')}
        </div>
      </section>

      <section>
        <h2>WEBMCP INTERFACE</h2>
        <p>
          This portfolio is directly playable using keyboard, mouse, or touch controls. Through
          <b>WebMCP</b> (<a href="https://github.com/webmachinelearning/webmcp" target="_blank" rel="noopener">the Web Machine Learning proposal</a>),
          an agent can collaborate through that same live interface via <code>document.modelContext</code>.
          Tools move the on-screen character, use the real router, focus visible sections, create a clickable
          portfolio tour, and return structured data; they do not call a detached copy of the site.
          In accordance with the
          <a href="https://developer.chrome.com/docs/ai/webmcp/best-practices" target="_blank" rel="noopener">WebMCP best practices</a>,
          each tool is small and single-purpose:
        </p>
        <div class="webmcp-tour-feature">
          <div class="webmcp-feature-kicker">HUMAN–AGENT COLLABORATION</div>
          <h3><code>create-portfolio-tour</code></h3>
          <p>
            The agent turns a visitor's goal — recruiting, research collaboration, technical review,
            creative exploration, or the complete portfolio — into a visible route inside the page.
            The route is not merely returned as text: both participants see the same liquid-glass panel.
          </p>
          <ol class="webmcp-tour-flow">
            <li><b>Choose a goal</b><span>The agent selects a tour tailored to the visitor's intent.</span></li>
            <li><b>Share a route</b><span>The resulting stops appear in the visitor's live page UI.</span></li>
            <li><b>Browse together</b><span>A selected stop navigates the real site and focuses its relevant introduction or section.</span></li>
          </ol>
        </div>

        <p>
          The tool surface is <b>page-aware</b>. Five global tools remain available throughout the site;
          Home adds character and landmark controls; and each content page registers only the tools that
          can succeed there, removing them on departure.
          The shared names <code>get-page-overview</code> and <code>focus-page-section</code> are deliberately
          redefined on each content page with that page's own description, section enum, data, and visible effect.
        </p>

        <h3 class="webmcp-catalog-title">TOOL SURFACE BY SCOPE</h3>
        <div class="webmcp-tool-groups" aria-label="WebMCP tools by registration scope">
          ${TOOL_GROUPS.map((group) => {
            const scopedTools = tools.filter((tool) => tool.scope === group.scope);
            return `
              <div class="webmcp-tool-group webmcp-tool-group--${group.scope}">
                <h3>${group.title}</h3>
                <p class="webmcp-scope-note">${group.note}</p>
                <ul>
                  ${scopedTools.map((tool) => `<li><code>${tool.name}</code><span>${tool.summary}${tool.readOnly ? ' <em>(read-only)</em>' : ''}</span></li>`).join('')}
                </ul>
              </div>`;
          }).join('')}
        </div>

        <p>
          When either the visitor or agent navigates, the visible page, URL fragment, browser metadata,
          and registered tool surface change together. Both participants therefore share one page state
          instead of interacting through separate views.
        </p>
        <p><em>The indicator in the bottom-right corner reports whether a model-context host was detected on this page.</em></p>
      </section>
    `;
    // landscape shots hang as wide frames (see .photo-card.landscape in CSS).
    // Photos in the dims map are classified at render time above; this runtime
    // fallback covers a freshly dropped-in photo that has no dims entry yet
    inner.querySelectorAll<HTMLImageElement>('.photo-card:not(.landscape) img:not([width])').forEach((img) => {
      const mark = () => {
        if (img.naturalWidth > img.naturalHeight) img.closest('.photo-card')?.classList.add('landscape');
      };
      if (img.complete && img.naturalWidth > 0) mark();
      else img.addEventListener('load', mark, { once: true });
    });
  });
}
