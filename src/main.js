/**
 * Skylardy - Daily Jeopardy
 * Entry point: loads board data and manages game lifecycle.
 */

import './style.css';
import { isAuthenticated, showLoginScreen } from './ui/screens/login.js';
import { showTitleScreen } from './ui/screens/title.js';
import { startGame } from './game/engine.js';
import { isTodayComplete, loadGameState, getTodayKey } from './game/storage.js';

const BASE_URL = import.meta.env.BASE_URL || '/';

async function loadManifest() {
  const resp = await fetch(`${BASE_URL}boards/index.json`);
  return resp.json();
}

async function loadBoard(id) {
  const resp = await fetch(`${BASE_URL}boards/${id}.json`);
  return resp.json();
}

function getBoardIdForToday(manifest) {
  const start = new Date(manifest.startDate + 'T00:00:00');
  const now = new Date();
  // Reset both to midnight local time for day diff
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((todayDay - startDay) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Before start date - show board 1 (preview)
    return 1;
  }

  // Cycle through available boards (1-indexed)
  return (diffDays % manifest.boardCount) + 1;
}

async function init() {
  if (!isAuthenticated()) {
    await showLoginScreen();
  }

  try {
    const manifest = await loadManifest();
    const boardId = getBoardIdForToday(manifest);

    showTitleScreen(async () => {
      try {
        const boardData = await loadBoard(boardId);
        const savedState = loadGameState();
        await startGame(boardData, savedState);
      } catch (err) {
        console.error('Failed to load board:', err);
        document.getElementById('screen-container').innerHTML =
          '<div class="screen title-screen"><div class="clue-text">Failed to load today\'s board. Please refresh.</div></div>';
      }
    });
  } catch (err) {
    console.error('Failed to initialize:', err);
    document.getElementById('screen-container').innerHTML =
      '<div class="screen title-screen"><div class="clue-text">Failed to connect. Please refresh.</div></div>';
  }
}

init();
