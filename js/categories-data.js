/**
 * Rise Mitra (RM WORLD) — 50 Play Store Universal Taxonomy Extension
 * Canonical Binding: File-14 Section Q & 00_SPEC (Skeleton Shell Invariant)
 * Features: 33 Apps + 17 Games (Anti-RMG) • Dynamic Accordion Injection • Auto-Close
 */

(function () {
  'use strict';

  // 1. OFFICIAL GOOGLE PLAY STORE CANONICAL 50 TAXONOMY
  const PLAYSTORE_50_CATEGORIES = [
    // TIER 1: 33 APPLICATIONS
    { id: "c01", tier: 1, hash: "#cat-art-design", en: "01. Art & Design", hi: "01. कला व डिज़ाइन" },
    { id: "c02", tier: 1, hash: "#cat-auto-vehicles", en: "02. Auto & Vehicles", hi: "02. ऑटो व वाहन" },
    { id: "c03", tier: 1, hash: "#cat-beauty", en: "03. Beauty", hi: "03. सौंदर्य" },
    { id: "c04", tier: 1, hash: "#cat-books-reference", en: "04. Books & Reference", hi: "04. पुस्तकें व संदर्भ" },
    { id: "c05", tier: 1, hash: "#merchant-khata", en: "05. Business (Sovereign Khata)", hi: "05. सॉवरेन बहीखाता (Business)" },
    { id: "c06", tier: 1, hash: "#cat-comics", en: "06. Comics", hi: "06. कॉमिक्स" },
    { id: "c07", tier: 1, hash: "#cat-communication", en: "07. Communication", hi: "07. संचार व मैसेजिंग" },
    { id: "c08", tier: 1, hash: "#cat-dating", en: "08. Dating", hi: "08. परिचय व रिश्ते" },
    { id: "c09", tier: 1, hash: "#hunar-seekhein", en: "09. Education (Hunar)", hi: "09. हुनर सीखें (Education)" },
    { id: "c10", tier: 1, hash: "#cat-entertainment", en: "10. Entertainment", hi: "10. मनोरंजन व वीडियो" },
    { id: "c11", tier: 1, hash: "#cat-events", en: "11. Events", hi: "11. मेले व आयोजन" },
    { id: "c12", tier: 1, hash: "#cat-family", en: "12. Family", hi: "12. परिवार व बच्चे" },
    { id: "c13", tier: 1, hash: "#ledger-balance", en: "13. Finance (RM CASH)", hi: "13. RM CASH लेज़र (Finance)" },
    { id: "c14", tier: 1, hash: "#cat-food-drink", en: "14. Food & Drink", hi: "14. खान-पान व ढाबा" },
    { id: "c15", tier: 1, hash: "#cat-health", en: "15. Health & Fitness", hi: "15. स्वास्थ्य व वेलनेस" },
    { id: "c16", tier: 1, hash: "#cat-house-home", en: "16. House & Home", hi: "16. मकान व मरम्मत" },
    { id: "c17", tier: 1, hash: "#cat-libraries-demo", en: "17. Libraries & Demo", hi: "17. लाइब्रेरी व टूल्स" },
    { id: "c18", tier: 1, hash: "#cat-lifestyle", en: "18. Lifestyle", hi: "18. जीवनशैली" },
    { id: "c19", tier: 1, hash: "#cat-maps", en: "19. Maps & Navigation", hi: "19. नक्शा व नेविगेशन" },
    { id: "c20", tier: 1, hash: "#cat-medical", en: "20. Medical", hi: "20. चिकित्सा व डॉक्टर" },
    { id: "c21", tier: 1, hash: "#cat-music-audio", en: "21. Music & Audio", hi: "21. संगीत व पॉडकास्ट" },
    { id: "c22", tier: 1, hash: "#cat-news", en: "22. News & Magazines", hi: "22. समाचार व पत्रिकाएं" },
    { id: "c23", tier: 1, hash: "#cat-parenting", en: "23. Parenting", hi: "23. शिशु पोषण व परवरिश" },
    { id: "c24", tier: 1, hash: "#cat-personalization", en: "24. Personalization", hi: "24. थीम्स व रिंगटोन" },
    { id: "c25", tier: 1, hash: "#cat-photography", en: "25. Photography", hi: "25. कैमरा व फोटो" },
    { id: "c26", tier: 1, hash: "#cat-productivity", en: "26. Productivity", hi: "26. उत्पादकता व ऑफिस" },
    { id: "c27", tier: 1, hash: "#kirana-store", en: "27. Shopping (0% Kirana)", hi: "27. किराना 0% कमीशन (Shopping)" },
    { id: "c28", tier: 1, hash: "#cat-social", en: "28. Social", hi: "28. चौपाल व समाज" },
    { id: "c29", tier: 1, hash: "#cat-sports-app", en: "29. Sports (Apps)", hi: "29. खेलकूद व स्कोर" },
    { id: "c30", tier: 1, hash: "#cat-tools", en: "30. Tools", hi: "30. कैलकुलेटर व यूटिलिटी" },
    { id: "c31", tier: 1, hash: "#cat-travel", en: "31. Travel & Local", hi: "31. यात्रा व परिवहन" },
    { id: "c32", tier: 1, hash: "#cat-video", en: "32. Video Players & Editors", hi: "32. वीडियो प्लेयर व एडिटर" },
    { id: "c33", tier: 1, hash: "#cat-weather", en: "33. Weather", hi: "33. मौसम पूर्वानुमान" },

    // TIER 2: 17 CASUAL GAMES (ANTI-RMG)
    { id: "g34", tier: 2, hash: "#game-action", en: "01. Action", hi: "01. Action (एक्शन गेम्स)" },
    { id: "g35", tier: 2, hash: "#game-adventure", en: "02. Adventure", hi: "02. Adventure (रोमांचक यात्रा)" },
    { id: "g36", tier: 2, hash: "#game-arcade", en: "03. Arcade", hi: "03. Arcade (गेंद टप्पा / आर्केड)" },
    { id: "g37", tier: 2, hash: "#game-board", en: "04. Board", hi: "04. Board (देसी लूडो व कैरम)" },
    { id: "g38", tier: 2, hash: "#game-card", en: "05. Card", hi: "05. Card (सॉलिटेयर - Zero Cash)" },
    { id: "g39", tier: 2, hash: "#game-casino", en: "06. Casino (Points Only)", hi: "06. Casino (पॉइंट्स लकी चक्र)" },
    { id: "g40", tier: 2, hash: "#game-casual", en: "07. Casual", hi: "07. Casual (कैज़ुअल खेल)" },
    { id: "g41", tier: 2, hash: "#game-educational", en: "08. Educational", hi: "08. Educational (ज्ञान क्विज़)" },
    { id: "g42", tier: 2, hash: "#game-music", en: "09. Music", hi: "09. Music (संगीत ताल व बीट)" },
    { id: "g43", tier: 2, hash: "#game-puzzle", en: "10. Puzzle", hi: "10. Puzzle (दिमागी पहेलियाँ)" },
    { id: "g44", tier: 2, hash: "#game-racing", en: "11. Racing", hi: "11. Racing (बैलगाड़ी / कार रेस)" },
    { id: "g45", tier: 2, hash: "#game-role-playing", en: "12. Role Playing", hi: "12. Role Playing (गाँव का प्रधान)" },
    { id: "g46", tier: 2, hash: "#game-simulation", en: "13. Simulation", hi: "13. Simulation (खेत सिमुलेटर)" },
    { id: "g47", tier: 2, hash: "#game-sports", en: "14. Sports", hi: "14. Sports (गली क्रिकेट)" },
    { id: "g48", tier: 2, hash: "#game-strategy", en: "15. Strategy", hi: "15. Strategy (चाणक्य नीति / शतरंज)" },
    { id: "g49", tier: 2, hash: "#game-trivia", en: "16. Trivia", hi: "16. Trivia (देसी ट्रिविया)" },
    { id: "g50", tier: 2, hash: "#game-word", en: "17. Word", hi: "17. Word (शब्द पहेली)" }
  ];

  // 2. DYNAMIC ACCORDION INJECTION & AUTO-RENDER
  function renderCategoriesAccordion() {
    const tier1Box = document.getElementById('tier1-list');
    const tier2Box = document.getElementById('tier2-list');
    if (!tier1Box || !tier2Box) return;

    const currentLang = document.documentElement.lang || 'hi';
    tier1Box.innerHTML = '';
    tier2Box.innerHTML = '';

    PLAYSTORE_50_CATEGORIES.forEach(item => {
      const a = document.createElement('a');
      a.href = item.hash;
      a.className = 'rm-menu-item';
      a.textContent = currentLang === 'en' ? item.en : item.hi;
      a.setAttribute('data-en', item.en);
      a.setAttribute('data-hi', item.hi);

      if (item.tier === 1) {
        tier1Box.appendChild(a);
      } else {
        tier2Box.appendChild(a);
      }
    });
  }

  // 3. ACCORDION EXPAND/COLLAPSE CONTROLLER
  window.toggleAccordion = function (listId, arrowId) {
    const list = document.getElementById(listId);
    const arrow = document.getElementById(arrowId);
    if (!list) return;

    const isClosed = list.classList.contains('hidden');
    if (isClosed) {
      list.classList.remove('hidden');
      if (arrow) arrow.textContent = '▾';
    } else {
      list.classList.add('hidden');
      if (arrow) arrow.textContent = '▸';
    }
  };

  // 4. AUTO-CLOSE DRAWER ON ITEM CLICK
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('rm-menu-item')) {
      const drawer = document.getElementById('rm-drawer-menu');
      const backdrop = document.getElementById('rm-drawer-backdrop');
      if (drawer) drawer.style.transform = 'translateX(-100%)';
      if (backdrop) backdrop.style.display = 'none';
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('DOMContentLoaded', renderCategoriesAccordion);
  window.PLAYSTORE_50_CATEGORIES = PLAYSTORE_50_CATEGORIES;
  window.renderCategoriesAccordion = renderCategoriesAccordion;
})();
