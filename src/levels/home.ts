/**
 * The home level: binds the World, Input and Compositor together, runs the
 * game loop and the HUD, and exposes hooks used by the WebMCP tools. It is the
 * explorable HD-2D hub world; every other area is reached from here.
 */
import { generateSprites } from '../engine/sprites';
import { World, POIS, POI } from '../engine/world';
import { Compositor } from '../engine/post';
import { Input } from '../engine/input';
import { Level, Router } from '../router';
import { buildTopBar } from './topbar';
import { t, tPoi } from '../i18n';

// a white pointing-finger cursor, shown when a click would interact or jump
const FINGER_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 24 24'>" +
  "<path d='M9 11.24V7.5a1.5 1.5 0 0 1 3 0v3.74c1.21-.81 2-2.18 2-3.74A3.5 3.5 0 1 0 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26a1.5 1.5 0 0 0-.54-.11H13v-6a1.5 1.5 0 0 0-3 0v10.74l-3.43-.72a1 1 0 0 0-1.03.33l-.79.8 4.94 4.94c.36.36.85.56 1.36.56h6.31c.75 0 1.38-.55 1.49-1.29l.75-5.27a1.5 1.5 0 0 0-.91-1.75z' " +
  "fill='white' stroke='rgba(0,0,0,0.55)' stroke-width='1' stroke-linejoin='round'/></svg>";
const FINGER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(FINGER_SVG)}") 13 3, pointer`;

export class HomeLevel implements Level {
  id = 'home';
  banner = 'CREPUSCULUM DREAM';

  world: World | null = null; // persists across mounts so the hero stays put
  private comp: Compositor | null = null;
  private input: Input | null = null;
  private hud: HTMLElement | null = null;
  private prompt: HTMLElement | null = null;
  private promptLabel: HTMLElement | null = null;
  private labels: { poi: POI; el: HTMLElement; arrow: HTMLElement }[] = [];
  private travelEl: HTMLElement | null = null;
  private raf = 0;
  private last = 0;
  private start = performance.now();
  private pendingPOI: POI | null = null;
  /** live analog vector from the on-screen joystick (touch devices) */
  private joy = { x: 0, y: 0 };
  /** joystick pushed to its rim — the touch equivalent of Shift-sprint */
  private joySprint = false;
  /** whether the canvas currently shows the finger cursor (over hero/POI) */
  private cursorFinger = false;
  private onResize = () => this.comp?.resize();
  private onPointerMove = (e: PointerEvent) => this.updateCursor(e);

  constructor(private router: Router) {}

  mount(stage: HTMLElement): void {
    if (!this.world) this.world = new World(generateSprites());
    this.comp = new Compositor(stage);
    this.input = new Input(this.comp.display);
    this.buildHUD(stage);
    this.comp.display.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('resize', this.onResize);
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.tick(dt, (now - this.start) / 1000);
    };
    this.raf = requestAnimationFrame(loop);
  }

  unmount(): void {
    cancelAnimationFrame(this.raf);
    this.comp?.display.removeEventListener('pointermove', this.onPointerMove);
    this.cursorFinger = false;
    window.removeEventListener('resize', this.onResize);
    this.input?.dispose();
    this.input = null;
    this.comp = null;
    this.hud = null;
    this.labels = [];
    this.travelEl = null;
    this.joy = { x: 0, y: 0 };
    this.joySprint = false;
    this.world?.cancelPath(false);
  }

  /* ---------------- HUD ---------------- */

  private buildHUD(stage: HTMLElement): void {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.innerHTML = `
      <div class="hud-hint" data-i18n="hud.hint">${t('hud.hint')}</div>
      <div class="hud-prompt"><span class="key">E</span><span class="label"></span></div>
      <div class="touch-controls">
        <div class="joystick"><div class="joystick-knob"></div></div>
        <button class="touch-interact" type="button" aria-label="interact">✦</button>
      </div>
      <footer class="home-footer">
        <span>© 2026 Yunhao Luo</span>
        <span>Code <a href="https://opensource.org/license/mit" target="_blank" rel="noopener">MIT</a> ·
          Content <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="_blank" rel="noopener">CC BY-NC-ND 4.0</a></span>
      </footer>
    `;
    // the shared top bar (identity + site map + links) rides inside the HUD
    hud.appendChild(buildTopBar(this.router, this.id));
    stage.appendChild(hud);
    this.hud = hud;
    this.prompt = hud.querySelector('.hud-prompt')!;
    this.promptLabel = hud.querySelector('.hud-prompt .label')!;
    this.wireTouch(hud);
    // every landmark carries a floating label at all times
    this.labels = POIS.map((poi) => {
      const el = document.createElement('div');
      el.className = 'poi-label';
      const name = document.createElement('span');
      name.className = 'pl-name';
      name.textContent = tPoi(poi, 'label');
      name.dataset.poi = poi.id; // refreshChrome() retranslates on language change
      el.append(name);
      // off-screen indicator: a chevron beside the label pointing at the landmark
      const arrow = document.createElement('span');
      arrow.className = 'pl-arrow';
      el.append(arrow);
      // clicking the label counts as clicking the landmark itself — walk
      // there and interact, even when the landmark is off-screen and only
      // its edge-clamped label is visible
      el.style.cursor = FINGER_CURSOR;
      el.addEventListener('click', (e) => {
        if (this.travelOpen()) return;
        const r = hud.getBoundingClientRect();
        this.spawnRipple(e.clientX - r.left, e.clientY - r.top);
        void this.walkAndTrigger(poi);
      });
      hud.appendChild(el);
      return { poi, el, arrow };
    });
  }

  /**
   * Wire the on-screen joystick and interact button. They are revealed only on
   * touch devices (see the `.has-touch` gate in CSS); the joystick feeds an
   * analog vector into the movement loop and the button interacts with the
   * nearest landmark (or hops if none is in reach).
   */
  private wireTouch(hud: HTMLElement): void {
    // reveal only when the *primary* pointer is touch — a mouse-driven laptop
    // with a touchscreen reports (pointer: fine) and should not get a joystick
    if (matchMedia('(pointer: coarse)').matches) {
      hud.classList.add('has-touch');
    }

    const base = hud.querySelector<HTMLElement>('.joystick')!;
    const knob = hud.querySelector<HTMLElement>('.joystick-knob')!;
    const R = 40; // max knob travel, px
    const DEAD = 0.16; // deadzone as a fraction of R
    const RIM = 0.95; // sprint when the knob is pushed this close to the rim
    let pid: number | null = null;

    const set = (e: PointerEvent) => {
      const r = base.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(d, R);
      dx = (dx / d) * clamped;
      dy = (dy / d) * clamped;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / R;
      const ny = dy / R;
      const mag = Math.hypot(nx, ny);
      this.joy = mag < DEAD ? { x: 0, y: 0 } : { x: nx, y: ny };
      this.joySprint = mag >= RIM;
    };
    const release = () => {
      pid = null;
      this.joy = { x: 0, y: 0 };
      this.joySprint = false;
      knob.style.transform = 'translate(0, 0)';
    };
    base.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pid = e.pointerId;
      try { base.setPointerCapture(pid); } catch { /* synthetic/edge pointers */ }
      set(e);
    });
    base.addEventListener('pointermove', (e) => {
      if (e.pointerId === pid) set(e);
    });
    base.addEventListener('pointerup', release);
    base.addEventListener('pointercancel', release);

    const btn = hud.querySelector<HTMLElement>('.touch-interact')!;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const world = this.world;
      if (!world || this.travelOpen()) return;
      const near = world.nearestPOI();
      if (near) this.trigger(near.poi);
      else world.jump();
    });
  }

  /* ---------------- game loop ---------------- */

  private tick(dt: number, t: number): void {
    const world = this.world!;
    const comp = this.comp!;
    const input = this.input!;

    comp.resizeIfNeeded();

    // movement: keyboard axis + on-screen joystick, combined and clamped
    const ax = input.axis();
    let mx = ax.x + this.joy.x;
    let my = ax.y + this.joy.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    if (mx !== 0 || my !== 0) world.moveAxis(mx, my, dt, input.sprinting() || this.joySprint);

    // click: the hero herself → jump; POI hit → walk & trigger; otherwise
    // walk to the point
    const click = input.consumeClick();
    if (click && !this.travelOpen()) {
      const w = this.cssToWorld(click.x, click.y);
      this.spawnRipple(click.x, click.y); // every click ripples — move, jump or interact
      if (Math.hypot(w.x - world.hero.x, w.y - (world.hero.y - 11)) < 13) {
        world.jump();
      } else {
        const hit = this.poiAtWorld(w.x, w.y);
        if (hit) void this.walkAndTrigger(hit);
        else {
          this.pendingPOI = null;
          void world.requestMoveTo(w.x, w.y);
        }
      }
    }

    // E to interact
    if (input.consumeInteract() && !this.travelOpen()) {
      const near = world.nearestPOI();
      if (near) this.trigger(near.poi);
    }

    // Space to jump
    if (input.consumeJump() && !this.travelOpen()) world.jump();

    world.update(dt, t);
    world.render(comp, t, dt);
    comp.present();
    this.updatePrompt();
  }

  /** Show the finger cursor while the pointer is over the hero or a landmark. */
  private updateCursor(e: PointerEvent): void {
    if (!this.comp || !this.world || this.travelOpen()) return this.setFinger(false);
    const r = this.comp.display.getBoundingClientRect();
    const w = this.cssToWorld(e.clientX - r.left, e.clientY - r.top);
    const hero = this.world.hero;
    const overHero = Math.hypot(w.x - hero.x, w.y - (hero.y - 11)) < 13;
    this.setFinger(overHero || !!this.poiAtWorld(w.x, w.y));
  }

  private setFinger(on: boolean): void {
    if (!this.comp || on === this.cursorFinger) return;
    this.cursorFinger = on;
    this.comp.display.style.cursor = on ? FINGER_CURSOR : 'crosshair';
  }

  /** A soul-light ring blooming where the hero was told to walk. */
  private spawnRipple(cssX: number, cssY: number): void {
    if (!this.hud) return;
    const ring = document.createElement('div');
    ring.className = 'move-ripple';
    ring.style.left = `${cssX}px`;
    ring.style.top = `${cssY}px`;
    this.hud.appendChild(ring);
    ring
      .animate(
        [
          { transform: 'scale(0.3)', opacity: 0.9 },
          { transform: 'scale(1.7)', opacity: 0 },
        ],
        { duration: 520, easing: 'ease-out', fill: 'forwards' },
      )
      .addEventListener('finish', () => ring.remove());
  }

  private cssToWorld(cssX: number, cssY: number): { x: number; y: number } {
    const comp = this.comp!;
    const r = comp.display.getBoundingClientRect();
    return {
      x: this.world!.camX + (cssX / r.width) * comp.vw,
      y: this.world!.camY + (cssY / r.height) * comp.vh,
    };
  }

  private worldToCss(wx: number, wy: number): { x: number; y: number } {
    const comp = this.comp!;
    const r = comp.display.getBoundingClientRect();
    return {
      x: ((wx - this.world!.camX) / comp.vw) * r.width,
      y: ((wy - this.world!.camY) / comp.vh) * r.height,
    };
  }

  /**
   * Pin an element to a css point, then shift it back inside the viewport on
   * both axes. Returns the applied shift — a non-zero shift means the anchor
   * itself is off-screen in that direction.
   */
  private placePinned(el: HTMLElement, css: { x: number; y: number }): { sx: number; sy: number } {
    el.style.left = `${css.x}px`;
    el.style.top = `${css.y}px`;
    el.style.setProperty('--pin-shift-x', '0px');
    el.style.setProperty('--pin-shift-y', '0px');

    const rootStyle = getComputedStyle(document.documentElement);
    const safeLeft = parseFloat(rootStyle.getPropertyValue('--safe-left')) || 0;
    const safeRight = parseFloat(rootStyle.getPropertyValue('--safe-right')) || 0;
    const safeTop = parseFloat(rootStyle.getPropertyValue('--safe-top')) || 0;
    const safeBottom = parseFloat(rootStyle.getPropertyValue('--safe-bottom')) || 0;
    const margin = 16;
    const minX = safeLeft + margin;
    const maxX = window.innerWidth - safeRight - margin;
    const minY = safeTop + margin;
    const maxY = window.innerHeight - safeBottom - margin;
    const rect = el.getBoundingClientRect();
    let sx = 0;
    let sy = 0;
    if (rect.left < minX) sx = minX - rect.left;
    else if (rect.right > maxX) sx = maxX - rect.right;
    if (rect.top < minY) sy = minY - rect.top;
    else if (rect.bottom > maxY) sy = maxY - rect.bottom;
    el.style.setProperty('--pin-shift-x', `${sx}px`);
    el.style.setProperty('--pin-shift-y', `${sy}px`);
    return { sx, sy };
  }

  private poiAtWorld(wx: number, wy: number): POI | null {
    for (const p of POIS) {
      const pos = this.world!.poiWorldPos(p);
      if (Math.hypot(pos.x - wx, pos.y - wy - 8) < 22) return p;
    }
    return null;
  }

  private async walkAndTrigger(p: POI): Promise<void> {
    this.pendingPOI = p;
    const ok = await this.world!.walkToPOI(p.id);
    if (ok && this.pendingPOI === p) {
      this.pendingPOI = null;
      this.trigger(p);
    }
  }

  private updatePrompt(): void {
    if (!this.prompt || !this.world || !this.comp) return;
    const disp = this.comp.display.getBoundingClientRect();
    const scale = disp.width / this.comp.vw;

    const rootStyle = getComputedStyle(document.documentElement);
    const safeBottom = parseFloat(rootStyle.getPropertyValue('--safe-bottom')) || 0;

    // 1) pin every landmark label above its landmark — labels are always
    //    visible, clamping to the screen edges on both axes
    for (const { poi, el } of this.labels) {
      const pos = this.world.poiWorldPos(poi);
      this.placePinned(el, this.worldToCss(pos.x, pos.y + poi.labelDy));
    }

    // 2) separate overlapping labels vertically so none ever hides another:
    //    the lower label of a colliding pair is pushed further down, or up
    //    instead when that would leave the screen
    const items = this.labels.map(({ el }) => ({ el, rect: el.getBoundingClientRect() }));
    items.sort((a, b) => a.rect.top - b.rect.top);
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (let i = 1; i < items.length; i++) {
        for (let j = 0; j < i; j++) {
          const a = items[j].rect;
          const b = items[i].rect;
          if (!(a.left < b.right + 10 && a.right > b.left - 10 && a.top < b.bottom + 8 && a.bottom > b.top - 8)) continue;
          let dy = a.bottom + 8 - b.top;
          if (b.bottom + dy > window.innerHeight - safeBottom - 16) dy = a.top - 8 - b.bottom;
          const el = items[i].el;
          const cur = parseFloat(el.style.getPropertyValue('--pin-shift-y')) || 0;
          el.style.setProperty('--pin-shift-y', `${cur + dy}px`);
          items[i].rect = new DOMRect(b.x, b.y + dy, b.width, b.height);
          moved = true;
        }
      }
      if (!moved) break;
    }

    // 3) chevrons: only when the landmark itself is fully out of view does the
    //    label grow an arrow, hugging the label on the side facing the landmark
    for (const { poi, el, arrow } of this.labels) {
      const pos = this.world.poiWorldPos(poi);
      const pc = this.worldToCss(pos.x, pos.y);
      const R = 28 * scale; // ≈ a landmark sprite's on-screen extent
      const onScreen = pc.x > -R && pc.x < disp.width + R && pc.y > -R && pc.y < disp.height + R;
      if (onScreen) {
        arrow.style.display = 'none';
        continue;
      }
      const rect = el.getBoundingClientRect();
      const ang = Math.atan2(
        disp.top + pc.y - (rect.top + rect.height / 2),
        disp.left + pc.x - (rect.left + rect.width / 2),
      );
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      arrow.style.display = 'block';
      arrow.style.left = `${w / 2 + Math.cos(ang) * (w / 2 + 8)}px`;
      arrow.style.top = `${h / 2 + Math.sin(ang) * (h / 2 + 6)}px`;
      arrow.style.transform = `translate(-50%, -50%) rotate(${ang}rad)`;
    }
    // the E interaction tip only appears when the hero is close
    const near = this.world.nearestPOI();
    if (near && !this.travelOpen()) {
      const pos = this.world.poiWorldPos(near.poi);
      const css = this.worldToCss(pos.x, pos.y + near.poi.labelDy);
      this.placePinned(this.prompt, css);
      this.promptLabel!.textContent = tPoi(near.poi, 'verb');
      this.prompt.classList.add('show');
    } else {
      this.prompt.classList.remove('show');
    }
  }

  /* ---------------- interactions ---------------- */

  trigger(p: POI): void {
    if (p.action === 'menu') this.openTravel();
    else void this.router.go(p.action);
  }

  travelOpen(): boolean {
    return !!this.travelEl;
  }

  openTravel(): void {
    if (this.travelEl || !this.hud) return;
    const el = document.createElement('div');
    el.className = 'travel';
    // destinations derive from the POIs (label + sub), so the menu always
    // matches the in-world landmark names — only the bonfire itself is skipped
    const items = POIS.filter((p) => p.action !== 'menu')
      .map(
        (p) =>
          `<button class="travel-item" data-go="${p.action}"><span class="t-name">✦ <span data-poi="${p.id}" data-poi-field="label">${tPoi(p, 'label')}</span></span><span class="t-desc" data-poi="${p.id}" data-poi-field="sub">${tPoi(p, 'sub')}</span></button>`,
      )
      .join('\n        ');
    el.innerHTML = `
      <div class="travel-box">
        <button class="travel-x" type="button" aria-label="close">×</button>
        <h2 data-i18n="travel.title">${t('travel.title')}</h2>
        <p class="flavor" data-i18n="travel.flavor">${t('travel.flavor')}</p>
        ${items}
        <button class="travel-close" data-i18n="travel.return">${t('travel.return')}</button>
      </div>
    `;
    this.hud.parentElement!.appendChild(el);
    this.travelEl = el;
    requestAnimationFrame(() => el.classList.add('show'));
    el.querySelectorAll<HTMLButtonElement>('.travel-item').forEach((b) =>
      b.addEventListener('click', () => {
        this.closeTravel();
        void this.router.go(b.dataset.go!);
      }),
    );
    el.querySelector('.travel-close')!.addEventListener('click', () => this.closeTravel());
    el.querySelector('.travel-x')!.addEventListener('click', () => this.closeTravel());
    // clicking the dimmed backdrop (outside the box) also closes the menu
    el.addEventListener('click', (e) => {
      if (e.target === el) this.closeTravel();
    });
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeTravel();
        window.removeEventListener('keydown', esc);
      }
    };
    window.addEventListener('keydown', esc);
  }

  closeTravel(): void {
    const el = this.travelEl;
    if (!el) return;
    this.travelEl = null;
    el.classList.remove('show');
    setTimeout(() => el.remove(), 380);
  }

  /* ---------------- WebMCP hooks ---------------- */

  /** Walk to a landmark and optionally interact; returns a status string. */
  async mcpWalkTo(poiId: string, interact: boolean, signal?: AbortSignal): Promise<string> {
    if (this.router.current?.id !== 'home') return 'The hero is not in the home world right now. Use goto-site-page({ page: "home" }) first.';
    const p = POIS.find((q) => q.id === poiId);
    if (!p) return `Unknown landmark "${poiId}".`;
    if (signal?.aborted) throw signal.reason ?? new DOMException('The walk was cancelled.', 'AbortError');
    const world = this.world!;
    const stop = () => world.cancelPath(false);
    signal?.addEventListener('abort', stop, { once: true });
    let ok = false;
    try {
      ok = await world.walkToPOI(p.id);
    } finally {
      signal?.removeEventListener('abort', stop);
    }
    if (signal?.aborted) throw signal.reason ?? new DOMException('The walk was cancelled.', 'AbortError');
    if (!ok) return `The hero could not find a path to ${p.label}.`;
    if (interact) {
      this.trigger(p);
      return p.action === 'menu'
        ? `The hero rests at the ${p.label}. The travel menu is now open, listing all areas.`
        : `The hero reached the ${p.label} and traveled to the "${p.action}" area.`;
    }
    return `The hero now stands before the ${p.label} (${p.sub}).`;
  }

  mcpStatus(): string {
    const w = this.world;
    if (!w) return JSON.stringify({ area: this.router.current?.id ?? 'unknown', note: 'home world not loaded yet' });
    const near = w.nearestPOI();
    return JSON.stringify({
      area: this.router.current?.id ?? 'home',
      heroTile: { x: Math.round(w.hero.x / 16), y: Math.round(w.hero.y / 16) },
      nearbyLandmark: near ? { id: near.poi.id, label: near.poi.label, leadsTo: near.poi.action } : null,
      landmarks: POIS.map((p) => ({ id: p.id, label: p.label, leadsTo: p.action })),
    });
  }
}
