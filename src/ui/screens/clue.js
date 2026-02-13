import { h, showScreen, formatMoney } from '../render.js';
import { createTimer } from '../components/timer.js';
import { pausableTimeout } from '../../game/pause.js';

/**
 * Show a clue with optional buzz button.
 * opts: { clue, category, value, canBuzz, buzzDuration, onBuzz, isDailyDouble, isTransition }
 */
export function showClueScreen(opts) {
  const { clue, category, value, canBuzz, buzzDuration, onBuzz, isTransition } = opts;

  const children = [
    h('div', { className: 'clue-text' }, clue),
  ];

  if (canBuzz && onBuzz) {
    const timer = createTimer();
    const buzzBtn = h('button', {
      className: 'buzz-btn',
      onClick: () => {
        timer.stop();
        onBuzz();
      },
    }, 'BUZZ');

    const buzzArea = h('div', { className: 'buzz-area' },
      timer.el,
      buzzBtn,
      h('div', { className: 'buzz-status' }, 'Tap to buzz in!'),
    );

    children.push(buzzArea);

    // Start timer after a brief moment
    pausableTimeout(() => {
      timer.start(buzzDuration || 3000, () => {
        buzzBtn.disabled = true;
      });
    }, 100);
  } else if (!isTransition) {
    children.push(
      h('div', { className: 'buzz-status' }, ''),
    );
  }

  const screen = h('div', { className: 'screen clue-screen' }, ...children);
  showScreen(screen);
}
