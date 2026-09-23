/* =========================================================================
   RISE MITRA (RM WORLD) - DPDP ACT 2023 CONSENT & IDENTITY MASKING ENGINE
   Traffic Light Protocol (TLP): RED (PII Isolated) | AMBER (Internal) | GREEN (Public)
   ========================================================================= */

(function () {
  'use strict';

  const CONSENT_STORAGE_KEY = 'rm_dpdp_consent_v1';
  const IDENTITY_STORAGE_KEY = 'rm_masked_identity_token';

  const DataTLP = {
    RED: 'TLP:RED',       // Raw Phone, KYC, Aadhaar, Raw Ledger (Never shared outside local sandbox)
    AMBER: 'TLP:AMBER',   // Masked Identity (USR-****), Session Token, Voucher Reference
    GREEN: 'TLP:GREEN'    // Public Catalogs, Static 50 Categories, Localization Dictionaries
  };

  class RMConsentManager {
    constructor() {
      this.consent = this.loadConsent();
      this.maskedIdentity = this.initMaskedIdentity();
    }

    // Generate or fetch sovereign masked identity (USR-XXXX)
    initMaskedIdentity() {
      let token = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (!token) {
        const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
        token = `USR-${randomHex}`;
        localStorage.setItem(IDENTITY_STORAGE_KEY, token);
      }
      return token;
    }

    loadConsent() {
      try {
        const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn('DPDP consent read error:', e);
        return null;
      }
    }

    hasValidConsent() {
      return this.consent && this.consent.granted === true && this.consent.version === '1.0.0';
    }

    grantConsent() {
      const consentRecord = {
        granted: true,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        purposes: {
          bahiKhata: true,
          hyperlocalSearch: true,
          offlineStorage: true,
          thirdPartyTracking: false // Strictly prohibited
        },
        tlpClassification: DataTLP.AMBER
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentRecord));
      this.consent = consentRecord;
      this.updateUI();
    }

    revokeConsent() {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      this.consent = null;
      this.updateUI();
    }

    updateUI() {
      const badge = document.getElementById('rm-user-badge');
      if (badge) {
        badge.textContent = this.maskedIdentity;
        badge.setAttribute('title', `DPDP 2023 Masked Sovereign ID: ${this.maskedIdentity}`);
      }
    }
  }

  // DOM initialization
  document.addEventListener('DOMContentLoaded', () => {
    window.rmConsent = new RMConsentManager();
    window.rmConsent.updateUI();
  });

  window.RM_DATA_TLP = DataTLP;
})();
