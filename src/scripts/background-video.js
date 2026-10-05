import { getLanguage } from './language.js';

let video = document.querySelector('[data-background-video]');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const wideScreen = window.matchMedia('(min-width: 900px)');

if (video) {
  video.muted = true;
  video.autoplay = false;
  video.defaultPlaybackRate = 0.65;
  video.playbackRate = 0.65;
  const layers = [video];
  let handoff = null;
  if (typeof video.requestVideoFrameCallback === 'function') {
    const standby = video.cloneNode(false);
    standby.removeAttribute('data-background-video');
    standby.removeAttribute('src');
    standby.preload = 'auto';
    standby.muted = true;
    standby.autoplay = false;
    standby.defaultPlaybackRate = video.defaultPlaybackRate;
    standby.playbackRate = video.playbackRate;
    standby.style.opacity = '0';
    video.after(standby);
    layers.push(standby);
  }
  function cancelHandoff() {
    if (handoff !== null) {
      clearTimeout(handoff);
      layers.filter(layer => layer !== video).forEach(layer => {
        layer.pause();
        layer.currentTime = 0;
      });
    }
    handoff = null;
  }
  function prepareStandby() {
    const standby = layers.find(layer => layer !== video);
    if (!standby || !video.hasAttribute('src') || video.readyState < 2 || video.paused) return;
    if (standby.getAttribute('src') !== video.getAttribute('src')) {
      standby.src = video.getAttribute('src');
    }
  }
  const button = document.querySelector('[data-video-switch]');
  const readPreference = value => value === 'play' || value === 'pause' ? value : null;
  let preference = null;
  try { preference = readPreference(localStorage.getItem('background-video')); } catch {}
  const motionAllowed = () => preference === 'play' || (preference !== 'pause' && !motion.matches && !navigator.connection?.saveData);
  function updateControl() {
    if (!button) return;
    button.dataset.paused = String(video.paused);
    const label = getLanguage() === 'ru'
      ? (video.paused ? 'Запустить фоновое видео' : 'Приостановить фоновое видео')
      : (video.paused ? 'Play background video' : 'Pause background video');
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  button?.addEventListener('click', () => {
    preference = video.paused ? 'play' : 'pause';
    try { localStorage.setItem('background-video', preference); } catch {}
    autoplayBlocked = false;
    syncPlayback();
    updateControl();
  });
  layers.forEach(layer => {
    layer.addEventListener('play', updateControl);
    layer.addEventListener('pause', updateControl);
    layer.addEventListener('playing', () => {
      if (layer !== video) return;
      prepareStandby();
      if (typeof layer.requestVideoFrameCallback !== 'function') layer.style.opacity = '1';
    });
    if (typeof layer.requestVideoFrameCallback !== 'function') return;
    function observeFrame(now, frame) {
      layer.requestVideoFrameCallback(observeFrame);
      if (layer === video && !layer.paused) layer.style.opacity = '1';
      if (layer !== video || document.hidden || !motionAllowed() || handoff !== null) return;
      const remaining = layer.duration - frame.mediaTime;
      if (remaining > 1 / 30 + 0.002 || remaining <= 0) return;
      const standby = layers.find(other => other !== layer);
      if (!standby || standby.readyState < 2) return;
      // Start the already decoded first frame before the current player seeks.
      // Keep the last frame visible for its normal duration; no visual blend.
      const delay = remaining / layer.playbackRate * 1000;
      handoff = setTimeout(() => {
        if (video !== layer || document.hidden || !motionAllowed()) {
          cancelHandoff();
          return;
        }
        standby.play().catch(() => {});
        handoff = setTimeout(() => {
          handoff = null;
          if (video !== layer || document.hidden || !motionAllowed() || standby.paused) {
            standby.pause();
            standby.currentTime = 0;
            return;
          }
          video = standby;
          standby.style.opacity = '1';
          layer.style.opacity = '0';
          layer.pause();
          layer.currentTime = 0;
          lastTime = null;
          stalledChecks = 0;
          updateControl();
        }, Math.min(20, delay));
      }, Math.max(0, delay - 20));
    }
    layer.requestVideoFrameCallback(observeFrame);
  });
  window.addEventListener('languagechange', updateControl);
  window.addEventListener('storage', event => {
    if (event.key !== 'background-video') return;
    preference = readPreference(event.newValue);
    syncPlayback();
    updateControl();
  });
  updateControl();
  let retryTimer = null;
  let autoplayBlocked = false;
  let lastTime = null;
  let stalledChecks = 0;
  const source = () => wideScreen.matches ? video.dataset.wideSrc : video.dataset.src;
  function updateSource() {
    cancelHandoff();
    layers.filter(layer => layer !== video).forEach(layer => layer.pause());
    video.poster = wideScreen.matches ? video.dataset.widePoster : video.dataset.poster;
    if (video.hasAttribute('src') && video.getAttribute('src') !== source()) {
      video.style.opacity = '0';
      video.src = source();
    }
    prepareStandby();
  }
  updateSource();
  wideScreen.addEventListener('change', () => {
    updateSource();
    resumePlayback();
  });

  function syncPlayback(restart = false) {
    if (!motionAllowed()) {
      cancelHandoff();
      layers.forEach(layer => layer.pause());
      return;
    }
    // Let the browser suspend background rendering without racing its lifecycle.
    if (document.hidden) return;
    if (!video.hasAttribute('src')) video.src = source();
    prepareStandby();
    if (restart) {
      cancelHandoff();
      layers.forEach(layer => layer.pause());
    }
    video.play().catch(error => {
      autoplayBlocked = error.name === 'NotAllowedError';
      if (error.name === 'AbortError' && retryTimer === null && !document.hidden) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          syncPlayback();
        }, 250);
      }
    });
  }

  function resumePlayback() {
    if (document.hidden) return;
    autoplayBlocked = false;
    lastTime = null;
    stalledChecks = 0;
    // play() alone is a no-op when a suspended player still reports paused=false.
    syncPlayback(true);
  }

  document.addEventListener('visibilitychange', resumePlayback);
  window.addEventListener('focus', resumePlayback);
  window.addEventListener('pageshow', resumePlayback);
  motion.addEventListener('change', () => syncPlayback());
  navigator.connection?.addEventListener('change', () => syncPlayback());
  document.addEventListener('pointerdown', () => {
    if (video.paused || autoplayBlocked) resumePlayback();
  });

  // Some browser lifecycle transitions don't produce a pause or focus event.
  setInterval(() => {
    if (document.hidden || !motionAllowed() || autoplayBlocked) {
      lastTime = null;
      stalledChecks = 0;
      return;
    }
    stalledChecks = lastTime === video.currentTime ? stalledChecks + 1 : 0;
    lastTime = video.currentTime;
    if (video.paused || stalledChecks >= 2) {
      stalledChecks = 0;
      syncPlayback(true);
    }
  }, 1000);
  syncPlayback();
}
