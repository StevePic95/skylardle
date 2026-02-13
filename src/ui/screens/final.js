import { h, showScreen, formatMoney } from '../render.js';
import { createTimer } from '../components/timer.js';
import { pausableTimeout, pausableDelay } from '../../game/pause.js';

/**
 * Show the Final Jeopardy category reveal.
 */
export function showFinalCategory(category) {
  return new Promise((resolve) => {
    const screen = h('div', { className: 'screen final-screen' },
      h('div', { className: 'final-label' }, 'Final Jeopardy!'),
      h('div', { className: 'final-category-text' }, category),
      h('button', { className: 'btn btn-primary', onClick: resolve }, 'Continue'),
    );
    showScreen(screen);
  });
}

/**
 * Show the Final Jeopardy clue and collect player answer.
 * opts: { clue, category, thinkTime, readOnly }
 * Returns { answer: string }
 */
export function showFinalClue(opts) {
  const { clue, category, thinkTime, readOnly } = opts;

  return new Promise((resolve) => {
    let resolved = false;
    const timer = createTimer();

    function submit() {
      if (resolved) return;
      resolved = true;
      timer.stop();
      resolve({ answer: readOnly ? '' : input.value });
    }

    const input = h('input', {
      className: 'answer-input',
      type: 'text',
      placeholder: readOnly ? '(You have $0 - watching only)' : 'Type your answer...',
      autocomplete: 'off',
      autocapitalize: 'off',
      disabled: readOnly,
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });

    const children = [
      h('div', { className: 'final-label' }, 'Final Jeopardy!'),
      h('div', { className: 'clue-category' }, category),
      h('div', { className: 'clue-text' }, clue),
      h('div', { className: 'final-thinking-text' }, readOnly ? 'You\'re watching - no wager possible' : 'Think carefully...'),
    ];

    if (!readOnly) {
      const prefixBtns = h('div', { className: 'answer-prefix-btns' },
        h('button', {
          className: 'prefix-btn',
          onClick: () => { if (!/^(what|who) is /i.test(input.value)) input.value = 'What is ' + input.value; input.focus(); },
        }, 'What is...'),
        h('button', {
          className: 'prefix-btn',
          onClick: () => { if (!/^(what|who) is /i.test(input.value)) input.value = 'Who is ' + input.value; input.focus(); },
        }, 'Who is...'),
      );
      children.push(prefixBtns);
    }

    children.push(input);

    if (!readOnly) {
      children.push(
        h('button', { className: 'btn btn-primary', onClick: submit }, 'Submit Final Answer')
      );
    }

    children.push(timer.el);

    const screen = h('div', { className: 'screen final-screen clue-screen' }, ...children);
    showScreen(screen);

    pausableTimeout(() => {
      if (!readOnly) input.focus();
      timer.start(thinkTime, submit);
    }, 350);
  });
}

/**
 * Show the Final Jeopardy score reveal.
 * opts: { formalAnswer, results: [{ name, correct, wager, newScore, answer?, isHuman? }] }
 */
export async function showFinalReveal(opts) {
  const { formalAnswer, results } = opts;

  const NARRATION_LINES = [
    name => `Let's see what ${name} came up with...`,
    name => `Moving on to ${name}...`,
    name => `And finally, ${name}...`,
  ];

  const narrationText = h('span', {}, '');
  const narration = h('div', { className: 'final-reveal-narration' },
    h('div', { className: 'chat-bubble-header' },
      h('span', { className: 'chat-bubble-emoji' }, '\uD83C\uDF99\uFE0F'),
      h('span', { className: 'chat-bubble-name' }, 'Ken Jennings'),
    ),
    narrationText,
  );

  const container = h('div', { className: 'screen final-reveal-screen' },
    h('div', { className: 'final-label' }, 'Final Jeopardy Results'),
    h('div', { className: 'result-answer' }, formalAnswer),
    narration,
  );

  showScreen(container);

  // Reveal each player one at a time with narration
  for (let i = 0; i < results.length; i++) {
    // Update narration text
    const r = results[i];
    narrationText.textContent = NARRATION_LINES[i](r.name);
    await pausableDelay(800);

    const card = h('div', {
      className: `reveal-player ${r.correct ? 'correct' : 'incorrect'}`,
    },
      h('div', { className: 'reveal-player-name' }, r.name),
      r.isHuman && r.answer
        ? h('div', { className: 'reveal-player-answer' }, `"${r.answer}"`)
        : null,
      h('div', { className: 'reveal-player-wager' },
        `${r.correct ? '+' : '-'}${formatMoney(r.wager)}`),
      h('div', { className: 'reveal-player-score' }, formatMoney(r.newScore)),
    );
    container.appendChild(card);
    await pausableDelay(1500);
  }

  // Hide narration before showing button
  narration.style.display = 'none';

  // Wait for user to continue
  return new Promise((resolve) => {
    pausableTimeout(() => {
      const btn = h('button', { className: 'btn btn-primary', onClick: resolve }, 'See Results');
      container.appendChild(btn);
    }, 1000);
  });
}
