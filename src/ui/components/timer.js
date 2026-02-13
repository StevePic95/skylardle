import { h } from '../render.js';
import { onPauseChange } from '../../game/pause.js';

/**
 * Create a timer bar element.
 * Returns { el, start(durationMs, onComplete), stop(), reset() }
 */
export function createTimer() {
  const bar = h('div', { className: 'timer-bar' });
  bar.style.width = '100%';

  const container = h('div', { className: 'timer-bar-container' }, bar);

  let animFrame = null;
  let startTime = null;
  let duration = null;
  let onComplete = null;
  let running = false;
  let elapsed = 0;   // total elapsed before current run segment
  let unsub = null;

  function tick() {
    if (!running) return;
    const now = Date.now();
    const totalElapsed = elapsed + (now - startTime);
    const pct = Math.max(0, 1 - totalElapsed / duration);
    bar.style.width = `${pct * 100}%`;

    if (pct < 0.3) {
      bar.classList.add('warning');
    }

    if (pct <= 0) {
      running = false;
      cleanup();
      if (onComplete) onComplete();
      return;
    }

    animFrame = requestAnimationFrame(tick);
  }

  function cleanup() {
    if (unsub) { unsub(); unsub = null; }
  }

  return {
    el: container,

    start(durationMs, completeCb) {
      duration = durationMs;
      onComplete = completeCb;
      startTime = Date.now();
      elapsed = 0;
      running = true;
      bar.style.width = '100%';
      bar.classList.remove('warning');

      // Subscribe to pause/resume
      if (unsub) unsub();
      unsub = onPauseChange((isPaused) => {
        if (!running) return;
        if (isPaused) {
          // Freeze: accumulate elapsed, stop RAF
          elapsed += Date.now() - startTime;
          if (animFrame) {
            cancelAnimationFrame(animFrame);
            animFrame = null;
          }
        } else {
          // Resume: reset segment start time, restart RAF
          startTime = Date.now();
          animFrame = requestAnimationFrame(tick);
        }
      });

      animFrame = requestAnimationFrame(tick);
    },

    stop() {
      running = false;
      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
      cleanup();
    },

    reset() {
      this.stop();
      bar.style.width = '100%';
      bar.classList.remove('warning');
    }
  };
}
