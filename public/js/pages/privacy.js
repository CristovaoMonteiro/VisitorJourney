import { t } from '../i18n.js';
import { initLayout } from '../layout.js';
import { getConsent, onConsentChange } from '../consent.js';

function renderStatus() {
  document.querySelector('[data-consent-status]').textContent = t(`privacy.status.${getConsent() ?? 'none'}`);
}

initLayout({ titleKey: 'privacy.title' });
renderStatus();
onConsentChange(renderStatus);
