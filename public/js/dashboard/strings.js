import { getLang } from '../i18n.js';
import { CONFIG } from '../config.js';

const STRINGS = {
  en: {
    title: 'Visitor Journey',
    subtitle: 'Who visits {brand}, what they do and how close they are to buying.',
    viewStore: 'View store',
    'theme.label': 'Theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'Auto',

    'filters.label': 'Filters',
    'filters.range': 'Period',
    'filters.7': 'Last 7 days',
    'filters.30': 'Last 30 days',
    'filters.90': 'Last 90 days',
    'filters.custom': 'Custom',
    'filters.from': 'From',
    'filters.to': 'To',
    'filters.segment': 'Segment',
    'filters.source': 'Source',
    'filters.device': 'Device',
    'filters.all': 'All',
    'filters.reset': 'Reset filters',

    'kpi.visitors': 'Visitors',
    'kpi.sessions': 'Sessions',
    'kpi.addToCartRate': 'Add-to-bag rate',
    'kpi.purchaseRate': 'Purchase rate',
    'kpi.vsPrevious': 'vs previous {n} days',
    'kpi.noPrevious': 'no data in the previous period',
    'kpi.rateHint': 'of sessions',

    'funnel.title': 'Funnel',
    'funnel.hint': 'Sessions that reached each step',
    'funnel.visit': 'Visit',
    'funnel.product': 'Product',
    'funnel.cart': 'Bag',
    'funnel.checkout': 'Checkout',
    'funnel.purchase': 'Purchase',
    'funnel.ofVisits': '{pct} of visits',
    'funnel.stepRate': '{pct} from previous step',

    'segments.title': 'Segments',
    'segments.hint': 'Visitors by primary segment · click a bar to filter',
    'daily.title': 'Sessions per day',
    'daily.hint': 'Sessions started each day',

    'table.view': 'Table',
    'table.chart': 'Chart',
    'col.step': 'Step',
    'col.sessions': 'Sessions',
    'col.ofVisits': '% of visits',
    'col.stepRate': '% from previous',
    'col.segment': 'Segment',
    'col.visitors': 'Visitors',
    'col.share': 'Share',
    'col.date': 'Date',

    'visitors.title': 'Visitors',
    'visitors.search': 'Search visitor ID',
    'visitors.count': '{n} visitors',
    'visitors.empty': 'No visitors match these filters.',
    'visitors.col.id': 'Visitor',
    'visitors.col.segment': 'Segment',
    'visitors.col.score': 'Intent',
    'visitors.col.sessions': 'Sessions',
    'visitors.col.lastActivity': 'Last activity',
    'visitors.col.source': 'Source',
    'visitors.col.device': 'Device',
    'visitors.prev': 'Previous',
    'visitors.next': 'Next',
    'visitors.page': 'Page {page} of {pages}',
    'visitors.open': 'Open journey of visitor {id}',

    'detail.close': 'Close',
    'detail.visitor': 'Visitor',
    'detail.intent': 'Intent score',
    'detail.why': 'Why this segment',
    'detail.alsoMatches': 'Also matches',
    'detail.breakdown': 'Where the score comes from',
    'detail.signals': 'Signals',
    'detail.timeline': 'Journey',
    'detail.session': 'Session {n}',
    'detail.firstSeen': 'First seen',
    'detail.lastSeen': 'Last seen',
    'detail.notFound': 'This visitor could not be found.',
    'detail.points': '{n} pts',

    'signal.sessions': 'Sessions',
    'signal.activeDays': 'Active days',
    'signal.distinctProducts': 'Products viewed',
    'signal.filtersApplied': 'Filters used',
    'signal.sizeGuideViews': 'Size guide',
    'signal.addToCart': 'Added to bag',
    'signal.checkoutStarts': 'Checkouts',
    'signal.purchases': 'Orders',

    'device.desktop': 'Desktop',
    'device.mobile': 'Mobile',
    'source.direct': 'Direct',

    'event.page_view': 'Viewed page',
    'event.scroll_depth': 'Scrolled',
    'event.click_cta': 'Clicked',
    'event.view_product': 'Viewed product',
    'event.apply_filter': 'Applied filter',
    'event.view_size_guide': 'Opened size guide',
    'event.add_to_cart': 'Added to bag',
    'event.remove_from_cart': 'Removed from bag',
    'event.checkout_start': 'Started checkout',
    'event.purchase': 'Placed order',
    'event.newsletter_signup': 'Joined newsletter',

    'state.loading': 'Loading…',
    'state.error': 'The analytics could not be loaded. Is the database connected?',
    'state.empty': 'No sessions in this period yet. Run `npm run seed` or browse the store with analytics accepted.',
  },

  pt: {
    title: 'Visitor Journey',
    subtitle: 'Quem visita a {brand}, o que faz e quão perto está de comprar.',
    viewStore: 'Ver loja',
    'theme.label': 'Tema',
    'theme.light': 'Claro',
    'theme.dark': 'Escuro',
    'theme.system': 'Auto',

    'filters.label': 'Filtros',
    'filters.range': 'Período',
    'filters.7': 'Últimos 7 dias',
    'filters.30': 'Últimos 30 dias',
    'filters.90': 'Últimos 90 dias',
    'filters.custom': 'Personalizado',
    'filters.from': 'De',
    'filters.to': 'Até',
    'filters.segment': 'Segmento',
    'filters.source': 'Origem',
    'filters.device': 'Dispositivo',
    'filters.all': 'Todos',
    'filters.reset': 'Limpar filtros',

    'kpi.visitors': 'Visitantes',
    'kpi.sessions': 'Sessões',
    'kpi.addToCartRate': 'Taxa de adição ao saco',
    'kpi.purchaseRate': 'Taxa de compra',
    'kpi.vsPrevious': 'vs {n} dias anteriores',
    'kpi.noPrevious': 'sem dados no período anterior',
    'kpi.rateHint': 'das sessões',

    'funnel.title': 'Funil',
    'funnel.hint': 'Sessões que chegaram a cada passo',
    'funnel.visit': 'Visita',
    'funnel.product': 'Produto',
    'funnel.cart': 'Saco',
    'funnel.checkout': 'Checkout',
    'funnel.purchase': 'Compra',
    'funnel.ofVisits': '{pct} das visitas',
    'funnel.stepRate': '{pct} do passo anterior',

    'segments.title': 'Segmentos',
    'segments.hint': 'Visitantes por segmento principal · clique numa barra para filtrar',
    'daily.title': 'Sessões por dia',
    'daily.hint': 'Sessões iniciadas em cada dia',

    'table.view': 'Tabela',
    'table.chart': 'Gráfico',
    'col.step': 'Passo',
    'col.sessions': 'Sessões',
    'col.ofVisits': '% das visitas',
    'col.stepRate': '% do anterior',
    'col.segment': 'Segmento',
    'col.visitors': 'Visitantes',
    'col.share': 'Peso',
    'col.date': 'Data',

    'visitors.title': 'Visitantes',
    'visitors.search': 'Procurar ID do visitante',
    'visitors.count': '{n} visitantes',
    'visitors.empty': 'Nenhum visitante corresponde a estes filtros.',
    'visitors.col.id': 'Visitante',
    'visitors.col.segment': 'Segmento',
    'visitors.col.score': 'Intenção',
    'visitors.col.sessions': 'Sessões',
    'visitors.col.lastActivity': 'Última atividade',
    'visitors.col.source': 'Origem',
    'visitors.col.device': 'Dispositivo',
    'visitors.prev': 'Anterior',
    'visitors.next': 'Seguinte',
    'visitors.page': 'Página {page} de {pages}',
    'visitors.open': 'Abrir trajeto do visitante {id}',

    'detail.close': 'Fechar',
    'detail.visitor': 'Visitante',
    'detail.intent': 'Score de intenção',
    'detail.why': 'Porquê este segmento',
    'detail.alsoMatches': 'Também encaixa em',
    'detail.breakdown': 'De onde vem o score',
    'detail.signals': 'Sinais',
    'detail.timeline': 'Trajeto',
    'detail.session': 'Sessão {n}',
    'detail.firstSeen': 'Primeira visita',
    'detail.lastSeen': 'Última visita',
    'detail.notFound': 'Não foi possível encontrar este visitante.',
    'detail.points': '{n} pts',

    'signal.sessions': 'Sessões',
    'signal.activeDays': 'Dias ativos',
    'signal.distinctProducts': 'Produtos vistos',
    'signal.filtersApplied': 'Filtros usados',
    'signal.sizeGuideViews': 'Guia de tamanhos',
    'signal.addToCart': 'Adições ao saco',
    'signal.checkoutStarts': 'Checkouts',
    'signal.purchases': 'Encomendas',

    'device.desktop': 'Desktop',
    'device.mobile': 'Mobile',
    'source.direct': 'Direto',

    'event.page_view': 'Viu página',
    'event.scroll_depth': 'Fez scroll',
    'event.click_cta': 'Clicou',
    'event.view_product': 'Viu produto',
    'event.apply_filter': 'Aplicou filtro',
    'event.view_size_guide': 'Abriu guia de tamanhos',
    'event.add_to_cart': 'Adicionou ao saco',
    'event.remove_from_cart': 'Removeu do saco',
    'event.checkout_start': 'Iniciou checkout',
    'event.purchase': 'Fez encomenda',
    'event.newsletter_signup': 'Aderiu à newsletter',

    'state.loading': 'A carregar…',
    'state.error': 'Não foi possível carregar a análise. A base de dados está ligada?',
    'state.empty': 'Ainda não há sessões neste período. Corra `npm run seed` ou navegue na loja com a análise aceite.',
  },
};

// Segment names mirror server/segmentation/segmentation.js.
const SEGMENT_LABELS = {
  ready_to_buy: { en: 'Ready to buy', pt: 'Pronto a comprar' },
  deal_hunter: { en: 'Deal hunter', pt: 'Caçador de ofertas' },
  comparer: { en: 'Comparer', pt: 'Comparador' },
  returning: { en: 'Returning', pt: 'Regressado' },
  curious: { en: 'Curious', pt: 'Curioso' },
  explorer: { en: 'Explorer', pt: 'Explorador' },
};

export function d(key, vars = {}) {
  const lang = getLang();
  const template = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : name === 'brand' ? CONFIG.brand.name : m));
}

export const segmentLabel = (id) => SEGMENT_LABELS[id]?.[getLang()] ?? id;

export function sourceLabel(source) {
  return source === 'direct' ? d('source.direct') : source;
}

/** Escapes text before it is interpolated into HTML templates. */
export function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

export function applyDashboardTranslations(root = document) {
  root.querySelectorAll('[data-d]').forEach((el) => {
    el.textContent = d(el.dataset.d);
  });
  root.querySelectorAll('[data-d-attr]').forEach((el) => {
    el.dataset.dAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), d(key.trim()));
    });
  });
}
