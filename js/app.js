/* =========================================================================
   RISE MITRA (RM WORLD) - MASTER CLIENT ORCHESTRATOR & PWA BOOTSTRAP
   Binds: Service Worker, Solvency Engine, Trie Search, Navigation, DPDP Consent
   ========================================================================= */

(function () {
  'use strict';

  class RiseMitraApp {
    constructor() {
      this.isOnline = navigator.onLine;
      this.deferredInstallPrompt = null;
    }

    init() {
      this.registerServiceWorker();
      this.bindNetworkListeners();
      this.bindPWAInstallPrompt();
      this.bindCircuitBreakerEvents();
    }

    // Register Service Worker for offline-first PWA caching
    registerServiceWorker() {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
              // Registration successful
              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                  installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      console.log('RM World: New update available.');
                    }
                  };
                }
              };
            })
            .catch((err) => {
              console.warn('SW registration skipped:', err);
            });
        });
      }
    }

    // Monitor connectivity for Traffic Light state transitions
    bindNetworkListeners() {
      window.addEventListener('online', () => {
        this.isOnline = true;
        if (window.rmSolvency) {
          window.rmSolvency.saveState({ offlinePendingCount: 0 });
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        if (window.rmSolvency) {
          window.rmSolvency.saveState({ offlinePendingCount: 1 });
        }
      });
    }

    // Capture install prompt for PWA/TWA
    bindPWAInstallPrompt() {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredInstallPrompt = e;
      });
    }

    // Circuit Breaker listener (Red alert safety lock)
    bindCircuitBreakerEvents() {
      window.addEventListener('rm:circuit-breaker:locked', (event) => {
        console.warn('RM Security Alert: Ledger breach or insolvency detected.', event.detail);
      });
    }
  }

  // Master Boot sequence
  document.addEventListener('DOMContentLoaded', () => {
    window.rmApp = new RiseMitraApp();
    window.rmApp.init();
  });
})();
