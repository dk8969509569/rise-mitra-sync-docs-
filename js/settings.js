/* =========================================================================
   RISE MITRA (RM WORLD) - SETTINGS & ACCESSIBILITY CONTROLLER
   Theme Switcher (Light/Dark/Auto), Font Scaling (WCAG AA), Offline Prefs
   ========================================================================= */

(function () {
  'use strict';

  const SETTINGS_KEY = 'rm_user_settings_v1';

  const DefaultSettings = {
    theme: 'light',       // 'light' | 'dark' | 'auto'
    fontScale: 'standard', // 'small' | 'standard' | 'large'
    language: 'hi',       // 'hi' | 'en'
    offlineAudio: false
  };

  class RMSettingsManager {
    constructor() {
      this.settings = this.loadSettings();
      this.applyAll();
    }

    loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? { ...DefaultSettings, ...JSON.parse(raw) } : { ...DefaultSettings };
      } catch (e) {
        return { ...DefaultSettings };
      }
    }

    saveSettings() {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      this.applyAll();
    }

    // Apply Theme (Light / Dark / System Auto)
    applyTheme() {
      const root = document.documentElement;
      let effectiveTheme = this.settings.theme;

      if (effectiveTheme === 'auto') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      }

      root.setAttribute('data-theme', effectiveTheme);
    }

    // Apply Font Scale (Pure REM Scaling without clipping)
    applyFontScale() {
      const root = document.documentElement;
      root.setAttribute('data-font-scale', this.settings.fontScale);
    }

    // Apply Language
    applyLanguage() {
      document.documentElement.lang = this.settings.language;
      if (window.rmSolvency) window.rmSolvency.render();
    }

    applyAll() {
      this.applyTheme();
      this.applyFontScale();
      this.applyLanguage();
    }

    setTheme(theme) {
      if (['light', 'dark', 'auto'].includes(theme)) {
        this.settings.theme = theme;
        this.saveSettings();
      }
    }

    setFontScale(scale) {
      if (['small', 'standard', 'large'].includes(scale)) {
        this.settings.fontScale = scale;
        this.saveSettings();
      }
    }

    setLanguage(lang) {
      if (['hi', 'en'].includes(lang)) {
        this.settings.language = lang;
        this.saveSettings();
      }
    }
  }

  // DOM Boot
  document.addEventListener('DOMContentLoaded', () => {
    window.rmSettings = new RMSettingsManager();
  });

  window.RMSettingsManager = RMSettingsManager;
})();
