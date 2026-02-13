/**
 * Pause Manager — global pause/resume with pausable timers.
 */

let paused = false;
const listeners = [];
const activeTimers = new Set();

export function isPaused() {
  return paused;
}

export function pause() {
  if (paused) return;
  paused = true;
  for (const cb of listeners) cb(true);
}

export function resume() {
  if (!paused) return;
  paused = false;
  for (const cb of listeners) cb(false);
}

export function togglePause() {
  if (paused) resume(); else pause();
}

/**
 * Register a callback for pause/resume events.
 * cb(isPaused: boolean)
 * Returns an unsubscribe function.
 */
export function onPauseChange(cb) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Pausable setTimeout replacement.
 * Returns { clear() } instead of a raw timeout id.
 */
export function pausableTimeout(cb, ms) {
  let remaining = ms;
  let startTime = Date.now();
  let timerId = null;
  let done = false;

  const handle = {
    clear() {
      if (done) return;
      done = true;
      if (timerId != null) clearTimeout(timerId);
      unsub();
      activeTimers.delete(handle);
    },
  };

  activeTimers.add(handle);

  function fire() {
    if (done) return;
    done = true;
    unsub();
    activeTimers.delete(handle);
    cb();
  }

  function schedule() {
    startTime = Date.now();
    timerId = setTimeout(fire, remaining);
  }

  const unsub = onPauseChange((isPaused) => {
    if (done) return;
    if (isPaused) {
      // Freeze: save how much time is left
      if (timerId != null) {
        clearTimeout(timerId);
        timerId = null;
      }
      const elapsed = Date.now() - startTime;
      remaining = Math.max(0, remaining - elapsed);
    } else {
      // Resume with remaining time
      schedule();
    }
  });

  if (!paused) {
    schedule();
  }

  return handle;
}

/**
 * Cancel all active pausable timers. Used on game restart.
 */
export function cancelAllPausableTimers() {
  for (const handle of [...activeTimers]) {
    handle.clear();
  }
}

/**
 * Pausable delay — Promise version of pausableTimeout.
 */
export function pausableDelay(ms) {
  return new Promise((resolve) => {
    pausableTimeout(resolve, ms);
  });
}

// Escape key toggles pause
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    togglePause();
  }
});
