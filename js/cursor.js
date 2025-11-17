// js/cursor.js
(() => {
  const root = document.getElementById("cursor");
  if (!root) return;

  const ring = root.querySelector(".c-ring");
  const h = root.querySelector(".c-h"); // barre horizontale
  const v = root.querySelector(".c-v"); // barre verticale

  // === PARAMÈTRES À AJUSTER ===
  const CROSS_T = 0.65; // vitesse croix (↑ = plus direct)
  const RING_T = 0.12; // vitesse cercle (↓ = plus flottant)
  const CLICK_SCALE_DOWN = 0.9;
  const CLICK_SCALE_UP = 1.0;

  // Durées/épaisseur reprises de tes variables CSS
  const css = getComputedStyle(document.documentElement);
  const underlineDurMs = parseTimeMs(
    css.getPropertyValue("--link-underline-speed").trim() || "220ms"
  );
  const underlinePx =
    parseFloat(
      css.getPropertyValue("--link-underline-thickness").trim() || "2"
    ) || 2;

  // Easing 'ease' (cubic-bezier(0.25, 0.1, 0.25, 1))
  const ease = cubicBezier(0.25, 0.1, 0.25, 1);

  // Cible souris
  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;

  // Positions interpolées
  let xCross = tx,
    yCross = ty; // croix
  let xRing = tx,
    yRing = ty; // cercle
  let scale = 1;

  // États
  let overLine = false; // sur a.line
  let mergeTarget = null; // élément <a.line> survolé
  let tLine = 0; // progression anim 0→1
  let dirLine = 0; // +1 expand, -1 collapse, 0 rien
  let prevTime = performance.now();

  // ===== Utils
  const lerp = (a, b, t) => a + (b - a) * t;

  function parseTimeMs(str) {
    const v = (str || "").toLowerCase().trim();
    if (v.endsWith("ms")) return parseFloat(v) || 0;
    if (v.endsWith("s")) return (parseFloat(v) || 0) * 1000;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function cubicBezier(p1x, p1y, p2x, p2y) {
    function sample(t, a1, a2) {
      const omt = 1 - t;
      return 3 * omt * omt * t * a1 + 3 * omt * t * t * a2 + t * t * t;
    }
    function slope(t, a1, a2) {
      return (
        3 * (1 - t) * (1 - t) * a1 +
        6 * (1 - t) * t * (a2 - a1) +
        3 * t * t * (1 - a2)
      );
    }
    function solveTforX(x) {
      let t = x;
      for (let i = 0; i < 5; i++) {
        const xT = sample(t, p1x, p2x) - x;
        if (Math.abs(xT) < 1e-4) break;
        const d = slope(t, p1x, p2x);
        if (Math.abs(d) < 1e-6) break;
        t -= xT / d;
        t = Math.max(0, Math.min(1, t));
      }
      return t;
    }
    return (x) => sample(solveTforX(Math.max(0, Math.min(1, x))), p1y, p2y);
  }

  // Détection contexte (appelée chaque frame)
  function updateContext() {
    const el = document.elementFromPoint(tx, ty);

    // 1) Vidéo (iframe) -> masquer le curseur custom
    if (el && el.closest(".video-wrapper")) {
      root.classList.add("is-hidden");
    } else {
      root.classList.remove("is-hidden");
    }

    // 2) Lien .line (prioritaire sur le reste)
    const link = el && el.closest("a.line");
    const nowOverLine = !!link;
    if (nowOverLine && mergeTarget !== link) mergeTarget = link;
    if (!nowOverLine) mergeTarget = null;

    if (nowOverLine !== overLine) {
      overLine = nowOverLine;
      dirLine = overLine ? +1 : -1; // lance l’anim
      root.classList.toggle("over-line", overLine);
    }

    // 3) Lien de sidebar (style secondaire, ignoré si over-line)
    const overSidebar = !!(el && el.closest("#sidebar-placeholder a"));
    root.classList.toggle("over-link", overSidebar && !overLine);

    // 4) Texte p/h* (I-beam), ignoré si over-line
    const overText = !!(el && el.closest("p, h1, h2, h3, h4, h5, h6"));
    root.classList.toggle("over-text", overText && !overLine);
  }

  function render(now = performance.now()) {
    const dt = Math.max(0, now - prevTime);
    prevTime = now;

    // Positions lissées
    xCross = lerp(xCross, tx, CROSS_T);
    yCross = lerp(yCross, ty, CROSS_T);
    xRing = lerp(xRing, tx, RING_T);
    yRing = lerp(yRing, ty, RING_T);

    // Animation “line” (temps → progression → easing)
    if (dirLine !== 0 && underlineDurMs > 0) {
      const step = (dt / underlineDurMs) * dirLine;
      tLine = Math.max(0, Math.min(1, tLine + step));
      if (tLine === 0 || tLine === 1) dirLine = 0;
    }
    const pLine = ease(tLine); // easing 'ease' pour matcher le CSS

    // Appliquer transforms par défaut
    ring.style.transform = `translate(-50%, -50%) translate(${xRing}px, ${yRing}px) scale(${scale})`;

    // Barre verticale : en mode texte, précision = position brute (tx, ty)
    if (root.classList.contains("over-text")) {
      v.style.transform = `translate(${tx - 0.75}px, ${ty - 8}px)`;
    } else {
      v.style.transform = `translate(${xCross - 0.75}px, ${yCross - 8}px)`;
    }

    // Barre horizontale :
    if (mergeTarget) {
  // Mode underline “joué” par le curseur
  const r = mergeTarget.getBoundingClientRect();

  // Prend toujours la variable CSS (thème-safe)
  const lineColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--link-underline-color')
      .trim() ||
    getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-color-dark')
      .trim() ||
    '#d4d4ff';

  const w = Math.max(0, r.width * pLine);
  const y = r.bottom - underlinePx; // posé sur la baseline du lien

  h.style.background = lineColor;          // 👈 plus de “color” undefined
  h.style.height = `${underlinePx}px`;
  h.style.width  = `${w}px`;
  h.style.transform = `translate(${r.left}px, ${y}px)`;
} else {
  // Mode normal : la barre redevient partie de la croix
  h.style.width  = '16px';
  h.style.height = '1.5px';
  h.style.transform = `translate(${xCross - 8}px, ${yCross - 0.75}px)`;
}


    // Contexte (détection iframe / liens / texte) à chaque frame
    // remplace ton updateContext par ceci
function updateContext() {
  const el = document.elementFromPoint(tx, ty);

  // 1) Vidéo (iframe) -> masquer le curseur custom
  if (el && el.closest('.video-wrapper')) {
    root.classList.add('is-hidden');
  } else {
    root.classList.remove('is-hidden');
  }

  // 2) Lien .line (prioritaire)
  const link = el && el.closest('a.line');
  const nowOverLine = !!link;

  // si on entre sur un nouveau lien .line → reset anim
  if (nowOverLine) {
    if (mergeTarget !== link) {
      mergeTarget = link;
      overLine = true;
      tLine = 0;          // reset progression
      dirLine = +1;       // lance l’extension
      root.classList.add('over-line');
    }
  } else {
    if (mergeTarget) {
      // on quitte la zone .line -> repli
      overLine = false;
      dirLine = -1;
      root.classList.remove('over-line');
      mergeTarget = null;
    }
  }

  // 3) Lien de sidebar (style secondaire, ignoré si over-line)
  const overSidebar = !!(el && el.closest('#sidebar-placeholder a'));
  root.classList.toggle('over-link', overSidebar && !overLine);

  // 4) Texte p/h* (I-beam), ignoré si over-line
  const overText = !!(el && el.closest('p, h1, h2, h3, h4, h5, h6'));
  root.classList.toggle('over-text', overText && !overLine);
}
function render(now = performance.now()) {
  const dt = Math.max(0, now - prevTime);
  prevTime = now;

  // 👉 d'abord on lit le contexte (lien/vidéo/texte) pour ce frame
  updateContext();

  // Interpolations
  xCross = lerp(xCross, tx, CROSS_T);
  yCross = lerp(yCross, ty, CROSS_T);
  xRing  = lerp(xRing,  tx, RING_T);
  yRing  = lerp(yRing,  ty, RING_T);

  // Animation underline
  if (dirLine !== 0 && underlineDurMs > 0) {
    const step = (dt / underlineDurMs) * dirLine;
    tLine = Math.max(0, Math.min(1, tLine + step));
    if (tLine === 0 || tLine === 1) dirLine = 0;
  }
  const pLine = ease(tLine);

  // Peinture (comme avant) …
  ring.style.transform = `translate(-50%, -50%) translate(${xRing}px, ${yRing}px) scale(${scale})`;
  v.style.transform = root.classList.contains('over-text')
    ? `translate(${tx - 0.75}px, ${ty - 8}px)`
    : `translate(${xCross - 0.75}px, ${yCross - 8}px)`;

  if (mergeTarget) {
    const r = mergeTarget.getBoundingClientRect();
    const w = Math.max(0, r.width * pLine);
    const y = r.bottom - underlinePx;

    // couleur via var() (déjà réglée) :
    const lineColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--link-underline-color').trim()
      || getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-color-dark').trim()
      || '#d4d4ff';

    h.style.background = lineColor;
    h.style.height = `${underlinePx}px`;
    h.style.width  = `${w}px`;
    h.style.transform = `translate(${r.left}px, ${y}px)`;
  } else {
    h.style.width  = '16px';
    h.style.height = '1.5px';
    h.style.transform = `translate(${xCross - 8}px, ${yCross - 0.75}px)`;
  }

  requestAnimationFrame(render);
}


    requestAnimationFrame(render);
  }

  // Écouteurs
  document.addEventListener(
    "mousemove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      root.classList.remove("is-hidden");
    },
    { passive: true }
  );

  document.addEventListener("mousedown", () => {
    scale = CLICK_SCALE_DOWN;
  });
  document.addEventListener("mouseup", () => {
    scale = CLICK_SCALE_UP;
  });

  document.addEventListener("mouseleave", () =>
    root.classList.add("is-hidden")
  );
  document.addEventListener("mouseenter", () =>
    root.classList.remove("is-hidden")
  );

  // Go
  requestAnimationFrame(render);
})();
