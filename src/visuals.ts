import type { Hand } from './tracker';
const CONN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
type P = { x: number; y: number; vx: number; vy: number; l: number; c: string };

export class Visuals {
  private ctx: CanvasRenderingContext2D; private vctx: CanvasRenderingContext2D; private parts: P[] = [];
  constructor(private stage: HTMLCanvasElement, private viz: HTMLCanvasElement, private video: HTMLVideoElement) {
    this.ctx = stage.getContext('2d')!; this.vctx = viz.getContext('2d')!;
  }
  emit(x: number, y: number, n: number, c: string) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x * this.stage.width, y: y * this.stage.height, vx: Math.random() * 3 - 1.5, vy: Math.random() * 3 - 1.5, l: 1, c });
  }
  draw(hands: Hand[], fft: Float32Array, playIdx: number) {
    const { ctx, stage: s } = this, W = s.width, H = s.height;
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.filter = 'saturate(.6) brightness(.75)'; ctx.drawImage(this.video, 0, 0, W, H); ctx.restore(); ctx.filter = 'none';
    hands.forEach((h, i) => {
      const col = i === playIdx ? '#c6f432' : '#8b7bff';
      ctx.strokeStyle = col + '88'; ctx.lineWidth = 2; ctx.beginPath();
      for (const [a, b] of CONN) { ctx.moveTo(h[a].x * W, h[a].y * H); ctx.lineTo(h[b].x * W, h[b].y * H); }
      ctx.stroke(); ctx.fillStyle = col;
      for (const p of h) { ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 3, 0, 7); ctx.fill(); }
    });
    ctx.globalCompositeOperation = 'lighter';
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.x += p.vx; p.y += p.vy; p.l -= 0.025;
      if (p.l <= 0) { this.parts.splice(i, 1); continue; }
      ctx.globalAlpha = p.l; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 6 * p.l, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    this.border(fft);
  }
  private border(fft: Float32Array) {
    const z = this.viz, q = this.vctx, dpr = devicePixelRatio;
    z.width = z.clientWidth * dpr; z.height = z.clientHeight * dpr;
    const W = z.width, H = z.height, m = 22 * dpr, N = fft.length;
    q.clearRect(0, 0, W, H);
    const g = q.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#8b7bff'); g.addColorStop(1, '#c6f432'); q.fillStyle = g;
    const bx = W / N, by = H / N;
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, Math.min(1, (fft[i] + 90) / 70)) * (m - 4 * dpr), r = 2 * dpr;
      q.beginPath();
      q.roundRect(i * bx + r, m - a - 3, bx - 2 * r, a, r);
      q.roundRect(W - (i + 1) * bx + r, H - m + 3, bx - 2 * r, a, r);
      q.roundRect(m - a - 3, H - (i + 1) * by + r, a, by - 2 * r, r);
      q.roundRect(W - m + 3, i * by + r, a, by - 2 * r, r);
      q.fill();
    }
  }
}
