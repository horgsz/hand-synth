import * as Tone from 'tone';

type Ev = { type: 'on' | 'off'; note: string };

export class Synth {
  analyser = new Tone.Analyser('fft', 64);
  private filter = new Tone.Filter(4000, 'lowpass');
  private delay = new Tone.FeedbackDelay('8n.', 0.35);
  private reverb = new Tone.Reverb(3);
  private vol = new Tone.Volume(-60);
  private live = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 20 }, envelope: { attack: 0.02, release: 0.4 } });
  private loopSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 20 }, envelope: { attack: 0.02, release: 0.4 } });
  private held = new Set<string>();
  private part = new Tone.Part<Ev>((t: number, e: Ev) => e.type === 'on' ? this.loopSynth.triggerAttack(e.note, t) : this.loopSynth.triggerRelease(e.note, t));
  private recStart = -1; private loopLen = 0;
  hasLoop = false;

  constructor() {
    this.live.chain(this.vol, this.filter);
    this.loopSynth.volume.value = -8; this.loopSynth.connect(this.filter);
    this.filter.chain(this.delay, this.reverb, this.analyser, Tone.getDestination());
    this.delay.wet.value = 0; this.reverb.wet.value = 0;
  }

  async start() {
    await Tone.start();
    const t = Tone.getTransport(); t.bpm.value = 100;
    this.loopLen = Tone.Time('2m').toSeconds();
    this.part.loop = true; this.part.loopEnd = this.loopLen; this.part.start(0);
    t.start();
  }

  setNotes(notes: string[]) {
    const now = Tone.now();
    for (const n of this.held) if (!notes.includes(n)) { this.live.triggerRelease(n, now); this.rec('off', n); this.held.delete(n); }
    for (const n of notes) if (!this.held.has(n)) { this.live.triggerAttack(n, now); this.rec('on', n); this.held.add(n); }
  }
  setVolume(v: number) { this.vol.volume.rampTo(v <= 0 ? -60 : Tone.gainToDb(v), 0.05); }
  setFilter(hz: number) { this.filter.frequency.rampTo(hz, 0.05); }
  setFx(w: number) { this.delay.wet.rampTo(w * 0.5, 0.1); this.reverb.wet.rampTo(w * 0.7, 0.1); }

  /** Arm recording for the next full loop cycle. */
  record() {
    if (this.recStart >= 0) return;
    const t = Tone.getTransport(), start = Math.ceil(t.seconds / this.loopLen) * this.loopLen;
    this.recStart = start;
    for (const n of this.held) t.scheduleOnce(() => this.rec('on', n), start);
    t.scheduleOnce(() => { for (const n of this.held) this.part.add(this.loopLen - 0.01, { type: 'off', note: n }); this.recStart = -1; }, start + this.loopLen);
  }
  clear() { this.part.clear(); this.loopSynth.releaseAll(); this.hasLoop = false; }

  private rec(type: Ev['type'], note: string) {
    const s = Tone.getTransport().seconds;
    if (this.recStart < 0 || s < this.recStart) return;
    this.part.add(Math.max(0, s - this.recStart), { type, note }); this.hasLoop = true;
  }
  /** 0..1 position in loop, plus record state. */
  status() {
    const s = Tone.getTransport().seconds;
    return { pos: (s % this.loopLen) / this.loopLen, armed: this.recStart >= 0 && s < this.recStart, recording: this.recStart >= 0 && s >= this.recStart };
  }
}
