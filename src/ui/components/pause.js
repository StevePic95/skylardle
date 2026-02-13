/**
 * Pause button + overlay UI.
 */

import { h } from '../render.js';
import { isPaused, togglePause, onPauseChange } from '../../game/pause.js';

let mounted = false;
let btnEl = null;
let overlayEl = null;
let unsub = null;

function createElements(onRestart) {
  btnEl = h('button', {
    className: 'pause-btn',
    onClick: togglePause,
  }, '\u23F8'); // ⏸

  const children = [
    h('div', { className: 'pause-label' }, 'PAUSED'),
    h('button', {
      className: 'btn btn-primary',
      onClick: togglePause,
    }, 'Resume'),
  ];

  if (onRestart) {
    children.push(h('button', {
      className: 'btn',
      onClick: () => {
        togglePause();
        onRestart();
      },
    }, 'Restart Game'));
  }

  overlayEl = h('div', { className: 'pause-overlay hidden' }, ...children);
}

function syncState() {
  if (!btnEl) return;
  if (isPaused()) {
    btnEl.textContent = '\u25B6'; // ▶
    overlayEl.classList.remove('hidden');
  } else {
    btnEl.textContent = '\u23F8'; // ⏸
    overlayEl.classList.add('hidden');
  }
}

export function mountPause(onRestart) {
  if (mounted) return;
  mounted = true;
  createElements(onRestart);

  document.getElementById('app').appendChild(btnEl);
  document.getElementById('app').appendChild(overlayEl);

  unsub = onPauseChange(syncState);
  syncState();
}

export function unmountPause() {
  if (!mounted) return;
  mounted = false;
  if (unsub) { unsub(); unsub = null; }
  if (btnEl && btnEl.parentNode) btnEl.parentNode.removeChild(btnEl);
  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  btnEl = null;
  overlayEl = null;
}
