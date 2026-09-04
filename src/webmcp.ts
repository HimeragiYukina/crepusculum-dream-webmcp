/**
 * WebMCP integration — https://github.com/webmachinelearning/webmcp
 *
 * Registers well-scoped tools on `document.modelContext` (with the deprecated
 * `navigator.modelContext` as fallback) so agents can operate the key elements
 * of this site: travel between areas, walk the hero, rest at the bonfire, and
 * read the publications.
 *
 * Following the WebMCP tool-authoring core contract:
 *  - each tool does exactly one thing, named with precise verbs
 *  - enums and ranges are declared in the schema; code still validates strictly
 *  - read-only tools carry `annotations.readOnlyHint`
 *  - tools register only in page states where they can succeed, and
 *    unregister (AbortController) when the state changes:
 *      · global: list-site-pages, get-about-me, goto-site-page, set-language,
 *        create-portfolio-tour
 *      · home only: walk-hero-to-landmark, get-hero-status
 *      · every article page: get-page-overview, focus-page-section (the same
 *        names are re-registered with page-specific descriptions and schemas)
 *      · projects only: get-fluid-simulation
 *      · research only: get-publications, get-citation
 *      · mods only: get-mod-details, goto_workshop_page
 *      · zine only: read-zine-piece
 *      · about only: get-photography-captions
 */
import type { Router } from './router';
import type { HomeLevel } from './levels/home';
import { BIBTEX } from './levels/papers';
import { STEAM_URL } from './levels/mod';
import { POIS } from './engine/world';
import { ABOUT_ME_TEXT } from './content/aboutMe';
import { LANGS, getLang, setLang, type Lang } from './i18n';

interface ToolExecuteOptions {
  signal?: AbortSignal;
}
interface ToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}
interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (params: any, options?: ToolExecuteOptions) => Promise<string | null> | string | null;
  annotations?: ToolAnnotations;
}
interface ModelContext {
  registerTool(tool: ToolDefinition, options?: { signal?: AbortSignal; exposedTo?: string[] }): void | Promise<void>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
  interface Navigator {
    modelContext?: ModelContext;
  }
}

function getModelContext(): ModelContext | null {
  // prefer the modern surface; return before ever touching the deprecated one
  if (document.modelContext) return document.modelContext;
  // navigator.modelContext is a deprecated alias whose GETTER logs a console
  // deprecation on any read (Lighthouse flags it) — so probe with `in` first
  // and only read it when it is genuinely the sole surface available
  if ('modelContext' in navigator) {
    return navigator.modelContext ?? null;
  }
  return null;
}

// area and landmark vocabularies derive from the home POIs — the same data the
// page renders (labels, subtitles, travel menu) — so the tool surface can
// never drift from what the user sees
const AREAS = ['home', ...POIS.filter((p) => p.action !== 'menu').map((p) => p.action)];
const LANDMARKS = POIS.map((p) => p.id);

type ArticleArea = 'projects' | 'research' | 'mods' | 'zine' | 'about';
interface PageSection {
  id: string;
  heading: string;
  description: string;
}
interface PageContext {
  label: string;
  sections: readonly PageSection[];
}

type TourGoal = 'recruiter' | 'research-collaborator' | 'technical-reviewer' | 'creative-explorer' | 'complete-tour';
interface TourStep {
  page: 'home' | ArticleArea;
  section?: string;
  label: string;
  reason: string;
}
interface TourPlan {
  title: string;
  introduction: string;
  steps: readonly TourStep[];
}

const PAGE_CONTEXTS: Record<ArticleArea, PageContext> = {
  projects: {
    label: 'Projects / Fluid Simulation',
    sections: [
      { id: 'overview', heading: 'Fluid Simulation', description: 'project summary' },
      { id: 'test-scenes', heading: 'TEST SCENES', description: 'six recorded simulation scenarios' },
      { id: 'system-capabilities', heading: 'SYSTEM CAPABILITIES', description: 'solver, rendering, boundaries, and platform support' },
      { id: 'experiment-setup', heading: 'EXPERIMENT SETUP', description: 'hardware used for the captured tests' },
      { id: 'references', heading: 'REFERENCES', description: 'technical references' },
    ],
  },
  research: {
    label: 'Research',
    sections: [
      { id: 'overview', heading: 'Research', description: 'publication overview and links' },
      { id: 'cite', heading: 'CITE', description: 'BibTeX citation' },
      { id: 'collaboration', heading: 'COLLABORATION', description: 'collaboration statement' },
    ],
  },
  mods: {
    label: 'Deck-Building Character Mod',
    sections: [
      { id: 'overview', heading: 'Deck-Building Character Mod', description: 'playable mod overview, redacted gallery, and links' },
      { id: 'workshop', heading: 'PLAYABLE BUILD', description: 'Workshop and source links' },
      { id: 'mechanic', heading: 'THE MECHANIC — NERVOUS IMPAIRMENT', description: 'the core risk-reward mechanic' },
      { id: 'cards', heading: 'FEATURED CARDS', description: 'six representative cards' },
      { id: 'pool', heading: 'THE CARD POOL', description: 'card-pool composition' },
      { id: 'relics', heading: 'NOTABLE RELICS', description: 'three representative relics' },
      { id: 'copyright', heading: 'COMPETITION ASSET POLICY', description: 'rights-safe asset treatment' },
    ],
  },
  zine: {
    label: 'The Zine / experimental Poetry',
    sections: [
      { id: 'overview', heading: 'experimental Poetry', description: 'zine cover and introduction' },
      { id: 'intro', heading: 'Intro', description: 'welcome to the zine' },
      { id: 'sweet-dreamer', heading: 'Sweet Dreamer', description: 'poem' },
      { id: 'compress-the-world', heading: 'Compress the World!', description: 'poem' },
      { id: 'stars', heading: 'Stars', description: 'poem' },
      { id: 'behavior-tree', heading: 'Behavior Tree During the COVID-19 Pandemic', description: 'interactive-structure poem' },
      { id: 'postscript', heading: 'Postscript', description: 'author reflection' },
      { id: 'works-cited', heading: 'Works Cited', description: 'sources and attributions' },
    ],
  },
  about: {
    label: 'About',
    sections: [
      { id: 'overview', heading: 'About', description: 'page introduction' },
      { id: 'about-me', heading: 'ABOUT ME', description: 'professional biography' },
      { id: 'interests', heading: 'INTERESTS', description: 'interests and photography' },
      { id: 'webmcp-interface', heading: 'WEBMCP INTERFACE', description: 'the site’s agent-facing tools' },
    ],
  },
};

const TOUR_PLANS: Record<TourGoal, TourPlan> = {
  recruiter: {
    title: 'Recruiter tour',
    introduction: 'A concise route through Yunhao’s background, engineering work, and research.',
    steps: [
      { page: 'about', section: 'about-me', label: 'Meet Yunhao', reason: 'Current role, background, and research direction' },
      { page: 'projects', section: 'system-capabilities', label: 'Review technical work', reason: 'GPU simulation and real-time systems experience' },
      { page: 'research', section: 'overview', label: 'See published research', reason: 'First-author work and recognition' },
      { page: 'mods', section: 'overview', label: 'See a shipped creative project', reason: 'Product scope, systems design, and community use' },
    ],
  },
  'research-collaborator': {
    title: 'Research collaboration tour',
    introduction: 'A route through research results, collaboration interests, and related technical foundations.',
    steps: [
      { page: 'research', section: 'overview', label: 'Read the publication', reason: 'Research topic, methods, publication details, and award' },
      { page: 'research', section: 'collaboration', label: 'Explore collaboration', reason: 'Current questions and collaboration direction' },
      { page: 'projects', section: 'overview', label: 'Inspect applied research', reason: 'Real-time GPU fluid simulation work' },
      { page: 'about', section: 'about-me', label: 'Review the biography', reason: 'Research trajectory and current focus' },
    ],
  },
  'technical-reviewer': {
    title: 'Technical reviewer tour',
    introduction: 'A systems-focused route through implementation details, evidence, and design depth.',
    steps: [
      { page: 'projects', section: 'overview', label: 'Start with the simulator', reason: 'Project scope and recorded test scenes' },
      { page: 'projects', section: 'system-capabilities', label: 'Inspect capabilities', reason: 'Solver, rendering, boundary, and platform details' },
      { page: 'research', section: 'overview', label: 'Review the research', reason: 'Physics-based control and publication evidence' },
      { page: 'mods', section: 'mechanic', label: 'Study a game system', reason: 'A complete risk-reward mechanic in a shipped mod' },
    ],
  },
  'creative-explorer': {
    title: 'Creative explorer tour',
    introduction: 'A route through the explorable world, writing, game design, and photography.',
    steps: [
      { page: 'home', label: 'Explore the dusk world', reason: 'Walk the shared HD-2D portfolio map' },
      { page: 'zine', section: 'sweet-dreamer', label: 'Read the zine', reason: 'Experimental poetry and interactive form' },
      { page: 'mods', section: 'mechanic', label: 'Explore mod systems', reason: 'Cards, relics, and original mechanics' },
      { page: 'about', section: 'interests', label: 'Browse photography', reason: 'Interests and images beyond the technical work' },
    ],
  },
  'complete-tour': {
    title: 'Complete portfolio tour',
    introduction: 'A six-stop route across every area of the portfolio.',
    steps: [
      { page: 'home', label: 'Home world', reason: 'Learn the map and navigation metaphor' },
      { page: 'projects', section: 'overview', label: 'Projects', reason: 'Real-time GPU fluid simulation' },
      { page: 'research', section: 'overview', label: 'Research', reason: 'Publication and collaboration' },
      { page: 'mods', section: 'overview', label: 'Mods', reason: 'A complete deck-building character system' },
      { page: 'zine', section: 'intro', label: 'The Zine', reason: 'Experimental poetry' },
      { page: 'about', section: 'about-me', label: 'About', reason: 'Biography, interests, and photography' },
    ],
  },
};

const PAGE_SCOPED_NAMES = new Set([
  'get-page-overview',
  'focus-page-section',
  'get-fluid-simulation',
  'get-publications',
  'get-citation',
  'get-mod-details',
  'goto_workshop_page',
  'read-zine-piece',
  'get-photography-captions',
]);

let ctxRef: { router: Router; home: HomeLevel } | null = null;
let mc: ModelContext | null = null;
let homeAbort: AbortController | null = null;
let articleAbort: AbortController | null = null;
let articleArea: ArticleArea | null = null;
let registeredNames: string[] = [];

export type ToolDocScope = 'global' | 'home' | 'content' | ArticleArea;

export interface ToolDoc {
  name: string;
  summary: string;
  readOnly: boolean;
  scope: ToolDocScope;
}

/** Static tool metadata for the About page (kept in sync with registration below). */
export function describeTools(): ToolDoc[] {
  return [
    { name: 'list-site-pages', summary: 'lists every page of the site and how to reach it', readOnly: true, scope: 'global' },
    { name: 'get-about-me', summary: "returns the author's short biography", readOnly: true, scope: 'global' },
    { name: 'goto-site-page', summary: `jumps to a page (${AREAS.join(', ')}) — like resting at the bonfire`, readOnly: false, scope: 'global' },
    { name: 'set-language', summary: `switches the UI language (${LANGS.map((l) => l.id).join(', ')})`, readOnly: false, scope: 'global' },
    { name: 'create-portfolio-tour', summary: 'creates a visible, goal-specific route that the visitor and agent can follow together', readOnly: false, scope: 'global' },
    { name: 'walk-hero-to-landmark', summary: 'walks the pixel hero to a landmark and optionally interacts with it', readOnly: false, scope: 'home' },
    { name: 'get-hero-status', summary: 'reports where the hero stands and what is nearby', readOnly: true, scope: 'home' },
    { name: 'get-page-overview', summary: 'returns the active content as structured JSON', readOnly: true, scope: 'content' },
    { name: 'focus-page-section', summary: 'scrolls to and highlights a section', readOnly: false, scope: 'content' },
    { name: 'get-fluid-simulation', summary: 'returns test scenes and technical capabilities for the fluid simulator', readOnly: true, scope: 'projects' },
    { name: 'get-publications', summary: 'returns first-author publications as structured JSON', readOnly: true, scope: 'research' },
    { name: 'get-citation', summary: 'returns the complete BibTeX citation without copying it', readOnly: true, scope: 'research' },
    { name: 'get-mod-details', summary: 'returns mod statistics, mechanics, and featured cards', readOnly: true, scope: 'mods' },
    { name: 'goto_workshop_page', summary: 'opens the linked Steam Workshop listing', readOnly: false, scope: 'mods' },
    { name: 'read-zine-piece', summary: 'returns one poem or editorial section by id', readOnly: true, scope: 'zine' },
    { name: 'get-photography-captions', summary: 'lists the titles of Yunhao Luo’s portfolio photographs', readOnly: true, scope: 'about' },
  ];
}

function createPortfolioTour(goal: TourGoal, router: Router): string {
  const plan = TOUR_PLANS[goal];
  document.getElementById('portfolio-tour')?.remove();

  const panel = document.createElement('aside');
  panel.id = 'portfolio-tour';
  panel.setAttribute('aria-label', plan.title);

  const header = document.createElement('header');
  const headingGroup = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'tour-eyebrow';
  eyebrow.textContent = '✦ Agent-created route';
  const title = document.createElement('h2');
  title.textContent = plan.title;
  headingGroup.append(eyebrow, title);
  const close = document.createElement('button');
  close.className = 'tour-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close portfolio tour');
  close.addEventListener('click', () => panel.remove());
  header.append(headingGroup, close);

  const introduction = document.createElement('p');
  introduction.className = 'tour-intro';
  introduction.textContent = plan.introduction;
  const list = document.createElement('ol');
  const status = document.createElement('p');
  status.className = 'tour-status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = `Shared page: ${router.current?.id ?? 'home'}. Choose a stop to continue.`;

  const buttons: HTMLButtonElement[] = [];
  let markedCurrentPage = false;
  for (const [index, step] of plan.steps.entries()) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span class="tour-number">${index + 1}</span><span><strong>${step.label}</strong><small>${step.reason}</small></span>`;
    if (!markedCurrentPage && router.current?.id === step.page) {
      button.classList.add('is-current');
      markedCurrentPage = true;
    }
    button.addEventListener('click', async () => {
      status.textContent = `Opening ${step.label}…`;
      const currentPage = router.current?.id ?? 'home';
      const arrivingOnNewPage = currentPage !== step.page;
      if (arrivingOnNewPage) {
        const moved = await router.go(step.page);
        if (!moved && router.current?.id !== step.page) {
          status.textContent = 'The page is already transitioning. Try this stop again in a moment.';
          return;
        }
      }
      buttons.forEach((candidate) => candidate.classList.remove('is-current'));
      button.classList.add('is-current');
      if (step.page !== 'home') {
        // Give a newly arrived visitor the page's own introduction before
        // jumping deeper. Selecting the stop again focuses its exact section.
        focusPageSection(step.page, arrivingOnNewPage ? 'overview' : (step.section ?? 'overview'));
      }
      status.textContent = arrivingOnNewPage && step.page !== 'home'
        ? `Arrived at ${step.label} with the page introduction in view. Select this stop again to focus its section.`
        : `Now sharing ${step.label}. The visitor and agent are on the same page state.`;
    });
    buttons.push(button);
    item.appendChild(button);
    list.appendChild(item);
  }

  panel.append(header, introduction, list, status);
  document.getElementById('app')?.appendChild(panel);
  return `Created the visible ${plan.title} with ${plan.steps.length} stops: ${plan.steps.map((step) => step.label).join(' → ')}. The visitor can select any stop in the shared page UI.`;
}

function updateChip(): void {
  const chip = document.getElementById('mcp-chip');
  if (!chip) return;
  if (mc) {
    chip.classList.add('live');
    chip.textContent = `✦ WebMCP · ${registeredNames.length} tools`;
    chip.title = `Model-context host detected. Registered tools:\n${registeredNames.join('\n')}`;
  } else {
    chip.classList.remove('live');
    chip.textContent = '✦ WebMCP · N/A';
    chip.title =
      'No model-context host detected (document.modelContext is absent).\n' +
      'In a WebMCP-capable browser or agent, this site exposes tools to travel, walk the hero, and read the research.\n' +
      `Would-be tools:\n${describeTools().map((t) => t.name).join('\n')}`;
  }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('The tool execution was cancelled.', 'AbortError');
  }
}

async function register(tool: ToolDefinition, signal?: AbortSignal): Promise<void> {
  if (!mc) return;
  try {
    const guardedTool: ToolDefinition = {
      ...tool,
      execute: (params, options) => {
        throwIfCancelled(options?.signal);
        return tool.execute(params, options);
      },
    };
    const registrationOptions = signal ? { signal } : undefined;
    // Keep the standards-track call explicit in the implementation so source
    // review (and simple challenge scanners) can see the WebMCP entry point.
    // Chrome 149–151 may still expose only the deprecated navigator alias.
    if (document.modelContext === mc) {
      await document.modelContext.registerTool(guardedTool, registrationOptions);
    } else {
      await mc.registerTool(guardedTool, registrationOptions);
    }
    // A route can change while an asynchronous host is still registering the
    // previous page's tools. Never let a late completion revive a stale name.
    if (signal?.aborted) return;
    if (!registeredNames.includes(tool.name)) registeredNames.push(tool.name);
    updateChip();
  } catch (e) {
    console.warn(`WebMCP: failed to register ${tool.name}`, e);
  }
}

export function initWebMCP(router: Router, home: HomeLevel): void {
  ctxRef = { router, home };
  mc = getModelContext();
  updateChip();
  if (!mc) return;

  void register({
    name: 'list-site-pages',
    title: 'List site pages',
    description:
      'List every page of this personal website (an explorable dark-fantasy home world) with what it contains and the landmark that leads to it. Use this first to orient yourself.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () =>
      JSON.stringify({
        currentPage: router.current?.id ?? 'home',
        // extracted from the POIs at call time — the exact names and
        // subtitles the page shows on its floating labels and travel menu
        pages: [
          { id: 'home', name: 'Crepusculum Dream', content: 'the explorable HD-2D home world; all landmarks live here' },
          ...POIS.filter((p) => p.action !== 'menu').map((p) => ({ id: p.action, name: p.label, content: p.sub, landmark: p.id })),
        ],
      }),
  });

  // universal: the author's bio is readable from any page; if the visitor
  // isn't on the About page, the result nudges them to travel there
  void register({
    name: 'get-about-me',
    title: 'Get biography',
    description: "Return the author's short biography.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () => {
      const visibleBio = document.querySelector<HTMLElement>('.article.about #about-me');
      if (visibleBio) return cleanText(visibleBio.textContent).replace(/^ABOUT ME\s*/i, '');
      return `${ABOUT_ME_TEXT}\n\n(You are not on the About page. To see this in context — alongside interests and the WebMCP tools — go there with goto-site-page({ page: "about" }).)`;
    },
  });

  void register({
    name: 'goto-site-page',
    title: 'Go to site page',
    description:
      'Immediately jump to a page of the site, as if resting at the bonfire and warping. For the scenic route through the home world, use walk-hero-to-landmark instead.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'string', enum: [...AREAS], description: 'Destination page id' },
      },
      required: ['page'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async (p: { page?: string }, { signal } = {}) => {
      const page = String(p?.page ?? '');
      if (!(AREAS as readonly string[]).includes(page)) {
        return `Unknown page "${page}". Valid pages: ${AREAS.join(', ')}.`;
      }
      if (router.current?.id === page) return `Already on page "${page}".`;
      const ok = await router.go(page, true, signal);
      throwIfCancelled(signal);
      return ok ? `Navigated to "${page}".` : `Could not go to "${page}" right now (a transition may already be in progress). Try again in a moment.`;
    },
  });

  // universal: switch the UI language; available languages are the enum below
  void register({
    name: 'set-language',
    title: 'Set interface language',
    description:
      `Switch the interface language. Available languages: ${LANGS.map((l) => `${l.id} (${l.label})`).join(', ')}. The whole UI retranslates in place.`,
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: LANGS.map((l) => l.id), description: 'Target language code' },
      },
      required: ['language'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (p: { language?: string }) => {
      const lang = String(p?.language ?? '');
      if (!LANGS.some((l) => l.id === lang)) {
        return `Unknown language "${lang}". Available: ${LANGS.map((l) => l.id).join(', ')}.`;
      }
      if (getLang() === lang) return `The interface is already in "${lang}".`;
      setLang(lang as Lang);
      return `Interface language switched to "${lang}".`;
    },
  });

  void register({
    name: 'create-portfolio-tour',
    title: 'Create a portfolio tour',
    description: 'Create and display a goal-specific portfolio route in the shared page UI. The visitor can click each stop to navigate and focus its relevant section.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          enum: Object.keys(TOUR_PLANS),
          description: 'Visitor goal: recruiting, research collaboration, technical review, creative exploration, or the complete portfolio.',
        },
      },
      required: ['goal'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (p: { goal?: string }) => {
      const goal = String(p?.goal ?? '');
      if (!Object.hasOwn(TOUR_PLANS, goal)) return `Unknown goal "${goal}". Valid goals: ${Object.keys(TOUR_PLANS).join(', ')}.`;
      return createPortfolioTour(goal as TourGoal, router);
    },
  });

  // context-scoped tools follow the active area: registered when their page
  // state can satisfy them, aborted the moment it changes
  router.onChange((area) => syncContextTools(area));

  updateChip();
}

function isArticleArea(area: string): area is ArticleArea {
  return area in PAGE_CONTEXTS;
}

function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function clipText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

function articleRoot(area: ArticleArea): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.article.${area} .article-body`);
}

function articleHeading(area: ArticleArea, heading: string): HTMLElement | null {
  const root = articleRoot(area);
  if (!root) return null;
  return [...root.querySelectorAll<HTMLElement>('h1, h2')]
    .find((el) => cleanText(el.textContent).toLocaleLowerCase() === heading.toLocaleLowerCase()) ?? null;
}

function visibleCitation(): string {
  return document.querySelector<HTMLElement>('.article.research .bibtex code')?.textContent?.trim() ?? BIBTEX;
}

function sectionText(area: ArticleArea, heading: string): string {
  const target = articleHeading(area, heading);
  if (!target) return '';
  return cleanText((target.closest('section, .zine-paper') ?? target.parentElement)?.textContent);
}

function pageOverview(area: ArticleArea): string {
  const root = articleRoot(area);
  const config = PAGE_CONTEXTS[area];
  if (!root) return `The ${config.label} page is not mounted.`;

  const summary = cleanText(root.querySelector('.abstract')?.textContent);
  const seenLinks = new Set<string>();
  const links = [...root.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter((link) => !link.closest('.site-footer'))
    .map((link) => ({ label: cleanText(link.textContent), url: link.href }))
    .filter((link) => link.label && !seenLinks.has(link.url) && seenLinks.add(link.url));
  const sections = config.sections.map(({ id, heading, description }) => ({ id, heading, description }));

  return JSON.stringify({
    page: area,
    label: config.label,
    title: cleanText(root.querySelector('h1')?.textContent),
    summary,
    sections,
    links,
  });
}

function focusPageSection(area: ArticleArea, sectionId: string): string {
  const config = PAGE_CONTEXTS[area];
  const section = config.sections.find((candidate) => candidate.id === sectionId);
  if (!section) {
    return `Unknown section "${sectionId}" on ${config.label}. Valid sections: ${config.sections.map((candidate) => candidate.id).join(', ')}.`;
  }
  const heading = articleHeading(area, section.heading);
  if (!heading) return `The "${section.heading}" section is not available right now.`;

  // Every article opens with an abstract immediately after its H1. Treat that
  // paragraph as the overview focus target so a new page starts with context.
  const intro = sectionId === 'overview'
    ? articleRoot(area)?.querySelector<HTMLElement>('.abstract')
    : null;
  const target = (intro ?? heading.closest('section, .zine-paper') ?? heading) as HTMLElement;
  document.querySelectorAll('.webmcp-focus').forEach((el) => el.classList.remove('webmcp-focus'));
  // Centering keeps the focused content clear of the liquid-glass top bar,
  // whose responsive height overlays the top of every article page.
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('webmcp-focus');
  window.setTimeout(() => target.classList.remove('webmcp-focus'), 1800);
  return `Focused "${section.heading}" on ${config.label}.`;
}

function registerArticleTools(area: ArticleArea, signal: AbortSignal): void {
  const config = PAGE_CONTEXTS[area];
  const sectionIds = config.sections.map((section) => section.id);

  // These two names intentionally stay stable while their page-specific
  // descriptions, enums, returned content, and visible effects are replaced.
  void register(
    {
      name: 'get-page-overview',
      title: `Overview of ${config.label}`,
      description: `Return a structured overview of ${config.label}, including sections and links.`,
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => pageOverview(area),
    },
    signal,
  );
  void register(
    {
      name: 'focus-page-section',
      title: `Focus a ${config.label} section`,
      description: `Scroll to and briefly highlight a section of ${config.label}.`,
      inputSchema: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: sectionIds, description: 'Section id; call get-page-overview to list the available sections.' },
        },
        required: ['section'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (p: { section?: string }) => focusPageSection(area, String(p?.section ?? '')),
    },
    signal,
  );

  if (area === 'projects') {
    void register(
      {
        name: 'get-fluid-simulation',
        title: 'Get fluid-simulation details',
        description: 'Return the real-time GPU fluid simulator’s recorded test scenes, capabilities, and test hardware.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => {
          const root = articleRoot('projects');
          if (!root) return 'The Projects page is not mounted.';
          const scenes = [...root.querySelectorAll<HTMLElement>('.video-card')].map((card) => ({
            title: cleanText(card.querySelector('b')?.textContent),
            description: cleanText(card.querySelector('figcaption span:not(.credit)')?.textContent),
          }));
          return JSON.stringify({
            project: 'Real-time GPU fluid simulation',
            summary: cleanText(root.querySelector('.abstract')?.textContent),
            scenes,
            capabilities: clipText(sectionText('projects', 'SYSTEM CAPABILITIES'), 360),
            testHardware: sectionText('projects', 'EXPERIMENT SETUP'),
          });
        },
      },
      signal,
    );
  }

  if (area === 'research') {
    void register(
      {
        name: 'get-publications',
        title: 'Get publications',
        description: 'Return publication metadata as structured JSON: title, authors, venue, year, DOI, links, and award.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => {
          const root = articleRoot('research');
          if (!root) return 'The Research page is not mounted.';
          return JSON.stringify([...root.querySelectorAll<HTMLElement>('.item-card')].map((card) => {
            const venueAndYear = cleanText(card.querySelector('.ic-type')?.textContent);
            const yearMatch = venueAndYear.match(/,\s*(\d{4})$/);
            const links = [...card.querySelectorAll<HTMLAnchorElement>('.article-links a')]
              .map((link) => ({ label: cleanText(link.textContent), url: link.href }));
            const doiUrl = links.find((link) => link.url.startsWith('https://doi.org/'))?.url;
            return {
              title: cleanText(card.querySelector('.ic-title')?.textContent),
              authors: cleanText(card.querySelector('p em')?.textContent),
              venue: yearMatch ? venueAndYear.slice(0, yearMatch.index) : venueAndYear,
              year: yearMatch ? Number(yearMatch[1]) : null,
              doi: doiUrl?.replace('https://doi.org/', '') ?? null,
              award: cleanText(card.querySelector('.badge')?.textContent),
              links,
            };
          }));
        },
      },
      signal,
    );
    void register(
      {
        name: 'get-citation',
        title: 'Get BibTeX citation',
        description: 'Return the complete BibTeX citation without copying it.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => visibleCitation(),
      },
      signal,
    );
  }

  if (area === 'mods') {
    void register(
      {
        name: 'get-mod-details',
        title: 'Get mod systems details',
        description: 'Return the playable mod’s headline statistics, core mechanic, and featured cards.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => {
          const root = articleRoot('mods');
          if (!root) return 'The Mods page is not mounted.';
          const stats = [...root.querySelectorAll<HTMLElement>('.stat')].map((stat) => ({
            value: cleanText(stat.querySelector('b')?.textContent),
            label: cleanText(stat.querySelector('span')?.textContent),
          }));
          const featuredCards = [...root.querySelectorAll<HTMLElement>('.sts-card')].map((card) => ({
            name: cleanText(card.querySelector('.c-name')?.textContent),
            cost: cleanText(card.querySelector('.cost')?.textContent),
            type: cleanText(card.querySelector('.c-type')?.textContent),
          }));
          return JSON.stringify({
            mod: 'Complete deck-building character mod',
            summary: cleanText(root.querySelector('.abstract')?.textContent),
            stats,
            coreMechanic: clipText(sectionText('mods', 'THE MECHANIC — NERVOUS IMPAIRMENT'), 480),
            featuredCards,
            workshopUrl: STEAM_URL,
          });
        },
      },
      signal,
    );
    void register(
      {
        name: 'goto_workshop_page',
        title: 'Open Steam Workshop page',
        description: 'Open the public Steam Workshop listing for the complete upstream mod.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: () => {
          window.location.assign(STEAM_URL);
          return 'Navigating to the linked mod page on Steam Workshop.';
        },
      },
      signal,
    );
  }

  if (area === 'zine') {
    const pieces = config.sections.filter((section) => section.id !== 'overview');
    void register(
      {
        name: 'read-zine-piece',
        title: 'Read a zine piece',
        description: 'Return one poem or editorial section from experimental Poetry as plain text.',
        inputSchema: {
          type: 'object',
          properties: {
            piece: {
              type: 'string',
              enum: pieces.map((piece) => piece.id),
              description: 'Piece id; call get-page-overview to list the available sections.',
            },
          },
          required: ['piece'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: (p: { piece?: string }) => {
          const pieceId = String(p?.piece ?? '');
          const piece = pieces.find((candidate) => candidate.id === pieceId);
          if (!piece) return `Unknown piece "${pieceId}". Valid pieces: ${pieces.map((candidate) => candidate.id).join(', ')}.`;
          const heading = articleHeading('zine', piece.heading);
          const paper = heading?.closest<HTMLElement>('.zine-paper');
          return paper ? clipText(paper.innerText.trim(), 1500) : `The "${piece.heading}" piece is not available right now.`;
        },
      },
      signal,
    );
  }

  if (area === 'about') {
    void register(
      {
        name: 'get-photography-captions',
        title: 'Get photography captions',
        description: 'List the titles of Yunhao Luo’s portfolio photographs.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => {
          const root = articleRoot('about');
          if (!root) return 'The About page is not mounted.';
          return JSON.stringify([...root.querySelectorAll<HTMLImageElement>('.photo-card img')]
            .map((photo) => photo.alt)
            .filter(Boolean));
        },
      },
      signal,
    );
  }
}

/** Register/unregister area-scoped tools to match the current area. */
function syncContextTools(area: string): void {
  if (!mc || !ctxRef) return;
  const { home } = ctxRef;

  if (area === 'home' && !homeAbort) {
    homeAbort = new AbortController();
    void register(
      {
        name: 'walk-hero-to-landmark',
        title: 'Walk hero to landmark',
        description:
          'Walk the pixel hero across the home world to a named landmark. Set interact=true to also use the landmark on arrival (the bonfire opens the travel menu; other landmarks travel to their area).',
        inputSchema: {
          type: 'object',
          properties: {
            landmark: {
              type: 'string',
              enum: [...LANDMARKS],
              description: 'Landmark id. Use list-site-pages for details; bonfire opens travel and the others lead to their content page.',
            },
            interact: { type: 'boolean', description: 'Interact with the landmark after arriving (default false)' },
          },
          required: ['landmark'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (p: { landmark?: string; interact?: boolean }, { signal: executionSignal } = {}) => {
          const lm = String(p?.landmark ?? '');
          if (!(LANDMARKS as readonly string[]).includes(lm)) {
            return `Unknown landmark "${lm}". Valid landmarks: ${LANDMARKS.join(', ')}.`;
          }
          return home.mcpWalkTo(lm, !!p?.interact, executionSignal);
        },
      },
      homeAbort.signal,
    );
    void register(
      {
        name: 'get-hero-status',
        title: 'Get hero status',
        description: 'Report the hero’s current area, tile position, and the nearest landmark.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => home.mcpStatus(),
      },
      homeAbort.signal,
    );
  } else if (area !== 'home' && homeAbort) {
    homeAbort.abort();
    homeAbort = null;
    registeredNames = registeredNames.filter((n) => n !== 'walk-hero-to-landmark' && n !== 'get-hero-status');
  }

  const nextArticleArea = isArticleArea(area) ? area : null;
  if (articleAbort && articleArea !== nextArticleArea) {
    articleAbort.abort();
    articleAbort = null;
    articleArea = null;
    registeredNames = registeredNames.filter((name) => !PAGE_SCOPED_NAMES.has(name));
  }
  if (nextArticleArea && !articleAbort) {
    articleArea = nextArticleArea;
    articleAbort = new AbortController();
    registerArticleTools(nextArticleArea, articleAbort.signal);
  }

  updateChip();
}
