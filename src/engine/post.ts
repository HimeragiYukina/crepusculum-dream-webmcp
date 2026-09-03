/**
 * HD-2D compositor.
 * The world renders at a low internal resolution into `scene` (pixel art) and
 * `glow` (emissive-only). The compositor blooms the glow layer, upscales with
 * nearest-neighbor, then applies tilt-shift depth blur, vignette and a subtle
 * color grade — the Octopath-style "HD-2D" look.
 */
export class Compositor {
  readonly display: HTMLCanvasElement;
  private dx: CanvasRenderingContext2D;

  scene!: HTMLCanvasElement;
  sceneCtx!: CanvasRenderingContext2D;
  glow!: HTMLCanvasElement;
  glowCtx!: CanvasRenderingContext2D;

  vw = 480; // internal view width
  vh = 270; // internal view height

  private vignette!: HTMLCanvasElement;
  private grade!: HTMLCanvasElement;
  private blurBuf!: HTMLCanvasElement;
  private blurBufCtx!: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;
  private pixelRatio = 0;

  /**
   * The world is framed by height: exactly VIEW_H world-px of vertical extent
   * always map onto the full window height. 362 = the full 320px-tall world
   * plus a 42px sky band: bottom-anchored, this glues the peninsula's south
   * edge to the screen bottom and seats the sky/sea skyline at ~20% of the
   * view height (seaTop = 72 of 362). The zoom (css px per world px) follows
   * as height / VIEW_H; the horizontal extent follows from the aspect ratio.
   */
  static readonly VIEW_H = 362;

  constructor(parent: HTMLElement) {
    this.display = document.createElement('canvas');
    this.display.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair;';
    parent.appendChild(this.display);
    this.dx = this.display.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const w = Math.max(1, this.display.clientWidth || window.innerWidth);
    const h = Math.max(1, this.display.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssWidth = w;
    this.cssHeight = h;
    this.pixelRatio = dpr;
    this.display.width = Math.floor(w * dpr);
    this.display.height = Math.floor(h * dpr);

    // frame by height: VIEW_H world-px fill the window height; the width
    // follows from the aspect. Wider-than-world views let the sea fill the
    // side margins; narrower ones follow the hero.
    const scale = h / Compositor.VIEW_H;
    this.vh = Compositor.VIEW_H;
    this.vw = Math.max(2, Math.round(w / scale / 2) * 2);

    const mk = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
      const c = document.createElement('canvas');
      c.width = this.vw;
      c.height = this.vh;
      const x = c.getContext('2d')!;
      x.imageSmoothingEnabled = false;
      return [c, x];
    };
    [this.scene, this.sceneCtx] = mk();
    [this.glow, this.glowCtx] = mk();
    this.buildOverlays();
  }

  /**
   * Mobile browsers can emit resize before an orientation change has settled.
   * Recheck the canvas against its final laid-out size immediately before a
   * frame is rendered so a stale backing store cannot remain CSS-stretched.
   */
  resizeIfNeeded(): void {
    const w = Math.max(1, this.display.clientWidth || window.innerWidth);
    const h = Math.max(1, this.display.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w !== this.cssWidth || h !== this.cssHeight || dpr !== this.pixelRatio) {
      this.resize();
    }
  }

  private buildOverlays(): void {
    const W = this.display.width;
    const H = this.display.height;
    // vignette
    this.vignette = document.createElement('canvas');
    this.vignette.width = W;
    this.vignette.height = H;
    let x = this.vignette.getContext('2d')!;
    const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.3)');
    x.fillStyle = vg;
    x.fillRect(0, 0, W, H);
    // color grade: cool shadows at top, faint warm lift at bottom
    this.grade = document.createElement('canvas');
    this.grade.width = W;
    this.grade.height = H;
    x = this.grade.getContext('2d')!;
    const gg = x.createLinearGradient(0, 0, 0, H);
    gg.addColorStop(0, 'rgba(64,58,104,0.12)');
    gg.addColorStop(0.55, 'rgba(120,80,40,0.07)');
    gg.addColorStop(1, 'rgba(160,90,40,0.12)');
    x.fillStyle = gg;
    x.fillRect(0, 0, W, H);
    // reusable buffer for the gradient-masked bottom blur
    this.blurBuf = document.createElement('canvas');
    this.blurBuf.width = W;
    this.blurBuf.height = H;
    this.blurBufCtx = this.blurBuf.getContext('2d')!;
    this.blurBufCtx.imageSmoothingEnabled = true;
  }

  /** Composite scene+glow to the display canvas. */
  present(): void {
    const dx = this.dx;
    const W = this.display.width;
    const H = this.display.height;

    // bloom the glow layer onto the scene (twice: tight + wide)
    const sx = this.sceneCtx;
    sx.save();
    sx.globalCompositeOperation = 'lighter';
    sx.filter = 'blur(1.5px)';
    sx.drawImage(this.glow, 0, 0);
    sx.filter = 'blur(5px)';
    sx.globalAlpha = 0.7;
    sx.drawImage(this.glow, 0, 0);
    sx.restore();
    sx.filter = 'none';

    // nearest-neighbor upscale
    dx.imageSmoothingEnabled = false;
    dx.clearRect(0, 0, W, H);
    dx.drawImage(this.scene, 0, 0, W, H);

    // tilt-shift: hard blurred band across the top (sky)
    const bandT = Math.floor(H * 0.2);
    dx.save();
    dx.imageSmoothingEnabled = true;
    dx.filter = 'blur(3px)';
    dx.globalAlpha = 0.75;
    dx.beginPath();
    dx.rect(0, 0, W, bandT);
    dx.clip();
    dx.drawImage(this.scene, 0, 0, W, H);
    dx.restore();
    dx.filter = 'none';
    dx.globalAlpha = 1;

    // bottom tilt-shift: a blur that fades smoothly from clear (top of the
    // band) to full strength (screen bottom). A blurred copy of the scene is
    // masked with a vertical alpha gradient so there is no hard band edge.
    const bandB = Math.floor(H * 0.2);
    const bb = this.blurBufCtx;
    bb.globalCompositeOperation = 'source-over';
    bb.clearRect(0, 0, W, H);
    bb.filter = 'blur(3px)';
    bb.drawImage(this.scene, 0, 0, W, H);
    bb.filter = 'none';
    bb.globalCompositeOperation = 'destination-in';
    const bmask = bb.createLinearGradient(0, H - bandB, 0, H);
    bmask.addColorStop(0, 'rgba(0,0,0,0)'); // top of band: clear
    bmask.addColorStop(1, 'rgba(0,0,0,0.75)'); // screen bottom: full blur
    bb.fillStyle = bmask;
    bb.fillRect(0, H - bandB, W, bandB);
    bb.globalCompositeOperation = 'source-over';
    dx.drawImage(this.blurBuf, 0, 0);

    // grade + vignette
    dx.globalCompositeOperation = 'overlay';
    dx.drawImage(this.grade, 0, 0);
    dx.globalCompositeOperation = 'source-over';
    dx.drawImage(this.vignette, 0, 0);
  }
}
