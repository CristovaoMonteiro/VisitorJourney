/**
 * Chart.js rendering. Colours are read from CSS custom properties at render
 * time, so light/dark mode only needs a re-render, never duplicated values.
 * Marks follow the dashboard's data-viz rules: thin bars with 4px rounded
 * data ends, 2px lines, hairline grid, selective direct labels, hover tooltips.
 */
import { d, segmentLabel } from './strings.js';

const charts = new Map();

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function theme() {
  return {
    ink: css('--ink'),
    ink2: css('--ink-2'),
    muted: css('--ink-muted'),
    grid: css('--grid'),
    line: css('--line'),
    surface: css('--surface'),
    sans: css('--font-sans'),
  };
}

function baseOptions(t) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 400 },
    font: { family: t.sans },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.surface,
        titleColor: t.ink,
        bodyColor: t.ink2,
        borderColor: t.line,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 4,
        displayColors: false,
        titleFont: { family: t.sans, weight: '600' },
        bodyFont: { family: t.sans },
      },
    },
  };
}

/** Draws "value · share" just past the end of each horizontal bar (selective direct labels). */
const endLabels = {
  id: 'endLabels',
  afterDatasetsDraw(chart, args, options) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = `500 12px ${options.font}`;
    ctx.fillStyle = options.color;
    ctx.textBaseline = 'middle';
    meta.data.forEach((bar, i) => {
      ctx.fillText(options.format(i), bar.x + 8, bar.y);
    });
    ctx.restore();
  },
};

/** Vertical hairline under the hovered x position on line charts. */
const crosshair = {
  id: 'crosshair',
  afterDraw(chart, args, options) {
    const active = chart.tooltip?.getActiveElements?.();
    if (!active?.length) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

function draw(key, canvas, config) {
  charts.get(key)?.destroy();
  charts.set(key, new window.Chart(canvas, config));
}

const pct = (n, lang) => new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 }).format(n);
const num = (n, lang) => new Intl.NumberFormat(lang).format(n);

function horizontalScales(t) {
  return {
    x: {
      beginAtZero: true,
      grid: { color: t.grid, drawTicks: false },
      border: { display: false },
      ticks: { color: t.muted, padding: 6, precision: 0, font: { family: t.sans, size: 11 } },
    },
    y: {
      grid: { display: false },
      border: { color: t.line },
      ticks: { color: t.ink2, font: { family: t.sans, size: 12 } },
    },
  };
}

export function renderFunnel(canvas, funnel, locale) {
  const t = theme();
  const colors = funnel.map((_, i) => css(`--funnel-${i + 1}`));
  canvas.setAttribute(
    'aria-label',
    funnel.map((s) => `${d(`funnel.${s.key}`)}: ${num(s.sessions, locale)} (${pct(s.ofFirst, locale)})`).join(', '),
  );
  draw('funnel', canvas, {
    type: 'bar',
    data: {
      labels: funnel.map((s) => d(`funnel.${s.key}`)),
      datasets: [
        {
          data: funnel.map((s) => s.sessions),
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: 'start',
          barPercentage: 0.72,
          categoryPercentage: 0.9,
        },
      ],
    },
    options: {
      ...baseOptions(t),
      indexAxis: 'y',
      layout: { padding: { right: 96 } },
      scales: horizontalScales(t),
      plugins: {
        ...baseOptions(t).plugins,
        tooltip: {
          ...baseOptions(t).plugins.tooltip,
          callbacks: {
            label: (item) => {
              const step = funnel[item.dataIndex];
              const lines = [`${d('col.sessions')}: ${num(step.sessions, locale)}`, d('funnel.ofVisits', { pct: pct(step.ofFirst, locale) })];
              if (item.dataIndex > 0) lines.push(d('funnel.stepRate', { pct: pct(step.ofPrevious, locale) }));
              return lines;
            },
          },
        },
        endLabels: {
          font: t.sans,
          color: t.ink2,
          format: (i) => `${num(funnel[i].sessions, locale)} · ${pct(funnel[i].ofFirst, locale)}`,
        },
      },
    },
    plugins: [endLabels],
  });
}

export function renderSegments(canvas, segments, locale, onSelect) {
  const t = theme();
  const total = segments.reduce((sum, s) => sum + s.visitors, 0);
  canvas.setAttribute('aria-label', segments.map((s) => `${segmentLabel(s.segment)}: ${s.visitors}`).join(', '));
  draw('segments', canvas, {
    type: 'bar',
    data: {
      labels: segments.map((s) => segmentLabel(s.segment)),
      datasets: [
        {
          data: segments.map((s) => s.visitors),
          backgroundColor: segments.map((s) => css(`--seg-${s.segment}`)),
          borderRadius: 4,
          borderSkipped: 'start',
          barPercentage: 0.72,
          categoryPercentage: 0.9,
        },
      ],
    },
    options: {
      ...baseOptions(t),
      indexAxis: 'y',
      layout: { padding: { right: 72 } },
      scales: horizontalScales(t),
      onClick: (event, elements) => {
        if (elements.length) onSelect(segments[elements[0].index].segment);
      },
      onHover: (event, elements) => {
        event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
      },
      plugins: {
        ...baseOptions(t).plugins,
        tooltip: {
          ...baseOptions(t).plugins.tooltip,
          callbacks: {
            label: (item) => `${num(item.raw, locale)} ${d('col.visitors').toLowerCase()} · ${pct(total ? item.raw / total : 0, locale)}`,
          },
        },
        endLabels: {
          font: t.sans,
          color: t.ink2,
          format: (i) => `${num(segments[i].visitors, locale)} · ${pct(total ? segments[i].visitors / total : 0, locale)}`,
        },
      },
    },
    plugins: [endLabels],
  });
}

export function renderDaily(canvas, daily, locale) {
  const t = theme();
  const color = css('--line-series');
  const dayLabel = (date) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  canvas.setAttribute('aria-label', `${d('daily.title')}: ${daily.map((p) => `${p.date} ${p.sessions}`).join(', ')}`);
  draw('daily', canvas, {
    type: 'line',
    data: {
      labels: daily.map((p) => dayLabel(p.date)),
      datasets: [
        {
          data: daily.map((p) => p.sessions),
          borderColor: color,
          borderWidth: 2,
          backgroundColor: `${color}14`,
          fill: 'origin',
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: t.surface,
          pointHoverBorderColor: color,
        },
      ],
    },
    options: {
      ...baseOptions(t),
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { display: false },
          border: { color: t.line },
          ticks: { color: t.muted, maxRotation: 0, autoSkipPadding: 16, font: { family: t.sans, size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: t.grid, drawTicks: false },
          border: { display: false },
          ticks: { color: t.muted, padding: 8, precision: 0, font: { family: t.sans, size: 11 } },
        },
      },
      plugins: {
        ...baseOptions(t).plugins,
        tooltip: {
          ...baseOptions(t).plugins.tooltip,
          callbacks: { label: (item) => `${d('col.sessions')}: ${num(item.raw, locale)}` },
        },
        crosshair: { color: t.line },
      },
    },
    plugins: [crosshair],
  });
}

export function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.clear();
}
