/**
 * Procedural pixel-art asset generation.
 * Every sprite, tile and backdrop on the site is generated here at boot from
 * seeded code — no binary assets. Sprites are authored either as string art
 * (readable pixel grids) or as small algorithmic painters.
 */
import { mulberry32, hash2 } from './rng';

export interface Sprites {
  hero: {
    // [dir][frame] — dir: 0 down, 1 up, 2 right, 3 left. 4 frames of walk.
    frames: HTMLCanvasElement[][];
    w: number;
    h: number;
  };
  bonfireBase: HTMLCanvasElement;
  flameFrames: HTMLCanvasElement[];
  pillars: HTMLCanvasElement[];
  deadTrees: HTMLCanvasElement[];
  grassTufts: HTMLCanvasElement[];
  rocks: HTMLCanvasElement[];
  mansion: HTMLCanvasElement;
  smithy: HTMLCanvasElement;
  monument: HTMLCanvasElement;
  easel: HTMLCanvasElement;
  pit: HTMLCanvasElement;
  tiles: {
    ash: HTMLCanvasElement[];
    grass: HTMLCanvasElement[];
    path: HTMLCanvasElement[];
    cliff: HTMLCanvasElement[];
    sand: HTMLCanvasElement[];
  };
  drownedRuins: HTMLCanvasElement;
  headland: HTMLCanvasElement;
  sun: HTMLCanvasElement;
}

export const TILE = 16;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  return [c, x];
}

/** Nearest-neighbor rescale of a sprite canvas by `f` (keeps the pixel-art
 *  look). Used to resize a landmark without redrawing its art. */
function scaleCanvas(src: HTMLCanvasElement, f: number): HTMLCanvasElement {
  const [c, x] = makeCanvas(Math.max(1, Math.round(src.width * f)), Math.max(1, Math.round(src.height * f)));
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Render a string-art pixel grid. Throws if rows are ragged (authoring guard). */
function stringArt(rows: string[], palette: Record<string, string>): HTMLCanvasElement {
  const w = rows[0].length;
  for (const r of rows) {
    if (r.length !== w) throw new Error(`ragged string art row: "${r}" (${r.length} != ${w})`);
  }
  const [c, x] = makeCanvas(w, rows.length);
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[j][i];
      if (ch === '.') continue;
      const col = palette[ch];
      if (!col) throw new Error(`string art: no palette entry for "${ch}"`);
      x.fillStyle = col;
      x.fillRect(i, j, 1, 1);
    }
  }
  return c;
}

/* ============================ HERO ============================ */
// An intentionally tiny, abstract traveler sprite. At gameplay scale its
// silhouette reads as a generic explorer; the last five rows swap between
// three leg variants for the four-frame walk cycle.
const HERO_PAL: Record<string, string> = {
  k: '#251d38', // purple-navy outline
  N: '#231d48', // beret dark
  n: '#38306e', // beret
  b: '#5a50a8', // beret gloss sheen
  q: '#8aaef0', // light-blue clover emblem
  H: '#dcedfc', // hair light
  h: '#a7cdf0', // hair
  s: '#6f9ad8', // hair shade
  p: '#b79ae4', // lavender hair tips
  F: '#f8e8d8', // skin
  f: '#eec4b0', // skin shade / blush
  e: '#4a3d78', // eye lash line
  E: '#e88bb8', // pink iris
  W: '#f0f2f5', // cape white
  G: '#c2d45e', // chartreuse trim
  C: '#3b6bd0', // cape / bow blue
  c: '#27408e', // cape shadow
  T: '#5ac8ea', // cape cyan glint
  L: '#2a2c38', // tights
  B: '#202232', // boots
  Y: '#e8d040', // yellow lanyard / zipper
  d: '#2c2a36', // black top / shorts / belt
  A: '#a8b0c0', // silver belt buckle
  t: '#3ed8dc', // teal choker accent
  U: '#e6e9f0', // boot white panel
  u: '#f0a8e0', // pink glowing platform sole
};

const HERO_W = 18;
const HERO_H = 22;

// --- facing down (black beret ribbon down the right, chartreuse sailor
// collar with a blue bow whose tails fall over an iridescent chest panel,
// the cape draping on one side, blue lining under the shorts hem) ---
const HERO_DOWN_BODY = [
  '....kkkkkkkk......',
  '...kknnnnnnkk.....',
  '..knnnbqqbnnnk....',
  '..knnnnqqnnnnnk...',
  '.kNnnnnnnnnnnnNk..',
  '..kHHhhhhhhhNnNkk.',
  '.kHHhFFFFFFhhNkk..',
  '.kHhFeFFFFeFhHkk..',
  '.kHhFEFFFFEFhHkk..',
  '.kphFfFffFfFhpk...',
  '..kkWGGGGGGWkk....',
  '.khWGCCCCCCGWhk...',
  '.khWWCcTTcCWWhk...',
  '.kpWWddCTCddWWpk..',
  '..kWdddAAdddWk....',
  '.kCkddddddddkWk...',
  '..kkkCddddCkkk....',
];
const HERO_DOWN_LEGS = [
  [
    '....kLLkkLLk......',
    '....kLLk.kLLk.....',
    '...kYBBk.kBABk....',
    '...kBUBk.kBUBk....',
    '...kuuuk.kuuuk....',
  ],
  [
    '....kLLkkLLk......',
    '...kLLk..kLLk.....',
    '...kBBBk..kLLk....',
    '...kuuuk..kBBBk...',
    '..........kuuuk...',
  ],
  [
    '....kLLkkLLk......',
    '...kLLk..kLLk.....',
    '..kLLk...kBBBk....',
    '..kBBBk..kuuuk....',
    '..kuuuk...........',
  ],
];

// --- facing up (back view: bob of hair over a white hood band, black beret
// ribbon down the right, and a flared blue cape-skirt with a purple tab) ---
const HERO_UP_BODY = [
  '....kkkkkkkk......',
  '...kknnnnnnkk.....',
  '..knnnnbbnnnnk....',
  '..knnnnnnnnnnnnk..',
  '.kNnnnnnnnnnnnNk..',
  '..kHHhhhhhhhhhNk..',
  '.kHHhhhhhhhhhhHkk.',
  '.kHhhhshhhhshhHkk.',
  '.kHhhhshhhhshhHkk.',
  '.kphhhhhhhhhhhpkk.',
  '..kkWWWWWWWWkk....',
  '.kpWWWWGGWWWWpk...',
  '..kCCCCbbCCCCk....',
  '.kCCCTCCCCTCCCk...',
  '.kcCTCCCCCCTCck...',
  '.kccTCCCCCCTcck...',
  '...kkkkkkkkkk.....',
];

// --- facing right ---
const HERO_SIDE_BODY = [
  '....kkkkkkkk......',
  '...kknnnnnnkk.....',
  '..knnnbqqbnnnk....',
  '..knnnnqqnnnnnk...',
  '.kNnnnnnnnnnnnNk..',
  '..kNhhhhhhhhhFk...',
  '.kHHhhhhhhhFFFk...',
  '.kHhhhhhhhhFeFk...',
  '.kHhhhhhhhhFEFk...',
  '.kphhhhhhhhfFfk...',
  '..kkWWWWWWGtk.....',
  '.khWWWWWWCCGk.....',
  '.khWWWWWCCCWk.....',
  '.kpWCCCCCCCCk.....',
  '..kCCTCCCTCCk.....',
  '..kcTCCcCCTck.....',
  '...kkkkkkkkk......',
];
const HERO_SIDE_LEGS = [
  [
    '.....kddddk.......',
    '.....kLLLLk.......',
    '.....kLkkLk.......',
    '....kBBk.kBBk.....',
    '....kuuk.kuuk.....',
  ],
  [
    '.....kddddk.......',
    '....kLLkLLk.......',
    '...kLLk..kLk......',
    '...kBBk..kBBk.....',
    '...kuuk..kuuk.....',
  ],
  [
    '.....kddddk.......',
    '.....kLLkLLk......',
    '.....kLk..kLk.....',
    '....kBBk..kBBk....',
    '....kuuk..kuuk....',
  ],
];

function buildHero(): Sprites['hero'] {
  const legOrder = [0, 1, 0, 2]; // stand, step A, stand, step B
  const mkDir = (body: string[], legs: string[][]): HTMLCanvasElement[] =>
    legOrder.map((li) => stringArt([...body, ...legs[li]], HERO_PAL));

  const down = mkDir(HERO_DOWN_BODY, HERO_DOWN_LEGS);
  const up = mkDir(HERO_UP_BODY, HERO_DOWN_LEGS);
  const right = mkDir(HERO_SIDE_BODY, HERO_SIDE_LEGS);
  const left = right.map((f) => {
    const [c, x] = makeCanvas(f.width, f.height);
    x.translate(f.width, 0);
    x.scale(-1, 1);
    x.drawImage(f, 0, 0);
    return c;
  });
  return { frames: [down, up, right, left], w: HERO_W, h: HERO_H };
}

/* ============================ BONFIRE ============================ */
// A coiled sword thrust into an ash mound in a dark-fantasy action-RPG style: the blade snakes
// left and right as it rises, twisted prongs swirl around it, and the steel
// glows hot where it meets the fire.
const BONFIRE_PAL: Record<string, string> = {
  k: '#0e0f13',
  m: '#575044', // ash mound
  M: '#6b6355', // ash mound light
  b: '#a89e8c', // bone
  B: '#c6bca8', // bone light
  w: '#5f636e', // sword steel
  W: '#8b8f9a', // sword steel light
  g: '#4a4438', // twisted guard prongs
  r: '#b0502a', // heated steel
  R: '#e8862a', // heated steel bright
  e: '#e8862a', // ember flecks
};

const BONFIRE_ROWS = [
  '...........WW...........',
  '...........wW...........',
  '..........kwW...........',
  '..........kwW...........',
  '...........wWk..........',
  '............wW..........',
  '...........kwW..........',
  '...........wW...........',
  '..........kwW...........',
  '..........kwW...........',
  '...........wW...........',
  '...........wW...........',
  '...........wWk..........',
  '.....gg....wW....gg.....',
  '....g..g..gwWg..g..g....',
  '.....g..gggwWggg..g.....',
  '......gg..gwWg..gg......',
  '...........wW...........',
  '..........kwW...........',
  '...........wW...........',
  '..........kwW...........',
  '..........krR...........',
  '..........krR...........',
  '...........rR...........',
  '..........krRk..........',
  '...........rR...........',
  '..........krR...........',
  '......b....rR....B......',
  '....bBb...krRk..bBb.....',
  '...bMmmMmMmrRmMmmMmb....',
  '..mMmmeMmmMRRMmmMemmM...',
  '.mMmmMmmemmRRmmemmMmmM..',
  '.mmMmmMmmMmrRmMmmMmmmm..',
  '..mMmmMmmmMmmmMmmmMm....',
  '..kkmmmkkmmmmmkkmmmkk...',
];

function buildFlameFrames(): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  const rnd = mulberry32(1337);
  const W = 16;
  const H = 16;
  for (let f = 0; f < 8; f++) {
    const [c, x] = makeCanvas(W, H);
    const t = f / 8;
    // nested teardrop lobes — an ashen fire: smoke-grey shell, pale ash body,
    // and a hot ember core where the coiled sword feeds it
    const lobes = [
      { col: 'rgba(96,92,88,0.85)', rw: 6.0, rh: 7.2 },
      { col: '#9d968c', rw: 4.4, rh: 5.6 },
      { col: '#d8cfc0', rw: 2.8, rh: 4.0 },
      { col: '#ffc25e', rw: 1.6, rh: 2.6 },
      { col: '#fff8e8', rw: 0.9, rh: 1.5 },
    ];
    for (const lobe of lobes) {
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const cx = W / 2 + Math.sin(t * Math.PI * 2 + j * 0.5) * (j / H) * 1.6;
          const base = H - 1.5;
          const dy = (base - j) / lobe.rh;
          if (dy < 0 || dy > 2.4) continue;
          // teardrop: wide at bottom, tapering with height + per-frame wobble
          const width = lobe.rw * Math.max(0, 1 - dy * 0.55) * (0.85 + 0.3 * hash2(i, j * 7 + f * 31, 5));
          if (Math.abs(i - cx) < width && dy < 2.2) {
            x.fillStyle = lobe.col;
            x.fillRect(i, j, 1, 1);
          }
        }
      }
    }
    // sparks: drifting ash flecks and the odd live ember
    for (let s = 0; s < 4; s++) {
      x.fillStyle = rnd() > 0.6 ? '#e8862a' : rnd() > 0.3 ? '#c9c0b2' : '#8d867c';
      x.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * (H * 0.6)), 1, 1);
    }
    frames.push(c);
  }
  return frames;
}

/* ============================ PROPS ============================ */

function buildPillar(seed: number, h: number): HTMLCanvasElement {
  const rnd = mulberry32(seed);
  const w = 14;
  const [c, x] = makeCanvas(w, h);
  const body = '#3f434f';
  const dark = '#2b2e38';
  const lite = '#565b6a';
  // broken jagged top
  const topAt = (i: number) => Math.floor(3 + 4 * hash2(i, seed, 3));
  for (let i = 2; i < w - 2; i++) {
    for (let j = topAt(i); j < h - 4; j++) {
      const flute = (i - 2) % 3 === 0 ? dark : body;
      x.fillStyle = i === 2 ? dark : i === w - 3 ? dark : i === 3 ? lite : flute;
      if (hash2(i, j + seed, 9) > 0.93) x.fillStyle = dark; // erosion pits
      x.fillRect(i, j, 1, 1);
    }
  }
  // plinth
  x.fillStyle = dark;
  x.fillRect(0, h - 4, w, 4);
  x.fillStyle = body;
  x.fillRect(1, h - 4, w - 2, 1);
  // moss flecks
  for (let m = 0; m < 6; m++) {
    x.fillStyle = '#4a5240';
    x.fillRect(2 + Math.floor(rnd() * (w - 4)), h - 8 - Math.floor(rnd() * 6), 1, 1);
  }
  return c;
}

function buildDeadTree(seed: number): HTMLCanvasElement {
  const rnd = mulberry32(seed);
  const W = 44;
  const H = 58;
  const [c, x] = makeCanvas(W, H);
  x.strokeStyle = '#16171d';
  x.lineCap = 'round';
  const branch = (bx: number, by: number, ang: number, len: number, wd: number) => {
    if (len < 3 || wd < 0.4) return;
    const ex = bx + Math.cos(ang) * len;
    const ey = by - Math.sin(ang) * len;
    x.lineWidth = wd;
    x.beginPath();
    x.moveTo(bx, by);
    x.lineTo(ex, ey);
    x.stroke();
    const n = rnd() > 0.4 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      branch(ex, ey, ang + (rnd() - 0.5) * 1.5, len * (0.55 + rnd() * 0.25), wd * 0.62);
    }
  };
  branch(W / 2, H - 2, Math.PI / 2 + (rnd() - 0.5) * 0.2, H * 0.36, 3.4);
  // faint sunlit edge
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(230,180,110,0.16)';
  x.fillRect(0, 0, W, Math.floor(H * 0.5));
  x.globalCompositeOperation = 'source-over';
  return c;
}

function buildGrassTuft(seed: number): HTMLCanvasElement {
  const rnd = mulberry32(seed);
  const [c, x] = makeCanvas(9, 7);
  const cols = ['#7a6f45', '#8d8055', '#5e5638'];
  for (let b = 0; b < 6; b++) {
    const bx = 1 + Math.floor(rnd() * 7);
    const h = 2 + Math.floor(rnd() * 4);
    x.fillStyle = cols[Math.floor(rnd() * cols.length)];
    for (let j = 0; j < h; j++) {
      x.fillRect(bx + (j > h - 2 ? (rnd() > 0.5 ? 1 : -1) : 0), 6 - j, 1, 1);
    }
  }
  return c;
}

function buildRock(seed: number): HTMLCanvasElement {
  const rnd = mulberry32(seed);
  const w = 13 + Math.floor(rnd() * 8); // 13–20
  const h = 9 + Math.floor(rnd() * 5); //  9–13
  const [c, x] = makeCanvas(w, h);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  // warm-stone ramp, light → dark; the darkest tone stays a muted brown so the
  // boulder reads rounded and top-lit with no deep black shadow baked onto it
  const ramp = ['#9c9284', '#877c6d', '#726757', '#5d5346', '#4b4236'];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const nx = (i - cx) / (w / 2);
      const ny = (j - cy) / (h / 2);
      const r = nx * nx + ny * ny * 1.12;
      if (r > 0.92 + 0.14 * (hash2(i, j, seed) - 0.5)) continue; // outside the silhouette
      // lit from the upper-right sun: brighter up/right, gently darker down/left,
      // with a soft dome falloff toward the rim and a little grain
      let lit = 0.62 - ny * 0.5 + nx * 0.2 - r * 0.28 + (hash2(i, j, seed + 7) - 0.5) * 0.16;
      const idx = Math.max(0, Math.min(ramp.length - 1, Math.round((1 - lit) * (ramp.length - 1))));
      x.fillStyle = ramp[idx];
      x.fillRect(i, j, 1, 1);
    }
  }
  // a small sunlit crown speck near the top-right
  x.fillStyle = '#b4a996';
  x.fillRect(Math.round(cx + w * 0.16), Math.round(cy - h * 0.26), 1, 1);
  return c;
}

/** Cale's mansion — a two-storey stone house with a lit study window. */
function buildMansion(): HTMLCanvasElement {
  const W = 40;
  const H = 36;
  const [c, x] = makeCanvas(W, H);
  const wall = '#7c6e58';
  const wallD = '#5e5244';
  const wallL = '#96876c';
  // main block
  x.fillStyle = wall;
  x.fillRect(4, 14, 32, 20);
  x.fillStyle = wallL;
  x.fillRect(4, 14, 1, 20);
  x.fillStyle = wallD;
  x.fillRect(35, 14, 1, 20);
  for (let j = 14; j < 34; j++)
    for (let i = 4; i < 36; i++)
      if (hash2(i, j, 51) > 0.93) {
        x.fillStyle = wallD;
        x.fillRect(i, j, 1, 1);
      }
  // pitched roof
  x.fillStyle = '#3a322c';
  for (let j = 0; j < 12; j++) {
    const half = 2 + (j * 18) / 12;
    x.fillRect(Math.round(20 - half), 3 + j, Math.round(half * 2), 1);
  }
  x.fillStyle = '#55483c';
  x.fillRect(19, 2, 2, 2); // ridge cap
  x.fillStyle = 'rgba(0,0,0,0.3)';
  x.fillRect(4, 15, 32, 2); // eaves shadow
  // chimney
  x.fillStyle = wallD;
  x.fillRect(28, 4, 4, 8);
  x.fillStyle = wallL;
  x.fillRect(28, 4, 1, 8);
  // arched door
  x.fillStyle = '#241d16';
  x.fillRect(17, 25, 6, 9);
  x.fillRect(18, 24, 4, 1);
  x.fillStyle = '#4a3c2c';
  x.fillRect(16, 24, 1, 10);
  x.fillRect(23, 24, 1, 10);
  // windows — the study glows warm, the other is dark
  x.fillStyle = '#e8a850';
  x.fillRect(8, 18, 4, 5);
  x.fillStyle = '#5e5244';
  x.fillRect(10, 18, 1, 5);
  x.fillStyle = '#2a241c';
  x.fillRect(28, 18, 4, 5);
  return c;
}

/** The smithy — a low stone workshop with a glowing forge mouth and metalworking block. */
function buildSmithy(): HTMLCanvasElement {
  const W = 34;
  const H = 26;
  const [c, x] = makeCanvas(W, H);
  const wall = '#6e6250';
  const wallD = '#52483a';
  // body
  x.fillStyle = wall;
  x.fillRect(2, 10, 30, 14);
  x.fillStyle = '#84765e';
  x.fillRect(2, 10, 1, 14);
  x.fillStyle = wallD;
  x.fillRect(31, 10, 1, 14);
  for (let j = 10; j < 24; j++)
    for (let i = 2; i < 32; i++)
      if (hash2(i, j, 63) > 0.93) {
        x.fillStyle = wallD;
        x.fillRect(i, j, 1, 1);
      }
  // plank roof slab
  x.fillStyle = '#3f362e';
  x.fillRect(0, 7, 34, 4);
  x.fillStyle = '#2e2822';
  x.fillRect(0, 10, 34, 1);
  x.fillRect(8, 7, 1, 3);
  x.fillRect(18, 7, 1, 3);
  x.fillRect(26, 7, 1, 3);
  // chimney with a live ember mouth
  x.fillStyle = wallD;
  x.fillRect(25, 1, 4, 7);
  x.fillStyle = '#e8862a';
  x.fillRect(26, 1, 2, 1);
  // forge mouth: dark opening with banked coals
  x.fillStyle = '#17120e';
  x.fillRect(5, 13, 10, 11);
  x.fillStyle = '#c2521e';
  x.fillRect(7, 20, 6, 3);
  x.fillStyle = '#f09040';
  x.fillRect(8, 21, 4, 2);
  x.fillStyle = '#ffd080';
  x.fillRect(9, 22, 2, 1);
  // smithing block
  x.fillStyle = '#2a2c34';
  x.fillRect(20, 18, 8, 2);
  x.fillRect(22, 20, 3, 2);
  x.fillRect(21, 22, 6, 2);
  x.fillStyle = '#4a4e5a';
  x.fillRect(20, 18, 8, 1);
  return c;
}

/** Majula's monument — a tall weathered stone spire against the sunset. */
function buildMonument(): HTMLCanvasElement {
  const W = 16;
  const H = 40;
  const [c, x] = makeCanvas(W, H);
  // the tapered obelisk rises straight from the ground (no plinth block)
  for (let j = 2; j < H; j++) {
    const half = 3 + Math.floor((j - 2) / 12);
    for (let i = 8 - half; i < 8 + half; i++) {
      x.fillStyle = i === 8 - half ? '#a5906f' : i >= 7 + half ? '#5f5142' : '#87755a';
      if (hash2(i, j, 21) > 0.93) x.fillStyle = '#5f5142';
      x.fillRect(i, j, 1, 1);
    }
  }
  // faint waystone glyphs, barely alive
  for (const j of [10, 17, 24, 31]) {
    x.fillStyle = '#9fc3cc';
    x.fillRect(7, j, 2, 1);
  }
  return c;
}

/** The painter's easel — a tall wooden H-frame studio easel holding a big
 *  seascape: swirled blue sky, a sunset horizon, the sea's warm reflection
 *  and the beach below, like a plein-air canvas at dusk. Marks the Zine. */
function buildEasel(): HTMLCanvasElement {
  const W = 24;
  const H = 36;
  const [c, x] = makeCanvas(W, H);
  const WOOD = '#a0714a';
  const WOOD_D = '#6b4a2e';
  const WOOD_L = '#c89468';

  // center mast rising past the canvas, capped by the top clamp
  x.fillStyle = WOOD;
  x.fillRect(11, 2, 2, 30);
  x.fillStyle = WOOD_D;
  x.fillRect(12, 2, 1, 30);
  x.fillStyle = WOOD;
  x.fillRect(10, 0, 4, 3); // clamp block
  x.fillStyle = WOOD_L;
  x.fillRect(10, 0, 4, 1);

  // H-frame legs, gently splayed, with a crossbar between them
  for (let j = 0; j <= 12; j++) {
    const s = Math.floor(j * 0.18);
    x.fillStyle = j % 3 === 2 ? WOOD_D : WOOD;
    x.fillRect(5 - s, 22 + j, 2, 1);   // left leg
    x.fillRect(17 + s, 22 + j, 2, 1);  // right leg
  }
  x.fillStyle = WOOD_D;
  x.fillRect(6, 29, 12, 1); // crossbar
  x.fillStyle = WOOD;
  x.fillRect(6, 28, 12, 1);
  // horizontal foot rails, planted in the ground
  x.fillStyle = WOOD;
  x.fillRect(1, 33, 7, 2);
  x.fillRect(16, 33, 7, 2);
  x.fillStyle = WOOD_D;
  x.fillRect(1, 34, 7, 1);
  x.fillRect(16, 34, 7, 1);

  // the big canvas, edge-on wood frame around the painting
  x.fillStyle = '#8a6244';
  x.fillRect(4, 5, 16, 17);
  // — the painting: sky with swirls, sunset, sea, and the beach —
  x.fillStyle = '#6fa8cf'; // blue sky
  x.fillRect(5, 6, 14, 6);
  x.fillStyle = '#9cc8e4'; // brushy swirls in the sky
  x.fillRect(6, 7, 4, 1);
  x.fillRect(9, 8, 3, 1);
  x.fillRect(13, 6, 4, 1);
  x.fillRect(15, 9, 3, 1);
  x.fillRect(7, 10, 2, 1);
  x.fillStyle = '#efc27e'; // sunset glow band
  x.fillRect(5, 12, 14, 2);
  x.fillStyle = '#ffe4a8'; // the low sun
  x.fillRect(10, 11, 3, 2);
  x.fillStyle = '#5c7186'; // the sea
  x.fillRect(5, 14, 14, 3);
  x.fillStyle = '#d9915c'; // lit horizon line
  x.fillRect(5, 14, 14, 1);
  x.fillStyle = '#eda766'; // sun's reflection column
  x.fillRect(10, 14, 3, 3);
  x.fillStyle = '#b98c60'; // wet beach
  x.fillRect(5, 17, 14, 2);
  x.fillStyle = '#e8b47e'; // reflection running onto the sand
  x.fillRect(10, 17, 3, 1);
  x.fillStyle = '#c9a06e'; // dry sand foreground
  x.fillRect(5, 19, 14, 2);

  // the ledge the canvas rests on, flecked with old paint
  x.fillStyle = WOOD;
  x.fillRect(2, 22, 20, 2);
  x.fillStyle = WOOD_L;
  x.fillRect(2, 22, 20, 1);
  x.fillStyle = '#c96a4a';
  x.fillRect(6, 22, 1, 1);
  x.fillStyle = '#5c8ac0';
  x.fillRect(15, 22, 1, 1);
  x.fillStyle = '#e8e0cc';
  x.fillRect(11, 22, 1, 1);
  return c;
}

/** The pit — a stone-ringed hole into the dark, with a rope beam over it. */
function buildPit(): HTMLCanvasElement {
  const W = 40;
  const H = 24;
  const [c, x] = makeCanvas(W, H);
  const cx = 19;
  const cy = 16;
  const ellipse = (rx: number, ry: number, col: string) => {
    x.fillStyle = col;
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const dx = (i - cx) / rx;
        const dy = (j - cy) / ry;
        if (dx * dx + dy * dy <= 1) x.fillRect(i, j, 1, 1);
      }
  };
  ellipse(17, 7, '#5e5244');   // outer ring shadow
  ellipse(15.5, 6.2, '#8d7d64'); // stone ring
  ellipse(12.5, 5, '#3a322a'); // inner lip
  ellipse(11, 4.3, '#070605'); // the hole
  // ring stones texture
  for (let n = 0; n < 30; n++) {
    const a = hash2(n, 3, 8) * Math.PI * 2;
    x.fillStyle = hash2(n, 9, 2) > 0.5 ? '#a5947a' : '#52483a';
    x.fillRect(Math.floor(cx + Math.cos(a) * 14), Math.floor(cy + Math.sin(a) * 5.6), 1, 1);
  }
  // something faintly luminous, far below
  x.fillStyle = '#16404e';
  x.fillRect(15, 15, 2, 1);
  x.fillRect(22, 17, 1, 1);
  return c;
}

/* ============================ TILES ============================ */

function buildTileVariants(kind: 'ash' | 'grass' | 'path' | 'cliff' | 'sand', count: number): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let v = 0; v < count; v++) {
    const [c, x] = makeCanvas(TILE, TILE);
    for (let j = 0; j < TILE; j++) {
      for (let i = 0; i < TILE; i++) {
        const n = hash2(i + v * 61, j + v * 17, kind.length * 13);
        let col: string;
        if (kind === 'ash') {
          // dry sun-baked earth
          col = n > 0.94 ? '#685c4a' : n > 0.86 ? '#4e4436' : n < 0.04 ? '#615544' : '#574c3d';
        } else if (kind === 'grass') {
          // tall dry Majula grass, gold-green
          col = n > 0.9 ? '#847a48' : n > 0.8 ? '#665e3a' : n < 0.05 ? '#48432c' : '#585138';
        } else if (kind === 'cliff') {
          // warm coastal rock
          col = n > 0.93 ? '#564b42' : n < 0.06 ? '#2c2620' : '#3d352d';
        } else if (kind === 'sand') {
          // pale beach sand
          col = n > 0.92 ? '#d3bf96' : n > 0.84 ? '#ac9670' : n < 0.05 ? '#cdb890' : '#c4ad84';
        } else {
          col = '#645c50';
        }
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    if (kind === 'path') {
      // paving stones with worn, subtle mortar lines
      const off = (v * 5) % 8;
      x.fillStyle = '#4e473c';
      x.fillRect(0, 5, TILE, 1);
      x.fillRect(0, 11, TILE, 1);
      x.fillRect((3 + off) % TILE, 0, 1, 5);
      x.fillRect((9 + off) % TILE, 6, 1, 5);
      x.fillRect((5 + off * 3) % TILE, 12, 1, 4);
      x.fillStyle = '#746c5e';
      x.fillRect((4 + off) % TILE, 2, 2, 1);
      x.fillRect((10 + off) % TILE, 8, 2, 1);
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          const n2 = hash2(i + v * 7, j + v * 3, 77);
          if (n2 > 0.93) {
            x.fillStyle = '#554e44';
            x.fillRect(i, j, 1, 1);
          } else if (n2 < 0.05) {
            x.fillStyle = '#6e6558';
            x.fillRect(i, j, 1, 1);
          }
        }
    }
    if (kind === 'cliff') {
      // cracks
      let cx0 = Math.floor(hash2(v, 1, 5) * TILE);
      for (let j = 0; j < TILE; j++) {
        cx0 += hash2(v, j, 6) > 0.5 ? 1 : -1;
        x.fillStyle = '#1d1814';
        x.fillRect(((cx0 % TILE) + TILE) % TILE, j, 1, 1);
      }
    }
    out.push(c);
  }
  return out;
}

/* ============================ BACKDROPS ============================ */

/** Ruins drowned in the sea — a sunken manor, broken walls, a lighthouse. */
function buildDrownedRuins(): HTMLCanvasElement {
  const W = 340;
  const H = 80;
  const [c, x] = makeCanvas(W, H);
  const body = '#503f4a';
  const lit = '#8a6553';
  const dark = '#3a2d38';

  const erode = (x0: number, y0: number, w: number, h: number) => {
    for (let j = y0; j < y0 + h; j++)
      for (let i = x0; i < x0 + w; i++)
        if (hash2(i, j, 71) > 0.94) {
          x.fillStyle = dark;
          x.fillRect(i, j, 1, 1);
        }
  };

  // sunken manor
  x.fillStyle = body;
  x.fillRect(20, 30, 90, 50);
  // broken parapet
  for (let i = 20; i < 110; i += 7) {
    const hh = 2 + Math.floor(hash2(i, 1, 13) * 5);
    x.fillRect(i, 30 - hh, 5, hh);
  }
  // sunlit right edges
  x.fillStyle = lit;
  x.fillRect(108, 30, 2, 50);
  x.fillRect(103, 26, 2, 4);
  // arched dark windows, one still lit
  for (let k = 0; k < 4; k++) {
    x.fillStyle = k === 2 ? '#ffb060' : '#241c26';
    x.fillRect(30 + k * 20, 42, 6, 10);
    x.fillRect(31 + k * 20, 40, 4, 2);
  }
  erode(20, 30, 90, 50);

  // collapsed wall running toward the tower, gapped by the sea
  x.fillStyle = body;
  x.fillRect(115, 62, 30, 18);
  x.fillRect(155, 68, 22, 12);
  x.fillStyle = lit;
  x.fillRect(143, 62, 2, 18);
  erode(115, 62, 62, 18);

  // broken tower stub
  x.fillStyle = body;
  x.fillRect(190, 44, 24, 36);
  for (let i = 190; i < 214; i += 6) {
    const hh = 2 + Math.floor(hash2(i, 5, 13) * 6);
    x.fillRect(i, 44 - hh, 4, hh);
  }
  x.fillStyle = lit;
  x.fillRect(212, 44, 2, 36);
  erode(190, 44, 24, 36);

  // the lighthouse, lamp still burning
  x.fillStyle = body;
  x.fillRect(268, 16, 16, 64);
  x.fillStyle = lit;
  x.fillRect(282, 16, 2, 64);
  // gallery ring + lamp room
  x.fillStyle = dark;
  x.fillRect(264, 14, 24, 3);
  x.fillStyle = body;
  x.fillRect(270, 6, 12, 8);
  x.fillStyle = '#ffd080';
  x.fillRect(273, 8, 6, 4);
  x.fillStyle = dark;
  x.fillRect(268, 4, 16, 2);
  erode(268, 16, 16, 60);
  return c;
}

/** Flat-topped cliff headland across the bay, a watchtower on its brow. */
function buildHeadland(): HTMLCanvasElement {
  const W = 240;
  const H = 64;
  const [c, x] = makeCanvas(W, H);
  x.fillStyle = '#463641';
  x.beginPath();
  x.moveTo(0, H);
  x.lineTo(0, 14);
  // flat plateau top with slight noise
  for (let i = 0; i <= 150; i += 10) x.lineTo(i, 12 + hash2(i, 2, 91) * 3);
  // cliff face stepping down into the sea
  x.lineTo(162, 22);
  x.lineTo(176, 36);
  x.lineTo(192, 52);
  x.lineTo(206, H);
  x.closePath();
  x.fill();
  // sunlit brow
  x.fillStyle = '#7c5a4e';
  for (let i = 0; i <= 148; i += 2) x.fillRect(i, Math.round(12 + hash2(i - (i % 10), 2, 91) * 3), 2, 1);
  x.fillRect(150, 14, 12, 1);
  // watchtower silhouette on top
  x.fillStyle = '#3a2d38';
  x.fillRect(116, 0, 9, 13);
  x.fillRect(114, 0, 13, 2);
  x.fillStyle = 'rgba(255,176,96,0.8)';
  x.fillRect(119, 4, 2, 2);
  return c;
}

function buildSun(): HTMLCanvasElement {
  const S = 56;
  const [c, x] = makeCanvas(S, S);
  const r = S / 2 - 2;
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const dx = i - S / 2;
      const dy = j - S / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r) {
        // low golden sun, brighter at the core, hazy toward the limb
        const shade = d / r;
        let col = '#f8c178';
        if (shade > 0.45) col = '#f3b46d';
        if (shade > 0.72) col = '#f1a863';
        if (shade > 0.9) col =  '#e89c54';
        // faint horizontal haze bands cutting the disc, sunset style
        if ((j === Math.floor(S * 0.62) || j === Math.floor(S * 0.74)) && hash2(i, j, 7) > 0.2) {
          col = '#e89c54';
        }
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
  return c;
}

/* ============================ ENTRY ============================ */

export function generateSprites(): Sprites {
  return {
    hero: buildHero(),
    bonfireBase: stringArt(BONFIRE_ROWS, BONFIRE_PAL),
    flameFrames: buildFlameFrames(),
    pillars: [buildPillar(11, 40), buildPillar(23, 52), buildPillar(37, 30)],
    deadTrees: [buildDeadTree(5), buildDeadTree(29), buildDeadTree(53), buildDeadTree(71)],
    grassTufts: [buildGrassTuft(2), buildGrassTuft(9), buildGrassTuft(15)],
    rocks: [buildRock(4), buildRock(12), buildRock(27), buildRock(31), buildRock(44)],
    mansion: buildMansion(),
    smithy: buildSmithy(),
    monument: buildMonument(),
    // half the area (linear √0.5) so the easel reads as a modest bedside prop
    easel: scaleCanvas(buildEasel(), Math.SQRT1_2),
    pit: buildPit(),
    tiles: {
      ash: buildTileVariants('ash', 4),
      grass: buildTileVariants('grass', 3),
      path: buildTileVariants('path', 3),
      cliff: buildTileVariants('cliff', 3),
      sand: buildTileVariants('sand', 3),
    },
    drownedRuins: buildDrownedRuins(),
    headland: buildHeadland(),
    sun: buildSun(),
  };
}
