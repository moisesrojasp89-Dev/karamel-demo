/**
 * js/components/cta.js — Conversión: medición local de clics por botón (sin datos personales),
 * aviso breve (toast) y barra fija móvil que aparece al salir del hero.
 */
const STORAGE_KEY = 'cta_clicks_v1';

export function trackCta(name) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const counts = raw ? JSON.parse(raw) : {};
    counts[name] = (Number(counts[name]) || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch (error) {
    console.warn('Medición de CTA no disponible', error);
  }
  document.dispatchEvent(new CustomEvent('cta:click', { detail: { name } }));
}

export function initCtaTracking() {
  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-cta]');
    if (el) trackCta(el.getAttribute('data-cta'));
  });
}

let toastTimer;
export function showToast(message) {
  const toast = document.getElementById('cta-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

let stickyUnits = 0;

function syncStickyVisibility() {
  const bar = document.getElementById('sticky-cta');
  if (!bar) return;
  const visible = stickyUnits > 0;
  bar.classList.toggle('is-visible', visible);
  bar.inert = !visible;
}

export function setStickyCartState(units) {
  stickyUnits = Number(units) || 0;
  syncStickyVisibility();
}

export function initStickyCta() {
  syncStickyVisibility();
}
