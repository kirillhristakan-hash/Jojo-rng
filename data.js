/* ============================================================
   JOJO RNG — data.js
   Контент: редкости, сущности, мутации, боссы, ачивки, задания,
   улучшения и Древо Небес.
   ============================================================ */
window.JR = window.JR || {};

(function () {
  "use strict";

  /* ---------------- РЕДКОСТИ ----------------
     weight  — базовый вес (чем меньше, тем реже)
     income  — сколько Спина даёт один ролл
     power   — базовый множитель силы
     tier    — порядковый номер (для фильтров/гарантий)
  ------------------------------------------- */
  const RAR = [
    { tier: 0, key: "civil",   name: "ГРАЖДАНСКИЙ",  chance: "1 / 1.2",        weight: 1000,     color: "#9a93b5", income: 1,     power: 1,      glow: "rgba(154,147,181,.35)" },
    { tier: 1, key: "hamon",   name: "ХАМОН",        chance: "1 / 10",         weight: 120,      color: "#f5d76e", income: 2,     power: 3,      glow: "rgba(245,215,110,.4)" },
    { tier: 2, key: "stand",   name: "СТЕНД-ЮЗЕР",   chance: "1 / 41",         weight: 28,       color: "#7ee787", income: 4,     power: 8,      glow: "rgba(126,231,135,.4)" },
    { tier: 3, key: "vamp",    name: "ВАМПИР",       chance: "1 / 129",        weight: 9,        color: "#ff6b6b", income: 9,     power: 20,     glow: "rgba(255,107,107,.45)" },
    { tier: 4, key: "pillar",  name: "СТОЛП",        chance: "1 / 390",        weight: 3,        color: "#c084fc", income: 20,    power: 45,     glow: "rgba(192,132,252,.45)" },
    { tier: 5, key: "master",  name: "МАСТЕР СТЕНДА",chance: "1 / 1 300",      weight: 0.9,      color: "#60a5fa", income: 45,    power: 120,    glow: "rgba(96,165,250,.5)" },
    { tier: 6, key: "requiem", name: "РЕКВИЕМ",      chance: "1 / 4 100",      weight: 0.28,     color: "#f472b6", income: 110,   power: 350,    glow: "rgba(244,114,182,.55)" },
    { tier: 7, key: "heaven",  name: "НЕБЕСНЫЙ",     chance: "1 / 14 500",     weight: 0.08,     color: "#fbbf24", income: 300,   power: 900,    glow: "rgba(251,191,36,.6)" },
    { tier: 8, key: "absolute",name: "АБСОЛЮТ",      chance: "1 / 58 000",     weight: 0.02,     color: "#ff8a3b", income: 900,   power: 2600,   glow: "rgba(255,138,59,.65)" },
    { tier: 9, key: "infinite",name: "БЕСКОНЕЧНЫЙ",  chance: "1 / 232 000",    weight: 0.005,    color: "#35e0ff", income: 3000,  power: 8000,   glow: "rgba(53,224,255,.7)" },
    { tier: 10,key: "beyond",  name: "ЗА ГРАНЬЮ",    chance: "1 / 1 160 000",  weight: 0.001,    color: "#ff2e88", income: 12000, power: 30000,  glow: "rgba(255,46,136,.8)" },
    { tier: 11,key: "heavenmade",name:"СДЕЛАНО В РАЮ",chance:"1 / 7 700 000",  weight: 0.00015,  color: "#ffffff", income: 60000, power: 120000, glow: "rgba(255,255,255,.9)" }
  ];

  /* ---------------- СУЩНОСТИ ----------------
     E(name, power, speed, range, precision, potential, emoji, quote, color)
     Статы: A..E как в манге.
  ------------------------------------------- */
  function E(n, p, s, r, pr, po, e, q, c) {
    return { n: n, st: [p, s, r, pr, po], e: e, q: q, c: c };
  }

  const ENT = [
    /* ---- 0: ГРАЖДАНСКИЕ ---- */
    [
      E("Прохожий", "E", "E", "E", "E", "E", "🚶", "Просто шёл мимо. Правда.", "#9a93b5"),
      E("Школьник Морио", "E", "E", "E", "E", "D", "🎒", "У него ещё вся жизнь впереди."),
      E("Продавец рыбы", "E", "E", "E", "D", "E", "🐟", "Свежая рыба! Свежая!", "#8ab4a0"),
      E("Турист из Венеции", "E", "E", "E", "E", "D", "🎭", "Он просто хотел фото с голубем."),
      E("Офисный клерк", "E", "E", "E", "D", "E", "💼", "Печатает быстрее, чем ты крутишь."),
      E("Уличный музыкант", "E", "D", "E", "D", "D", "🎷", "Играет джаз. Никто не слушает."),
      E("Полицейский Морио", "D", "D", "D", "D", "E", "👮", "«Стенды? Вы перегрелись, гражданин»."),
      E("Собака Дэнни", "D", "D", "E", "D", "D", "🐕", "Хороший мальчик. Плохая судьба.", "#c8a06a")
    ],
    /* ---- 1: ХАМОН ---- */
    [
      E("Джонатан Джостар", "B", "C", "D", "C", "A", "🎩", "«Я не позволю злу победить!»", "#7ea6ff"),
      E("Уилл Зеппели", "C", "B", "D", "B", "B", "🎓", "«Твоё следующее слово — Хамон!»"),
      E("Цезарь Цеппели", "C", "B", "C", "B", "B", "🫧", "«Пузыри! Настоящие пузыри!»", "#9fe8ff"),
      E("Лиза Лиза", "C", "B", "C", "A", "B", "🧣", "«Дыши. Или умри»."),
      E("Джозеф Джостар", "C", "B", "D", "A", "A", "🧤", "«Твой следующий ход я предсказал!»"),
      E("Дайер", "D", "C", "D", "C", "C", "💇", "Разрезал на дюжину частей. Себя."),
      E("Страйзо", "C", "C", "D", "C", "C", "🥋", "Хамон-мастер сомнительной морали."),
      E("Тонпетти", "C", "D", "C", "B", "C", "🧘", "Тридцать лет медитации ради одного удара."),
      E("Мессина", "C", "C", "D", "C", "D", "🪖", "Военная выправка, хамон в кулаке."),
      E("Логинс", "C", "C", "D", "D", "D", "🏋️", "Тренирует до потери пульса."),
      E("Sunlight Yellow Overdrive", "B", "A", "D", "C", "B", "☀️", "Передай мне свою энергию!", "#ffe066"),
      E("Хамон-волна", "D", "A", "C", "D", "C", "🌊", "Дыхание, ставшее оружием.", "#ffe9a3")
    ],
    /* ---- 2: СТЕНД-ЮЗЕР ---- */
    [
      E("Hierophant Green", "C", "B", "A", "B", "B", "🟢", "Emerald Splash!", "#5ee09a"),
      E("Magician's Red", "B", "B", "C", "C", "C", "🔥", "Crossfire Hurricane!", "#ff6b3b"),
      E("Silver Chariot", "B", "A", "D", "B", "C", "⚔️", "Каждое жало — отдельный клинок.", "#c9d6e8"),
      E("Hermit Purple", "D", "C", "A", "C", "B", "🔮", "Фото за секунду до смерти."),
      E("The Fool", "C", "B", "C", "C", "B", "🐕‍🦺", "Песок против всего мира."),
      E("Tower of Gray", "D", "A", "E", "C", "D", "🪰", "Язык быстрее мысли."),
      E("Dark Blue Moon", "C", "C", "C", "C", "D", "🌊", "В воде ему нет равных."),
      E("Strength", "B", "D", "B", "D", "D", "🚢", "Целый корабль — его тело."),
      E("Ebony Devil", "C", "C", "D", "B", "C", "🪆", "Ненависть оживляет куклу."),
      E("Yellow Temperance", "C", "C", "D", "C", "B", "🟡", "Съешь меня — станешь мной."),
      E("Hanged Man", "D", "A", "B", "B", "C", "🪞", "Живёт в отражениях."),
      E("Emperor", "B", "A", "B", "A", "B", "🔫", "Пуля сама найдёт цель.", "#e8d5a3"),
      E("Empress", "D", "C", "D", "C", "C", "🦠", "Кровь на руке — уже приговор."),
      E("Wheel of Fortune", "C", "C", "C", "D", "D", "🚗", "Дорога — его территория."),
      E("Justice", "D", "C", "C", "C", "B", "👁️", "Раны становятся дверями."),
      E("Lovers", "E", "C", "A", "B", "C", "🪲", "Боль в голове — его работа."),
      E("Sun", "B", "D", "A", "D", "D", "🌞", "Палящее солнце в пустыне."),
      E("Death Thirteen", "D", "C", "C", "B", "A", "💀", "Кошмар, из которого не выйти."),
      E("Judgement", "C", "C", "C", "C", "B", "🏺", "Желания исполняются буквально."),
      E("High Priestess", "C", "C", "B", "C", "C", "🦷", "Зубы из твоей же земли."),
      E("Khnum", "D", "D", "E", "B", "C", "🎭", "Лицо — просто наклейка."),
      E("Thoth", "E", "E", "E", "A", "B", "📖", "Всё уже написано. Заранее."),
      E("Beach Boy", "C", "C", "A", "B", "C", "🎣", "Удочка ловит даже души.")
    ],
    /* ---- 3: ВАМПИР ---- */
    [
      E("Дио Брандо", "A", "B", "C", "B", "A", "🧛", "«Ты думал, это конец? Это начало»."),
      E("Vanilla Ice", "A", "B", "C", "C", "B", "⚫", "Круг пустоты. Ничего не останется.", "#b0a8d0"),
      E("Бруфорд", "B", "C", "D", "C", "C", "🗡️", "Рыцарь, предавший солнце."),
      E("Таркус", "A", "D", "E", "D", "D", "🪓", "Гора мышц и злобы."),
      E("Джек Потрошитель", "C", "B", "E", "D", "D", "🔪", "Лондон помнит его нож."),
      E("Ван Чан", "D", "C", "D", "C", "C", "🧪", "Алхимик с каменной маской."),
      E("Дуби", "C", "C", "D", "D", "D", "👅", "Язык длиннее руки."),
      E("Страйзо (вампир)", "B", "C", "D", "C", "C", "🩸", "Отказался от человечности."),
      E("Нукесаку", "D", "D", "D", "D", "D", "🧟", "Полувампир, полностью неудачник."),
      E("Зомби-слуга", "D", "D", "E", "E", "E", "🧟‍♂️", "Их сотни. Они не устают."),
      E("Кровавый фонтан", "C", "D", "D", "C", "D", "🩸", "Реки крови в замке Дио."),
      E("Каменная маска", "D", "D", "E", "C", "A", "🗿", "Снимает границы человечности.")
    ],
    /* ---- 4: СТОЛП ---- */
    [
      E("Карс", "A", "A", "C", "B", "A", "🦅", "Свет стал его пищей.", "#c084fc"),
      E("Эйсидиси", "A", "B", "C", "C", "B", "🔥", "Кипящая кровь бьёт из пальцев.", "#ff7a45"),
      E("Вамму", "A", "A", "C", "B", "B", "🌪️", "Ветер — его оружие и закон.", "#8fe3ff"),
      E("Сантана", "A", "B", "D", "C", "B", "🗿", "Проснулся голодным. Очень."),
      E("Кольцо Вампиров", "B", "C", "C", "C", "C", "💍", "Каменные воины в сборе."),
      E("Режим Ветра", "B", "A", "B", "B", "B", "🌬️", "Дыхание, режущее сталь.", "#9fe8ff"),
      E("Режим Огня", "A", "B", "C", "B", "B", "🔥", "Кипящая кровь — 500 градусов.", "#ff8a5b"),
      E("Режим Света", "A", "A", "B", "B", "A", "💡", "Абсолютная форма жизни.", "#fff3a0"),
      E("Красный камень Эйши", "C", "D", "E", "A", "A", "💎", "Ультимативная сила в оправе.", "#ff5a7a"),
      E("Столп-воин", "B", "B", "D", "C", "C", "🛡️", "Спит под землёй тысячи лет.")
    ],
    /* ---- 5: МАСТЕР СТЕНДА ---- */
    [
      E("The Hand", "A", "B", "D", "C", "B", "✋", "Стирает пространство. И тебя.", "#8b5cff"),
      E("Cream", "A", "B", "C", "C", "B", "🌑", "Внутри — абсолютная тьма.", "#4a3f6b"),
      E("Red Hot Chili Peppers", "B", "A", "B", "B", "B", "⚡", "Электричество в проводах.", "#ff3b3b"),
      E("Aerosmith", "C", "A", "A", "B", "B", "✈️", "Ковёр бомбардировки.", "#7ee787"),
      E("Moody Blues", "D", "C", "A", "A", "B", "🎞️", "Повторяет прошлое.", "#a78bfa"),
      E("Purple Haze", "A", "C", "D", "D", "A", "🟣", "Вирус в кулаке. Осторожно.", "#c084fc"),
      E("Sex Pistols", "C", "A", "B", "A", "B", "⚾", "Шесть пуль с характером.", "#ffd166"),
      E("Sticky Fingers", "B", "B", "C", "B", "B", "🪡", "Молния-застёжка в любом месте.", "#5ee09a"),
      E("Spice Girl", "B", "B", "C", "C", "A", "🍬", "Резина прочнее стали.", "#ff8ab3"),
      E("Stone Free", "B", "A", "B", "B", "A", "🧵", "Нить из собственного тела.", "#7ee7c7"),
      E("Diver Down", "B", "B", "C", "B", "B", "🤿", "Проникает в структуру материи.", "#5eb5ff"),
      E("Echoes ACT3", "B", "B", "C", "C", "A", "🔊", "Три свободных хода. Не больше.", "#9be7ff"),
      E("Heaven's Door", "E", "C", "D", "A", "A", "📖", "Читает тебя, как книгу.", "#f5e6c8"),
      E("Harvest", "D", "A", "A", "A", "B", "🫐", "Пятьсот маленьких воров.", "#a8e06a"),
      E("The Grateful Dead", "C", "B", "C", "C", "A", "🫀", "Старость настигает всех.", "#d8b48c"),
      E("Metallica", "B", "B", "D", "B", "A", "🩸", "Железо из твоей крови.", "#9aa8c8"),
      E("Green Day", "B", "C", "C", "C", "B", "🦠", "Плесень съедает сверху вниз.", "#7ed957"),
      E("Oasis", "A", "B", "C", "C", "B", "🟩", "Плоть превращается в грязь.", "#4fbf6a"),
      E("White Album", "A", "B", "C", "B", "B", "❄️", "Абсолютный ноль вокруг.", "#bde8ff"),
      E("Little Feet", "C", "C", "D", "C", "B", "🐜", "Сжимает до размера ногтя.", "#e0c080"),
      E("Kraft Work", "B", "B", "C", "B", "C", "🔩", "Фиксация движения.", "#c8b8a0"),
      E("Soft Machine", "C", "B", "C", "B", "C", "🎈", "Сдувает плоть.", "#c0d8ff"),
      E("Anubis", "A", "B", "D", "C", "A", "🗡️", "Клинок помнит всех хозяев.", "#d4af37"),
      E("Atum", "C", "C", "C", "A", "B", "🎮", "Читает душу вопросом.", "#ffb3c7"),
      E("Sethan", "D", "C", "D", "B", "A", "👶", "Превращает взрослых в детей.", "#ffd6e0"),
      E("Whitesnake", "B", "B", "C", "B", "A", "🐍", "Крадёт стенды и память.", "#e8e8f0")
    ],
    /* ---- 6: РЕКВИЕМ ---- */
    [
      E("Star Platinum: The World", "A", "A", "C", "A", "A", "⭐", "Остановка времени: 5 секунд — вечность.", "#8b7bff"),
      E("Gold Experience Requiem", "A", "A", "C", "A", "A", "🦋", "Ты никогда не достигнешь истины.", "#ffd166"),
      E("Silver Chariot Requiem", "A", "A", "C", "A", "A", "🕯️", "Обмен душами. Без спроса.", "#cfd8e8"),
      E("Killer Queen: Bites the Dust", "A", "B", "C", "A", "A", "💣", "Третий взрыв запускает день заново.", "#ff7ab8"),
      E("Made in Heaven", "A", "A", "A", "A", "A", "⏩", "Ускорение до конца вселенной.", "#c9a8ff"),
      E("D4C: Love Train", "A", "A", "B", "A", "A", "🇺🇸", "Несчастье уходит в другой мир.", "#7ec8ff"),
      E("Tusk ACT4", "A", "A", "B", "A", "A", "🌀", "Бесконечное вращение в ногте.", "#ffe9a3"),
      E("Soft & Wet: Go Beyond", "A", "A", "C", "A", "A", "🫧", "Пузырь, которого не существует.", "#a8d8ff"),
      E("The World Over Heaven", "A", "A", "B", "A", "A", "🌍", "Переписывает реальность кулаком.", "#d0c0ff"),
      E("Star Platinum Over Heaven", "A", "A", "B", "A", "A", "✨", "ORA с божественным оттенком.", "#ffe066"),
      E("King Crimson", "A", "A", "C", "A", "A", "👑", "Стирает 10 секунд. Ты не заметишь.", "#ff4d6d"),
      E("C-Moon", "A", "B", "B", "A", "A", "🌒", "Гравитация поворачивается вспять.", "#b8c8ff"),
      E("Wonder of U", "A", "A", "A", "A", "A", "☂️", "Погоня за ним — уже несчастье.", "#e8e0ff"),
      E("Ball Breaker", "A", "B", "C", "A", "A", "⚪", "Вращение, ломающее барьеры.", "#f0e6ff"),
      E("Catch the Rainbow", "B", "A", "B", "B", "A", "🌈", "Дождь становится ступенями.", "#9be7ff"),
      E("Weather Report", "A", "A", "B", "B", "A", "⛈️", "Погода по щелчку.", "#8fd8ff"),
      E("Scary Monsters", "A", "B", "C", "B", "A", "🦖", "Динозавры в Венеции.", "#c8d86a"),
      E("Dirty Deeds Done Dirt Cheap", "A", "B", "B", "A", "A", "🚩", "Параллельные миры под рукой.", "#7ea6ff")
    ],
    /* ---- 7: НЕБЕСНЫЙ ---- */
    [
      E("Heaven Ascension DIO", "A", "A", "A", "A", "A", "🕊️", "«Я достиг небес. Ты — нет».", "#e8d8ff"),
      E("Ultimate Kars", "A", "A", "A", "A", "A", "🦅", "Свет, жизнь, всё — его пища.", "#d8b0ff"),
      E("Enrico Pucci", "A", "A", "A", "A", "A", "✝️", "Судьба — это маршрут.", "#d0d0ff"),
      E("Funny Valentine", "A", "A", "A", "A", "A", "🎩", "«Это моя страна. Моя судьба».", "#8fb8ff"),
      E("Tooru", "A", "A", "A", "A", "A", "🕶️", "Логика бессильна против чуда.", "#c8b8ff"),
      E("Giorno Giovanna", "A", "A", "B", "A", "A", "🌟", "«У меня есть мечта».", "#ffd166"),
      E("Johnny Joestar", "A", "A", "B", "A", "A", "🐎", "Ногти, вращение, бесконечность.", "#ffe9a3"),
      E("Jotaro Kujo", "A", "A", "B", "A", "A", "🧢", "Yare yare daze.", "#8b7bff"),
      E("Josuke Higashikata", "A", "A", "B", "A", "A", "💎", "Не смей шутить про его волосы.", "#9be7c7"),
      E("Jolyne Cujoh", "A", "A", "B", "A", "A", "🧵", "Нить, связывающая судьбы.", "#7ee7c7")
    ],
    /* ---- 8: АБСОЛЮТ ---- */
    [
      E("DIO Over Heaven", "A", "A", "A", "A", "A", "🌌", "«Реальность — мой стенд».", "#f0e0ff"),
      E("The World Over Heaven (полный)", "A", "A", "A", "A", "A", "♾️", "Время больше не имеет значения.", "#e8d8ff"),
      E("Gold Experience Requiem (полный)", "A", "A", "A", "A", "A", "🦋", "Ноль — единственный финал.", "#ffdf7e"),
      E("Ultimate Life Form", "A", "A", "A", "A", "A", "🧬", "Эволюция без предела.", "#c8f0ff"),
      E("Made in Heaven (финал)", "A", "A", "A", "A", "A", "⏱️", "Вселенная перезапускается.", "#d8c8ff"),
      E("Стрела, что выбирает", "A", "A", "A", "A", "A", "🏹", "Она решает, кто достоин.", "#ffe066"),
      E("Кровь Джостаров", "A", "A", "A", "A", "A", "🩸", "Вековая вражда в одном ударе.", "#ff7a8a")
    ],
    /* ---- 9: БЕСКОНЕЧНЫЙ ---- */
    [
      E("Бесконечное Вращение", "A", "A", "A", "A", "A", "🌀", "Нет конца. Нет начала.", "#9fe8ff"),
      E("Золотое Сечение", "A", "A", "A", "A", "A", "✨", "Красота, становящаяся силой.", "#ffd166"),
      E("Spin of Infinity", "A", "A", "A", "A", "A", "⚡", "Энергия без источника.", "#a8e8ff"),
      E("Дух ДжоДжо", "A", "A", "A", "A", "A", "🔥", "Он не сдаётся никогда.", "#ffb36b"),
      E("Наследие", "A", "A", "A", "A", "A", "🕰️", "Всё, что осталось после них.", "#e8e0ff")
    ],
    /* ---- 10: ЗА ГРАНЬЮ ---- */
    [
      E("Beyond Heaven", "A", "A", "A", "A", "A", "🌠", "Небо оказалось лишь порогом.", "#ff8ac8"),
      E("Судьба", "A", "A", "A", "A", "A", "🎲", "Она уже брошена. Ты просто не знал.", "#ffd0e8"),
      E("Тот, кто за гранью", "A", "A", "A", "A", "A", "👁️", "Смотрит сквозь страницы.", "#ff5ca8"),
      E("Апофеоз", "A", "A", "A", "A", "A", "🕯️", "Финальная панель истории.", "#ffe0f0")
    ],
    /* ---- 11: СДЕЛАНО В РАЮ ---- */
    [
      E("Made in Heaven: Résumé", "A", "A", "A", "A", "A", "📜", "Ты видел всё. Ты видел себя.", "#ffffff"),
      E("Апофеоз ДжоДжо", "A", "A", "A", "A", "A", "🌌", "Восемь частей. Один удар.", "#ffffff")
    ]
  ];

  /* ---------------- МУТАЦИИ ---------------- */
  const MUT = [
    { key: "hamon",    name: "ЗАРЯЖЕН ХАМОНОМ", mult: 1.7,  weight: 22,   color: "#f5d76e", fx: "spark" },
    { key: "bizarre",  name: "BIZARRE",         mult: 1.25, weight: 26,   color: "#7ee787", fx: "spark" },
    { key: "blood",    name: "КРОВАВЫЙ",        mult: 1.5,  weight: 18,   color: "#ff5a5a", fx: "drip" },
    { key: "emerald",  name: "ИЗУМРУДНЫЙ",      mult: 1.9,  weight: 14,   color: "#3ddc84", fx: "spark" },
    { key: "vampiric", name: "ВАМПИРИЧЕСКИЙ",   mult: 2.1,  weight: 11,   color: "#c0392b", fx: "drip" },
    { key: "phantom",  name: "ФАНТОМ",          mult: 2.4,  weight: 9,    color: "#9b8cff", fx: "ghost" },
    { key: "pillar",   name: "СТОЛП",           mult: 2.8,  weight: 7,    color: "#c084fc", fx: "quake" },
    { key: "awakened", name: "ПРОБУЖДЁННЫЙ",    mult: 3.3,  weight: 6,    color: "#60a5fa", fx: "spark" },
    { key: "lineage",  name: "РОДОСЛОВНАЯ",     mult: 3.8,  weight: 4.5,  color: "#ffd166", fx: "spark" },
    { key: "arrow",    name: "ПРОНЗЁН СТРЕЛОЙ", mult: 4.8,  weight: 3.5,  color: "#b39dff", fx: "ghost" },
    { key: "requiem",  name: "РЕКВИЕМ",         mult: 6.5,  weight: 2.6,  color: "#f472b6", fx: "ghost" },
    { key: "absolute", name: "АБСОЛЮТ",         mult: 8,    weight: 1.8,  color: "#ff8a3b", fx: "quake" },
    { key: "will",     name: "ВОЛЯ НЕБЕС",      mult: 9.5,  weight: 1.3,  color: "#fbbf24", fx: "spark" },
    { key: "goldenspin",name:"ЗОЛОТОЙ СПИН",    mult: 12,   weight: 1.0,  color: "#ffe066", fx: "spin" },
    { key: "eclipse",  name: "ЗАТМЕНИЕ",        mult: 15,   weight: 0.6,  color: "#8b5cff", fx: "ghost" },
    { key: "beyond",   name: "ЗА ГРАНЬЮ",       mult: 20,   weight: 0.35, color: "#ff2e88", fx: "quake" },
    { key: "void",     name: "ПУСТОТА",         mult: 28,   weight: 0.14, color: "#a8c8ff", fx: "ghost" },
    { key: "heaven",   name: "СДЕЛАНО В РАЮ",   mult: 45,   weight: 0.04, color: "#ffffff", fx: "spin" }
  ];
  const MUT_TOTAL = MUT.reduce(function (a, m) { return a + m.weight; }, 0);

  /* ---------------- БОССЫ АРЕНЫ ---------------- */
  const BOSSES = [
    { name: "Уличный хулиган",  e: "🥊", req: 2,      reward: 60,       quote: "Дай монету!" },
    { name: "Джек Потрошитель", e: "🔪", req: 8,      reward: 220,      quote: "Темно. Идеально." },
    { name: "Таркус",           e: "🪓", req: 25,     reward: 800,      quote: "Цепи! Ещё цепи!" },
    { name: "Вамму",            e: "🌪️", req: 90,     reward: 3000,     quote: "Ветер не прощает." },
    { name: "Эйсидиси",         e: "🔥", req: 300,    reward: 11000,    quote: "Кипи, кровь!" },
    { name: "Карс",             e: "🦅", req: 1200,   reward: 42000,    quote: "Я — вершина." },
    { name: "ДИО",              e: "🧛", req: 6000,   reward: 160000,   quote: "ZA WARUDO!" },
    { name: "Ёсикагэ Кира",     e: "💣", req: 30000,  reward: 650000,   quote: "Спокойно. Просто взрыв." },
    { name: "Дьяволо",          e: "👑", req: 150000, reward: 2600000,  quote: "Время идёт только для тебя." },
    { name: "Энрико Пуччи",     e: "✝️", req: 800000, reward: 11000000, quote: "Судьба неизбежна." },
    { name: "Фанни Валентайн",  e: "🇺🇸", req: 4e6,    reward: 48000000, quote: "Это моя страна." },
    { name: "DIO Over Heaven",  e: "🌌", req: 2e7,    reward: 220000000,quote: "Реальность — моя." }
  ];

  /* ---------------- УЛУЧШЕНИЯ ---------------- */
  const UPGRADES = [
    { key: "luck",   name: "Стрела Удачи",     ico: "🏹", base: 120,   growth: 1.38, max: 150, desc: "+12% удачи за уровень" },
    { key: "speed",  name: "Золотой Спин",     ico: "🌀", base: 180,   growth: 1.55, max: 40,  desc: "−4% времени ролла" },
    { key: "income", name: "Дыхание Хамона",   ico: "🫁", base: 250,   growth: 1.42, max: 150, desc: "+22% Спина за ролл" },
    { key: "multi",  name: "Мульти-Стрела",    ico: "🎯", base: 6000,  growth: 3.4,  max: 12,  desc: "+5 к мульти-роллу" },
    { key: "mutch",  name: "Кузня Стрел",      ico: "⚒️", base: 4000,  growth: 2.1,  max: 20,  desc: "+1.1% шанс мутации" },
    { key: "auto",   name: "Авто-Спин",        ico: "🤖", base: 2500,  growth: 1,    max: 1,   desc: "Разблокирует авто-ролл" },
    { key: "dupe",   name: "Обмен Дублей",     ico: "♻️", base: 9000,  growth: 2.4,  max: 10,  desc: "+15% Спина за повторки" },
    { key: "floor",  name: "Контракт Реквиема",ico: "📜", base: 60000, growth: 7,    max: 6,   desc: "+1 к минимальной редкости" }
  ];

  /* ---------------- ДРЕВО НЕБЕС ---------------- */
  const TREE = [
    { key: "t_luck",  name: "Наследие Джостаров", ico: "⭐", base: 1, growth: 1.35, max: 20, desc: "+8% удачи навсегда" },
    { key: "t_income",name: "Вечность",           ico: "♾️", base: 1, growth: 1.35, max: 20, desc: "+12% дохода навсегда" },
    { key: "t_mut",   name: "Стрела Бесконечности",ico:"💫", base: 2, growth: 1.45, max: 12, desc: "+0.4% шанс мутации" },
    { key: "t_power", name: "Кровь ДжоДжо",       ico: "🩸", base: 3, growth: 1.5, max: 15, desc: "+6% силы стенда" }
  ];

  /* ---------------- ДОСТИЖЕНИЯ ---------------- */
  const ACH = [
    { id: "roll1",   name: "Первый укол",        desc: "Сделай 1 ролл",                 ico: "🏹", f: function (s) { return s.stats.rolls >= 1; } },
    { id: "roll100", name: "Сотня попыток",      desc: "Сделай 100 роллов",             ico: "💯", f: function (s) { return s.stats.rolls >= 100; } },
    { id: "roll1k",  name: "Стрела не устала",   desc: "Сделай 1 000 роллов",           ico: "🔥", f: function (s) { return s.stats.rolls >= 1000; } },
    { id: "roll10k", name: "Одержимость",        desc: "Сделай 10 000 роллов",          ico: "🌀", f: function (s) { return s.stats.rolls >= 10000; } },
    { id: "t3",      name: "Первая кровь",       desc: "Получи вампира или выше",       ico: "🩸", f: function (s) { return s.stats.maxTier >= 3; } },
    { id: "t5",      name: "Мастер",             desc: "Получи мастера стенда",         ico: "🎖️", f: function (s) { return s.stats.maxTier >= 5; } },
    { id: "t6",      name: "Реквием",            desc: "Получи Реквием",                ico: "🎼", f: function (s) { return s.stats.maxTier >= 6; } },
    { id: "t7",      name: "Небожитель",         desc: "Получи Небесный ранг",          ico: "☁️", f: function (s) { return s.stats.maxTier >= 7; } },
    { id: "t8",      name: "Абсолют",            desc: "Получи Абсолют",                ico: "💥", f: function (s) { return s.stats.maxTier >= 8; } },
    { id: "t9",      name: "Бесконечность",      desc: "Получи Бесконечный ранг",       ico: "♾️", f: function (s) { return s.stats.maxTier >= 9; } },
    { id: "t10",     name: "За гранью",          desc: "Получи ранг «За гранью»",       ico: "🌌", f: function (s) { return s.stats.maxTier >= 10; } },
    { id: "t11",     name: "Сделано в Раю",      desc: "Получи высший ранг",            ico: "👁️", f: function (s) { return s.stats.maxTier >= 11; } },
    { id: "mut1",    name: "Мутант",             desc: "Получи первую мутацию",         ico: "🧬", f: function (s) { return s.stats.mutations >= 1; } },
    { id: "mut25",   name: "Нестабильная стрела",desc: "Получи 25 мутаций",             ico: "⚗️", f: function (s) { return s.stats.mutations >= 25; } },
    { id: "mut100",  name: "Коллекционер аномалий",desc:"Получи 100 мутаций",           ico: "☣️", f: function (s) { return s.stats.mutations >= 100; } },
    { id: "idx10",   name: "Каталог",            desc: "Открой 10 стендов в индексе",   ico: "📖", f: function (s) { return Object.keys(s.index).length >= 10; } },
    { id: "idx50",   name: "Архивариус",         desc: "Открой 50 стендов",             ico: "📚", f: function (s) { return Object.keys(s.index).length >= 50; } },
    { id: "idx100",  name: "Полный архив",       desc: "Открой 100 стендов",            ico: "🗃️", f: function (s) { return Object.keys(s.index).length >= 100; } },
    { id: "idxAll",  name: "Знаток ДжоДжо",      desc: "Собери весь индекс",            ico: "🏆", f: function (s) { return Object.keys(s.index).length >= JR.D.total; } },
    { id: "p1",      name: "Made in Heaven",     desc: "Соверши первый престиж",        ico: "☄️", f: function (s) { return s.prestige >= 1; } },
    { id: "p5",      name: "Цикл вселенной",     desc: "5 престижей",                   ico: "🌠", f: function (s) { return s.prestige >= 5; } },
    { id: "p15",     name: "Перезапуск реальности",desc:"15 престижей",                 ico: "🌀", f: function (s) { return s.prestige >= 15; } },
    { id: "win1",    name: "Первый раунд",       desc: "Выиграй бой на арене",          ico: "⚔️", f: function (s) { return s.stats.wins >= 1; } },
    { id: "win25",   name: "Гладиатор",          desc: "Выиграй 25 боёв",               ico: "🛡️", f: function (s) { return s.stats.wins >= 25; } },
    { id: "stage6",  name: "Выше Карса",         desc: "Пройди 6 этапов арены",         ico: "🦅", f: function (s) { return s.stage >= 6; } },
    { id: "stage12", name: "За пределами",       desc: "Пройди все 12 этапов арены",    ico: "🌌", f: function (s) { return s.stage >= 12; } },
    { id: "sp1m",    name: "Миллионер",          desc: "Заработай 1 000 000 Спина",     ico: "💰", f: function (s) { return s.stats.totalSp >= 1e6; } },
    { id: "duel1",   name: "Дуэлянт",            desc: "Выиграй онлайн-дуэль",          ico: "🤝", f: function (s) { return s.stats.duels >= 1; } },
    { id: "duel10",  name: "Король арены",       desc: "Выиграй 10 онлайн-дуэлей",      ico: "👑", f: function (s) { return s.stats.duels >= 10; } },
    { id: "raid1",   name: "Рейдер",             desc: "Добей рейдового босса",         ico: "👁️", f: function (s) { return s.stats.raids >= 1; } },
    { id: "online",  name: "Не один",            desc: "Загляни в онлайн-комнату",      ico: "🌐", f: function (s) { return s.stats.onlineVisits >= 1; } },
    { id: "hours",   name: "Настоящий фанат",    desc: "Проведи в игре 1 час",          ico: "⏳", f: function (s) { return s.stats.playtime >= 3600; } }
  ];

  /* ---------------- ШАБЛОНЫ ЗАДАНИЙ ---------------- */
  const QUEST_T = [
    { id: "q_roll",   type: "rolls",  name: "Сделай роллов: {n}",             n: function (l) { return 25 * l; },     rew: function (l) { return 150 * l; } },
    { id: "q_earn",   type: "sp",     name: "Заработай Спина: {n}",           n: function (l) { return 600 * l; },    rew: function (l) { return 200 * l; } },
    { id: "q_tier",   type: "tier",   name: "Получи {n}× ранг {t}",           n: function (l) { return 1 + Math.floor(l / 3); }, rew: function (l) { return 400 * l; } },
    { id: "q_mut",    type: "mut",    name: "Поймай мутаций: {n}",            n: function (l) { return 1 + Math.floor(l / 4); }, rew: function (l) { return 350 * l; } },
    { id: "q_win",    type: "wins",   name: "Побед на арене: {n}",            n: function (l) { return 1 + Math.floor(l / 5); }, rew: function (l) { return 500 * l; } }
  ];

  /* ---------------- СОБИРАЕМ ---------------- */
  const D = {
    RAR: RAR,
    ENT: ENT,
    MUT: MUT,
    MUT_TOTAL: MUT_TOTAL,
    BOSSES: BOSSES,
    UPGRADES: UPGRADES,
    TREE: TREE,
    ACH: ACH,
    QUESTS: QUEST_T,
    total: ENT.reduce(function (a, x) { return a + x.length; }, 0),
    /* утилиты доступа */
    entById: function (id) {
      const parts = String(id).split(":");
      const t = +parts[0], i = +parts[1];
      if (!ENT[t] || !ENT[t][i]) return null;
      return { tier: t, name: ENT[t][i].n, raw: ENT[t][i], rar: RAR[t] };
    },
    idOf: function (tier, idx) { return tier + ":" + idx; }
  };

  JR.D = D;
})();
