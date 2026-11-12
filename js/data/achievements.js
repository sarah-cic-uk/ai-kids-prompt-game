/* Achievement badges. Rules live in js/engine/scoring.js (evaluateBadges). */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  WL.ACHIEVEMENTS = [
    { id: 'first-light', icon: '🔦', name: 'First Light', desc: 'Complete your first mission.' },
    { id: 'perfect', icon: '💯', name: 'Perfect Signal', desc: 'Score 100 on a mission.' },
    { id: 'streak-3', icon: '🔥', name: 'Hot Streak', desc: 'Score 80+ on 3 missions in a row.' },
    { id: 'streak-6', icon: '⚡', name: 'Unstoppable', desc: 'Score 80+ on all 6 missions in a row.' },
    { id: 'sharp-eyes', icon: '👀', name: 'Sharp Eyes', desc: "Spot NOVA's mistake on your first try." },
    { id: 'fact-checker', icon: '🔍', name: 'Fact Checker', desc: "Spot all 3 of NOVA's mistakes on your first try." },
    { id: 'comeback', icon: '💪', name: 'Comeback Kid', desc: 'Improve your score with a second try.' },
    {
      id: 'short-sweet',
      icon: '🍬',
      name: 'Short & Sweet',
      desc: {
        junior: 'Pick the best prompt when a longer one was a trap.',
        senior: "Score 80+ using fewer words than NOVA's example prompt.",
      },
    },
    { id: 'hero', icon: '🌟', name: 'Winterlight Hero', desc: 'Restore all 6 Winterlight nodes.' },
    { id: 'legend', icon: '👑', name: 'Prompt Legend', desc: 'Score 540 or more in total.' },
  ];

  WL.getAchievement = (id) => WL.ACHIEVEMENTS.find((a) => a.id === id);
  WL.achievementDesc = (a, mode) => (typeof a.desc === 'string' ? a.desc : a.desc[mode] || a.desc.junior);

  /** Rank titles for the results screen, by total score (max 600). */
  WL.RANKS = [
    { min: 540, title: 'Winterlight Legend' },
    { min: 450, title: 'Master Prompt Agent' },
    { min: 330, title: 'Senior Field Agent' },
    { min: 200, title: 'Field Agent' },
    { min: 0, title: 'Agent in Training' },
  ];
  WL.rankFor = (total) => WL.RANKS.find((r) => total >= r.min).title;
})(typeof window !== 'undefined' ? window : globalThis);
