// DOM helpers and screen transition system

/**
 * Create a DOM element with attributes and children.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'disabled' || key === 'autofocus' || key === 'checked') {
      if (val) el.setAttribute(key, '');
    } else if (key === 'htmlFor') {
      el.setAttribute('for', val);
    } else {
      el.setAttribute(key, val);
    }
  }

  for (const child of children) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (Array.isArray(child)) {
      child.forEach(c => {
        if (c instanceof Node) el.appendChild(c);
      });
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

/**
 * Format a dollar value for display.
 */
export function formatMoney(amount) {
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(amount).toLocaleString()}`;
}

let currentScreen = null;

/**
 * Transition to a new screen element.
 */
export function showScreen(screenEl) {
  const container = document.getElementById('screen-container');

  if (currentScreen) {
    const old = currentScreen;
    old.classList.remove('screen-active');
    old.classList.add('screen-exit');
    setTimeout(() => {
      if (old.parentNode === container) {
        container.removeChild(old);
      }
    }, 300);
  }

  screenEl.classList.add('screen', 'screen-enter');
  container.appendChild(screenEl);

  // Force reflow to trigger transition
  screenEl.offsetHeight;

  requestAnimationFrame(() => {
    screenEl.classList.remove('screen-enter');
    screenEl.classList.add('screen-active');
  });

  currentScreen = screenEl;
}

/**
 * Immediately remove all screens and overlays. Used on game restart.
 */
export function clearAllScreens() {
  const container = document.getElementById('screen-container');
  container.innerHTML = '';
  currentScreen = null;
}

/**
 * Show a temporary overlay on top of the current screen.
 * Returns a function to remove the overlay.
 */
export function showOverlay(overlayEl) {
  const container = document.getElementById('screen-container');
  container.appendChild(overlayEl);
  return () => {
    if (overlayEl.parentNode === container) {
      container.removeChild(overlayEl);
    }
  };
}

/**
 * Wait for a duration in ms. Returns a promise.
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
