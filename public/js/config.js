/**
 * Single source of truth for brand and store settings.
 * Change `brand.name` here to rebrand the whole store and dashboard.
 */
export const CONFIG = {
  brand: {
    name: 'Orlo',
    tagline: {
      en: 'Considered menswear, made to last.',
      pt: 'Roupa de homem pensada para durar.',
    },
    // Fictional demo brand: no real company, address or contact.
    footerNote: {
      en: 'Fictional store built as a portfolio demo. No real products are sold.',
      pt: 'Loja fictícia criada como demo de portfólio. Nenhum produto real é vendido.',
    },
  },
  currency: 'EUR',
  defaultLang: 'en',
  // Locale per UI language, used for number and price formatting.
  locales: { en: 'en-IE', pt: 'pt-PT' },
  shipping: {
    standard: 6.95,
    express: 14.95,
    freeThreshold: 150,
  },
  categories: ['shirts', 'polos', 'knitwear', 'trousers', 'outerwear', 'accessories'],
  // Price filter buckets on the collection page, in EUR. `max: null` means no upper bound.
  priceRanges: [
    { id: '0-75', min: 0, max: 75 },
    { id: '75-150', min: 75, max: 150 },
    { id: '150-plus', min: 150, max: null },
  ],
};
