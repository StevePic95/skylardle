/**
 * Intro Sequence — Jeopardy-style contestant introduction.
 */

import { h, showScreen } from '../render.js';
import { pausableDelay } from '../../game/pause.js';

/**
 * Show the full intro sequence.
 * contestants: [{ name, bio }] — player first, then bots
 * Returns a Promise that resolves when the intro is complete.
 */
export async function showIntroSequence(contestants) {
  // 1. Title card
  const titleScreen = h('div', { className: 'screen intro-screen' },
    h('div', { className: 'intro-title' }, 'This... is... Skylardy!'),
  );
  showScreen(titleScreen);
  await pausableDelay(2000);

  // 2. Ken: "Let's meet today's contestants..."
  const hostScreen = h('div', { className: 'screen intro-screen' },
    h('div', { className: 'intro-host-line' },
      h('span', {}, '\uD83C\uDF99\uFE0F '),
      h('span', { className: 'text-gold' }, 'Ken Jennings'),
    ),
    h('div', { className: 'intro-title', style: { fontSize: '1.4rem' } },
      'Let\'s meet today\'s contestants...',
    ),
  );
  showScreen(hostScreen);
  await pausableDelay(1500);

  // 3. Contestant cards one at a time
  const cardsScreen = h('div', { className: 'screen intro-screen' });
  showScreen(cardsScreen);

  for (const contestant of contestants) {
    await pausableDelay(1500);
    const card = h('div', { className: 'intro-contestant' },
      h('div', { className: 'intro-contestant-name' }, contestant.name),
      h('div', { className: 'intro-contestant-desc' }, contestant.bio),
    );
    cardsScreen.appendChild(card);
  }

  // 4. "Let's play Jeopardy!"
  await pausableDelay(1500);
  const playScreen = h('div', { className: 'screen intro-screen' },
    h('div', { className: 'intro-title' }, 'Let\'s play Jeopardy!'),
  );
  showScreen(playScreen);
  await pausableDelay(1500);
}
