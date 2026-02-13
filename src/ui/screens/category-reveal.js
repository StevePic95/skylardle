/**
 * Category Reveal — shows categories one at a time with animation.
 */

import { h, showScreen } from '../render.js';
import { pausableDelay } from '../../game/pause.js';

/**
 * Show category reveal sequence for a round.
 * categories: string[], roundLabel: string
 * Returns a Promise that resolves when complete.
 */
export async function showCategoryReveal(categories, roundLabel) {
  const list = h('div', { className: 'category-reveal-list' });

  const screen = h('div', { className: 'screen category-reveal-screen' },
    h('div', { className: 'category-reveal-label' }, roundLabel),
    list,
  );
  showScreen(screen);

  // Reveal each category one at a time
  for (const cat of categories) {
    await pausableDelay(800);
    const item = h('div', { className: 'category-reveal-item' }, cat);
    list.appendChild(item);
  }

  // All visible for 1s
  await pausableDelay(1000);
}
