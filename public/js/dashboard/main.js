/**
 * Dashboard controller: filter state (mirrored in the URL), data fetching,
 * KPI tiles, charts, visitor table and the journey drawer.
 */
import { CONFIG } from '../config.js';
import { getLang, setLang } from '../i18n.js';
import { monogramSVG } from '../placeholder.js';
import { d, segmentLabel, sourceLabel, escapeHTML, applyDashboardTranslations } from './strings.js';
import { renderFunnel, renderSegments, renderDaily } from './charts.js';
import { openDrawer, closeDrawer, setProducts } from './detail.js';

const TIME_ZONE = 'Europe/Lisbon';
const THEME_KEY = 'orlo_dash_theme';
const SEGMENTS = ['ready_to_buy', 'deal_hunter', 'comparer', 'returning', 'curious', 'explorer'];

const $ = (selector) => document.querySelector(selector);
const form = $('[data-filters]');

const state = {
  range: '30',
  from: '',
  to: '',
  segment: '',
  source: '',
  device: '',
  sort: 'lastActivity',
  order: 'desc',
  page: 1,
  q: '',
};
let overviewData = null;
let visitorsData = null;
let requestId = 0;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const locale = () => (getLang() === 'pt' ? 'pt-PT' : 'en-GB');
const num = (n) => new Intl.NumberFormat(locale()).format(n);
const pct = (n) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(n);
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE });

function addDays(day, n) {
  const [y, m, dd] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
}

function relativeTime(iso) {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSec) >= seconds) return rtf.format(Math.round(diffSec / seconds), unit);
  }
  return rtf.format(0, 'minute');
}

// ---------------------------------------------------------------------------
// State <-> URL
// ---------------------------------------------------------------------------
function resolvedRange() {
  if (state.range === 'custom' && state.from && state.to) return { from: state.from, to: state.to };
  const to = today();
  return { from: addDays(to, -(Number(state.range) - 1)), to };
}

function filterQuery({ withList = false } = {}) {
  const params = new URLSearchParams(resolvedRange());
  ['segment', 'source', 'device'].forEach((key) => state[key] && params.set(key, state[key]));
  if (withList) {
    params.set('sort', state.sort);
    params.set('order', state.order);
    params.set('page', String(state.page));
    if (state.q) params.set('q', state.q);
  }
  return params.toString();
}

function readURL() {
  const params = new URLSearchParams(window.location.search);
  Object.keys(state).forEach((key) => {
    if (params.has(key)) state[key] = key === 'page' ? Number(params.get(key)) || 1 : params.get(key);
  });
  if (!['7', '30', '90', 'custom'].includes(state.range)) state.range = '30';
}

function writeURL() {
  const params = new URLSearchParams();
  if (state.range !== '30') params.set('range', state.range);
  if (state.range === 'custom') {
    params.set('from', state.from);
    params.set('to', state.to);
  }
  ['segment', 'source', 'device', 'q'].forEach((key) => state[key] && params.set(key, state[key]));
  if (state.sort !== 'lastActivity' || state.order !== 'desc') {
    params.set('sort', state.sort);
    params.set('order', state.order);
  }
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderFilters() {
  const options = overviewData?.options ?? { sources: [], segments: SEGMENTS, devices: ['desktop', 'mobile'] };
  const opt = (value, label, selected) =>
    `<option value="${escapeHTML(value)}" ${selected ? 'selected' : ''}>${escapeHTML(label)}</option>`;

  $('[data-segment-options]').innerHTML = [opt('', d('filters.all'), !state.segment)]
    .concat(options.segments.map((s) => opt(s, segmentLabel(s), s === state.segment)))
    .join('');
  // Keep a selected source visible even if it has no sessions in the new range.
  const sources = state.source && !options.sources.includes(state.source) ? [state.source, ...options.sources] : options.sources;
  $('[data-source-options]').innerHTML = [opt('', d('filters.all'), !state.source)]
    .concat(sources.map((s) => opt(s, sourceLabel(s), s === state.source)))
    .join('');
  $('[data-device-options]').innerHTML = [opt('', d('filters.all'), !state.device)]
    .concat(options.devices.map((s) => opt(s, d(`device.${s}`), s === state.device)))
    .join('');

  form.elements.range.value = state.range;
  const { from, to } = resolvedRange();
  form.elements.from.value = from;
  form.elements.to.value = to;
  document.querySelectorAll('[data-custom-range]').forEach((el) => {
    el.hidden = state.range !== 'custom';
  });
}

function deltaHTML(key, current, previous, days) {
  const isRate = key.endsWith('Rate');
  if (!previous) return `<p class="kpi__delta">${d('kpi.noPrevious')}</p>`;
  const change = isRate ? (current - previous) * 100 : ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  const dir = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const arrow = { up: '▲', down: '▼', flat: '■' }[dir];
  const value = `${rounded > 0 ? '+' : ''}${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(rounded)}${isRate ? ' pp' : '%'}`;
  return `
    <p class="kpi__delta kpi__delta--${dir}">
      <strong><span aria-hidden="true">${arrow}</span> ${value}</strong>
      <span>${d('kpi.vsPrevious', { n: days })}</span>
    </p>`;
}

function renderKPIs() {
  const { kpis, previous, filters } = overviewData;
  const days = Math.round((new Date(filters.to) - new Date(filters.from)) / 86400000) + 1;
  $('[data-kpis]').innerHTML = ['visitors', 'sessions', 'addToCartRate', 'purchaseRate']
    .map((key) => {
      const value = key.endsWith('Rate') ? pct(kpis[key]) : num(kpis[key]);
      return `
        <article class="kpi">
          <h2 class="kpi__label">${d(`kpi.${key}`)}</h2>
          <p class="kpi__value">${value}</p>
          ${deltaHTML(key, kpis[key], previous[key], days)}
        </article>`;
    })
    .join('');
}

function tableHTML(head, rows) {
  return `
    <table class="data-table">
      <thead><tr>${head.map((h, i) => `<th scope="col" class="${i ? 'num' : ''}">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td class="num">${c}</td>` : `<th scope="row">${c}</th>`)).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

function renderCharts() {
  const { funnel, segments, daily } = overviewData;
  const lc = locale();

  renderFunnel($('[data-chart="funnel"]'), funnel, lc);
  $('[data-card="funnel"] [data-table]').innerHTML = tableHTML(
    [d('col.step'), d('col.sessions'), d('col.ofVisits'), d('col.stepRate')],
    funnel.map((s, i) => [d(`funnel.${s.key}`), num(s.sessions), pct(s.ofFirst), i ? pct(s.ofPrevious) : '–']),
  );

  renderSegments($('[data-chart="segments"]'), segments, lc, (segment) => {
    state.segment = state.segment === segment ? '' : segment;
    state.page = 1;
    refresh();
  });
  const total = segments.reduce((sum, s) => sum + s.visitors, 0);
  $('[data-card="segments"] [data-table]').innerHTML = tableHTML(
    [d('col.segment'), d('col.visitors'), d('col.share')],
    segments.map((s) => [segmentLabel(s.segment), num(s.visitors), pct(total ? s.visitors / total : 0)]),
  );

  renderDaily($('[data-chart="daily"]'), daily, lc);
  $('[data-card="daily"] [data-table]').innerHTML = tableHTML(
    [d('col.date'), d('col.sessions')],
    daily.map((p) => [p.date, num(p.sessions)]),
  );
}

function renderVisitors() {
  const { items, total, page, pages } = visitorsData;
  $('[data-visitor-count]').textContent = d('visitors.count', { n: num(total) });

  document.querySelectorAll('[data-visitor-table] th[data-sort]').forEach((th) => {
    if (th.dataset.sort === state.sort) th.setAttribute('aria-sort', state.order === 'asc' ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
  });

  $('[data-visitor-rows]').innerHTML = items.length
    ? items
        .map(
          (v) => `
          <tr data-visitor="${escapeHTML(v.id)}">
            <td><a class="visitor-id" href="#visitor=${escapeHTML(v.id)}" aria-label="${d('visitors.open', { id: v.id.slice(0, 8) })}">${escapeHTML(v.id.slice(0, 8))}</a></td>
            <td>
              <span class="segment-badge" style="--seg-color:var(--seg-${v.segment})">${segmentLabel(v.segment)}</span>
              ${v.tags.map((tag) => `<span class="tag">${segmentLabel(tag)}</span>`).join('')}
            </td>
            <td class="num"><span class="score"><span class="score__bar" aria-hidden="true"><span style="width:${v.score}%"></span></span>${v.score}</span></td>
            <td class="num">${num(v.sessions)}</td>
            <td><time datetime="${v.lastActivity}" title="${new Date(v.lastActivity).toLocaleString(locale())}">${relativeTime(v.lastActivity)}</time></td>
            <td>${escapeHTML(sourceLabel(v.source))}</td>
            <td><span class="muted" title="${d(`device.${v.device}`)}">${d(`device.${v.device}`)}</span></td>
          </tr>`,
        )
        .join('')
    : `<tr class="empty-row"><td colspan="7">${d('visitors.empty')}</td></tr>`;

  $('[data-pagination]').innerHTML =
    pages > 1
      ? `
        <button type="button" class="dash-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${d('visitors.prev')}</button>
        <span>${d('visitors.page', { page, pages })}</span>
        <button type="button" class="dash-btn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>${d('visitors.next')}</button>`
      : '';
}

function renderAll() {
  applyDashboardTranslations();
  document.documentElement.lang = getLang();
  $('[data-subtitle]').textContent = d('subtitle');
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  renderFilters();
  if (!overviewData || !visitorsData) return;
  renderKPIs();
  renderCharts();
  renderVisitors();
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function refresh({ listOnly = false } = {}) {
  writeURL();
  const id = (requestId += 1);
  const content = $('[data-content]');
  const status = $('[data-state]');
  content.classList.add('is-loading');
  if (!overviewData) status.textContent = d('state.loading');

  try {
    const [overview, visitors] = await Promise.all([
      listOnly ? Promise.resolve(overviewData) : getJSON(`/api/dashboard/overview?${filterQuery()}`),
      getJSON(`/api/dashboard/visitors?${filterQuery({ withList: true })}`),
    ]);
    if (id !== requestId) return; // a newer request superseded this one
    overviewData = overview;
    visitorsData = visitors;
    state.page = visitors.page;
    status.textContent = overview.kpis.sessions === 0 ? d('state.empty') : '';
    content.hidden = false;
    renderAll();
  } catch (err) {
    if (id !== requestId) return;
    console.error(err);
    status.textContent = d('state.error');
    if (!overviewData) content.hidden = true;
  } finally {
    if (id === requestId) content.classList.remove('is-loading');
  }
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
function currentThemeChoice() {
  try {
    return localStorage.getItem(THEME_KEY) ?? 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(choice) {
  if (choice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Not persisted; still applied for this visit.
  }
  document.querySelectorAll('[data-theme-option]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeOption === choice)));
  if (overviewData) renderCharts(); // charts read colours from CSS at draw time
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function bind() {
  form.addEventListener('change', (e) => {
    const { name, value } = e.target;
    if (name === 'range') {
      state.range = value;
      if (value === 'custom') Object.assign(state, resolvedRange());
    } else if (name === 'from' || name === 'to') {
      state.range = 'custom';
      state[name] = value;
      if (state.from > state.to) [state.from, state.to] = [state.to, state.from];
    } else {
      state[name] = value;
    }
    state.page = 1;
    refresh();
  });

  $('[data-reset]').addEventListener('click', () => {
    Object.assign(state, { range: '30', from: '', to: '', segment: '', source: '', device: '', page: 1, q: '' });
    $('[data-visitor-search]').value = '';
    refresh();
  });

  let searchTimer;
  $('[data-visitor-search]').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = e.target.value.trim().toLowerCase();
      state.page = 1;
      refresh({ listOnly: true });
    }, 250);
  });

  $('[data-visitor-table] thead').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort;
    state.order = state.sort === key && state.order === 'desc' ? 'asc' : 'desc';
    state.sort = key;
    state.page = 1;
    refresh({ listOnly: true });
  });

  $('[data-visitor-rows]').addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-visitor]');
    if (row && !e.target.closest('a')) window.location.hash = `visitor=${row.dataset.visitor}`;
  });

  $('[data-pagination]').addEventListener('click', (e) => {
    const button = e.target.closest('[data-page]');
    if (!button) return;
    state.page = Number(button.dataset.page);
    refresh({ listOnly: true });
  });

  document.querySelectorAll('[data-toggle-table]').forEach((button) =>
    button.addEventListener('click', () => {
      const card = button.closest('.card');
      const table = card.querySelector('[data-table]');
      const showTable = table.hidden;
      table.hidden = !showTable;
      card.querySelector('.chart-box').hidden = showTable;
      button.dataset.d = showTable ? 'table.chart' : 'table.view';
      button.textContent = d(button.dataset.d);
    }),
  );

  document.querySelectorAll('[data-theme-option]').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.themeOption)));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentThemeChoice() === 'system' && overviewData) renderCharts();
  });

  document.querySelectorAll('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      setLang(b.dataset.lang);
      renderAll();
      routeHash();
    }),
  );

  // Drawer: the URL hash (#visitor=<id>) is the source of truth, so journeys are linkable.
  window.addEventListener('hashchange', routeHash);
  $('[data-drawer-backdrop]').addEventListener('click', () => clearHash());
  $('[data-drawer]').addEventListener('click', (e) => {
    if (e.target.closest('[data-close-drawer]')) clearHash();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('[data-drawer]').hidden) clearHash();
  });
}

function clearHash() {
  history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
  routeHash();
}

function routeHash() {
  const match = window.location.hash.match(/^#visitor=([0-9a-f-]{36})$/i);
  if (match) openDrawer(match[1]);
  else closeDrawer();
}

async function init() {
  $('[data-monogram]').innerHTML = monogramSVG(CONFIG.brand.name.charAt(0).toUpperCase(), { size: 40 });
  $('[data-brand]').textContent = CONFIG.brand.name;
  document.title = `${d('title')} · ${CONFIG.brand.name}`;
  readURL();
  bind();
  applyTheme(currentThemeChoice());
  renderAll();

  getJSON('/api/products').then(setProducts).catch(() => {});
  // Chart.js loads with `defer`; wait for it before the first draw.
  if (!window.Chart) await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  await refresh();
  routeHash();
}

init();
