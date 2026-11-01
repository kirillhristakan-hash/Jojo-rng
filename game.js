/* ============================================================
   JOJO RNG — game.js
   Ядро: состояние, сохранения, RNG, экономика, арена, престиж.
   ============================================================ */
window.JR = window.JR || {};

(function () {
  "use strict";

  const D = JR.D;
  const SAVE_KEY = "jojorng.save.v2";
  const LETTER = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const SUF = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

  /* ---------------- утилиты ---------------- */
  function fmt(n) {
    if (n === Infinity) return "∞";
    if (!isFinite(n) || isNaN(n)) return "0";
    if (n < 1000) return (n < 10 && n % 1 !== 0) ? n.toFixed(1) : Math.floor(n).toString();
    let i = 0;
    while (n >= 1000 && i < SUF.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + SUF[i];
  }
  function now() { return Date.now(); }
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pickWeighted(arr, weightFn) {
    let total = 0;
    for (let i = 0; i < arr.length; i++) total += weightFn(arr[i], i);
    let r = Math.random() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weightFn(arr[i], i);
      if (r <= 0) return i;
    }
    return arr.length - 1;
  }

  /* ---------------- событийная шина ---------------- */
  const bus = {
    map: {},
    on(name, fn) { (this.map[name] = this.map[name] || []).push(fn); },
    emit(name, data) { (this.map[name] || []).forEach(function (f) { try { f(data); } catch (e) { console.warn(e); } }); }
  };
  JR.bus = bus;

  /* ---------------- состояние ---------------- */
  function freshState() {
    return {
      v: 2,
      sp: 0,
      hv: 0,
      prestige: 0,
      up: { luck: 0, speed: 0, income: 0, multi: 0, mutch: 0, auto: 0, dupe: 0, floor: 0 },
      tree: { t_luck: 0, t_income: 0, t_mut: 0, t_power: 0 },
      index: {},
      best: null,
      stage: 0,
      quests: [],
      questDay: "",
      ach: {},
      stats: {
        rolls: 0, mutations: 0, wins: 0, duels: 0, raids: 0,
        totalSp: 0, playtime: 0, maxTier: 0, onlineVisits: 0, multiBest: 0
      },
      settings: { sound: true, fx: true, fast: false },
      lastRoll: 0,
      auto: false,
      feed: [],
      nick: ""
    };
  }

  let S = freshState();

  /* ---------------- вычисляемые статы ---------------- */
  const C = {
    luck() {
      return 1 + S.up.luck * 0.12 + S.tree.t_luck * 0.08 + S.prestige * 0.25;
    },
    rollTime() {
      return Math.max(0.1, 1.2 * Math.pow(0.96, S.up.speed));
    },
    incomeMult() {
      return (1 + S.up.income * 0.22) * (1 + S.tree.t_income * 0.12) * (1 + S.prestige * 0.5);
    },
    mutChance() {
      return Math.min(0.4, 0.02 + S.up.mutch * 0.011 + S.tree.t_mut * 0.004);
    },
    powerMult() {
      return (1 + S.tree.t_power * 0.06) * (1 + S.prestige * 0.12);
    },
    multiCount() {
      return 5 + S.up.multi * 5;
    },
    dupeBonus() {
      return 1 + S.up.dupe * 0.15;
    },
    canAuto() {
      return S.up.auto > 0;
    }
  };

  /* ---------------- сохранение ---------------- */
  let saveTimer = null;
  function save(silent) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
      if (!silent) bus.emit("saved");
    } catch (e) { /* приватный режим / переполнение */ }
  }
  function queueSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () { saveTimer = null; save(true); }, 1200);
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return false;
      const base = freshState();
      S = Object.assign(base, obj);
      S.up = Object.assign(base.up, obj.up || {});
      S.tree = Object.assign(base.tree, obj.tree || {});
      S.stats = Object.assign(base.stats, obj.stats || {});
      S.settings = Object.assign(base.settings, obj.settings || {});
      S.index = obj.index || {};
      S.ach = obj.ach || {};
      S.quests = obj.quests || [];
      if (!S.nick) S.nick = "Игрок" + Math.floor(1000 + Math.random() * 9000);
      return true;
    } catch (e) { return false; }
  }
  function exportSave() {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); } catch (e) { return ""; }
  }
  function importSave(str) {
    try {
      const json = decodeURIComponent(escape(atob(String(str).trim())));
      const obj = JSON.parse(json);
      if (!obj || !obj.stats) return false;
      S = Object.assign(freshState(), obj);
      S.up = Object.assign(freshState().up, obj.up || {});
      S.tree = Object.assign(freshState().tree, obj.tree || {});
      S.stats = Object.assign(freshState().stats, obj.stats || {});
      save(true);
      bus.emit("loaded");
      return true;
    } catch (e) { return false; }
  }
  function hardReset() {
    S = freshState();
    S.nick = "Игрок" + Math.floor(1000 + Math.random() * 9000);
    save(true);
    bus.emit("loaded");
  }

  /* ---------------- RNG ---------------- */
  function effectiveWeights() {
    const luck = C.luck();
    return D.RAR.map(function (r) {
      if (r.tier < 2) return r.weight;
      return r.weight * Math.pow(luck, 0.25 + (r.tier - 2) * 0.26);
    });
  }
  function pickTier() {
    const w = effectiveWeights();
    let total = 0;
    for (let i = 0; i < w.length; i++) total += w[i];
    let r = Math.random() * total;
    for (let i = 0; i < w.length; i++) {
      r -= w[i];
      if (r <= 0) return Math.max(i, S.up.floor);
    }
    return Math.max(w.length - 1, S.up.floor);
  }
  function pickMutation() {
    const idx = pickWeighted(D.MUT, function (m) { return m.weight; });
    return D.MUT[idx];
  }

  function makeRoll() {
    const tier = pickTier();
    const bucket = D.ENT[tier];
    const idx = Math.floor(Math.random() * bucket.length);
    const raw = bucket[idx];
    const rar = D.RAR[tier];

    let mut = null;
    if (Math.random() < C.mutChance()) mut = pickMutation();

    // сила: базовая редкость × качество статов × мутация × бонусы
    let statScore = 0;
    for (let i = 0; i < raw.st.length; i++) statScore += LETTER[raw.st[i]] || 1;
    const quality = 0.55 + statScore / 16;           // 0.86 … 2.11
    const power = rar.power * quality * (mut ? mut.mult : 1) * C.powerMult();

    const id = D.idOf(tier, idx);
    const isNew = !S.index[id];
    const spBase = rar.income * (1 + (mut ? Math.sqrt(mut.mult) * 0.6 : 0));
    const sp = spBase * C.incomeMult() * (isNew ? 1 : C.dupeBonus());

    return {
      id: id, tier: tier, idx: idx, rar: rar, raw: raw,
      mut: mut, power: power, sp: sp, isNew: isNew,
      name: raw.n, emoji: raw.e, color: raw.c || rar.color
    };
  }

  function applyRoll(r) {
    S.stats.rolls++;
    S.index[r.id] = (S.index[r.id] || 0) + 1;
    if (r.tier > S.stats.maxTier) S.stats.maxTier = r.tier;
    if (r.mut) S.stats.mutations++;
    if (!S.best || r.power > S.best.power) {
      S.best = { id: r.id, tier: r.tier, power: r.power, mut: r.mut ? r.mut.key : null, name: r.name };
    }
    S.sp += r.sp;
    S.stats.totalSp += r.sp;

    // лента (последние 40)
    S.feed.unshift({
      name: r.name, tier: r.tier, emoji: r.emoji, power: r.power,
      mut: r.mut ? r.mut.name : null, color: r.color
    });
    if (S.feed.length > 40) S.feed.length = 40;

    // задания
    addQuestProgress("rolls", 1);
    addQuestProgress("sp", r.sp);
    addQuestProgress("tier", 1, r.tier);
    if (r.mut) addQuestProgress("mut", 1);
  }

  /**
   * Один ролл. Возвращает результат или null, если кулдаун.
   */
  function roll(ignoreCd) {
    if (!ignoreCd && now() - S.lastRoll < C.rollTime() * 1000) return null;
    S.lastRoll = now();
    const r = makeRoll();
    applyRoll(r);
    checkAchievements();
    queueSave();
    bus.emit("roll", r);
    return r;
  }

  function rollMany(n) {
    if (now() - S.lastRoll < C.rollTime() * 1000) return null;
    S.lastRoll = now();
    const out = [];
    let best = null;
    for (let i = 0; i < n; i++) {
      const r = makeRoll();
      applyRoll(r);
      out.push(r);
      if (!best || r.power > best.power) best = r;
    }
    checkAchievements();
    save(true);
    bus.emit("rollMany", out);
    return out;
  }

  /* ---------------- магазин ---------------- */
  function upCost(key) {
    const u = D.UPGRADES.find(function (x) { return x.key === key; });
    const lvl = S.up[key] || 0;
    return Math.floor(u.base * Math.pow(u.growth, lvl));
  }
  function buyUpgrade(key) {
    const u = D.UPGRADES.find(function (x) { return x.key === key; });
    if (!u) return { ok: false, msg: "Нет такого улучшения" };
    const lvl = S.up[key] || 0;
    if (lvl >= u.max) return { ok: false, msg: "Максимальный уровень" };
    const cost = upCost(key);
    if (S.sp < cost) return { ok: false, msg: "Не хватает Спина" };
    S.sp -= cost;
    S.up[key] = lvl + 1;
    checkAchievements();
    queueSave();
    return { ok: true, msg: u.name + " → ур. " + (lvl + 1) };
  }

  function treeCost(key) {
    const t = D.TREE.find(function (x) { return x.key === key; });
    const lvl = S.tree[key] || 0;
    return Math.floor(t.base * Math.pow(t.growth, lvl));
  }
  function buyTree(key) {
    const t = D.TREE.find(function (x) { return x.key === key; });
    if (!t) return { ok: false, msg: "Нет такого узла" };
    const lvl = S.tree[key] || 0;
    if (lvl >= t.max) return { ok: false, msg: "Максимальный уровень" };
    const cost = treeCost(key);
    if (S.hv < cost) return { ok: false, msg: "Не хватает Наследия" };
    S.hv -= cost;
    S.tree[key] = lvl + 1;
    queueSave();
    return { ok: true, msg: t.name + " → ур. " + (lvl + 1) };
  }

  /* ---------------- престиж ---------------- */
  const PRESTIGE_MIN = 600;
  function prestigeGain() {
    const p = S.best ? S.best.power : 0;
    if (p < PRESTIGE_MIN) return 0;
    return Math.max(1, Math.floor(Math.pow(p / PRESTIGE_MIN, 0.35) * (1 + S.stage * 0.08)));
  }
  function canPrestige() { return prestigeGain() > 0; }
  function doPrestige() {
    const gain = prestigeGain();
    if (gain <= 0) return { ok: false, msg: "Нужен стенд силой " + fmt(PRESTIGE_MIN) + "+" };
    const keep = {
      index: S.index, ach: S.ach, prestige: S.prestige + 1, hv: S.hv + gain,
      tree: S.tree, settings: S.settings, nick: S.nick,
      stats: S.stats
    };
    S = freshState();
    Object.assign(S, keep);
    S.quests = [];
    S.questDay = "";
    checkAchievements();
    save(true);
    bus.emit("prestige", gain);
    return { ok: true, gain: gain };
  }

  /* ---------------- задания ---------------- */
  function sampleTemplates(n) {
    const pool = D.QUESTS.slice();
    const out = [];
    for (let i = 0; i < n && pool.length; i++) {
      const k = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(k, 1)[0]);
    }
    return out;
  }
  function genQuests() {
    const lvl = 1 + S.prestige * 1.2 + S.stage * 0.15;
    const picks = sampleTemplates(3);
    S.quests = picks.map(function (t) {
      const q = {
        id: t.id, type: t.type, prog: 0, claimed: false,
        target: Math.max(1, Math.round(t.n(lvl))),
        rew: Math.max(50, Math.round(t.rew(lvl)))
      };
      if (t.type === "tier") {
        q.tier = Math.min(8, 4 + Math.floor(S.prestige / 2));
        q.name = "Получи " + q.target + "× ранг «" + D.RAR[q.tier].name + "» или выше";
      } else {
        q.name = t.name.replace("{n}", fmt(q.target))
          .replace("{t}", q.tier != null ? D.RAR[q.tier].name : "");
      }
      return q;
    });
    S.questDay = todayKey();
  }
  function questsEnsure() {
    if (S.questDay !== todayKey() || !S.quests.length) {
      genQuests();
      save(true);
    }
  }
  function addQuestProgress(type, amount, tier) {
    let changed = false;
    for (let i = 0; i < S.quests.length; i++) {
      const q = S.quests[i];
      if (q.claimed || q.type !== type) continue;
      if (type === "tier" && tier < q.tier) continue;
      if (q.prog >= q.target) continue;
      q.prog = Math.min(q.target, q.prog + (type === "sp" ? amount : amount));
      changed = true;
    }
    if (changed) bus.emit("quests");
  }
  function claimQuest(i) {
    const q = S.quests[i];
    if (!q || q.claimed || q.prog < q.target) return { ok: false, msg: "Не выполнено" };
    q.claimed = true;
    S.sp += q.rew;
    S.stats.totalSp += q.rew;
    queueSave();
    return { ok: true, msg: "+" + fmt(q.rew) + " Спина" };
  }

  /* ---------------- достижения ---------------- */
  function checkAchievements() {
    const unlocked = [];
    for (let i = 0; i < D.ACH.length; i++) {
      const a = D.ACH[i];
      if (S.ach[a.id]) continue;
      let ok = false;
      try { ok = a.f(S); } catch (e) { ok = false; }
      if (ok) {
        S.ach[a.id] = 1;
        const rew = 250 + i * 120;
        S.sp += rew;
        S.stats.totalSp += rew;
        unlocked.push({ a: a, rew: rew });
      }
    }
    if (unlocked.length) {
      save(true);
      bus.emit("achievements", unlocked);
    }
    return unlocked;
  }

  /* ---------------- арена ---------------- */
  function bossInfo() {
    const stage = S.stage;
    if (stage < D.BOSSES.length) {
      const b = D.BOSSES[stage];
      const hp = b.req * 8;
      return { name: b.name, emoji: b.e, hp: hp, maxHp: hp, req: b.req, reward: b.reward, quote: b.quote, stage: stage + 1, end: false };
    }
    // бесконечный режим после 12 этапов
    const over = stage - D.BOSSES.length + 1;
    const base = D.BOSSES[D.BOSSES.length - 1];
    const req = base.req * Math.pow(8, over);
    return {
      name: base.name + " +" + over, emoji: base.e, hp: req * 8, maxHp: req * 8, req: req,
      reward: base.reward * Math.pow(6, over), quote: "Бесконечный цикл.", stage: stage + 1, end: true
    };
  }

  let battle = null;
  function startBattle() {
    if (!S.best) return { ok: false, msg: "Сначала найди стенд" };
    const b = bossInfo();
    battle = { boss: b, hp: b.hp, resolve: 100, log: [], turn: 0, over: false, win: false };
    return { ok: true, battle: battle };
  }
  function battleStep() {
    if (!battle || battle.over) return null;
    const b = battle.boss;
    const power = S.best.power;
    battle.turn++;

    const crit = Math.random() < 0.18;
    let dmg = power * rand(0.45, 1.15) * (crit ? 2.2 : 1);
    dmg = Math.max(power * 0.15, dmg);
    battle.hp = Math.max(0, battle.hp - dmg);
    battle.log.push({ t: "hit", crit: crit, v: dmg, name: b.name });

    if (battle.hp <= 0) {
      battle.over = true;
      battle.win = true;
      S.stage++;
      S.stats.wins++;
      const rew = b.reward;
      S.sp += rew;
      S.stats.totalSp += rew;
      battle.log.push({ t: "win", v: rew });
      addQuestProgress("wins", 1);
      checkAchievements();
      save(true);
      bus.emit("battleWin", { reward: rew, stage: S.stage });
      return battle;
    }

    // ответный удар: масштабируется от силы игрока, а не от ХП босса
    const back = power * rand(0.06, 0.12);
    battle.resolve = Math.max(0, battle.resolve - back);
    battle.log.push({ t: "hurt", v: back });

    if (battle.resolve <= 0) {
      battle.over = true;
      battle.win = false;
      battle.log.push({ t: "lose" });
      save(true);
    }
    return battle;
  }

  /* ---------------- старт ---------------- */
  function init() {
    if (!load()) {
      S = freshState();
      S.nick = "Игрок" + Math.floor(1000 + Math.random() * 9000);
    }
    questsEnsure();
    checkAchievements();
    setInterval(function () { S.stats.playtime += 1; }, 1000);
    setInterval(function () { save(true); }, 15000);
    window.addEventListener("beforeunload", function () { save(true); });
  }

  JR.G = {
    get state() { return S; },
    C: C, init: init, save: save, load: load, exportSave: exportSave, importSave: importSave,
    hardReset: hardReset,
    roll: roll, rollMany: rollMany,
    upCost: upCost, buyUpgrade: buyUpgrade, treeCost: treeCost, buyTree: buyTree,
    prestigeGain: prestigeGain, canPrestige: canPrestige, doPrestige: doPrestige, PRESTIGE_MIN: PRESTIGE_MIN,
    questsEnsure: questsEnsure, claimQuest: claimQuest,
    checkAchievements: checkAchievements,
    bossInfo: bossInfo, startBattle: startBattle, battleStep: battleStep,
    get battle() { return battle; },
    fmt: fmt, todayKey: todayKey, pickWeighted: pickWeighted, rand: rand,
    tierName: function (t) { return D.RAR[t].name; }
  };
})();
