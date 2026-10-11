import { t } from './i18n.js';

const CONSENT_KEY = 'orlo_consent';
// Bump when the purpose of tracking changes: everyone is asked again.
const CONSENT_VERSION = 1;

const listeners = new Set();

/** @returns {'granted' | 'denied' | null} null when the visitor has not decided yet. */
export function getConsent() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONSENT_KEY));
    if (saved?.version === CONSENT_VERSION && ['granted', 'denied'].includes(saved.status)) return saved.status;
  } catch {
    // Unreadable or blocked storage counts as "not decided".
  }
  return null;
}

/** @param {'granted' | 'denied'} status */
export function setConsent(status) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ status, version: CONSENT_VERSION, at: new Date().toISOString() }));
  } catch {
    // Without storage the choice only lasts for this page.
  }
  listeners.forEach((cb) => cb(status));
}

export function onConsentChange(callback) {
  listeners.add(callback);
}

/**
 * Shows the consent banner. Accept and decline have equal visual weight
 * (no dark patterns) and nothing is tracked until "Accept" is clicked.
 */
export function showConsentBanner() {
  document.querySelector('.consent')?.remove();

  const banner = document.createElement('section');
  banner.className = 'consent';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-labelledby', 'consent-title');
  banner.setAttribute('aria-describedby', 'consent-text');
  banner.innerHTML = `
    <h2 id="consent-title" class="consent__title">${t('consent.title')}</h2>
    <p id="consent-text" class="consent__text">${t('consent.text')}
      <a href="/privacy">${t('consent.more')}</a></p>
    <div class="consent__actions">
      <button type="button" class="btn btn--secondary" data-consent="denied">${t('consent.decline')}</button>
      <button type="button" class="btn btn--secondary" data-consent="granted">${t('consent.accept')}</button>
    </div>`;

  banner.addEventListener('click', (e) => {
    const button = e.target.closest('[data-consent]');
    if (!button) return;
    setConsent(button.dataset.consent);
    banner.remove();
  });

  // Focus the banner itself, not either button, so keyboard users are not nudged to a choice.
  banner.tabIndex = -1;
  document.body.append(banner);
  banner.focus({ preventScroll: true });
}
