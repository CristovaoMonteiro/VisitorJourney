import { CONFIG } from '../config.js';
import { t, getLang } from '../i18n.js';
import { initLayout } from '../layout.js';
import { getProducts } from '../catalog.js';
import { productCardHTML } from '../components.js';
import { pictureHTML, initReveal, initParallax } from '../media.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADVISOR_HOURS = ['10:00', '11:30', '14:00', '15:30', '17:00'];

// Responsive `sizes` per slot, so the browser picks the smallest adequate file.
const PHOTO_SIZES = {
  'panel-knitwear': '(max-width: 800px) 100vw, 50vw',
  'panel-shirts': '(max-width: 800px) 100vw, 50vw',
  'material-knit': '(max-width: 800px) 100vw, 60vw',
  'look-window': '(max-width: 800px) 100vw, 40vw',
  'look-shearling': '(max-width: 800px) 50vw, 30vw',
  'look-cuff': '(max-width: 800px) 50vw, 30vw',
  'craft-rack': '(max-width: 800px) 100vw, 40vw',
  advisor: '(max-width: 960px) 100vw, 25vw',
};

function renderPhotos() {
  const hero = document.querySelector('[data-hero-media]');
  hero.innerHTML = pictureHTML('hero', { eager: true, sizes: '100vw' });
  hero.querySelector('picture').dataset.parallax = '0.12';

  document.querySelectorAll('[data-photo]').forEach((slot) => {
    slot.innerHTML = pictureHTML(slot.dataset.photo, { sizes: PHOTO_SIZES[slot.dataset.photo] });
  });
}

function bindEmailForm(form, status, { onSuccess }) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.elements.email;
    if (!EMAIL_RE.test(input.value.trim())) {
      status.textContent = t('home.club.invalid');
      status.classList.add('is-error');
      input.focus();
      return;
    }
    // Demo only: the address is discarded immediately and never leaves the browser.
    form.reset();
    status.classList.remove('is-error');
    status.textContent = t('home.club.success');
    onSuccess();
  });
}

/** Next six working days, labelled in the current UI language. */
function advisorDays() {
  const days = [];
  const date = new Date();
  while (days.length < 6) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    days.push({
      value: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(CONFIG.locales[getLang()], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    });
  }
  return days;
}

function bindAdvisor() {
  const form = document.querySelector('[data-advisor-form]');
  const status = document.querySelector('[data-advisor-status]');
  const daySelect = form.querySelector('[data-advisor-day]');
  daySelect.innerHTML = advisorDays()
    .map((d) => `<option value="${d.value}">${d.label}</option>`)
    .join('');
  form.querySelector('[data-advisor-time]').innerHTML = ADVISOR_HOURS.map(
    (h) => `<option>${h}</option>`,
  ).join('');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const format = form.elements.format.value;
    status.textContent = t('home.advisor.success', {
      format: t(`home.advisor.format.${format}`),
      day: daySelect.selectedOptions[0].textContent,
      time: form.elements.time.value,
    });
    window.dispatchEvent(new CustomEvent('advisor:book', { detail: { format } }));
  });
}

async function init() {
  initLayout({ titleKey: 'home.title' });
  renderPhotos();
  bindEmailForm(document.querySelector('[data-club-form]'), document.querySelector('[data-club-status]'), {
    onSuccess: () =>
      window.dispatchEvent(new CustomEvent('newsletter:signup', { detail: { source: 'club' } })),
  });
  bindAdvisor();

  const products = await getProducts();
  document.querySelector('[data-arrivals]').innerHTML = products
    .filter((p) => p.featured)
    .slice(0, 4)
    .map((p) => productCardHTML(p, { ctaPrefix: 'home_arrivals' }))
    .join('');

  initReveal();
  initParallax();
}

init();
