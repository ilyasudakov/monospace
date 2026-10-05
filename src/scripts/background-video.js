import { getLanguage } from './language.js';

const video = document.querySelector('[data-background-video]');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const wideScreen = window.matchMedia('(min-width: 900px)');

if (video) {
  video.muted = true;
  video.autoplay = false;
  video.defaultPlaybackRate = 0.65;
  video.playbackRate = 0.65;
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
  video.addEventListener('play', updateControl);
  video.addEventListener('pause', updateControl);
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
    video.poster = wideScreen.matches ? video.dataset.widePoster : video.dataset.poster;
    if (video.hasAttribute('src') && video.getAttribute('src') !== source()) video.src = source();
  }
  updateSource();
  wideScreen.addEventListener('change', () => {
    updateSource();
    resumePlayback();
  });

  function syncPlayback(restart = false) {
    if (!motionAllowed()) {
      video.pause();
      return;
    }
    // Let the browser suspend background rendering without racing its lifecycle.
    if (document.hidden) return;
    if (!video.hasAttribute('src')) video.src = source();
    if (restart) video.pause();
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
