/* =========================================================================
   RISE MITRA (RM WORLD) - 50 CATEGORIES NAVIGATION & ROUTING CONTROLLER
   Tier 1: 33 Applications & Utilities | Tier 2: 17 Casual Games (Anti-RMG)
   Self-Injecting: Automatically injects ☰ Button and Drawer into DOM
   ========================================================================= */

(function () {
  'use strict';

  const RM_CATEGORIES = [
    { id: "c01", tier: 1, nameHi: "01. कृषि व मौसम", nameEn: "Agriculture & Weather", hash: "#agri", keywords: ["kisan", "krishi", "khet", "weather", "fasal"] },
    { id: "c02", tier: 1, nameHi: "02. पशुपालन व डेयरी", nameEn: "Animal Husbandry & Dairy", hash: "#dairy", keywords: ["dairy", "pashu", "milk", "gaay", "bhains"] },
    { id: "c03", tier: 1, nameHi: "03. हस्तशिल्प व कारीगर", nameEn: "Artisans & Handicrafts", hash: "#artisan", keywords: ["shilp", "hastshilp", "craft", "bunkar"] },
    { id: "c04", tier: 1, nameHi: "04. वाहन व परिवहन", nameEn: "Auto & Transport", hash: "#transport", keywords: ["auto", "gaadi", "driver", "transport", "booking"] },
    { id: "c05", tier: 1, nameHi: "05. सॉवरेन बहीखाता (Business)", nameEn: "Business (Sovereign Khata)", hash: "#merchant-khata", keywords: ["khata", "bahi", "ledger", "hisab", "vyapar", "business"] },
    { id: "c06", tier: 1, nameHi: "06. निर्माण व मजदूरी", nameEn: "Construction & Labor", hash: "#construction", keywords: ["mistri", "majdoor", "labor", "cement", "construction"] },
    { id: "c07", tier: 1, nameHi: "07. डिलीवरी व लॉजिस्टिक्स", nameEn: "Delivery & Logistics", hash: "#delivery", keywords: ["courier", "parcel", "delivery", "post"] },
    { id: "c08", tier: 1, nameHi: "08. कानूनी सहायता", nameEn: "Digital Legal & Advisory", hash: "#legal", keywords: ["vakil", "kanoon", "legal", "court", "dastavej"] },
    { id: "c09", tier: 1, nameHi: "09. हुनर सीखें (Education)", nameEn: "Education & Skills", hash: "#hunar-seekhein", keywords: ["padhai", "course", "skill", "hunar", "education", "sikhe"] },
    { id: "c10", tier: 1, nameHi: "10. बिजली व इलेक्ट्रॉनिक्स", nameEn: "Electric & Appliances", hash: "#electric", keywords: ["bijli", "electrician", "wire", "repair"] },
    { id: "c11", tier: 1, nameHi: "11. आपातकालीन सेवाएँ", nameEn: "Emergency Services", hash: "#emergency", keywords: ["police", "ambulance", "hospital", "fire", "aapat"] },
    { id: "c12", tier: 1, nameHi: "12. परिवार व रिश्ते", nameEn: "Family & Community", hash: "#community", keywords: ["samaj", "family", "rishte", "community"] },
    { id: "c13", tier: 1, nameHi: "13. RM CASH लेज़र (Finance)", nameEn: "Finance (RM CASH)", hash: "#ledger-balance", keywords: ["rupaye", "cash", "finance", "paisa", "wallet", "solvency"] },
    { id: "c14", tier: 1, nameHi: "14. सरकारी योजनाएँ", nameEn: "Govt Schemes & Entitlements", hash: "#schemes", keywords: ["yojana", "sarkari", "ration", "pension", "dbt"] },
    { id: "c15", tier: 1, nameHi: "15. स्वास्थ्य व आयुष", nameEn: "Health & Ayush", hash: "#health", keywords: ["dawa", "doctor", "health", "sehat", "ayush"] },
    { id: "c16", tier: 1, nameHi: "16. घर व सजावट", nameEn: "Home & Living", hash: "#home", keywords: ["ghar", "furniture", "cleaning", "home"] },
    { id: "c17", tier: 1, nameHi: "17. आतिथ्य व ढाबा", nameEn: "Hospitality & Dhabas", hash: "#hospitality", keywords: ["hotel", "dhaba", "khana", "stay"] },
    { id: "c18", tier: 1, nameHi: "18. रोजगार व काम", nameEn: "Jobs & Local Work", hash: "#jobs", keywords: ["naukri", "kaam", "rojgar", "job", "vacancy"] },
    { id: "c19", tier: 1, nameHi: "19. स्थानीय समाचार व चौपाल", nameEn: "Local News & Chaupal", hash: "#news", keywords: ["khabar", "samachar", "chaupal", "news"] },
    { id: "c20", tier: 1, nameHi: "20. विनिर्माण व कुटीर उद्योग", nameEn: "Manufacturing & Cottage", hash: "#cottage", keywords: ["udyog", "karkhana", "cottage", "factory"] },
    { id: "c21", tier: 1, nameHi: "21. मीडिया व मनोरंजन", nameEn: "Media & Culture", hash: "#media", keywords: ["natak", "geet", "video", "entertainment"] },
    { id: "c22", tier: 1, nameHi: "22. प्लंबिंग व स्वच्छता", nameEn: "Plumbing & Sanitation", hash: "#plumbing", keywords: ["nal", "pipe", "plumber", "sanitation"] },
    { id: "c23", tier: 1, nameHi: "23. डाक व ई-मित्र सेवा", nameEn: "Postal & CSC Centers", hash: "#csc", keywords: ["post", "csc", "emitra", "aadhar"] },
    { id: "c24", tier: 1, nameHi: "24. मुद्रण व स्टेशनरी", nameEn: "Printing & Stationery", hash: "#stationery", keywords: ["xerox", "print", "kitab", "copy"] },
    { id: "c25", tier: 1, nameHi: "25. संपत्ति व किरायेदारी", nameEn: "Real Estate & Rent", hash: "#rent", keywords: ["kiraya", "jameen", "plot", "makan", "rent"] },
    { id: "c26", tier: 1, nameHi: "26. धर्म व तीर्थ यात्रा", nameEn: "Religious & Pilgrimage", hash: "#pilgrimage", keywords: ["mandir", "tirth", "pooja", "yatra"] },
    { id: "c27", tier: 1, nameHi: "27. किराना 0% कमीशन", nameEn: "Shopping (Kirana 0%)", hash: "#kirana-store", keywords: ["rashan", "kirana", "dukan", "store", "shopping", "mrp"] },
    { id: "c28", tier: 1, nameHi: "28. टेलरिंग व वस्त्र", nameEn: "Tailoring & Garments", hash: "#tailor", keywords: ["darji", "kapda", "suit", "tailor"] },
    { id: "c29", tier: 1, nameHi: "29. दूरसंचार व रिचार्ज", nameEn: "Telecom & Recharge", hash: "#recharge", keywords: ["sim", "mobile", "recharge", "net"] },
    { id: "c30", tier: 1, nameHi: "30. पर्यटन व गाइड", nameEn: "Tourism & Guides", hash: "#tourism", keywords: ["ghumne", "guide", "tour", "sightseeing"] },
    { id: "c31", tier: 1, nameHi: "31. जन-उपयोगिता बिल", nameEn: "Utilities & Bills", hash: "#utilities", keywords: ["bill", "bijli bill", "pani bill", "gas cylinder"] },
    { id: "c32", tier: 1, nameHi: "32. कचरा व कबाड़ समाधान", nameEn: "Waste & Recycling", hash: "#waste", keywords: ["kabad", "recycling", "kachra", "scrap"] },
    { id: "c33", tier: 1, nameHi: "33. युवा संगम व क्लब", nameEn: "Youth & Sports Clubs", hash: "#youth", keywords: ["khelkud", "yuva", "club", "fitness"] },

    { id: "g34", tier: 2, nameHi: "34. एक्शन (तीरंदाजी)", nameEn: "Action (Archery Desi)", hash: "#game-archery", keywords: ["teer", "dhanush", "action", "archery"] },
    { id: "g35", tier: 2, nameHi: "35. एडवेंचर (जंगल सफारी)", nameEn: "Adventure (Jungle Safari)", hash: "#game-safari", keywords: ["safari", "jungle", "adventure", "khoj"] },
    { id: "g36", tier: 2, nameHi: "36. आर्केड (गेंद टप्पा)", nameEn: "Arcade (Bounce Ball)", hash: "#game-bounce", keywords: ["ball", "arcade", "tappa"] },
    { id: "g37", tier: 2, nameHi: "37. देसी लूडो (Board)", nameEn: "Board (Desi Ludo Free)", hash: "#game-ludo", keywords: ["ludo", "goti", "saap seedhi", "board"] },
    { id: "g38", tier: 2, nameHi: "38. ताश सोलिटेयर (Cards - Zero Cash)", nameEn: "Cards (Solitaire Free)", hash: "#game-solitaire", keywords: ["taash", "solitaire", "cards"] },
    { id: "g39", tier: 2, nameHi: "39. कैज़ुअल (रंगोली बनाओ)", nameEn: "Casual (Rangoli Craft)", hash: "#game-rangoli", keywords: ["rangoli", "color", "casual", "kala"] },
    { id: "g40", tier: 2, nameHi: "40. ज्ञान क्विज़ (Educational)", nameEn: "Educational (Bharat Quiz)", hash: "#game-quiz", keywords: ["quiz", "gyan", "sawal", "gk"] },
    { id: "g41", tier: 2, nameHi: "41. संगीत ताल (Music Beat)", nameEn: "Music (Taal Beat)", hash: "#game-music", keywords: ["tabla", "dholak", "music", "taal"] },
    { id: "g42", tier: 2, nameHi: "42. देसी दौड़ (Platformer)", nameEn: "Platformer (Desi Runner)", hash: "#game-runner", keywords: ["run", "daud", "chhalang"] },
    { id: "g43", tier: 2, nameHi: "43. दिमागी कसरत (Puzzle)", nameEn: "Puzzle (Brain Teasers)", hash: "#game-puzzle", keywords: ["paheli", "dimag", "puzzle", "soch"] },
    { id: "g44", tier: 2, nameHi: "44. बैलगाड़ी रेस (Racing)", nameEn: "Racing (Cart Sprint)", hash: "#game-racing", keywords: ["race", "gaadi", "speed"] },
    { id: "g45", tier: 2, nameHi: "45. रोल प्ले (गाँव का प्रधान)", nameEn: "Role Playing (Gram Pradhan)", hash: "#game-pradhan", keywords: ["pradhan", "panchayat", "roleplay"] },
    { id: "g46", tier: 2, nameHi: "46. खेत सिमुलेटर (Simulation)", nameEn: "Simulation (Farm Simulator)", hash: "#game-farmsim", keywords: ["farming", "kisan sim", "tractor"] },
    { id: "g47", tier: 2, nameHi: "47. गली क्रिकेट (Sports)", nameEn: "Sports (Gully Cricket)", hash: "#game-cricket", keywords: ["cricket", "bat", "ball", "match"] },
    { id: "g48", tier: 2, nameHi: "48. व्यूह रचना (Strategy)", nameEn: "Strategy (Chanakya Niti)", hash: "#game-strategy", keywords: ["shatranj", "niti", "strategy"] },
    { id: "g49", tier: 2, nameHi: "49. सामान्य ज्ञान ट्रिविया (Trivia)", nameEn: "Trivia (Desi Trivia)", hash: "#game-trivia", keywords: ["trivia", "facts", "jankari"] },
    { id: "g50", tier: 2, nameHi: "50. शब्द पहेली (Word Game)", nameEn: "Word (Shabd Kosh Puzzle)", hash: "#game-word", keywords: ["shabd", "varnamala", "word"] }
  ];

  function injectMenuButton() {
    if (document.getElementById('rm-menu-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'rm-menu-btn';
    btn.setAttribute('aria-label', 'Open Menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.style.cssText = 'background:none; border:none; color:#ffffff; cursor:pointer; padding:6px; margin-right:8px; display:inline-flex; align-items:center; justify-content:center; -webkit-tap-highlight-color:transparent;';
    btn.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;

    const allDivs = document.querySelectorAll('div, span, header');
    let rmLogoEl = null;
    for (let el of allDivs) {
      if (el.children.length === 0 && el.textContent.trim() === 'RM') {
        rmLogoEl = el;
        break;
      }
    }

    if (rmLogoEl && rmLogoEl.parentElement) {
      rmLogoEl.parentElement.style.display = 'flex';
      rmLogoEl.parentElement.style.alignItems = 'center';
      rmLogoEl.parentElement.insertBefore(btn, rmLogoEl);
    } else {
      const topBar = document.querySelector('.rm-header') || document.querySelector('header') || document.body.firstElementChild;
      if (topBar) topBar.insertBefore(btn, topBar.firstChild);
    }
  }

  function injectDrawerDOM() {
    if (!document.getElementById('rm-drawer-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.id = 'rm-drawer-backdrop';
      backdrop.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); backdrop-filter:blur(3px); z-index:9998; display:none;';
      document.body.appendChild(backdrop);
    }

    if (!document.getElementById('rm-drawer-menu')) {
      const drawer = document.createElement('aside');
      drawer.id = 'rm-drawer-menu';
      drawer.setAttribute('aria-hidden', 'true');
      drawer.style.cssText = 'position:fixed; top:0; left:0; width:310px; max-width:85vw; height:100vh; background:#080e14; color:#f0f6fc; z-index:9999; transform:translateX(-100%); transition:transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); overflow-y:auto; box-shadow:5px 0 25px rgba(0,0,0,0.6); padding:1rem; box-sizing:border-box; font-family:system-ui,-apple-system,sans-serif;';
      drawer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:0.75rem; border-bottom:1px solid #21262d; margin-bottom:1rem;">
          <div style="font-weight:700; font-size:1.1rem; color:#00dc82; display:flex; align-items:center; gap:8px;">
            <span>☰</span> RM WORLD (50 सेवाएं)
          </div>
          <button id="rm-drawer-close" aria-label="Close Menu" style="background:none; border:none; color:#f0f6fc; font-size:1.5rem; cursor:pointer; padding:4px 8px;">✕</button>
        </div>
        
        <div>
          <div style="font-size:0.78rem; font-weight:700; text-transform:uppercase; color:#8b949e; letter-spacing:0.5px; margin-bottom:0.6rem;">
            Tier 1: 33 Applications & Utilities
          </div>
          <ul id="rm-tier1-list" style="list-style:none; padding:0; margin:0 0 1.5rem 0;"></ul>

          <div style="font-size:0.78rem; font-weight:700; text-transform:uppercase; color:#8b949e; letter-spacing:0.5px; margin-bottom:0.6rem;">
            Tier 2: 17 Free Casual Games (Anti-RMG)
          </div>
          <ul id="rm-tier2-list" style="list-style:none; padding:0; margin:0;"></ul>
        </div>
      `;
      document.body.appendChild(drawer);
    }
  }

  function renderDrawerMenu() {
    const tier1Container = document.getElementById('rm-tier1-list');
    const tier2Container = document.getElementById('rm-tier2-list');
    if (!tier1Container || !tier2Container) return;

    tier1Container.innerHTML = '';
    tier2Container.innerHTML = '';

    RM_CATEGORIES.forEach(item => {
      const li = document.createElement('li');
      li.style.cssText = 'margin-bottom:6px;';
      const a = document.createElement('a');
      a.href = item.hash;
      a.textContent = item.nameHi;
      a.setAttribute('data-en', item.nameEn);
      a.style.cssText = 'display:block; padding:0.6rem 0.8rem; border-radius:8px; color:#e6edf3; text-decoration:none; font-size:0.9rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); transition:background 0.2s;';
      li.appendChild(a);

      if (item.tier === 1) {
        tier1Container.appendChild(li);
      } else {
        tier2Container.appendChild(li);
      }
    });
  }

  function bindDrawerEvents() {
    const drawer = document.getElementById('rm-drawer-menu');
    const backdrop = document.getElementById('rm-drawer-backdrop');

    function openDrawer() {
      const menuBtn = document.getElementById('rm-menu-btn');
      if (drawer) drawer.style.transform = 'translateX(0)';
      if (drawer) drawer.setAttribute('aria-hidden', 'false');
      if (backdrop) backdrop.style.display = 'block';
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      const menuBtn = document.getElementById('rm-menu-btn');
      if (drawer) drawer.style.transform = 'translateX(-100%)';
      if (drawer) drawer.setAttribute('aria-hidden', 'true');
      if (backdrop) backdrop.style.display = 'none';
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('#rm-menu-btn')) {
        e.preventDefault();
        openDrawer();
      } else if (e.target.closest('#rm-drawer-close') || e.target === backdrop) {
        e.preventDefault();
        closeDrawer();
      }
    });

    if (drawer) {
      drawer.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a')) {
          closeDrawer();
        }
      });
    }
  }

  function boot() {
    injectDrawerDOM();
    injectMenuButton();
    renderDrawerMenu();
    bindDrawerEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  setTimeout(injectMenuButton, 300);
  setTimeout(injectMenuButton, 1000);

  window.RM_CATEGORIES = RM_CATEGORIES;
})();
