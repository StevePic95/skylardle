import { h, showScreen, formatMoney } from '../render.js';

/**
 * Show the game board screen.
 * opts: { categories, values, usedClues (Set), roundLabel, isPlayerTurn, onClueSelect(col, row) }
 */
export function showBoardScreen(opts) {
  const { categories, values, usedClues, roundLabel, isPlayerTurn, currentPickerName, onClueSelect } = opts;

  const grid = h('div', { className: 'board-grid' });

  // Category headers
  for (let col = 0; col < categories.length; col++) {
    grid.appendChild(
      h('div', { className: 'board-category' }, categories[col])
    );
  }

  // Clue cells (rows, then columns for grid layout)
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < categories.length; col++) {
      const key = `${col},${row}`;
      const used = usedClues.has(key);

      const cell = h('button', {
        className: `board-cell${used ? ' used' : ''}`,
        disabled: used || !isPlayerTurn,
        onClick: () => {
          if (!used && isPlayerTurn) {
            onClueSelect(col, row);
          }
        },
      }, used ? '' : formatMoney(values[row]));

      grid.appendChild(cell);
    }
  }

  const turnIndicator = isPlayerTurn
    ? 'Your pick!'
    : `${currentPickerName || 'Bot'} is choosing...`;

  const screen = h('div', { className: 'screen board-screen' },
    h('div', { className: 'board-round-label' }, `${roundLabel} — ${turnIndicator}`),
    grid,
  );

  showScreen(screen);
}
