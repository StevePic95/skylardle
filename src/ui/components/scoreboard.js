import { h, formatMoney } from '../render.js';

let scoreElements = {};

/**
 * Create and mount the scoreboard.
 * players: [{ id, name, score, isHuman }]
 */
export function createScoreboard(players) {
  const container = document.getElementById('scoreboard-container');
  container.innerHTML = '';
  scoreElements = {};

  const board = h('div', { className: 'scoreboard' },
    ...players.map(p => {
      const scoreSpan = h('span', { className: 'scoreboard-score' }, formatMoney(p.score));
      scoreElements[p.id] = scoreSpan;

      return h('div', {
        className: `scoreboard-player${p.isHuman ? ' is-human' : ''}`,
        id: `scoreboard-${p.id}`,
      },
        h('span', { className: 'scoreboard-name' }, p.name),
        scoreSpan
      );
    })
  );

  container.appendChild(board);
}

/**
 * Update a player's score with animation.
 */
export function updateScore(playerId, newScore, direction) {
  const el = scoreElements[playerId];
  if (!el) return;

  el.textContent = formatMoney(newScore);

  el.classList.remove('score-up', 'score-down');
  if (direction === 'up') {
    el.classList.add('score-up');
  } else if (direction === 'down') {
    el.classList.add('score-down');
  }

  setTimeout(() => {
    el.classList.remove('score-up', 'score-down');
  }, 500);
}

/**
 * Highlight the active player (whose turn to pick).
 */
export function setActivePlayer(playerId) {
  document.querySelectorAll('.scoreboard-player').forEach(el => {
    el.classList.remove('active');
  });
  if (playerId) {
    const el = document.getElementById(`scoreboard-${playerId}`);
    if (el) el.classList.add('active');
  }
}

/**
 * Hide the scoreboard.
 */
export function hideScoreboard() {
  document.getElementById('scoreboard-container').innerHTML = '';
}
