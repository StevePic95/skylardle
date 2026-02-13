/**
 * Chat Manager — triggers character chat bubbles during gameplay.
 * Bot chat characters are set dynamically each game via setActiveBots().
 */

import { CHAT_LINES } from '../data/chat-lines.js';
import { showChatBubble } from '../ui/components/chat-bubble.js';

const TRIGGER_PROBABILITY = 0.60;
const recentLines = [];
const MAX_RECENT = 20;

// Active bot chat characters for this game (e.g. ['higgins', 'buzzy'])
let activeBotChars = [];

/**
 * Set the chat characters for the two active bots.
 * chatChars: [string, string] — values like 'higgins' or 'buzzy'
 */
export function setActiveBots(chatChars) {
  activeBotChars = chatChars;
  recentLines.length = 0;
}

function pickLine(character, situation) {
  const charData = CHAT_LINES[character];
  if (!charData) return null;
  const lines = charData.lines[situation];
  if (!lines || lines.length === 0) return null;

  // Filter out recently used lines
  const available = lines.filter(l => !recentLines.includes(l));
  const pool = available.length > 0 ? available : lines;

  const line = pool[Math.floor(Math.random() * pool.length)];

  // Track recent lines
  recentLines.push(line);
  if (recentLines.length > MAX_RECENT) recentLines.shift();

  return { character, emoji: charData.emoji, name: charData.name, line };
}

function triggerChat(situation, preferredCharacter) {
  if (Math.random() > TRIGGER_PROBABILITY) return;

  const picked = pickLine(preferredCharacter, situation);
  if (!picked) return;

  showChatBubble(picked);
}

function randomOf(...chars) {
  return chars[Math.floor(Math.random() * chars.length)];
}

/** Pick a random commentator from Ken + active bot characters. */
function randomCommentator() {
  const chars = ['ken', ...new Set(activeBotChars)];
  return chars[Math.floor(Math.random() * chars.length)];
}

// --- Convenience functions ---
// Bot-specific functions receive the bot's chatCharacter (e.g. 'higgins'),
// NOT the bot's game ID (e.g. 'trixie').

export function chatGameStart() {
  triggerChat('gameStart', randomCommentator());
}

export function chatCorrectAnswer(whoId) {
  if (whoId === 'player') {
    triggerChat('correctPlayer', randomCommentator());
  } else {
    triggerChat('correctSelf', whoId);
  }
}

export function chatIncorrectAnswer(whoId) {
  if (whoId === 'player') {
    triggerChat('incorrectPlayer', randomCommentator());
  } else {
    // Bot got it wrong: either self-deprecation or the other bot mocking
    const uniqueChars = [...new Set(activeBotChars)];
    const otherChar = uniqueChars.find(c => c !== whoId);
    if (otherChar) {
      const char = randomOf(whoId, otherChar);
      triggerChat(char === whoId ? 'incorrectSelf' : 'incorrectBot', char);
    } else {
      triggerChat('incorrectSelf', whoId);
    }
  }
}

export function chatDailyDouble(whoId) {
  const char = whoId === 'player' ? 'ken' : whoId;
  triggerChat('dailyDouble', char);
}

export function chatNobodyBuzzed() {
  triggerChat('nobodyBuzzed', randomCommentator());
}

export function chatRoundTransition() {
  triggerChat('roundTransition', randomCommentator());
}

export function chatFinalJeopardy() {
  triggerChat('finalJeopardy', randomCommentator());
}

export function chatSteal() {
  triggerChat('steal', 'ken');
}
