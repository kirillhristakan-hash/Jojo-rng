/* ============================================================
   JOJO RNG — net.js
   Онлайн без сервера: WebRTC (PeerJS), звезда вокруг хоста.
   GitHub Pages подходит, потому что вся логика — в браузере.
   ============================================================ */
window.JR = window.JR || {};

(function () {
  "use strict";

  const PREFIX = "jojorng-v2-";
  const bus = JR.bus;
  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const net = {
    peer: null,
    conns: {},          // host: peerId -> DataConnection
    hostConn: null,     // guest: соединение с хостом
    isHost: false,
    code: "",
    myId: "",
    players: {},        // id -> {id, nick, best, tier, power, host}
    raid: null,
    chat: [],
    feed: [],
    status: "offline",  // offline | connecting | online | error
    lastErr: ""
  };

  function rid(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return s;
  }

  function peerOpts() {
    return {
      debug: 0,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" }
        ]
      }
    };
  }

  function setStatus(s, err) {
    net.status = s;
    net.lastErr = err || "";
    bus.emit("net:status", { status: s, err: net.lastErr });
  }

  /* ---------------- сериализация игрока ---------------- */
  function me() {
    const s = JR.G.state;
    const best = s.best;
    return {
      nick: s.nick || "Игрок",
      best: best ? best.name : "—",
      tier: best ? best.tier : -1,
      power: best ? best.power : 0
    };
  }

  /* ---------------- отправка ---------------- */
  function sendRaw(conn, obj) {
    if (!conn) return;
    try { conn.send(obj); } catch (e) { /* соединение закрыто */ }
  }

  function hostBroadcast(obj, exceptId) {
    Object.keys(net.conns).forEach(function (id) {
      if (id === exceptId) return;
      sendRaw(net.conns[id], obj);
    });
  }

  /** Отправить сообщение в комнату (хост — всем, гость — хосту). */
  function publish(obj) {
    obj.from = net.myId;
    obj.nick = JR.G.state.nick;
    if (net.isHost) hostBroadcast(obj);
    else sendRaw(net.hostConn, obj);
  }

  function rosterPayload() {
    return Object.keys(net.players).map(function (k) { return net.players[k]; });
  }

  function pushRoster() {
    hostBroadcast({ t: "roster", players: rosterPayload() });
    bus.emit("net:roster", rosterPayload());
  }

  /* ---------------- рейд ---------------- */
  function raidInit() {
    const list = rosterPayload();
    let sum = 0, n = 0;
    list.forEach(function (p) { if (p.power > 0) { sum += p.power; n++; } });
    const avg = Math.max(5000, n ? sum / n : 5000);
    const lvl = net.raid ? net.raid.lvl + 1 : 1;
    const maxHp = Math.floor(avg * 26 * (1 + lvl * 0.3));
    net.raid = {
      lvl: lvl, hp: maxHp, maxHp: maxHp,
      name: ["DIO Over Heaven", "Heaven Ascension DIO", "Made in Heaven", "Ultimate Kars"][(lvl - 1) % 4]
    };
    hostBroadcast({ t: "raidstate", raid: net.raid });
    bus.emit("net:raid", net.raid);
  }

  function raidDamage(amount, byId) {
    if (!net.isHost || !net.raid) return;
    net.raid.hp = Math.max(0, net.raid.hp - amount);
    hostBroadcast({ t: "raidstate", raid: net.raid, hit: { id: byId, dmg: amount } });
    bus.emit("net:raid", net.raid);
    if (net.raid.hp <= 0) {
      const reward = Math.floor(net.raid.maxHp * 0.08);
      // награда хосту (гости получат её из raidkill)
      const st = JR.G.state;
      st.sp += reward; st.stats.totalSp += reward; st.stats.raids++;
      JR.G.checkAchievements(); JR.G.save(true);
      hostBroadcast({ t: "raidkill", lvl: net.raid.lvl, reward: reward });
      bus.emit("net:raidkill", { lvl: net.raid.lvl, reward: reward });
      setTimeout(raidInit, 2500);
    }
  }

  /* ---------------- обработка входящих ---------------- */
  function handle(obj, fromId) {
    if (!obj || !obj.t) return;
    const st = JR.G.state;

    switch (obj.t) {
      case "hello": {
        // только хост
        net.players[fromId] = {
          id: fromId, nick: obj.nick || "Игрок", best: obj.best || "—",
          tier: obj.tier, power: obj.power || 0, host: false
        };
        sendRaw(net.conns[fromId], {
          t: "welcome", code: net.code, you: fromId,
          players: rosterPayload(), raid: net.raid
        });
        const joinText = (obj.nick || "Игрок") + " подключился";
        hostBroadcast({ t: "sys", text: joinText }, fromId);
        addChat("", joinText, false, true);
        pushRoster();
        if (!net.raid) raidInit();
        break;
      }
      case "welcome": {
        net.players = {};
        (obj.players || []).forEach(function (p) { net.players[p.id] = p; });
        net.players[net.myId] = Object.assign({ id: net.myId, host: false }, me());
        net.code = obj.code;
        net.raid = obj.raid;
        setStatus("online");
        bus.emit("net:roster", rosterPayload());
        bus.emit("net:raid", net.raid);
        addChat("", "Ты в комнате " + obj.code, false, true);
        break;
      }
      case "roster": {
        if (net.isHost) break;
        const prev = net.players;
        net.players = {};
        (obj.players || []).forEach(function (p) { net.players[p.id] = p; });
        // собственный статус не затираем чужой записью
        if (!net.players[net.myId]) net.players[net.myId] = Object.assign({ id: net.myId }, me());
        bus.emit("net:roster", rosterPayload());
        break;
      }
      case "chat": {
        if (net.isHost) hostBroadcast(obj, fromId);
        addChat(obj.nick || "Игрок", String(obj.text || "").slice(0, 200), obj.from === net.myId);
        break;
      }
      case "sys": {
        if (net.isHost) hostBroadcast(obj, fromId);
        addChat("", obj.text, false, true);
        break;
      }
      case "feed": {
        if (net.isHost) {
          const pl = net.players[fromId];
          if (pl && obj.roll) {
            pl.best = obj.roll.name;
            pl.tier = obj.roll.tier;
            pl.power = obj.roll.power;
            pushRoster();
          }
          hostBroadcast(obj, fromId);
        }
        if (!obj.roll) break;
        net.feed.unshift(obj.roll);
        if (net.feed.length > 40) net.feed.length = 40;
        bus.emit("net:feed", obj.roll);
        break;
      }
      case "duel": {
        // obj: {to, power, name}
        if (net.isHost) {
          if (obj.to === net.myId) resolveDuel(obj);
          else hostBroadcast(obj, fromId);
        } else {
          if (obj.to === net.myId) resolveDuel(obj);
        }
        break;
      }
      case "duelres": {
        if (obj.to !== net.myId) {
          // результат чужой дуэли: хост пересылает, гость игнорирует
          if (net.isHost) hostBroadcast(obj, fromId);
          break;
        }
        // адресат duelres — всегда вызывающий, поэтому его победа = obj.win
        applyDuelResult(obj, true);
        break;
      }
      case "raidatk": {
        if (net.isHost) raidDamage(obj.dmg, fromId);
        break;
      }
      case "raidstate": {
        if (net.isHost) break;
        net.raid = obj.raid;
        bus.emit("net:raid", obj.raid);
        if (obj.hit) bus.emit("net:raidhit", obj.hit);
        break;
      }
      case "raidkill": {
        if (net.isHost) break;
        st.sp += obj.reward;
        st.stats.totalSp += obj.reward;
        st.stats.raids++;
        JR.G.checkAchievements();
        JR.G.save(true);
        bus.emit("net:raidkill", obj);
        break;
      }
      case "bye": {
        if (net.isHost) {
          delete net.players[fromId];
          delete net.conns[fromId];
          pushRoster();
          addChat("", (obj.nick || "Игрок") + " вышел", false, true);
        }
        break;
      }
    }
  }

  /* ---------------- дуэли ---------------- */
  function resolveDuel(challenge) {
    const st = JR.G.state;
    const myPow = st.best ? st.best.power : 1;
    // три схватки: сравниваем силу с элементом случайности
    let myWins = 0, hisWins = 0;
    for (let i = 0; i < 3; i++) {
      const a = myPow * (0.55 + Math.random() * 1.1);
      const b = challenge.power * (0.55 + Math.random() * 1.1);
      if (a >= b) myWins++; else hisWins++;
    }
    const iWin = myWins > hisWins;
    if (iWin) { st.stats.duels++; JR.G.checkAchievements(); JR.G.save(true); }
    const res = {
      // win считается с точки зрения вызывающего (адресата сообщения)
      t: "duelres", to: challenge.from, win: !iWin,
      aName: challenge.nick, bName: st.nick,
      aPow: challenge.power, bPow: myPow, score: myWins + ":" + hisWins
    };
    publish(res);
    bus.emit("net:duel", {
      iWin: iWin, opp: challenge.nick, my: myPow, his: challenge.power,
      score: myWins + ":" + hisWins
    });
  }

  function applyDuelResult(obj, amChallenger) {
    const st = JR.G.state;
    const iWin = amChallenger ? obj.win : !obj.win;
    if (iWin) {
      st.stats.duels++;
      const bonus = 5000 + Math.floor((st.best ? st.best.power : 0) * 0.15);
      st.sp += bonus;
      st.stats.totalSp += bonus;
      JR.G.checkAchievements();
      JR.G.save(true);
      bus.emit("net:duel", { iWin: true, opp: obj.bName, my: obj.aPow, his: obj.bPow, score: obj.score, bonus: bonus });
    } else {
      bus.emit("net:duel", { iWin: false, opp: obj.aName, my: obj.bPow, his: obj.aPow, score: obj.score });
    }
  }

  function challenge(targetId) {
    const st = JR.G.state;
    publish({
      t: "duel", to: targetId,
      power: st.best ? st.best.power : 1
    });
  }

  /* ---------------- чат ---------------- */
  function addChat(nick, text, mine, sys) {
    if (!text) return;
    net.chat.push({ nick: nick, text: text, mine: !!mine, sys: !!sys, ts: Date.now() });
    if (net.chat.length > 80) net.chat.shift();
    bus.emit("net:chat", net.chat[net.chat.length - 1]);
  }
  function sendChat(text) {
    text = String(text || "").trim().slice(0, 160);
    if (!text) return;
    publish({ t: "chat", text: text });
    addChat(JR.G.state.nick, text, true);
  }

  /* ---------------- создание / вход ---------------- */
  let hostTry = 0;
  function host() {
    if (typeof Peer === "undefined" || window.__peerFail) {
      setStatus("error", "Не удалось загрузить PeerJS. Проверь интернет и обнови страницу.");
      return;
    }
    leave(true);
    setStatus("connecting");
    const code = rid(5);
    const id = PREFIX + code;
    net.isHost = true;
    net.code = code;
    net.myId = id;

    const p = new Peer(id, peerOpts());
    net.peer = p;

    p.on("open", function () {
      net.players[net.myId] = Object.assign({ id: net.myId, host: true }, me());
      setStatus("online");
      raidInit();
      bus.emit("net:hosted", code);
      bus.emit("net:roster", rosterPayload());
      JR.G.state.stats.onlineVisits++;
      JR.G.checkAchievements();
    });

    p.on("connection", function (conn) {
      net.conns[conn.peer] = conn;
      conn.on("data", function (data) { handle(data, conn.peer); });
      conn.on("close", function () {
        delete net.conns[conn.peer];
        const pl = net.players[conn.peer];
        delete net.players[conn.peer];
        if (pl) addChat("", pl.nick + " отключился", false, true);
        pushRoster();
      });
      conn.on("error", function () { /* игнор единичных сбоев */ });
    });

    p.on("error", function (err) {
      const type = err && err.type;
      if (type === "unavailable-id") {
        // код заняли — пробуем ещё раз (ограниченное число попыток)
        if (hostTry++ < 5) { setTimeout(host, 400); return; }
        setStatus("error", "Не удалось занять код комнаты. Попробуй ещё раз.");
        return;
      }
      if (type === "peer-unavailable") return;
      setStatus("error", "Сеть: " + (err && err.type ? err.type : "ошибка соединения"));
    });

    p.on("disconnected", function () {
      try { p.reconnect(); } catch (e) { /* ничего */ }
    });
  }

  function join(code) {
    code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length < 4) { setStatus("error", "Код слишком короткий"); return; }
    if (typeof Peer === "undefined" || window.__peerFail) {
      setStatus("error", "Не удалось загрузить PeerJS. Проверь интернет и обнови страницу.");
      return;
    }
    leave(true);
    setStatus("connecting");
    net.isHost = false;
    net.code = code;

    const p = new Peer(null, peerOpts());
    net.peer = p;

    p.on("open", function () {
      net.myId = p.id;
      const conn = p.connect(PREFIX + code, { reliable: true });
      net.hostConn = conn;
      conn.on("open", function () {
        const m = me();
        sendRaw(conn, { t: "hello", nick: m.nick, best: m.best, tier: m.tier, power: m.power, from: p.id });
        JR.G.state.stats.onlineVisits++;
      });
      conn.on("data", function (data) { handle(data, conn.peer); });
      conn.on("close", function () {
        if (net.status === "online") setStatus("error", "Соединение с хостом потеряно");
        net.hostConn = null;
      });
      conn.on("error", function () {
        setStatus("error", "Не удалось подключиться. Проверь код комнаты.");
      });
    });

    p.on("error", function (err) {
      const type = err && err.type;
      if (type === "peer-unavailable") setStatus("error", "Комната не найдена. Проверь код.");
      else setStatus("error", "Сеть: " + (type || "ошибка"));
    });
  }

  function leave(silent) {
    try {
      if (net.status === "online") publish({ t: "bye" });
    } catch (e) { /* ничего */ }
    Object.keys(net.conns).forEach(function (k) {
      try { net.conns[k].close(); } catch (e) {}
    });
    if (net.hostConn) { try { net.hostConn.close(); } catch (e) {} }
    if (net.peer) { try { net.peer.destroy(); } catch (e) {} }

    net.conns = {};
    net.hostConn = null;
    net.peer = null;
    net.players = {};
    net.isHost = false;
    net.code = "";
    net.myId = "";
    net.raid = null;
    net.chat = [];
    net.feed = [];
    setStatus("offline");
    if (!silent) bus.emit("net:left");
  }

  function attackRaid() {
    const st = JR.G.state;
    if (!st.best) return { ok: false, msg: "Нет стенда" };
    if (!net.raid) return { ok: false, msg: "Рейд не активен" };
    const crit = Math.random() < 0.12;
    const dmg = Math.floor(st.best.power * (0.8 + Math.random() * 0.8) * (crit ? 3 : 1));
    if (net.isHost) raidDamage(dmg, net.myId);
    else sendRaw(net.hostConn, { t: "raidatk", dmg: dmg });
    return { ok: true, dmg: dmg, crit: crit };
  }

  function broadcastRoll(r) {
    if (net.status !== "online") return;
    publish({
      t: "feed",
      roll: {
        name: r.name, tier: r.tier, emoji: r.emoji, power: r.power,
        mut: r.mut ? r.mut.name : null, color: r.color, nick: JR.G.state.nick
      }
    });
  }

  net.host = host;
  net.join = join;
  net.leave = leave;
  net.sendChat = sendChat;
  net.challenge = challenge;
  net.attackRaid = attackRaid;
  net.broadcastRoll = broadcastRoll;
  net.me = me;
  net.roster = rosterPayload;

  JR.net = net;
})();
