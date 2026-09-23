/* =========================================================================
   RISE MITRA (RM WORLD) - INDEXEDDB SOVEREIGN STORAGE ENGINE
   Zero-OPEX Client Persistence | Schema: ledger, vouchers, inventory
   ========================================================================= */

(function () {
  'use strict';

  const DB_NAME = 'rm_world_db_v1';
  const DB_VERSION = 1;

  class RMDatabase {
    constructor() {
      this.db = null;
      this.initPromise = this.openDatabase();
    }

    // Initialize and upgrade IndexedDB schema
    openDatabase() {
      return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
          console.warn('RM Database: IndexedDB not supported in this browser.');
          return resolve(null);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // 1. Double-Entry Sovereign Ledger Store
          if (!db.objectStoreNames.contains('ledger')) {
            const ledgerStore = db.createObjectStore('ledger', { keyPath: 'id' });
            ledgerStore.createIndex('by_timestamp', 'timestamp', { unique: false });
            ledgerStore.createIndex('by_type', 'type', { unique: false });
            ledgerStore.createIndex('by_sync', 'synced', { unique: false });
          }

          // 2. Offline Vouchers & Reconciliation Queue
          if (!db.objectStoreNames.contains('vouchers')) {
            const voucherStore = db.createObjectStore('vouchers', { keyPath: 'voucherId' });
            voucherStore.createIndex('by_status', 'status', { unique: false });
            voucherStore.createIndex('by_created', 'createdAt', { unique: false });
          }

          // 3. Hyperlocal Kirana & Services Catalog (0% Commission)
          if (!db.objectStoreNames.contains('inventory')) {
            const inventoryStore = db.createObjectStore('inventory', { keyPath: 'itemId' });
            inventoryStore.createIndex('by_category', 'categoryId', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.error('RM Database open failed:', event.target.error);
          reject(event.target.error);
        };
      });
    }

    // Generic Add or Put Record
    async put(storeName, record) {
      await this.initPromise;
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(record);

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    // Fetch Record by Primary Key
    async get(storeName, key) {
      await this.initPromise;
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    // Retrieve All Records from a Store
    async getAll(storeName) {
      await this.initPromise;
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    }

    // Remove Record
    async delete(storeName, key) {
      await this.initPromise;
      if (!this.db) return false;

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
  }

  // Global Engine Instance
  if (typeof window !== 'undefined') {
    window.RMDatabase = RMDatabase;
    window.rmDB = new RMDatabase();
  }
})();
