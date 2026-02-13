/**
 * Login gate — single hardcoded credential.
 */

import { h, showScreen } from '../render.js';

const STORAGE_KEY = 'skylardy_auth';

export function isAuthenticated() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function setAuthenticated() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // localStorage unavailable — session-only auth
  }
}

/**
 * Show login screen. Resolves when credentials are valid.
 */
export function showLoginScreen() {
  return new Promise((resolve) => {
    let errorEl;

    const userInput = h('input', {
      className: 'answer-input',
      type: 'text',
      placeholder: 'Username',
      autocomplete: 'username',
      autocapitalize: 'off',
    });

    const passInput = h('input', {
      className: 'answer-input',
      type: 'password',
      placeholder: 'Password',
      autocomplete: 'current-password',
    });

    function attempt() {
      const u = userInput.value.trim();
      const p = passInput.value;

      if (u === 'Skylar' && p === 'valentinesday') {
        setAuthenticated();
        resolve();
      } else {
        errorEl.textContent = 'Try again!';
        errorEl.style.opacity = '1';
        passInput.value = '';
        passInput.focus();
      }
    }

    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        attempt();
      }
    });

    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        passInput.focus();
      }
    });

    errorEl = h('div', { className: 'login-error' }, '');

    const screen = h('div', { className: 'screen login-screen' },
      h('div', { className: 'title-logo' }, 'SKYLARDY'),
      h('div', { className: 'title-subtitle' }, 'Sign in to play'),
      userInput,
      passInput,
      errorEl,
      h('button', { className: 'btn btn-primary', onClick: attempt }, 'Sign In'),
    );

    showScreen(screen);
    setTimeout(() => userInput.focus(), 350);
  });
}
