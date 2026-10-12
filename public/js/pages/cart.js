import { CONFIG } from '../config.js';
import { t, localized, formatPrice } from '../i18n.js';
import { initLayout } from '../layout.js';
import { getProducts } from '../catalog.js';
import { priceCart, setQty, removeItem, MAX_QTY } from '../cart.js';
import { productSVG } from '../placeholder.js';

const root = document.querySelector('[data-cart-root]');

function sizeLabel(size) {
  return size === 'ONE' ? t('product.oneSize') : size;
}

function lineHTML(line) {
  const { product, size, qty } = line;
  const name = localized(product.name);
  return `
    <li class="cart-line" data-product-id="${product.id}" data-size="${size}">
      <a href="/product?slug=${product.slug}" class="cart-line__media" tabindex="-1" aria-hidden="true">
        ${productSVG(product)}
      </a>
      <div class="cart-line__info">
        <a href="/product?slug=${product.slug}" class="cart-line__name">${name}</a>
        <p class="muted">${localized(product.color.name)} · ${t('cart.size')} ${sizeLabel(size)}</p>
        <p class="muted">${formatPrice(product.price)}</p>
      </div>
      <div class="cart-line__qty" role="group" aria-label="${t('cart.qty')}">
        <button type="button" class="qty-btn" data-action="decrease" aria-label="${t('cart.decrease')}">−</button>
        <span class="qty-value" aria-live="polite">${qty}</span>
        <button type="button" class="qty-btn" data-action="increase" aria-label="${t('cart.increase')}"
          ${qty >= MAX_QTY ? 'disabled' : ''}>+</button>
      </div>
      <p class="cart-line__total">${formatPrice(line.lineTotal)}</p>
      <button type="button" class="btn btn--link btn--small cart-line__remove" data-action="remove">
        ${t('cart.remove')}
      </button>
    </li>`;
}

function summaryHTML({ subtotal, shipping }) {
  const remaining = CONFIG.shipping.freeThreshold - subtotal;
  return `
    <aside class="summary" aria-labelledby="summary-title">
      <h2 id="summary-title" class="summary__title">${t('cart.summary')}</h2>
      <dl class="summary__rows">
        <div><dt>${t('cart.subtotal')}</dt><dd>${formatPrice(subtotal)}</dd></div>
        <div><dt>${t('cart.shipping')}</dt><dd>${shipping === 0 ? t('cart.shipping.free') : formatPrice(shipping)}</dd></div>
        <div class="summary__total"><dt>${t('cart.total')}</dt><dd>${formatPrice(subtotal + shipping)}</dd></div>
      </dl>
      ${remaining > 0 ? `<p class="summary__hint">${t('cart.shipping.remaining', { amount: formatPrice(remaining) })}</p>` : ''}
      <a href="/checkout" class="btn btn--primary btn--block" data-cta="cart_checkout">${t('cart.checkout')}</a>
      <a href="/collection" class="btn btn--link btn--block" data-cta="cart_continue">${t('cart.continue')}</a>
    </aside>`;
}

function render(products) {
  const cart = priceCart(products);
  if (cart.lines.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <p>${t('cart.empty')}</p>
        <a href="/collection" class="btn btn--primary" data-cta="cart_empty_shop">${t('cart.continue')}</a>
      </div>`;
    return;
  }
  root.innerHTML = `
    <div class="cart-layout">
      <ul class="cart-lines">${cart.lines.map(lineHTML).join('')}</ul>
      ${summaryHTML(cart)}
    </div>`;
}

async function init() {
  initLayout({ titleKey: 'cart.title', active: 'cart' });
  const products = await getProducts();
  render(products);

  root.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const lineEl = button.closest('.cart-line');
    const { productId, size } = lineEl.dataset;
    const line = priceCart(products).lines.find((l) => l.productId === productId && l.size === size);
    if (!line) return;

    const { action } = button.dataset;
    if (action === 'increase') {
      setQty(productId, size, line.qty + 1);
      window.dispatchEvent(new CustomEvent('cart:add', { detail: { product: line.product, size, qty: 1 } }));
    } else if (action === 'decrease') {
      setQty(productId, size, line.qty - 1);
      window.dispatchEvent(
        new CustomEvent('cart:remove', { detail: { product: line.product, size, qty: 1 } }),
      );
    } else if (action === 'remove') {
      removeItem(productId, size);
      window.dispatchEvent(
        new CustomEvent('cart:remove', { detail: { product: line.product, size, qty: line.qty } }),
      );
    }
    render(products);
  });
}

init();
