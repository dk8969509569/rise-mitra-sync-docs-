/* =========================================================================
   RISE MITRA (RM WORLD) - 0% COMMISSION KIRANA & HYPERLOCAL CATALOG ENGINE
   Zero-Middleman Pricing | Direct Producer Ledger | Offline Cart
   ========================================================================= */

(function () {
  'use strict';

  // Seed Catalog: Essential staples with 0% platform markup
  const SEED_CATALOG = [
    { itemId: "k01", categoryId: "c27", nameHi: "गेहूँ का आटा (10 kg)", nameEn: "Wheat Flour (10 kg)", mrp: 380, price: 340, unit: "10 kg", stock: 50 },
    { itemId: "k02", categoryId: "c27", nameHi: "बासमती चावल (5 kg)", nameEn: "Basmati Rice (5 kg)", mrp: 450, price: 410, unit: "5 kg", stock: 40 },
    { itemId: "k03", categoryId: "c27", nameHi: "अरहर दाल (1 kg)", nameEn: "Toor Dal (1 kg)", mrp: 180, price: 160, unit: "1 kg", stock: 100 },
    { itemId: "k04", categoryId: "c27", nameHi: "शुद्ध सरसों तेल (1 L)", nameEn: "Mustard Oil (1 L)", mrp: 160, price: 145, unit: "1 L", stock: 60 },
    { itemId: "k05", categoryId: "c27", nameHi: "आयोडीन नमक (1 kg)", nameEn: "Iodized Salt (1 kg)", mrp: 28, price: 24, unit: "1 kg", stock: 200 }
  ];

  class RMKiranaEngine {
    constructor() {
      this.db = window.rmDB || null;
      this.cart = this.loadCart();
      this.initCatalog();
    }

    loadCart() {
      try {
        const raw = localStorage.getItem('rm_kirana_cart');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    saveCart() {
      localStorage.setItem('rm_kirana_cart', JSON.stringify(this.cart));
      this.dispatchCartUpdate();
    }

    dispatchCartUpdate() {
      window.dispatchEvent(new CustomEvent('rm:cart:updated', { detail: { items: this.cart, total: this.getCartTotal() } }));
    }

    // Seed inventory into IndexedDB if empty
    async initCatalog() {
      if (!this.db) return;
      const existing = await this.db.getAll('inventory');
      if (existing.length === 0) {
        for (const item of SEED_CATALOG) {
          await this.db.put('inventory', item);
        }
      }
    }

    async getCatalog() {
      if (!this.db) return SEED_CATALOG;
      const items = await this.db.getAll('inventory');
      return items.length > 0 ? items : SEED_CATALOG;
    }

    addToCart(itemId, quantity = 1) {
      const idx = this.cart.findIndex(i => i.itemId === itemId);
      if (idx > -1) {
        this.cart[idx].qty += quantity;
      } else {
        this.cart.push({ itemId, qty: quantity });
      }
      this.saveCart();
    }

    removeFromCart(itemId) {
      this.cart = this.cart.filter(i => i.itemId !== itemId);
      this.saveCart();
    }

    clearCart() {
      this.cart = [];
      this.saveCart();
    }

    async getCartDetails() {
      const catalog = await this.getCatalog();
      return this.cart.map(cartItem => {
        const product = catalog.find(p => p.itemId === cartItem.itemId) || {};
        return {
          ...cartItem,
          nameHi: product.nameHi || 'उत्पाद',
          nameEn: product.nameEn || 'Item',
          price: product.price || 0,
          subtotal: (product.price || 0) * cartItem.qty
        };
      });
    }

    async getCartTotal() {
      const details = await this.getCartDetails();
      return details.reduce((sum, item) => sum + item.subtotal, 0);
    }

    // Zero-Commission Checkout: writes directly to Sovereign Ledger
    async checkoutOrder(paymentMethod = 'CASH_ON_DELIVERY') {
      const totalAmount = await this.getCartTotal();
      if (totalAmount <= 0) {
        throw new Error('Kirana Error: Cart is empty.');
      }

      const orderRef = 'ORD-' + Date.now().toString(36).toUpperCase();

      // Record in sovereign ledger (0% platform deduction)
      if (window.rmLedger) {
        await window.rmLedger.recordEntry(
          'KIRANA_RECEIVABLE',
          'MERCHANT_REVENUE',
          totalAmount,
          `Kirana Order [${paymentMethod}]: ${orderRef}`,
          orderRef
        );
      }

      this.clearCart();
      return { success: true, orderRef, totalAmount };
    }
  }

  // DOM Boot
  document.addEventListener('DOMContentLoaded', () => {
    window.rmKirana = new RMKiranaEngine();
  });

  window.RMKiranaEngine = RMKiranaEngine;
})();
