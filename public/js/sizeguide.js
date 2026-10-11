import { t } from './i18n.js';

// Body measurements in cm. Tops include the EU tailoring size so blazers can share the table.
const GUIDES = {
  tops: {
    columns: ['sizeGuide.size', 'EU', 'sizeGuide.chest', 'sizeGuide.waist'],
    rows: [
      ['XS', '44', '86–89', '71–74'],
      ['S', '46', '90–94', '75–79'],
      ['M', '48', '95–99', '80–84'],
      ['L', '50', '100–104', '85–89'],
      ['XL', '52', '105–110', '90–95'],
      ['XXL', '54', '111–116', '96–101'],
    ],
  },
  trousers: {
    columns: ['sizeGuide.size', 'sizeGuide.waist', 'sizeGuide.hip', 'sizeGuide.inseam'],
    rows: [
      ['44', '74–77', '90–93', '82'],
      ['46', '78–81', '94–97', '82'],
      ['48', '82–85', '98–101', '83'],
      ['50', '86–89', '102–105', '83'],
      ['52', '90–93', '106–109', '84'],
      ['54', '94–97', '110–113', '84'],
    ],
  },
  belts: {
    columns: ['sizeGuide.size', 'sizeGuide.belt.length', 'sizeGuide.belt.fits'],
    rows: [
      ['85', '100', '44–46'],
      ['90', '105', '46–48'],
      ['95', '110', '48–50'],
      ['100', '115', '50–52'],
      ['105', '120', '52–54'],
    ],
  },
};

let dialog;

function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'modal';
  dialog.setAttribute('aria-labelledby', 'size-guide-title');
  document.body.append(dialog);
  // Clicking the backdrop (the dialog element itself) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  return dialog;
}

/** Opens the size guide for a guide type ('tops' | 'trousers' | 'belts'). */
export function openSizeGuide(type) {
  const guide = GUIDES[type];
  if (!guide) return;
  const el = ensureDialog();
  const head = guide.columns.map((c) => `<th scope="col">${c.includes('.') ? t(c) : c}</th>`).join('');
  const body = guide.rows
    .map((r) => `<tr>${r.map((cell, i) => (i === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`)).join('')}</tr>`)
    .join('');

  el.innerHTML = `
    <div class="modal__inner">
      <div class="modal__header">
        <h2 id="size-guide-title" class="modal__title">${t('sizeGuide.title')}</h2>
        <button type="button" class="icon-btn" data-close aria-label="${t('sizeGuide.close')}">×</button>
      </div>
      <p class="muted">${t('sizeGuide.intro')}</p>
      <div class="table-wrap">
        <table class="size-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      </div>
      <p class="modal__tip">${t('sizeGuide.tip')}</p>
    </div>`;
  el.querySelector('[data-close]').addEventListener('click', () => el.close());
  el.showModal();
}
