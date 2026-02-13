const STORAGE_KEY = 'skylardy';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

/**
 * Get today's date string (YYYY-MM-DD) in local timezone.
 */
export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Save in-progress game state for today.
 */
export function saveGameState(state) {
  const data = load();
  data.currentGame = {
    date: getTodayKey(),
    state,
  };
  save(data);
}

/**
 * Load in-progress game state if it's from today.
 */
export function loadGameState() {
  const data = load();
  if (data.currentGame && data.currentGame.date === getTodayKey()) {
    return data.currentGame.state;
  }
  return null;
}

/**
 * Clear the in-progress game state.
 */
export function clearGameState() {
  const data = load();
  delete data.currentGame;
  save(data);
}

/**
 * Mark today's game as complete with results.
 */
export function saveCompletion(results) {
  const data = load();
  const today = getTodayKey();

  if (!data.completedDays) data.completedDays = {};
  data.completedDays[today] = results;

  // Update stats
  if (!data.stats) {
    data.stats = { wins: 0, gamesPlayed: 0, currentStreak: 0, bestStreak: 0, highScore: 0 };
  }

  data.stats.gamesPlayed++;

  if (results.playerWon) {
    data.stats.wins++;
    data.stats.currentStreak++;
    if (data.stats.currentStreak > data.stats.bestStreak) {
      data.stats.bestStreak = data.stats.currentStreak;
    }
  } else {
    data.stats.currentStreak = 0;
  }

  if (results.playerScore > data.stats.highScore) {
    data.stats.highScore = results.playerScore;
  }

  // Clear in-progress state
  delete data.currentGame;
  save(data);
}

/**
 * Check if today's game is already completed.
 */
export function isTodayComplete() {
  const data = load();
  return !!(data.completedDays && data.completedDays[getTodayKey()]);
}

/**
 * Get today's completed results, or null.
 */
export function getTodayResults() {
  const data = load();
  if (data.completedDays) {
    return data.completedDays[getTodayKey()] || null;
  }
  return null;
}

/**
 * Get player stats.
 */
export function getStats() {
  const data = load();
  return data.stats || { wins: 0, gamesPlayed: 0, currentStreak: 0, bestStreak: 0, highScore: 0 };
}
