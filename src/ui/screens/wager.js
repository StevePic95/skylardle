import { h, showScreen, showOverlay, formatMoney } from '../render.js';
import { pausableTimeout, pausableDelay } from '../../game/pause.js';

/**
 * Show the wager screen.
 * For player: returns a promise resolving to the wager amount.
 * For bot DD: shows the reveal and returns after delay.
 *
 * opts:
 *   type: 'daily-double' | 'final'
 *   category: string
 *   maxWager: number (for player)
 *   currentScore: number (for player)
 *   botName?: string (if bot DD)
 *   botWager?: number (if bot DD)
 */
export async function showWagerScreen(opts) {
  const { type, category, maxWager, currentScore, botName, botWager } = opts;

  // Daily Double reveal animation
  if (type === 'daily-double') {
    await showDailyDoubleReveal();
  }

  // Bot Daily Double - just show the reveal and wager briefly
  if (botName != null) {
    const screen = h('div', { className: 'screen wager-screen' },
      h('div', { className: 'wager-title' }, 'Daily Double!'),
      h('div', { className: 'wager-category' }, category),
      h('div', { className: 'clue-text' }, `${botName} wagers ${formatMoney(botWager)}`),
    );
    showScreen(screen);
    await pausableDelay(2000);
    return botWager;
  }

  // Player wager input
  return new Promise((resolve) => {
    const minWager = 5;
    const effectiveMax = Math.max(minWager, maxWager || 0);
    let currentWager = Math.min(Math.floor(effectiveMax / 2), effectiveMax);

    const amountDisplay = h('div', { className: 'wager-amount' }, formatMoney(currentWager));

    const slider = h('input', {
      className: 'wager-slider',
      type: 'range',
      min: String(minWager),
      max: String(effectiveMax),
      value: String(currentWager),
      step: type === 'final' ? '1' : '100',
    });

    slider.addEventListener('input', () => {
      currentWager = parseInt(slider.value, 10);
      amountDisplay.textContent = formatMoney(currentWager);
    });

    const confirmBtn = h('button', {
      className: 'btn btn-primary',
      onClick: () => resolve(currentWager),
    }, 'Lock In Wager');

    const title = type === 'daily-double' ? 'Daily Double!' : 'Final Jeopardy';

    const screen = h('div', { className: 'screen wager-screen' },
      h('div', { className: 'wager-title' }, title),
      h('div', { className: 'wager-category' }, category),
      h('div', { className: 'wager-balance' }, `Your score: ${formatMoney(currentScore)}`),
      h('div', { className: 'wager-input-group' },
        amountDisplay,
        slider,
      ),
      confirmBtn,
    );

    showScreen(screen);
  });
}

async function showDailyDoubleReveal() {
  return new Promise((resolve) => {
    const overlay = h('div', { className: 'daily-double-overlay' },
      h('div', { className: 'daily-double-text' }, 'DAILY\nDOUBLE!'),
    );
    const remove = showOverlay(overlay);
    pausableTimeout(() => {
      remove();
      resolve();
    }, 1500);
  });
}
