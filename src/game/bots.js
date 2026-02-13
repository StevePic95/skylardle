/**
 * Bot AI - Pool of personality profiles with distinct play styles.
 * Each game picks 2 bots from the pool based on the board ID.
 */

const CATEGORY_TYPES = {
  academic: ['science', 'history', 'literature', 'geography', 'math', 'philosophy', 'language', 'engineering', 'chemistry', 'physics', 'biology', 'astronomy', 'medicine', 'classical', 'mythology', 'american history', 'world history', 'industrial engineering'],
  popCulture: ['music', 'movies', 'tv', 'pop', 'celebrity', 'sports', 'video games', 'social media', 'food', 'drink', 'fashion', 'internet', 'cats', 'animals', '90s', '80s', '2000s'],
};

function categoryIsAcademic(category) {
  const lower = category.toLowerCase();
  return CATEGORY_TYPES.academic.some(kw => lower.includes(kw));
}

/**
 * Bot profiles. chatCharacter maps to existing chat line sets.
 */
export const BOT_PROFILES = {
  higgins: {
    id: 'higgins',
    name: 'Prof. Higgins',
    bio: 'a distinguished professor who has published more papers than he\'s read',
    chatCharacter: 'higgins',
    accuracyAcademic: 0.82,
    accuracyPopCulture: 0.48,
    buzzEagerness: 0.70,
    buzzSpeedMin: 900,
    buzzSpeedMax: 2200,
    readingFactor: 0.85,
    ddWagerStyle: 'conservative',
    fjWagerStyle: 'strategic',
  },
  buzzy: {
    id: 'buzzy',
    name: 'Buzzy McBuzzface',
    bio: 'whose buzzer finger is faster than his brain',
    chatCharacter: 'buzzy',
    accuracyAcademic: 0.35,
    accuracyPopCulture: 0.52,
    buzzEagerness: 0.88,
    buzzSpeedMin: 350,
    buzzSpeedMax: 1300,
    readingFactor: 0.60,
    ddWagerStyle: 'bold',
    fjWagerStyle: 'chaotic',
  },
  trixie: {
    id: 'trixie',
    name: 'Trivia Trixie',
    bio: 'a three-time pub trivia champion from Portland, Oregon',
    chatCharacter: 'buzzy',
    accuracyAcademic: 0.58,
    accuracyPopCulture: 0.68,
    buzzEagerness: 0.72,
    buzzSpeedMin: 650,
    buzzSpeedMax: 1800,
    readingFactor: 0.78,
    ddWagerStyle: 'bold',
    fjWagerStyle: 'strategic',
  },
  wally: {
    id: 'wally',
    name: 'Wild Card Wally',
    bio: 'a retired gambler who treats every Daily Double like a trip to Vegas',
    chatCharacter: 'buzzy',
    accuracyAcademic: 0.50,
    accuracyPopCulture: 0.62,
    buzzEagerness: 0.65,
    buzzSpeedMin: 700,
    buzzSpeedMax: 1900,
    readingFactor: 0.75,
    ddWagerStyle: 'bold',
    fjWagerStyle: 'chaotic',
  },
  barb: {
    id: 'barb',
    name: 'Nana Barb',
    bio: 'a sweet grandmother who has watched Jeopardy every night since 1984',
    chatCharacter: 'higgins',
    accuracyAcademic: 0.65,
    accuracyPopCulture: 0.55,
    buzzEagerness: 0.58,
    buzzSpeedMin: 1000,
    buzzSpeedMax: 2500,
    readingFactor: 0.90,
    ddWagerStyle: 'conservative',
    fjWagerStyle: 'strategic',
  },
};

const BOT_IDS = Object.keys(BOT_PROFILES);

/**
 * Deterministically pick 2 bots for a game based on a seed (board ID).
 * Returns [botId1, botId2].
 */
export function pickBotsForGame(seed) {
  const pairs = [];
  for (let i = 0; i < BOT_IDS.length; i++) {
    for (let j = i + 1; j < BOT_IDS.length; j++) {
      pairs.push([BOT_IDS[i], BOT_IDS[j]]);
    }
  }
  return pairs[seed % pairs.length];
}

/**
 * Compute a reading-time floor based on clue word count.
 * Returns the minimum ms a human would need to read the clue.
 */
function readingTimeMs(clueText) {
  if (!clueText) return 0;
  const wordCount = clueText.trim().split(/\s+/).length;
  return wordCount * 338; // ~340ms/word, gives player time to read
}

/**
 * Determine if a bot will buzz and when.
 * Returns { willBuzz, delay } or { willBuzz: false }
 */
export function botBuzzDecision(botProfile, category, valueIndex, clueText) {
  // Higher value clues = harder = less likely to buzz
  const difficultyPenalty = valueIndex * 0.05; // 0-0.20
  const eagerness = botProfile.buzzEagerness - difficultyPenalty;

  const willBuzz = Math.random() < eagerness;
  if (!willBuzz) return { willBuzz: false };

  const readingFloor = readingTimeMs(clueText) * botProfile.readingFactor;

  const minDelay = Math.max(readingFloor, botProfile.buzzSpeedMin);
  const spread = botProfile.buzzSpeedMax - botProfile.buzzSpeedMin;
  const delay = minDelay + Math.random() * spread;

  return { willBuzz: true, delay };
}

/**
 * Compute dynamic buzz window based on clue length.
 */
export function computeBuzzWindow(clueText) {
  const reading = readingTimeMs(clueText);
  return Math.max(3000, reading + 1500);
}

/**
 * Determine if a bot answers correctly.
 */
export function botAnswerCorrect(botProfile, category) {
  let accuracy;
  if (categoryIsAcademic(category)) {
    accuracy = botProfile.accuracyAcademic;
  } else {
    accuracy = botProfile.accuracyPopCulture;
  }
  return Math.random() < accuracy;
}

/**
 * Bot Daily Double wager.
 */
export function botDailyDoubleWager(botProfile, score, maxWager) {
  const effectiveScore = Math.max(score, 1000);
  const cappedMax = Math.min(effectiveScore, maxWager);

  if (botProfile.ddWagerStyle === 'bold') {
    // True daily double or close to it
    return Math.max(5, Math.floor(cappedMax * (0.8 + Math.random() * 0.2)));
  }

  // Conservative: 25-40% of score
  const pct = 0.25 + Math.random() * 0.15;
  return Math.max(5, Math.floor(cappedMax * pct));
}

/**
 * Bot Final Jeopardy wager.
 */
export function botFinalWager(botProfile, score, scores) {
  if (score <= 0) return 0;

  const sortedScores = [...scores].sort((a, b) => b - a);
  const isLeading = score === sortedScores[0];
  const secondPlace = sortedScores[1] || 0;

  if (botProfile.fjWagerStyle === 'strategic') {
    if (isLeading && secondPlace > 0) {
      // Wager just enough to cover second place doubling up
      const needed = Math.max(0, secondPlace * 2 - score + 1);
      return Math.min(needed, score);
    }
    // Behind: wager to potentially overtake leader if correct
    const needed = sortedScores[0] - score;
    if (needed > score) {
      // Can't win even if correct, wager small
      return Math.max(0, Math.floor(score * 0.1));
    }
    return Math.min(needed + 1, score);
  }

  // Chaotic: random wager
  if (botProfile.fjWagerStyle === 'chaotic') {
    return Math.floor(Math.random() * (score + 1));
  }

  // Default: moderate
  return Math.floor(score * 0.5);
}

/**
 * Bot picks a clue from the board. Bots prefer their stronger categories
 * and tend to pick higher-value clues.
 */
export function botPickClue(botProfile, categories, usedClues) {
  const available = [];

  for (let col = 0; col < categories.length; col++) {
    for (let row = 0; row < 5; row++) {
      const key = `${col},${row}`;
      if (!usedClues.has(key)) {
        const isGoodCategory = categoryIsAcademic(categories[col])
          ? botProfile.accuracyAcademic > botProfile.accuracyPopCulture
          : botProfile.accuracyPopCulture > botProfile.accuracyAcademic;

        // Preference weight: higher value + preferred category
        const weight = (row + 1) * (isGoodCategory ? 1.5 : 1);
        available.push({ col, row, weight });
      }
    }
  }

  if (available.length === 0) return null;

  // Weighted random selection
  const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const clue of available) {
    rand -= clue.weight;
    if (rand <= 0) return { col: clue.col, row: clue.row };
  }

  return available[available.length - 1];
}
