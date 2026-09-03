/**
 * The "About Me" bio — single source of truth shared by the About page
 * (rendered as HTML) and the WebMCP `get-about-me` tool (plain text). Living
 * here avoids a circular import between about.ts and webmcp.ts.
 */

/** Paragraphs of the bio, as HTML (bold + in-site links). */
export const ABOUT_ME_HTML: string[] = [
  `I am <b>Yunhao Luo</b>, an AI researcher at Huawei Canada's Web Technology Lab. I previously
   researched real-time GPU fluid simulation at Ubisoft La Forge and hold an M.Sc. in Computer
   Science from McGill University, where my thesis work on physically simulated hand control
   received the Best Presentation Award at MIG '21.`,
  `My current research centers on the <b>agentic web</b>: web agents, website generation, and
   emerging standards for making the web agent-friendly — alongside a long-standing foundation in
   character animation, physics-based simulation, and real-time rendering. This site presents selected work: the real-time GPU
   liquid simulator developed at Ubisoft Montreal (<a href="#/projects">Projects</a>), my
   first-author publication (<a href="#/research">Research</a>), and independent game
   development (<a href="#/mods">Mods</a>).`,
];

/** The same bio as plain text (tags stripped, whitespace collapsed). */
export const ABOUT_ME_TEXT: string = ABOUT_ME_HTML.map((p) =>
  p.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
).join('\n\n');

/**
 * Center the "About Me" section (#about-me) on screen and flash a brief
 * golden highlight over it. Used by the top-bar name click; WebMCP keeps the
 * read-only get-about-me operation separate from focus-page-section.
 */
export function revealAboutMe(): boolean {
  const el = document.getElementById('about-me');
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // restart the animation even if it fired moments ago
  el.classList.remove('about-flash');
  void el.offsetWidth; // reflow so re-adding the class replays it
  el.classList.add('about-flash');
  const clear = () => el.classList.remove('about-flash');
  el.addEventListener('animationend', clear, { once: true });
  setTimeout(clear, 2000); // fallback if animationend is throttled (background tab)
  return true;
}
