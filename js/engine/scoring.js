/*
 * Scoring, streaks and achievements. Pure functions with no DOM, so they are
 * easy to test in Node and to reuse on a future server.
 *
 * Junior: option score (100 / 40–60 / 10–20). If the first pick wasn't the
 *   best, one second chance: picking the best prompt then adds a +20
 *   learning bonus (+10 for any other improvement). Multi-stage missions
 *   average their stages.
 * Senior: best of the two attempts, plus a +5 learning bonus if the
 *   refinement improved by 10+ points. Capped at 100.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  const MISSION_MAX = 100;
  const JUNIOR_LEARNING_BONUS = 20;
  const JUNIOR_IMPROVE_BONUS = 10;
  const SENIOR_LEARNING_BONUS = 5;
  const SENIOR_BONUS_THRESHOLD = 10;

  function highScore() {
    return (WL.CONFIG && WL.CONFIG.highScore) || 80;
  }

  /** Score one junior choice stage: first pick and optional retry pick. */
  function juniorStageScore(firstOption, retryOption) {
    const base = firstOption.score;
    const improved = !!retryOption && retryOption.score > firstOption.score;
    const bonus = !improved ? 0 : retryOption.quality === 'excellent' ? JUNIOR_LEARNING_BONUS : JUNIOR_IMPROVE_BONUS;
    return { base, bonus, score: Math.min(MISSION_MAX, base + bonus), improved, firstTry: firstOption.quality === 'excellent' };
  }

  function juniorMissionScore(stageScores) {
    if (!stageScores.length) return 0;
    const sum = stageScores.reduce((s, st) => s + st.score, 0);
    return Math.min(MISSION_MAX, Math.round(sum / stageScores.length));
  }

  /** Combine the first senior evaluation with an optional refinement. */
  function seniorMissionScore(first, second) {
    const firstTotal = first ? first.total : 0;
    const secondTotal = second ? second.total : null;
    const best = secondTotal == null ? firstTotal : Math.max(firstTotal, secondTotal);
    const improvement = secondTotal == null ? 0 : secondTotal - firstTotal;
    const bonus = improvement >= SENIOR_BONUS_THRESHOLD ? SENIOR_LEARNING_BONUS : 0;
    return { best, improvement, bonus, score: Math.min(MISSION_MAX, best + bonus), improved: improvement > 0 };
  }

  function stars(score) {
    if (score >= highScore()) return 3;
    if (score >= 45) return 2;
    return score > 0 ? 1 : 0;
  }

  function totalScore(player) {
    return Object.values(player.missions || {}).reduce((s, m) => s + (m.score || 0), 0);
  }

  function missionsCompleted(player) {
    return Object.keys(player.missions || {}).length;
  }

  /**
   * Record a completed mission on the player (mutates and returns a summary).
   * Streaks count consecutive missions played with a high score.
   * `result` = { score, base, bonus, improved, checkFirstTry, shortSweet, ... }
   */
  function recordMission(player, missionId, result) {
    const before = totalScore(player);
    player.missions = player.missions || {};
    // Replays keep the best score, so practising never costs points. Learning flags carry over.
    const prev = player.missions[missionId];
    const keptPrevious = !!prev && prev.score > result.score;
    const entry = Object.assign({ completedAt: new Date().toISOString() }, keptPrevious ? prev : result, {
      plays: ((prev && prev.plays) || 0) + 1,
      improved: !!(result.improved || (prev && prev.improved)),
      shortSweet: !!(result.shortSweet || (prev && prev.shortSweet)),
      checkFirstTry: result.checkFirstTry === true || (prev && prev.checkFirstTry === true) ? true : result.checkFirstTry,
    });
    player.missions[missionId] = entry;

    const high = result.score >= highScore();
    player.streak = high ? (player.streak || 0) + 1 : 0;
    player.bestStreak = Math.max(player.bestStreak || 0, player.streak);

    const newBadges = evaluateBadges(player, { missionId, result });
    player.badges = (player.badges || []).concat(newBadges);
    player.totalScore = totalScore(player);
    player.finished = missionsCompleted(player) >= WL.MISSIONS.length;

    return {
      before,
      after: player.totalScore,
      high,
      streak: player.streak,
      streakBroken: !high && before > 0,
      keptPrevious,
      missionScore: entry.score,
      newBadges,
      stars: stars(result.score),
    };
  }

  /** Return ids of badges newly earned after a mission (player already updated). */
  function evaluateBadges(player, ctx) {
    const has = new Set(player.badges || []);
    const missions = Object.entries(player.missions || {});
    const earned = [];
    const award = (id) => {
      if (!has.has(id) && !earned.includes(id)) earned.push(id);
    };

    if (missions.length >= 1) award('first-light');
    if (missions.some(([, m]) => m.score >= MISSION_MAX)) award('perfect');
    if ((player.streak || 0) >= 3) award('streak-3');
    if ((player.streak || 0) >= 6) award('streak-6');
    if (missions.some(([, m]) => m.checkFirstTry === true)) award('sharp-eyes');

    const checkMissions = WL.MISSIONS.filter((m) => m.check).map((m) => String(m.id));
    const allChecked = checkMissions.every((id) => player.missions[id] && player.missions[id].checkFirstTry === true);
    if (allChecked) award('fact-checker');

    if (missions.some(([, m]) => m.improved)) award('comeback');
    if (missions.some(([, m]) => m.shortSweet)) award('short-sweet');
    if (missions.length >= WL.MISSIONS.length) award('hero');
    if (totalScore(player) >= 540) award('legend');

    return earned;
  }

  /** Junior "Short & Sweet": best prompt picked first time where it wasn't the longest option. */
  function juniorShortSweet(stage, firstOption) {
    if (!firstOption || firstOption.quality !== 'excellent') return false;
    const words = (o) => WL.LocalEvaluator.countWords(o.text);
    const longest = stage.options.reduce((a, b) => (words(b) > words(a) ? b : a));
    return longest.id !== firstOption.id;
  }

  /** Senior "Short & Sweet": 80+ with fewer words than the example prompt. */
  function seniorShortSweet(mission, evaluation) {
    if (!evaluation || evaluation.total < highScore()) return false;
    return evaluation.words < WL.LocalEvaluator.countWords(mission.senior.modelText);
  }

  WL.Scoring = {
    MISSION_MAX,
    JUNIOR_LEARNING_BONUS,
    JUNIOR_IMPROVE_BONUS,
    SENIOR_LEARNING_BONUS,
    SENIOR_BONUS_THRESHOLD,
    juniorStageScore,
    juniorMissionScore,
    seniorMissionScore,
    stars,
    totalScore,
    missionsCompleted,
    recordMission,
    evaluateBadges,
    juniorShortSweet,
    seniorShortSweet,
  };
})(typeof window !== 'undefined' ? window : globalThis);
