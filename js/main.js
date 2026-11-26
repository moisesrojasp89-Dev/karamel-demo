import { CATALOG_ITEMS } from './data.js';
import * as siteConfigMod from './config.js';
import { loadCatalogData, loadSiteSettings } from './data-fetch.js';
import { initSiteShell } from './components/site-shell.js';
import {
  closeTopLayer,
  runWithViewTransition,
  initThemeToggle,
  bindShelfCarouselControls,
} from './components/catalog-ui.js';
import { initCtaTracking, initStickyCta, setStickyCartState, showToast } from './components/cta.js';

const SITE_CONFIG = siteConfigMod.SITE_CONFIG;
const DEFAULT_VERTICAL_COPY = {
  defaultChoice: 'Opción estándar',
  choiceLabel: 'Modalidad',
  choices: ['Opción estándar', 'Consulta previa', 'Atención prioritaria'],
  bagActionLabel: 'Solicitud',
  bagPrep: 'de la solicitud',
  bagAddPrep: 'a la solicitud',
  unitPlural: 'servicios',
  trustBullets: ['✓ Atención certificada', '✓ Respuesta directa por WhatsApp'],
  waDetailQuestion: '¿Tienen disponibilidad?',
  waStickyDefault: ', quiero solicitar más información.',
  emptyBagText: 'Tu solicitud está vacía. Agrega elementos del catálogo para enviarlos por WhatsApp.',
  emptySearchHint: 'Prueba con otro término o categoría, o limpia los filtros.',
  resetCatalogLabel: 'Ver todo el catálogo',
  addedToastSuffix: ' agregado a la solicitud',
  shadeLabel: 'opciones disponibles',
};
const V = siteConfigMod.VERTICAL_COPY || DEFAULT_VERTICAL_COPY;
const { defaultChoice: DEFAULT_CHOICE, choiceLabel: CHOICE_LABEL, choices: CHOICES, bagActionLabel: BAG_ACTION_LABEL, trustBullets: TRUST_BULLETS } = V;

export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parsePrice(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  const cleaned = String(raw ?? '0').replace(/[^0-9,.-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function safeGetStorage(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

const bagState = [];
let activeCategory = 'ALL';
let searchQuery = '';
let selectedShade = DEFAULT_CHOICE;
let currentCatalog = [...CATALOG_ITEMS];

export function buildWhatsAppUrl(message, origin) {
  const phone = SITE_CONFIG.WA_NUMBER || '';
  const text = origin ? message + '\n[Ref: ' + origin + ']' : message;
  return `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;
}

export function initPreviewDialog() {
  const dialogs = document.querySelectorAll('dialog.preview-dialog');
  dialogs.forEach((dialog) => {
    if (dialog.dataset.dialogBound === 'true') return;
    dialog.dataset.dialogBound = 'true';
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeTopLayer(dialog);
    });

    dialog.querySelectorAll('[data-close-dialog]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        closeTopLayer(dialog);
      });
    });

    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        closeTopLayer(dialog);
      });
    }
  });

  const bagDialog = document.getElementById('quick-preview-dialog');
  if (bagDialog) {
    document.querySelectorAll('#open-bag-btn, #sticky-bag-btn').forEach((btn) => {
      if (btn.dataset.bagOpenBound === 'true') return;
      btn.dataset.bagOpenBound = 'true';
      btn.addEventListener('click', () => {
        renderBagModal();
        if (!bagDialog.open) bagDialog.showModal();
      });
    });
  } else {
    document.querySelectorAll('#open-bag-btn').forEach((btn) => {
      if (btn.dataset.bagOpenBound === 'true') return;
      btn.dataset.bagOpenBound = 'true';
      btn.addEventListener('click', () => {
        window.location.href = './#catalogo';
      });
    });
  }
}

function resolveItemChoices(item) {
  if (item && Array.isArray(item.variants) && item.variants.length > 0) {
    const cleanVariants = item.variants.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 6);
    if (cleanVariants.length > 0) {
      return {
        label: String(item.variantLabel || CHOICE_LABEL),
        choices: cleanVariants,
        defaultChoice: cleanVariants[0],
      };
    }
  }
  const cat = String((item && item.category) || '').toLowerCase();
  const name = String((item && item.name) || '').toLowerCase();
  const hay = `${cat} ${name}`;
  if (SITE_CONFIG.VERTICAL === 'gastronomy') {
    if (/(malteada|batido|smoothie|milkshake)/i.test(hay)) {
      return { label: 'Presentación', choices: ['Con crema', 'Sin crema'], defaultChoice: 'Con crema' };
    }
    if (/(bebida|jugo|caf[eé]|\bt[eé]\b|limonada|refresco|infusi[oó]n)/i.test(hay)) {
      return { label: 'Hielo', choices: ['Con hielo', 'Poco hielo', 'Sin hielo'], defaultChoice: 'Con hielo' };
    }
    if (/(postre|helado|torta|brownie|ensalada)/i.test(hay)) {
      return null;
    }
    if (/(acompañ|papas|entrada|side|aro|tequeñ)/i.test(hay)) {
      return { label: 'Salsa', choices: ['Salsa de la casa', 'BBQ ahumada', 'Sin salsa'], defaultChoice: 'Salsa de la casa' };
    }
    if (/(hamburguesa|burger|combo|carne|parrilla|smash|plato)/i.test(hay)) {
      return { label: CHOICE_LABEL, choices: CHOICES, defaultChoice: DEFAULT_CHOICE };
    }
    return null;
  }
  return { label: CHOICE_LABEL, choices: CHOICES, defaultChoice: DEFAULT_CHOICE };
}

export function openProductDetailModal(item) {
  const detailDialog = document.getElementById('product-detail-dialog');
  const contentBox = document.getElementById('product-detail-content');
  if (!detailDialog || !contentBox || !item) return;

  const choiceSet = resolveItemChoices(item);
  selectedShade = choiceSet ? choiceSet.defaultChoice : '';
  const priceFormatted = parsePrice(item.priceUsd).toFixed(2);
  const stockNum = typeof item.stock === 'number' ? item.stock : 15;
  const lowStockClass = stockNum <= 5 ? 'low-stock' : '';
  const isBoutiqueModal = SITE_CONFIG.VERTICAL === 'retail_craft';
  const stockLabel = isBoutiqueModal
    ? stockNum <= 5
      ? `¡Últimas ${stockNum} unidades en stock!`
      : `Disponible: ${stockNum} unidades en stock`
    : stockNum <= 0
      ? 'Agotado por hoy'
      : stockNum <= 5
        ? 'Últimas porciones de hoy'
        : 'Disponible · Preparado al momento';
  const ratingVal = typeof item.rating === 'number' ? item.rating.toFixed(1) : '4.9';
  const imgSrc = item.imageUrl || 'assets/hero-showcase.svg';
  const choiceSummary = selectedShade ? `${selectedShade} · ` : '';
  const waMsg = `Hola ${SITE_CONFIG.BUSINESS_NAME}, me interesa pedir: ${item.brand ? item.brand + ' - ' : ''}${item.name} (${choiceSummary}$${priceFormatted} USD). ${V.waDetailQuestion}`;
  const waHref = buildWhatsAppUrl(waMsg, 'ficha-producto');

  detailDialog.dataset.modalStyle = isBoutiqueModal ? 'editorial-sheet' : 'poster-sheet';

  const shadesBlockHtml = choiceSet
    ? `<div class="pd-shades">
            <span class="shade-selector-label">${escHtml(choiceSet.label)}</span>
            <div class="shade-selector-row">${choiceSet.choices
              .map(
                (sh) =>
                  `<button type="button" class="shade-pill ${isBoutiqueModal ? 'shade-pill--rect ' : ''}${sh === selectedShade ? 'active' : ''}" data-shade="${escHtml(sh)}" data-item-id="${escHtml(item.id)}"><span class="shade-swatch-dot"></span>${escHtml(sh)}</button>`
              )
              .join('')}</div>
          </div>`
    : '';

  if (isBoutiqueModal) {
    const shortStock = stockNum <= 5 ? `Últimas ${stockNum} uds.` : `${stockNum} en stock`;
    contentBox.innerHTML = `
      <div class="pde-scroll">
        <div class="pde-head">
          <div class="pde-thumb">
            <img src="${escHtml(imgSrc)}" alt="${escHtml(item.name)}" width="240" height="300">
          </div>
          <div class="pde-head-info">
            <span class="mcard-brand">${escHtml(item.brand || SITE_CONFIG.BUSINESS_NAME)} · ${escHtml(item.category)}</span>
            <h2 id="detail-dialog-title" class="pde-title">${escHtml(item.name)}</h2>
            <div class="pde-price-row">
              <strong class="pde-price">$${priceFormatted} USD</strong>
              <span class="pde-rating">★ ${escHtml(ratingVal)}</span>
            </div>
            <span class="mcard-stock ${lowStockClass}">
              <span class="stock-dot pulse-infinite"></span>
              ${escHtml(shortStock)}
            </span>
          </div>
        </div>
        <div class="pde-body">
          <p class="mcard-desc">${escHtml(item.description)}</p>
          ${shadesBlockHtml}
        </div>
      </div>
      <div class="pde-footer">
        <div class="pde-actions">
          <a id="modal-wa-order-link" href="${escHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="btn-wa-card pde-btn-wa" data-cta="ficha-whatsapp">Pedir por WhatsApp</a>
          <button type="button" class="btn-bag-add pde-btn-bag" data-cta="ficha-bolso" data-modal-add-id="${escHtml(item.id)}">+ ${BAG_ACTION_LABEL}</button>
        </div>
        <p class="pde-trust-line">${TRUST_BULLETS.slice(0, 2).map((b) => escHtml(b)).join(' · ')}</p>
      </div>
    `;
    detailDialog.showModal();
    return;
  }

  contentBox.innerHTML = `
    <div class="pd-scroll">
      <div class="pd-layout">
        <div class="pd-media">
          <img src="${escHtml(imgSrc)}" alt="${escHtml(item.name)}" width="480" height="480">
        </div>
        <div class="pd-info">
          <span class="mcard-brand">${escHtml(item.brand || SITE_CONFIG.BUSINESS_NAME)} · ${escHtml(item.category)}</span>
          <h2 id="detail-dialog-title" class="pd-title">${escHtml(item.name)}</h2>
          <div class="pd-meta">
            <span class="stars-gold">★ ${escHtml(ratingVal)}</span>
            <span class="mcard-stock ${lowStockClass}">
              <span class="stock-dot pulse-infinite"></span>
              ${escHtml(stockLabel)}
            </span>
          </div>
          <p class="mcard-desc">${escHtml(item.description)}</p>
          ${shadesBlockHtml}
        </div>
      </div>
    </div>
    <div class="pd-footer">
      <div class="pd-buy-row">
        <strong class="mcard-price">$${priceFormatted} USD</strong>
      </div>
      <div class="pd-actions">
        <a id="modal-wa-order-link" href="${escHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="btn-wa-card" data-cta="ficha-whatsapp">Pedir por WhatsApp</a>
        <button type="button" class="btn-bag-add" data-cta="ficha-bolso" data-modal-add-id="${escHtml(item.id)}">+ ${BAG_ACTION_LABEL}</button>
      </div>
      <ul class="pd-trust">${TRUST_BULLETS.map((bullet) => '<li>' + escHtml(bullet) + '</li>').join('')}</ul>
    </div>
  `;

  detailDialog.showModal();
}

function bagTotals() {
  let units = 0;
  let totalUsd = 0;
  for (const entry of bagState) {
    units += entry.qty;
    totalUsd += parsePrice(entry.item.priceUsd) * entry.qty;
  }
  return { units, totalUsd };
}

function buildBagMessage(totalUsd) {
  const lines = bagState.map(
    (e) => '• ' + e.qty + 'x ' + e.item.name + (e.shade ? ' [' + e.shade + ']' : '') + ' ($' + parsePrice(e.item.priceUsd).toFixed(2) + ' c/u)'
  );
  return 'Hola ' + SITE_CONFIG.BUSINESS_NAME + ', quiero realizar este pedido:\n' + lines.join('\n') + '\n\nTotal estimado: $' + totalUsd.toFixed(2) + ' USD';
}

function updateStickyCta(units, totalUsd) {
  const count = document.getElementById('sticky-bag-count');
  const total = document.getElementById('sticky-bag-total');
  const wa = document.getElementById('sticky-wa-link');
  if (count) count.textContent = String(units);
  if (total) total.textContent = '$' + totalUsd.toFixed(2);
  setStickyCartState(units);
  if (wa) {
    const href = units > 0
      ? buildWhatsAppUrl(buildBagMessage(totalUsd), 'barra-fija-bolso')
      : buildWhatsAppUrl(
        'Hola ' + SITE_CONFIG.BUSINESS_NAME + V.waStickyDefault,
        'barra-fija'
      );
    wa.setAttribute('href', href);
  }
}

function bumpBagBadge() {
  ['bag-count-badge', 'sticky-bag-count'].forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.classList.remove('bag-bump');
    void node.offsetWidth; // reinicia la animación
    node.classList.add('bag-bump');
  });
}

export function addToBag(item, shade) {
  const existing = bagState.find((entry) => entry.item.id === item.id && entry.shade === shade);
  if (existing) {
    existing.qty += 1;
  } else {
    bagState.push({ item, qty: 1, shade });
  }
  renderBagModal();
  bumpBagBadge();
}

export function changeBagQty(index, delta) {
  const entry = bagState[index];
  if (!entry) return;
  entry.qty += delta;
  if (entry.qty <= 0) bagState.splice(index, 1);
  renderBagModal();
}

export function removeFromBag(index) {
  if (index < 0 || index >= bagState.length) return;
  bagState.splice(index, 1);
  renderBagModal();
}

export function renderBagModal() {
  const listNode = document.getElementById('bag-items-list');
  const totalNode = document.getElementById('bag-total-usd');
  const checkoutLink = document.getElementById('bag-wa-checkout');
  const countBadge = document.getElementById('bag-count-badge');

  const { units, totalUsd } = bagTotals();
  if (countBadge) {
    countBadge.textContent = String(units);
  }
  updateStickyCta(units, totalUsd);

  if (!listNode || !totalNode || !checkoutLink) return;

  if (bagState.length === 0) {
    listNode.innerHTML = '<p class="mcard-desc">' + escHtml(V.emptyBagText) + '</p>';
    totalNode.textContent = '$0.00 USD';
    checkoutLink.setAttribute('href', buildWhatsAppUrl('Hola ' + SITE_CONFIG.BUSINESS_NAME + ', quiero asesoría sobre su catálogo.', 'bolso-vacio'));
    return;
  }

  listNode.innerHTML = bagState
    .map((entry, index) => {
      const unit = parsePrice(entry.item.priceUsd);
      const name = escHtml(entry.item.name);
      return `<div class="bag-item" data-bag-index="${index}">
        <div class="bag-item-info">
          <strong>${name}</strong>
          <span>${entry.shade ? escHtml(entry.shade) + ' · ' : ''}$${unit.toFixed(2)} c/u</span>
        </div>
        <strong class="bag-item-total">$${(unit * entry.qty).toFixed(2)}</strong>
        <div class="bag-qty" role="group" aria-label="Cantidad de ${name}">
          <button type="button" data-bag-action="dec" aria-label="Quitar una unidad de ${name}">−</button>
          <output aria-live="polite">${entry.qty}</output>
          <button type="button" data-bag-action="inc" aria-label="Agregar una unidad de ${name}">+</button>
        </div>
        <button type="button" class="bag-remove" data-bag-action="remove" aria-label="Eliminar ${name} ${escHtml(V.bagPrep)}">Eliminar</button>
      </div>`;
    })
    .join('');

  totalNode.textContent = `$${totalUsd.toFixed(2)} USD`;
  checkoutLink.setAttribute('href', buildWhatsAppUrl(buildBagMessage(totalUsd), 'bolso'));
}

export function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const bucket = groups.get(item.category);
    if (bucket) bucket.push(item);
    else groups.set(item.category, [item]);
  }
  return groups;
}

function filterCatalogItems(items) {
  const q = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    if (q) {
      const hay = `${item.name} ${item.brand || ''} ${item.category} ${item.description}`.toLowerCase();
      return hay.includes(q);
    }
    return activeCategory === 'ALL' || item.category === activeCategory;
  });
}

function renderEmptyCatalogState(grid, countNode) {
  if (countNode) countNode.textContent = `0 de 0 ${V.unitPlural}`;
  const emptyWaHref = buildWhatsAppUrl(
    'Hola ' + SITE_CONFIG.BUSINESS_NAME + ', quiero confirmar disponibilidad al instante.',
    'catalogo-vacio'
  );
  grid.innerHTML = `<div class="empty-state">
      <h3 class="shelf-title">Estamos actualizando nuestra oferta</h3>
      <p class="mcard-desc">Estamos actualizando nuestra oferta. Escríbenos directo por WhatsApp para confirmar disponibilidad al instante.</p>
      <a href="${escHtml(emptyWaHref)}" target="_blank" rel="noopener noreferrer" class="btn-primary" data-cta="empty-catalog-whatsapp">Consultar por WhatsApp</a>
    </div>`;
}

export function renderCategoryPills(items) {
  const medallionsContainer = document.getElementById('category-medallions');
  if (!medallionsContainer) return;
  const groups = groupByCategory(items);
  const entries = Array.from(groups.entries());
  if (entries.length > 0 && (activeCategory === 'ALL' || !groups.has(activeCategory))) {
    activeCategory = entries[0][0];
  }
  medallionsContainer.innerHTML = entries
    .map(([cat, catItems]) => {
      const photos = catItems.filter((i) => i.imageUrl).map((i) => i.imageUrl);
      const isAct = activeCategory === cat ? 'active' : '';
      const mediaHtml = `<img src="${escHtml(photos[0] || 'assets/hero-showcase.svg')}" alt="${escHtml(cat)}" class="medallion-img" loading="lazy" width="84" height="84">`;
      return `<button type="button" class="medallion-card ${isAct}" data-category="${escHtml(cat)}" aria-pressed="${activeCategory === cat}">
          <div class="medallion-circle">
            ${mediaHtml}
          </div>
          <span class="medallion-title">${escHtml(cat)}</span>
          <span class="medallion-count">${catItems.length} ${escHtml(V.unitPlural)}</span>
        </button>`;
    })
    .join('');
}

export function renderCatalog(items) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  const countNode = document.getElementById('catalog-visible-count');
  if (items.length === 0) {
    renderEmptyCatalogState(grid, countNode);
    return;
  }

  const filtered = filterCatalogItems(items);
  if (countNode) {
    const q = searchQuery.trim();
    if (q) {
      countNode.hidden = false;
      countNode.innerHTML =
        '<span>' +
        escHtml(filtered.length + (filtered.length === 1 ? ' resultado' : ' resultados') + ' para "' + q + '"') +
        '</span><button type="button" class="search-clear-link" data-reset-catalog>Limpiar</button>';
    } else {
      countNode.hidden = true;
      countNode.textContent = '';
    }
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <h3 class="shelf-title">Sin resultados para tu búsqueda</h3>
      <p class="mcard-desc">${escHtml(V.emptySearchHint)}</p>
      <button type="button" class="btn-outline" data-reset-catalog>${escHtml(V.resetCatalogLabel)}</button>
    </div>`;
    return;
  }

  const groupedCategories = Array.from(groupByCategory(filtered).entries());

  grid.innerHTML = groupedCategories
    .map(([cat, catItems]) => {
      const cardsHtml = catItems
        .map((item) => {
          const priceFormatted = parsePrice(item.priceUsd).toFixed(2);
          const ratingVal = typeof item.rating === 'number' ? item.rating.toFixed(1) : '4.9';
          const brandHtml = `<span class="mcard-brand">${escHtml(item.brand || SITE_CONFIG.BUSINESS_NAME)}</span>`;
          const badgeHtml = item.badge ? `<span class="mcard-badge">${escHtml(item.badge)}</span>` : '';
          const imgSrc = item.imageUrl || 'assets/hero-showcase.svg';
          const shadeList = Array.isArray(item.shades) ? item.shades.filter((shade) => /^#[0-9A-Fa-f]{6}$/.test(shade)) : [];
          const shadesHtml = shadeList.length > 0
            ? `<div class="mcard-shades" aria-label="${shadeList.length} ${escHtml(V.shadeLabel)}">${shadeList
                .map((shade) => `<i class="mcard-shade shade-${shade.replace('#', '').toLowerCase()}"></i>`)
                .join('')}</div>`
            : '';

          return `<article class="mcard" data-id="${escHtml(item.id)}">
          <button type="button" class="mcard-hit" aria-label="Ver detalles de ${escHtml(item.name)}"></button>
          <div class="mcard-media">
            <img src="${escHtml(imgSrc)}" alt="${escHtml(item.name)}" class="mcard-img" loading="lazy" width="244" height="305">
            <div class="mcard-floating-tags">${badgeHtml}</div>
            <button type="button" class="mcard-quick-plus" data-quick-add="${escHtml(item.id)}" data-cta="card-quick-add" aria-label="Agregar ${escHtml(item.name)} ${escHtml(V.bagAddPrep)}">+</button>
          </div>
          <div class="mcard-body">
            <div class="mcard-meta-row">${brandHtml}<span class="mcard-rating" aria-label="Calificación ${escHtml(ratingVal)} de 5">★ ${escHtml(ratingVal)}</span></div>
            <h3 class="mcard-title">${escHtml(item.name)}</h3>
            ${shadesHtml}
            <div class="mcard-compact-bottom"><strong class="mcard-price">$${priceFormatted}</strong><span class="mcard-tap-hint">Ver más →</span></div>
          </div>
        </article>`;
        })
        .join('');

      return `<section class="category-shelf" data-shelf-category="${escHtml(cat)}" aria-label="Colección ${escHtml(cat)}">
        <div class="shelf-header">
          <h3 class="shelf-title">${escHtml(cat)}</h3>
          <div class="shelf-nav-group">
            <span class="shelf-hint">${catItems.length} ${escHtml(V.unitPlural)} · Desliza →</span>
            <button type="button" class="shelf-nav-btn" data-shelf-scroll="prev" aria-label="Anterior en ${escHtml(cat)}">‹</button>
            <button type="button" class="shelf-nav-btn" data-shelf-scroll="next" aria-label="Siguiente en ${escHtml(cat)}">›</button>
          </div>
        </div>
        <div class="shelf-carousel">${cardsHtml}</div>
      </section>`;
    })
    .join('');
}

function bindInteractiveCatalogEvents() {
  const onCategorySelect = (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    activeCategory = btn.getAttribute('data-category') || 'ALL';
    runWithViewTransition(() => {
      renderCategoryPills(currentCatalog);
      renderCatalog(currentCatalog);
    });
  };

  const medallionsContainer = document.getElementById('category-medallions');
  if (medallionsContainer && medallionsContainer.dataset.bound !== 'true') {
    medallionsContainer.dataset.bound = 'true';
    medallionsContainer.addEventListener('click', onCategorySelect);
  }

  const bagList = document.getElementById('bag-items-list');
  if (bagList && bagList.dataset.bound !== 'true') {
    bagList.dataset.bound = 'true';
    bagList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bag-action]');
      const row = e.target.closest('[data-bag-index]');
      if (!btn || !row) return;
      const index = Number(row.getAttribute('data-bag-index'));
      const action = btn.getAttribute('data-bag-action');
      if (action === 'inc') changeBagQty(index, 1);
      else if (action === 'dec') changeBagQty(index, -1);
      else if (action === 'remove') removeFromBag(index);
    });
  }

  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput && searchInput.dataset.bound !== 'true') {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value || '';
      renderCatalog(currentCatalog);
    });
  }

  const catalogRoot = document.getElementById('catalogo');
  if (catalogRoot && catalogRoot.dataset.bound !== 'true') {
    catalogRoot.dataset.bound = 'true';
    catalogRoot.addEventListener('click', (e) => {
      if (!e.target.closest('[data-reset-catalog]')) return;
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      renderCategoryPills(currentCatalog);
      renderCatalog(currentCatalog);
    });
  }

  const grid = document.getElementById('catalog-grid');
  if (grid && grid.dataset.bound !== 'true') {
    grid.dataset.bound = 'true';
    bindShelfCarouselControls(grid);
    grid.addEventListener('click', (e) => {
      if (e.target.closest('[data-reset-catalog]')) return;
      const quickAdd = e.target.closest('[data-quick-add]');
      if (quickAdd) {
        const quickItem = currentCatalog.find((i) => i.id === quickAdd.getAttribute('data-quick-add'));
        if (quickItem) {
          const quickChoice = resolveItemChoices(quickItem);
          addToBag(quickItem, quickChoice ? quickChoice.defaultChoice : '');
          showToast(quickItem.name + V.addedToastSuffix);
        }
        return;
      }
      const card = e.target.closest('.mcard[data-id]');
      if (!card) return;
      const itemId = card.getAttribute('data-id');
      const found = currentCatalog.find((i) => i.id === itemId);
      if (found) {
        openProductDetailModal(found);
      }
    });
  }

  document.querySelectorAll('[data-hotspot-index]').forEach((pin) => {
    if (pin.dataset.bound === 'true') return;
    pin.dataset.bound = 'true';
    pin.addEventListener('click', () => {
      const idx = parseInt(pin.getAttribute('data-hotspot-index') || '0', 10);
      const targetItem = currentCatalog[idx] || currentCatalog[0];
      if (targetItem) {
        openProductDetailModal(targetItem);
      }
    });
  });

  const detailDialog = document.getElementById('product-detail-dialog');
  if (detailDialog && detailDialog.dataset.bound !== 'true') {
    detailDialog.dataset.bound = 'true';
    detailDialog.addEventListener('click', (e) => {
      const shadeBtn = e.target.closest('.shade-pill[data-shade]');
      if (shadeBtn) {
        selectedShade = shadeBtn.getAttribute('data-shade') || DEFAULT_CHOICE;
        detailDialog.querySelectorAll('.shade-pill').forEach((p) => p.classList.remove('active'));
        shadeBtn.classList.add('active');
        const itemId = shadeBtn.getAttribute('data-item-id');
        const foundItem = currentCatalog.find((i) => i.id === itemId);
        const waLink = document.getElementById('modal-wa-order-link');
        if (foundItem && waLink) {
          const priceFormatted = parsePrice(foundItem.priceUsd).toFixed(2);
          const waMsg = `Hola ${SITE_CONFIG.BUSINESS_NAME}, me interesa pedir: ${foundItem.brand ? foundItem.brand + ' - ' : ''}${foundItem.name} (${selectedShade} · $${priceFormatted} USD). ${V.waDetailQuestion}`;
          waLink.setAttribute('href', buildWhatsAppUrl(waMsg, 'ficha-producto'));
        }
        return;
      }

      const addBtn = e.target.closest('[data-modal-add-id]');
      if (!addBtn) return;
      const itemId = addBtn.getAttribute('data-modal-add-id');
      const found = currentCatalog.find((i) => i.id === itemId);
      if (!found) return;
      addToBag(found, selectedShade);
      addBtn.textContent = '✓ Agregado';
      setTimeout(() => {
        addBtn.textContent = '+ ' + BAG_ACTION_LABEL;
      }, 950);
    });
  }
}

let outsideCatalogBound = false;
export function bindOutsideCatalogEvents() {
  if (outsideCatalogBound) return;
  outsideCatalogBound = true;
  document.addEventListener('click', (event) => {
    const quick = event.target.closest('[data-quick-add]');
    if (quick && !quick.closest('#catalog-grid')) {
      const quickItem = currentCatalog.find((item) => item.id === quick.getAttribute('data-quick-add'));
      if (quickItem) {
        const quickChoice = resolveItemChoices(quickItem);
        addToBag(quickItem, quickChoice ? quickChoice.defaultChoice : '');
        showToast(quickItem.name + V.addedToastSuffix);
      }
      return;
    }
    const card = event.target.closest('.product-card[data-id]');
    if (card && !card.closest('#catalog-grid')) {
      const found = currentCatalog.find((item) => item.id === card.getAttribute('data-id'));
      if (found) openProductDetailModal(found);
    }
  });
}

let activeSiteSettings = null;

export function applySiteSettings(rawSettings) {
  const settings = rawSettings && rawSettings.settings && typeof rawSettings.settings === 'object' ? rawSettings.settings : rawSettings;
  if (!settings || typeof settings !== 'object') return;
  activeSiteSettings = settings;
  const phones = Array.isArray(settings.contactPhones) ? settings.contactPhones : [];
  if (phones.length > 0) {
    const primary = String(phones[0] || '').trim();
    const digits = primary.replace(/[^0-9]/g, '');
    if (digits) {
      SITE_CONFIG.WA_NUMBER = digits;
      document.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const q = href.indexOf('?');
        a.setAttribute('href', 'https://wa.me/' + encodeURIComponent(digits) + (q >= 0 ? href.slice(q) : ''));
      });
    }
    const safeTel = primary.replace(/[^+\d\s()-]/g, '').trim();
    if (/\d/.test(safeTel)) {
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
        a.setAttribute('href', 'tel:' + safeTel);
        a.textContent = safeTel;
      });
    }
  }
  const textBindings = [
    ['[data-setting="business-hours"]', settings.businessHours],
    ['[data-setting="promo-headline"]', settings.promoHeadline],
    ['[data-setting="delivery-eta"]', settings.deliveryEta],
    ['[data-setting="contact-phones"]', phones.length > 0 ? phones.join(' · ') : ''],
    ['[data-setting="payment-methods"]', Array.isArray(settings.paymentMethods) ? settings.paymentMethods.join(' · ') : ''],
  ];
  for (const [sel, val] of textBindings) {
    if (val) document.querySelectorAll(sel).forEach((el) => { el.textContent = val; });
  }
  if (settings.businessHours) {
    document.querySelectorAll('.status-bar .status-item').forEach((el) => {
      if ((el.textContent || '').trim().startsWith('Horario:')) el.textContent = 'Horario: ' + settings.businessHours;
    });
  }
  if (settings.announcementText !== undefined) {
    document.querySelectorAll('[data-setting="announcement"], .top-announcement').forEach((el) => {
      el.textContent = settings.announcementText;
      el.hidden = !settings.announcementText;
    });
  }
  renderBagModal();
}

let imageFallbackBound = false;
export function bindImageFallback() {
  if (imageFallbackBound) return;
  imageFallbackBound = true;
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    img.src = 'assets/hero-showcase.svg';
  }, true);
}

export function bindDomainActionForm() {
  const form = document.getElementById('domain-action-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  const today = new Date().toISOString().slice(0, 10);
  form.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.getAttribute('min')) input.setAttribute('min', today);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = form.getAttribute('aria-label') || 'Solicitud';
    const lines = [];
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      const val = String(field.value || '').trim();
      if (!val) return;
      const labelEl = field.id ? form.querySelector(`label[for="${field.id}"]`) : null;
      const labelText = labelEl ? labelEl.textContent.trim() : field.name;
      lines.push(`• ${labelText}: ${val}`);
    });
    const msg = `Hola ${SITE_CONFIG.BUSINESS_NAME}, quiero confirmar mi ${title}:\n${lines.join('\n')}`;
    const waHref = buildWhatsAppUrl(msg, 'formulario-reservas');
    const email = SITE_CONFIG.CONTACT_EMAIL || '';
    const statusBox = document.getElementById('domain-form-status');
    if (email) {
      const mailHref = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(title + ' — ' + SITE_CONFIG.BUSINESS_NAME) + '&body=' + encodeURIComponent(msg);
      if (statusBox) {
        statusBox.hidden = false;
        statusBox.innerHTML = `<span>Solicitud lista para enviar a <strong>${escHtml(email)}</strong>.</span> <a href="${escHtml(mailHref)}" class="btn-outline">Abrir correo</a> <a href="${escHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="btn-outline">O vía WhatsApp</a>`;
      }
      window.location.href = mailHref;
      return;
    }
    if (statusBox) {
      statusBox.hidden = false;
      statusBox.innerHTML = `<span>Solicitud lista para confirmar por WhatsApp.</span> <a href="${escHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="btn-outline">Abrir WhatsApp</a>`;
    }
    window.open(waHref, '_blank', 'noopener,noreferrer');
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bindImageFallback();
  initCtaTracking();
  initStickyCta();
  initSiteShell();
  initThemeToggle();
  initPreviewDialog();
  renderCategoryPills(currentCatalog);
  renderCatalog(currentCatalog);
  renderBagModal();
  bindInteractiveCatalogEvents();
  bindOutsideCatalogEvents();
  bindDomainActionForm();

  document.addEventListener('karamel:navigate', () => {
    bindImageFallback();
    initPreviewDialog();
    bindDomainActionForm();
    if (document.getElementById('catalog-grid')) {
      initStickyCta();
      renderCategoryPills(currentCatalog);
      renderCatalog(currentCatalog);
      renderBagModal();
      bindInteractiveCatalogEvents();
    }
    if (activeSiteSettings) applySiteSettings(activeSiteSettings);
  });
  loadSiteSettings().then((settings) => {
    if (settings) applySiteSettings(settings);
  });
  loadCatalogData().then(({ items, source }) => {
    if ((source === 'supabase' || source === 'local-preview') && Array.isArray(items)) {
      currentCatalog = items;
      renderCategoryPills(currentCatalog);
      renderCatalog(currentCatalog);
    }
  });
}
