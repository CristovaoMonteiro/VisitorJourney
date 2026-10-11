import { CONFIG } from './config.js';
import { t, getLang, setLang, LANGS, applyTranslations, formatPrice } from './i18n.js';
import { cartCount } from './cart.js';
import { monogramSVG } from './placeholder.js';

const NAV_CATEGORIES = ['shirts', 'knitwear', 'trousers', 'outerwear', 'accessories'];

function headerHTML(active) {
  const lang = getLang();
  const categoryLinks = NAV_CATEGORIES.map(
    (c) => `<li><a href="/collection?category=${c}" data-cta="nav_${c}">${t(`category.${c}`)}</a></li>`,
  ).join('');
  const langButtons = LANGS.map(
    (l) =>
      `<button type="button" class="lang-btn" data-lang="${l}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`,
  ).join('<span aria-hidden="true">/</span>');

  return `
    <a class="skip-link" href="#main">${t('nav.skip')}</a>
    <div class="announcement">${t('banner.shipping', { amount: formatPrice(CONFIG.shipping.freeThreshold) })}</div>
    <div class="header-bar container">
      <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="main-nav">
        <span class="menu-toggle__icon" aria-hidden="true"></span>
        <span class="visually-hidden">${t('nav.menu')}</span>
      </button>
      <a href="/" class="logo" data-cta="logo">${CONFIG.brand.name}</a>
      <nav id="main-nav" class="main-nav" aria-label="Main">
        <ul>
          <li><a href="/collection" data-cta="nav_collection" ${active === 'collection' ? 'aria-current="page"' : ''}>${t('nav.collection')}</a></li>
          ${categoryLinks}
        </ul>
      </nav>
      <div class="header-actions">
        <div class="lang-switch" role="group" aria-label="${t('lang.label')}">${langButtons}</div>
        <a href="/cart" class="bag-link" data-cta="nav_bag" ${active === 'cart' ? 'aria-current="page"' : ''}>
          ${t('nav.cart')} <span class="bag-count" data-cart-count>${cartCount()}</span>
        </a>
      </div>
    </div>`;
}

function footerHTML() {
  const brand = CONFIG.brand;
  const shopLinks = CONFIG.categories
    .map((c) => `<li><a href="/collection?category=${c}">${t(`category.${c}`)}</a></li>`)
    .join('');
  return `
    <div class="container footer-monogram">
      ${monogramSVG(brand.name.charAt(0).toUpperCase(), { size: 72 })}
    </div>
    <div class="container footer-grid">
      <div>
        <p class="logo logo--footer">${brand.name}</p>
        <p class="muted">${brand.tagline[getLang()]}</p>
      </div>
      <div>
        <h2 class="footer-title">${t('footer.shop')}</h2>
        <ul class="footer-links">${shopLinks}</ul>
      </div>
      <div>
        <h2 class="footer-title">${t('footer.help')}</h2>
        <ul class="footer-links">
          <li><span>${t('footer.help.shipping')}</span></li>
          <li><span>${t('footer.help.returns')}</span></li>
          <li><span>${t('footer.help.sizes')}</span></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© ${new Date().getFullYear()} ${brand.name}. ${t('footer.rights')}</p>
      <p>${brand.footerNote[getLang()]}</p>
    </div>`;
}

function bindHeader(header) {
  const toggle = header.querySelector('.menu-toggle');
  const nav = header.querySelector('.main-nav');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });

  header.querySelectorAll('[data-lang]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === getLang()) return;
      setLang(btn.dataset.lang);
      // Pages render from data on load, so a reload is the simplest consistent re-render.
      window.location.reload();
    }),
  );

  window.addEventListener('cart:change', () => {
    header.querySelector('[data-cart-count]').textContent = cartCount();
  });
}

/**
 * Shared bootstrap for every store page: header, footer, translations and title.
 * @param {{ titleKey?: string, title?: string, active?: string }} options
 */
export function initLayout({ titleKey, title, active } = {}) {
  document.documentElement.lang = getLang();

  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if (header) {
    header.innerHTML = headerHTML(active);
    bindHeader(header);
    // Lets full-screen sections subtract the real (sticky) header height.
    const syncHeight = () =>
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    syncHeight();
    window.addEventListener('resize', syncHeight, { passive: true });
  }
  if (footer) footer.innerHTML = footerHTML();

  applyTranslations();
  setTitle(title ?? (titleKey ? t(titleKey) : ''));
}

export function setTitle(pageTitle) {
  document.title = pageTitle ? `${pageTitle} · ${CONFIG.brand.name}` : CONFIG.brand.name;
}

let toastTimer;
/** Shows a short, accessible status message. `html` lets callers add a link. */
export function showToast(html) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }
  toast.innerHTML = html;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
}

/** Escapes text before it is interpolated into HTML templates. */
export function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
