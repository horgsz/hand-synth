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
  private rs = new Smooth(); private ls = new Smooth(); private rt = new Touch(); private lt = new Touch();
  private mouth = false;
  update(hands: Hand[], jaw: number) {
    // Two hands: split by x. One hand: assign by which half of the frame it's in.
    let r: Hand | undefined, l: Hand | undefined;
    if (hands.length > 1) [r, l] = [...hands].sort((a, b) => b[0].x - a[0].x);
    else if (hands[0]) hands[0][0].x > 0.5 ? (r = hands[0]) : (l = hands[0]);
    const rh = this.rs.push(r), lh = this.ls.push(l);
    this.mouth = this.mouth ? jaw > 0.25 : jaw > 0.4;
    return {
      right: rh ? { hand: rh, touch: [...this.rt.update(rh)] } : (this.rt.update(null), null),
      left: lh ? { hand: lh, touch: [...this.lt.update(lh)] } : (this.lt.update(null), null),
      mouth: this.mouth,
    };
  }
}
