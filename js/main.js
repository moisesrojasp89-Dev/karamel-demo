import { CATALOG_ITEMS } from './data.js';
import { SITE_CONFIG } from './config.js';
import { loadCatalogData } from './data-fetch.js';
import { initSiteShell } from './components/site-shell.js';
import {
  closeTopLayer,
  runWithViewTransition,
  initThemeToggle,
  bindShelfCarouselControls,
} from './components/catalog-ui.js';
import { initCtaTracking, initStickyCta, showToast } from './components/cta.js';

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
let selectedShade = 'Tono Original';
let currentCatalog = [...CATALOG_ITEMS];

export function buildWhatsAppUrl(message, origin) {
  const phone = SITE_CONFIG.WA_NUMBER || '';
  const text = origin ? message + '\n[Ref: ' + origin + ']' : message;
  return `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;
}

export function initPreviewDialog() {
  const dialogs = document.querySelectorAll('dialog.preview-dialog');
  dialogs.forEach((dialog) => {
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
      btn.addEventListener('click', () => {
        renderBagModal();
        bagDialog.showModal();
      });
    });
  } else {
    document.querySelectorAll('#open-bag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.href = '/#catalogo';
      });
    });
  }
}

export function openProductDetailModal(item) {
  const detailDialog = document.getElementById('product-detail-dialog');
  const contentBox = document.getElementById('product-detail-content');
  if (!detailDialog || !contentBox || !item) return;

  selectedShade = 'Tono Original';
  const shades = ['Tono Original', 'Rose Glow', 'Soft Nude', 'Berry Velvet'];
  const priceFormatted = parsePrice(item.priceUsd).toFixed(2);
  const stockNum = typeof item.stock === 'number' ? item.stock : 15;
  const lowStockClass = stockNum <= 5 ? 'low-stock' : '';
  const stockLabel = stockNum <= 5 ? `¡Últimas ${stockNum} unidades en stock!` : `Disponible: ${stockNum} unidades en stock`;
  const ratingVal = typeof item.rating === 'number' ? item.rating.toFixed(1) : '4.9';
  const imgSrc = item.imageUrl || 'assets/hero-showcase.svg';
  const waMsg = `Hola ${SITE_CONFIG.BUSINESS_NAME}, me interesa pedir: ${item.brand ? item.brand + ' - ' : ''}${item.name} (${selectedShade} · $${priceFormatted} USD). ¿Tienen disponibilidad inmediata?`;
  const waHref = buildWhatsAppUrl(waMsg, 'ficha-producto');

  const shadePillsHtml = shades
    .map(
      (sh, idx) =>
        `<button type="button" class="shade-pill ${idx === 0 ? 'active' : ''}" data-shade="${escHtml(sh)}" data-item-id="${escHtml(item.id)}"><span class="shade-swatch-dot"></span>${escHtml(sh)}</button>`
    )
    .join('');

  contentBox.innerHTML = `
    <div class="pd-scroll">
      <div class="pd-layout">
        <div class="pd-media">
          <img src="${escHtml(imgSrc)}" alt="${escHtml(item.name)}" width="480" height="600">
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
          <div class="pd-shades">
            <span class="shade-selector-label">Tono / acabado</span>
            <div class="shade-selector-row">${shadePillsHtml}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="pd-footer">
      <div class="pd-buy-row">
        <strong class="mcard-price">$${priceFormatted} USD</strong>
      </div>
      <div class="pd-actions">
        <a id="modal-wa-order-link" href="${escHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="btn-wa-card" data-cta="ficha-whatsapp">Pedir por WhatsApp</a>
        <button type="button" class="btn-bag-add" data-cta="ficha-bolso" data-modal-add-id="${escHtml(item.id)}">+ Bolso</button>
      </div>
      <ul class="pd-trust">
        <li>✓ 100% original</li>
        <li>✓ Despacho inmediato</li>
        <li>✓ Atención directa por WhatsApp</li>
      </ul>
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
    (e) => '• ' + e.qty + 'x ' + e.item.name + ' [' + (e.shade || 'Tono Original') + '] ($' + parsePrice(e.item.priceUsd).toFixed(2) + ' c/u)'
  );
  return 'Hola ' + SITE_CONFIG.BUSINESS_NAME + ', quiero realizar este pedido:\n' + lines.join('\n') + '\n\nTotal estimado: $' + totalUsd.toFixed(2) + ' USD';
}

function updateStickyCta(units, totalUsd) {
  const count = document.getElementById('sticky-bag-count');
  const total = document.getElementById('sticky-bag-total');
  const wa = document.getElementById('sticky-wa-link');
  if (count) count.textContent = String(units);
  if (total) total.textContent = '$' + totalUsd.toFixed(2);
  if (wa) {
    const href = units > 0
      ? buildWhatsAppUrl(buildBagMessage(totalUsd), 'barra-fija-bolso')
      : buildWhatsAppUrl('Hola ' + SITE_CONFIG.BUSINESS_NAME + ', quiero asesoría personalizada.', 'barra-fija');
    wa.setAttribute('href', href);
  }
}

export function addToBag(item, shade) {
  const existing = bagState.find((entry) => entry.item.id === item.id && entry.shade === shade);
  if (existing) {
    existing.qty += 1;
  } else {
    bagState.push({ item, qty: 1, shade });
  }
  renderBagModal();
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
    listNode.innerHTML = '<p class="mcard-desc">Tu bolso está vacío. Agrega productos del catálogo para armar tu pedido por WhatsApp.</p>';
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
          <span>${escHtml(entry.shade || 'Tono Original')} · $${unit.toFixed(2)} c/u</span>
        </div>
        <strong class="bag-item-total">$${(unit * entry.qty).toFixed(2)}</strong>
        <div class="bag-qty" role="group" aria-label="Cantidad de ${name}">
          <button type="button" data-bag-action="dec" aria-label="Quitar una unidad de ${name}">−</button>
          <output aria-live="polite">${entry.qty}</output>
          <button type="button" data-bag-action="inc" aria-label="Agregar una unidad de ${name}">+</button>
        </div>
        <button type="button" class="bag-remove" data-bag-action="remove" aria-label="Eliminar ${name} del bolso">Eliminar</button>
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

export function renderCategoryPills(items) {
  const medallionsContainer = document.getElementById('category-medallions');
  const groups = groupByCategory(items);
  const categories = Array.from(groups.keys());

  if (medallionsContainer) {
    const entries = [['ALL', items], ...groups.entries()];
    medallionsContainer.innerHTML = entries
      .map(([cat, catItems]) => {
        const label = cat === 'ALL' ? 'Todos' : cat;
        const sampleImg = catItems.find((i) => i.imageUrl)?.imageUrl || 'assets/hero-showcase.svg';
        const isAct = activeCategory === cat ? 'active' : '';
        return `<button type="button" class="medallion-card ${isAct}" data-category="${escHtml(cat)}" aria-pressed="${activeCategory === cat}">
          <div class="medallion-circle">
            <img src="${escHtml(sampleImg)}" alt="${escHtml(label)}" class="medallion-img" loading="lazy" width="84" height="84">
          </div>
          <span class="medallion-title">${escHtml(label)}</span>
          <span class="medallion-count">${catItems.length} productos</span>
        </button>`;
      })
      .join('');
  }
}

export function renderCatalog(items) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const filtered = items.filter((item) => {
    const matchesCat = activeCategory === 'ALL' || item.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesCat;
    const hay = `${item.name} ${item.brand || ''} ${item.category} ${item.description}`.toLowerCase();
    return matchesCat && hay.includes(q);
  });

  const countNode = document.getElementById('catalog-visible-count');
  if (countNode) {
    countNode.textContent = `${filtered.length} de ${items.length} productos`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <h3 class="shelf-title">Sin resultados para tu búsqueda</h3>
      <p class="mcard-desc">Prueba con otra marca o categoría, o limpia los filtros.</p>
      <button type="button" class="btn-outline" data-reset-catalog>Ver todo el catálogo</button>
    </div>`;
    return;
  }

  const groupedCategories = Array.from(groupByCategory(filtered).entries());

  grid.innerHTML = groupedCategories
    .map(([cat, catItems]) => {
      const cardsHtml = catItems
        .map((item) => {
          const priceFormatted = parsePrice(item.priceUsd).toFixed(2);
          const brandHtml = item.brand
            ? `<span class="mcard-brand">${escHtml(item.brand)}</span>`
            : `<span class="mcard-brand">${escHtml(SITE_CONFIG.BUSINESS_NAME)}</span>`;
          const badgeHtml = item.badge ? `<span class="mcard-badge">${escHtml(item.badge)}</span>` : '';
          const imgSrc = item.imageUrl || 'assets/hero-showcase.svg';

          return `
        <article class="mcard" data-id="${escHtml(item.id)}">
          <button type="button" class="mcard-hit" aria-label="Ver detalles de ${escHtml(item.name)}"></button>
          <div class="mcard-media">
            <img src="${escHtml(imgSrc)}" alt="${escHtml(item.name)}" class="mcard-img" loading="lazy" width="220" height="220">
            <div class="mcard-floating-tags">
              ${badgeHtml}
            </div>
            <button type="button" class="mcard-quick-plus" data-quick-add="${escHtml(item.id)}" data-cta="card-quick-add" aria-label="Agregar ${escHtml(item.name)} al bolso">+</button>
          </div>
          <div class="mcard-body">
            ${brandHtml}
            <h3 class="mcard-title">${escHtml(item.name)}</h3>
            <span class="stars-gold" aria-hidden="true">★★★★★</span>
            <div class="mcard-compact-bottom">
              <strong class="mcard-price">$${priceFormatted}</strong>
              <span class="mcard-tap-hint">Ver más →</span>
            </div>
          </div>
        </article>`;
        })
        .join('');

      return `
      <section class="category-shelf" aria-label="Colección ${escHtml(cat)}">
        <div class="shelf-header">
          <h3 class="shelf-title">${escHtml(cat)} (${catItems.length})</h3>
          <div class="shelf-nav-group">
            <span class="shelf-hint">Desliza</span>
            <button type="button" class="shelf-nav-btn" data-shelf-scroll="prev" aria-label="Anterior en ${escHtml(cat)}">‹</button>
            <button type="button" class="shelf-nav-btn" data-shelf-scroll="next" aria-label="Siguiente en ${escHtml(cat)}">›</button>
          </div>
        </div>
        <div class="shelf-carousel">
          ${cardsHtml}
        </div>
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
    }, 'catalog-visible-count');
    const catalogSection = document.getElementById('catalogo');
    if (catalogSection && e.currentTarget?.id === 'category-medallions') {
      catalogSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const medallionsContainer = document.getElementById('category-medallions');
  if (medallionsContainer) medallionsContainer.addEventListener('click', onCategorySelect);

  const bagList = document.getElementById('bag-items-list');
  if (bagList) {
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
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value || '';
      renderCatalog(currentCatalog);
    });
  }

  const grid = document.getElementById('catalog-grid');
  if (grid) {
    bindShelfCarouselControls(grid);
    grid.addEventListener('click', (e) => {
      if (e.target.closest('[data-reset-catalog]')) {
        activeCategory = 'ALL';
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        renderCategoryPills(currentCatalog);
        renderCatalog(currentCatalog);
        return;
      }
      const quickAdd = e.target.closest('[data-quick-add]');
      if (quickAdd) {
        const quickItem = currentCatalog.find((i) => i.id === quickAdd.getAttribute('data-quick-add'));
        if (quickItem) {
          addToBag(quickItem, 'Tono Original');
          showToast(quickItem.name + ' agregado al bolso');
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
    pin.addEventListener('click', () => {
      const idx = parseInt(pin.getAttribute('data-hotspot-index') || '0', 10);
      const targetItem = currentCatalog[idx] || currentCatalog[0];
      if (targetItem) {
        openProductDetailModal(targetItem);
      }
    });
  });

  const detailDialog = document.getElementById('product-detail-dialog');
  if (detailDialog) {
    detailDialog.addEventListener('click', (e) => {
      const shadeBtn = e.target.closest('.shade-pill[data-shade]');
      if (shadeBtn) {
        selectedShade = shadeBtn.getAttribute('data-shade') || 'Tono Original';
        detailDialog.querySelectorAll('.shade-pill').forEach((p) => p.classList.remove('active'));
        shadeBtn.classList.add('active');
        const itemId = shadeBtn.getAttribute('data-item-id');
        const foundItem = currentCatalog.find((i) => i.id === itemId);
        const waLink = document.getElementById('modal-wa-order-link');
        if (foundItem && waLink) {
          const priceFormatted = parsePrice(foundItem.priceUsd).toFixed(2);
          const waMsg = `Hola ${SITE_CONFIG.BUSINESS_NAME}, me interesa pedir: ${foundItem.brand ? foundItem.brand + ' - ' : ''}${foundItem.name} (${selectedShade} · $${priceFormatted} USD). ¿Tienen disponibilidad inmediata?`;
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
        addBtn.textContent = '+ Bolso';
      }, 950);
    });
  }
}

export function bindImageFallback() {
  document.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = 'true';
      img.src = 'assets/hero-showcase.svg';
    },
    true
  );
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

  document.addEventListener('karamel:navigate', (e) => {
    const path = e.detail?.path || window.location.pathname;
    bindImageFallback();
    initPreviewDialog();
    if (path === '/' || path === '/index.html') {
      initStickyCta();
      renderCategoryPills(currentCatalog);
      renderCatalog(currentCatalog);
      renderBagModal();
      bindInteractiveCatalogEvents();
    }
  });
  loadCatalogData().then(({ items, source }) => {
    if (source === 'supabase' && Array.isArray(items) && items.length > 0) {
      currentCatalog = items;
      renderCategoryPills(currentCatalog);
      renderCatalog(currentCatalog);
    }
  });
}
