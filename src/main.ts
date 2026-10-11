import * as Tone from 'tone';
import { createTracker } from './tracker';
import { Gestures, TIPS, type HandState } from './gestures';
import { Synth } from './synth';
import { Visuals } from './visuals';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const scaleSel = $<HTMLSelectElement>('scale'), recBtn = $<HTMLButtonElement>('rec'), clrBtn = $<HTMLButtonElement>('clr');
const ROOT = 57; // A3

const fx = { delay: false, reverb: false, filter: false, chorus: false };
document.querySelectorAll<HTMLButtonElement>('.fx').forEach(b => b.onclick = () => {
  const k = b.dataset.fx as keyof typeof fx; fx[k] = !fx[k]; b.classList.toggle('on', fx[k]);
});

/** Scale degree -> midi. */
const midi = (deg: number, oct: number) => {
  const s = scaleSel.value.split(',').map(Number);
  return ROOT + 12 * oct + s[deg % s.length] + 12 * Math.floor(deg / s.length);
};
const pressed = (h: HandState | null, offset: number) => h ? h.touch.flatMap((on, i) => on ? [i + offset] : []) : [];

$('go').onclick = async () => {
  const go = $<HTMLButtonElement>('go'); go.disabled = true; go.textContent = 'Loading…';
  const synth = new Synth(); await synth.start();
  const video = $<HTMLVideoElement>('video');
  const track = await createTracker(video);
  const gest = new Gestures(), vis = new Visuals($('stage'), $('viz'), video);
  go.textContent = 'Live'; $('overlay').remove(); recBtn.disabled = clrBtn.disabled = false;
  synth.setVolume(0.8);
  recBtn.onclick = () => synth.record(); clrBtn.onclick = () => synth.clear();
  onkeydown = e => { if (e.key === 'l') synth.record(); if (e.key === 'c') synth.clear(); };

  const loop = () => {
    const { hands, jaw } = track(), { right, left, mouth } = gest.update(hands, jaw);
    synth.setDelay(+fx.delay); synth.setReverb(+fx.reverb); synth.setChorus(+fx.chorus);
    synth.setFilter(fx.filter ? 1200 + 1000 * Math.sin(performance.now() / 400) : 6000);

    const degs = [...pressed(right, 0), ...pressed(left, 4)];
    const notes = degs.map(d => Tone.Frequency(midi(d, mouth ? 1 : 0), 'midi').toNote());
    synth.setNotes(notes);
    $('note').textContent = notes[0] ?? '—';
    $('chord').textContent = notes.length > 1 ? notes.join(' · ') : !hands.length ? 'Show your hands' : notes.length ? '' : 'Touch a finger to your thumb';
    $('mouth').textContent = mouth ? 'Open · +1 oct' : 'Closed';
    $('mouthcard').classList.toggle('on', mouth);

    for (const [h, col] of [[right, '#c6f432'], [left, '#8b7bff']] as const)
      h?.touch.forEach((on, i) => on && vis.emit(h.hand[TIPS[i]].x, h.hand[TIPS[i]].y, 3, col));

    const st = synth.status();
    $('loopfill').style.width = `${st.pos * 100}%`;
    $('loopfill').style.background = st.recording ? '#ff4d5e' : '';
    recBtn.className = 'pill' + (st.recording ? ' on' : st.armed ? ' armed' : '');
    $('loop').textContent = st.recording ? 'Recording' : st.armed ? 'Armed' : synth.hasLoop ? 'Playing' : 'Empty';
    vis.draw(hands, synth.analyser.getValue() as Float32Array, right ? hands.findIndex(h => h[0].x === Math.max(...hands.map(q => q[0].x))) : -1);
    requestAnimationFrame(loop);
  };
  loop();
};
