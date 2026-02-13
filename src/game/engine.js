/**
 * Game Engine - State machine and orchestration for a full Jeopardy game.
 */

import { BOT_PROFILES, pickBotsForGame, botBuzzDecision, botAnswerCorrect, botDailyDoubleWager, botFinalWager, botPickClue, computeBuzzWindow } from './bots.js';
import { saveGameState, clearGameState, saveCompletion } from './storage.js';
import { createScoreboard, updateScore, setActivePlayer } from '../ui/components/scoreboard.js';
import { showBoardScreen } from '../ui/screens/board.js';
import { showClueScreen } from '../ui/screens/clue.js';
import { showAnswerInput } from '../ui/screens/answer.js';
import { showWagerScreen } from '../ui/screens/wager.js';
import { showFinalCategory, showFinalClue, showFinalReveal } from '../ui/screens/final.js';
import { showResultsScreen } from '../ui/screens/results.js';
import { showOverlay, h, clearAllScreens } from '../ui/render.js';
import { pausableTimeout, pausableDelay, cancelAllPausableTimers } from './pause.js';
import { mountPause, unmountPause } from '../ui/components/pause.js';
import { chatGameStart, chatCorrectAnswer, chatIncorrectAnswer, chatDailyDouble, chatNobodyBuzzed, chatRoundTransition, chatFinalJeopardy, chatSteal, setActiveBots } from './chat.js';
import { dismissChatBubble } from '../ui/components/chat-bubble.js';
import { showIntroSequence } from '../ui/screens/intro.js';
import { showCategoryReveal } from '../ui/screens/category-reveal.js';

const PLAYER_ID = 'player';
const PLAYER_BIO = 'a cute little industrial engineer from Bellmawr, New Jersey';

let gameState = null;

function createInitialState(boardData, botIds) {
  const bot1 = BOT_PROFILES[botIds[0]];
  const bot2 = BOT_PROFILES[botIds[1]];
  return {
    boardData,
    round: 'single',         // 'single', 'double', 'final'
    botIds,
    players: {
      player: { id: 'player', name: 'Skylar', score: 0, isHuman: true },
      [botIds[0]]: { id: botIds[0], name: bot1.name, score: 0, isHuman: false },
      [botIds[1]]: { id: botIds[1], name: bot2.name, score: 0, isHuman: false },
    },
    currentPicker: PLAYER_ID,  // who picks the next clue
    usedClues: { single: [], double: [] },
    currentClue: null,
    phase: 'board',           // current game phase
    categoriesRevealed: new Set(),
  };
}

function getUsedSet(state) {
  return new Set(state.usedClues[state.round] || []);
}

function getRoundData(state) {
  return state.boardData[state.round];
}

function getValues(round) {
  return round === 'single'
    ? [200, 400, 600, 800, 1000]
    : [400, 800, 1200, 1600, 2000];
}

function cluesRemaining(state) {
  const used = getUsedSet(state);
  return 30 - used.size;
}

function markClueUsed(state, col, row) {
  state.usedClues[state.round].push(`${col},${row}`);
}

function isDailyDouble(state, col, row) {
  const roundData = getRoundData(state);
  return roundData.dailyDoubles.some(([c, r]) => c === col && r === row);
}

function updatePlayerScore(playerId, amount) {
  const player = gameState.players[playerId];
  const oldScore = player.score;
  player.score += amount;
  const direction = amount > 0 ? 'up' : amount < 0 ? 'down' : null;
  updateScore(playerId, player.score, direction);
  return { oldScore, newScore: player.score };
}

/** Map a bot's game ID to its chat character. */
function botChatChar(botId) {
  return BOT_PROFILES[botId].chatCharacter;
}

function persistState() {
  const [bot1Id, bot2Id] = gameState.botIds;
  const snap = {
    round: gameState.round,
    scores: {
      player: gameState.players.player.score,
      [bot1Id]: gameState.players[bot1Id].score,
      [bot2Id]: gameState.players[bot2Id].score,
    },
    currentPicker: gameState.currentPicker,
    usedClues: gameState.usedClues,
    boardId: gameState.boardData.id,
  };
  saveGameState(snap);
}

/**
 * Start a new game with the given board data.
 */
export async function startGame(boardData, savedState) {
  const botIds = pickBotsForGame(boardData.id);
  gameState = createInitialState(boardData, botIds);

  // Restore saved state if available
  if (savedState && savedState.boardId === boardData.id) {
    gameState.round = savedState.round;
    gameState.players.player.score = savedState.scores.player;
    gameState.players[botIds[0]].score = savedState.scores[botIds[0]];
    gameState.players[botIds[1]].score = savedState.scores[botIds[1]];
    gameState.currentPicker = savedState.currentPicker;
    gameState.usedClues = savedState.usedClues;
  }

  const isRestoredSave = savedState && savedState.boardId === boardData.id;

  // Tell chat system which characters are in play
  setActiveBots(botIds.map(id => BOT_PROFILES[id].chatCharacter));

  const playerList = Object.values(gameState.players);
  createScoreboard(playerList);
  mountPause(restartGame);
  chatGameStart();

  if (!isRestoredSave) {
    const contestants = [
      { name: gameState.players.player.name, bio: PLAYER_BIO },
      { name: gameState.players[botIds[0]].name, bio: BOT_PROFILES[botIds[0]].bio },
      { name: gameState.players[botIds[1]].name, bio: BOT_PROFILES[botIds[1]].bio },
    ];
    await showIntroSequence(contestants);
  }

  if (gameState.round === 'final') {
    await runFinalJeopardy();
  } else {
    await runBoard();
  }
}

async function restartGame() {
  cancelAllPausableTimers();
  clearAllScreens();
  dismissChatBubble();
  clearGameState();
  unmountPause();
  await startGame(gameState.boardData, null);
}

async function runBoard() {
  const roundData = getRoundData(gameState);
  const values = getValues(gameState.round);
  const usedSet = getUsedSet(gameState);
  const roundLabel = gameState.round === 'single' ? 'Jeopardy!' : 'Double Jeopardy!';

  setActivePlayer(gameState.currentPicker);

  // Category reveal on first visit to each round
  if (!gameState.categoriesRevealed.has(gameState.round)) {
    gameState.categoriesRevealed.add(gameState.round);
    await showCategoryReveal(roundData.categories, roundLabel);
  }

  // If no clues left, transition
  if (cluesRemaining(gameState) === 0) {
    await transitionRound();
    return;
  }

  showBoardScreen({
    categories: roundData.categories,
    values,
    usedClues: usedSet,
    roundLabel,
    isPlayerTurn: gameState.currentPicker === PLAYER_ID,
    currentPickerName: gameState.players[gameState.currentPicker].name,
    onClueSelect: (col, row) => handleClueSelect(col, row),
  });

  // If it's a bot's turn, have them pick after a delay
  if (gameState.currentPicker !== PLAYER_ID) {
    await pausableDelay(1200);
    const pick = botPickClue(
      BOT_PROFILES[gameState.currentPicker],
      roundData.categories,
      usedSet,
    );
    if (pick) {
      handleClueSelect(pick.col, pick.row);
    } else {
      await transitionRound();
    }
  }
}

async function handleClueSelect(col, row) {
  const roundData = getRoundData(gameState);
  const values = getValues(gameState.round);
  const clueData = roundData.board[col][row];
  const category = roundData.categories[col];
  const value = values[row];

  markClueUsed(gameState, col, row);

  gameState.currentClue = { col, row, clueData, category, value };

  // Check for Daily Double
  if (isDailyDouble(gameState, col, row)) {
    await handleDailyDouble();
    return;
  }

  // Normal clue flow: show clue, then buzz phase
  await runBuzzPhase(clueData, category, value, row);
}

async function handleDailyDouble() {
  const { clueData, category, value } = gameState.currentClue;
  const picker = gameState.currentPicker;
  const pickerData = gameState.players[picker];
  const roundMax = gameState.round === 'single' ? 1000 : 2000;
  const maxWager = Math.max(pickerData.score, roundMax);
  chatDailyDouble(picker === PLAYER_ID ? 'player' : botChatChar(picker));

  if (picker === PLAYER_ID) {
    // Show DD reveal, then wager screen for player
    const wager = await showWagerScreen({
      type: 'daily-double',
      category,
      maxWager,
      currentScore: pickerData.score,
    });

    // Show clue and get answer
    const result = await showAnswerInput({
      clue: clueData.clue,
      category,
      value: wager,
      isDailyDouble: true,
    });

    const correct = checkAnswer(result.answer, clueData.acceptedAnswers);
    const scoreChange = correct ? wager : -wager;
    updatePlayerScore(PLAYER_ID, scoreChange);
    if (correct) chatCorrectAnswer('player');
    else chatIncorrectAnswer('player');

    await showClueResult({
      who: gameState.players.player.name,
      correct,
      formalAnswer: clueData.answer,
      scoreChange,
    });
  } else {
    // Bot Daily Double
    const wager = botDailyDoubleWager(BOT_PROFILES[picker], pickerData.score, maxWager);

    await showWagerScreen({
      type: 'daily-double',
      category,
      botName: pickerData.name,
      botWager: wager,
    });

    // Show the clue briefly
    showClueScreen({
      clue: clueData.clue,
      category,
      value: wager,
      isDailyDouble: true,
    });
    await pausableDelay(2000);

    const correct = botAnswerCorrect(BOT_PROFILES[picker], category);
    const scoreChange = correct ? wager : -wager;
    updatePlayerScore(picker, scoreChange);
    if (correct) chatCorrectAnswer(botChatChar(picker));
    else chatIncorrectAnswer(botChatChar(picker));

    await showClueResult({
      who: pickerData.name,
      correct,
      formalAnswer: correct ? clueData.answer : null,
      scoreChange,
    });
  }

  persistState();
  await returnToBoard();
}

async function runBuzzPhase(clueData, category, value, rowIndex) {
  return new Promise((resolve) => {
    const playerOrder = ['player', ...gameState.botIds];
    let canStillBuzz = new Set(playerOrder);
    let buzzResolved = false;
    let buzzTimeouts = [];

    function endBuzzPhase() {
      if (buzzResolved) return;
      buzzResolved = true;
      buzzTimeouts.forEach(t => t.clear());
      resolve();
    }

    async function handleBuzzIn(playerId) {
      if (buzzResolved) return;
      if (!canStillBuzz.has(playerId)) return;
      canStillBuzz.delete(playerId);

      // Pause buzz phase while this player answers
      buzzTimeouts.forEach(t => t.clear());

      if (playerId === PLAYER_ID) {
        // Player buzzed - show answer input
        const result = await showAnswerInput({
          clue: clueData.clue,
          category,
          value,
        });

        const correct = checkAnswer(result.answer, clueData.acceptedAnswers);
        const scoreChange = correct ? value : -value;
        updatePlayerScore(PLAYER_ID, scoreChange);
        if (correct) chatCorrectAnswer('player');
        else chatIncorrectAnswer('player');

        if (correct) {
          gameState.currentPicker = PLAYER_ID;
        }

        await showClueResult({
          who: gameState.players.player.name,
          correct,
          formalAnswer: clueData.answer,
          scoreChange,
        });

        if (correct) {
          persistState();
          endBuzzPhase();
          await returnToBoard();
          return;
        }
      } else {
        // Bot buzzed
        const botProfile = BOT_PROFILES[playerId];
        const correct = botAnswerCorrect(botProfile, category);
        const scoreChange = correct ? value : -value;
        updatePlayerScore(playerId, scoreChange);
        if (correct) chatCorrectAnswer(botChatChar(playerId));
        else chatIncorrectAnswer(botChatChar(playerId));

        if (correct) {
          gameState.currentPicker = playerId;
        }

        await showClueResult({
          who: gameState.players[playerId].name,
          correct,
          formalAnswer: correct ? clueData.answer : null,
          scoreChange,
        });

        if (correct) {
          persistState();
          endBuzzPhase();
          await returnToBoard();
          return;
        }
      }

      // Wrong answer - continue buzz phase for remaining players
      if (canStillBuzz.size === 0) {
        // Nobody left
        await showClueResult({
          who: null,
          correct: false,
          formalAnswer: clueData.answer,
          scoreChange: 0,
        });
        persistState();
        endBuzzPhase();
        await returnToBoard();
        return;
      }

      // Re-show clue for remaining buzzers
      chatSteal();
      showClueWithBuzz(clueData, category, value, rowIndex, canStillBuzz, handleBuzzIn, () => {
        // Time ran out for remaining
        chatNobodyBuzzed();
        showClueResult({
          who: null,
          correct: false,
          formalAnswer: clueData.answer,
          scoreChange: 0,
        }).then(() => {
          persistState();
          endBuzzPhase();
          returnToBoard();
        });
      }, buzzTimeouts);
    }

    // Show clue and start buzz phase
    showClueWithBuzz(clueData, category, value, rowIndex, canStillBuzz, handleBuzzIn, () => {
      // Time ran out - nobody buzzed
      chatNobodyBuzzed();
      showClueResult({
        who: null,
        correct: false,
        formalAnswer: clueData.answer,
        scoreChange: 0,
      }).then(() => {
        persistState();
        endBuzzPhase();
        returnToBoard();
      });
    }, buzzTimeouts);
  });
}

function showClueWithBuzz(clueData, category, value, rowIndex, canStillBuzz, onBuzz, onTimeout, timeoutArr) {
  const buzzWindow = computeBuzzWindow(clueData.clue);

  // Schedule bot buzzes
  for (const botId of gameState.botIds) {
    if (!canStillBuzz.has(botId)) continue;
    const decision = botBuzzDecision(BOT_PROFILES[botId], category, rowIndex, clueData.clue);
    if (decision.willBuzz) {
      const t = pausableTimeout(() => onBuzz(botId), decision.delay);
      timeoutArr.push(t);
    }
  }

  // Timeout for no buzz
  const t = pausableTimeout(onTimeout, buzzWindow);
  timeoutArr.push(t);

  showClueScreen({
    clue: clueData.clue,
    category,
    value,
    canBuzz: canStillBuzz.has(PLAYER_ID),
    buzzDuration: buzzWindow,
    onBuzz: () => onBuzz(PLAYER_ID),
  });
}

async function showClueResult({ who, correct, formalAnswer, scoreChange }) {
  return new Promise(resolve => {
    let className = 'result-overlay ';
    let judgmentText;
    if (who === null) {
      className += 'no-answer';
      judgmentText = 'Time\'s up!';
    } else if (correct) {
      className += 'correct';
      judgmentText = 'Correct!';
    } else {
      className += 'incorrect';
      judgmentText = 'Incorrect';
    }

    const overlay = h('div', { className },
      who ? h('div', { className: 'result-who' }, who) : null,
      h('div', { className: 'result-judgment' }, judgmentText),
      formalAnswer ? h('div', { className: 'result-answer' }, formalAnswer) : null,
      scoreChange !== 0
        ? h('div', { className: `result-score-change ${scoreChange > 0 ? 'text-green' : 'text-red'}` },
          `${scoreChange > 0 ? '+' : ''}$${Math.abs(scoreChange).toLocaleString()}`)
        : null,
    );

    const removeOverlay = showOverlay(overlay);

    pausableTimeout(() => {
      removeOverlay();
      resolve();
    }, 2000);
  });
}

async function returnToBoard() {
  if (cluesRemaining(gameState) === 0) {
    await transitionRound();
  } else {
    await runBoard();
  }
}

async function transitionRound() {
  if (gameState.round === 'single') {
    gameState.round = 'double';
    // Reset used clues for new round
    gameState.usedClues.double = [];

    // Lowest score picks first in Double Jeopardy
    const sorted = Object.values(gameState.players).sort((a, b) => a.score - b.score);
    gameState.currentPicker = sorted[0].id;

    persistState();

    // Brief transition message
    chatRoundTransition();
    showClueScreen({
      clue: 'Double Jeopardy!',
      category: 'Round 2',
      value: null,
      canBuzz: false,
      isTransition: true,
    });
    await pausableDelay(2000);

    await runBoard();
  } else {
    // Move to Final Jeopardy
    gameState.round = 'final';
    persistState();
    await runFinalJeopardy();
  }
}

async function runFinalJeopardy() {
  const finalData = gameState.boardData.final;
  const [bot1Id, bot2Id] = gameState.botIds;
  const scores = Object.values(gameState.players).map(p => p.score);
  const playerScore = gameState.players.player.score;

  // Show category
  chatFinalJeopardy();
  await showFinalCategory(finalData.category);

  // Get player wager (if score > 0)
  let playerWager = 0;
  if (playerScore > 0) {
    playerWager = await showWagerScreen({
      type: 'final',
      category: finalData.category,
      maxWager: playerScore,
      currentScore: playerScore,
    });
  }

  // Bot wagers
  const bot1Wager = botFinalWager(
    BOT_PROFILES[bot1Id],
    gameState.players[bot1Id].score,
    scores,
  );
  const bot2Wager = botFinalWager(
    BOT_PROFILES[bot2Id],
    gameState.players[bot2Id].score,
    scores,
  );

  // Show clue and get player answer
  let playerAnswer = '';
  if (playerScore > 0) {
    const result = await showFinalClue({
      clue: finalData.clue,
      category: finalData.category,
      thinkTime: 30000,
    });
    playerAnswer = result.answer;
  } else {
    // Show clue briefly (player can't wager)
    await showFinalClue({
      clue: finalData.clue,
      category: finalData.category,
      thinkTime: 30000,
      readOnly: playerScore <= 0,
    });
  }

  // Judge answers
  const playerCorrect = playerScore > 0 && checkAnswer(playerAnswer, finalData.acceptedAnswers);
  const bot1Correct = gameState.players[bot1Id].score > 0 && botAnswerCorrect(BOT_PROFILES[bot1Id], finalData.category);
  const bot2Correct = gameState.players[bot2Id].score > 0 && botAnswerCorrect(BOT_PROFILES[bot2Id], finalData.category);

  // Apply scores
  updatePlayerScore('player', playerCorrect ? playerWager : -playerWager);
  updatePlayerScore(bot1Id, bot1Correct ? bot1Wager : -bot1Wager);
  updatePlayerScore(bot2Id, bot2Correct ? bot2Wager : -bot2Wager);

  // Reveal
  await showFinalReveal({
    formalAnswer: finalData.answer,
    results: [
      {
        name: gameState.players[bot1Id].name,
        correct: bot1Correct,
        wager: bot1Wager,
        newScore: gameState.players[bot1Id].score,
      },
      {
        name: gameState.players[bot2Id].name,
        correct: bot2Correct,
        wager: bot2Wager,
        newScore: gameState.players[bot2Id].score,
      },
      {
        name: gameState.players.player.name,
        correct: playerCorrect,
        wager: playerWager,
        answer: playerAnswer,
        newScore: gameState.players.player.score,
        isHuman: true,
      },
    ],
  });

  // Game over
  await endGame();
}

async function endGame() {
  const players = Object.values(gameState.players);
  const sorted = players.sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const playerWon = winner.id === PLAYER_ID;

  const results = {
    playerWon,
    playerScore: gameState.players.player.score,
    winner: { name: winner.name, score: winner.score },
    allScores: sorted.map(p => ({ name: p.name, score: p.score, isHuman: p.isHuman })),
  };

  saveCompletion(results);
  clearGameState();
  unmountPause();

  showResultsScreen(results);
}

/**
 * Fuzzy answer matching.
 */
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(what|who|where|when)\s+(is|are|was|were)\s+/, '')
    .replace(/^(a|an|the)\s+/, '')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function checkAnswer(input, acceptedAnswers) {
  if (!input || !input.trim()) return false;

  const normalizedInput = normalize(input);
  if (!normalizedInput) return false;

  for (const accepted of acceptedAnswers) {
    const normalizedAccepted = normalize(accepted);

    // Exact match
    if (normalizedInput === normalizedAccepted) return true;

    // Input contained within accepted answer (or vice versa) - handles partial answers
    if (normalizedAccepted.includes(normalizedInput) && normalizedInput.length >= 3) return true;
    if (normalizedInput.includes(normalizedAccepted) && normalizedAccepted.length >= 3) return true;

    // Levenshtein distance for typos
    const maxDist = normalizedAccepted.length <= 5 ? 1 : normalizedAccepted.length <= 10 ? 2 : 3;
    if (levenshtein(normalizedInput, normalizedAccepted) <= maxDist) return true;
  }

  return false;
}
