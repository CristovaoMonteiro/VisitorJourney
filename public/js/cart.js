import { CONFIG } from './config.js';

const CART_KEY = 'orlo_cart';
const MAX_QTY = 10;

/** Cart lines are stored as `{ productId, size, qty }`; prices always come from the catalogue. */
export function getCart() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked: the cart simply won't persist across pages.
  }
  window.dispatchEvent(new CustomEvent('cart:change', { detail: { items } }));
}

export function addItem(productId, size, qty = 1) {
  const items = getCart();
  const line = items.find((i) => i.productId === productId && i.size === size);
  if (line) line.qty = Math.min(line.qty + qty, MAX_QTY);
  else items.push({ productId, size, qty });
  save(items);
}

export function setQty(productId, size, qty) {
  const items = getCart()
    .map((i) => (i.productId === productId && i.size === size ? { ...i, qty: Math.min(qty, MAX_QTY) } : i))
    .filter((i) => i.qty > 0);
  save(items);
}

export function removeItem(productId, size) {
  save(getCart().filter((i) => !(i.productId === productId && i.size === size)));
}

export function clearCart() {
  save([]);
}

export const cartCount = () => getCart().reduce((sum, i) => sum + i.qty, 0);

/**
 * Joins cart lines with catalogue data and computes totals.
 * Lines whose product no longer exists are dropped.
 */
export function priceCart(products, method = 'standard') {
  const lines = getCart()
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { ...item, product, lineTotal: product.price * item.qty } : null;
    })
    .filter(Boolean);

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const freeShipping = subtotal >= CONFIG.shipping.freeThreshold && method === 'standard';
  const shipping = lines.length === 0 || freeShipping ? 0 : CONFIG.shipping[method];

  return { lines, subtotal, shipping, total: subtotal + shipping };
}

export { MAX_QTY };
