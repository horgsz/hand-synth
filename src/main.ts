import * as Tone from 'tone';
import { createTracker } from './tracker';
import { Gestures, TIPS } from './gestures';
import { Synth } from './synth';
import { Visuals } from './visuals';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const scaleSel = $<HTMLSelectElement>('scale'), recBtn = $<HTMLButtonElement>('rec'), clrBtn = $<HTMLButtonElement>('clr');
const ROOT = 57; // A3
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];

/** Finger i -> i-th scale degree above root. */
const noteFor = (i: number, oct: number) => {
  const s = scaleSel.value.split(',').map(Number);
  return ROOT + 12 * oct + s[i % s.length] + 12 * Math.floor(i / s.length);
};

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
  let filt = 0;

  const loop = () => {
    const hands = track(), { play, ctl } = gest.update(hands);
    const fx = ctl?.touch ?? [false, false, false, false];
    synth.setDelay(fx[0] ? 1 : 0); synth.setReverb(fx[1] ? 1 : 0);
    filt += ((fx[2] ? 1 : 0) - filt) * 0.08; synth.setFilter(4000 * 2 ** (-filt * 4) + (fx[2] ? 300 * Math.sin(performance.now() / 150) + 300 : 0));
    fx.forEach((on, i) => $('fx' + i).classList.toggle('on', on));

    const idx = play ? play.touch.flatMap((on, i) => on ? [i] : []) : [];
    const notes = idx.map(i => Tone.Frequency(noteFor(i, fx[3] ? 1 : 0), 'midi').toNote());
    synth.setNotes(notes);
    $('note').textContent = notes[0] ?? '—';
    $('chord').textContent = !play ? 'Show your right hand' : idx.length ? idx.map(i => FINGERS[i]).join(' + ') + (notes.length > 1 ? ' · ' + notes.join(' ') : '') : 'Touch a finger to your thumb';

    if (play) idx.forEach(i => vis.emit(play.hand[TIPS[i]].x, play.hand[TIPS[i]].y, 3, '#c6f432'));
    if (ctl) fx.forEach((on, i) => on && vis.emit(ctl.hand[TIPS[i]].x, ctl.hand[TIPS[i]].y, 2, '#8b7bff'));

    const st = synth.status();
    $('loopfill').style.width = `${st.pos * 100}%`;
    $('loopfill').style.background = st.recording ? '#ff4d5e' : '';
    recBtn.className = 'pill' + (st.recording ? ' on' : st.armed ? ' armed' : '');
    $('loop').textContent = st.recording ? 'Recording' : st.armed ? 'Armed' : synth.hasLoop ? 'Playing' : 'Empty';
    vis.draw(hands, synth.analyser.getValue() as Float32Array, play ? hands.findIndex(h => h[0].x === Math.max(...hands.map(q => q[0].x))) : -1);
    requestAnimationFrame(loop);
  };
  loop();
};
