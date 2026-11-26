/**
 * js/components/catalog-ui.js — Módulos Interactivos Modern Web 2026
 * Implementa:
 * - animate-to-from-top-layer (canTransitionDisplay + closeTopLayer con data-closing)
 * - same-document-transitions (document.startViewTransition con gestión de foco)
 * - Conmutador Editorial Light / Velvet Noir Dark Mode
 * - Navegación de estanterías horizontales (scroll-snap)
 */
export function canTransitionDisplay() {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return false;
  const probe = document.createElement('div');
  probe.style.transition = 'display 1ms allow-discrete';
  document.body.appendChild(probe);
  const ok = getComputedStyle(probe).transitionBehavior === 'allow-discrete';
  probe.remove();
  return ok;
}

let topLayerExitSupported;
export function supportsTopLayerExit() {
  return (topLayerExitSupported ??= canTransitionDisplay());
}

export function closeTopLayer(el) {
  if (!el || !el.open) return;
  if (!supportsTopLayerExit()) {
    el.close();
    return;
  }
  if ('closing' in el.dataset) return;
  el.dataset.closing = '';
  const cleanup = () => {
    delete el.dataset.closing;
  };
  el.addEventListener('close', cleanup, { once: true });

  const anims = [
    ...el.getAnimations(),
    ...el.getAnimations({ pseudoElement: '::backdrop' }),
  ];
  if (!anims.length) {
    cleanup();
    el.close();
    return;
  }
  Promise.allSettled(anims.map((a) => a.finished)).then(() => {
    cleanup();
    if (el.open) el.close();
  });
}

export function runWithViewTransition(updateDomFn, focusTargetId) {
  if (typeof document === 'undefined' || !document.startViewTransition) {
    updateDomFn();
    return;
  }
  const transition = document.startViewTransition(() => {
    updateDomFn();
  });
  if (transition && transition.ready) transition.ready.catch(() => {});
  if (focusTargetId) {
    transition.finished
      .then(() => {
        const target = document.getElementById(focusTargetId);
        if (target) {
          target.focus({ preventScroll: true });
        }
      })
      .catch(() => {});
  } else if (transition && transition.finished) {
    transition.finished.catch(() => {});
  }
}

export function initThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  const root = document.documentElement;
  const syncThemeBtn = (isDark) => {
    if (!btn) return;
    const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-pressed', String(isDark));
  };
  try {
    const saved = sessionStorage.getItem('karamel_theme');
    if (saved === 'dark') {
      root.setAttribute('data-theme', 'dark');
      syncThemeBtn(true);
    } else {
      syncThemeBtn(false);
    }
  } catch {
    syncThemeBtn(root.getAttribute('data-theme') === 'dark');
  }

  if (!btn) return;
  btn.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    const nextDark = !isDark;
    if (nextDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    syncThemeBtn(nextDark);
    try {
      sessionStorage.setItem('karamel_theme', nextDark ? 'dark' : 'light');
    } catch {
      // Ignorar si Web Storage está bloqueado
    }
  });
}

export function bindShelfCarouselControls(container) {
  if (!container) return;
  container.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-shelf-scroll]');
    if (!navBtn) return;
    const shelf = navBtn.closest('.category-shelf');
    const track = shelf ? shelf.querySelector('.shelf-carousel') : null;
    if (!track) return;
    const dir = navBtn.getAttribute('data-shelf-scroll') === 'prev' ? -1 : 1;
    track.scrollBy({ left: dir * 240, behavior: 'smooth' });
  });
}
