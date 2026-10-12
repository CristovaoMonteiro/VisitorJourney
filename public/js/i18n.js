import { CONFIG } from './config.js';

const LANG_KEY = 'orlo_lang';

const STRINGS = {
  en: {
    'nav.collection': 'Collection',
    'nav.cart': 'Bag',
    'nav.menu': 'Menu',
    'nav.skip': 'Skip to content',
    'banner.shipping': 'Free shipping on orders over {amount} · 30-day returns',

    'category.all': 'All',
    'category.shirts': 'Shirts',
    'category.polos': 'Polos',
    'category.knitwear': 'Knitwear',
    'category.trousers': 'Trousers',
    'category.outerwear': 'Outerwear',
    'category.accessories': 'Accessories',

    'home.title': 'The Quiet Season',
    'home.hero.eyebrow': 'Autumn / Winter 2026',
    'home.hero.title': 'The Quiet Season',
    'home.hero.cta': 'Discover the collection',
    'home.panel.knitwear.eyebrow': 'Knitwear',
    'home.panel.knitwear.title': 'Wool, slowly made',
    'home.panel.knitwear.cta': 'Shop knitwear',
    'home.panel.shirts.eyebrow': 'Shirts & overshirts',
    'home.panel.shirts.title': 'Light through cotton',
    'home.panel.shirts.cta': 'Shop shirts',
    'home.new.title': 'New arrivals',
    'home.new.link': 'View all',
    'home.material.eyebrow': 'Material',
    'home.material.title': 'Lambswool, knitted slowly.',
    'home.material.text':
      'Spun in small batches and knitted on traditional frames, so every sweater keeps its shape and softens with wear.',
    'home.material.cta': 'Explore knitwear',
    'home.lookbook.eyebrow': 'Lookbook',
    'home.lookbook.title': 'Notes on a quiet wardrobe',
    'home.lookbook.1': '01 · Morning light',
    'home.lookbook.2': '02 · City stone',
    'home.lookbook.3': '03 · The cuff',
    'home.lookbook.4': '04 · In the workshop',
    'home.club.eyebrow': 'Membership',
    'home.club.title': 'The {brand} Circle',
    'home.club.text': 'A quieter way to shop: early access, care and a few privileges for those who return.',
    'home.club.benefit.1': 'Early access to every new collection',
    'home.club.benefit.2': 'Complimentary alterations on tailoring',
    'home.club.benefit.3': 'Private seasonal sales',
    'home.club.placeholder': 'Your email address',
    'home.club.button': 'Join the circle',
    'home.club.note': 'Demo store: your email is not sent or stored anywhere.',
    'home.club.success': 'Welcome to the circle.',
    'home.club.invalid': 'Please enter a valid email address.',
    'home.advisor.eyebrow': 'Appointments',
    'home.advisor.title': 'Book a style advisor',
    'home.advisor.text':
      'A 45-minute session, in store or by video, to build a wardrobe around the way you live.',
    'home.advisor.format': 'Format',
    'home.advisor.format.store': 'In store',
    'home.advisor.format.video': 'Video call',
    'home.advisor.day': 'Day',
    'home.advisor.time': 'Time',
    'home.advisor.button': 'Request appointment',
    'home.advisor.note': 'Demo: no booking is made and no personal details are requested.',
    'home.advisor.success': 'Appointment simulated: {format}, {day} at {time}.',

    'collection.title': 'Collection',
    'collection.intro':
      'Every piece, from the shirt you reach for daily to the jacket you keep for a decade.',
    'collection.filters': 'Filters',
    'collection.category': 'Category',
    'collection.price': 'Price',
    'collection.price.any': 'Any price',
    'collection.price.0-75': 'Under {a}',
    'collection.price.75-150': '{a} – {b}',
    'collection.price.150-plus': 'Over {a}',
    'collection.onSale': 'On sale only',
    'collection.sort': 'Sort by',
    'collection.sort.featured': 'Featured',
    'collection.sort.priceAsc': 'Price: low to high',
    'collection.sort.priceDesc': 'Price: high to low',
    'collection.count': '{n} products',
    'collection.count.one': '1 product',
    'collection.empty': 'No products match these filters.',
    'collection.clear': 'Clear filters',

    'product.sale': 'Sale',
    'product.colour': 'Colour',
    'product.size': 'Size',
    'product.sizeGuide': 'Size guide',
    'product.oneSize': 'One size',
    'product.add': 'Add to bag',
    'product.selectSize': 'Please select a size.',
    'product.added': 'Added to your bag.',
    'product.viewBag': 'View bag',
    'product.details': 'Details & care',
    'product.delivery': 'Delivery & returns',
    'product.delivery.text':
      'Standard delivery {standard} (free over {free}), express {express}. Free returns within 30 days.',
    'product.related': 'You may also like',
    'product.notFound': 'This product could not be found.',
    'product.back': 'Back to the collection',

    'sizeGuide.title': 'Size guide',
    'sizeGuide.intro': 'Measurements are body measurements in centimetres.',
    'sizeGuide.size': 'Size',
    'sizeGuide.chest': 'Chest',
    'sizeGuide.waist': 'Waist',
    'sizeGuide.hip': 'Hip',
    'sizeGuide.inseam': 'Inside leg',
    'sizeGuide.belt.length': 'Total length',
    'sizeGuide.belt.fits': 'Fits trouser size',
    'sizeGuide.tip':
      'Between sizes? Choose the larger one for a relaxed fit, or the smaller one for a closer fit.',
    'sizeGuide.close': 'Close',

    'cart.title': 'Your bag',
    'cart.empty': 'Your bag is empty.',
    'cart.continue': 'Continue shopping',
    'cart.size': 'Size',
    'cart.qty': 'Quantity',
    'cart.decrease': 'Decrease quantity',
    'cart.increase': 'Increase quantity',
    'cart.remove': 'Remove',
    'cart.summary': 'Order summary',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Shipping',
    'cart.shipping.free': 'Free',
    'cart.shipping.remaining': 'Add {amount} more for free shipping.',
    'cart.total': 'Total',
    'cart.checkout': 'Proceed to checkout',

    'checkout.title': 'Checkout',
    'checkout.demo':
      'This is a simulated checkout. No personal details are requested and no payment is taken.',
    'checkout.delivery': 'Delivery method',
    'checkout.delivery.standard': 'Standard (2–4 working days)',
    'checkout.delivery.express': 'Express (next working day)',
    'checkout.payment': 'Payment',
    'checkout.payment.card': 'Demo card (no charge)',
    'checkout.payment.wallet': 'Demo wallet (no charge)',
    'checkout.place': 'Place order',
    'checkout.empty': 'There is nothing to check out yet.',
    'checkout.done.title': 'Thank you for your order',
    'checkout.done.text': 'Order {ref} has been simulated. Nothing will be shipped or charged.',
    'checkout.done.back': 'Back to the store',

    'notFound.title': 'Page not found',
    'notFound.text': 'The page you are looking for does not exist or has moved.',
    'notFound.back': 'Go to the homepage',

    'footer.shop': 'Shop',
    'footer.help': 'Help',
    'footer.help.shipping': 'Shipping',
    'footer.help.returns': 'Returns',
    'footer.help.sizes': 'Size guide',
    'footer.rights': 'Demo project.',
    'footer.privacy': 'Privacy notice',
    'footer.privacySettings': 'Privacy settings',
    'lang.label': 'Language',

    'consent.title': 'Your privacy',
    'consent.text':
      'With your permission, this demo store measures how visitors move through it using an anonymous ID. No names, emails or IP addresses are stored, and nothing is shared with third parties.',
    'consent.more': 'Privacy notice',
    'consent.accept': 'Accept analytics',
    'consent.decline': 'Decline',

    'privacy.title': 'Privacy notice',
    'privacy.intro':
      'This is a fictional store built as a portfolio project. It measures, only with your consent, how visitors move through the pages, so the journey can be shown on an analytics dashboard.',
    'privacy.collect.title': 'What is collected',
    'privacy.collect.text':
      'A random anonymous ID created in your browser, a session ID, the pages you view, how far you scroll, and store interactions such as filters, products viewed, items added to the bag and simulated orders. Also the campaign that brought you here (UTM tags), the domain of the referring site and whether you use a mobile or desktop device.',
    'privacy.never.title': 'What is never collected',
    'privacy.never.text':
      'Your name, email address (the newsletter and appointment forms are simulations and discard what you type), IP address, precise location, full browser fingerprint or full referring URLs. No third-party scripts, cookies or fonts are loaded.',
    'privacy.basis.title': 'Legal basis and retention',
    'privacy.basis.text':
      'Tracking is based on your consent (GDPR art. 6(1)(a)) and starts only after you accept. Raw events are deleted automatically after 13 months.',
    'privacy.choices.title': 'Your choices',
    'privacy.choices.text':
      'You can change your decision at any time. Withdrawing consent stops tracking immediately and deletes the anonymous IDs from this browser. Because the IDs are random and not linked to you, past events cannot be traced back to a person.',
    'privacy.status': 'Current choice:',
    'privacy.status.granted': 'analytics accepted',
    'privacy.status.denied': 'analytics declined',
    'privacy.status.none': 'not decided yet',
    'privacy.change': 'Change privacy settings',
  },

  pt: {
    'nav.collection': 'Coleção',
    'nav.cart': 'Saco',
    'nav.menu': 'Menu',
    'nav.skip': 'Saltar para o conteúdo',
    'banner.shipping': 'Portes grátis em encomendas acima de {amount} · Devoluções em 30 dias',

    'category.all': 'Tudo',
    'category.shirts': 'Camisas',
    'category.polos': 'Polos',
    'category.knitwear': 'Malhas',
    'category.trousers': 'Calças',
    'category.outerwear': 'Casacos',
    'category.accessories': 'Acessórios',

    'home.title': 'A Estação Tranquila',
    'home.hero.eyebrow': 'Outono / Inverno 2026',
    'home.hero.title': 'A Estação Tranquila',
    'home.hero.cta': 'Descobrir a coleção',
    'home.panel.knitwear.eyebrow': 'Malhas',
    'home.panel.knitwear.title': 'Lã, feita sem pressa',
    'home.panel.knitwear.cta': 'Ver malhas',
    'home.panel.shirts.eyebrow': 'Camisas e sobrecamisas',
    'home.panel.shirts.title': 'Luz através do algodão',
    'home.panel.shirts.cta': 'Ver camisas',
    'home.new.title': 'Novidades',
    'home.new.link': 'Ver tudo',
    'home.material.eyebrow': 'Material',
    'home.material.title': 'Lã de cordeiro, tricotada sem pressa.',
    'home.material.text':
      'Fiada em pequenos lotes e tricotada em teares tradicionais, para que cada camisola mantenha a forma e fique mais macia com o uso.',
    'home.material.cta': 'Explorar malhas',
    'home.lookbook.eyebrow': 'Lookbook',
    'home.lookbook.title': 'Notas sobre um guarda-roupa tranquilo',
    'home.lookbook.1': '01 · Luz da manhã',
    'home.lookbook.2': '02 · Pedra da cidade',
    'home.lookbook.3': '03 · O punho',
    'home.lookbook.4': '04 · No atelier',
    'home.club.eyebrow': 'Membros',
    'home.club.title': 'O Círculo {brand}',
    'home.club.text':
      'Uma forma mais tranquila de comprar: acesso antecipado, cuidado e alguns privilégios para quem volta.',
    'home.club.benefit.1': 'Acesso antecipado a cada nova coleção',
    'home.club.benefit.2': 'Ajustes de alfaiataria gratuitos',
    'home.club.benefit.3': 'Saldos privados de estação',
    'home.club.placeholder': 'O seu email',
    'home.club.button': 'Aderir ao círculo',
    'home.club.note': 'Loja de demonstração: o seu email não é enviado nem guardado.',
    'home.club.success': 'Bem-vindo ao círculo.',
    'home.club.invalid': 'Introduza um email válido.',
    'home.advisor.eyebrow': 'Marcações',
    'home.advisor.title': 'Marcar um style advisor',
    'home.advisor.text':
      'Uma sessão de 45 minutos, em loja ou por vídeo, para construir um guarda-roupa à medida da sua vida.',
    'home.advisor.format': 'Formato',
    'home.advisor.format.store': 'Em loja',
    'home.advisor.format.video': 'Videochamada',
    'home.advisor.day': 'Dia',
    'home.advisor.time': 'Hora',
    'home.advisor.button': 'Pedir marcação',
    'home.advisor.note': 'Demo: nenhuma marcação é feita e não são pedidos dados pessoais.',
    'home.advisor.success': 'Marcação simulada: {format}, {day} às {time}.',

    'collection.title': 'Coleção',
    'collection.intro': 'Todas as peças, da camisa de todos os dias ao casaco que se guarda uma década.',
    'collection.filters': 'Filtros',
    'collection.category': 'Categoria',
    'collection.price': 'Preço',
    'collection.price.any': 'Qualquer preço',
    'collection.price.0-75': 'Até {a}',
    'collection.price.75-150': '{a} – {b}',
    'collection.price.150-plus': 'Acima de {a}',
    'collection.onSale': 'Só promoções',
    'collection.sort': 'Ordenar por',
    'collection.sort.featured': 'Destaques',
    'collection.sort.priceAsc': 'Preço: crescente',
    'collection.sort.priceDesc': 'Preço: decrescente',
    'collection.count': '{n} produtos',
    'collection.count.one': '1 produto',
    'collection.empty': 'Nenhum produto corresponde a estes filtros.',
    'collection.clear': 'Limpar filtros',

    'product.sale': 'Promoção',
    'product.colour': 'Cor',
    'product.size': 'Tamanho',
    'product.sizeGuide': 'Guia de tamanhos',
    'product.oneSize': 'Tamanho único',
    'product.add': 'Adicionar ao saco',
    'product.selectSize': 'Selecione um tamanho.',
    'product.added': 'Adicionado ao saco.',
    'product.viewBag': 'Ver saco',
    'product.details': 'Detalhes e cuidados',
    'product.delivery': 'Entregas e devoluções',
    'product.delivery.text':
      'Entrega normal {standard} (grátis acima de {free}), expresso {express}. Devoluções grátis em 30 dias.',
    'product.related': 'Também pode gostar',
    'product.notFound': 'Não foi possível encontrar este produto.',
    'product.back': 'Voltar à coleção',

    'sizeGuide.title': 'Guia de tamanhos',
    'sizeGuide.intro': 'As medidas são do corpo, em centímetros.',
    'sizeGuide.size': 'Tamanho',
    'sizeGuide.chest': 'Peito',
    'sizeGuide.waist': 'Cintura',
    'sizeGuide.hip': 'Anca',
    'sizeGuide.inseam': 'Entreperna',
    'sizeGuide.belt.length': 'Comprimento total',
    'sizeGuide.belt.fits': 'Para calças tamanho',
    'sizeGuide.tip':
      'Entre dois tamanhos? Escolha o maior para um corte mais solto ou o menor para um corte mais justo.',
    'sizeGuide.close': 'Fechar',

    'cart.title': 'O seu saco',
    'cart.empty': 'O seu saco está vazio.',
    'cart.continue': 'Continuar a comprar',
    'cart.size': 'Tamanho',
    'cart.qty': 'Quantidade',
    'cart.decrease': 'Diminuir quantidade',
    'cart.increase': 'Aumentar quantidade',
    'cart.remove': 'Remover',
    'cart.summary': 'Resumo da encomenda',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Portes',
    'cart.shipping.free': 'Grátis',
    'cart.shipping.remaining': 'Faltam {amount} para portes grátis.',
    'cart.total': 'Total',
    'cart.checkout': 'Finalizar compra',

    'checkout.title': 'Finalizar compra',
    'checkout.demo': 'Este checkout é simulado. Não são pedidos dados pessoais e nenhum pagamento é cobrado.',
    'checkout.delivery': 'Método de entrega',
    'checkout.delivery.standard': 'Normal (2–4 dias úteis)',
    'checkout.delivery.express': 'Expresso (dia útil seguinte)',
    'checkout.payment': 'Pagamento',
    'checkout.payment.card': 'Cartão de demonstração (sem cobrança)',
    'checkout.payment.wallet': 'Carteira de demonstração (sem cobrança)',
    'checkout.place': 'Confirmar encomenda',
    'checkout.empty': 'Ainda não há nada para finalizar.',
    'checkout.done.title': 'Obrigado pela sua encomenda',
    'checkout.done.text': 'A encomenda {ref} foi simulada. Nada será enviado nem cobrado.',
    'checkout.done.back': 'Voltar à loja',

    'notFound.title': 'Página não encontrada',
    'notFound.text': 'A página que procura não existe ou foi movida.',
    'notFound.back': 'Ir para a página inicial',

    'footer.shop': 'Loja',
    'footer.help': 'Ajuda',
    'footer.help.shipping': 'Entregas',
    'footer.help.returns': 'Devoluções',
    'footer.help.sizes': 'Guia de tamanhos',
    'footer.rights': 'Projeto de demonstração.',
    'footer.privacy': 'Aviso de privacidade',
    'footer.privacySettings': 'Definições de privacidade',
    'lang.label': 'Idioma',

    'consent.title': 'A sua privacidade',
    'consent.text':
      'Com a sua autorização, esta loja de demonstração mede como os visitantes a percorrem, usando um ID anónimo. Não são guardados nomes, emails nem endereços IP, e nada é partilhado com terceiros.',
    'consent.more': 'Aviso de privacidade',
    'consent.accept': 'Aceitar análise',
    'consent.decline': 'Recusar',

    'privacy.title': 'Aviso de privacidade',
    'privacy.intro':
      'Esta é uma loja fictícia criada como projeto de portfólio. Mede, apenas com o seu consentimento, como os visitantes percorrem as páginas, para que o trajeto possa ser mostrado num dashboard de análise.',
    'privacy.collect.title': 'O que é recolhido',
    'privacy.collect.text':
      'Um ID anónimo aleatório criado no seu browser, um ID de sessão, as páginas que vê, até onde faz scroll e interações na loja como filtros, produtos vistos, artigos adicionados ao saco e encomendas simuladas. Também a campanha que o trouxe (etiquetas UTM), o domínio do site de origem e se usa um dispositivo móvel ou desktop.',
    'privacy.never.title': 'O que nunca é recolhido',
    'privacy.never.text':
      'O seu nome, email (os formulários de newsletter e marcação são simulações e descartam o que escreve), endereço IP, localização precisa, impressão digital completa do browser ou URLs de origem completos. Não são carregados scripts, cookies ou fontes de terceiros.',
    'privacy.basis.title': 'Base legal e conservação',
    'privacy.basis.text':
      'O tracking baseia-se no seu consentimento (RGPD art. 6.º, n.º 1, alínea a) e só começa depois de aceitar. Os eventos são apagados automaticamente ao fim de 13 meses.',
    'privacy.choices.title': 'As suas escolhas',
    'privacy.choices.text':
      'Pode mudar a sua decisão a qualquer momento. Ao retirar o consentimento, o tracking termina de imediato e os IDs anónimos são apagados deste browser. Como os IDs são aleatórios e não estão ligados a si, os eventos anteriores não podem ser associados a uma pessoa.',
    'privacy.status': 'Escolha atual:',
    'privacy.status.granted': 'análise aceite',
    'privacy.status.denied': 'análise recusada',
    'privacy.status.none': 'ainda não decidiu',
    'privacy.change': 'Alterar definições de privacidade',
  },
};

export const LANGS = Object.keys(STRINGS);

export function getLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    // Storage unavailable: fall back to the default language.
  }
  return CONFIG.defaultLang;
}

export function setLang(lang) {
  if (!LANGS.includes(lang)) return;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Ignore: the choice just won't persist.
  }
}

/** Translates a key and fills `{placeholders}` from `vars`. Falls back to English, then the key. */
export function t(key, vars = {}) {
  const lang = getLang();
  const template = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

/** Picks the current language from a `{ en, pt }` object (used for product content). */
export function localized(value) {
  if (value == null || typeof value !== 'object') return value;
  return value[getLang()] ?? value.en;
}

export function formatPrice(amount) {
  return new Intl.NumberFormat(CONFIG.locales[getLang()], {
    style: 'currency',
    currency: CONFIG.currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Translates static markup: `data-i18n` sets text, `data-i18n-attr="attr:key;attr2:key2"` sets attributes.
 */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n, { brand: CONFIG.brand.name });
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), t(key.trim(), { brand: CONFIG.brand.name }));
    });
  });
}
