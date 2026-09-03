/**
 * Mods — a rights-safe presentation of a playable character mod.
 * Identity-specific names and source artwork are intentionally omitted. The
 * upstream Workshop and source links remain available for visitors who choose
 * to inspect the original non-commercial fan project in its own context.
 */
import { Router } from '../router';
import { makeArticleLevel } from './article';
import gallery01 from '../assets/mods/redacted/gallery-01.png';
import gallery02 from '../assets/mods/redacted/gallery-02.png';
import gallery03 from '../assets/mods/redacted/gallery-03.png';
import gallery04 from '../assets/mods/redacted/gallery-04.png';
import gallery05 from '../assets/mods/redacted/gallery-05.png';

export const STEAM_URL = 'https://steamcommunity.com/sharedfiles/filedetails/?id=3764504027';
const GITHUB_URL = 'https://github.com/HimeragiYukina/mizuki-mod-sts';

const SLIDES = [gallery01, gallery02, gallery03, gallery04, gallery05].map((src, index) => ({
  src,
  caption: `Redacted gallery palette ${index + 1} — source imagery is omitted from the competition build.`,
}));

interface FeaturedCard {
  name: string;
  zh: string;
  cost: string;
  type: string;
  rare: boolean;
  text: string;
  colors: [string, string, string, string];
}

const CARDS: FeaturedCard[] = [
  {
    name: 'Exaltation', zh: '升格', cost: '3', type: 'Power · Rare', rare: true,
    text: 'At the start of each turn, gain <b>Strength</b> — and <b>Nervous Impairment</b> with it. Power at a price.',
    colors: ['#101a32', '#456b92', '#8dbdd0', '#d4b96f'],
  },
  {
    name: 'Cognitive Filter', zh: '认知滤镜', cost: '2', type: 'Attack · Rare', rare: true,
    text: 'A finisher that hits harder for every stack of <b>Nervous Impairment</b> you carry. <b>Exhaust.</b>',
    colors: ['#151a26', '#4c5570', '#819db8', '#c7d6df'],
  },
  {
    name: 'Dream', zh: '梦境', cost: '0', type: 'Skill · Uncommon', rare: false,
    text: 'Gain <b>Block</b> — and <b>Nervous Impairment</b> with it. Shelter and cost arrive together. <b>Exhaust.</b>',
    colors: ['#0c2635', '#2f7286', '#79b9c9', '#b9dce5'],
  },
  {
    name: 'Price of Peace', zh: '息潮的代价', cost: '1', type: 'Power · Rare', rare: true,
    text: 'Every card you play applies <b>Nervous Impairment</b> to all enemies, while taxing your energy each turn. <b>Ethereal.</b>',
    colors: ['#1b1a2e', '#5a4b78', '#a17ca1', '#d1a5a8'],
  },
  {
    name: 'Feed', zh: '进食', cost: '1', type: 'Skill · Basic', rare: false,
    text: 'Convert your <b>Hope</b> into that much <b>Regen</b>. <b>Exhaust.</b>',
    colors: ['#142522', '#426e5d', '#84a982', '#d0c58c'],
  },
  {
    name: 'CRT', zh: '老式显像器', cost: '1', type: 'Skill · Uncommon', rare: false,
    text: 'Replay the last card you played. <b>Ethereal. Exhaust.</b> An old monitor remembers.',
    colors: ['#191b25', '#475161', '#7894a1', '#b7d7dc'],
  },
];

const MOSAIC_PATTERN = [0, 1, 1, 2, 1, 3, 2, 0, 3, 2, 0, 1];

function mosaicMarkup(colors: readonly string[], className: string, label: string): string {
  const cells = className === 'mosaic-icon' ? [0, 1, 2, 3] : MOSAIC_PATTERN;
  return `<span class="${className}" role="img" aria-label="${label}">${cells
    .map((colorIndex) => `<span style="background:${colors[colorIndex % colors.length]}"></span>`)
    .join('')}</span>`;
}

export function makeModLevel(router: Router) {
  return makeArticleLevel(router, 'mods', 'MODS', (inner) => {
    inner.innerHTML = `
      <header id="overview">
        <h1>Deck-Building Character Mod</h1>
        <p class="abstract">A complete fan-made playable character mod with 78 cards, custom mechanics, animation,
          and localization. Identity-specific names and artwork are omitted from this competition edition.</p>
      </header>
      <div class="rule"></div>

      <figure class="mod-hero mod-slides">
        <div class="slide-frame">
          ${SLIDES.map((slide, index) => `<img class="${index === 0 ? 'active' : ''}" src="${slide.src}" alt="${slide.caption}" ${index > 0 ? 'loading="lazy"' : ''}>`).join('')}
          <button class="slide-nav slide-prev" type="button" aria-label="previous slide">‹</button>
          <button class="slide-nav slide-next" type="button" aria-label="next slide">›</button>
          <div class="slide-dots">
            ${SLIDES.map((_, index) => `<button class="slide-dot${index === 0 ? ' active' : ''}" type="button" data-slide="${index}" aria-label="slide ${index + 1}"></button>`).join('')}
          </div>
        </div>
        <figcaption class="credit" data-slide-caption>${SLIDES[0].caption}</figcaption>
      </figure>

      <div class="article-links mod-links">
        <a href="${STEAM_URL}" target="_blank" rel="noopener">STEAM WORKSHOP</a>
        <a href="${GITHUB_URL}" target="_blank" rel="noopener">SOURCE ON GITHUB</a>
      </div>

      <div class="stat-row" style="justify-content:center">
        <div class="stat"><b>78</b><span>CARDS</span></div>
        <div class="stat"><b>9</b><span>RELICS</span></div>
        <div class="stat"><b>5</b><span>POTIONS</span></div>
        <div class="stat"><b>2</b><span>LANGUAGES</span></div>
        <div class="stat"><b>2D</b><span>SKELETAL ANIMATION</span></div>
      </div>

      <section id="workshop">
        <h2>PLAYABLE BUILD</h2>
        <p>The complete upstream mod is available through the <a href="${STEAM_URL}" target="_blank" rel="noopener">Steam Workshop</a>
          or can be built from the public <a href="${GITHUB_URL}" target="_blank" rel="noopener">source repository</a>.
          Those destinations contain their own third-party ownership notices.</p>
      </section>

      <section id="mechanic">
        <h2>THE MECHANIC — NERVOUS IMPAIRMENT</h2>
        <p>The playable kit orbits one custom debuff: <b>Nervous Impairment</b> stacks quietly on enemies and,
          if handled carelessly, on the player. At <b>10 stacks it bursts and resets</b>, giving the bearer one
          <b>Frenzy</b>; each Frenzy gained burns HP equal to <b>10× its current Frenzy stacks</b> (10, 20, 30…).
          A monster is stunned only the first time it gains Frenzy, preventing boss stun-locks and preserving
          the risk-reward axis of self-affliction builds.</p>
        <p>Supporting systems include <b>Hope</b>, an accumulating resource that cards convert into damage,
          Block, Regen or gold, and <b>Regen</b>, healing that ticks down each turn.</p>
      </section>

      <section id="cards">
        <h2>FEATURED CARDS</h2>
        <div class="sts-cards"></div>
        <p class="credit">Card visuals are original nonrepresentational mosaics; no upstream artwork is bundled.</p>
      </section>

      <section id="pool">
        <h2>THE CARD POOL</h2>
        <p><b>78 cards</b> — 72 in the standard reward pool plus 6 special spawn-only cards generated by other
          cards. The pool covers X-cost area attacks, an exhaust finisher, block-scaling, multi-hit, a growing
          attack, resource-engine powers and Strength ramp.</p>
        <table class="mod-table">
          <thead>
            <tr><th>Type</th><th>Basic</th><th>Common</th><th>Uncommon</th><th>Rare</th><th>Special</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr><td>Attack</td><td>1</td><td>10</td><td>11</td><td>4</td><td>0</td><td><b>26</b></td></tr>
            <tr><td>Skill</td><td>3</td><td>7</td><td>16</td><td>6</td><td>4</td><td><b>36</b></td></tr>
            <tr><td>Power</td><td>0</td><td>0</td><td>7</td><td>7</td><td>2</td><td><b>16</b></td></tr>
            <tr><td><b>Total</b></td><td><b>4</b></td><td><b>17</b></td><td><b>34</b></td><td><b>17</b></td><td><b>6</b></td><td><b>78</b></td></tr>
          </tbody>
        </table>
      </section>

      <section id="relics">
        <h2>NOTABLE RELICS</h2>
        <ul class="relic-list">
          <li>${mosaicMarkup(['#102335', '#315f76', '#6ea6b7', '#b5d3d5'], 'mosaic-icon', 'four-block mosaic')}<span><b>Detonation Engine</b> — enemies lose extra HP whenever their Nervous Impairment detonates.</span></li>
          <li>${mosaicMarkup(['#171d37', '#4b5685', '#8794bd', '#cad1e8'], 'mosaic-icon', 'four-block mosaic')}<span><b>Tidal Battery</b> — grants energy each turn while adding risk at the start of combat.</span></li>
          <li>${mosaicMarkup(['#162b24', '#3f6b5b', '#85a77e', '#d3c779'], 'mosaic-icon', 'four-block mosaic')}<span><b>Untouched Reward</b> — finishing a fight unharmed grants a lasting health reward.</span></li>
        </ul>
      </section>

      <section id="copyright">
        <h2>COMPETITION ASSET POLICY</h2>
        <p class="mod-disclaimer">Identity-specific artwork and names are not included in this repository.
          Gallery previews are heavily redacted, nonrepresentational palette mosaics; card and relic visuals are
          generated from plain CSS color blocks. The external Workshop and source links lead to the original
          non-commercial fan project, where its separate ownership and attribution notices apply.</p>
      </section>
    `;

    const holder = inner.querySelector('.sts-cards')!;
    for (const card of CARDS) {
      const element = document.createElement('div');
      element.className = `sts-card${card.rare ? ' rare' : ''}`;
      element.innerHTML = `
        <div class="cost">${card.cost}</div>
        <div class="c-name">${card.name} · ${card.zh}</div>
        <div class="c-type">${card.type}</div>
        ${mosaicMarkup(card.colors, 'c-art mosaic-card-art', `${card.name} redacted card-art mosaic`)}
        <div class="c-text">${card.text}</div>
      `;
      holder.appendChild(element);
    }

    const hero = inner.querySelector<HTMLElement>('.mod-slides')!;
    const slides = [...hero.querySelectorAll<HTMLImageElement>('.slide-frame img')];
    const dots = [...hero.querySelectorAll<HTMLButtonElement>('.slide-dot')];
    const caption = hero.querySelector<HTMLElement>('[data-slide-caption]')!;
    let index = 0;
    const show = (nextIndex: number) => {
      index = (nextIndex + SLIDES.length) % SLIDES.length;
      slides.forEach((element, slideIndex) => element.classList.toggle('active', slideIndex === index));
      dots.forEach((element, slideIndex) => element.classList.toggle('active', slideIndex === index));
      caption.textContent = SLIDES[index].caption;
    };
    let timer = 0;
    const restart = () => {
      clearInterval(timer);
      timer = window.setInterval(() => {
        if (!hero.isConnected) return clearInterval(timer);
        show(index + 1);
      }, 6000);
    };
    hero.querySelector('.slide-prev')!.addEventListener('click', () => { show(index - 1); restart(); });
    hero.querySelector('.slide-next')!.addEventListener('click', () => { show(index + 1); restart(); });
    dots.forEach((dot) => dot.addEventListener('click', () => { show(Number(dot.dataset.slide)); restart(); }));
    restart();
  });
}
