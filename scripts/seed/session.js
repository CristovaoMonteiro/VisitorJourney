/**
 * Builds one browsing session the way the real tracker records it: same event
 * types, pages, CTA ids and properties as public/js/tracker.js, with
 * realistic think time between actions.
 */
const products = require('../../data/products.json');

const SHIPPING = { standard: 6.95, express: 14.95, freeThreshold: 150 };
const isOnSale = (p) => p.compareAtPrice != null && p.compareAtPrice > p.price;
const round2 = (n) => Math.round(n * 100) / 100;

const PAGE_TYPES = {
  '/': 'home',
  '/collection': 'collection',
  '/product': 'product',
  '/cart': 'cart',
  '/checkout': 'checkout',
};

class SessionBuilder {
  /**
   * @param {{ rng: object, visitorId: string, start: number, source: object, device: string, out: object[] }} options
   */
  constructor({ rng, visitorId, start, source, device, out }) {
    this.rng = rng;
    this.visitorId = visitorId;
    this.sessionId = rng.uuid();
    this.t = start;
    this.source = source;
    this.device = device;
    this.out = out;
    this.page = '/';
    this.cart = [];
  }

  /** Advances the clock by a random think time. */
  wait(minSeconds, maxSeconds) {
    this.t += Math.round(this.rng.float(minSeconds, maxSeconds) * 1000);
    return this;
  }

  emit(type, properties = {}) {
    this.out.push({
      eventId: this.rng.uuid(),
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      type,
      timestamp: new Date(this.t),
      page: this.page,
      // Acquisition is a session property, as in the tracker.
      referrer: this.source.referrer ?? null,
      utm_source: this.source.utm?.source ?? null,
      utm_medium: this.source.utm?.medium ?? null,
      utm_campaign: this.source.utm?.campaign ?? null,
      device: this.device,
      properties,
    });
    return this;
  }

  visit(path) {
    this.page = path;
    return this.emit('page_view', { pageType: PAGE_TYPES[path] ?? 'other' });
  }

  scroll(maxDepth) {
    [25, 50, 75, 100]
      .filter((depth) => depth <= maxDepth)
      .forEach((depth) => this.wait(2, 9).emit('scroll_depth', { depth }));
    return this;
  }

  click(cta, href) {
    return this.emit('click_cta', href ? { cta, href } : { cta });
  }

  /** Navigates via a CTA: click, then the next page loads a moment later. */
  navigate(cta, path) {
    this.wait(4, 25).click(cta, path);
    return this.wait(0.5, 2).visit(path);
  }

  goToCollection(cta = 'nav_collection') {
    if (this.page !== '/collection') this.navigate(cta, '/collection');
    return this;
  }

  filter(filter, value) {
    return this.wait(3, 15).emit('apply_filter', { filter, value: String(value) });
  }

  viewProduct(product, cta = 'collection_product') {
    this.navigate(cta, '/product');
    this.emit('view_product', {
      productId: product.id,
      category: product.category,
      price: product.price,
      onSale: isOnSale(product),
    });
    if (this.rng.chance(0.55)) this.scroll(this.rng.pick([25, 50, 75]));
    return this.wait(8, 50);
  }

  sizeGuide(product) {
    return this.wait(4, 20).emit('view_size_guide', { productId: product.id, category: product.category });
  }

  addToCart(product, qty = 1) {
    const size = this.rng.pick(product.sizes);
    this.wait(5, 30).click('add_to_cart');
    this.emit('add_to_cart', {
      productId: product.id,
      category: product.category,
      price: product.price,
      size,
      qty,
      onSale: isOnSale(product),
    });
    this.cart.push({ product, size, qty });
    return this;
  }

  removeFromCart() {
    const line = this.cart.pop();
    if (!line) return this;
    return this.wait(5, 20).emit('remove_from_cart', {
      productId: line.product.id,
      category: line.product.category,
      price: line.product.price,
      size: line.size,
      qty: line.qty,
    });
  }

  totals(delivery = 'standard') {
    const subtotal = this.cart.reduce((sum, l) => sum + l.product.price * l.qty, 0);
    const shipping = delivery === 'standard' && subtotal >= SHIPPING.freeThreshold ? 0 : SHIPPING[delivery];
    return {
      itemCount: this.cart.reduce((sum, l) => sum + l.qty, 0),
      value: round2(subtotal + shipping),
      shipping,
    };
  }

  goToCart() {
    return this.navigate(this.rng.pick(['nav_bag', 'toast_view_bag']), '/cart');
  }

  startCheckout() {
    this.navigate('cart_checkout', '/checkout');
    const { itemCount, value } = this.totals();
    return this.emit('checkout_start', { itemCount, value });
  }

  purchase() {
    const delivery = this.rng.chance(0.15) ? 'express' : 'standard';
    const { itemCount, value, shipping } = this.totals(delivery);
    this.wait(20, 90).click('place_order');
    this.emit('purchase', {
      orderRef: `${this.brandCode ?? 'ORL'}-${this.rng.code(6)}`,
      itemCount,
      value,
      shipping,
      delivery,
    });
    this.cart = [];
    return this;
  }

  newsletterSignup() {
    if (this.page !== '/') this.navigate('logo', '/');
    this.scroll(100);
    return this.wait(10, 30).emit('newsletter_signup', { source: 'club' });
  }

  /** End of the session; returns the timestamp of its last event. */
  end() {
    return this.t;
  }
}

module.exports = { SessionBuilder, products, isOnSale };
