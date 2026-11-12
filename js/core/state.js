/*
 * Player profiles (nickname + mode + progress), stored on this device.
 * Several players can share a device: each profile has its own id and the
 * welcome screen lists recent agents to continue.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  const NICK_MAX = 14;

  // Kept short on purpose. Nicknames show on a shared screen, so the worst words are blocked.
  const BLOCKED = /(fuck|shit|cunt|bitch|nigg|fag|slut|whore|wank|twat|dick|cock|pussy|penis|vagina|bollock|arse|rape|nazi|hitler|porn|sex|poo|piss|tits|boob)/i;

  function sanitizeNickname(raw) {
    return String(raw || '')
      .replace(/[^\p{L}\p{N} _-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, NICK_MAX);
  }

  /** Returns an error message, or null if the nickname is fine. */
  function validateNickname(nick) {
    if (nick.length < 2) return 'Your agent name needs at least 2 characters.';
    if (BLOCKED.test(nick.replace(/[\s_-]/g, ''))) return "Let's pick a different agent name. Keep it friendly!";
    // Very light guard against real full names ("Firstname Lastname").
    if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(nick)) return 'Use a secret agent nickname, not your real name!';
    return null;
  }

  const ADJ = ['Frosty', 'Sparkly', 'Cosy', 'Turbo', 'Pixel', 'Snowy', 'Glitter', 'Aurora', 'Jolly', 'Comet', 'Icy', 'Starry', 'Blizzard', 'Twinkle'];
  const NOUN = ['Penguin', 'Yeti', 'Fox', 'Owl', 'Byte', 'Reindeer', 'Robot', 'Sprout', 'Pudding', 'Star', 'Walrus', 'Puffin', 'Bauble', 'Cocoa'];
  function randomNickname() {
    return WL.util.pick(ADJ) + WL.util.pick(NOUN) + Math.floor(Math.random() * 90 + 10);
  }

  function blankPlayer(nickname, mode) {
    return {
      id: WL.util.uid('agent'),
      nickname,
      mode,
      missions: {},
      badges: [],
      streak: 0,
      bestStreak: 0,
      totalScore: 0,
      finished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const Profiles = {
    NICK_MAX,
    sanitizeNickname,
    validateNickname,
    randomNickname,

    all() {
      return WL.Storage.get('players', []);
    },
    get(id) {
      return Profiles.all().find((p) => p.id === id) || null;
    },
    create(nickname, mode) {
      const p = blankPlayer(nickname, mode);
      Profiles.save(p);
      return p;
    },
    save(player) {
      player.updatedAt = new Date().toISOString();
      const list = Profiles.all().filter((p) => p.id !== player.id);
      list.unshift(player);
      WL.Storage.set('players', list.slice(0, 40));
    },
    remove(id) {
      WL.Storage.set('players', Profiles.all().filter((p) => p.id !== id));
    },
    recent(limit) {
      return Profiles.all()
        .slice()
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, limit || 4);
    },
    clearAll() {
      WL.Storage.set('players', []);
      WL.Storage.remove('currentPlayer');
    },
    setCurrent(id) {
      WL.Storage.set('currentPlayer', id);
    },
    current() {
      const id = WL.Storage.get('currentPlayer', null);
      return id ? Profiles.get(id) : null;
    },
    /** Next mission to play: the first not yet completed. */
    nextMissionId(player) {
      const m = WL.MISSIONS.find((x) => !player.missions[x.id]);
      return m ? m.id : null;
    },
    isUnlocked(player, missionId, demo) {
      if (demo) return true;
      if (missionId === 1) return true;
      return !!player.missions[missionId - 1] || !!player.missions[missionId];
    },
  };

  WL.Profiles = Profiles;
})(typeof window !== 'undefined' ? window : globalThis);
