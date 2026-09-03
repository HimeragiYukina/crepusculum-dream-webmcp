/**
 * The hub's dusk horizon as a page background. Owns a Compositor and drives
 * World.renderBackdrop each frame — the same sky, sun, sea and post pipeline
 * as the main page, with no peninsula on it. Article pages mount one behind
 * their content.
 */
import { Compositor } from './post';
import { World } from './world';
import { generateSprites } from './sprites';

// one world for all backdrops, built on first use and reused across pages
// (kept separate from the hub's own World so gameplay camera state is never
// clobbered by a backdrop render)
let backdropWorld: World | null = null;

export class Backdrop {
  private comp: Compositor;
  private raf = 0;
  private start = performance.now();
  private onResize = () => this.comp.resize();

  constructor(stage: HTMLElement) {
    if (!backdropWorld) backdropWorld = new World(generateSprites());
    this.comp = new Compositor(stage);
    // a background, not a play surface: never captures the pointer
    this.comp.display.style.cursor = 'default';
    this.comp.display.style.pointerEvents = 'none';
    window.addEventListener('resize', this.onResize);
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.comp.resizeIfNeeded();
      backdropWorld!.renderBackdrop(this.comp, (now - this.start) / 1000);
      this.comp.present();
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.comp.display.remove();
  }
}
