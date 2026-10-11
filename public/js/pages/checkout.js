import { CONFIG } from '../config.js';
import { t, localized, formatPrice } from '../i18n.js';
import { initLayout, setTitle } from '../layout.js';
import { getProducts } from '../catalog.js';
import { priceCart, clearCart } from '../cart.js';

const root = document.querySelector('[data-checkout-root]');

/** Short, non-sequential demo reference. Not linked to any person. */
function orderReference() {
  const prefix = CONFIG.brand.name.slice(0, 3).toUpperCase();
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function summaryHTML(cart) {
  const lines = cart.lines
    .map(
      (l) => `
        <li>
          <span>${localized(l.product.name)} <span class="muted">× ${l.qty}</span></span>
          <span>${formatPrice(l.lineTotal)}</span>
        </li>`,
    )
    .join('');
  return `
    <h2 class="summary__title">${t('cart.summary')}</h2>
    <ul class="summary__lines">${lines}</ul>
    <dl class="summary__rows">
      <div><dt>${t('cart.subtotal')}</dt><dd>${formatPrice(cart.subtotal)}</dd></div>
      <div><dt>${t('cart.shipping')}</dt><dd>${cart.shipping === 0 ? t('cart.shipping.free') : formatPrice(cart.shipping)}</dd></div>
      <div class="summary__total"><dt>${t('cart.total')}</dt><dd>${formatPrice(cart.total)}</dd></div>
    </dl>`;
}

function optionHTML(name, value, label, extra = '', checked = false) {
  return `
    <label class="choice">
      <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} />
      <span class="choice__label">${label}</span>
      ${extra ? `<span class="choice__extra">${extra}</span>` : ''}
    </label>`;
}

function formHTML(cart) {
  const standardPrice = cart.subtotal >= CONFIG.shipping.freeThreshold ? t('cart.shipping.free') : formatPrice(CONFIG.shipping.standard);
  return `
    <div class="checkout-layout">
      <form class="checkout-form" data-checkout-form>
        <p class="notice">${t('checkout.demo')}</p>
        <fieldset class="checkout-group">
          <legend>${t('checkout.delivery')}</legend>
          ${optionHTML('delivery', 'standard', t('checkout.delivery.standard'), standardPrice, true)}
          ${optionHTML('delivery', 'express', t('checkout.delivery.express'), formatPrice(CONFIG.shipping.express))}
        </fieldset>
        <fieldset class="checkout-group">
          <legend>${t('checkout.payment')}</legend>
          ${optionHTML('payment', 'card', t('checkout.payment.card'), '', true)}
          ${optionHTML('payment', 'wallet', t('checkout.payment.wallet'))}
        </fieldset>
        <button type="submit" class="btn btn--primary btn--block" data-cta="place_order">${t('checkout.place')}</button>
      </form>
      <aside class="summary" data-summary>${summaryHTML(cart)}</aside>
    </div>`;
}

function confirmationHTML(ref) {
  return `
    <div class="confirmation">
      <p class="confirmation__mark" aria-hidden="true">✓</p>
      <p>${t('checkout.done.text', { ref: `<strong>${ref}</strong>` })}</p>
      <a href="/" class="btn btn--secondary" data-cta="confirmation_home">${t('checkout.done.back')}</a>
    </div>`;
}

async function init() {
  initLayout({ titleKey: 'checkout.title' });
  const products = await getProducts();
  let cart = priceCart(products);

  if (cart.lines.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <p>${t('checkout.empty')}</p>
        <a href="/collection" class="btn btn--primary">${t('cart.continue')}</a>
      </div>`;
    return;
  }

  root.innerHTML = formHTML(cart);
  window.dispatchEvent(new CustomEvent('checkout:start', { detail: { cart } }));

  const form = root.querySelector('[data-checkout-form]');
  form.addEventListener('change', () => {
    cart = priceCart(products, form.elements.delivery.value);
    root.querySelector('[data-summary]').innerHTML = summaryHTML(cart);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ref = orderReference();
    const order = { ref, cart, delivery: form.elements.delivery.value, payment: form.elements.payment.value };
    clearCart();
    window.dispatchEvent(new CustomEvent('purchase', { detail: order }));

    document.querySelector('[data-checkout-title]').textContent = t('checkout.done.title');
    setTitle(t('checkout.done.title'));
    root.innerHTML = confirmationHTML(ref);
    window.scrollTo({ top: 0 });
  });
}

init();
