import * as Tone from 'tone';
import { createTracker } from './tracker';
import { Gestures } from './gestures';
import { Synth } from './synth';
import { Visuals } from './visuals';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const scaleSel = $<HTMLSelectElement>('scale'), recBtn = $<HTMLButtonElement>('rec'), clrBtn = $<HTMLButtonElement>('clr');
const ROOT = 48, RANGE = 24; // C3, two octaves

const scale = () => scaleSel.value.split(',').map(Number);
/** Quantise continuous semitone to scale, with hysteresis to stop flicker. */
let curNote = -1;
function quantise(semi: number) {
  const s = scale(), cands: number[] = [];
  for (let o = 0; o <= RANGE / 12 + 1; o++) for (const d of s) cands.push(o * 12 + d);
  const best = cands.reduce((a, b) => Math.abs(b - semi) < Math.abs(a - semi) ? b : a);
  if (curNote < 0 || Math.abs(semi - curNote) > 0.75 || !s.includes(((curNote % 12) + 12) % 12)) curNote = best;
  return curNote;
}
/** Stack diatonic thirds above the root degree. */
function chord(root: number, n: number) {
  const s = scale(), i = s.indexOf(root % 12), o = Math.floor(root / 12);
  return Array.from({ length: n }, (_, k) => { const j = i + k * (s.length > 7 ? 4 : 2); return o * 12 + s[j % s.length] + 12 * Math.floor(j / s.length); });
}
const CHORDS = ['Single', 'Dyad', 'Triad', 'Seventh'];

$('go').onclick = async () => {
  const go = $<HTMLButtonElement>('go'); go.disabled = true; go.textContent = 'Loading…';
  const synth = new Synth(); await synth.start();
  const video = $<HTMLVideoElement>('video');
  const track = await createTracker(video);
  const gest = new Gestures(), vis = new Visuals($('stage'), $('viz'), video);
  go.textContent = 'Live'; $('overlay').remove(); recBtn.disabled = clrBtn.disabled = false;
  recBtn.onclick = () => synth.record(); clrBtn.onclick = () => synth.clear();
  onkeydown = e => { if (e.key === 'l') synth.record(); if (e.key === 'c') synth.clear(); };
  const set = (id: string, txt: string, m?: number) => { $(id).textContent = txt; if (m !== undefined) $(id + 'm').style.width = `${m * 100}%`; };

  const loop = () => {
    const hands = track(), { play, ctl } = gest.update(hands);
    if (play) {
      const root = ROOT + quantise(play.x * RANGE), notes = chord(root, play.voices).map(n => Tone.Frequency(n, 'midi').toNote());
      const v = Math.min(1, Math.max(0, 1.15 - play.y * 1.2));
      synth.setNotes(play.pinch ? notes : []); synth.setVolume(play.pinch ? v : 0);
      set('note', notes[0]); set('chord', play.pinch ? `${CHORDS[play.voices - 1]} · ${notes.join(' ')}` : 'Pinch to play'); set('vol', `${Math.round(v * 100)}%`, play.pinch ? v : 0);
      vis.emit(play.tip.x, play.tip.y, play.pinch ? 3 : 1, play.pinch ? '#c6f432' : '#c6f43255');
    } else { synth.setNotes([]); synth.setVolume(0); set('vol', '0%', 0); set('chord', 'Show your right hand'); }
    if (ctl) {
      const f = 1 - ctl.y, hz = 200 * 2 ** (f * 6);
      synth.setFilter(hz); synth.setFx(ctl.open);
      set('flt', hz > 1000 ? `${(hz / 1000).toFixed(1)}k` : `${Math.round(hz)}`, f); set('fx', `${Math.round(ctl.open * 100)}%`, ctl.open);
      vis.emit(ctl.tip.x, ctl.tip.y, 1, '#8b7bff');
    }
    const st = synth.status();
    $('loopfill').style.width = `${st.pos * 100}%`;
    $('loopfill').style.background = st.recording ? '#ff4d5e' : '';
    recBtn.className = 'pill' + (st.recording ? ' on' : st.armed ? ' armed' : '');
    set('loop', st.recording ? 'Recording' : st.armed ? 'Armed' : synth.hasLoop ? 'Playing' : 'Empty');
    const sorted = [...hands].sort((a, b) => b[0].x - a[0].x);
    vis.draw(hands, synth.analyser.getValue() as Float32Array, hands.indexOf(sorted[0]));
    requestAnimationFrame(loop);
  };
  loop();
};
