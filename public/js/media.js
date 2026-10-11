import { PHOTOS, PHOTO_WIDTHS } from './photos.js';
import { localized } from './i18n.js';

const srcset = (key, fmt) => PHOTO_WIDTHS.map((w) => `/img/photos/${key}-${w}.${fmt} ${w}w`).join(', ');

/**
 * Responsive <picture> with AVIF, then WebP fallback.
 * Lazy by default; pass `eager: true` only for above-the-fold images (the hero).
 * @param {string} key photo key from data/photos.json
 * @param {{ sizes?: string, eager?: boolean, className?: string }} [options]
 */
export function pictureHTML(key, { sizes = '100vw', eager = false, className = '' } = {}) {
  const photo = PHOTOS[key];
  if (!photo) return '';
  const loading = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return `
    <picture class="photo ${className}">
      <source type="image/avif" srcset="${srcset(key, 'avif')}" sizes="${sizes}" />
      <source type="image/webp" srcset="${srcset(key, 'webp')}" sizes="${sizes}" />
      <img src="/img/photos/${key}-${PHOTO_WIDTHS[1]}.webp" alt="${localized(photo.alt)}"
           width="${photo.width}" height="${photo.height}" ${loading} decoding="async"
           style="object-position:${photo.focus}" />
    </picture>`;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Slow fade-up for elements marked `data-reveal` as they enter the viewport. */
export function initReveal(root = document) {
  const items = root.querySelectorAll('[data-reveal]');
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  items.forEach((el) => observer.observe(el));
}

/** Light parallax: elements marked `data-parallax="0.15"` drift at a fraction of scroll speed. */
export function initParallax(root = document) {
  const items = [...root.querySelectorAll('[data-parallax]')];
  if (reducedMotion() || items.length === 0) return;
  let ticking = false;
  const update = () => {
    items.forEach((el) => {
      const rect = el.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * Number(el.dataset.parallax);
      el.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}
