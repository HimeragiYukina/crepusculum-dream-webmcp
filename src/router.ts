/** Hash router with an action-RPG-style fade and area-name banner between levels. */
import { updatePageMetadata } from './metadata';

export interface Level {
  id: string;
  banner: string;
  mount(stage: HTMLElement): void;
  unmount(): void;
}

export class Router {
  private levels = new Map<string, Level>();
  current: Level | null = null;
  private stage: HTMLElement;
  private fader: HTMLElement;
  private bannerEl: HTMLElement;
  private bannerText: HTMLElement;
  private navigating = false;
  private bannerTimer: number | undefined;
  private changeListeners: ((id: string) => void)[] = [];

  constructor() {
    this.stage = document.getElementById('stage')!;
    this.fader = document.getElementById('fader')!;
    this.bannerEl = document.getElementById('banner')!;
    this.bannerText = document.getElementById('banner-text')!;
    window.addEventListener('hashchange', () => {
      const id = this.idFromHash();
      if (id !== this.current?.id) void this.go(id, false);
    });
  }

  register(level: Level): void {
    this.levels.set(level.id, level);
  }

  /** Subscribe to area changes; fired after the new level has mounted. */
  onChange(cb: (id: string) => void): void {
    this.changeListeners.push(cb);
  }

  idFromHash(): string {
    const id = location.hash.replace(/^#\/?/, '');
    return this.levels.has(id) ? id : 'home';
  }

  async go(id: string, pushHash = true, signal?: AbortSignal): Promise<boolean> {
    const next = this.levels.get(id);
    if (!next || this.navigating || next === this.current || signal?.aborted) return false;
    this.navigating = true;
    this.hideBanner();

    // fade to black
    this.fader.classList.remove('clear');
    await wait(560);
    // Tool execution can be cancelled while the fade is running. Keep the
    // current page mounted and restore visibility before releasing the router.
    if (signal?.aborted) {
      this.fader.classList.add('clear');
      this.navigating = false;
      return false;
    }

    this.current?.unmount();
    this.stage.replaceChildren();
    this.current = next;
    if (pushHash) {
      const h = id === 'home' ? '#/' : `#/${id}`;
      if (location.hash !== h) history.pushState(null, '', h);
    }
    next.mount(this.stage);
    updatePageMetadata(id);
    for (const cb of this.changeListeners) cb(id);

    await wait(60);
    this.fader.classList.add('clear');
    // only the home world gets the fading area banner; sub-levels announce
    // themselves with their own emerging titles
    if (next.id === 'home') this.showBanner(next.banner);
    this.navigating = false;
    return true;
  }

  private showBanner(text: string): void {
    this.bannerText.textContent = text;
    this.bannerEl.classList.add('show');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.hideBanner(), 2400);
  }

  private hideBanner(): void {
    this.bannerEl.classList.remove('show');
  }
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
