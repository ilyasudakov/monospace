const video = document.querySelector('[data-background-video]');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (video) {
  video.muted = true;
  video.autoplay = true;
  video.defaultPlaybackRate = 0.8;
  video.playbackRate = 0.8;
  const motionAllowed = () => !motion.matches && !navigator.connection?.saveData;
  let retryTimer = null;
  let autoplayBlocked = false;
  let lastTime = null;
  let stalledChecks = 0;

  function syncPlayback(restart = false) {
    if (!motionAllowed()) {
      video.pause();
      return;
    }
    // Let the browser suspend background rendering without racing its lifecycle.
    if (document.hidden) return;
    if (!video.hasAttribute('src')) video.src = video.dataset.src;
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
