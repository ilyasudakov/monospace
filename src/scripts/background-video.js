const video = document.querySelector('[data-background-video]');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (video) {
  video.muted = true;
  function syncPlayback() {
    if (document.hidden || motion.matches || navigator.connection?.saveData) {
      video.pause();
      return;
    }
    if (!video.hasAttribute('src')) video.src = video.dataset.src;
    video.play().catch(() => {
      // The poster remains visible when autoplay is unavailable.
    });
  }
  document.addEventListener('visibilitychange', syncPlayback);
  motion.addEventListener('change', syncPlayback);
  syncPlayback();
}
