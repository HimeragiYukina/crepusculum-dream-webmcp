/**
 * Shared top bar — the main page's identity cluster (avatar, name and title,
 * social links) plus the site map, shown on every page. The site map derives
 * from the same POI data as the hub labels and travel menu; the current page
 * is rendered inert.
 */
import { Router } from '../router';
import { POIS } from '../engine/world';
import { t, tPoi, getLang, setLang, LANGS, langShort, htmlLangOf, onLangChange } from '../i18n';
import { revealAboutMe } from '../content/aboutMe';
// Competition-edition identicon used by the persistent top bar.
import avatarUrl from '../assets/site/avatar-pixel-medium-v2.png';

const GITHUB_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
const LINKEDIN_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0Z"/></svg>';

const FONT_SCALE_KEY = 'site-font-scale';
const FONT_SCALE_LEVELS = [0.8, 0.9, 1, 1.1, 1.2] as const;

function readFontScaleIndex(): number {
  try {
    const saved = Number(localStorage.getItem(FONT_SCALE_KEY));
    const index = FONT_SCALE_LEVELS.findIndex((level) => Math.abs(level - saved) < 0.001);
    if (index >= 0) return index;
  } catch { /* storage may be blocked */ }
  return FONT_SCALE_LEVELS.indexOf(1);
}

let fontScaleIndex = readFontScaleIndex();

function applyFontScale(): void {
  const scale = FONT_SCALE_LEVELS[fontScaleIndex];
  document.documentElement.style.setProperty('--font-scale', String(scale));
  try { localStorage.setItem(FONT_SCALE_KEY, String(scale)); } catch { /* ignore */ }
}

applyFontScale();

export function buildTopBar(router: Router, currentId: string): HTMLElement {
  const bar = document.createElement('header');
  bar.className = 'top-bar';
  // Home is a static label; the rest are landmark labels, translated from the
  // POI table — each carries the data-* hooks refreshChrome() rewrites on a
  // language change (data-i18n for Home, data-poi for the landmarks)
  const areas = [
    { id: 'home', href: '#/', label: t('nav.home'), i18n: 'nav.home' as const, poi: '' },
    ...POIS.filter((p) => p.action !== 'menu').map((p) => ({ id: p.action, href: `#/${p.action}`, label: tPoi(p, 'label'), i18n: '', poi: p.id })),
  ];
  const mapAttrs = (a: (typeof areas)[number]) => (a.poi ? `data-poi="${a.poi}"` : `data-i18n="${a.i18n}"`);
  bar.innerHTML = `
    <div class="tb-row tb-row1">
      <div class="tb-id">
        <img class="hud-avatar" src="${avatarUrl}" alt="Abstract pixel avatar of Yunhao Luo" title="Yunhao Luo · competition-edition pixel avatar">
        <div class="tb-name-fold"><div class="hud-name">YUNHAO LUO<small data-i18n="title">${t('title')}</small></div></div>
      </div>
      <nav class="tb-map" aria-label="site map">
        ${areas.map((a) => {
          // Home remains actionable while current so it can refresh the world;
          // other current-page landmarks stay inert.
          if (a.id === 'home') return `<a class="tb-map-item${currentId === 'home' ? ' here' : ''}" href="${a.href}" ${mapAttrs(a)}>${a.label}</a>`;
          return a.id === currentId
            ? `<span class="tb-map-item here" ${mapAttrs(a)}>${a.label}</span>`
            : `<a class="tb-map-item" href="${a.href}" ${mapAttrs(a)}>${a.label}</a>`;
        }).join('')}
        <div class="tb-more" data-more hidden>
          <button class="tb-more-btn" type="button" data-more-toggle aria-haspopup="menu" aria-expanded="false"><span data-i18n="nav.more">${t('nav.more')}</span></button>
          <div class="tb-more-menu" role="menu"></div>
        </div>
      </nav>
      <div class="tb-links">
        <a class="glass-icon github-link" href="https://github.com/HimeragiYukina" target="_blank" rel="noopener" aria-label="GitHub profile" title="GitHub profile">${GITHUB_SVG}</a>
        <a class="glass-icon linkedin-link" href="https://www.linkedin.com/in/yunhao-luo-853b16234/" target="_blank" rel="noopener" aria-label="LinkedIn profile" title="LinkedIn profile">${LINKEDIN_SVG}</a>
      </div>
      <div class="tb-settings">
        <div class="lang-select" data-lang-select>
          <button class="glass-icon lang-btn" type="button" data-lang-toggle aria-haspopup="menu" aria-expanded="false" aria-label="${langShort()} — select language / 选择语言" title="Language / 语言"><span class="lang-glyph" aria-hidden="true">文/A</span><span class="lang-code" data-lang-code lang="${htmlLangOf()}">${langShort()}</span></button>
          <div class="lang-menu" role="menu">
            ${
              // each option is tagged with its own language: without it, Chinese
              // text inside an English page skips the generic-serif mapping and
              // lands on the browser's per-script sans fallback (and a screen
              // reader would read 中文 with an English voice)
              LANGS.map((l) => `<button class="lang-opt" type="button" role="menuitemradio" lang="${l.htmlLang}" data-lang="${l.id}">${l.label}</button>`).join('')
            }
            <div class="lang-font-fold" role="group" aria-label="Text size / 字号">
              <span class="font-size-label" data-i18n="settings.textSize">${t('settings.textSize')}</span>
              <div class="font-size-actions">
                <button class="font-size-btn font-size-small" type="button" role="menuitem" data-folded-font-decrease aria-label="Decrease text size / 缩小字号">A</button>
                <button class="font-size-btn font-size-large" type="button" role="menuitem" data-folded-font-increase aria-label="Increase text size / 增大字号">A</button>
              </div>
            </div>
          </div>
        </div>
        <div class="font-select" data-font-select>
          <button class="glass-icon font-trigger" type="button" data-font-toggle aria-haspopup="dialog" aria-expanded="false" aria-label="Text size / 字号" title="Text size / 字号"><span aria-hidden="true">Aa</span></button>
          <div class="font-menu" role="dialog" aria-label="Text size / 字号">
            <span class="font-size-label" data-i18n="settings.textSize">${t('settings.textSize')}</span>
            <div class="font-size-actions" role="group" aria-label="Text size / 字号">
              <button class="font-size-btn font-size-small" type="button" data-font-decrease aria-label="Decrease text size / 缩小字号">A</button>
              <button class="font-size-btn font-size-large" type="button" data-font-increase aria-label="Increase text size / 增大字号">A</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="tb-row tb-row2" hidden></div>
  `;
  /**
   * Wire a glass dropdown: the toggle opens/closes it, and it dismisses on an
   * outside click or Escape. The document listeners self-remove once the bar
   * (rebuilt per page) leaves the DOM, so nothing leaks across navigations.
   */
  const wireDropdown = (container: HTMLElement, toggleBtn: HTMLElement, onOpen?: () => void) => {
    const setOpen = (o: boolean) => {
      if (o) onOpen?.();
      container.classList.toggle('open', o);
      toggleBtn.setAttribute('aria-expanded', String(o));
    };
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!container.classList.contains('open'));
    });
    const onDoc = (e: Event) => {
      if (!bar.isConnected) return document.removeEventListener('pointerdown', onDoc);
      if (!container.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!bar.isConnected) return document.removeEventListener('keydown', onKey);
      if (e.key === 'Escape' && container.classList.contains('open')) {
        setOpen(false);
        toggleBtn.focus();
      }
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return { close: () => setOpen(false) };
  };

  // language dropdown: the globe toggles a glass menu; a choice sets the
  // language (refreshChrome then rewrites the chrome in place)
  const select = bar.querySelector<HTMLElement>('[data-lang-select]')!;
  const code = select.querySelector<HTMLElement>('[data-lang-code]')!;
  const langToggle = select.querySelector<HTMLElement>('[data-lang-toggle]')!;
  const markActive = () =>
    select.querySelectorAll<HTMLElement>('.lang-opt').forEach((o) => {
      const on = o.dataset.lang === getLang();
      o.classList.toggle('active', on);
      o.setAttribute('aria-checked', String(on));
    });
  const lang = wireDropdown(select, langToggle, () => {
    markActive();
    updateFontControls();
  });
  const fontSelect = bar.querySelector<HTMLElement>('[data-font-select]')!;
  const fontToggle = fontSelect.querySelector<HTMLElement>('[data-font-toggle]')!;
  const fontDecrease = fontSelect.querySelector<HTMLButtonElement>('[data-font-decrease]')!;
  const fontIncrease = fontSelect.querySelector<HTMLButtonElement>('[data-font-increase]')!;
  const foldedFontDecrease = select.querySelector<HTMLButtonElement>('[data-folded-font-decrease]')!;
  const foldedFontIncrease = select.querySelector<HTMLButtonElement>('[data-folded-font-increase]')!;
  const updateFontControls = () => {
    [fontDecrease, foldedFontDecrease].forEach((button) => {
      button.disabled = fontScaleIndex === 0;
    });
    [fontIncrease, foldedFontIncrease].forEach((button) => {
      button.disabled = fontScaleIndex === FONT_SCALE_LEVELS.length - 1;
    });
  };
  const setFontScale = (index: number) => {
    fontScaleIndex = Math.max(0, Math.min(FONT_SCALE_LEVELS.length - 1, index));
    applyFontScale();
    updateFontControls();
    requestAnimationFrame(layoutMap);
  };
  const font = wireDropdown(fontSelect, fontToggle, () => {
    updateFontControls();
    requestAnimationFrame(() => fontDecrease.focus());
  });
  fontDecrease.addEventListener('click', () => setFontScale(fontScaleIndex - 1));
  fontIncrease.addEventListener('click', () => setFontScale(fontScaleIndex + 1));
  foldedFontDecrease.addEventListener('click', () => setFontScale(fontScaleIndex - 1));
  foldedFontIncrease.addEventListener('click', () => setFontScale(fontScaleIndex + 1));
  updateFontControls();
  select.querySelectorAll<HTMLElement>('.lang-opt').forEach((o) =>
    o.addEventListener('click', () => {
      setLang(o.dataset.lang as ReturnType<typeof getLang>);
      code.textContent = langShort();
      code.setAttribute('lang', htmlLangOf()); // 中 renders with the CJK serif fallback
      // the accessible name must keep containing the visible code (a11y:
      // label-content-name-mismatch)
      langToggle.setAttribute('aria-label', `${langShort()} — select language / 选择语言`);
      lang.close();
    }),
  );
  markActive();

  // site-map "More" dropdown: overflowing nav items collapse into it
  const map = bar.querySelector<HTMLElement>('.tb-map')!;
  const more = bar.querySelector<HTMLElement>('.tb-more')!;
  const moreMenu = more.querySelector<HTMLElement>('.tb-more-menu')!;
  const moreLabel = more.querySelector<HTMLElement>('.tb-more-btn [data-i18n]')!;
  const items = [...map.querySelectorAll<HTMLElement>('.tb-map-item')]; // fixed order
  const homeItem = items[0];
  const moreDd = wireDropdown(more, more.querySelector<HTMLElement>('[data-more-toggle]')!);
  items.forEach((it) => it.addEventListener('click', () => moreDd.close()));
  const activateHome = (event?: Event) => {
    event?.preventDefault();
    if (currentId === 'home') {
      window.location.reload();
    } else {
      void router.go('home');
    }
  };
  homeItem.addEventListener('click', activateHome);

  /**
   * Responsive top-bar layout in six stages of narrowing. The site map is
   * always a single line (overflow collapses into the inline More menu):
   *   1. one row:      id · map · social links · settings
   *   2. map drops:    id · social links · settings   /   map
   *   3. links drop:   id · settings                  /   social links · map
   *   4. language button loses its code (globe icon only)
   *   5. the font-size control folds away if the remaining gap is too narrow
   *   6. the identity capsule shrinks 20%
   * Each stage triggers only when the previous row can't fit comfortably.
   */
  const row1 = bar.querySelector<HTMLElement>('.tb-row1')!;
  const row2 = bar.querySelector<HTMLElement>('.tb-row2')!;
  const idEl = bar.querySelector<HTMLElement>('.tb-id')!;
  const linksEl = bar.querySelector<HTMLElement>('.tb-links')!;
  const settingsEl = bar.querySelector<HTMLElement>('.tb-settings')!;
  const layoutMap = () => {
    moreDd.close();
    font.close();
    // on scrolling pages, publish the scrollbar's width so the bar's right
    // padding keeps the language switch clear of it (see .top-bar in CSS);
    // set before measuring so the staged layout sees the narrowed row
    const scroller = document.querySelector<HTMLElement>('.article');
    const sbW = scroller ? scroller.offsetWidth - scroller.clientWidth : 0;
    bar.style.setProperty('--sb-w', `${sbW}px`);
    const restoreInline = () => {
      more.hidden = true;
      items.forEach((it) => map.insertBefore(it, more)); // all items inline, in order
    };
    // Collapse trailing items into More until the map fits its row share. If
    // Home + More alone still do not fit, compact Home to a house glyph before
    // falling back to a single Menu button.
    const collapseToFit = () => {
      more.hidden = false; // reveal so its width counts toward the fit
      for (let i = items.length - 1; i >= 1 && map.scrollWidth > map.clientWidth; i--) {
        moreMenu.insertBefore(items[i], moreMenu.firstChild); // keep order in the menu
      }
      if (map.scrollWidth > map.clientWidth) bar.classList.add('home-compact');
      if (map.scrollWidth > map.clientWidth) {
        bar.classList.remove('home-compact'); // retain the Home text inside Menu
        moreMenu.insertBefore(homeItem, moreMenu.firstChild);
      }
      if (moreMenu.childElementCount === 0) more.hidden = true;
      // when every nav item has collapsed inside, the button IS the whole menu,
      // so it reads "Menu"; otherwise it's the overflow "More". Keep data-i18n
      // in sync so a language switch relabels it correctly.
      const key = moreMenu.childElementCount === items.length ? 'nav.menu' : 'nav.more';
      moreLabel.dataset.i18n = key;
      moreLabel.textContent = t(key);
    };

    // reset to stage 1: everything back on row 1, language code visible, and
    // the identity capsule at full size
    bar.classList.remove('map-stacked', 'links-stacked', 'home-compact', 'lang-compact', 'font-folded', 'id-shrunk');
    row1.insertBefore(linksEl, settingsEl);
    row1.insertBefore(map, linksEl);
    row2.hidden = true;
    restoreInline();

    const gap = parseFloat(getComputedStyle(row1).columnGap) || 10;
    const COMFORT = 12;
    const avail = row1.clientWidth;
    // rect widths, not offsetWidth: the shrunk capsule is zoomed, and only the
    // rect reflects its true footprint in the row
    const w = (el: HTMLElement) => el.getBoundingClientRect().width;
    // the map's minimal single-line form: its first tab + the More button
    more.hidden = false;
    const mapMin = w(items[0]) + w(more) + gap;
    more.hidden = true;

    const done = () => {
      collapseToFit();
      // publish the bar's height so content can clear it (the area banner
      // and article bodies read --topbar-h; it grows as rows stack). Article
      // padding lives inside a zoomed coordinate system, so also publish the
      // equivalent unzoomed offset using the body's current computed zoom.
      const barHeight = bar.offsetHeight;
      document.documentElement.style.setProperty('--topbar-h', `${barHeight}px`);
      const articleBody = document.querySelector<HTMLElement>('.article-body');
      if (articleBody) {
        const articleZoom = parseFloat(getComputedStyle(articleBody).zoom) || 1;
        document.documentElement.style.setProperty('--article-topbar-offset', `${barHeight / articleZoom}px`);
      }
    };

    // stage 1: id + minimal map + links + language all fit comfortably?
    if (w(idEl) + mapMin + w(linksEl) + w(settingsEl) + gap * 3 + COMFORT <= avail) {
      done();
      return;
    }

    // stage 2: the map gets its own row below
    bar.classList.add('map-stacked');
    row2.hidden = false;
    row2.appendChild(map);
    if (w(idEl) + w(linksEl) + w(settingsEl) + gap * 2 + COMFORT <= avail) {
      done();
      return;
    }

    // stage 3: the social links join the map's row, to its left
    bar.classList.add('links-stacked');
    row2.insertBefore(linksEl, map);
    // stage 4: even id + language (with code) can't fit → icon-only globe
    if (w(idEl) + w(settingsEl) + gap + COMFORT > avail) {
      bar.classList.add('lang-compact');
      const controlGap = parseFloat(getComputedStyle(settingsEl).columnGap) || gap;
      // stage 5: preserve at least the same gap used between the utility
      // controls; fold Aa away rather than compressing the identity capsule
      if (avail - w(idEl) - w(settingsEl) < controlGap) {
        bar.classList.add('font-folded');
      }
      // stage 6: if the identity and compact language control still cannot
      // coexist, shrink the capsule without ever folding away its text
      if (w(idEl) + w(settingsEl) + controlGap > avail) {
        bar.classList.add('id-shrunk');
      }
    }
    done();
  };

  // The avatar returns home, or refreshes the world when already there.
  bar.querySelector<HTMLElement>('.hud-avatar')?.addEventListener('click', () => {
    activateHome();
  });

  // clicking the name / title goes to the About page — or, when already
  // there, scrolls to its "About Me" section
  const nameEl = bar.querySelector<HTMLElement>('.hud-name');
  if (nameEl) {
    nameEl.style.cursor = 'pointer';
    nameEl.addEventListener('click', () => {
      if (currentId === 'about') {
        revealAboutMe();
      } else {
        void router.go('about');
      }
    });
  }

  // re-layout when the bar's width changes (fires once on observe → initial
  // layout) and when a language switch rewrites the labels; both self-clean
  let lastW = -1;
  const ro = new ResizeObserver(() => {
    if (!bar.isConnected) return ro.disconnect();
    const w = bar.clientWidth;
    if (w === lastW) return; // ignore height-only changes (e.g. our own stacking)
    lastW = w;
    layoutMap();
  });
  ro.observe(bar);
  // belt and suspenders: the observer can miss window-driven resizes while the
  // canvas beneath is re-fitting, so also re-layout on window resize
  let resizeRaf = 0;
  const onWinResize = () => {
    if (!bar.isConnected) return window.removeEventListener('resize', onWinResize);
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      lastW = bar.clientWidth;
      layoutMap();
    });
  };
  window.addEventListener('resize', onWinResize);
  const offLang = onLangChange(() => {
    if (!bar.isConnected) return offLang();
    requestAnimationFrame(layoutMap); // after refreshChrome has rewritten labels
  });
  // the initial layout may measure with fallback fonts; re-run once the real
  // display fonts arrive (their metrics are wider)
  void document.fonts.ready.then(() => {
    if (bar.isConnected) layoutMap();
  });

  return bar;
}
