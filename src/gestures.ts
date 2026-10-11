import type { Hand } from './tracker';
const dist = (a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }) => Math.hypot(a.x - b.x, a.y - b.y, ((a.z ?? 0) - (b.z ?? 0)) * 0.5);
export const TIPS = [8, 12, 16, 20]; // index, middle, ring, pinky

class Smooth { v: Hand | null = null;
  push(h: Hand | undefined, a = 0.6) {
    if (!h) return (this.v = null);
    this.v = this.v ? h.map((p, i) => ({ ...p, x: this.v![i].x + (p.x - this.v![i].x) * a, y: this.v![i].y + (p.y - this.v![i].y) * a, z: this.v![i].z + (p.z - this.v![i].z) * a })) : h;
    return this.v;
  }
}

/** Tracks which fingertips touch the thumb, with hysteresis and debounce. */
class Touch {
  on = [false, false, false, false]; private n = [0, 0, 0, 0];
  update(h: Hand | null) {
    if (!h) { this.on = [false, false, false, false]; return this.on; }
    const size = dist(h[0], h[9]) || 0.1;
    TIPS.forEach((t, i) => {
      const d = dist(h[4], h[t]) / size, want = this.on[i] ? d < 0.42 : d < 0.28;
      this.n[i] = want !== this.on[i] ? this.n[i] + 1 : 0;
      if (this.n[i] >= 2) { this.on[i] = want; this.n[i] = 0; }
    });
    return this.on;
  }
}

export interface HandState { hand: Hand; touch: boolean[] }

export class Gestures {
  private ps = new Smooth(); private cs = new Smooth(); private pt = new Touch(); private ct = new Touch();
  update(hands: Hand[]): { play: HandState | null; ctl: HandState | null } {
    // Hand further to the user's right plays; the other controls.
    const sorted = [...hands].sort((a, b) => b[0].x - a[0].x);
    const p = this.ps.push(sorted[0]), c = this.cs.push(sorted[1]);
    return {
      play: p ? { hand: p, touch: [...this.pt.update(p)] } : (this.pt.update(null), null),
      ctl: c ? { hand: c, touch: [...this.ct.update(c)] } : (this.ct.update(null), null),
    };
  }
}
