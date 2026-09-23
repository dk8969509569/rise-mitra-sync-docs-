/* =========================================================================
   RISE MITRA (RM WORLD) - REAL-TIME TRAFFIC LIGHT SOLVENCY BADGE CONTROLLER
   3-Tier Governance: Green (1.00 Solvent) | Amber (Sync Pending) | Red (Breach Lock)
   ========================================================================= */

(function () {
  'use strict';

  const SOLVENCY_STORAGE_KEY = 'rm_solvency_cache_v1';

  const TrafficState = {
    GREEN: 'green',
    AMBER: 'amber',
    RED: 'red'
  };

  class RMSolvencyBadge {
    constructor() {
      this.badgeElement = document.getElementById('rm-solvency-pill');
      this.state = this.loadCachedState();
    }

    loadCachedState() {
      try {
        const cached = localStorage.getItem(SOLVENCY_STORAGE_KEY);
        return cached ? JSON.parse(cached) : {
          coverageRatio: 1.00,
          ncrRate: 0.00,
          ledgerBalanced: true,
          offlinePendingCount: 0
        };
      } catch (e) {
        return { coverageRatio: 1.00, ncrRate: 0.00, ledgerBalanced: true, offlinePendingCount: 0 };
      }
    }

    saveState(metrics) {
      this.state = { ...this.state, ...metrics };
      localStorage.setItem(SOLVENCY_STORAGE_KEY, JSON.stringify(this.state));
      this.render();
    }

    // Determine 3-tier status based on canonical thresholds
    evaluateStatus() {
      const { coverageRatio, ncrRate, ledgerBalanced, offlinePendingCount } = this.state;

      // 🔴 RED: Solvency breach, unbalanced ledger, or NCR > 28.00% cap
      if (coverageRatio < 1.00 || !ledgerBalanced || ncrRate > 0.28) {
        return {
          level: TrafficState.RED,
          labelKey: 'solvencyAlert',
          defaultText: 'सॉल्वेंसी अलर्ट',
          cssClass: 'rm-traffic-red',
          locked: true
        };
      }

      // 🟡 AMBER: Offline sync pending or buffer range
      if (offlinePendingCount > 0 || (coverageRatio >= 1.00 && coverageRatio < 1.05)) {
        return {
          level: TrafficState.AMBER,
          labelKey: 'solvencyPending',
          defaultText: 'सिंक लंबित',
          cssClass: 'rm-traffic-amber',
          locked: false
        };
      }

      // 🟢 GREEN: Fully solvent and reconciled
      return {
        level: TrafficState.GREEN,
        labelKey: 'solvencyVerified',
        defaultText: 'सत्यापित 1.00',
        cssClass: 'rm-traffic-green',
        locked: false
      };
    }

    render() {
      if (!this.badgeElement) {
        this.badgeElement = document.getElementById('rm-solvency-pill');
        if (!this.badgeElement) return;
      }

      const status = this.evaluateStatus();
      const lang = (window.RM_I18N && window.RM_I18N[document.documentElement.lang]) 
        ? document.documentElement.lang 
        : 'hi';

      const localizedText = (window.RM_I18N && window.RM_I18N[lang] && window.RM_I18N[lang][status.labelKey])
        ? window.RM_I18N[lang][status.labelKey]
        : status.defaultText;

      // Reset and apply traffic classes
      this.badgeElement.className = `rm-traffic-pill ${status.cssClass}`;
      this.badgeElement.textContent = localizedText;
      this.badgeElement.setAttribute('aria-label', `System Status: ${localizedText}`);

      // Circuit Breaker Event Dispatch
      if (status.locked) {
        window.dispatchEvent(new CustomEvent('rm:circuit-breaker:locked', { detail: this.state }));
      }
    }
  }

  // DOM Boot
  document.addEventListener('DOMContentLoaded', () => {
    window.rmSolvency = new RMSolvencyBadge();
    window.rmSolvency.render();
  });

  window.RMSolvencyBadge = RMSolvencyBadge;
})();
