/* ============================================================
   JOJO RNG — ui.js
   Интерфейс, анимации, звук, экраны.
   ============================================================ */
(function () {
  "use strict";

  const G = JR.G, D = JR.D, net = JR.net, bus = JR.bus;
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  let idxFilter = -1;
  let cdRaf = 0;
  let revealOpen = false;
  let battleTimer = null;
  let lastAuto = 0;

  /* ================= ЗВУК (синтез, без файлов) ================= */
  const SND = {
    ctx: null,
    ac: function () {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    tone: function (freq, dur, type, vol, slide) {
      if (!G.state.settings.sound) return;
      const ac = this.ac(); if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), ac.currentTime + dur);
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(vol || 0.12, ac.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(g).connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur + 0.02);
    },
    noise: function (dur, vol, from, to) {
      if (!G.state.settings.sound) return;
      const ac = this.ac(); if (!ac) return;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = "bandpass";
      f.frequency.setValueAtTime(from || 400, ac.currentTime);
      f.frequency.exponentialRampToValueAtTime(to || 2000, ac.currentTime + dur);
      const g = ac.createGain(); g.gain.value = vol || 0.16;
      src.connect(f).connect(g).connect(ac.destination);
      src.start();
    },
    click: function () { this.tone(620, 0.05, "square", 0.05, 380); },
    roll: function () {
      this.noise(0.32, 0.12, 300, 2600);
      this.tone(180, 0.28, "sawtooth", 0.06, 720);
    },
    reveal: function (tier) {
      const base = 110 + tier * 12;
      this.tone(base, 0.5, "triangle", 0.1, base * 0.6);
      if (tier >= 3) this.tone(base * 2, 0.42, "sine", 0.07, base * 1.5);
      if (tier >= 6) {
        this.tone(base * 3, 0.9, "sawtooth", 0.045, base * 2);
        this.tone(base * 4.2, 0.9, "sine", 0.05, base * 3);
      }
      if (tier >= 9) {
        this.noise(0.9, 0.2, 120, 60);
        this.tone(48, 1.4, "sine", 0.22, 30);
      }
    },
    error: function () { this.tone(160, 0.16, "square", 0.06, 90); },
    coin: function () { this.tone(880, 0.07, "square", 0.05); setTimeout(() => this.tone(1320, 0.09, "square", 0.045), 60); }
  };

  /* ================= ЭФФЕКТЫ ================= */
  function shake() {
    if (!G.state.settings.fx) return;
    document.body.classList.remove("shake");
    void document.body.offsetWidth;
    document.body.classList.add("shake");
    setTimeout(function () { document.body.classList.remove("shake"); }, 480);
  }
  function flashLines(on) {
    const el = $("#fx-lines");
    if (!el) return;
    el.classList.toggle("on", !!on && G.state.settings.fx);
  }
  function timeFreeze(ms) {
    if (!G.state.settings.fx) return;
    const tf = $("#timefreeze");
    document.body.classList.add("frozen");
    tf.classList.add("on");
    setTimeout(function () {
      tf.classList.remove("on");
      document.body.classList.remove("frozen");
    }, ms || 1100);
  }

  function toast(msg, kind, ms) {
    const box = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .3s, transform .3s";
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";
      setTimeout(function () { el.remove(); }, 320);
    }, ms || 2600);
    while (box.children.length > 4) box.firstChild.remove();
  }

  /* ================= НАВИГАЦИЯ ================= */
  function switchScreen(name) {
    $$(".screen").forEach(function (s) { s.classList.toggle("active", s.id === "screen-" + name); });
    $$(".nav-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.screen === name); });
    if (name === "index") renderIndex();
    if (name === "shop") { renderShop(); renderPrestige(); renderTree(); }
    if (name === "arena") { renderArena(); renderAch(); renderStats(); }
    if (name === "online") renderOnline();
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { /* старые браузеры */ }
  }

  /* ================= ВЕРХ / СПИН ================= */
  function renderTop() {
    const s = G.state;
    $("#sp-balance").textContent = G.fmt(s.sp);
    $("#hv-balance").textContent = G.fmt(s.hv);
    $("#heaven-chip").style.opacity = (s.hv > 0 || s.prestige > 0) ? "1" : ".45";
    $("#luck-val").textContent = G.C.luck().toFixed(2) + "×";
    $("#rolltime-val").textContent = G.C.rollTime().toFixed(2) + "s";
    $("#income-val").textContent = G.C.incomeMult().toFixed(2) + "×";
    $("#mut-val").textContent = (G.C.mutChance() * 100).toFixed(1) + "%";
  }

  function renderBest() {
    const b = G.state.best;
    const card = $("#best-card");
    if (!b) {
      card.className = "best-card empty";
      card.innerHTML = '<div class="bc-emoji">❔</div><div class="bc-body"><div class="bc-name">Ещё ничего не выпало</div><div class="bc-sub">Крути стрелу, чтобы найти свой стенд</div></div>';
      $("#best-power").textContent = "—";
      return;
    }
    const rar = D.RAR[b.tier];
    const ent = D.entById(b.id);
    card.className = "best-card";
    card.style.borderColor = rar.color;
    card.style.background = "linear-gradient(135deg," + hexA(rar.color, 0.22) + "," + hexA(rar.color, 0.05) + ")";
    card.innerHTML =
      '<div class="bc-emoji">' + (ent ? ent.raw.e : "❔") + "</div>" +
      '<div class="bc-body"><div class="bc-name">' + esc(ent ? ent.raw.n : b.name) + "</div>" +
      '<div class="bc-sub" style="color:' + rar.color + '">' + rar.name +
      (b.mut ? " · " + esc(mutName(b.mut)) : "") + "</div></div>";
    $("#best-power").textContent = "⚡ " + G.fmt(b.power);
  }

  function mutName(key) {
    const m = D.MUT.find(function (x) { return x.key === key; });
    return m ? m.name : key;
  }

  function renderFeed() {
    const box = $("#feed");
    const feed = G.state.feed;
    if (!feed.length) { box.innerHTML = '<div class="feed-empty">Пока пусто. Первый ролл — самый важный.</div>'; return; }
    box.innerHTML = feed.slice(0, 12).map(function (f) {
      const rar = D.RAR[f.tier];
      return '<div class="feed-row" style="border-left-color:' + rar.color + '">' +
        '<span class="fr-emoji">' + f.emoji + "</span>" +
        '<span class="fr-name">' + esc(f.name) + (f.mut ? ' <i style="color:' + rar.color + ';font-size:9px">' + esc(f.mut) + "</i>" : "") + "</span>" +
        '<span class="fr-rar" style="background:' + hexA(rar.color, 0.16) + ";color:" + rar.color + '">' + rar.name + "</span>" +
        '<span class="fr-pow">' + G.fmt(f.power) + "</span>" +
        "</div>";
    }).join("");
  }

  function renderQuests() {
    G.questsEnsure();
    const box = $("#quest-list");
    box.innerHTML = G.state.quests.map(function (q, i) {
      const pct = Math.min(100, (q.prog / q.target) * 100);
      const done = q.prog >= q.target;
      return '<div class="quest' + (done && !q.claimed ? " done" : "") + '">' +
        '<div class="quest-body"><div class="quest-name">' + esc(q.name) + "</div>" +
        '<div class="qbar"><div style="width:' + pct + '%"></div></div></div>' +
        '<div class="quest-rew">+' + G.fmt(q.rew) + " 🌀</div>" +
        '<button class="claim" data-claim="' + i + '"' + (q.claimed || !done ? " disabled" : "") + ">" +
        (q.claimed ? "✓" : "ЗАБРАТЬ") + "</button></div>";
    }).join("");

    const left = new Date();
    left.setHours(24, 0, 0, 0);
    const h = Math.floor((left - Date.now()) / 3600000);
    $("#quest-timer").textContent = "обновление через " + h + " ч";
  }

  /* ================= РОЛЛ ================= */
  function canRoll() {
    return Date.now() - G.state.lastRoll >= G.C.rollTime() * 1000;
  }

  function cdLoop() {
    const S = G.state;
    const total = G.C.rollTime() * 1000;
    const left = Math.max(0, S.lastRoll + total - Date.now());
    const p = total > 0 ? (left / total) * 100 : 0;
    const btn = $("#roll-btn");
    const cd = $("#roll-cd");
    if (cd) cd.style.setProperty("--p", p.toFixed(1));
    if (btn) btn.disabled = left > 0;
    cdRaf = requestAnimationFrame(cdLoop);
  }

  function doRoll(multi, fromAuto) {
    if (!canRoll()) return;
    if (!fromAuto) SND.roll();
    const n = multi ? G.C.multiCount() : 1;
    const res = n > 1 ? G.rollMany(n) : G.roll(false);
    if (!res) return;

    const arr = Array.isArray(res) ? res : [res];
    arr.forEach(function (r) { net.broadcastRoll(r); });

    renderTop(); renderBest(); renderFeed(); renderQuests(); renderIdxSafe();

    let best = arr[0];
    for (let i = 1; i < arr.length; i++) if (arr[i].power > best.power) best = arr[i];

    const skip = (fromAuto && best.tier < 8) || (G.state.settings.fast && best.tier < 7);
    if (skip) {
      toast(best.emoji + " " + best.name + " · " + G.fmt(best.power), best.tier >= 5 ? "rare" : "", 1400);
    } else {
      showReveal(best, arr.length);
    }
    if (best.tier >= 9) {
      timeFreeze(1200);
      shake();
      flashLines(true);
      setTimeout(function () { flashLines(false); }, 900);
    } else if (best.tier >= 7) {
      shake();
      flashLines(true);
      setTimeout(function () { flashLines(false); }, 700);
    } else if (best.tier >= 5) {
      shake();
    }
  }

  function showReveal(r, count) {
    const rar = D.RAR[r.tier];
    const card = $("#rv-card");
    $("#rv-bg").style.background =
      "radial-gradient(circle at 50% 40%," + hexA(rar.color, 0.55) + ",transparent 62%)," +
      "radial-gradient(circle at 50% 90%," + hexA(rar.color, 0.3) + ",transparent 70%)";
    card.style.borderColor = rar.color;
    card.style.boxShadow = "0 0 70px " + hexA(rar.color, 0.45) + ",0 24px 60px rgba(0,0,0,.7)";
    $("#rv-rarity").textContent = rar.name;
    $("#rv-rarity").style.color = rar.color;
    $("#rv-emoji").textContent = r.emoji;
    $("#rv-emoji").style.filter = "drop-shadow(0 0 28px " + hexA(rar.color, 0.85) + ")";
    $("#rv-name").textContent = r.name;
    const mutEl = $("#rv-mut");
    if (r.mut) {
      mutEl.classList.remove("hidden");
      mutEl.textContent = "✦ " + r.mut.name + " ×" + r.mut.mult;
      mutEl.style.color = r.mut.color;
      mutEl.style.borderColor = r.mut.color;
    } else mutEl.classList.add("hidden");

    $("#rv-quote").textContent = "«" + (r.raw.q || "") + "»";
    const labels = ["МОЩЬ", "СКОР", "ДАЛЬН", "ТОЧН", "ПОТЕН"];
    $("#rv-stats").innerHTML = r.raw.st.map(function (v, i) {
      return '<div class="rv-stat"><b>' + v + "</b><small>" + labels[i] + "</small></div>";
    }).join("");
    $("#rv-power").textContent = G.fmt(r.power);
    $("#rv-counter").textContent = count > 1 ? "лучший из " + count : "";

    $("#reveal").classList.remove("hidden");
    revealOpen = true;
    SND.reveal(r.tier);
  }

  function closeReveal() {
    $("#reveal").classList.add("hidden");
    revealOpen = false;
  }

  /* ================= ИНДЕКС ================= */
  function renderIndex() {
    const box = $("#index-filter");
    if (!box.dataset.built) {
      let html = '<button class="filter on" data-f="-1">ВСЕ</button>';
      D.RAR.forEach(function (r, i) {
        html += '<button class="filter" data-f="' + i + '" style="border-color:' + hexA(r.color, .5) + '">' + r.name + "</button>";
      });
      box.innerHTML = html;
      box.dataset.built = "1";
      box.addEventListener("click", function (e) {
        const b = e.target.closest(".filter");
        if (!b) return;
        idxFilter = +b.dataset.f;
        $$(".filter", box).forEach(function (x) { x.classList.toggle("on", x === b); });
        renderIndex();
      });
    }

    const grid = $("#index-grid");
    let html = "";
    const st = G.state;
    D.ENT.forEach(function (bucket, t) {
      if (idxFilter >= 0 && t !== idxFilter) return;
      const rar = D.RAR[t];
      bucket.forEach(function (ent, i) {
        const id = D.idOf(t, i);
        const cnt = st.index[id] || 0;
        const locked = !cnt;
        html += '<div class="idx' + (locked ? " locked" : "") + '" data-id="' + id + '" style="border-color:' + hexA(rar.color, locked ? .15 : .5) + '">' +
          '<div class="i-rar" style="background:' + rar.color + '"></div>' +
          '<div class="i-emoji">' + (locked ? "❔" : ent.e) + "</div>" +
          '<div class="i-name">' + (locked ? "???" : esc(ent.n)) + "</div>" +
          (cnt > 1 ? '<div class="i-cnt">×' + cnt + "</div>" : "") +
          "</div>";
      });
    });
    grid.innerHTML = html;

    const found = Object.keys(st.index).length;
    $("#index-count").textContent = found + " / " + D.total;
    $("#index-fill").style.width = ((found / D.total) * 100).toFixed(1) + "%";

    grid.onclick = function (e) {
      const c = e.target.closest(".idx");
      if (!c) return;
      const ent = D.entById(c.dataset.id);
      if (!ent) return;
      const cnt = st.index[c.dataset.id] || 0;
      if (!cnt) { toast("Ещё не найден. Крути стрелу.", "bad"); return; }
      toast(ent.raw.e + " " + ent.raw.n + " · " + ent.rar.name + " · найдено ×" + cnt, "rare", 2800);
    };
  }

  /* ================= МАГАЗИН ================= */
  function renderShop() {
    const st = G.state;
    $("#shop-sp").textContent = G.fmt(st.sp) + " 🌀";
    $("#shop-list").innerHTML = D.UPGRADES.map(function (u) {
      const lvl = st.up[u.key] || 0;
      const max = lvl >= u.max;
      const cost = G.upCost(u.key);
      const can = !max && st.sp >= cost;
      return '<div class="shop-item">' +
        '<div class="shop-ico">' + u.ico + "</div>" +
        '<div class="shop-body"><div class="shop-name">' + u.name + "</div>" +
        '<div class="shop-desc">' + u.desc + "</div>" +
        '<div class="shop-lvl">Уровень ' + lvl + " / " + u.max + "</div></div>" +
        '<button class="buy' + (max ? " max" : "") + '" data-up="' + u.key + '"' + (!can ? " disabled" : "") + ">" +
        (max ? "MAX" : G.fmt(cost) + " 🌀") + "</button></div>";
    }).join("");
  }

  function renderPrestige() {
    const gain = G.prestigeGain();
    $("#prestige-reward").textContent = "+" + G.fmt(gain) + " ☄️";
    $("#prestige-desc").textContent = G.state.best
      ? "Лучший стенд: " + G.fmt(G.state.best.power) + " силы. Нужно " + G.fmt(G.PRESTIGE_MIN) + "+. Сброс: Спин, улучшения, арена, лучший стенд. Индекс и достижения остаются."
      : "Найди стенд силой " + G.fmt(G.PRESTIGE_MIN) + "+, чтобы переродиться.";
    $("#prestige-btn").disabled = gain <= 0;
    $("#prestige-btn").textContent = gain > 0 ? "ПЕРЕРОЖДЕНИЕ (+" + G.fmt(gain) + " ☄️)" : "НУЖНО " + G.fmt(G.PRESTIGE_MIN) + " СИЛЫ";
  }

  function renderTree() {
    const st = G.state;
    $("#tree-hv").textContent = G.fmt(st.hv) + " ☄️";
    $("#tree-list").innerHTML = D.TREE.map(function (t) {
      const lvl = st.tree[t.key] || 0;
      const max = lvl >= t.max;
      const cost = G.treeCost(t.key);
      const can = !max && st.hv >= cost;
      return '<div class="shop-item">' +
        '<div class="shop-ico" style="background:rgba(53,224,255,.12)">' + t.ico + "</div>" +
        '<div class="shop-body"><div class="shop-name">' + t.name + "</div>" +
        '<div class="shop-desc">' + t.desc + "</div>" +
        '<div class="shop-lvl">Уровень ' + lvl + " / " + t.max + "</div></div>" +
        '<button class="buy' + (max ? " max" : "") + '" data-tree="' + t.key + '"' + (!can ? " disabled" : "") + ">" +
        (max ? "MAX" : G.fmt(cost) + " ☄️") + "</button></div>";
    }).join("");
  }

  /* ==== PART2 ==== */
  /* ================= АРЕНА ================= */
  function renderArena() {
    const b = G.bossInfo();
    $("#arena-stage").textContent = b.end ? "Бесконечный режим · " + b.stage : "Этап " + b.stage + " / " + D.BOSSES.length;
    $("#boss-card").innerHTML =
      '<div class="boss-emoji">' + b.emoji + "</div>" +
      '<div class="boss-body"><div class="boss-name">' + esc(b.name) + "</div>" +
      '<div class="hp-bar"><div id="boss-hp" style="width:100%"></div></div>' +
      '<div class="boss-hp-text" id="boss-hp-text">' + G.fmt(b.hp) + " HP · нужно ~" + G.fmt(b.req) + " силы</div></div>";
    const btn = $("#fight-btn");
    btn.disabled = !G.state.best;
    btn.textContent = G.state.best ? "В БОЙ (сила " + G.fmt(G.state.best.power) + ")" : "СНАЧАЛА НАЙДИ СТЕНД";
  }

  function fight() {
    if (battleTimer) return;
    const r = G.startBattle();
    if (!r.ok) { toast(r.msg, "bad"); SND.error(); return; }
    const log = $("#battle-log");
    log.innerHTML = "";
    $("#fight-btn").disabled = true;
    SND.click();
    let guard = 0;
    let shown = 0;

    battleTimer = setInterval(function () {
      const b = G.battleStep();
      if (!b) { clearInterval(battleTimer); battleTimer = null; return; }
      const hpEl = $("#boss-hp");
      if (hpEl) hpEl.style.width = ((b.hp / b.boss.maxHp) * 100).toFixed(1) + "%";
      const txt = $("#boss-hp-text");
      if (txt) txt.textContent = G.fmt(b.hp) + " / " + G.fmt(b.boss.maxHp);

      // рисуем все новые строки боя, а не только последнюю
      let crit = false;
      for (; shown < b.log.length; shown++) {
        const e = b.log[shown];
        let line = "";
        if (e.t === "hit") line = '<div class="' + (e.crit ? "crit" : "") + '">' + (e.crit ? "КРИТ! " : "") + "Ты наносишь " + G.fmt(e.v) + "</div>";
        else if (e.t === "hurt") line = '<div style="color:#ff8a8a">Ответ: −' + G.fmt(e.v) + " стойкости</div>";
        else if (e.t === "win") line = '<div class="win">Победа! +' + G.fmt(e.v) + " 🌀</div>";
        else if (e.t === "lose") line = '<div class="lose">Поражение. Стойкость на нуле.</div>';
        log.insertAdjacentHTML("beforeend", line);
        if (e.crit) crit = true;
      }
      if (crit) SND.tone(320, 0.1, "square", 0.06, 160);
      log.scrollTop = log.scrollHeight;

      if (b.over) {
        clearInterval(battleTimer);
        battleTimer = null;
        $("#fight-btn").disabled = false;
        if (b.win) {
          SND.coin();
          toast("Победа над " + b.boss.name + "! +" + G.fmt(b.boss.reward) + " 🌀", "good");
          setTimeout(renderArena, 300);
        } else {
          SND.error();
          toast("Не хватило силы. Прокачай удачу и мутации.", "bad");
          setTimeout(renderArena, 900);
        }
        renderTop(); renderStats(); renderAch(); renderBest();
        return;
      }
      if (guard++ > 120) { clearInterval(battleTimer); battleTimer = null; $("#fight-btn").disabled = false; }
    }, 380);
  }

  function renderStats() {
    const s = G.state, st = s.stats;
    const mins = Math.floor(st.playtime / 60);
    const rows = [
      ["Роллов", G.fmt(st.rolls)],
      ["Мутаций", G.fmt(st.mutations)],
      ["Побед на арене", G.fmt(st.wins)],
      ["Побед в дуэлях", G.fmt(st.duels)],
      ["Лучшая сила", s.best ? G.fmt(s.best.power) : "—"],
      ["Всего Спина", G.fmt(st.totalSp)],
      ["Престижей", G.fmt(s.prestige)],
      ["В игре", mins + " мин"]
    ];
    $("#stats-grid").innerHTML = rows.map(function (r) {
      return '<div class="st-row"><span>' + r[0] + "</span><b>" + r[1] + "</b></div>";
    }).join("");
  }

  function renderAch() {
    const st = G.state;
    const unlocked = Object.keys(st.ach).length;
    $("#ach-count").textContent = unlocked + " / " + D.ACH.length;
    $("#ach-list").innerHTML = D.ACH.map(function (a) {
      const on = !!st.ach[a.id];
      return '<div class="ach ' + (on ? "unlocked" : "locked") + '">' +
        '<div class="a-ico">' + (on ? a.ico : "🔒") + "</div>" +
        '<div class="a-body"><div class="a-name">' + esc(a.name) + "</div>" +
        '<div class="a-desc">' + esc(a.desc) + "</div></div></div>";
    }).join("");
  }

  /* ================= ОНЛАЙН ================= */
  function renderOnline() {
    const status = net.status;
    const label = status === "online" ? "онлайн · " + net.code
      : status === "connecting" ? "подключение…"
        : status === "error" ? "ошибка" : "офлайн";
    $("#net-status").textContent = label;
    $("#net-status").style.color = status === "online" ? "#3ddc84" : status === "error" ? "#ff3b3b" : "";

    $("#net-offline").classList.toggle("hidden", status === "online");
    $("#net-online").classList.toggle("hidden", status !== "online");
    $("#chat-panel").classList.toggle("hidden", status !== "online");
    $("#netfeed-panel").classList.toggle("hidden", status !== "online");
    $("#raid-panel-wrap").classList.toggle("hidden", status !== "online");
    $("#net-err").textContent = net.lastErr || "";

    if (status === "online") {
      $("#room-code").textContent = net.code;
      renderPlayers();
      renderChat();
      renderNetFeed();
      renderRaid();
    }
  }

  function renderPlayers() {
    const list = net.roster().sort(function (a, b) { return (b.power || 0) - (a.power || 0); });
    $("#player-count").textContent = list.length;
    $("#players").innerHTML = list.map(function (p) {
      const isMe = p.id === net.myId;
      const v = isMe ? Object.assign({}, p, net.me()) : p;   // свои данные всегда свежие
      const rar = v.tier >= 0 ? D.RAR[v.tier] : null;
      return '<div class="player">' +
        '<span class="p-dot"' + (p.host ? ' style="background:#f5c542;box-shadow:0 0 8px #f5c542"' : "") + "></span>" +
        '<span class="p-name">' + esc(v.nick) + (p.host ? " 👑" : "") + (isMe ? " (ты)" : "") + "</span>" +
        '<span class="p-best" style="color:' + (rar ? rar.color : "#8b83a8") + '">' + esc(v.best || "—") + "</span>" +
        (isMe ? "" : '<button class="p-duel" data-duel="' + p.id + '">ДУЭЛЬ</button>') +
        "</div>";
    }).join("");
  }

  function renderChat() {
    const box = $("#chat-log");
    box.innerHTML = net.chat.map(function (m) {
      if (m.sys) return '<div class="chat-msg sys">' + esc(m.text) + "</div>";
      return '<div class="chat-msg' + (m.mine ? " me" : "") + '"><span class="nick">' + esc(m.nick) + ":</span>" + esc(m.text) + "</div>";
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  function renderNetFeed() {
    const box = $("#net-feed");
    if (!net.feed.length) { box.innerHTML = '<div class="feed-empty">Ждём роллы других игроков…</div>'; return; }
    box.innerHTML = net.feed.slice(0, 15).map(function (f) {
      const rar = D.RAR[f.tier] || D.RAR[0];
      return '<div class="feed-row" style="border-left-color:' + rar.color + '">' +
        '<span class="fr-emoji">' + f.emoji + "</span>" +
        '<span class="fr-name"><b style="color:#f5c542">' + esc(f.nick || "") + "</b> · " + esc(f.name) +
        (f.mut ? " ✦" : "") + "</span>" +
        '<span class="fr-rar" style="background:' + hexA(rar.color, .16) + ";color:" + rar.color + '">' + rar.name + "</span>" +
        '<span class="fr-pow">' + G.fmt(f.power) + "</span></div>";
    }).join("");
  }

  function renderRaid() {
    const r = net.raid;
    if (!r) return;
    $("#raid-lvl").textContent = "Lv." + r.lvl;
    $("#raid-name").textContent = r.name;
    $("#raid-hp").style.width = ((r.hp / r.maxHp) * 100).toFixed(1) + "%";
    $("#raid-hp-text").textContent = G.fmt(r.hp) + " / " + G.fmt(r.maxHp);
  }

  /* ================= МОДАЛ / НАСТРОЙКИ ================= */
  function openModal(title, html) {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $("#modal").classList.remove("hidden");
    return $("#modal-body");
  }
  function closeModal() { $("#modal").classList.add("hidden"); }

  function showSettings() {
    const s = G.state;
    const body = openModal("Настройки",
      '<div class="modal-row"><span>Звук</span><button class="switch ' + (s.settings.sound ? "on" : "") + '" data-set="sound"></button></div>' +
      '<div class="modal-row"><span>Эффекты и тряска</span><button class="switch ' + (s.settings.fx ? "on" : "") + '" data-set="fx"></button></div>' +
      '<div class="modal-row"><span>Турбо-режим (без анимаций)</span><button class="switch ' + (s.settings.fast ? "on" : "") + '" data-set="fast"></button></div>' +
      '<div class="modal-row"><span>Ник</span><input class="text-input lower" id="nick-input" style="max-width:150px;padding:7px 10px" value="' + esc(s.nick) + '"></div>' +
      '<div style="margin-top:12px;font-size:11px;color:#8b83a8">Сохранение</div>' +
      '<textarea class="save-area" id="save-out" readonly>' + esc(G.exportSave()) + "</textarea>" +
      '<button class="wide-btn ghost slim" id="copy-save" style="margin-top:6px">СКОПИРОВАТЬ СОХРАНЕНИЕ</button>' +
      '<textarea class="save-area" id="save-in" placeholder="Вставь сохранение сюда и нажми «Загрузить»"></textarea>' +
      '<button class="wide-btn ghost slim" id="load-save" style="margin-top:6px">ЗАГРУЗИТЬ СОХРАНЕНИЕ</button>' +
      '<button class="wide-btn danger" id="reset-all" style="margin-top:12px">ПОЛНЫЙ СБРОС</button>' +
      '<p class="muted" style="margin-top:14px">JOJO RNG — фанатская игра. JoJo\'s Bizarre Adventure © Hirohiko Araki / Shueisha. Все имена использованы как отсылки, проект некоммерческий.</p>');

    body.addEventListener("click", function (e) {
      const sw = e.target.closest("[data-set]");
      if (sw) {
        const k = sw.dataset.set;
        s.settings[k] = !s.settings[k];
        sw.classList.toggle("on", s.settings[k]);
        G.save(true); SND.click(); syncToggles();
      }
    });
    $("#nick-input").addEventListener("change", function () {
      s.nick = (this.value || "Игрок").slice(0, 18);
      G.save(true); toast("Ник сохранён");
    });
    $("#copy-save").addEventListener("click", function () {
      const t = $("#save-out");
      t.select();
      try { document.execCommand("copy"); toast("Сохранение скопировано", "good"); }
      catch (err) { toast("Выдели и скопируй вручную", "bad"); }
    });
    $("#load-save").addEventListener("click", function () {
      const v = $("#save-in").value.trim();
      if (!v) { toast("Пусто", "bad"); return; }
      if (G.importSave(v)) { toast("Сохранение загружено", "good"); closeModal(); renderAll(); }
      else toast("Не удалось прочитать сохранение", "bad");
    });
    $("#reset-all").addEventListener("click", function () {
      if (confirm("Удалить весь прогресс? Это необратимо.")) {
        G.hardReset(); closeModal(); renderAll(); toast("Прогресс сброшен");
      }
    });
  }

  function showWelcome() {
    openModal("Добро пожаловать",
      '<p>Это <b>JOJO RNG</b> — крути Стрелу и собирай стенды восьми частей.</p>' +
      '<p class="muted">• Каждый ролл даёт Спин. Спин — на улучшения.<br>' +
      '• Мутации умножают силу: от «Заряжен Хамоном» до «Сделано в Раю».<br>' +
      '• Индекс — 137 сущностей. Престиж — постоянные бонусы.<br>' +
      '• Онлайн — комнаты по коду, чат, дуэли и рейд без сервера.</p>' +
      '<button class="wide-btn" id="welcome-ok" style="margin-top:8px">НАЧАТЬ</button>');
    $("#welcome-ok").addEventListener("click", function () {
      try { localStorage.setItem("jojorng.welcomed", "1"); } catch (e) { /* приватный режим */ }
      closeModal();
    });
  }

  function syncToggles() {
    const s = G.state.settings;
    $("#auto-toggle").classList.toggle("on", !!G.state.auto);
    $("#fast-toggle").classList.toggle("on", !!s.fast);
  }

  /* ================= ХЕЛПЕРЫ ================= */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function hexA(hex, a) {
    let h = String(hex || "#ffffff").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ================= СОБЫТИЯ ================= */
  function bindEvents() {
    $$(".nav-btn").forEach(function (b) {
      b.addEventListener("click", function () { SND.click(); switchScreen(b.dataset.screen); });
    });

    $("#roll-btn").addEventListener("click", function () {
      SND.ac();
      doRoll(false);
    });

    $("#multi-btn").addEventListener("click", function () {
      SND.ac(); doRoll(true);
    });

    $("#auto-toggle").addEventListener("click", function () {
      const s = G.state;
      if (!G.C.canAuto()) {
        toast("Купи «Авто-Спин» в магазине", "bad");
        switchScreen("shop");
        return;
      }
      s.auto = !s.auto;
      $("#auto-toggle").classList.toggle("on", s.auto);
      toast(s.auto ? "Авто-спин включён" : "Авто-спин выключен");
      G.save(true);
    });

    $("#fast-toggle").addEventListener("click", function () {
      G.state.settings.fast = !G.state.settings.fast;
      $("#fast-toggle").classList.toggle("on", G.state.settings.fast);
      toast(G.state.settings.fast ? "Турбо: без анимаций" : "Анимации включены");
      G.save(true);
    });

    $("#clear-feed").addEventListener("click", function () {
      G.state.feed = [];
      renderFeed();
    });

    $("#quest-list").addEventListener("click", function (e) {
      const b = e.target.closest("[data-claim]");
      if (!b) return;
      const r = G.claimQuest(+b.dataset.claim);
      if (r.ok) { SND.coin(); toast(r.msg, "good"); renderQuests(); renderTop(); }
      else { SND.error(); toast(r.msg, "bad"); }
    });

    $("#shop-list").addEventListener("click", function (e) {
      const b = e.target.closest("[data-up]");
      if (!b) return;
      const r = G.buyUpgrade(b.dataset.up);
      if (r.ok) { SND.coin(); toast(r.msg, "good"); renderShop(); renderTop(); }
      else { SND.error(); toast(r.msg, "bad"); }
    });

    $("#tree-list").addEventListener("click", function (e) {
      const b = e.target.closest("[data-tree]");
      if (!b) return;
      const r = G.buyTree(b.dataset.tree);
      if (r.ok) { SND.coin(); toast(r.msg, "good"); renderTree(); renderTop(); }
      else { SND.error(); toast(r.msg, "bad"); }
    });

    $("#prestige-btn").addEventListener("click", function () {
      const gain = G.prestigeGain();
      if (gain <= 0) return;
      if (!confirm("Перерождение: сбросит Спин, улучшения, арену и лучший стенд. Получишь " + gain + " ☄️. Продолжить?")) return;
      const r = G.doPrestige();
      if (r.ok) {
        toast("Made in Heaven! +" + G.fmt(r.gain) + " ☄️", "rare", 3200);
        SND.reveal(9);
        timeFreeze(900);
        renderAll();
      }
    });

    $("#fight-btn").addEventListener("click", function () { SND.ac(); fight(); });

    $("#host-btn").addEventListener("click", function () {
      SND.ac();
      net.host();
      toast("Создаю комнату…");
    });

    $("#join-btn").addEventListener("click", function () {
      SND.ac();
      const code = $("#join-code").value.trim().toUpperCase();
      if (code.length < 4) { SND.error(); toast("Введи код комнаты", "bad"); return; }
      net.join(code);
      toast("Подключаюсь к " + code + "…");
    });

    $("#join-code").addEventListener("keydown", function (e) {
      if (e.key === "Enter") $("#join-btn").click();
    });

    $("#leave-room").addEventListener("click", function () {
      net.leave(); renderOnline(); toast("Вышел из комнаты");
    });

    $("#copy-code").addEventListener("click", function () {
      const code = net.code;
      if (!code) return;
      try {
        navigator.clipboard.writeText(code);
        toast("Код скопирован: " + code, "good");
      } catch (e) { toast("Код: " + code); }
    });

    $("#players").addEventListener("click", function (e) {
      const b = e.target.closest("[data-duel]");
      if (!b) return;
      if (!G.state.best) { toast("Сначала найди стенд", "bad"); return; }
      net.challenge(b.dataset.duel);
      toast("Вызов отправлен…");
      SND.click();
    });

    $("#chat-send").addEventListener("click", sendChatInput);
    $("#chat-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendChatInput();
    });

    $("#raid-attack").addEventListener("click", function () {
      const r = net.attackRaid();
      if (!r.ok) { toast(r.msg, "bad"); return; }
      SND.tone(r.crit ? 420 : 260, 0.09, "square", 0.07, 140);
      toast((r.crit ? "КРИТ! " : "") + G.fmt(r.dmg) + " урона", r.crit ? "good" : "", 1200);
    });

    $("#btn-settings").addEventListener("click", function () { SND.click(); showSettings(); });
    $("#modal-close").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", function (e) { if (e.target.id === "modal") closeModal(); });

    $("#rv-continue").addEventListener("click", function () { SND.click(); closeReveal(); });
    $("#reveal").addEventListener("click", function (e) {
      if (e.target.id === "reveal" || e.target.classList.contains("speedlines")) closeReveal();
    });

    document.addEventListener("keydown", function (e) {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.code === "Space" && !typing && !revealOpen && $("#modal").classList.contains("hidden")) {
        e.preventDefault();
        doRoll(false);
      }
      if (e.key === "Escape") { closeReveal(); closeModal(); }
    });

    /* --- сетевые события --- */
    bus.on("net:status", function () { renderOnline(); });
    bus.on("net:hosted", function (code) {
      toast("Комната создана: " + code, "good", 4000);
      renderOnline();
    });
    bus.on("net:roster", function () { renderPlayers(); renderOnline(); });
    bus.on("net:chat", function () { renderChat(); });
    bus.on("net:feed", function (f) {
      renderNetFeed();
      if (f && f.tier >= 7) toast(f.nick + " поймал " + f.name + "!", "rare", 3500);
    });
    bus.on("net:raid", function () { renderRaid(); });
    bus.on("net:raidkill", function (o) {
      toast("Рейд Lv." + o.lvl + " закрыт! +" + G.fmt(o.reward) + " 🌀", "good", 3500);
      renderTop(); SND.coin();
    });
    bus.on("net:duel", function (d) {
      if (d.iWin) {
        SND.coin();
        toast("Дуэль выиграна против " + d.opp + " (" + d.score + ")" + (d.bonus ? " +" + G.fmt(d.bonus) + " 🌀" : ""), "good", 4000);
      } else {
        SND.error();
        toast("Дуэль проиграна: " + d.opp + " (" + d.score + ")", "bad", 4000);
      }
      renderTop(); renderStats();
    });
    bus.on("achievements", function (list) {
      list.forEach(function (x) {
        toast("🏆 " + x.a.name + " · +" + G.fmt(x.rew) + " 🌀", "rare", 4000);
      });
      renderAch();
    });
    bus.on("prestige", function (gain) {
      toast("Made in Heaven: +" + G.fmt(gain) + " ☄️", "rare", 4000);
    });
    bus.on("saved", function () {});
  }

  function sendChatInput() {
    const el = $("#chat-input");
    const v = el.value.trim();
    if (!v) return;
    if (net.status !== "online") { toast("Ты не в комнате", "bad"); return; }
    net.sendChat(v);
    el.value = "";
  }

  /* ================= RENDER ALL + BOOT ================= */
  function renderAll() {
    renderTop();
    renderBest();
    renderFeed();
    renderQuests();
    renderIdxSafe();
    renderShop();
    renderPrestige();
    renderTree();
    renderArena();
    renderStats();
    renderAch();
    renderOnline();
    syncToggles();
    $("#multi-btn").textContent = "×" + G.C.multiCount();
    $("#fast-toggle").classList.toggle("on", G.state.settings.fast);
    $("#auto-toggle").classList.toggle("on", G.state.auto);
    $("#auto-toggle").classList.toggle("locked", !G.C.canAuto());
  }
  function renderIdxSafe() {
    if ($("#screen-index").classList.contains("active")) renderIndex();
    else {
      const found = Object.keys(G.state.index).length;
      $("#index-count").textContent = found + " / " + D.total;
      $("#index-fill").style.width = ((found / D.total) * 100).toFixed(1) + "%";
    }
  }

  function autoLoop() {
    setInterval(function () {
      renderTop();
      if (G.state.auto && canRoll() && net.status !== "connecting") {
        if (Date.now() - lastAuto > 250) { lastAuto = Date.now(); doRoll(false, true); }
      }
    }, 250);
  }

  function boot() {
    G.init();
    bindEvents();
    renderAll();
    cdLoop();
    autoLoop();
    let welcomed = "1";
    try { welcomed = localStorage.getItem("jojorng.welcomed") || ""; } catch (e) { welcomed = "1"; }
    if (!welcomed) setTimeout(showWelcome, 400);
    document.addEventListener("visibilitychange", function () { if (document.hidden) G.save(true); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
