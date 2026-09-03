/**
 * Lightweight i18n for the UI chrome (top bar, HUD, travel menu, banners'
 * buttons and landmark labels). English is the default; 中文 is offered via the
 * top-bar language switch. Long-form article prose stays in English for now.
 *
 * The chrome is built imperatively, so rather than re-mount a level on a
 * language change we tag every translatable node with `data-i18n` (a static
 * key) or `data-poi` (a landmark's id, translated from the POI table) and let
 * `refreshChrome()` rewrite them in place. The E-interaction prompt reads
 * `tPoi()` every frame, so it follows the language on its own.
 */
import { poiById, type POI } from './engine/world';

export type Lang = 'en' | 'zh';

/** Languages offered by the top-bar switch, in menu order: native name for
 *  the menu, short code for the switch badge, and the BCP 47 tag used for
 *  `lang` attributes (it drives the browser's CJK font fallback and screen
 *  reader pronunciation). */
export const LANGS: { id: Lang; label: string; short: string; htmlLang: string }[] = [
  { id: 'en', label: 'English', short: 'EN', htmlLang: 'en' },
  { id: 'zh', label: '中文', short: '中', htmlLang: 'zh-CN' },
];

/** BCP 47 tag for a language id (e.g. 'zh' → 'zh-CN'). */
export function htmlLangOf(l?: Lang): string {
  const id = l ?? lang;
  return LANGS.find((x) => x.id === id)?.htmlLang ?? id;
}

/** Short code for a language id, shown on the switch (e.g. 'EN', '中'). */
export function langShort(l?: Lang): string {
  const id = l ?? lang;
  return LANGS.find((x) => x.id === id)?.short ?? id.toUpperCase();
}

const KEY = 'site-lang';

function read(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'zh' || v === 'en') return v;
  } catch { /* storage may be blocked (private mode) */ }
  return 'en';
}

let lang: Lang = read();
const listeners = new Set<(l: Lang) => void>();

function applyDocLang(): void {
  document.documentElement.lang = htmlLangOf(lang);
}
applyDocLang();

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  applyDocLang();
  for (const cb of [...listeners]) cb(next);
}

export function toggleLang(): Lang {
  setLang(lang === 'en' ? 'zh' : 'en');
  return lang;
}

/** Subscribe to language changes; returns an unsubscribe function. */
export function onLangChange(cb: (l: Lang) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/* ---------------- static chrome strings ---------------- */

type Key =
  | 'title'
  | 'nav.home'
  | 'nav.more'
  | 'nav.menu'
  | 'settings.textSize'
  | 'hud.hint'
  | 'travel.title'
  | 'travel.flavor'
  | 'travel.return'
  | 'back';

const STRINGS: Record<Lang, Record<Key, string>> = {
  en: {
    'title': 'AI Researcher',
    'nav.home': 'Home',
    'nav.more': 'More',
    'nav.menu': 'Menu',
    'settings.textSize': 'Text size',
    'hud.hint': 'WASD / click to move · E to interact',
    'travel.title': 'Fast Travel',
    'travel.flavor': 'Rest a moment. Where will your curiosity take you?',
    'travel.return': 'RETURN TO THE DREAM',
    'back': '⟵ RETURN',
  },
  zh: {
    'title': 'AI 研究员',
    'nav.home': '主页',
    'nav.more': '更多',
    'nav.menu': '菜单',
    'settings.textSize': '字号',
    'hud.hint': 'WASD / 点击移动 · E 键交互',
    'travel.title': '快速旅行',
    'travel.flavor': '稍作休憩。好奇心将带你去往何方？',
    'travel.return': '返回梦境',
    'back': '⟵ 返回',
  },
};

export function t(key: Key): string {
  return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}

/* ---------------- landmark (POI) strings ---------------- */

type PoiField = 'label' | 'sub' | 'verb';

// keyed by POI id; the English side is the POI table itself (single source of
// truth), so only the 中文 overrides live here
const POI_ZH: Record<string, Record<PoiField, string>> = {
  bonfire: { label: '快速旅行', sub: '休憩，在各个区域间传送', verb: '休憩' },
  projects: { label: '项目', sub: '非学术项目', verb: '下降' },
  research: { label: '研究', sub: '我的研究项目与论文', verb: '进入' },
  mods: { label: '模组', sub: '我为游戏制作的模组', verb: '进入' },
  about: { label: '关于', sub: '关于我、本站及其 WebMCP 工具', verb: '查看' },
  zine: { label: '诗集', sub: '画架上的一本现代诗小志', verb: '翻阅' },
};

export function tPoi(poi: POI, field: PoiField): string {
  if (lang === 'zh') return POI_ZH[poi.id]?.[field] ?? poi[field];
  return poi[field];
}

/* ---------------- in-place refresh ---------------- */

/**
 * Rewrite every translatable node under `root` to the current language.
 * `data-i18n="<key>"` → static string; `data-poi="<id>"` (+ optional
 * `data-poi-field`, default "label") → landmark string.
 */
export function refreshChrome(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLElement>('[data-poi]').forEach((el) => {
    const field = (el.dataset.poiField as PoiField) || 'label';
    el.textContent = tPoi(poiById(el.dataset.poi!), field);
  });
}
