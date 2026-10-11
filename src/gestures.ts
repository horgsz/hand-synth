import type { Hand } from './tracker';
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

class Smooth { v: Hand | null = null;
  push(h: Hand | undefined, a = 0.45) {
    if (!h) return (this.v = null);
    this.v = this.v ? h.map((p, i) => ({ ...p, x: this.v![i].x + (p.x - this.v![i].x) * a, y: this.v![i].y + (p.y - this.v![i].y) * a })) : h;
    return this.v;
  }
}

export interface PlayState { x: number; y: number; pinch: boolean; voices: number; tip: { x: number; y: number } }
export interface CtlState { y: number; open: number; tip: { x: number; y: number } }

export class Gestures {
  private ps = new Smooth(); private cs = new Smooth();
  private pinch = false; private voices = 1; private cand = 1; private candN = 0;

  update(hands: Hand[]): { play: PlayState | null; ctl: CtlState | null } {
    // Rightmost hand (user's right) plays; the other controls.
    const sorted = [...hands].sort((a, b) => b[0].x - a[0].x);
    const p = this.ps.push(sorted[0]), c = this.cs.push(sorted[1]);
    return { play: p ? this.play(p) : (this.pinch = false, null), ctl: c ? this.ctl(c) : null };
  }

  private play(h: Hand): PlayState {
    const size = dist(h[0], h[9]) || 0.1, pd = dist(h[4], h[8]) / size;
    this.pinch = this.pinch ? pd < 0.5 : pd < 0.3; // hysteresis
    const n = 1 + [12, 16, 20].filter(k => dist(h[k], h[0]) > dist(h[k - 2], h[0]) * 1.15).length;
    if (n === this.cand) this.candN++; else { this.cand = n; this.candN = 0; }
    if (this.candN > 5) this.voices = n; // debounce
    return { x: h[9].x, y: h[9].y, pinch: this.pinch, voices: this.voices, tip: h[8] };
  }

  private ctl(h: Hand): CtlState {
    const size = dist(h[0], h[9]) || 0.1;
    const spread = [8, 12, 16, 20].reduce((s, k) => s + dist(h[k], h[0]), 0) / 4 / size;
    return { y: h[9].y, open: Math.min(1, Math.max(0, (spread - 1.1) / 0.8)), tip: h[8] };
  }
}
