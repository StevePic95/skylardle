import { h, showScreen, formatMoney } from '../render.js';
import { getStats } from '../../game/storage.js';
import { hideScoreboard } from '../components/scoreboard.js';

/**
 * Show the game over / results screen.
 * results: { playerWon, playerScore, winner: { name, score }, allScores: [{ name, score, isHuman }] }
 */
export function showResultsScreen(results) {
  hideScoreboard();
  const stats = getStats();

  const scoreCards = results.allScores.map(p => {
    const isWinner = p.score === results.winner.score;
    return h('div', {
      className: `results-player${isWinner ? ' winner' : ''}`,
    },
      h('span', { className: 'results-player-name' }, p.name),
      h('span', { className: 'results-player-score' }, formatMoney(p.score)),
    );
  });

  const winnerMsg = results.playerWon
    ? 'Congratulations! You won!'
    : `${results.winner.name} wins!`;

  const screen = h('div', { className: 'screen results-screen' },
    h('div', { className: 'results-title' }, 'Game Over'),
    h('div', { className: 'results-winner' }, winnerMsg),
    h('div', { className: 'results-scores' }, ...scoreCards),
    h('div', { className: 'results-stats' },
      `Games Played: ${stats.gamesPlayed}`,
      h('br'),
      `Wins: ${stats.wins} | Win Streak: ${stats.currentStreak}`,
      h('br'),
      `Best Streak: ${stats.bestStreak} | High Score: ${formatMoney(stats.highScore)}`,
    ),
    h('div', { className: 'results-comeback' }, 'Come back tomorrow for a new game!'),
  );

  showScreen(screen);
}
