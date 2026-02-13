/**
 * Chat bubble component — shows character commentary.
 */

import { h } from '../render.js';

const DISMISS_MS = 3500;
let currentBubble = null;
let dismissTimer = null;

export function dismissChatBubble() {
  removeCurrent();
}

function removeCurrent() {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  if (currentBubble && currentBubble.parentNode) {
    currentBubble.classList.add('chat-bubble-exit');
    const el = currentBubble;
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }
  currentBubble = null;
}

/**
 * Show a chat bubble.
 * data: { character, emoji, name, line }
 */
export function showChatBubble(data) {
  removeCurrent();

  const bubble = h('div', {
    className: `chat-bubble chat-bubble-${data.character}`,
    onClick: removeCurrent,
  },
    h('div', { className: 'chat-bubble-header' },
      h('span', { className: 'chat-bubble-emoji' }, data.emoji),
      h('span', { className: 'chat-bubble-name' }, data.name),
    ),
    h('div', { className: 'chat-bubble-text' }, data.line),
  );

  document.getElementById('app').appendChild(bubble);
  currentBubble = bubble;

  // Force reflow for animation
  bubble.offsetHeight;
  bubble.classList.add('chat-bubble-enter');

  dismissTimer = setTimeout(removeCurrent, DISMISS_MS);
}
