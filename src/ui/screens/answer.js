import { h, showScreen, formatMoney } from '../render.js';
import { createTimer } from '../components/timer.js';
import { pausableTimeout } from '../../game/pause.js';

/**
 * Show the answer input screen.
 * Returns a promise that resolves with { answer: string }.
 * opts: { clue, category, value, isDailyDouble }
 */
export function showAnswerInput(opts) {
  const { clue, category, value, isDailyDouble } = opts;
  const answerTime = isDailyDouble ? 8000 : 6000;

  return new Promise((resolve) => {
    let resolved = false;
    const timer = createTimer();

    const input = h('input', {
      className: 'answer-input',
      type: 'text',
      placeholder: 'Type your answer...',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
    });

    function submit() {
      if (resolved) return;
      resolved = true;
      timer.stop();
      resolve({ answer: input.value });
    }

    // Handle enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });

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

    const submitBtn = h('button', {
      className: 'btn btn-primary',
      onClick: submit,
    }, 'Submit');

    const screen = h('div', { className: 'screen answer-screen' },
      h('div', { className: 'clue-category' }, category),
      value != null ? h('div', { className: 'clue-value' }, formatMoney(value)) : null,
      h('div', { className: 'clue-text' }, clue),
      h('div', { className: 'answer-label' }, 'Your answer:'),
      prefixBtns,
      input,
      submitBtn,
      timer.el,
    );

    showScreen(screen);

    // Focus input after screen transition
    pausableTimeout(() => {
      input.focus();
      timer.start(answerTime, submit);
    }, 350);
  });
}
