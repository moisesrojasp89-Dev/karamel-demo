/**
 * site-shell.js — Enrutador cliente instantáneo (0ms) con View Transitions, hidratación y precarga en memoria.
 */
const pageCache = new Map();

function stripSlash(p) {
  if (!p) return '/';
  return (p.length > 1 && p.endsWith('/')) ? p.slice(0, -1) : p;
}

function resolveInternalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl || './', window.location.href);
    if (parsed.origin !== window.location.origin) return null;
    const cleanPath = stripSlash(parsed.pathname);
    return {
      href: parsed.pathname + parsed.search + parsed.hash,
      cleanPath,
      hash: parsed.hash ? parsed.hash.slice(1) : '',
    };
  } catch {
    return null;
  }
}

export async function prefetchPage(url) {
  const resolved = resolveInternalUrl(url);
  if (!resolved || pageCache.has(resolved.cleanPath)) return;
  try {
    const res = await fetch(resolved.cleanPath, { headers: { 'X-Karamel-Prefetch': '1' } });
    if (res.ok) {
      const html = await res.text();
      pageCache.set(resolved.cleanPath, html);
    }
  } catch {
    // Prefetch silencioso: no bloquear si la red falla
  }
}

export function warmRoutes() {
  if (typeof window === 'undefined') return;
  const currentClean = stripSlash(window.location.pathname);
  if (!pageCache.has(currentClean)) {
    pageCache.set(currentClean, document.documentElement.outerHTML);
  }
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 40));
  idle(() => {
    const navHrefs = Array.from(document.querySelectorAll('header a[href], footer a[href]'))
      .map((a) => a.getAttribute('href') || '')
      .filter((href) => href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#'));
    const targets = Array.from(new Set(['./', 'contacto', 'privacidad', 'terminos', ...navHrefs]));
    targets.forEach(prefetchPage);
  });
}

let dockCatalogObserver = null;

function setMobileDockActive(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  document.querySelectorAll('.mobile-dock-link').forEach((link) => {
    const isTarget = link === target;
    link.classList.toggle('active', isTarget);
    if (isTarget) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function observeCatalogDock() {
  if (dockCatalogObserver) {
    dockCatalogObserver.disconnect();
    dockCatalogObserver = null;
  }
  const catalog = document.getElementById('catalogo');
  const catalogDockLink = document.querySelector('.mobile-dock-link[href*="#catalogo"]');
  if (!catalog || !catalogDockLink || !('IntersectionObserver' in window)) return;
  dockCatalogObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting) {
        setMobileDockActive('.mobile-dock-link[href*="#catalogo"]');
      } else if (window.scrollY < catalog.offsetTop) {
        setMobileDockActive('.mobile-dock-link[href="./"]');
      }
    },
    { threshold: 0.08 }
  );
  dockCatalogObserver.observe(catalog);
}

export function updateActiveNavLinks(path) {
  const currentPath = stripSlash(path || window.location.pathname);
  document.querySelectorAll('.nav-link, .mobile-dock-link').forEach((link) => {
    const raw = link.getAttribute('href') || '';
    if (raw.includes('#')) {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
      return;
    }
    const resolved = resolveInternalUrl(raw);
    if (resolved && resolved.cleanPath === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

function observeReveals() {
  const revealTargets = document.querySelectorAll('[data-reveal]:not(.is-visible)');
  if (!revealTargets.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealTargets.forEach((node) => node.classList.add('is-visible'));
    return;
  }
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.04 }
  );
  revealTargets.forEach((node) => revealObserver.observe(node));
}

async function syncStylesheets(nextDoc) {
  const currentLinks = new Set(
    Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
      .map((l) => (l.getAttribute('href') || '').split('?')[0])
  );
  const pending = [];
  for (const link of Array.from(nextDoc.head.querySelectorAll('link[rel="stylesheet"]'))) {
    const href = link.getAttribute('href') || '';
    const key = href.split('?')[0];
    if (!href || currentLinks.has(key)) continue;
    const cloned = document.createElement('link');
    cloned.rel = 'stylesheet';
    cloned.href = href;
    pending.push(
      new Promise((resolve) => {
        cloned.addEventListener('load', () => resolve(), { once: true });
        cloned.addEventListener('error', () => resolve(), { once: true });
        setTimeout(resolve, 600);
      })
    );
    document.head.appendChild(cloned);
    currentLinks.add(key);
  }
  if (pending.length > 0) {
    await Promise.all(pending);
  }
}

export async function navigateTo(url, isPop = false) {
  const resolved = resolveInternalUrl(url);
  if (!resolved) {
    window.location.href = url;
    return;
  }
  const currentClean = stripSlash(window.location.pathname);
  const targetClean = resolved.cleanPath;
  const hashPart = resolved.hash;

  // Si es ancla o misma ruta, desplazamiento directo sin recarga ni parpadeo
  if (targetClean === currentClean) {
    if (hashPart) {
      const el = document.getElementById(hashPart);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        if (hashPart === 'catalogo') setMobileDockActive('.mobile-dock-link[href*="#catalogo"]');
        if (!isPop) history.pushState(null, '', resolved.href);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setMobileDockActive('.mobile-dock-link[href="./"]');
    }
    return;
  }

  // Obtener HTML (de caché en memoria o fetch inmediato)
  let html = pageCache.get(targetClean);
  if (!html) {
    try {
      const res = await fetch(targetClean);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      html = await res.text();
      pageCache.set(targetClean, html);
    } catch {
      window.location.href = url;
      return;
    }
  }

  const parser = new DOMParser();
  const nextDoc = parser.parseFromString(html, 'text/html');
  const nextRoot = nextDoc.getElementById('app-root');
  const currentRoot = document.getElementById('app-root');

  if (!nextRoot || !currentRoot) {
    window.location.href = url;
    return;
  }

  await syncStylesheets(nextDoc);

  const swapContent = () => {
    document.title = nextDoc.title;
    currentRoot.innerHTML = nextRoot.innerHTML;
    updateActiveNavLinks(targetClean);

    if (hashPart) {
      const el = document.getElementById(hashPart);
      if (el) el.scrollIntoView({ behavior: 'auto' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (!isPop) {
      history.pushState(null, '', resolved.href);
    }

    observeReveals();
    observeCatalogDock();
    document.dispatchEvent(new CustomEvent('karamel:navigate', { detail: { path: targetClean } }));
  };

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !prefersReduced) {
    try {
      const vt = document.startViewTransition(swapContent);
      if (vt && vt.ready) vt.ready.catch(() => {});
      if (vt && vt.updateCallbackDone) vt.updateCallbackDone.catch(() => {});
      if (vt && vt.finished) vt.finished.catch(() => {});
    } catch {
      swapContent();
    }
  } else {
    swapContent();
  }
}

export function initSiteShell() {
  warmRoutes();
  updateActiveNavLinks();

  // Precarga especulativa al posicionar puntero o toque sobre cualquier enlace
  document.addEventListener('pointerover', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('//') || href.startsWith('#')) return;
    prefetchPage(href);
  }, { passive: true });

  // Desenfocar inmediatamente ante clic o toque para anular cualquier focus ring nativo del SO
  document.addEventListener('pointerdown', (e) => {
    const interactive = e.target.closest('a, button');
    if (interactive && document.activeElement && document.activeElement !== interactive) {
      document.activeElement.blur();
    }
  });

  // Interceptar clics en enlaces internos para navegación suave (0ms, sin recarga ni destellos)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('//')) return;
    if (a.hasAttribute('target') && a.getAttribute('target') !== '_self') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', href);
      }
      return;
    }

    e.preventDefault();
    if (document.activeElement) document.activeElement.blur();
    navigateTo(href);
  });

  // Soporte para botones Atrás/Adelante del navegador
  window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname + window.location.hash, true);
  });

  observeReveals();
  observeCatalogDock();

  const yearNode = document.getElementById('footer-year');
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}
export const SHELL_BRAND = "Velvet Aura Beauty";
