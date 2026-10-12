import { CONFIG } from '../config.js';
import { t, formatPrice } from '../i18n.js';
import { initLayout, setTitle } from '../layout.js';
import { getProducts, isOnSale } from '../catalog.js';
import { productCardHTML } from '../components.js';

const form = document.querySelector('[data-filters]');
const sortSelect = document.querySelector('[data-sort]');

/** Filter state lives in the URL so filtered views can be shared, bookmarked and tracked. */
function readState() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const price = params.get('price');
  return {
    category: CONFIG.categories.includes(category) ? category : 'all',
    price: CONFIG.priceRanges.some((r) => r.id === price) ? price : 'any',
    sale: params.get('sale') === '1',
    sort: ['featured', 'price-asc', 'price-desc'].includes(params.get('sort'))
      ? params.get('sort')
      : 'featured',
  };
}

function writeState(state) {
  const params = new URLSearchParams();
  if (state.category !== 'all') params.set('category', state.category);
  if (state.price !== 'any') params.set('price', state.price);
  if (state.sale) params.set('sale', '1');
  if (state.sort !== 'featured') params.set('sort', state.sort);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

function renderFilterOptions() {
  const categories = ['all', ...CONFIG.categories];
  document.querySelector('[data-category-options]').innerHTML = categories
    .map(
      (c) => `
        <label class="pill">
          <input type="radio" name="category" value="${c}" />
          <span>${t(`category.${c}`)}</span>
        </label>`,
    )
    .join('');

  const priceOptions = [{ id: 'any', label: t('collection.price.any') }].concat(
    CONFIG.priceRanges.map((r) => ({
      id: r.id,
      label: t(`collection.price.${r.id}`, {
        a: formatPrice(r.id === '0-75' ? r.max : r.min),
        b: formatPrice(r.max ?? r.min),
      }),
    })),
  );
  document.querySelector('[data-price-options]').innerHTML = priceOptions
    .map(
      (o) => `
        <label class="radio">
          <input type="radio" name="price" value="${o.id}" />
          <span>${o.label}</span>
        </label>`,
    )
    .join('');
}

function syncControls(state) {
  form.elements.category.value = state.category;
  form.elements.price.value = state.price;
  form.elements.sale.checked = state.sale;
  sortSelect.value = state.sort;
}

function applyFilters(products, state) {
  const range = CONFIG.priceRanges.find((r) => r.id === state.price);
  const filtered = products.filter(
    (p) =>
      (state.category === 'all' || p.category === state.category) &&
      (!range || (p.price >= range.min && (range.max == null || p.price < range.max))) &&
      (!state.sale || isOnSale(p)),
  );
  if (state.sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (state.sort === 'featured') filtered.sort((a, b) => Number(b.featured) - Number(a.featured));
  return filtered;
}

function render(products, state) {
  const results = applyFilters(products, state);
  const heading = state.category === 'all' ? t('collection.title') : t(`category.${state.category}`);
  document.querySelector('[data-collection-title]').textContent = heading;
  setTitle(heading);

  document.querySelector('[data-count]').textContent =
    results.length === 1 ? t('collection.count.one') : t('collection.count', { n: results.length });
  document.querySelector('[data-grid]').innerHTML = results
    .map((p) => productCardHTML(p, { ctaPrefix: 'collection' }))
    .join('');
  document.querySelector('[data-empty]').hidden = results.length > 0;
}

async function init() {
  initLayout({ titleKey: 'collection.title', active: 'collection' });
  renderFilterOptions();

  // Filters start collapsed on small screens to keep products above the fold.
  if (window.matchMedia('(max-width: 800px)').matches) {
    document.querySelector('[data-filters-panel]').removeAttribute('open');
  }

  const products = await getProducts();
  let state = readState();
  syncControls(state);
  render(products, state);

  const update = (changed) => {
    state = {
      category: form.elements.category.value,
      price: form.elements.price.value,
      sale: form.elements.sale.checked,
      sort: sortSelect.value,
    };
    writeState(state);
    render(products, state);
    // Domain event for the tracker (Phase 2): which filter changed and its new value.
    window.dispatchEvent(
      new CustomEvent('filter:apply', { detail: { filter: changed, value: String(state[changed]), state } }),
    );
  };

  form.addEventListener('change', (e) => update(e.target.name));
  sortSelect.addEventListener('change', () => update('sort'));
  document.querySelectorAll('[data-clear]').forEach((btn) =>
    btn.addEventListener('click', () => {
      state = { category: 'all', price: 'any', sale: false, sort: 'featured' };
      syncControls(state);
      writeState(state);
      render(products, state);
      window.dispatchEvent(
        new CustomEvent('filter:apply', { detail: { filter: 'clear', value: 'all', state } }),
      );
    }),
  );
}

init();
