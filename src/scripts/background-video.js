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
  let focused = document.hasFocus();
  let lastFrameAt = performance.now();
  let recoveryTimer = null;
  let playAttempt = 0;
  let wasAway = false;
  let returnedAt = 0;
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
    layer.addEventListener('pause', () => {
      updateControl();
      if (layer === video && !document.hidden && motionAllowed()) scheduleRecovery();
    });
    layer.addEventListener('playing', () => {
      if (layer !== video) return;
      prepareStandby();
      if (typeof layer.requestVideoFrameCallback !== 'function') layer.style.opacity = '1';
    });
    if (typeof layer.requestVideoFrameCallback !== 'function') return;
    function observeFrame(now, frame) {
      layer.requestVideoFrameCallback(observeFrame);
      if (layer === video && !layer.paused) {
        layer.style.opacity = '1';
        lastFrameAt = now;
      }
      if (layer !== video || document.hidden || !focused || !motionAllowed() || handoff !== null) return;
      const remaining = layer.duration - frame.mediaTime;
      if (remaining > 1 / 30 + 0.002 || remaining <= 0) return;
      const standby = layers.find(other => other !== layer);
      if (!standby || standby.readyState < 2) return;
      // Start the already decoded first frame before the current player seeks.
      // Keep the last frame visible for its normal duration; no visual blend.
      const delay = remaining / layer.playbackRate * 1000;
      handoff = setTimeout(() => {
        if (video !== layer || document.hidden || !focused || !motionAllowed()) {
          cancelHandoff();
          return;
        }
        standby.play().catch(() => {});
        handoff = setTimeout(() => {
          handoff = null;
          if (video !== layer || document.hidden || !focused || !motionAllowed() || standby.paused) {
            standby.pause();
            standby.currentTime = 0;
            return;
          }
          video = standby;
          lastFrameAt = performance.now();
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
  const darkTheme = () => document.documentElement.dataset.theme === 'dark';
  const source = () => darkTheme()
    ? (wideScreen.matches ? video.dataset.darkWideSrc : video.dataset.darkSrc)
    : (wideScreen.matches ? video.dataset.wideSrc : video.dataset.src);
  function updateSource() {
    cancelHandoff();
    layers.filter(layer => layer !== video).forEach(layer => layer.pause());
    const poster = darkTheme()
      ? (wideScreen.matches ? video.dataset.darkWidePoster : video.dataset.darkPoster)
      : (wideScreen.matches ? video.dataset.widePoster : video.dataset.poster);
    layers.forEach(layer => { layer.poster = poster; });
    if (video.hasAttribute('src') && video.getAttribute('src') !== source()) {
      ++playAttempt;
      layers.forEach(layer => {
        layer.style.opacity = '0';
        layer.pause();
      });
      lastTime = null;
      stalledChecks = 0;
      video.src = source();
    }
    prepareStandby();
  }
  updateSource();
  wideScreen.addEventListener('change', () => {
    updateSource();
    resumePlayback();
  });
  window.addEventListener('themechange', () => {
    updateSource();
    resumePlayback();
    updateControl();
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
    const player = video;
    const attempt = ++playAttempt;
    player.play().then(() => {
      if (player === video && attempt === playAttempt) autoplayBlocked = false;
    }).catch(error => {
      // A pending play() from before blur must not disable newer recovery attempts.
      if (player !== video || attempt !== playAttempt || document.hidden) return;
      autoplayBlocked = error.name === 'NotAllowedError';
      if (error.name === 'AbortError' && retryTimer === null && !document.hidden) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          syncPlayback();
        }, 250);
      }
    });
  }

  function cancelRecovery() {
    if (recoveryTimer !== null) clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
  function restoreDecoder() {
    if (document.hidden || !motionAllowed()) return;
    cancelHandoff();
    const player = video;
    const position = player.currentTime;
    const attempt = ++playAttempt;
    player.addEventListener('loadedmetadata', () => {
      if (player !== video || attempt !== playAttempt || document.hidden || !motionAllowed()) return;
      player.currentTime = Math.min(position, Math.max(0, player.duration - 1 / 30));
      lastFrameAt = performance.now();
      syncPlayback();
    }, { once: true });
    player.load();
  }
  function scheduleRecovery() {
    cancelRecovery();
    if (document.hidden || !motionAllowed()) return;
    const delays = [0, 250, 750];
    let step = 0;
    function recover() {
      recoveryTimer = null;
      if (document.hidden || !motionAllowed()) return;
      if (wasAway && step > 0 && typeof video.requestVideoFrameCallback === 'function') {
        wasAway = false;
        if (lastFrameAt <= returnedAt) {
          restoreDecoder();
          if (++step < delays.length) recoveryTimer = setTimeout(recover, delays[step]);
          return;
        }
      }
      if (video.paused || autoplayBlocked) syncPlayback();
      if (++step < delays.length) recoveryTimer = setTimeout(recover, delays[step]);
    }
    recoveryTimer = setTimeout(recover, delays[0]);
  }

  function resumePlayback() {
    if (document.hidden) return;
    autoplayBlocked = false;
    lastTime = null;
    stalledChecks = 0;
    lastFrameAt = performance.now();
    returnedAt = lastFrameAt;
    cancelHandoff();
    // Don't interrupt a player that kept running while the window was unfocused.
    // The frame watchdog below recovers suspended decoders if play() is a no-op.
    syncPlayback();
    // Browser suspension may finish after focus/visibilitychange has fired.
    scheduleRecovery();
  }

  document.addEventListener('visibilitychange', () => {
    ++playAttempt;
    cancelRecovery();
    cancelHandoff();
    if (document.hidden) wasAway = true;
    if (!document.hidden) {
      focused = document.hasFocus();
      resumePlayback();
    }
  });
  window.addEventListener('blur', () => {
    focused = false;
    wasAway = true;
    ++playAttempt;
    cancelRecovery();
    // Background timers can be throttled between the two handoff steps.
    // Keep the active layer's native loop running instead of swapping players.
    cancelHandoff();
  });
  window.addEventListener('focus', () => {
    focused = true;
    resumePlayback();
  });
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
    const framesStalled = focused && typeof video.requestVideoFrameCallback === 'function'
      && performance.now() - lastFrameAt >= 2500;
    if (video.paused || stalledChecks >= 2 || framesStalled) {
      stalledChecks = 0;
      lastFrameAt = performance.now();
      if (framesStalled) restoreDecoder();
      else syncPlayback(true);
    }
  }, 1000);
  syncPlayback();
}
