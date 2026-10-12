import { CONFIG } from '../config.js';
import { t, localized, formatPrice } from '../i18n.js';
import { initLayout, setTitle, showToast, escapeHTML } from '../layout.js';
import { getProducts, isOnSale } from '../catalog.js';
import { addItem } from '../cart.js';
import { productSVG } from '../placeholder.js';
import { priceHTML, productCardHTML } from '../components.js';
import { openSizeGuide } from '../sizeguide.js';

const root = document.querySelector('[data-product-root]');

function notFoundHTML() {
  return `
    <div class="empty-state">
      <p>${t('product.notFound')}</p>
      <a href="/collection" class="btn btn--secondary">${t('product.back')}</a>
    </div>`;
}

function sizeOptionsHTML(product) {
  if (product.sizes.length === 1 && product.sizes[0] === 'ONE') {
    return `
      <label class="size-option size-option--wide">
        <input type="radio" name="size" value="ONE" checked />
        <span>${t('product.oneSize')}</span>
      </label>`;
  }
  return product.sizes
    .map(
      (size) => `
        <label class="size-option">
          <input type="radio" name="size" value="${size}" />
          <span>${size}</span>
        </label>`,
    )
    .join('');
}

function productHTML(product) {
  const name = localized(product.name);
  const details = localized(product.details)
    .map((d) => `<li>${escapeHTML(d)}</li>`)
    .join('');
  const delivery = t('product.delivery.text', {
    standard: formatPrice(CONFIG.shipping.standard),
    free: formatPrice(CONFIG.shipping.freeThreshold),
    express: formatPrice(CONFIG.shipping.express),
  });

  return `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/collection">${t('nav.collection')}</a>
      <span aria-hidden="true">/</span>
      <a href="/collection?category=${product.category}">${t(`category.${product.category}`)}</a>
    </nav>

    <article class="product">
      <div class="product__media">
        ${productSVG(product, { label: name, shadow: true })}
        ${isOnSale(product) ? `<span class="badge">${t('product.sale')}</span>` : ''}
      </div>

      <div class="product__info">
        <h1 class="product__name">${name}</h1>
        <p class="product__price">${priceHTML(product)}</p>
        <p class="product__description">${escapeHTML(localized(product.description))}</p>

        <p class="product__colour">
          <span class="label">${t('product.colour')}:</span>
          <span class="swatch" style="background:${product.color.hex}" aria-hidden="true"></span>
          ${localized(product.color.name)}
        </p>

        <form class="product__form" novalidate data-add-form>
          <fieldset class="size-picker">
            <legend class="label">${t('product.size')}</legend>
            ${
              product.sizeGuide
                ? `<button type="button" class="btn btn--link btn--small size-picker__guide" data-size-guide>${t('product.sizeGuide')}</button>`
                : ''
            }
            <div class="size-picker__options">${sizeOptionsHTML(product)}</div>
            <p class="form-error" role="alert" data-size-error></p>
          </fieldset>
          <button type="submit" class="btn btn--primary btn--block" data-cta="add_to_cart">${t('product.add')}</button>
        </form>

        <details class="accordion" open>
          <summary>${t('product.details')}</summary>
          <ul class="detail-list">${details}</ul>
        </details>
        <details class="accordion">
          <summary>${t('product.delivery')}</summary>
          <p class="muted">${delivery}</p>
        </details>
      </div>
    </article>`;
}

function bindProduct(product) {
  const form = root.querySelector('[data-add-form]');
  const error = root.querySelector('[data-size-error]');

  root.querySelector('[data-size-guide]')?.addEventListener('click', () => {
    openSizeGuide(product.sizeGuide);
    window.dispatchEvent(new CustomEvent('sizeguide:open', { detail: { product } }));
  });

  form.addEventListener('change', () => {
    error.textContent = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const size = form.elements.size.value;
    if (!size) {
      error.textContent = t('product.selectSize');
      return;
    }
    addItem(product.id, size, 1);
    showToast(`${t('product.added')} <a href="/cart" data-cta="toast_view_bag">${t('product.viewBag')}</a>`);
    window.dispatchEvent(new CustomEvent('cart:add', { detail: { product, size, qty: 1 } }));
  });
}

function renderRelated(product, products) {
  // Same category first, then others, so the list is never empty.
  const related = products
    .filter((p) => p.id !== product.id)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 4);
  document.querySelector('[data-related]').innerHTML = related
    .map((p) => productCardHTML(p, { ctaPrefix: 'related' }))
    .join('');
  document.querySelector('[data-related-section]').hidden = false;
}

async function init() {
  initLayout({ active: 'collection' });
  const slug = new URLSearchParams(window.location.search).get('slug');
  const products = await getProducts();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    setTitle(t('product.notFound'));
    root.innerHTML = notFoundHTML();
    return;
  }

  setTitle(localized(product.name));
  root.innerHTML = productHTML(product);
  bindProduct(product);
  renderRelated(product, products);
  window.dispatchEvent(new CustomEvent('product:view', { detail: { product } }));
}

init();
