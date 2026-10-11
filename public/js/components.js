import { t, localized, formatPrice } from './i18n.js';
import { productSVG } from './placeholder.js';
import { isOnSale } from './catalog.js';

export function priceHTML(product) {
  if (!isOnSale(product)) return `<span class="price">${formatPrice(product.price)}</span>`;
  return `
    <span class="price price--sale">${formatPrice(product.price)}</span>
    <s class="price price--was">${formatPrice(product.compareAtPrice)}</s>`;
}

/** Product tile used on the home page, collection grid and related products. */
export function productCardHTML(product, { ctaPrefix = 'card' } = {}) {
  const name = localized(product.name);
  return `
    <article class="product-card">
      <a href="/product?slug=${product.slug}" class="product-card__link"
         data-cta="${ctaPrefix}_product" data-product-id="${product.id}">
        <div class="product-card__media">
          ${productSVG(product, { label: name })}
          ${isOnSale(product) ? `<span class="badge">${t('product.sale')}</span>` : ''}
        </div>
        <h3 class="product-card__name">${name}</h3>
        <p class="product-card__meta">${localized(product.color.name)}</p>
        <p class="product-card__price">${priceHTML(product)}</p>
      </a>
    </article>`;
}
