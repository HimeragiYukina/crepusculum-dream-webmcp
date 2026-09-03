/**
 * The hub world — an explorable dream at dusk.
 * Owns the tile map, props, hero, camera, particles, dynamic lighting and the
 * per-frame render into the HD-2D compositor's scene/glow layers.
 */
import { Sprites, TILE } from './sprites';
import { mulberry32, hash2 } from './rng';
import { Compositor } from './post';

export const enum T { VOID = 0, CLIFF = 1, ASH = 2, GRASS = 3, PATH = 4, WATER = 5, SAND = 6, SEA = 7 }

export const MAP_W = 32;
export const MAP_H = 20;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

/**
 * A collision box for a prop, in px relative to its foot (the sprite's
 * bottom-center anchor). `dx`/`dy` are the box's top-left offset off the foot
 * (dy negative = above the foot); `w`/`h` its size. An empty box (w or h ≤ 0)
 * means the prop does NOT block. `hop` marks a low obstacle the hero can jump
 * over. Pass one to `add()` to tune manually; omit for the sprite's default.
 */
export interface HitboxSpec {
  dx: number;
  dy: number;
  w: number;
  h: number;
  hop?: boolean;
}

export interface POI {
  id: string;
  label: string;
  sub: string;
  verb: string;
  /** 'menu' opens the bonfire travel menu; otherwise the level id to travel to */
  action: 'menu' | string;
  /** shared tile anchor — the landmark's sprite, label and interaction all derive from this */
  tx: number;
  ty: number;
  /** interaction radius in world px around the anchor */
  radius: number;
  /** world-px offset above the anchor where the floating label hangs */
  labelDy: number;
  /** sprite key drawn on the landmark (see spriteFor in placeProps) */
  sprite: string;
  /** tile offset of the sprite off the shared anchor */
  spriteDx: number;
  spriteDy: number;
  /** px offset of the baked shadow's root off the sprite foot (0 = no shadow cast for the pit) */
  shadowDx: number;
  shadowDy: number;
  /** collision box (foot-relative px); omit for the sprite default, empty {..w:0} to not block */
  hitbox?: HitboxSpec;
}

export const POIS: POI[] = [
  { id: 'bonfire', label: 'Fast Travel', sub: 'Rest and travel between pages', verb: 'REST', action: 'menu', tx: 16, ty: 11.5, radius: 30, labelDy: -40, sprite: 'bonfireBase', spriteDx: 0, spriteDy: 0, shadowDx: 0, shadowDy: 0 },
  { id: 'projects', label: 'Projects', sub: 'Non-academic projects', verb: 'DESCEND', action: 'projects', tx: 9, ty: 12, radius: 34, labelDy: -8, sprite: 'pit', spriteDx: 0, spriteDy: 1, shadowDx: 0, shadowDy: 0, hitbox: { dx: -16, dy: -15, w: 32, h: 14 } },
  { id: 'research', label: 'Research', sub: "Research projects and publications", verb: 'ENTER', action: 'research', tx: 23, ty: 11, radius: 28, labelDy: -36, sprite: 'mansion', spriteDx: 0, spriteDy: 0, shadowDx: -1, shadowDy: -3 },
  { id: 'mods', label: 'Mods', sub: 'Mods for video games', verb: 'ENTER', action: 'mods', tx: 20.5, ty: 15, radius: 28, labelDy: -28, sprite: 'smithy', spriteDx: 0, spriteDy: 0, shadowDx: 0, shadowDy: -2 },
  { id: 'zine', label: 'Zine', sub: 'A poetry zine on a painter\'s easel', verb: 'READ', action: 'zine', tx: 22, ty: 6.5, radius: 26, labelDy: -32, sprite: 'easel', spriteDx: 0, spriteDy: 0, shadowDx: 0, shadowDy: 0 },
  { id: 'about', label: 'About', sub: 'About me, this site, and its WebMCP tools', verb: 'INSPECT', action: 'about', tx: 13, ty: 6, radius: 28, labelDy: -42, sprite: 'monument', spriteDx: 0, spriteDy: 0, shadowDx: 0, shadowDy: 0 },
];

/** A landmark's shared tile anchor, by id. */
export const poiById = (id: string): POI => POIS.find((p) => p.id === id)!;

/**
 * Peninsula layout — the single place to tune where everything sits. All
 * positions are tile units (× TILE = world px, tile 0,0 top-left of the map).
 *
 * Landmark sprites, floating labels and interaction zones all derive from
 * their POI's shared (tx, ty) above; every other fixture and route lives
 * here. Centers that coincide with a landmark (plaza, stone ring, pit hole)
 * reference that landmark's anchor via poiById() so no position is duplicated.
 */
export const LAYOUT = {
  /** hero spawn tile */
  heroStart: { tx: 14, ty: 15 },

  /** fixed decorative props: sprite key + tile, optional collision hitbox */
  props: [
    { sprite: 'deadTree', tx: 10, ty: 9 , hitbox: { dx: -4, dy: -6, w: 8, h: 6 } },
    { sprite: 'pillar', tx: 26, ty: 15 },
    { sprite: 'pillar', tx: 8, ty: 17 },
  ] as { sprite: string; tx: number; ty: number; hitbox?: HitboxSpec }[],

  /** stone ring around the bonfire: count, elliptical radii + jitter (px), and
   *  the ring center as an offset off the bonfire anchor (cxTile in tiles, cyPx in px) */
  bonfireRing: { count: 13, rx: 24, ry: 12, jitterR: 5, jitterY: 3, cxTile: 0.5, cyPx: 11 },

  /** boulder-field tiles (south-east) */
  boulders: [[21, 14], [23, 15], [25, 14], [22, 16], [24, 17], [20, 15]] as [number, number][],

  /** walkable paths through the plaza: polylines of tile waypoints (all begin at the bonfire) */
  paths: [
    [[16, 11], [15, 9], [14, 8]], // bonfire → monument
    [[16, 11], [13, 12], [12, 12]], // bonfire → pit
    [[16, 11], [21, 12], [23, 12]], // bonfire → mansion
    [[16, 11], [14, 14], [12, 16]], // bonfire → smithy
  ] as [number, number][][],

  /** bonfire plaza disc (centered on the bonfire anchor): squared tile radius */
  plaza: { r2: 10 },

  /** impassable pit hole (centered on the abyss anchor): x² weight + squared tile radius */
  pitHole: { xWeight: 0.6, r2: 3.2 },

  /** counts for the seeded scatter decoration */
  scatter: { deadTrees: 0, rocks: 6, grassTufts: 45 },
};

interface Prop {
  img: HTMLCanvasElement;
  x: number; // anchor: bottom-center, world px
  y: number;
  /** cast a realtime shadow each frame (see renderShadows) */
  shadow: boolean;
  /** px offset of the shadow's root off the sprite foot */
  shDx: number;
  shDy: number;
}

interface Ember { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number }
interface Flake { x: number; y: number; spd: number; sway: number }
interface FogBlob { x: number; y: number; spd: number; scale: number; alpha: number }
interface Wisp { cx: number; cy: number; r: number; spd: number; ph: number }
interface Dust { x: number; y: number; vx: number; vy: number; life: number; max: number }

const HORIZON_ROW = 5;
/** DEBUG: outline every collision hitbox in bold yellow. Flip to true to tune. */
const SHOW_HITBOXES = false;
/** DEBUG: tint every walkable tile green (where the hero may navigate). */
const SHOW_WALKABLE = false;
const HERO_SPEED = 122;
/** WASD speed multiplier while Shift is held */
const SHIFT_SPRINT = 1.7;
/**
 * Click-to-move speed shaping (WASD always moves at the flat HERO_SPEED).
 * The hero sprints on long trips: the total path length scales its speed up to
 * SPRINT_MAX× at SPRINT_DIST px. Its speed *along* the path is then shaped by a
 * 1-D cubic Bézier through SPEED_CURVE (slow off the mark → cruise → ease into
 * arrival). Tune these knobs.
 */
const SPRINT_MAX = 2.7; // top speed multiplier on the longest trips
const SPRINT_DIST = 480; // path length (px) at which SPRINT_MAX is reached
const SPEED_CURVE: readonly [number, number, number, number] = [0.55, 1.2, 1.2, 0.4]; // speed vs progress
/**
 * Camera follow smoothing (only when the window is narrower than the world):
 * the camera chases the hero at CAM_SPEED × a 1-D cubic Bézier of its lag
 * (CAM_CURVE maps lag/CAM_DIST ∈ [0,1] → speed fraction) — a soft settle when
 * nearly centered, ramping to a swift catch-up when the hero outruns the view.
 */
const CAM_CURVE: readonly [number, number, number, number] = [0.1, 0.6, 0.7, 1];
const CAM_DIST = 200; // lag (px) at which the camera reaches full chase speed
const CAM_SPEED = 380; // full chase speed (px/s) — outruns the fastest sprint

/** 1-D cubic Bézier value at u ∈ [0,1] through four control values. */
function bezier1(u: number, p: readonly [number, number, number, number]): number {
  const m = 1 - u;
  return m * m * m * p[0] + 3 * m * m * u * p[1] + 3 * m * u * u * p[2] + u * u * u * p[3];
}

export class World {
  grid = new Uint8Array(MAP_W * MAP_H);
  /** per-prop collision boxes in world px; `hop` boxes can be jumped over */
  private hitboxes: { x: number; y: number; w: number; h: number; hop: boolean }[] = [];
  private variant = new Uint8Array(MAP_W * MAP_H);
  private props: Prop[] = [];
  private ground!: HTMLCanvasElement;
  private sky!: HTMLCanvasElement;
  private fogSprite!: HTMLCanvasElement;
  private lightmap!: HTMLCanvasElement;
  private lightCtx!: CanvasRenderingContext2D;
  /** offscreen layer the frame's cast shadows composite into (viewport-sized) */
  private shadowLayer!: HTMLCanvasElement;
  private shadowCtx!: CanvasRenderingContext2D;
  /** black silhouettes of prop sprites, cached and reused as shadows */
  private silCache = new Map<HTMLCanvasElement, HTMLCanvasElement>();

  hero = { x: LAYOUT.heroStart.tx * TILE, y: LAYOUT.heroStart.ty * TILE, dir: 0, moving: false, walked: 0, z: 0, vz: 0 };
  private path: { x: number; y: number }[] = [];
  private pathTotalLen = 1; // full length of the active click path (px)
  private pathTraveled = 0; // distance covered so far along it (px)
  private heroPrevX = LAYOUT.heroStart.tx * TILE; // hero position at last frame end
  private heroPrevY = LAYOUT.heroStart.ty * TILE;
  private moveResolve: ((ok: boolean) => void) | null = null;

  camX = 0;
  camY = 0;
  /** snap the camera straight to its target on the next frame (no smoothing) */
  private camSnap = true;

  private embers: Ember[] = [];
  private flakes: Flake[] = [];
  private fog: FogBlob[] = [];
  private wisps: Wisp[] = [];
  private dust: Dust[] = [];
  /** shoreline foam samples along the analytic coast, with inland normals */
  private shore: { x: number; y: number; nx: number; ny: number; ph: number }[] = [];
  private seaPattern!: HTMLCanvasElement;

  constructor(private spr: Sprites) {
    this.buildMap();
    this.buildGround();
    this.buildSky();
    this.buildFogSprite();
    this.buildSeaPattern();
    this.initParticles();
  }

  /* ---------------- map generation ---------------- */

  at(tx: number, ty: number): T {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T.CLIFF;
    return this.grid[ty * MAP_W + tx] as T;
  }
  private set(tx: number, ty: number, t: T): void {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    this.grid[ty * MAP_W + tx] = t;
  }
  /** Is (world-px) point inside a solid collision box? `hop` boxes are ignored while airborne. */
  private inHitbox(x: number, y: number, airborne: boolean): boolean {
    for (const b of this.hitboxes) {
      if (airborne && b.hop) continue;
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
    }
    return false;
  }
  /** Does any solid collision box overlap this tile? (tile-grained, for pathfinding) */
  private tileHitbox(tx: number, ty: number, airborne: boolean): boolean {
    const x0 = tx * TILE;
    const y0 = ty * TILE;
    for (const b of this.hitboxes) {
      if (airborne && b.hop) continue;
      if (x0 < b.x + b.w && x0 + TILE > b.x && y0 < b.y + b.h && y0 + TILE > b.y) return true;
    }
    return false;
  }
  private terrainOk(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    const t = this.at(tx, ty);
    return t === T.ASH || t === T.GRASS || t === T.PATH || t === T.SAND;
  }
  /**
   * The hero stays on the solid headland, not the thin coastal fringe: tiles
   * are walkable only where their center clears the beach fade (`inlandAt`),
   * matching the visual land edge. This closes the one-tile "gaps" where the
   * wobbly coast pinches and would otherwise leak a route off the peninsula.
   * Authored `PATH` tiles are trusted as-is so plaza/approach routes never break.
   */
  private onLand(tx: number, ty: number): boolean {
    return this.at(tx, ty) === T.PATH || this.inlandAt((tx + 0.5) * TILE, (ty + 0.5) * TILE);
  }
  /** Fine-grained: can the hero's foot occupy this world-px point? */
  private canStandPx(x: number, y: number, airborne: boolean): boolean {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!this.terrainOk(tx, ty) || this.inHitbox(x, y, airborne)) return false;
    return this.at(tx, ty) === T.PATH || this.inlandAt(x, y);
  }
  /** Ground walkability (rocks are solid) — the hero may stand here on foot. */
  walkable(tx: number, ty: number): boolean {
    return this.terrainOk(tx, ty) && this.onLand(tx, ty) && !this.tileHitbox(tx, ty, false);
  }
  walkableAtPx(x: number, y: number): boolean {
    return this.walkable(Math.floor(x / TILE), Math.floor(y / TILE));
  }
  /** Traversable for click navigation — hop boxes (rocks) are crossable. */
  private pathable(tx: number, ty: number): boolean {
    return this.terrainOk(tx, ty) && this.onLand(tx, ty) && !this.tileHitbox(tx, ty, true);
  }
  /** Is this world-px point inside a hoppable (rock) box? */
  private inHopBox(x: number, y: number): boolean {
    for (const b of this.hitboxes) {
      if (b.hop && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
    }
    return false;
  }

  /**
   * Continuous land field in world px: >0 inland, 0 at the waterline, <0 at
   * sea. The tile grid samples this at tile centers for gameplay; the ground
   * bakes the same field per-pixel, so the visual coastline is smooth.
   */
  private landValue(x: number, y: number): number {
    const i = x / TILE;
    const j = y / TILE;
    const a = Math.atan2(j - 15, i - 16);
    const wob =
      1 + 0.2 * Math.sin(a * 3 + 1.7) + 0.14 * Math.sin(a * 5 - 0.6) + 0.07 * Math.sin(a * 9 + 4.1) + 0.045 * Math.sin(a * 13 + 0.7);
    const rx = Math.min(14 * wob, 13.5);
    const dx = (i - 16) / rx;
    const dy = (j - 15) / (10.5 * wob);
    let v = j <= 15 ? 1 - (dx * dx + dy * dy) : 1 - dx * dx;
    // press the field down as it nears the horizon: rows above
    // HORIZON_ROW - 1 are never painted, so without this the north coast
    // would run off the drawable band and get chopped along a straight
    // line. The quadratic ramp bends it into a smooth curve instead,
    // keeping the whole coastline below j = 6.2 - 2.1 = 4.1.
    if (j < 6.2) {
      const u = (6.2 - j) / 2.1;
      v -= u * u;
    }
    return v;
  }

  /**
   * Beach width factor along the coast (by angle around the peninsula):
   * some stretches are broad sandy beaches, others nearly bare bluffs —
   * uniform rings read as artificial.
   */
  private beachWidth(x: number, y: number): number {
    const a = Math.atan2(y / TILE - 15, x / TILE - 16);
    const m = 0.8 + 0.42 * Math.sin(a * 4 + 0.9) + 0.28 * Math.sin(a * 7 + 2.2);
    return Math.max(0.35, Math.min(1.4, m));
  }

  /**
   * True when a world-px point lies on inland ground — past the beach fade,
   * mirroring the thresholds the per-pixel ground pass paints with. Props and
   * their shadows must sit only where this holds, or they'd straddle the sand.
   */
  private inlandAt(x: number, y: number): boolean {
    const m = this.beachWidth(x, y);
    const wetW = 0.05 * (0.6 + 0.4 * m);
    const dryW = Math.max(wetW + 0.02, 0.13 * m);
    return this.landValue(x, y) >= dryW + 0.11 * m;
  }

  private buildMap(): void {
    // open sea below the sky; the peninsula is carved out of it
    for (let j = 0; j < MAP_H; j++)
      for (let i = 0; i < MAP_W; i++)
        this.set(i, j, j < HORIZON_ROW - 1 ? T.VOID : T.SEA);

    // the peninsula: an organic headland reaching north out of the south
    // shore — tiles sample the continuous land field at their centers
    for (let j = HORIZON_ROW; j < MAP_H; j++)
      for (let i = 1; i < MAP_W - 1; i++)
        if (this.landValue((i + 0.5) * TILE, (j + 0.5) * TILE) > 0) this.set(i, j, T.ASH);

    // grass patches (low-frequency noise)
    for (let j = 0; j < MAP_H; j++)
      for (let i = 0; i < MAP_W; i++) {
        if (this.at(i, j) !== T.ASH) continue;
        const n = hash2(i >> 1, j >> 1, 12) * 0.6 + hash2(i >> 2, j >> 2, 5) * 0.4;
        if (n > 0.68) this.set(i, j, T.GRASS);
      }

    // paths between POIs through the bonfire plaza
    const carve = (pts: [number, number][]) => {
      for (let s = 0; s < pts.length - 1; s++) {
        const [x0, y0] = pts[s];
        const [x1, y1] = pts[s + 1];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
        for (let k = 0; k <= steps; k++) {
          const fx = x0 + ((x1 - x0) * k) / steps;
          const fy = y0 + ((y1 - y0) * k) / steps;
          for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
            const ti = Math.round(fx) + ox;
            const tj = Math.round(fy) + oy;
            if (tj >= HORIZON_ROW + 1 && this.at(ti, tj) !== T.WATER) this.set(ti, tj, T.PATH);
          }
        }
      }
    };
    for (const path of LAYOUT.paths) carve(path);

    // plaza disc, centered on the bonfire anchor
    const bf = poiById('bonfire');
    const plazaRad = Math.ceil(Math.sqrt(LAYOUT.plaza.r2));
    for (let j = -plazaRad; j <= plazaRad; j++)
      for (let i = -plazaRad; i <= plazaRad; i++)
        if (i * i + j * j <= LAYOUT.plaza.r2 && this.at(bf.tx + i, bf.ty + j) !== T.WATER) this.set(bf.tx + i, bf.ty + j, T.PATH);

    // the pit reads as a hole via its sprite; the ground under it stays ASH so
    // the terrain never blocks a phantom region — the pit's own prop hitbox is
    // the sole collider (see placeProps). Painting ASH here keeps the disc under
    // the stone ring uniform (no stray grass showing through the rim).
    const projects = poiById('projects');
    const pitRad = Math.ceil(Math.sqrt(LAYOUT.pitHole.r2));
    for (let j = -pitRad; j <= pitRad; j++)
      for (let i = -pitRad; i <= pitRad; i++)
        if (i * i * LAYOUT.pitHole.xWeight + j * j <= LAYOUT.pitHole.r2) this.set(projects.tx + i, projects.ty + j, T.ASH);

    // guarantee POI approach tiles are walkable
    for (const p of POIS) {
      for (const [ox, oy] of [[0, 1], [1, 1], [-1, 1], [0, 2]] as const) {
        const t = this.at(p.tx + ox, p.ty + oy);
        if (t === T.CLIFF || t === T.SEA) this.set(p.tx + ox, p.ty + oy, T.ASH);
      }
    }

    // sample the analytic coastline every few pixels: wherever the land
    // field changes sign, store the crossing point and its inland normal —
    // the foam animates along these normals, following the smooth coast
    this.shore = [];
    const STEP = 3;
    for (let y = (HORIZON_ROW - 1) * TILE; y < WORLD_H; y += STEP) {
      for (let x = 0; x < WORLD_W; x += STEP) {
        const v = this.landValue(x, y);
        const vx = this.landValue(x + STEP, y);
        const vy = this.landValue(x, y + STEP);
        if ((v > 0) === (vx > 0) && (v > 0) === (vy > 0)) continue;
        const gxv = vx - v;
        const gyv = vy - v;
        const gl = Math.hypot(gxv, gyv) || 1;
        this.shore.push({ x, y, nx: gxv / gl, ny: gyv / gl, ph: Math.atan2(y - 240, x - 256) * 5 });
      }
    }

    // tile variants for texture variety
    for (let j = 0; j < MAP_H; j++)
      for (let i = 0; i < MAP_W; i++)
        this.variant[j * MAP_W + i] = Math.floor(hash2(i, j, 99) * 4);
  }

  /* ---------------- static layers ---------------- */

  private buildGround(): void {
    this.ground = document.createElement('canvas');
    this.ground.width = WORLD_W;
    this.ground.height = WORLD_H;
    const g = this.ground.getContext('2d')!;
    g.imageSmoothingEnabled = false;

    const tilesFor = (t: T): HTMLCanvasElement[] | null => {
      switch (t) {
        case T.ASH: return this.spr.tiles.ash;
        case T.GRASS: return this.spr.tiles.grass;
        case T.PATH: return this.spr.tiles.path;
        case T.CLIFF: return this.spr.tiles.cliff;
        case T.SAND: return this.spr.tiles.sand;
        // pit tiles stay impassable but are painted as ground — the pit
        // sprite's dark hole provides the visual
        case T.WATER: return this.spr.tiles.ash;
        // sea stays transparent: the live sea layer renders beneath the
        // ground so the map edge dissolves into open water, borderless
        default: return null;
      }
    };

    for (let j = 0; j < MAP_H; j++) {
      for (let i = 0; i < MAP_W; i++) {
        const t = this.at(i, j);
        // sea tiles are painted as sand so the smooth per-pixel coastline
        // always has beach texture to reveal, however far the curve bulges;
        // the smoothing pass below erases everything seaward of the curve
        const set = tilesFor(t) ?? (t === T.SEA ? this.spr.tiles.sand : null);
        if (!set) continue;
        const img = set[this.variant[j * MAP_W + i] % set.length];
        g.drawImage(img, i * TILE, j * TILE);
      }
    }

    // smooth coastline: the whole beach is generated per-pixel from the
    // continuous land field — sea gets erased, then a wet rim, dry sand, and
    // a dithered blend into the inland ground, all following the same curve
    const y0 = (HORIZON_ROW - 1) * TILE;
    const img = g.getImageData(0, y0, WORLD_W, WORLD_H - y0);
    const data = img.data;
    const put = (o: number, c: number) => {
      data[o] = (c >> 16) & 0xff;
      data[o + 1] = (c >> 8) & 0xff;
      data[o + 2] = c & 0xff;
    };
    const drySand = (x: number, y: number): number => {
      const n = hash2(x, y, 83);
      return n > 0.92 ? 0xd3bf96 : n > 0.84 ? 0xac9670 : n < 0.05 ? 0xcdb890 : 0xc4ad84;
    };
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        const o = (y * WORLD_W + x) * 4;
        if (data[o + 3] === 0) continue;
        const v = this.landValue(x, y + y0);
        if (v < 0) {
          data[o + 3] = 0;
          continue;
        }
        const m = this.beachWidth(x, y + y0);
        const wetW = 0.05 * (0.6 + 0.4 * m);
        const dryW = Math.max(wetW + 0.02, 0.13 * m);
        const fadeW = dryW + 0.11 * m;
        if (v < wetW) {
          const n = hash2(x, y, 83);
          put(o, n > 0.85 ? 0x8f7d63 : n < 0.08 ? 0x6e5f4b : 0x84725a); // wet sand
        } else if (v < dryW) {
          put(o, drySand(x, y)); // dry beach
        } else if (v < fadeW && hash2(x, y, 91) < (fadeW - v) / (fadeW - dryW)) {
          put(o, drySand(x, y)); // dithered fade into the inland ground
        }
      }
    }
    g.putImageData(img, 0, y0);

    this.placeProps(g);
  }

  private placeProps(g: CanvasRenderingContext2D): void {
    const s = this.spr;
    const rnd = mulberry32(20260707);
    const px = (tx: number, ty: number) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE });
    // the default collision box for a sprite: a thin band across its base row
    // (nothing above, so the hero can walk behind it). Short props don't block.
    const defaultHitbox = (img: HTMLCanvasElement): HitboxSpec | null => {
      if (img.height <= 12) return null;
      const w = Math.min(img.width, TILE * 2.2);
      return { dx: -w / 2, dy: -8, w, h: 8 };
    };
    // `hitbox` (foot-relative px) is optional: omit → the sprite default above;
    // pass a rect to tune; pass an empty rect (w/h ≤ 0) to make it non-blocking.
    // Shadows are NOT baked here: shadow-casting props render their shadow every
    // frame from the live on-screen sun position (see renderShadows), so the
    // cast direction tracks the sun when the window resizes.
    const add = (img: HTMLCanvasElement, tx: number, ty: number, jx = 0, jy = 0, shadow = true, shadowDx = 0, shadowDy = 0, hitbox?: HitboxSpec | null) => {
      const p = px(tx, ty);
      this.props.push({ img, x: p.x + jx, y: p.y + jy, shadow, shDx: shadowDx, shDy: shadowDy });
      // register the collision box (foot-relative → world px). undefined uses
      // the sprite default; an empty box (w/h ≤ 0) or null means "no collision"
      const hb = hitbox === undefined ? defaultHitbox(img) : hitbox;
      if (hb && hb.w > 0 && hb.h > 0) {
        this.hitboxes.push({ x: p.x + jx + hb.dx, y: p.y + jy + hb.dy, w: hb.w, h: hb.h, hop: !!hb.hop });
      }
    };

    // a rock's collision box: its lower body, hoppable (the hero jumps over it)
    const rockHitbox = (img: HTMLCanvasElement): HitboxSpec => {
      const h = Math.round(img.height * 0.7);
      return { dx: -img.width / 2, dy: -h, w: img.width, h, hop: true };
    };

    // sprite keys referenced by POIS and LAYOUT (positions live in the config)
    const spriteFor: Record<string, HTMLCanvasElement> = {
      bonfireBase: s.bonfireBase,
      pit: s.pit,
      mansion: s.mansion,
      smithy: s.smithy,
      monument: s.monument,
      easel: s.easel,
      deadTree: s.deadTrees[1],
      pillar: s.pillars[2],
    };

    // landmark sprites — each sits on its POI's shared anchor plus its offset;
    // the pit is a hole in the ground (no shadow); only the House and Forge
    // lift their shadow root into the sprite base
    for (const p of POIS) {
      add(spriteFor[p.sprite], p.tx + p.spriteDx, p.ty + p.spriteDy, 0, 0, p.sprite !== 'pit', p.shadowDx, p.shadowDy, p.hitbox);
    }

    // decorative props must sit wholly on inland ground: their base and the
    // baked shadow ellipse may not straddle the beach fade, sand or sea
    const sitsInland = (img: HTMLCanvasElement, tx: number, ty: number, jx = 0, jy = 0): boolean => {
      const p = px(tx, ty);
      const ax = p.x + jx;
      const ay = p.y + jy;
      const rx = img.width * 0.42 + 2; // shadow half-width + margin
      return (
        this.inlandAt(ax, ay + 3) &&
        this.inlandAt(ax, ay - 6) &&
        this.inlandAt(ax - rx, ay - 1) &&
        this.inlandAt(ax + rx, ay - 1) &&
        this.inlandAt(ax - rx * 0.7, ay + 3) &&
        this.inlandAt(ax + rx * 0.7, ay + 3)
      );
    };

    // fixed decorative props — a lone bare tree by the Far Fire, broken pillars
    for (const pr of LAYOUT.props) add(spriteFor[pr.sprite], pr.tx, pr.ty, 0, 0, true, 0, 0, pr.hitbox);

    // ring of stones around the Far Fire, Majula style (baked, walkable)
    const bf = poiById('bonfire');
    const ring = LAYOUT.bonfireRing;
    for (let sN = 0; sN < ring.count; sN++) {
      const a = (sN / ring.count) * Math.PI * 2 + rnd() * 0.25;
      const sxp = Math.round((bf.tx + ring.cxTile) * TILE + Math.cos(a) * (ring.rx + rnd() * ring.jitterR));
      const syp = Math.round(bf.ty * TILE + ring.cyPx + Math.sin(a) * (ring.ry + rnd() * ring.jitterY));
      g.fillStyle = '#3a322a';
      g.fillRect(sxp - 1, syp, 4, 2);
      g.fillStyle = '#8d7d64';
      g.fillRect(sxp - 1, syp - 1, 3, 2);
      g.fillStyle = '#a5947a';
      g.fillRect(sxp - 1, syp - 1, 2, 1);
    }

    // boulder field (south-east)
    for (const [tx, ty] of LAYOUT.boulders) {
      if (!this.walkable(tx, ty)) continue;
      const img = s.rocks[Math.floor(rnd() * s.rocks.length)];
      const jx = Math.floor(rnd() * 6) - 3;
      const jy = Math.floor(rnd() * 4) - 2;
      if (!sitsInland(img, tx, ty, jx, jy)) continue;
      add(img, tx, ty, jx, jy, false, 0, 0, rockHitbox(img)); // stones: no shadow, hoppable
    }

    // scattered decoration, avoiding paths and POI surroundings
    const nearPOI = (tx: number, ty: number) =>
      POIS.some((p) => (p.tx - tx) ** 2 + (p.ty - ty) ** 2 < 16);
    const tryScatter = (imgs: HTMLCanvasElement[], count: number, nearCliff: boolean, castShadow = true, hopBlock = false) => {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < 900) {
        const tx = 2 + Math.floor(rnd() * (MAP_W - 4));
        const ty = HORIZON_ROW + 2 + Math.floor(rnd() * (MAP_H - HORIZON_ROW - 4));
        if (!this.walkable(tx, ty) || this.at(tx, ty) === T.PATH || nearPOI(tx, ty)) continue;
        if (nearCliff) {
          // "nearCliff" now means near the coast: bare trees haunt the shore
          let adj = false;
          for (let oj = -2; oj <= 2 && !adj; oj++)
            for (let oi = -2; oi <= 2 && !adj; oi++) {
              const tt = this.at(tx + oi, ty + oj);
              if (tt === T.SEA || tt === T.CLIFF) adj = true;
            }
          if (!adj) continue;
        }
        const img = imgs[Math.floor(rnd() * imgs.length)];
        const jx = Math.floor(rnd() * 8) - 4;
        const jy = Math.floor(rnd() * 6) - 3;
        if (!sitsInland(img, tx, ty, jx, jy)) continue;
        add(img, tx, ty, jx, jy, castShadow, 0, 0, hopBlock ? rockHitbox(img) : undefined);
        placed++;
      }
    };
    tryScatter(s.deadTrees, LAYOUT.scatter.deadTrees, true);
    tryScatter(s.rocks, LAYOUT.scatter.rocks, false, false, true); // stones: no shadow, hoppable block

    // grass tufts bake directly into the ground (no depth sorting needed)
    let placed = 0;
    let guard = 0;
    while (placed < LAYOUT.scatter.grassTufts && guard++ < 2500) {
      const tx = 2 + Math.floor(rnd() * (MAP_W - 4));
      const ty = HORIZON_ROW + 2 + Math.floor(rnd() * (MAP_H - HORIZON_ROW - 4));
      const t = this.at(tx, ty);
      if ((t !== T.ASH && t !== T.GRASS) || nearPOI(tx, ty)) continue;
      const img = s.grassTufts[Math.floor(rnd() * s.grassTufts.length)];
      const gx0 = tx * TILE + Math.floor(rnd() * 8);
      const gy0 = ty * TILE + Math.floor(rnd() * 8);
      // tufts bake into the ground, so they too must stay off the beach
      if (!this.inlandAt(gx0, gy0) || !this.inlandAt(gx0 + img.width, gy0) ||
          !this.inlandAt(gx0, gy0 + img.height) || !this.inlandAt(gx0 + img.width, gy0 + img.height)) continue;
      g.drawImage(img, gx0, gy0);
      placed++;
    }

    this.props.sort((a, b) => a.y - b.y);
  }

  private buildSky(): void {
    // Majula at golden hour: dusty blue-violet overhead melting into a blaze
    // of amber at the sea, with heavy sunset clouds rimmed in light. Laid out
    // at the thin sky band's aspect so the whole gradient and every cloud
    // stay visible when it is drawn between the screen top and the skyline.
    this.sky = document.createElement('canvas');
    this.sky.width = 760;
    this.sky.height = 88;
    const x = this.sky.getContext('2d')!;
    const grad = x.createLinearGradient(0, 0, 0, 88);
    grad.addColorStop(0, '#3c3654');
    grad.addColorStop(0.35, '#6e5a70');
    grad.addColorStop(0.62, '#c07850');
    grad.addColorStop(0.85, '#eda45c');
    grad.addColorStop(1, '#f8c878');
    x.fillStyle = grad;
    x.fillRect(0, 0, 760, 88);

    // dramatic clouds: dark slate bodies, undersides caught by the sun
    const cloud = (cx0: number, cy0: number, w: number, h: number, seed: number) => {
      for (let j = -h; j <= h; j++) {
        const t = j / h;
        const rowW = w * Math.sqrt(Math.max(0, 1 - t * t)) * (0.72 + 0.5 * hash2(seed, j, 17));
        const rx = Math.round(cx0 - rowW / 2 + (hash2(seed, j, 23) - 0.5) * 10);
        x.fillStyle = j >= h - 2 ? '#c08060' : j <= -h + 2 ? '#443a58' : '#4c3c54';
        x.fillRect(rx, cy0 + j, Math.round(rowW), 1);
        // ragged rim-lit wisps trailing off the bright edge
        if (j === h - 1 && hash2(seed, j, 31) > 0.4) {
          x.fillStyle = '#cf9060';
          x.fillRect(rx + Math.round(rowW), cy0 + j, Math.round(6 + hash2(seed, 7, 5) * 14), 1);
        }
      }
    };
    cloud(110, 12, 120, 8, 1);
    cloud(210, 15, 80, 5, 8);
    cloud(340, 8, 150, 7, 2);
    cloud(620, 14, 130, 8, 3);
    cloud(540, 19, 70, 4, 9);
    cloud(500, 28, 100, 5, 4);
    cloud(160, 34, 80, 4, 5);
    cloud(690, 38, 90, 4, 6);
    cloud(300, 44, 110, 4, 7);
  }

  /** Subtle tileable noise overlaid on the open sea so it doesn't read flat. */
  private buildSeaPattern(): void {
    this.seaPattern = document.createElement('canvas');
    this.seaPattern.width = 64;
    this.seaPattern.height = 64;
    const x = this.seaPattern.getContext('2d')!;
    for (let n = 0; n < 150; n++) {
      const px = Math.floor(hash2(n, 1, 57) * 64);
      const py = Math.floor(hash2(n, 2, 57) * 64);
      const w = hash2(n, 3, 57) > 0.7 ? 3 : 2;
      x.fillStyle = hash2(n, 4, 57) > 0.5 ? 'rgba(255,245,235,0.05)' : 'rgba(0,0,10,0.09)';
      x.fillRect(px, py, w, 1);
    }
  }

  private buildFogSprite(): void {
    this.fogSprite = document.createElement('canvas');
    this.fogSprite.width = 140;
    this.fogSprite.height = 56;
    const x = this.fogSprite.getContext('2d')!;
    const grd = x.createRadialGradient(70, 28, 4, 70, 28, 66);
    grd.addColorStop(0, 'rgba(215,190,150,0.45)');
    grd.addColorStop(1, 'rgba(215,190,150,0)');
    x.fillStyle = grd;
    x.save();
    x.translate(70, 28);
    x.scale(1, 0.4);
    x.translate(-70, -28);
    x.beginPath();
    x.arc(70, 28, 66, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }

  private initParticles(): void {
    const rnd = mulberry32(77);
    for (let i = 0; i < 22; i++) {
      this.flakes.push({ x: rnd() * WORLD_W, y: rnd() * WORLD_H, spd: 4 + rnd() * 7, sway: rnd() * Math.PI * 2 });
    }
    for (let i = 0; i < 6; i++) {
      this.fog.push({
        x: rnd() * WORLD_W,
        y: (HORIZON_ROW + 4) * TILE + rnd() * (WORLD_H - (HORIZON_ROW + 8) * TILE),
        spd: 2 + rnd() * 4,
        scale: 0.9 + rnd() * 1.6,
        alpha: 0.05 + rnd() * 0.08,
      });
    }
    // soul wisps drift around the monument and the pit, anchored to each POI
    const mon = poiById('about');
    const projects = poiById('projects');
    const anchors = [
      { x: mon.tx * TILE + 8, y: mon.ty * TILE - 6.4 },
      { x: projects.tx * TILE + 8, y: projects.ty * TILE + 6.4 },
    ];
    for (let i = 0; i < 7; i++) {
      const a = anchors[i % anchors.length];
      this.wisps.push({ cx: a.x, cy: a.y, r: 10 + rnd() * 22, spd: 0.3 + rnd() * 0.5, ph: rnd() * Math.PI * 2 });
    }
  }

  /* ---------------- hero movement ---------------- */

  /** A little hop — from a Space press or a click on the hero. */
  jump(): void {
    if (this.hero.z === 0 && this.hero.vz === 0) this.hero.vz = 88;
  }

  /** WASD axis movement; cancels any click path. Holding Shift sprints. */
  moveAxis(ax: number, ay: number, dt: number, sprint = false): void {
    if (ax === 0 && ay === 0) return;
    this.cancelPath(false);
    const speed = HERO_SPEED * (sprint ? SHIFT_SPRINT : 1);
    this.step(ax * speed * dt, ay * speed * dt);
    this.faceFrom(ax, ay);
  }

  private faceFrom(vx: number, vy: number): void {
    if (Math.abs(vx) > Math.abs(vy)) this.hero.dir = vx > 0 ? 2 : 3;
    else if (vy !== 0) this.hero.dir = vy > 0 ? 0 : 1;
  }

  /** All four of the hero's foot-corner points clear at (x, y)? */
  private footClear(x: number, y: number, air: boolean): boolean {
    return (
      this.canStandPx(x - 4, y - 2, air) && this.canStandPx(x + 4, y - 2, air) &&
      this.canStandPx(x - 4, y + 1, air) && this.canStandPx(x + 4, y + 1, air)
    );
  }

  /** collision-aware move with axis sliding */
  private step(dx: number, dy: number): void {
    const h = this.hero;
    const air = h.z > 0 || h.vz > 0; // mid-hop (incl. the launch frame): rocks pass
    let moved = false;
    if (dx !== 0 && this.footClear(h.x + dx, h.y, air)) { h.x += dx; moved = true; }
    if (dy !== 0 && this.footClear(h.x, h.y + dy, air)) { h.y += dy; moved = true; }
    if (moved) h.walked += Math.hypot(dx, dy);
    h.moving = moved;
  }

  /** BFS path to a world position; resolves when arrived (or false if unreachable). */
  requestMoveTo(wx: number, wy: number): Promise<boolean> {
    this.cancelPath(false);
    const start = { x: Math.floor(this.hero.x / TILE), y: Math.floor(this.hero.y / TILE) };
    let goal = { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
    if (!this.walkable(goal.x, goal.y)) {
      const near = this.nearestWalkable(goal.x, goal.y, 6);
      if (!near) return Promise.resolve(false);
      goal = near;
    }
    const path = this.bfs(start, goal);
    if (!path) return Promise.resolve(false);
    this.path = path.map((n) => ({ x: n.x * TILE + TILE / 2, y: n.y * TILE + TILE / 2 }));
    // final nudge to the exact requested point if it's in the goal tile
    if (this.walkableAtPx(wx, wy)) this.path.push({ x: wx, y: wy });
    // total path length drives the sprint speed (further destination → faster)
    let total = 0;
    let px = this.hero.x;
    let py = this.hero.y;
    for (const n of this.path) {
      total += Math.hypot(n.x - px, n.y - py);
      px = n.x;
      py = n.y;
    }
    this.pathTotalLen = Math.max(1, total);
    this.pathTraveled = 0;
    return new Promise((resolve) => (this.moveResolve = resolve));
  }

  cancelPath(resolveOk: boolean): void {
    this.path = [];
    if (this.moveResolve) {
      this.moveResolve(resolveOk);
      this.moveResolve = null;
    }
  }

  private nearestWalkable(tx: number, ty: number, maxR: number): { x: number; y: number } | null {
    for (let r = 1; r <= maxR; r++)
      for (let j = -r; j <= r; j++)
        for (let i = -r; i <= r; i++)
          if (Math.max(Math.abs(i), Math.abs(j)) === r && this.walkable(tx + i, ty + j))
            return { x: tx + i, y: ty + j };
    return null;
  }

  private bfs(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number }[] | null {
    if (a.x === b.x && a.y === b.y) return [];
    const prev = new Int32Array(MAP_W * MAP_H).fill(-2);
    const qx = new Int32Array(MAP_W * MAP_H);
    const qy = new Int32Array(MAP_W * MAP_H);
    let head = 0;
    let tail = 0;
    qx[tail] = a.x; qy[tail] = a.y; tail++;
    prev[a.y * MAP_W + a.x] = -1;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    while (head < tail) {
      const cx = qx[head];
      const cy = qy[head];
      head++;
      for (const [di, dj] of dirs) {
        const nx = cx + di;
        const ny = cy + dj;
        if (!this.pathable(nx, ny) || prev[ny * MAP_W + nx] !== -2) continue;
        // no diagonal corner cutting
        if (di !== 0 && dj !== 0 && (!this.pathable(cx + di, cy) || !this.pathable(cx, cy + dj))) continue;
        prev[ny * MAP_W + nx] = cy * MAP_W + cx;
        if (nx === b.x && ny === b.y) {
          const out: { x: number; y: number }[] = [];
          let cur = ny * MAP_W + nx;
          while (cur !== a.y * MAP_W + a.x) {
            out.push({ x: cur % MAP_W, y: Math.floor(cur / MAP_W) });
            cur = prev[cur];
          }
          out.reverse();
          return out;
        }
        qx[tail] = nx; qy[tail] = ny; tail++;
      }
    }
    return null;
  }

  /* ---------------- update & render ---------------- */

  update(dt: number, t: number): void {
    // follow click path
    if (this.path.length > 0) {
      const next = this.path[0];
      const dx = next.x - this.hero.x;
      const dy = next.y - this.hero.y;
      const d = Math.hypot(dx, dy);
      if (d < 2.5) {
        this.path.shift();
        if (this.path.length === 0) {
          this.hero.moving = false;
          this.cancelPath(true);
        }
      } else {
        // sprint on long trips, then shape the speed along the path by the Bézier
        const sprint = 1 + (SPRINT_MAX - 1) * Math.min(1, this.pathTotalLen / SPRINT_DIST);
        const u = Math.min(1, this.pathTraveled / this.pathTotalLen);
        const speed = HERO_SPEED * sprint * bezier1(u, SPEED_CURVE);
        const stepLen = Math.min(speed * dt, d);
        const sx = (dx / d) * stepLen;
        const sy = (dy / d) * stepLen;
        // the path may cross rocks — hop over them: jump when the hero (or the
        // waypoint it walks toward) is inside a rock's box, or the moment the
        // next step is corner-blocked on foot yet clear mid-air, i.e. only a
        // hoppable rock stands in the way. The last test is what catches boxes
        // that block the hero's ±4px foot corners while both point checks miss.
        if (
          this.inHopBox(this.hero.x, this.hero.y) ||
          this.inHopBox(next.x, next.y) ||
          (!this.footClear(this.hero.x + sx, this.hero.y + sy, false) &&
            this.footClear(this.hero.x + sx, this.hero.y + sy, true))
        ) {
          this.jump();
        }
        this.step(sx, sy);
        this.pathTraveled += stepLen;
        this.faceFrom(dx, dy);
        if (!this.hero.moving) this.cancelPath(false); // stuck against geometry
      }
    }
    // hero.moving is (re)derived from actual displacement further below, so it
    // stays correct for WASD movement too — no need to clear it here

    // jump arc: simple ballistic hop; a puff of dust greets the landing
    if (this.hero.z > 0 || this.hero.vz !== 0) {
      this.hero.vz -= 340 * dt;
      this.hero.z += this.hero.vz * dt;
      if (this.hero.z <= 0) {
        this.hero.z = 0;
        this.hero.vz = 0;
        for (let k = 0; k < 7; k++) {
          this.dust.push({
            x: this.hero.x + (Math.random() - 0.5) * 10,
            y: this.hero.y + 1 + (Math.random() - 0.5) * 3,
            vx: (Math.random() - 0.5) * 26,
            vy: -2 - Math.random() * 6,
            life: 0,
            max: 0.3 + Math.random() * 0.3,
          });
        }
      }
    }

    // whether the hero actually moved this frame (works for WASD and click
    // paths alike, unlike the transient `moving` flag) — also drives the anim
    const frameMoved = Math.hypot(this.hero.x - this.heroPrevX, this.hero.y - this.heroPrevY);
    this.hero.moving = frameMoved > 0.1;
    this.heroPrevX = this.hero.x;
    this.heroPrevY = this.hero.y;

    // running kicks up dust at the hero's heels, a little denser when sprinting
    const runFactor = Math.min(1.6, 0.7 + frameMoved / (HERO_SPEED * dt || 1));
    if (this.hero.moving && this.hero.z === 0 && Math.random() < dt * 26 * runFactor) {
      this.dust.push({
        x: this.hero.x + (Math.random() - 0.5) * 7,
        y: this.hero.y + 1 + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 10,
        vy: -4 - Math.random() * 7,
        life: 0,
        max: 0.35 + Math.random() * 0.35,
      });
    }
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const d = this.dust[i];
      d.life += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy *= 1 - 2.2 * dt;
      if (d.life > d.max) this.dust.splice(i, 1);
    }

    // embers from the bonfire, anchored to the bonfire POI (+0.5 tile x, +6px)
    const bf = poiById('bonfire');
    const fx = bf.tx * TILE + 8;
    const fy = bf.ty * TILE + 6;
    if (Math.random() < dt * 14) {
      this.embers.push({
        x: fx + (Math.random() - 0.5) * 6,
        y: fy + Math.random() * 6,
        vx: (Math.random() - 0.5) * 6,
        vy: -14 - Math.random() * 16,
        life: 0,
        max: 1.6 + Math.random() * 2.4,
        hue: Math.random(),
      });
    }
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life += dt;
      e.x += (e.vx + Math.sin(t * 3 + e.max * 7) * 6) * dt;
      e.y += e.vy * dt;
      e.vy *= 1 - 0.25 * dt;
      if (e.life > e.max) this.embers.splice(i, 1);
    }
    for (const f of this.flakes) {
      f.y += f.spd * dt;
      f.x += Math.sin(t * 0.6 + f.sway) * 3 * dt - 2 * dt;
      if (f.y > WORLD_H) { f.y = HORIZON_ROW * TILE; f.x = Math.random() * WORLD_W; }
      if (f.x < 0) f.x += WORLD_W;
    }
    for (const b of this.fog) {
      b.x += b.spd * dt;
      if (b.x - 120 > WORLD_W) b.x = -120;
    }
  }

  /**
   * The dusk horizon alone — sky band, sun, clouds, open sea, headland,
   * drowned ruins, reflections and glitter; no peninsula, props or hero.
   * Article pages run this behind their content so every page shares the
   * hub's living backdrop. The camera centers on the world horizontally and
   * bottom-anchors like the hub, and the hub's golden-hour ambient multiply
   * is applied (without its POI lights) so the tone matches.
   */
  renderBackdrop(comp: Compositor, t: number): void {
    const sx = comp.sceneCtx;
    const gx = comp.glowCtx;
    const vw = comp.vw;
    const vh = comp.vh;
    this.camX = (WORLD_W - vw) / 2;
    this.camY = WORLD_H - vh;
    const cx = Math.round(this.camX);
    const cy = Math.round(this.camY);
    gx.clearRect(0, 0, vw, vh);
    this.renderSkySea(sx, gx, vw, vh, cx, cy, t);
    sx.save();
    sx.globalCompositeOperation = 'multiply';
    sx.fillStyle = 'rgb(224,204,178)'; // golden-hour ambient (see applyLighting)
    sx.fillRect(0, 0, vw, vh);
    sx.restore();
  }

  /**
   * Everything beyond the shore: sky gradient and clouds, the sinking sun and
   * its glow, the far headland and drowned ruins, the open-sea gradient and
   * drifting texture, the sun's reflection and shimmer path, surface rocks
   * and water glitter. Shared by the hub render and the article backdrop.
   */
  private renderSkySea(
    sx: CanvasRenderingContext2D, gx: CanvasRenderingContext2D,
    vw: number, vh: number, cx: number, cy: number, t: number,
  ): { horizonY: number; sunCx: number; sunY: number } {
    const horizonY = HORIZON_ROW * TILE - cy;
    // where the tile-sea begins (one row above HORIZON_ROW)
    const cliffTop = (HORIZON_ROW - 1) * TILE - cy;
    const seaTop = cliffTop - 34;

    /* --- sky: the full violet-to-amber band between screen top and the
       skyline, so the whole gradient and every cloud stay visible --- */
    sx.fillStyle = '#3c3654';
    sx.fillRect(0, 0, vw, vh);
    sx.drawImage(this.sky, 0, 0, this.sky.width, this.sky.height, 0, 0, vw, Math.max(1, Math.round(seaTop) + 2));

    // low golden sun, sinking into the sea — the waterline occludes its lower
    // third (the sea fill below paints over the scene copy; the glow copy is
    // clipped so the bloom stops at the waterline too)
    const sunX = Math.round(vw * 0.66 - cx * 0.03);
    const sunY = Math.round(seaTop - 26);
    const sunCx = sunX + 28;
    sx.drawImage(this.spr.sun, sunX, sunY);
    gx.save();
    gx.beginPath();
    gx.rect(0, 0, vw, Math.max(0, seaTop));
    gx.clip();
    gx.globalAlpha = 0.55;
    gx.drawImage(this.spr.sun, sunX, sunY);
    gx.restore();
    // the halo tracks the sun: centered on the visible part of the disc —
    // midway between its top and the waterline (clamped to the disc center
    // when the sun rides fully above the sea)
    const haloY = Math.round(Math.min(sunY + 28, (sunY + seaTop) / 2));
    this.emissive(gx, sunCx, haloY, 110, 'rgba(255,190,110,0.28)');

    // the headland across the bay and the ruins drowned in the shallows —
    // both drawn with their feet below the waterline, so the sea swallows them
    const hl = this.spr.headland;
    const hw = Math.round(hl.width * 0.65);
    const hh = Math.round(hl.height * 0.65);
    // the cliff always stays left of the sun: on narrow viewports the sun
    // (riding at ~2/3 width) drifts toward the parallax-anchored headland,
    // so cap the headland's right edge just short of the disc
    const hlX = Math.min(Math.round(-cx * 0.05 - 12), sunX - hw - 8);
    sx.drawImage(hl, hlX, Math.round(seaTop + 4 - hh), hw, hh);
    const ru = this.spr.drownedRuins;
    const rw = Math.round(ru.width * 0.4);
    const rh = Math.round(ru.height * 0.4);
    sx.drawImage(ru, Math.round(vw * 0.3 - rw / 2 - cx * 0.1), Math.round(seaTop + 3 - rh), rw, rh);

    // the ocean: one continuous gradient from the glowing horizon line all
    // the way down the screen — it also fills the margins around the map,
    // so the world has no visible border
    if (seaTop < vh) {
      const span = Math.max(1, vh - seaTop);
      // the sunset glow is confined to a narrow band at the horizon: the sea
      // must reach its stable body color before the northern coastline so the
      // water reads the same on both sides of the peninsula
      const seaG = sx.createLinearGradient(0, seaTop, 0, vh);
      seaG.addColorStop(0, '#c98a52');
      seaG.addColorStop(Math.min(1, 16 / span), '#8a6260');
      seaG.addColorStop(Math.min(1, 32 / span), '#5a4b58');
      seaG.addColorStop(Math.min(1, 52 / span), '#453e50');
      seaG.addColorStop(Math.min(1, 180 / span), '#332e42');
      seaG.addColorStop(1, '#252031');
      sx.fillStyle = seaG;
      sx.fillRect(0, Math.max(0, seaTop), vw, vh - Math.max(0, seaTop));
      // drifting texture, anchored to the world so it doesn't swim on resize
      sx.save();
      sx.beginPath();
      sx.rect(0, Math.max(0, seaTop + 12), vw, vh);
      sx.clip();
      const px0 = -(((cx % 64) + 64) % 64) - 64;
      const py0 = -(((cy % 64) + 64) % 64) - 64;
      for (let yy = py0; yy < vh; yy += 64)
        for (let xx = px0; xx < vw; xx += 64)
          sx.drawImage(this.seaPattern, xx, yy);
      sx.restore();
    }

    // the sun's mirrored reflection, vertically compressed and faded
    sx.save();
    sx.beginPath();
    sx.rect(0, seaTop, vw, cliffTop - seaTop + 2);
    sx.clip();
    sx.globalAlpha = 0.4;
    sx.translate(0, 1.5 * seaTop);
    sx.scale(1, -0.5);
    sx.drawImage(this.spr.sun, sunX, sunY);
    sx.restore();
    // a shimmering reflection path widening all the way to the shore
    // (the land is drawn later, so it clips the path naturally)
    for (let y2 = Math.round(seaTop) + 2; y2 < vh; y2++) {
      const k = (y2 - seaTop) / (cliffTop - seaTop);
      const w2 = Math.min(64, 5 + k * 36);
      const a = Math.max(0.05, 0.24 * (1 - k * 0.3)) * (0.7 + 0.3 * Math.sin(t * 2.2 + y2 * 1.7));
      sx.fillStyle = `rgba(255,198,120,${a.toFixed(2)})`;
      const jit = (hash2(y2, 3, 29) - 0.5) * 7;
      sx.fillRect(Math.round(sunCx - w2 / 2 + jit), y2, Math.round(w2), 1);
    }

    // dark rocks and drowned spires breaking the surface
    for (let k2 = 0; k2 < 10; k2++) {
      const n = hash2(k2, 5, 33);
      const spx = Math.round(n * vw);
      const depth = hash2(k2, 9, 33); // 0 far, 1 near
      const hgt = 3 + depth * 9;
      const baseY = Math.round(seaTop + 4 + depth * (cliffTop - seaTop - 7));
      sx.fillStyle = '#241c26';
      for (let r2 = 0; r2 < hgt; r2++) {
        const w3 = Math.max(1, Math.round((1 - r2 / hgt) * (2 + depth * 4)));
        sx.fillRect(spx - (w3 >> 1) + (r2 % 3 === 0 ? 1 : 0), baseY - r2, w3, 1);
      }
      // sunlit flank + foam at the waterline
      sx.fillStyle = 'rgba(240,170,100,0.55)';
      sx.fillRect(spx + 1, baseY - Math.round(hgt * 0.6), 1, Math.round(hgt * 0.4));
      sx.fillStyle = 'rgba(240,214,170,0.45)';
      sx.fillRect(spx - 2, baseY + 1, 5, 1);
    }

    // glitter across all open water, densest in the sun's reflection column
    for (let i = 0; i < vw; i += 2) {
      const n = hash2(i, 7, 9);
      const ph = Math.sin(t * (0.8 + n) + n * 40 + i * 0.3);
      if (ph > 0.6) {
        const gy2 = seaTop + 2 + Math.floor(n * Math.max(1, vh - seaTop - 3));
        const nearSun = Math.abs(i - sunCx) < 30;
        sx.fillStyle = nearSun ? 'rgba(255,214,140,0.9)' : 'rgba(210,190,190,0.32)';
        sx.fillRect(i, gy2, 1, 1);
        if (nearSun && ph > 0.85 && gy2 < cliffTop) {
          gx.fillStyle = 'rgba(255,214,140,0.5)';
          gx.fillRect(i, gy2, 1, 1);
        }
      }
    }

    return { horizonY, sunCx, sunY };
  }

  render(comp: Compositor, t: number, dt: number): void {
    const sx = comp.sceneCtx;
    const gx = comp.glowCtx;
    const vw = comp.vw;
    const vh = comp.vh;

    // camera: the peninsula is anchored to the bottom of the screen (the
    // view height covers the whole world plus the sky band, so the south
    // edge always sits on the screen bottom and the skyline lands at ~20%);
    // horizontally the map is centered when it fits, else the camera chases
    // the hero — its speed shaped by the CAM_CURVE Bézier of its lag, so it
    // settles softly when close and catches up swiftly when the hero runs
    const targetX = vw >= WORLD_W ? (WORLD_W - vw) / 2 : Math.max(0, Math.min(WORLD_W - vw, this.hero.x - vw / 2));
    if (vw >= WORLD_W || this.camSnap) {
      this.camX = targetX; // fixed centered view, or first frame after (re)entry
      this.camSnap = false;
    } else {
      const lag = targetX - this.camX;
      const v = CAM_SPEED * bezier1(Math.min(1, Math.abs(lag) / CAM_DIST), CAM_CURVE);
      this.camX += Math.sign(lag) * Math.min(Math.abs(lag), v * dt);
    }
    this.camY = WORLD_H - vh;
    const cx = Math.round(this.camX);
    const cy = Math.round(this.camY);

    const lp = (id: string, dx = 0, dy = 0) => this.lightPos(id, dx, dy, cx, cy);

    gx.clearRect(0, 0, vw, vh);

    /* --- sky, sun, sea and everything beyond the shore --- */
    const { horizonY, sunCx, sunY } = this.renderSkySea(sx, gx, vw, vh, cx, cy, t);

    /* --- ground --- */
    sx.drawImage(this.ground, -cx, -cy);

    /* --- waves lapping against the shore --- */
    // each sample slides along its inland normal: the swash runs up the
    // smooth beach curve and withdraws, with a fainter trailing foam line
    for (const f of this.shore) {
      const bx = f.x - cx;
      const by = f.y - cy;
      if (bx < -8 || by < -8 || bx > vw + 8 || by > vh + 8) continue;
      const s2 = (Math.sin(t * 1.6 + f.ph) + 1) * 0.5;
      const run = -2.5 + s2 * 6.5;
      const aF = 0.24 + 0.42 * s2;
      const aT = 0.1 + 0.14 * (1 - s2);
      const vert = Math.abs(f.nx) > Math.abs(f.ny);
      sx.fillStyle = `rgba(240,234,216,${aF.toFixed(2)})`;
      sx.fillRect(Math.round(bx + f.nx * run), Math.round(by + f.ny * run), vert ? 1 : 3, vert ? 3 : 1);
      sx.fillStyle = `rgba(240,234,216,${aT.toFixed(2)})`;
      sx.fillRect(Math.round(bx + f.nx * (run - 4)), Math.round(by + f.ny * (run - 4)), vert ? 1 : 3, vert ? 3 : 1);
    }

    // a faint soul-light breathing up out of the pit
    const pool = lp('projects', 8, 20);
    const poolSX = pool.x;
    const poolSY = pool.y;
    const pg = gx.createRadialGradient(poolSX, poolSY, 2, poolSX, poolSY, 22);
    const pulse = 0.28 + 0.1 * Math.sin(t * 1.4);
    pg.addColorStop(0, `rgba(80,190,255,${pulse.toFixed(2)})`);
    pg.addColorStop(1, 'rgba(80,190,255,0)');
    gx.fillStyle = pg;
    gx.beginPath();
    gx.ellipse(poolSX, poolSY, 22, 10, 0, 0, Math.PI * 2);
    gx.fill();

    /* --- run dust at the hero's heels --- */
    for (const d of this.dust) {
      const ex = d.x - cx;
      const ey = d.y - cy;
      if (ex < 0 || ey < 0 || ex > vw || ey > vh) continue;
      const k = 1 - d.life / d.max;
      sx.fillStyle = `rgba(196,178,148,${(k * 0.55).toFixed(2)})`;
      const sz = d.life < d.max * 0.4 ? 2 : 1;
      sx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, sz, sz);
    }

    /* --- props + hero, y-sorted --- */
    const heroImg = this.heroFrame(t);
    const heroEntry = { img: heroImg, x: this.hero.x, y: this.hero.y + 3, isHero: true };
    let inserted = false;
    for (const p of this.props) {
      if (!inserted && heroEntry.y < p.y) {
        this.drawHero(sx, heroImg, cx, cy, t);
        inserted = true;
      }
      const dx = Math.round(p.x - p.img.width / 2 - cx);
      const dy = Math.round(p.y - p.img.height - cy);
      if (dx > -p.img.width && dy > -p.img.height && dx < vw && dy < vh) sx.drawImage(p.img, dx, dy);
    }
    if (!inserted) this.drawHero(sx, heroImg, cx, cy, t);

    /* --- realtime cast shadows — projected from the sun as it renders this
       frame (sunCx/sunY are screen coords; + cam = world). Drawn after the
       props so shadows fall across stones and anything else on the ground --- */
    this.renderShadows(sx, vw, vh, cx, cy, sunCx + cx, sunY + 22 + cy);

    /* --- bonfire flame --- */
    // the fire sits on the ash mound at the base of the coiled sword
    const flame = this.spr.flameFrames[Math.floor(t * 12) % this.spr.flameFrames.length];
    const flBase = lp('bonfire', 8, 12); // fire foot: +0.5 tile x, +12px below the anchor
    const flX = Math.round(flBase.x - flame.width / 2);
    const flY = Math.round(flBase.y - flame.height);
    sx.drawImage(flame, flX, flY);
    gx.save();
    gx.globalAlpha = 0.5;
    gx.drawImage(flame, flX, flY);
    gx.restore();
    // flame core glow — kept soft so the ashen body of the fire stays readable
    const fglow = lp('bonfire', 8, 4);
    const fgx = fglow.x;
    const fgy = fglow.y;
    const fg = gx.createRadialGradient(fgx, fgy, 2, fgx, fgy, 26);
    const flick = 0.5 + 0.1 * Math.sin(t * 11) + 0.06 * Math.sin(t * 23 + 1);
    fg.addColorStop(0, `rgba(255,170,70,${(flick * 0.6).toFixed(2)})`);
    fg.addColorStop(1, 'rgba(255,170,70,0)');
    gx.fillStyle = fg;
    gx.fillRect(fgx - 28, fgy - 28, 56, 56);

    /* --- landmark glows (runes, candle, shrine tips) --- */
    const glyph = lp('about', 8, -12.8);
    this.emissive(gx, glyph.x, glyph.y, 10, `rgba(120,200,220,${(0.18 + 0.06 * Math.sin(t * 2)).toFixed(2)})`); // monument glyphs
    const wnd = lp('research', -1.6, 1.6);
    this.emissive(gx, wnd.x, wnd.y, 8, 'rgba(255,180,100,0.5)'); // mansion study window
    const coals = lp('mods', 1.6, 9.6);
    this.emissive(gx, coals.x, coals.y, 11, `rgba(255,140,60,${(0.45 + 0.12 * Math.sin(t * 9)).toFixed(2)})`); // forge coals

    /* --- wisps --- */
    for (const wsp of this.wisps) {
      const a = t * wsp.spd + wsp.ph;
      const wx2 = wsp.cx + Math.cos(a) * wsp.r - cx;
      const wy2 = wsp.cy + Math.sin(a * 1.7) * wsp.r * 0.4 - Math.sin(a) * 4 - cy;
      if (wx2 < 0 || wy2 < 0 || wx2 > vw || wy2 > vh) continue;
      const al = 0.35 + 0.25 * Math.sin(a * 3);
      gx.fillStyle = `rgba(140,220,255,${al.toFixed(2)})`;
      gx.fillRect(Math.round(wx2), Math.round(wy2), 1, 1);
      sx.fillStyle = `rgba(190,235,255,${al.toFixed(2)})`;
      sx.fillRect(Math.round(wx2), Math.round(wy2), 1, 1);
    }

    /* --- embers & ash --- */
    for (const e of this.embers) {
      const ex = e.x - cx;
      const ey = e.y - cy;
      if (ex < 0 || ey < 0 || ex > vw || ey > vh) continue;
      const k = 1 - e.life / e.max;
      const col = e.hue > 0.6 ? `rgba(255,194,94,${k.toFixed(2)})` : `rgba(232,110,42,${k.toFixed(2)})`;
      sx.fillStyle = col;
      sx.fillRect(Math.round(ex), Math.round(ey), 1, 1);
      gx.fillStyle = col;
      gx.fillRect(Math.round(ex), Math.round(ey), 1, 1);
    }
    sx.fillStyle = 'rgba(220,200,165,0.5)';
    for (const f of this.flakes) {
      const ex = f.x - cx;
      const ey = f.y - cy;
      if (ex < 0 || ey < horizonY || ex > vw || ey > vh) continue;
      sx.fillRect(Math.round(ex), Math.round(ey), 1, 1);
    }

    /* --- ground fog --- */
    sx.save();
    for (const b of this.fog) {
      const ex = b.x - cx;
      const ey = b.y - cy;
      if (ex < -160 || ey < -60 || ex > vw + 160 || ey > vh + 60) continue;
      sx.globalAlpha = b.alpha * (0.8 + 0.2 * Math.sin(t * 0.5 + b.x));
      sx.drawImage(this.fogSprite, ex - 70 * b.scale, ey - 24 * b.scale, 140 * b.scale, 56 * b.scale);
    }
    sx.restore();

    /* --- dynamic lighting (multiply) --- */
    this.applyLighting(sx, vw, vh, cx, cy, 0, t, flick);

    /* --- DEBUG: walkable region tinted green --- */
    if (SHOW_WALKABLE) {
      sx.save();
      sx.fillStyle = 'rgba(80,255,120,0.28)';
      const tx0 = Math.floor(cx / TILE);
      const ty0 = Math.floor(cy / TILE);
      const tx1 = Math.ceil((cx + vw) / TILE);
      const ty1 = Math.ceil((cy + vh) / TILE);
      for (let ty = ty0; ty <= ty1; ty++)
        for (let tx = tx0; tx <= tx1; tx++)
          if (this.walkable(tx, ty))
            sx.fillRect(Math.round(tx * TILE - cx), Math.round(ty * TILE - cy), TILE, TILE);
      sx.restore();
    }

    /* --- DEBUG: collision hitboxes in bold yellow --- */
    if (SHOW_HITBOXES) {
      sx.save();
      sx.lineWidth = 2;
      for (const b of this.hitboxes) {
        sx.strokeStyle = b.hop ? '#ffd000' : '#ffff00';
        sx.setLineDash(b.hop ? [3, 2] : []);
        sx.strokeRect(Math.round(b.x - cx), Math.round(b.y - cy), b.w, b.h);
      }
      sx.restore();
    }
  }

  /**
   * Screen-space anchor for a landmark's light effect: its tile origin plus a
   * fixed offset (where the glow sits on the sprite), less the camera. Every
   * light/glow derives from this so it tracks its POI when the layout moves.
   */
  private lightPos(id: string, dx: number, dy: number, cx: number, cy: number): { x: number; y: number } {
    const p = poiById(id);
    return { x: p.tx * TILE + dx - cx, y: p.ty * TILE + dy - cy };
  }

  private emissive(gx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
    const g = gx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    gx.fillStyle = g;
    gx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** Black silhouette of a sprite (its own shape), cached and reused as shadow. */
  private silhouette(img: HTMLCanvasElement): HTMLCanvasElement {
    let sil = this.silCache.get(img);
    if (!sil) {
      sil = document.createElement('canvas');
      sil.width = img.width;
      sil.height = img.height;
      const sc = sil.getContext('2d')!;
      sc.drawImage(img, 0, 0);
      sc.globalCompositeOperation = 'source-in';
      sc.fillStyle = '#000';
      sc.fillRect(0, 0, sil.width, sil.height);
      this.silCache.set(img, sil);
    }
    return sil;
  }

  /**
   * Realtime cast shadows — each shadow-casting prop's silhouette, projected
   * away from the sun's live world position (which depends on the viewport,
   * so shadows swing when the window resizes). All silhouettes composite into
   * one offscreen layer (overlaps don't double-darken), blurred and blended
   * over the already-drawn props, so shadows fall across stones too.
   */
  private renderShadows(sx: CanvasRenderingContext2D, vw: number, vh: number, cx: number, cy: number, sunX: number, sunY: number): void {
    if (!this.shadowLayer || this.shadowLayer.width !== vw || this.shadowLayer.height !== vh) {
      this.shadowLayer = document.createElement('canvas');
      this.shadowLayer.width = vw;
      this.shadowLayer.height = vh;
      this.shadowCtx = this.shadowLayer.getContext('2d')!;
    }
    const sc = this.shadowCtx;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, vw, vh);
    const wScale = 0.9;
    for (const p of this.props) {
      if (!p.shadow) continue;
      // (shDx, shDy) nudge the shadow's root off the sprite foot — e.g. sunk
      // up into the base so the seam hides under the prop's own footprint
      const fx = p.x + p.shDx;
      const fy = p.y + p.shDy;
      const W = p.img.width;
      const H = p.img.height;
      // rough cull: a shadow reaches at most ~H*0.7 from its root
      const reach = H * 0.7 + W;
      if (fx - cx < -reach || fy - cy < -reach || fx - cx > vw + reach || fy - cy > vh + reach) continue;
      const d = Math.hypot(fx - sunX, fy - sunY) || 1;
      const dvx = ((fx - sunX) / d) * 0.7; // per-height cast length —
      const dvy = ((fy - sunY) / d) * 0.7; // the low sun casts long
      // maps sprite pixel (ix,iy) → foot + right*(ix-W/2) + up*(H-iy)*castVec
      sc.setTransform(wScale, 0, -dvx, -dvy, fx - (W / 2) * wScale + H * dvx - cx, fy + H * dvy - cy);
      sc.drawImage(this.silhouette(p.img), 0, 0);
    }
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sx.save();
    sx.globalAlpha = 0.34;
    sx.filter = 'blur(1px)';
    sx.drawImage(this.shadowLayer, 0, 0);
    sx.restore();
  }

  private applyLighting(
    sx: CanvasRenderingContext2D, vw: number, vh: number,
    cx: number, cy: number, horizonY: number, t: number, flick: number,
  ): void {
    if (!this.lightmap || this.lightmap.width !== vw || this.lightmap.height !== vh) {
      this.lightmap = document.createElement('canvas');
      this.lightmap.width = vw;
      this.lightmap.height = vh;
      this.lightCtx = this.lightmap.getContext('2d')!;
    }
    const lx = this.lightCtx;
    lx.globalCompositeOperation = 'source-over';
    lx.fillStyle = 'rgb(224,204,178)'; // golden-hour ambient
    lx.fillRect(0, 0, vw, vh);
    // keep the sky and sea bright
    const skyG = lx.createLinearGradient(0, horizonY - 40, 0, horizonY + 10);
    skyG.addColorStop(0, 'rgb(252,240,220)');
    skyG.addColorStop(1, 'rgb(210,188,160)');
    lx.fillStyle = skyG;
    lx.fillRect(0, 0, vw, Math.max(0, horizonY + 10));

    lx.globalCompositeOperation = 'lighter';
    const lp = (id: string, dx = 0, dy = 0) => this.lightPos(id, dx, dy, cx, cy);
    const light = (x: number, y: number, r: number, rgb: [number, number, number], k: number) => {
      const g = lx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${k.toFixed(2)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lx.fillStyle = g;
      lx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const fire = lp('bonfire', 8, 4);
    light(fire.x, fire.y, 96, [255, 176, 92], 0.66 + (flick - 0.5) * 0.5); // the Far Fire
    const pit = lp('projects', 8, 19.2);
    light(pit.x, pit.y, 44, [70, 160, 220], 0.24 + 0.05 * Math.sin(t * 1.4)); // the pit
    const win = lp('research', -1.6, 1.6);
    light(win.x, win.y, 30, [255, 180, 100], 0.4); // mansion window
    const gly = lp('about', 8, -9.6);
    light(gly.x, gly.y, 36, [120, 190, 220], 0.2); // monument glyphs
    const frg = lp('mods', 1.6, 9.6);
    light(frg.x, frg.y, 42, [255, 140, 70], 0.42 + (flick - 0.5) * 0.3); // forge
    light(this.hero.x - cx, this.hero.y - 10 - cy, 38, [190, 170, 150], 0.2); // hero ember

    sx.save();
    sx.globalCompositeOperation = 'multiply';
    sx.drawImage(this.lightmap, 0, 0);
    sx.restore();
  }

  private heroFrame(t: number): HTMLCanvasElement {
    const h = this.hero;
    const frames = this.spr.hero.frames[h.dir];
    if (!h.moving) return frames[0];
    return frames[Math.floor(h.walked / 7) % 4];
  }

  private drawHero(sx: CanvasRenderingContext2D, img: HTMLCanvasElement, cx: number, cy: number, t = 0): void {
    const z = this.hero.z;
    const hx = Math.round(this.hero.x - img.width / 2 - cx);
    const hy = Math.round(this.hero.y - img.height + 2 - z - cy);
    // shadow stays on the ground and tightens as the hero rises
    const shrink = Math.max(0.45, 1 - z / 26);
    sx.fillStyle = `rgba(0,0,0,${(0.4 * shrink).toFixed(2)})`;
    sx.beginPath();
    sx.ellipse(Math.round(this.hero.x - cx), Math.round(this.hero.y + 2 - cy), 6 * shrink, 2.4 * shrink, 0, 0, Math.PI * 2);
    sx.fill();
    // idle bob
    const bob = this.hero.moving || z > 0 ? 0 : Math.sin(t * 2.2) > 0.6 ? 1 : 0;
    sx.drawImage(img, hx, hy + bob);
  }

  /* ---------------- queries for HUD / WebMCP ---------------- */

  poiWorldPos(p: POI): { x: number; y: number } {
    return { x: p.tx * TILE + TILE / 2, y: p.ty * TILE + TILE };
  }

  nearestPOI(): { poi: POI; dist: number } | null {
    let best: { poi: POI; dist: number } | null = null;
    for (const p of POIS) {
      const pos = this.poiWorldPos(p);
      const d = Math.hypot(pos.x - this.hero.x, pos.y - this.hero.y);
      if (d <= p.radius + 14 && (!best || d < best.dist)) best = { poi: p, dist: d };
    }
    return best;
  }

  /** Walk the hero to a POI (used by clicks and WebMCP). */
  async walkToPOI(id: string): Promise<boolean> {
    const p = POIS.find((q) => q.id === id);
    if (!p) return false;
    const pos = this.poiWorldPos(p);
    return this.requestMoveTo(pos.x, pos.y + TILE * 1.2);
  }
}
