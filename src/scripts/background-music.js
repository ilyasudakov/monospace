import { getLanguage } from './language.js';

const audio = document.querySelector('[data-background-music]');
const button = document.querySelector('[data-music-switch]');

if (audio && button) {
  const musicVolume = .25;
  let wantsPlaying = false;
  let failed = false;
  let context = null;
  let master = null;
  let fadingOut = false;
  let previousTime = 0;
  let playAttempt = 0;
  audio.volume = musicVolume;

  function prepareAmbience() {
    if (context) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const engine = new AudioContext();
    const source = engine.createMediaElementSource(audio);
    const dry = engine.createGain();
    const wet = engine.createGain();
    const output = engine.createGain();
    const reverb = engine.createConvolver();
    const soften = engine.createBiquadFilter();
    const echo = engine.createDelay(1);
    const echoFeedback = engine.createGain();
    const echoLevel = engine.createGain();
    const echoFilter = engine.createBiquadFilter();
    const length = Math.floor(engine.sampleRate * 3.8);
    const impulse = engine.createBuffer(2, length, engine.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel);
      const delay = Math.floor(engine.sampleRate * .045);
      for (let i = delay; i < length; i++) {
        samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i - delay) / (length - delay), 2);
      }
    }
    reverb.buffer = impulse;
    soften.type = 'lowpass';
    soften.frequency.value = 3200;
    dry.gain.value = .25;
    wet.gain.value = .75;
    echo.delayTime.value = .38;
    echoFeedback.gain.value = .3;
    echoLevel.gain.value = .2;
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 2400;
    output.gain.value = 0;
    source.connect(dry).connect(output);
    source.connect(reverb).connect(soften).connect(wet).connect(output);
    source.connect(echo).connect(echoFilter).connect(echoLevel).connect(output);
    echoFilter.connect(echoFeedback).connect(echo);
    output.connect(engine.destination);
    context = engine;
    master = output;
    audio.volume = 1;
  }

  function fadeTo(target, duration) {
    if (!context || !master) return;
    const now = context.currentTime;
    const from = master.gain.value;
    master.gain.cancelScheduledValues(now);
    const curve = new Float32Array(64);
    for (let i = 0; i < curve.length; i++) {
      const t = i / (curve.length - 1);
      curve[i] = from + (target - from) * (t * t * (3 - 2 * t));
    }
    master.gain.setValueCurveAtTime(curve, now, Math.max(.05, duration));
  }
  function fadeIn() {
    fadingOut = false;
    if (context && master) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0, context.currentTime);
      fadeTo(musicVolume, 1.5);
    }
  }

  function updateControl() {
    const playing = !audio.paused && (!context || context.state === 'running');
    button.dataset.paused = String(!wantsPlaying);
    button.setAttribute('aria-pressed', String(wantsPlaying));
    const waiting = wantsPlaying && !playing;
    const label = getLanguage() === 'ru'
      ? (failed ? 'Не удалось включить музыку. Попробовать ещё раз' : waiting ? 'Музыка запускается · Выключить' : wantsPlaying ? 'Выключить музыку · Outside' : 'Включить музыку · Outside')
      : (failed ? 'Music could not play. Try again' : waiting ? 'Music is starting · Turn off' : wantsPlaying ? 'Turn music off · Outside' : 'Turn music on · Outside');
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function startMusic() {
    failed = false;
    wantsPlaying = true;
    const attempt = ++playAttempt;
    if (!audio.hasAttribute('src')) audio.src = audio.dataset.src;
    prepareAmbience();
    context?.resume().then(() => {
      if (attempt !== playAttempt || !wantsPlaying) return;
      if (!audio.paused) {
        fadeIn();
        updateControl();
      }
    }).catch(() => {});
    audio.play().then(() => {
      if (attempt !== playAttempt) return;
      if (!wantsPlaying || (context && context.state !== 'running')) audio.pause();
      updateControl();
    }).catch(error => {
      if (attempt !== playAttempt || error.name === 'AbortError' || !wantsPlaying) return;
      wantsPlaying = false;
      failed = true;
      updateControl();
    });
  }
  button.addEventListener('click', () => {
    if (wantsPlaying) {
      ++playAttempt;
      wantsPlaying = false;
      audio.pause();
      updateControl();
    } else startMusic();
  });
  audio.addEventListener('play', () => {
    previousTime = audio.currentTime;
    fadeIn();
    updateControl();
  });
  audio.addEventListener('timeupdate', () => {
    if (audio.paused) return;
    if (audio.currentTime < previousTime - .5) fadeIn();
    previousTime = audio.currentTime;
    const remaining = audio.duration - audio.currentTime;
    if (!fadingOut && remaining > 0 && remaining <= 1.5) {
      fadingOut = true;
      fadeTo(0, remaining / audio.playbackRate);
    }
  });
  audio.addEventListener('pause', () => {
    updateControl();
  });
  audio.addEventListener('error', () => {
    wantsPlaying = false;
    failed = true;
    updateControl();
  });
  window.addEventListener('languagechange', updateControl);
  updateControl();
}
