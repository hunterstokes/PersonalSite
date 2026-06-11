// PC Build Guide — interactive configurator
// Edit CATALOG/PRESETS to change parts, prices, or notes, then bump
// PRICES_REVIEWED. Prices are rough street-price estimates.
// Optional per-part fields:
//   asin  — once enrolled in Amazon Associates, add an ASIN to any part to
//           generate a direct product link instead of a search link.
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('builder');
  if (!root) return;

  const PRICES_REVIEWED = 'June 2026';

  const CATALOG = {
    cpu: {
      label: 'CPU',
      hint: 'The platform you pick here decides which motherboards fit.',
      options: [
        { id: 'r5-7600', name: 'AMD Ryzen 5 7600', price: 190, platform: 'am5', watts: 105, note: '6 cores — the value pick for pure gaming' },
        { id: 'r7-7800x3d', name: 'AMD Ryzen 7 7800X3D', price: 350, platform: 'am5', watts: 120, note: '3D V-Cache — the gaming benchmark king' },
        { id: 'r9-7950x', name: 'AMD Ryzen 9 7950X', price: 500, platform: 'am5', watts: 230, note: '16 cores for rendering and heavy multitasking' },
        { id: 'i5-14600k', name: 'Intel Core i5-14600K', price: 260, platform: 'lga1700', watts: 180, note: 'Strong all-rounder on Intel' }
      ]
    },
    motherboard: {
      label: 'Motherboard',
      hint: 'Filtered to match your CPU platform automatically.',
      options: [
        { id: 'b650', name: 'MSI B650 Tomahawk WiFi', price: 180, platform: 'am5', form: 'atx', note: 'Everything most AM5 builds need' },
        { id: 'x670', name: 'Gigabyte X670 Aorus Elite AX', price: 250, platform: 'am5', form: 'atx', note: 'More connectivity and power headroom' },
        { id: 'b650i', name: 'Gigabyte B650I Aorus Ultra', price: 220, platform: 'am5', form: 'itx', note: 'Mini-ITX for compact AM5 builds' },
        { id: 'b760', name: 'MSI B760 Tomahawk WiFi', price: 170, platform: 'lga1700', form: 'atx', note: 'Solid mainstream Intel board' },
        { id: 'z790', name: 'ASUS TUF Z790-Plus WiFi', price: 260, platform: 'lga1700', form: 'atx', note: 'For overclocking unlocked Intel chips' },
        { id: 'z790i', name: 'ASUS ROG Strix Z790-I', price: 320, platform: 'lga1700', form: 'itx', note: 'Mini-ITX for compact Intel builds' }
      ]
    },
    memory: {
      label: 'Memory',
      hint: '32 GB is the sweet spot in 2026; 64 GB for creator work.',
      options: [
        { id: 'ram16', name: '16 GB (2×8) DDR5-5600', price: 55, note: 'Fine for budget gaming' },
        { id: 'ram32', name: '32 GB (2×16) DDR5-6000 CL30', price: 100, note: 'The sweet spot — fast and roomy' },
        { id: 'ram64', name: '64 GB (2×32) DDR5-6000', price: 190, note: 'Video editing, VMs, heavy multitasking' }
      ]
    },
    gpu: {
      label: 'Graphics Card',
      hint: 'The biggest single factor in gaming performance — and price.',
      options: [
        { id: 'igpu', name: 'Integrated graphics (add a GPU later)', price: 0, watts: 0, perf: 'Desktop work and media only', note: 'Office work and light duty only' },
        { id: 'rtx4060', name: 'NVIDIA RTX 4060', price: 300, watts: 115, perf: 'Solid 1080p gaming', note: 'Great 1080p gaming' },
        { id: 'rx7800xt', name: 'AMD RX 7800 XT', price: 480, watts: 265, perf: 'Excellent 1440p gaming', note: 'Excellent 1440p value' },
        { id: 'rtx4070s', name: 'NVIDIA RTX 4070 Super', price: 600, watts: 220, perf: 'High-refresh 1440p, entry 4K', note: 'Strong 1440p, entry 4K' },
        { id: 'rtx4080s', name: 'NVIDIA RTX 4080 Super', price: 1000, watts: 320, perf: 'High-refresh 4K gaming', note: 'High-refresh 4K gaming' }
      ]
    },
    storage: {
      label: 'Storage',
      hint: 'NVMe only — SATA SSDs are not worth the savings anymore.',
      options: [
        { id: 'ssd1', name: '1 TB NVMe Gen3 SSD', price: 60, note: 'Enough for OS plus a few games' },
        { id: 'ssd2', name: '2 TB NVMe Gen4 SSD', price: 120, note: 'The comfortable choice' },
        { id: 'ssd4', name: '4 TB NVMe Gen4 SSD', price: 250, note: 'Big game libraries or media work' }
      ]
    },
    cooling: {
      label: 'CPU Cooling',
      hint: 'A good tower air cooler handles most CPUs quietly.',
      options: [
        { id: 'air', name: 'Tower air cooler (Peerless Assassin 120)', price: 35, radiator: 0, note: 'Quiet, reliable, unbeatable value' },
        { id: 'aio240', name: '240mm AIO liquid cooler', price: 90, radiator: 240, note: 'Cooler temps, cleaner look' },
        { id: 'aio360', name: '360mm AIO liquid cooler', price: 140, radiator: 360, note: 'For 16-core chips under sustained load' }
      ]
    },
    pcCase: {
      label: 'Case',
      hint: 'Filtered by your motherboard size and cooler choice.',
      options: [
        { id: 'case-budget', name: 'Budget mesh ATX case', price: 70, forms: ['atx', 'matx', 'itx'], radiators: [0, 240], psuForm: 'atx', note: 'Plain but cool and quiet' },
        { id: 'case-mid', name: 'Lian Li Lancool 216', price: 100, forms: ['atx', 'matx', 'itx'], radiators: [0, 240, 360], psuForm: 'atx', note: 'Outstanding airflow per dollar' },
        { id: 'case-prem', name: 'Lian Li O11 Dynamic EVO', price: 150, forms: ['atx', 'matx', 'itx'], radiators: [0, 240, 360], psuForm: 'atx', note: 'The showcase build favorite' },
        { id: 'case-itx', name: 'Cooler Master NR200P (ITX)', price: 100, forms: ['itx'], radiators: [0, 240], psuForm: 'sfx', note: 'Legendary 18-liter compact build' }
      ]
    },
    psu: {
      label: 'Power Supply',
      hint: "Don't cheap out here — it powers everything else.",
      options: [
        { id: 'psu550', name: '550W 80+ Bronze', price: 55, watts: 550, form: 'atx', note: 'Budget builds without a big GPU' },
        { id: 'psu650', name: '650W 80+ Gold', price: 90, watts: 650, form: 'atx', note: 'Covers most single-GPU builds' },
        { id: 'psu750', name: '750W 80+ Gold', price: 110, watts: 750, form: 'atx', note: 'Headroom for high-end GPUs' },
        { id: 'psu850', name: '850W 80+ Gold', price: 140, watts: 850, form: 'atx', note: 'Future-proof for flagship cards' },
        { id: 'sfx650', name: '650W SFX 80+ Gold', price: 120, watts: 650, form: 'sfx', note: 'Compact PSU for ITX cases' },
        { id: 'sfx750', name: '750W SFX 80+ Gold', price: 160, watts: 750, form: 'sfx', note: 'High-end power in a small box' }
      ]
    },
    monitor: {
      label: 'Monitor (optional)',
      hint: 'Match the panel to what the GPU can actually drive.',
      options: [
        { id: 'mon-skip', name: 'Skip — using an existing display', price: 0, note: '' },
        { id: 'mon-1080', name: '24″ 1080p 180Hz IPS', price: 130, note: 'Pairs with RTX 4060-class cards' },
        { id: 'mon-1440', name: '27″ 1440p 180Hz IPS', price: 250, note: 'The sweet-spot gaming panel' },
        { id: 'mon-4k', name: '27″ 4K 144Hz IPS', price: 500, note: 'For 4070 Super and up' }
      ]
    },
    peripherals: {
      label: 'Keyboard & Mouse (optional)',
      hint: 'Skip if you already have a set you like.',
      options: [
        { id: 'periph-skip', name: 'Skip — already covered', price: 0, note: '' },
        { id: 'periph-combo', name: 'Wireless keyboard + mouse combo', price: 60, note: 'Reliable everyday set' },
        { id: 'periph-mech', name: 'Mechanical keyboard + gaming mouse', price: 150, note: 'The proper gaming feel' }
      ]
    }
  };

  const PRESETS = {
    budget: {
      label: 'Budget Gaming',
      picks: { cpu: 'r5-7600', motherboard: 'b650', memory: 'ram16', gpu: 'rtx4060', storage: 'ssd1', cooling: 'air', pcCase: 'case-budget', psu: 'psu550', monitor: 'mon-skip', peripherals: 'periph-skip' }
    },
    sweet: {
      label: 'Sweet Spot',
      picks: { cpu: 'r7-7800x3d', motherboard: 'b650', memory: 'ram32', gpu: 'rx7800xt', storage: 'ssd2', cooling: 'aio240', pcCase: 'case-mid', psu: 'psu650', monitor: 'mon-skip', peripherals: 'periph-skip' }
    },
    high: {
      label: 'High-End Gaming',
      picks: { cpu: 'r7-7800x3d', motherboard: 'x670', memory: 'ram32', gpu: 'rtx4080s', storage: 'ssd2', cooling: 'aio360', pcCase: 'case-prem', psu: 'psu850', monitor: 'mon-skip', peripherals: 'periph-skip' }
    },
    creator: {
      label: 'Creator',
      picks: { cpu: 'r9-7950x', motherboard: 'x670', memory: 'ram64', gpu: 'rtx4070s', storage: 'ssd4', cooling: 'aio360', pcCase: 'case-mid', psu: 'psu750', monitor: 'mon-skip', peripherals: 'periph-skip' }
    },
    itx: {
      label: 'Compact (ITX)',
      picks: { cpu: 'r7-7800x3d', motherboard: 'b650i', memory: 'ram32', gpu: 'rx7800xt', storage: 'ssd2', cooling: 'aio240', pcCase: 'case-itx', psu: 'sfx750', monitor: 'mon-skip', peripherals: 'periph-skip' }
    }
  };

  const PSU_SIZES = [550, 650, 750, 850, 1000];
  const selection = { ...PRESETS.sweet.picks };

  const summaryList = document.getElementById('summary-list');
  const summaryTotal = document.getElementById('summary-total');
  const summaryNote = document.getElementById('summary-note');
  const summaryPerf = document.getElementById('summary-perf');
  const summaryDraw = document.getElementById('summary-draw');
  const copyBtn = document.getElementById('copy-build');
  const shareBtn = document.getElementById('share-build');
  const presetBar = document.getElementById('preset-bar');
  const pricesStamp = document.getElementById('prices-stamp');

  if (pricesStamp) pricesStamp.textContent = `Prices last reviewed ${PRICES_REVIEWED}`;

  function getOption(cat, id) {
    return CATALOG[cat].options.find(o => o.id === id);
  }
  const cur = (cat) => getOption(cat, selection[cat]);

  // Privacy-friendly event counting — no-op until GoatCounter is enabled
  const track = (name) => window.hbShop && window.hbShop.trackEvent(name);

  function shopLinkFor(opt, store) {
    if (store === 'Amazon') {
      // Direct product link when an ASIN is configured; search link otherwise
      return opt.asin
        ? window.hbShop.amazonProductUrl(opt.asin)
        : window.hbShop.amazonSearchUrl(opt.name);
    }
    return window.hbShop.neweggSearchUrl(opt.name);
  }

  // ===== Render category fieldsets =====
  Object.entries(CATALOG).forEach(([cat, group]) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'builder-group';
    fieldset.dataset.category = cat;

    const legend = document.createElement('legend');
    legend.textContent = group.label;
    fieldset.appendChild(legend);

    const hint = document.createElement('p');
    hint.className = 'builder-hint';
    hint.textContent = group.hint;
    fieldset.appendChild(hint);

    group.options.forEach(opt => {
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = cat;
      input.id = `opt-${opt.id}`;
      input.value = opt.id;
      input.className = 'visually-hidden builder-radio';

      const label = document.createElement('label');
      label.className = 'builder-option';
      label.setAttribute('for', input.id);

      const top = document.createElement('span');
      top.className = 'builder-option-top';
      const name = document.createElement('span');
      name.className = 'builder-option-name';
      name.textContent = opt.name;
      const price = document.createElement('span');
      price.className = 'builder-option-price';
      price.textContent = opt.price === 0 ? '$0' : `~$${opt.price}`;
      top.append(name, price);
      label.appendChild(top);

      if (opt.note) {
        const note = document.createElement('span');
        note.className = 'builder-option-note';
        note.textContent = opt.note;
        label.appendChild(note);
      }

      fieldset.append(input, label);

      input.addEventListener('change', () => {
        selection[cat] = opt.id;
        update();
      });
    });

    root.appendChild(fieldset);
  });

  // ===== Preset buttons =====
  Object.entries(PRESETS).forEach(([key, preset]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.dataset.preset = key;
    btn.addEventListener('click', () => {
      applyPreset(key);
      track(`preset-${key}`);
    });
    presetBar.appendChild(btn);
  });

  function applyPreset(key) {
    Object.assign(selection, PRESETS[key].picks);
    update(PRESETS[key].label);
  }

  function syncRadios() {
    Object.values(selection).forEach(id => {
      const input = document.getElementById(`opt-${id}`);
      if (input) input.checked = true;
    });
  }

  // ===== Compatibility =====
  // Each rule filters a category against upstream picks, disabling options
  // that don't fit and re-picking the first valid one when needed. Rules run
  // in dependency order so repicks cascade cleanly in a single pass.
  function filterCategory(cat, fits, prefer) {
    let needsRepick = false;
    CATALOG[cat].options.forEach(opt => {
      const input = document.getElementById(`opt-${opt.id}`);
      const label = root.querySelector(`label[for="opt-${opt.id}"]`);
      const ok = fits(opt);
      input.disabled = !ok;
      label.classList.toggle('builder-option-disabled', !ok);
      if (!ok && selection[cat] === opt.id) needsRepick = true;
    });
    if (needsRepick) {
      const candidates = CATALOG[cat].options.filter(fits);
      const pick = (prefer && candidates.find(prefer)) || candidates[0];
      selection[cat] = pick.id;
      document.getElementById(`opt-${pick.id}`).checked = true;
    }
  }

  function applyCompatibility() {
    filterCategory('motherboard', o => o.platform === cur('cpu').platform);
    filterCategory('pcCase', o =>
      o.forms.includes(cur('motherboard').form) &&
      o.radiators.includes(cur('cooling').radiator));
    const { load } = powerEstimate();
    filterCategory('psu',
      o => o.form === cur('pcCase').psuForm,
      o => o.watts >= load * 1.25);
  }

  // ===== Power estimate =====
  function powerEstimate() {
    const load = cur('cpu').watts + cur('gpu').watts + 100; // drives, fans, board
    const recommended = PSU_SIZES.find(w => w >= load * 1.4) || PSU_SIZES[PSU_SIZES.length - 1];
    return { load, recommended };
  }

  // ===== Shareable URL =====
  function selectionToHash() {
    const params = new URLSearchParams();
    Object.entries(selection).forEach(([cat, id]) => params.set(cat, id));
    return '#' + params.toString();
  }

  function applyHash() {
    if (!location.hash || location.hash.length < 2) return false;
    const params = new URLSearchParams(location.hash.slice(1));
    let applied = false;
    params.forEach((id, cat) => {
      if (CATALOG[cat] && getOption(cat, id)) {
        selection[cat] = id;
        applied = true;
      }
    });
    return applied;
  }

  // ===== Summary =====
  function update(presetLabel) {
    applyCompatibility();
    syncRadios();

    summaryList.innerHTML = '';
    let total = 0;

    Object.entries(CATALOG).forEach(([cat, group]) => {
      const opt = cur(cat);
      total += opt.price;

      const li = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'summary-cat';
      label.textContent = group.label.replace(' (optional)', '');

      const value = document.createElement('span');
      value.className = 'summary-part';
      value.textContent = opt.name;

      const meta = document.createElement('span');
      meta.className = 'summary-meta';
      const price = document.createElement('span');
      price.textContent = opt.price === 0 ? '$0' : `~$${opt.price}`;
      meta.appendChild(price);

      if (opt.price > 0 && window.hbShop) {
        ['Amazon', 'Newegg'].forEach(store => {
          const a = document.createElement('a');
          a.href = shopLinkFor(opt, store);
          a.target = '_blank';
          a.rel = 'sponsored nofollow noopener';
          a.textContent = store;
          a.setAttribute('aria-label', `Shop for ${opt.name} on ${store} (opens in new tab)`);
          a.addEventListener('click', () => track(`shop-${store.toLowerCase()}-${opt.id}`));
          meta.appendChild(a);
        });
      }

      li.append(label, value, meta);
      summaryList.appendChild(li);
    });

    summaryTotal.textContent = `~$${total.toLocaleString()}`;
    summaryPerf.textContent = cur('gpu').perf ? `Targets: ${cur('gpu').perf}` : '';

    const { load, recommended } = powerEstimate();
    summaryDraw.textContent = `Estimated system draw ~${load}W`;

    const psu = cur('psu');
    if (psu.watts < load * 1.25) {
      summaryNote.textContent = `Heads up: ~${load}W of components wants a ${recommended}W power supply — step the PSU up for safe headroom.`;
      summaryNote.classList.add('warn');
    } else if (presetLabel) {
      summaryNote.textContent = `${presetLabel} preset loaded — customize any part below.`;
      summaryNote.classList.remove('warn');
    } else {
      summaryNote.textContent = '';
      summaryNote.classList.remove('warn');
    }

    history.replaceState(null, '', selectionToHash());
  }

  // ===== Build list text =====
  function buildListText() {
    const lines = Object.entries(CATALOG).map(([cat, group]) => {
      const opt = cur(cat);
      return `${group.label.replace(' (optional)', '')}: ${opt.name} — ${opt.price === 0 ? '$0' : `~$${opt.price}`}`;
    });
    const total = Object.keys(CATALOG).reduce((sum, cat) => sum + cur(cat).price, 0);
    lines.push(`Total: ~$${total.toLocaleString()}`);
    lines.push(`Spec it yourself: https://huntersb.com/guide.html${selectionToHash()}`);
    return lines.join('\n');
  }

  copyBtn.addEventListener('click', async () => {
    track('copy-build');
    try {
      await navigator.clipboard.writeText(buildListText());
      copyBtn.textContent = 'Copied!';
    } catch {
      copyBtn.textContent = 'Copy failed — select manually';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy build list'; }, 2000);
  });

  shareBtn.addEventListener('click', async () => {
    track('share-build');
    const url = `https://huntersb.com/guide.html${selectionToHash()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My PC build', text: buildListText(), url });
        return;
      } catch {
        return; // user cancelled the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = 'Link copied!';
    } catch {
      shareBtn.textContent = 'Copy the address bar URL';
    }
    setTimeout(() => { shareBtn.textContent = 'Share build'; }, 2000);
  });

  // ===== Wizard =====
  const wizardApply = document.getElementById('wizard-apply');
  if (wizardApply) {
    wizardApply.addEventListener('click', () => {
      const pick = (name) => (document.querySelector(`input[name="${name}"]:checked`) || {}).value;
      const budget = pick('wiz-budget') || 'mid';
      const use = pick('wiz-use') || 'gaming';
      const res = pick('wiz-res') || '1440';

      let preset = 'sweet';
      if (use === 'creative') preset = 'creator';
      else if (budget === 'low') preset = 'budget';
      else if (budget === 'high' || res === '4k') preset = 'high';

      applyPreset(preset);
      track(`wizard-${preset}`);
      const details = wizardApply.closest('details');
      if (details) details.open = false;
      document.getElementById('builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Apply shared links pasted while already on the page
  window.addEventListener('hashchange', () => {
    if (location.hash === selectionToHash()) return; // our own replaceState
    if (applyHash()) update('Shared build');
  });

  // ===== Init =====
  const fromHash = applyHash();
  update(fromHash ? 'Shared build' : PRESETS.sweet.label);
});
