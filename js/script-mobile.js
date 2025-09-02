// /js/script-mobile.js
(function () {
  // évite double-définition si le script est chargé deux fois
  if (window.__mobileMenuInit) return;
  window.__mobileMenuInit = true;

  function qs(id) {
    return document.getElementById(id);
  }

  function setupOnce() {
    const burger = qs("burger");
    const menu = qs("mobile-menu");
    if (!burger || !menu) return false; // partial pas encore injecté

    // Nettoie d’anciens listeners si ré-init
    const fresh = burger.cloneNode(true);
    burger.replaceWith(fresh);

    const open = () => {
      fresh.classList.add("is-open");
      fresh.setAttribute("aria-expanded", "true");
      menu.hidden = false;
      menu.classList.add("open"); // doit exister en CSS
      document.body.classList.add("no-scroll");
    };
    const close = () => {
      fresh.classList.remove("is-open");
      fresh.setAttribute("aria-expanded", "false");
      menu.classList.remove("open");
      menu.hidden = true;
      document.body.classList.remove("no-scroll");
      // remet le focus sur le burger pour l’accessibilité
      fresh.focus?.();
    };
    const toggle = () =>
      fresh.classList.contains("is-open") ? close() : open();

    fresh.addEventListener("click", toggle);
    menu.addEventListener("click", (e) => {
      if (e.target.matches("a")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    // reset si on passe en desktop
    const mq = window.matchMedia("(min-width: 640px)");
    const onChange = (ev) => {
      if (ev.matches) close();
    };
    mq.addEventListener
      ? mq.addEventListener("change", onChange)
      : mq.addListener(onChange);

    return true;
  }

  // Expose une API simple si tu réinjectes le partial plus tard
  window.initMobileMenu = function initMobileMenu() {
    // essaie immédiatement…
    if (setupOnce()) return;
    // …sinon observe le DOM jusqu’à ce que le partial apparaisse
    const obs = new MutationObserver(() => {
      if (setupOnce()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  };

  // init automatique quand le DOM est prêt
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      window.initMobileMenu()
    );
  } else {
    window.initMobileMenu();
  }
})();
