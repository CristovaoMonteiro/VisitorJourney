/**
 * Segmentation and intent-score settings.
 *
 * Every number that shapes a classification lives here, so rules can be tuned
 * (and reviewed by non-engineers) without touching the logic in segmentation.js.
 */
module.exports = {
  // Calendar days ("came back on another day") are counted in the store's time zone.
  timeZone: 'Europe/Lisbon',

  /**
   * When a visitor matches several segments, the first one in this list becomes the
   * primary segment and the others become tags. Ordered by commercial actionability:
   * buying intent first, loyalty and low engagement last.
   * 'explorer' is the fallback when nothing else matches and is never a tag.
   */
  priority: ['ready_to_buy', 'deal_hunter', 'comparer', 'returning', 'curious'],
  fallback: 'explorer',

  segments: {
    // Clear buying intent: something went into the bag or checkout was opened.
    ready_to_buy: {
      minAddToCart: 1,
      minCheckoutStarts: 1, // either condition is enough
    },

    // Arrived through a promotional or newsletter link AND mostly looks at discounted products.
    deal_hunter: {
      minSaleShare: 0.6, // share of product views that were on sale (0-1)
      minProductViews: 1, // needs at least some product interest to judge the share
    },

    // Researching before deciding: several products plus comparison behaviour.
    comparer: {
      minDistinctProducts: 3,
      // Comparison signals: used filters, opened the size guide, revisited a product.
      minComparisonSignals: 2,
    },

    // Came back on a different calendar day with earlier history.
    returning: {
      minActiveDays: 2,
    },

    // A single short look without engaging. All conditions must hold.
    curious: {
      maxSessions: 1,
      maxPageViews: 1,
      maxSessionSeconds: 30,
      maxInteractions: 0, // events other than page_view and scroll_depth
    },
  },

  /** What counts as a promotional entry for the deal hunter rule (UTMs are lowercase). */
  promo: {
    mediums: ['email', 'newsletter'],
    sources: ['newsletter'],
    // Matched as substrings of utm_campaign, e.g. "autumn-sale", "promo-10".
    campaignKeywords: ['sale', 'promo', 'discount', 'deal', 'outlet', 'saldos', 'desconto', 'black-friday'],
  },

  /**
   * Intent score (0-100): sum over events of weight x recency factor, with an
   * optional cap per event type so passive browsing cannot dominate the score.
   */
  score: {
    // An event loses half of its value every `halfLifeDays` days.
    halfLifeDays: 7,
    max: 100,
    weights: {
      page_view: 1,
      scroll_depth: 0.5,
      click_cta: 1,
      view_product: 3,
      apply_filter: 2,
      view_size_guide: 5,
      add_to_cart: 12,
      remove_from_cart: -4, // second thoughts lower intent
      checkout_start: 20,
      purchase: 25,
      newsletter_signup: 6,
    },
    // Maximum points a single event type can contribute (after recency).
    caps: {
      page_view: 10,
      scroll_depth: 5,
      click_cta: 8,
      view_product: 24,
      apply_filter: 8,
      view_size_guide: 10,
      newsletter_signup: 6,
    },
  },
};
