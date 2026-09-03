/** Keyboard + pointer input for the hub level. */
export class Input {
  keys = new Set<string>();
  /** pending click in display-canvas CSS pixel coords, consumed by the level */
  click: { x: number; y: number } | null = null;
  interactPressed = false;
  jumpPressed = false;

  private el: HTMLElement;
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k === 'e' || k === 'enter') this.interactPressed = true;
    if (k === ' ') this.jumpPressed = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  private onPointer = (e: PointerEvent) => {
    const r = this.el.getBoundingClientRect();
    this.click = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  private onBlur = () => this.keys.clear();

  constructor(clickTarget: HTMLElement) {
    this.el = clickTarget;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    clickTarget.addEventListener('pointerdown', this.onPointer);
  }

  /** movement vector from WASD/arrows, normalized */
  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** true while Shift is held — makes WASD movement sprint */
  sprinting(): boolean {
    return this.keys.has('shift');
  }

  consumeInteract(): boolean {
    const v = this.interactPressed;
    this.interactPressed = false;
    return v;
  }

  consumeJump(): boolean {
    const v = this.jumpPressed;
    this.jumpPressed = false;
    return v;
  }

  consumeClick(): { x: number; y: number } | null {
    const v = this.click;
    this.click = null;
    return v;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.el.removeEventListener('pointerdown', this.onPointer);
  }
}
