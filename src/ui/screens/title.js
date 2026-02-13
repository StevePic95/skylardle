import { h, showScreen } from '../render.js';
import { getStats, isTodayComplete, getTodayResults } from '../../game/storage.js';

/**
 * Show the title/splash screen.
 * onPlay: callback when user taps Play
 */
export function showTitleScreen(onPlay) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stats = getStats();
  const completed = isTodayComplete();
  const todayResults = getTodayResults();

  const children = [
    h('div', { className: 'title-logo' }, 'SKYLARDY'),
    h('div', { className: 'title-subtitle' }, 'Daily Jeopardy'),
    h('div', { className: 'title-date' }, dateStr),
  ];

  if (completed && todayResults) {
    children.push(
      h('div', { className: 'title-subtitle' },
        todayResults.playerWon ? 'You won today!' : `${todayResults.winner?.name ?? 'Someone'} won today`),
      h('div', { className: 'title-subtitle' },
        `Your score: $${(todayResults.playerScore ?? 0).toLocaleString()}`),
      h('div', { className: 'results-comeback' }, 'Come back tomorrow for a new game!'),
    );
  } else {
    children.push(
      h('button', { className: 'btn btn-primary', onClick: onPlay }, 'Play'),
    );
  }

  if (stats.gamesPlayed > 0) {
    children.push(
      h('div', { className: 'title-stats' },
        `Games: ${stats.gamesPlayed} | Wins: ${stats.wins} | Streak: ${stats.currentStreak}`,
        h('br'),
        `Best Streak: ${stats.bestStreak} | High Score: $${stats.highScore.toLocaleString()}`,
      ),
    );
  }

  const screen = h('div', { className: 'screen title-screen' }, ...children);
  showScreen(screen);
}
