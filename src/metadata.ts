interface PageMetadata {
  title: string;
  description: string;
}

const PAGE_METADATA: Record<string, PageMetadata> = {
  home: {
    title: 'Yunhao Luo — Playable WebMCP Portfolio',
    description:
      "Explore Yunhao Luo's playable HD-2D portfolio by keyboard, mouse, or page-aware WebMCP tools—featuring research, simulation, mods, writing, and photography.",
  },
  projects: {
    title: 'Fluid Simulation — Yunhao Luo',
    description:
      "Explore Yunhao Luo's real-time GPU liquid simulation built at Ubisoft Montreal with position-based fluids and GPU compute shaders.",
  },
  research: {
    title: 'Research — Yunhao Luo',
    description:
      "Read Yunhao Luo's MIG '21 research on catching and throwing control for a physically simulated hand, including an original summary, publication links, and complete BibTeX.",
  },
  mods: {
    title: 'Deck-Building Character Mod — Yunhao Luo',
    description:
      "Explore Yunhao Luo's complete playable deck-building character mod with 78 cards, original mechanics, animation, localization, and Workshop links.",
  },
  zine: {
    title: 'Experimental Poetry — Yunhao Luo',
    description:
      "Read experimental Poetry, Yunhao Luo's interactive modern-poetry zine with visual poems, branching pages, and cited influences.",
  },
  about: {
    title: 'About Yunhao Luo — AI Researcher',
    description:
      'Learn about Yunhao Luo, an AI researcher at Huawei Canada working on the agentic web, character animation, physics simulation, and real-time rendering.',
  },
};

function setMetaContent(selector: string, content: string): void {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

/** Keep browser- and agent-visible metadata aligned with the active SPA page. */
export function updatePageMetadata(pageId: string): void {
  const metadata = PAGE_METADATA[pageId] ?? PAGE_METADATA.home;
  document.title = metadata.title;
  setMetaContent('meta[name="description"]', metadata.description);
  setMetaContent('meta[property="og:title"]', metadata.title);
  setMetaContent('meta[property="og:description"]', metadata.description);
  setMetaContent('meta[name="twitter:title"]', metadata.title);
  setMetaContent('meta[name="twitter:description"]', metadata.description);
}
