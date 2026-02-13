#!/usr/bin/env node

/**
 * Board Generation Template for Skylardy
 *
 * This script documents the JSON schema and validation rules for board files.
 * Use it as a reference when batch-generating boards with an LLM.
 *
 * To generate boards:
 * 1. Use this schema as a prompt template for your LLM of choice
 * 2. Have the LLM generate valid JSON following this structure
 * 3. Save each board as public/boards/{N}.json
 * 4. Update public/boards/index.json with the new boardCount
 *
 * Board Schema:
 * {
 *   "id": number,                    // Sequential board ID starting from 1
 *   "single": {
 *     "categories": string[6],       // Exactly 6 category names
 *     "board": [                     // 6 arrays (one per category)
 *       [                            // Each has exactly 5 clues, ordered $200-$1000
 *         {
 *           "clue": string,          // The clue text (read as a statement, not a question)
 *           "answer": string,        // Formal answer in "What is X?" format
 *           "acceptedAnswers": string[] // Normalized accepted answers for fuzzy matching
 *         }
 *       ]
 *     ],
 *     "dailyDoubles": [[col, row]]   // 1 Daily Double, col 0-5, row 0-4
 *   },
 *   "double": {                      // Same structure, values $400-$2000
 *     "categories": string[6],
 *     "board": [...],
 *     "dailyDoubles": [[col, row], [col, row]]  // 2 Daily Doubles
 *   },
 *   "final": {
 *     "category": string,
 *     "clue": string,
 *     "answer": string,              // Formal "What is X?" answer
 *     "acceptedAnswers": string[]
 *   }
 * }
 *
 * AcceptedAnswers Guidelines:
 * - All lowercase, no punctuation
 * - Include common abbreviations and alternate phrasings
 * - Include partial answers that are unambiguous
 * - Strip articles (a/an/the) from the beginning
 * - Examples:
 *   "What is nitrogen?" -> ["nitrogen", "n2"]
 *   "Who is Abraham Lincoln?" -> ["abraham lincoln", "lincoln", "abe lincoln"]
 *   "What is The Great Gatsby?" -> ["great gatsby", "the great gatsby"]
 *
 * Daily Double Placement:
 * - Single Jeopardy: 1 Daily Double
 * - Double Jeopardy: 2 Daily Doubles
 * - Prefer placing on higher-value clues (rows 2-4, zero-indexed)
 * - Don't place both Double Jeopardy DDs in the same category
 *
 * Difficulty Scaling:
 * - Row 0 ($200/$400): Easy, common knowledge
 * - Row 1 ($400/$800): Moderate
 * - Row 2 ($600/$1200): Challenging
 * - Row 3 ($800/$1600): Difficult
 * - Row 4 ($1000/$2000): Expert level
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOARDS_DIR = join(__dirname, '..', 'public', 'boards');

function validateBoard(board) {
  const errors = [];

  if (typeof board.id !== 'number') errors.push('Missing or invalid id');

  for (const round of ['single', 'double']) {
    const data = board[round];
    if (!data) { errors.push(`Missing ${round} round`); continue; }

    if (!Array.isArray(data.categories) || data.categories.length !== 6) {
      errors.push(`${round}: need exactly 6 categories`);
    }

    if (!Array.isArray(data.board) || data.board.length !== 6) {
      errors.push(`${round}: need exactly 6 category arrays in board`);
    } else {
      data.board.forEach((cat, ci) => {
        if (!Array.isArray(cat) || cat.length !== 5) {
          errors.push(`${round}: category ${ci} needs exactly 5 clues`);
        } else {
          cat.forEach((clue, ri) => {
            if (!clue.clue) errors.push(`${round}[${ci}][${ri}]: missing clue text`);
            if (!clue.answer) errors.push(`${round}[${ci}][${ri}]: missing answer`);
            if (!Array.isArray(clue.acceptedAnswers) || clue.acceptedAnswers.length === 0) {
              errors.push(`${round}[${ci}][${ri}]: missing acceptedAnswers`);
            }
          });
        }
      });
    }

    const expectedDD = round === 'single' ? 1 : 2;
    if (!Array.isArray(data.dailyDoubles) || data.dailyDoubles.length !== expectedDD) {
      errors.push(`${round}: need exactly ${expectedDD} daily double(s)`);
    }
  }

  if (!board.final) {
    errors.push('Missing final jeopardy');
  } else {
    if (!board.final.category) errors.push('Final: missing category');
    if (!board.final.clue) errors.push('Final: missing clue');
    if (!board.final.answer) errors.push('Final: missing answer');
    if (!Array.isArray(board.final.acceptedAnswers) || board.final.acceptedAnswers.length === 0) {
      errors.push('Final: missing acceptedAnswers');
    }
  }

  return errors;
}

// If run directly, validate existing boards
const indexPath = join(BOARDS_DIR, 'index.json');
if (existsSync(indexPath)) {
  const manifest = JSON.parse(readFileSync(indexPath, 'utf-8'));
  console.log(`Manifest: start=${manifest.startDate}, boards=${manifest.boardCount}`);

  for (let i = 1; i <= manifest.boardCount; i++) {
    const boardPath = join(BOARDS_DIR, `${i}.json`);
    if (!existsSync(boardPath)) {
      console.error(`Board ${i}.json not found!`);
      continue;
    }
    const board = JSON.parse(readFileSync(boardPath, 'utf-8'));
    const errors = validateBoard(board);
    if (errors.length === 0) {
      console.log(`Board ${i}: VALID`);
    } else {
      console.error(`Board ${i}: ${errors.length} error(s)`);
      errors.forEach(e => console.error(`  - ${e}`));
    }
  }
}
