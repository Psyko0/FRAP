// THEME: permutation des variables CSS (dark par défaut)
(() => {
  const KEY = 'theme';
  const root = document.documentElement;
  const pairs = [
    ['--bg-dark-1','--bg-light-1'],
    ['--bg-dark-2','--bg-light-2'],
    ['--bg-dark-3','--bg-light-3'],
    ['--text-dark','--text-light'],
    ['--text-dark-2','--text-light-2'],
    ['--text-dark-muted','--text-light-muted'],
    ['--accent-color-dark', '--accent-color-light']
  ];
  const read = n => getComputedStyle(root).getPropertyValue(n).trim();
  let DARK={}, LIGHT={};

  function capture(){
    DARK={}; LIGHT={};
    pairs.forEach(([d,l]) => { DARK[d]=read(d); LIGHT[l]=read(l); });
  }
  function setTheme(mode){
    if (!DARK['--bg-dark-1']) capture();
    pairs.forEach(([d,l]) => root.style.setProperty(d, mode==='dark' ? DARK[d] : LIGHT[l]));
    localStorage.setItem(KEY, mode);
    const t = document.getElementById('theme-toggle');
    if (t) t.checked = (mode === 'dark'); // checked = dark
  }
  function initialMode(){
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function syncThemeToggle(){
    const t = document.getElementById('theme-toggle');
    if (!t) return;
    t.onchange = null;                     // évite double-listener
    t.checked = (localStorage.getItem(KEY) ?? initialMode()) === 'dark';
    t.addEventListener('change', () => setTheme(t.checked ? 'dark' : 'light'));
  }

  // expose pour l’appel après injection
  window.__theme = { setTheme, syncThemeToggle };

  // applique au chargement + branche si déjà présent
  const initial = initialMode();
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { setTheme(initial); syncThemeToggle(); });
  } else {
    setTheme(initial); syncThemeToggle();
  }

  // suivre l’OS si pas de préférence sauvegardée
  if (!localStorage.getItem(KEY)) {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', e => { setTheme(e.matches ? 'dark' : 'light'); syncThemeToggle(); });
  }

  // filet de sécurité : délégation si le toggle apparaît plus tard
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'theme-toggle') {
      setTheme(e.target.checked ? 'dark' : 'light');
    }
  });
})();

// ===== CUSTOM SCROLLBAR (drag + rail click + keyboard + touch) =====
(function(){
  let rail, thumb, dragging = false, dragStartY = 0, startThumbY = 0;

  const doc = () => document.documentElement;

  // calcule tailles & place le pouce
  function updateThumb() {
    if (!rail || !thumb) return;
    const scrollH = doc().scrollHeight;
    const viewH   = window.innerHeight;
    const trackH  = rail.clientHeight;

    // taille
    const ratio   = Math.min(1, viewH / scrollH);
    const minH    = 32;
    const thumbH  = Math.max(minH, Math.round(trackH * ratio));
    thumb.style.height = thumbH + 'px';

    // position
    const maxScroll = Math.max(1, scrollH - viewH);
    const maxThumbY = trackH - thumbH;
    const y = (window.scrollY / maxScroll) * maxThumbY;

    thumb.style.transform = `translateY(${y}px)`;

    // ARIA
    const valueNow = Math.round((window.scrollY / maxScroll) * 100);
    rail.setAttribute('aria-valuenow', String(valueNow));
  }

  // translate y pouce -> scrollY
  function setScrollFromThumbY(y) {
    const scrollH = doc().scrollHeight;
    const viewH   = window.innerHeight;
    const trackH  = rail.clientHeight;
    const thumbH  = thumb.offsetHeight;

    const maxThumbY = Math.max(1, trackH - thumbH);
    const maxScroll = Math.max(1, scrollH - viewH);

    const clampedY = Math.max(0, Math.min(y, maxThumbY));
    const ratio    = clampedY / maxThumbY;
    const targetY  = ratio * maxScroll;

    window.scrollTo({ top: targetY, behavior: 'instant' });
  }

  // DRAG souris / tactile
  function onPointerDown(clientY) {
    dragging = true;
    dragStartY = clientY;
    // position actuelle du thumb
    const matrix = new DOMMatrixReadOnly(getComputedStyle(thumb).transform);
    startThumbY = matrix.m42 || 0;
    document.body.style.userSelect = 'none';
  }
  function onPointerMove(clientY) {
    if (!dragging) return;
    const delta = clientY - dragStartY;
    setScrollFromThumbY(startThumbY + delta);
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
  }

  // Clic sur le rail = "page jump" vers la position cliquée
  function onRailClick(e) {
    if (e.target === thumb || e.target.closest('#custom-thumb')) return;
    const rect = rail.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const thumbH = thumb.offsetHeight;
    setScrollFromThumbY(clickY - thumbH / 2);
  }

  // Clavier (sur le thumb)
  function onThumbKey(e) {
    const step = 60;                 // flèches
    const page = window.innerHeight * 0.9; // PageUp/Down
    let delta = 0;
    switch (e.key) {
      case 'ArrowUp':    delta = -step; break;
      case 'ArrowDown':  delta =  step; break;
      case 'PageUp':     delta = -page; break;
      case 'PageDown':   delta =  page; break;
      case 'Home':       window.scrollTo({top:0, behavior:'instant'}); e.preventDefault(); return;
      case 'End':        window.scrollTo({top: doc().scrollHeight, behavior:'instant'}); e.preventDefault(); return;
      default: return;
    }
    e.preventDefault();
    window.scrollBy({ top: delta, behavior: 'instant' });
  }

  // Observers pour s’adapter au contenu dynamique
  let resizeObs, mutationObs;
  function attachObservers() {
    resizeObs?.disconnect();
    mutationObs?.disconnect();
    resizeObs = new ResizeObserver(updateThumb);
    resizeObs.observe(document.documentElement);
    resizeObs.observe(document.body);
    mutationObs = new MutationObserver(() => {
      // throttle via rAF
      requestAnimationFrame(updateThumb);
    });
    mutationObs.observe(document.documentElement, { childList:true, subtree:true, attributes:true, characterData:true });
  }

  function addListeners() {
    // souris
    thumb.addEventListener('mousedown', (e) => { e.preventDefault(); onPointerDown(e.clientY); });
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    // tactile
    thumb.addEventListener('touchstart', (e) => { onPointerDown(e.touches[0].clientY); }, {passive:true});
    window.addEventListener('touchmove',  (e) => { onPointerMove(e.touches[0].clientY); }, {passive:true});
    window.addEventListener('touchend',   onPointerUp);

    // rail
    rail.addEventListener('click', onRailClick);

    // clavier
    thumb.addEventListener('keydown', onThumbKey);

    // scroll / resize
    window.addEventListener('scroll', () => requestAnimationFrame(updateThumb), {passive:true});
    window.addEventListener('resize', updateThumb);
  }

  function initCustomScrollbar() {
    rail  = document.getElementById('custom-scrollbar');
    thumb = document.getElementById('custom-thumb');
    if (!rail || !thumb) return;

    // rendre le rail interactif
    rail.style.pointerEvents = 'auto';
    thumb.style.pointerEvents = 'auto';

    attachObservers();
    addListeners();
    updateThumb();
  }

  // expose pour ré-init après injection des partials
  window.initCustomScrollbar = initCustomScrollbar;

  // init si déjà présent dans le DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomScrollbar);
  } else {
    initCustomScrollbar();
  }
})();

// === Lightbox images ===
document.addEventListener("DOMContentLoaded", () => {
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");

  // toutes les images de tes carousels
  document.querySelectorAll(".main-slider img, .thumb-slider img").forEach(img => {
    img.addEventListener("click", () => {
      lbImg.src = img.src;
      lb.hidden = false;
    });
  });

  // fermer en cliquant n'importe où
  lb.addEventListener("click", () => {
    lb.hidden = true;
    lbImg.src = "";
  });
});


// === Fullscreen vidéos mobile ===
(function(){
  const isIOS = () =>
    /iP(hone|od|ad)/.test(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

  function enableFullscreenOnTap(){
    // n’activer que si on est en mobile (<=639px)
    if (!window.matchMedia('(max-width: 639px)').matches) return;

    const wrappers = document.querySelectorAll('.video-wrapper');

    function onFsChange(){
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement;
      if (!fsEl) {
        wrappers.forEach(w => {
          const c = w.querySelector('.tap-catcher');
          if (c) {
            c.style.pointerEvents = '';
            c.style.display = '';
            w.classList.remove('is-fs');
          }
        });
      }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('msfullscreenchange', onFsChange);

    wrappers.forEach(wrap => {
      const iframe = wrap.querySelector('.video-iframe');
      if (!iframe) return;

      let catcher = wrap.querySelector('.tap-catcher');
      if (!catcher) {
        catcher = document.createElement('button');
        catcher.type = 'button';
        catcher.className = 'tap-catcher';
        catcher.setAttribute('aria-label', 'Lire en plein écran');
        wrap.appendChild(catcher);
      }

      catcher.addEventListener('click', async () => {
        try {
          if (isIOS()) {
            catcher.style.display = 'none';
            window.open(iframe.src, '_blank');
            return;
          }

          wrap.classList.add('is-fs');
          catcher.style.pointerEvents = 'none';
          catcher.style.display = 'none';

          if (wrap.requestFullscreen) await wrap.requestFullscreen();
          else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
          else if (wrap.msRequestFullscreen) wrap.msRequestFullscreen();

        } catch (e) {
          window.open(iframe.src, '_blank');
        }
      }, { passive: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enableFullscreenOnTap);
  } else {
    enableFullscreenOnTap();
  }
})();

