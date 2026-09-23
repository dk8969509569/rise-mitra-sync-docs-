/* =========================================================================
   RISE MITRA (RM WORLD) - DYNAMIC UI VIEW RENDERER & INTERACTION BINDING
   Renders: Bahi-Khata Ledger, 0% Commission Kirana Grid, Cart, Vouchers
   ========================================================================= */

(function () {
  'use strict';

  class RMViewRenderer {
    constructor() {
      this.mainContainer = document.querySelector('.rm-main') || document.body;
      this.initRouteListener();
    }

    initRouteListener() {
      window.addEventListener('hashchange', () => this.handleRouting());
      window.addEventListener('rm:cart:updated', () => this.renderCartBadge());
      this.handleRouting();
    }

    handleRouting() {
      const hash = window.location.hash || '#home';

      if (hash === '#merchant-khata' || hash === '#ledger-balance') {
        this.renderLedgerView();
      } else if (hash === '#kirana-store') {
        this.renderKiranaView();
      } else if (hash === '#vouchers') {
        this.renderVoucherView();
      }
    }

    // 1. Render Bahi-Khata Ledger Sheet
    async renderLedgerView() {
      if (!window.rmLedger) return;
      const statement = await window.rmLedger.getStatement();

      let rowsHtml = '';
      if (statement.length === 0) {
        rowsHtml = '<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--rm-text-muted);">कोई लेन-देन दर्ज नहीं है (No entries)</td></tr>';
      } else {
        rowsHtml = statement.map(tx => `
          <tr style="border-bottom: 1px solid var(--rm-border-color);">
            <td style="padding: 0.5rem; font-size: 0.85rem;">${new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td style="padding: 0.5rem; font-size: 0.85rem;">${tx.narration || tx.id}</td>
            <td style="padding: 0.5rem; font-size: 0.85rem; font-weight: 700; color: #16a34a;">₹${tx.amount.toFixed(2)}</td>
            <td style="padding: 0.5rem; font-size: 0.8rem;">${tx.synced ? '🟢 Synced' : '🟡 Offline'}</td>
          </tr>
        `).join('');
      }

      const viewHtml = `
        <div class="rm-card" style="margin-top: 1rem;">
          <h2 style="font-size: 1.2rem; margin-bottom: 0.75rem; color: var(--rm-brand-accent);">📖 सॉवरेन बहीखाता (Sovereign Khata)</h2>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid var(--rm-border-color); color: var(--rm-text-secondary); font-size: 0.85rem;">
                  <th style="padding: 0.5rem;">समय</th>
                  <th style="padding: 0.5rem;">विवरण</th>
                  <th style="padding: 0.5rem;">राशि</th>
                  <th style="padding: 0.5rem;">स्थिति</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      this.injectView(viewHtml);
    }

    // 2. Render 0% Commission Kirana Grid
    async renderKiranaView() {
      if (!window.rmKirana) return;
      const catalog = await window.rmKirana.getCatalog();

      const itemsHtml = catalog.map(item => `
        <div class="rm-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:0.75rem;">
          <div>
            <h3 style="font-size: 1rem; margin-bottom: 0.25rem;">${item.nameHi}</h3>
            <div style="font-size: 0.8rem; color: var(--rm-text-secondary); margin-bottom: 0.5rem;">${item.nameEn}</div>
            <div style="font-size: 0.9rem; font-weight: 700; color: var(--rm-brand-accent);">
              ₹${item.price} <span style="text-decoration: line-through; color: var(--rm-text-muted); font-size: 0.8rem;">₹${item.mrp}</span>
            </div>
          </div>
          <button onclick="window.rmKirana.addToCart('${item.itemId}', 1)" style="margin-top:0.75rem; padding:0.4rem; background:var(--rm-brand-accent); color:#fff; border:none; border-radius:4px; font-weight:600; cursor:pointer;">
            + जोड़ें (Add)
          </button>
        </div>
      `).join('');

      const viewHtml = `
        <div style="margin-top: 1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <h2 style="font-size: 1.2rem; color: var(--rm-brand-accent);">🛒 किराना स्टोर (0% कमीशन)</h2>
            <button onclick="window.rmViews.openCheckoutModal()" style="padding:0.4rem 0.8rem; background:var(--rm-traffic-green-dot); color:#fff; border:none; border-radius:4px; font-weight:700; cursor:pointer;">
              कार्ट देखें (Checkout)
            </button>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:0.75rem;">
            ${itemsHtml}
          </div>
        </div>
      `;

      this.injectView(viewHtml);
    }

    // 3. Render Offline Vouchers View
    async renderVoucherView() {
      if (!window.rmVoucherSync) return;
      const vouchers = await window.rmVoucherSync.getActiveVouchers();

      let cardsHtml = '';
      if (vouchers.length === 0) {
        cardsHtml = '<div style="padding:1rem; text-align:center; color:var(--rm-text-muted);">कोई वाउचर उपलब्ध नहीं है</div>';
      } else {
        cardsHtml = vouchers.map(v => `
          <div class="rm-card" style="margin-bottom:0.5rem; border-left: 4px solid var(--rm-brand-accent);">
            <div style="display:flex; justify-content:space-between;">
              <strong>${v.voucherId}</strong>
              <span style="font-weight:700; color:#16a34a;">₹${v.amount}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--rm-text-muted); margin-top:0.25rem;">Status: ${v.status} | Beneficiary: ${v.beneficiary}</div>
          </div>
        `).join('');
      }

      this.injectView(`
        <div style="margin-top:1rem;">
          <h2 style="font-size:1.2rem; margin-bottom:0.75rem; color:var(--rm-brand-accent);">🎟️ सॉवरेन वाउचर्स (Sovereign Vouchers)</h2>
          ${cardsHtml}
        </div>
      `);
    }

    injectView(html) {
      let target = document.getElementById('rm-view-container');
      if (!target) {
        target = document.createElement('div');
        target.id = 'rm-view-container';
        this.mainContainer.appendChild(target);
      }
      target.innerHTML = html;
    }

    renderCartBadge() {
      // Updates checkout indicators if applicable
    }

    async openCheckoutModal() {
      if (!window.rmKirana) return;
      const cart = await window.rmKirana.getCartDetails();
      const total = await window.rmKirana.getCartTotal();

      if (cart.length === 0) {
        alert('कार्ट खाली है (Cart is empty)');
        return;
      }

      const confirmOrder = confirm(`कुल राशि (Total): ₹${total}\nक्या आप 0% कमीशन पर ऑर्डर पूरा करना चाहते हैं?`);
      if (confirmOrder) {
        await window.rmKirana.checkoutOrder('CASH_ON_DELIVERY');
        alert('ऑर्डर सफलतापूर्वक दर्ज हुआ! बहीखाते में एंट्री जोड़ दी गई है।');
        window.location.hash = '#merchant-khata';
      }
    }
  }

  // DOM Boot
  document.addEventListener('DOMContentLoaded', () => {
    window.rmViews = new RMViewRenderer();
  });
})();
