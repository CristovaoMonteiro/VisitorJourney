/**
 * Behavioural personas for the demo dataset.
 *
 * A persona describes HOW someone browses (sources, device, number of
 * sessions, journey with probabilities). It does not set the segment: the
 * segment is computed afterwards by server/segmentation, exactly as for real
 * visitors, so the seed also exercises the rules.
 */
const { products, isOnSale } = require('./session');

/** Traffic sources. Newsletter sends happen on fixed days (see `sendDaysAgo`). */
const SOURCES = {
  direct: {},
  organic: { referrer: 'google.com' },
  pinterest: { referrer: 'pinterest.com' },
  instagram_ads: { utm: { source: 'instagram', medium: 'paid_social', campaign: 'aw26-quiet-season' } },
  facebook_retargeting: { utm: { source: 'facebook', medium: 'paid_social', campaign: 'aw26-retargeting' } },
  google_ads: { utm: { source: 'google', medium: 'cpc', campaign: 'brand-search' } },
  newsletter: {
    utm: { source: 'newsletter', medium: 'email', campaign: 'autumn-edit' },
    sendDaysAgo: [26, 19, 12, 5],
  },
  newsletter_sale: {
    utm: { source: 'newsletter', medium: 'email', campaign: 'autumn-sale' },
    sendDaysAgo: [12, 5],
  },
  instagram_sale: { utm: { source: 'instagram', medium: 'paid_social', campaign: 'mid-season-sale' } },
};

const saleProducts = products.filter(isOnSale);
const fullPrice = products.filter((p) => !isOnSale(p));
const withSizeGuide = (list) => list.filter((p) => p.sizeGuide);

/** Lands on a page that fits the source (ads usually deep-link, home for direct/organic). */
function land(s, rng, { allowProduct = true } = {}) {
  const paid = Boolean(s.source.utm);
  const roll = rng.next();
  if (allowProduct && paid && roll < 0.35) {
    s.visit('/product');
    const product = rng.pick(products);
    s.emit('view_product', {
      productId: product.id,
      category: product.category,
      price: product.price,
      onSale: isOnSale(product),
    });
    return product;
  }
  if (paid && roll < 0.7) return s.visit('/collection') && null;
  s.visit('/');
  if (rng.chance(0.6)) s.scroll(rng.pick([25, 50, 75]));
  return null;
}

const PERSONAS = {
  // One page, a few seconds, no interaction.
  curious: {
    weight: 0.3,
    mobile: 0.72,
    sources: { direct: 3, organic: 3, instagram_ads: 3, pinterest: 1, google_ads: 1 },
    sessions: () => [{}],
    journey(s, rng) {
      s.visit(rng.chance(0.85) ? '/' : '/collection');
      if (rng.chance(0.5)) s.wait(3, 12).emit('scroll_depth', { depth: 25 });
    },
  },

  // Wanders without a clear pattern: a few pages, at most two products.
  explorer: {
    weight: 0.15,
    mobile: 0.6,
    sources: { direct: 3, organic: 3, instagram_ads: 2, pinterest: 2, newsletter: 1 },
    sessions: () => [{}],
    journey(s, rng) {
      land(s, rng, { allowProduct: false });
      s.goToCollection(rng.pick(['hero_collection', 'nav_collection', 'panel_knitwear']));
      if (rng.chance(0.6)) s.scroll(rng.pick([50, 75, 100]));
      if (rng.chance(0.3)) s.filter('category', rng.pick(['shirts', 'knitwear', 'outerwear']));
      rng.sample(products, rng.int(0, 2)).forEach((p) => s.viewProduct(p));
      if (rng.chance(0.1)) s.newsletterSignup();
    },
  },

  // Researches: many products, filters, size guide, goes back to products already seen.
  comparer: {
    weight: 0.18,
    mobile: 0.45,
    sources: { direct: 2, organic: 4, google_ads: 3, instagram_ads: 2, newsletter: 1, pinterest: 1 },
    sessions: (rng) => (rng.chance(0.35) ? [{}, { gapDays: [1, 6] }] : [{}]),
    journey(s, rng, { sessionIndex, memory }) {
      land(s, rng);
      s.goToCollection();
      const filters = rng.int(1, 3);
      for (let i = 0; i < filters; i += 1) {
        const filter = rng.pick(['category', 'price', 'sort']);
        s.filter(
          filter,
          {
            category: rng.pick(['shirts', 'knitwear', 'trousers', 'outerwear']),
            price: rng.pick(['75-150', '150-plus']),
            sort: 'price-asc',
          }[filter],
        );
      }
      const seen = rng.sample(products, rng.int(sessionIndex === 0 ? 3 : 2, 6));
      seen.forEach((p) => s.viewProduct(p));
      memory.seen = [...(memory.seen ?? []), ...seen];
      if (rng.chance(0.75)) rng.sample(withSizeGuide(seen), rng.int(1, 2)).forEach((p) => s.sizeGuide(p));
      if (rng.chance(0.6)) s.viewProduct(rng.pick(memory.seen), 'related_product');
    },
  },

  // Buying intent: adds to the bag, about two thirds start checkout, half of those buy.
  ready_to_buy: {
    weight: 0.15,
    mobile: 0.55,
    sources: {
      direct: 3,
      organic: 2,
      google_ads: 3,
      instagram_ads: 2,
      facebook_retargeting: 2,
      newsletter: 2,
    },
    sessions: (rng) =>
      rng.chance(0.4)
        ? [
            { browseOnly: true },
            { gapDays: [0, 4], source: ['direct', 'facebook_retargeting', 'newsletter'] },
          ]
        : [{}],
    journey(s, rng, { plan, memory }) {
      const landed = land(s, rng);
      s.goToCollection();
      const browsed = rng.sample(products, rng.int(1, 4));
      browsed.forEach((p) => s.viewProduct(p));
      memory.wanted = memory.wanted ?? landed ?? browsed[0];
      if (rng.chance(0.6) && memory.wanted.sizeGuide) s.sizeGuide(memory.wanted);
      if (plan.browseOnly) return;

      s.viewProduct(memory.wanted, 'related_product');
      s.addToCart(memory.wanted);
      if (rng.chance(0.2)) s.addToCart(rng.pick(browsed));
      if (s.cart.length > 1 && rng.chance(0.25)) s.removeFromCart();
      s.goToCart();
      if (!rng.chance(0.65)) return;
      s.startCheckout();
      if (rng.chance(0.5)) s.purchase();
    },
  },

  // Arrives through promotions and looks almost only at discounted pieces.
  deal_hunter: {
    weight: 0.1,
    mobile: 0.68,
    sources: { newsletter_sale: 6, instagram_sale: 3, newsletter: 1 },
    sessions: (rng) => (rng.chance(0.2) ? [{}, { gapDays: [1, 5] }] : [{}]),
    journey(s, rng) {
      if (!s.source.utm || rng.chance(0.5)) s.visit('/collection');
      else land(s, rng, { allowProduct: false });
      s.goToCollection();
      s.filter('sale', 'true');
      const views = rng.sample(saleProducts, rng.int(2, 5));
      if (rng.chance(0.15)) views.push(rng.pick(fullPrice));
      views.forEach((p) => s.viewProduct(p));
      if (rng.chance(0.3) && views[0].sizeGuide) s.sizeGuide(views[0]);
      if (rng.chance(0.25)) {
        s.addToCart(views[0]);
        s.goToCart();
        if (rng.chance(0.6)) {
          s.startCheckout();
          if (rng.chance(0.55)) s.purchase();
        }
      }
    },
  },

  // Comes back on different days with light browsing; often subscribes.
  returning: {
    weight: 0.12,
    mobile: 0.6,
    sources: { direct: 5, newsletter: 3, organic: 2 },
    sessions: (rng) => [{}, ...Array.from({ length: rng.int(1, 3) }, () => ({ gapDays: [2, 8] }))],
    journey(s, rng, { sessionIndex }) {
      land(s, rng, { allowProduct: false });
      if (rng.chance(0.7)) {
        s.goToCollection(rng.pick(['arrivals_view_all', 'nav_collection', 'panel_shirts']));
        rng.sample(products, rng.int(0, 1)).forEach((p) => s.viewProduct(p));
      }
      if (sessionIndex === 0 && rng.chance(0.3)) s.newsletterSignup();
    },
  },
};

module.exports = { PERSONAS, SOURCES };
