/** Shared scaffolding for article-style sub-levels (papers / mod / about). */
import { Level, Router } from '../router';
import { Backdrop } from '../engine/backdrop';
import { buildTopBar } from './topbar';
import { t } from '../i18n';

export function makeArticleLevel(
  router: Router,
  id: string,
  banner: string,
  render: (inner: HTMLElement) => void,
): Level {
  let rootEl: HTMLElement | null = null;
  let escHandler: ((e: KeyboardEvent) => void) | null = null;
  let backdrop: Backdrop | null = null;
  return {
    id,
    banner,
    mount(stage: HTMLElement) {
      // the main page's living horizon (sky, sun, sea — no peninsula) runs
      // behind the article; the scrolling content sits above it on a scrim
      backdrop = new Backdrop(stage);
      const root = document.createElement('div');
      // the level id doubles as a modifier class so pages can scope overrides
      root.className = `article ${id}`;
      const back = document.createElement('button');
      back.className = 'back-btn';
      back.dataset.i18n = 'back';
      back.textContent = t('back');
      back.addEventListener('click', () => void router.go('home'));
      const inner = document.createElement('div');
      inner.className = 'article-body';
      render(inner);
      // site-wide credit footer — copyright and the split code/content license
      const footer = document.createElement('footer');
      footer.className = 'site-footer';
      footer.innerHTML = `
        <span>© 2026 Yunhao Luo</span>
        <span>Code <a href="https://opensource.org/license/mit" target="_blank" rel="noopener">MIT</a> ·
          Content <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="_blank" rel="noopener">CC BY-NC-ND 4.0</a></span>
        <span>Competition edition · third-party source imagery omitted or redacted</span>
      `;
      inner.appendChild(footer);
      root.appendChild(inner);
      stage.appendChild(root);
      stage.appendChild(back);
      // shared top bar: identity, site map (current page inert) and links
      stage.appendChild(buildTopBar(router, id));
      rootEl = root;
      escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') void router.go('home');
      };
      window.addEventListener('keydown', escHandler);
    },
    unmount() {
      if (escHandler) window.removeEventListener('keydown', escHandler);
      escHandler = null;
      backdrop?.dispose();
      backdrop = null;
      rootEl = null;
    },
  };
}
