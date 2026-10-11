/**
 * Visitor journey drawer: segment, explanation, score breakdown, signals and
 * a session-by-session timeline (icon, time, page, properties per event).
 */
import { getLang, localized } from '../i18n.js';
import { d, segmentLabel, sourceLabel, escapeHTML } from './strings.js';
import { EVENT_ICONS, DEVICE_ICONS } from './icons.js';

const KEY_EVENTS = new Set(['add_to_cart', 'checkout_start', 'purchase', 'newsletter_signup']);
const SIGNALS = ['sessions', 'activeDays', 'distinctProducts', 'filtersApplied', 'sizeGuideViews', 'addToCart', 'checkoutStarts', 'purchases'];

let productNames = new Map();
let lastFocus = null;

export function setProducts(products) {
  productNames = new Map(products.map((p) => [p.id, p.name]));
}

const locale = () => (getLang() === 'pt' ? 'pt-PT' : 'en-GB');
const money = (n) => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR' }).format(n);
const productName = (id) => (productNames.has(id) ? localized(productNames.get(id)) : id);
const time = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dateTime = (iso) =>
  new Date(iso).toLocaleString(locale(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const chip = (text) => `<span class="prop">${escapeHTML(text)}</span>`;

/** Human label + property chips for one event. */
function describe(event) {
  const p = event.properties ?? {};
  const label = d(`event.${event.type}`);
  switch (event.type) {
    case 'scroll_depth':
      return { label: `${label} ${p.depth}%`, chips: [] };
    case 'click_cta':
      return { label: `${label} “${p.cta.replace(/_/g, ' ')}”`, chips: p.href ? [`→ ${p.href}`] : [] };
    case 'view_product':
      return { label: `${label} · ${productName(p.productId)}`, chips: [money(p.price), p.category, ...(p.onSale ? ['sale'] : [])] };
    case 'apply_filter':
      return { label: `${label} · ${p.filter}`, chips: [p.value] };
    case 'view_size_guide':
      return { label: `${label} · ${productName(p.productId)}`, chips: [p.category] };
    case 'add_to_cart':
    case 'remove_from_cart':
      return { label: `${label} · ${productName(p.productId)}`, chips: [`${p.size}`, `× ${p.qty}`, money(p.price)] };
    case 'checkout_start':
      return { label, chips: [`× ${p.itemCount}`, money(p.value)] };
    case 'purchase':
      return { label: `${label} ${p.orderRef}`, chips: [money(p.value), p.delivery] };
    case 'newsletter_signup':
      return { label, chips: [p.source] };
    default:
      return { label, chips: p.pageType ? [p.pageType] : [] };
  }
}

function sessionMeta(session) {
  const minutes = Math.max(1, Math.round((new Date(session.end) - new Date(session.start)) / 60000));
  const acquisition = [sourceLabel(session.source), session.utm?.medium, session.utm?.campaign].filter(Boolean).join(' / ');
  return `${dateTime(session.start)} · ${minutes} min · ${escapeHTML(acquisition)} · ${d(`device.${session.device}`)}`;
}

function timelineHTML(sessions) {
  // Most recent session first; events inside a session stay chronological.
  return [...sessions]
    .reverse()
    .map((session, i) => {
      const items = session.events
        .map((event) => {
          const { label, chips } = describe(event);
          return `
            <li class="timeline__item ${KEY_EVENTS.has(event.type) ? 'timeline__item--key' : ''}">
              <span class="timeline__icon">${EVENT_ICONS[event.type] ?? ''}</span>
              <div>
                <p class="timeline__label">${escapeHTML(label)}</p>
                <span class="timeline__page">${escapeHTML(event.page)}</span>
                ${chips.length ? `<div class="timeline__props">${chips.map(chip).join('')}</div>` : ''}
              </div>
              <time class="timeline__time" datetime="${event.timestamp}">${time(event.timestamp)}</time>
            </li>`;
        })
        .join('');
      return `
        <section class="timeline-session">
          <header class="timeline-session__head">
            <span class="timeline-session__title">${d('detail.session', { n: sessions.length - i })}</span>
            <span class="timeline-session__meta">${sessionMeta(session)}</span>
            <span class="timeline-session__meta" aria-hidden="true">${DEVICE_ICONS[session.device] ?? ''}</span>
          </header>
          <ol class="timeline">${items}</ol>
        </section>`;
    })
    .join('');
}

function breakdownHTML(breakdown) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => Math.abs(v)));
  return `<ul class="breakdown">${entries
    .map(
      ([type, points]) => `
        <li>
          <span>${d(`event.${type}`)}</span>
          <span class="breakdown__bar ${points < 0 ? 'breakdown__bar--negative' : ''}"><span style="width:${(Math.abs(points) / max) * 100}%"></span></span>
          <span class="num">${points > 0 ? '+' : ''}${points}</span>
        </li>`,
    )
    .join('')}</ul>`;
}

function detailHTML(v) {
  const lang = getLang();
  const segColor = `var(--seg-${v.segment})`;
  const tags = v.tags.length
    ? `<p class="muted">${d('detail.alsoMatches')}: ${v.tags.map((tag) => `<span class="tag">${segmentLabel(tag)}</span>`).join('')}</p>`
    : '';
  const signals = SIGNALS.map(
    (key) => `<div class="signal"><span class="signal__value">${v.signals[key]}</span><span class="signal__label">${d(`signal.${key}`)}</span></div>`,
  ).join('');

  return `
    <div class="drawer__top">
      <div>
        <p class="drawer__eyebrow">${d('detail.visitor')}</p>
        <h2 id="drawer-title" class="drawer__title">${escapeHTML(v.id)}</h2>
        <p class="muted">${d('detail.firstSeen')}: ${dateTime(v.firstSeen)} · ${d('detail.lastSeen')}: ${dateTime(v.lastSeen)}</p>
      </div>
      <button type="button" class="drawer__close" data-close-drawer aria-label="${d('detail.close')}">×</button>
    </div>

    <div class="drawer__summary" style="--seg-color:${segColor}">
      <div>
        <span class="segment-badge drawer__segment" style="--seg-color:${segColor}">${segmentLabel(v.segment)}</span>
        ${tags}
      </div>
      <div class="drawer__score">
        <span class="drawer__score-value">${v.score}</span>
        <span class="drawer__score-label">${d('detail.intent')} / 100</span>
      </div>
    </div>

    <h3>${d('detail.why')}</h3>
    <p class="explanation" style="--seg-color:${segColor}">${escapeHTML(v.explanation[lang] ?? v.explanation.en)}</p>

    <h3>${d('detail.signals')}</h3>
    <div class="signal-grid">${signals}</div>

    <h3>${d('detail.breakdown')}</h3>
    ${breakdownHTML(v.scoreBreakdown)}

    <h3>${d('detail.timeline')}</h3>
    ${timelineHTML(v.sessions)}`;
}

const drawer = () => document.querySelector('[data-drawer]');
const backdrop = () => document.querySelector('[data-drawer-backdrop]');

export async function openDrawer(id) {
  const el = drawer();
  const content = el.querySelector('[data-drawer-content]');
  if (el.hidden) lastFocus = document.activeElement;
  el.hidden = false;
  backdrop().hidden = false;
  document.body.style.overflow = 'hidden';
  content.innerHTML = `<p class="muted">${d('state.loading')}</p>`;
  el.focus();

  try {
    const res = await fetch(`/api/dashboard/visitors/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(String(res.status));
    content.innerHTML = detailHTML(await res.json());
  } catch {
    content.innerHTML = `
      <div class="drawer__top">
        <p>${d('detail.notFound')}</p>
        <button type="button" class="drawer__close" data-close-drawer aria-label="${d('detail.close')}">×</button>
      </div>`;
  }
}

export function closeDrawer() {
  if (drawer().hidden) return;
  drawer().hidden = true;
  backdrop().hidden = true;
  document.body.style.overflow = '';
  lastFocus?.focus?.();
}
