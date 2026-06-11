// PC Build Guide — interactive configurator
// Edit the CATALOG below to change parts, prices, or notes. Prices are
// rough street-price estimates; update them occasionally.
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('builder');
  if (!root) return;

  const CATALOG = {
    cpu: {
      label: 'CPU',
      hint: 'The platform you pick here decides which motherboards fit.',
      options: [
        { id: 'r5-7600', name: 'AMD Ryzen 5 7600', price: 190, platform: 'am5', note: '6 cores — the value pick for pure gaming' },
        { id: 'r7-7800x3d', name: 'AMD Ryzen 7 7800X3D', price: 350, platform: 'am5', note: '3D V-Cache — the gaming benchmark king' },
        { id: 'r9-7950x', name: 'AMD Ryzen 9 7950X', price: 500, platform: 'am5', note: '16 cores for rendering and heavy multitasking' },
        { id: 'i5-14600k', name: 'Intel Core i5-14600K', price: 260, platform: 'lga1700', note: 'Strong all-rounder on Intel' }
      ]
    },
    motherboard: {
      label: 'Motherboard',
      hint: 'Filtered to match your CPU platform automatically.',
      options: [
        { id: 'b650', name: 'MSI B650 Tomahawk WiFi', price: 180, platform: 'am5', note: 'Everything most AM5 builds need' },
        { id: 'x670', name: 'Gigabyte X670 Aorus Elite AX', price: 250, platform: 'am5', note: 'More connectivity and power headroom' },
        { id: 'b760', name: 'MSI B760 Tomahawk WiFi', price: 170, platform: 'lga1700', note: 'Solid mainstream Intel board' },
        { id: 'z790', name: 'ASUS TUF Z790-Plus WiFi', price: 260, platform: 'lga1700', note: 'For overclocking unlocked Intel chips' }
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
        { id: 'igpu', name: 'Integrated graphics (add a GPU later)', price: 0, minPsu: 450, note: 'Office work and light duty only' },
        { id: 'rtx4060', name: 'NVIDIA RTX 4060', price: 300, minPsu: 550, note: 'Great 1080p gaming' },
        { id: 'rx7800xt', name: 'AMD RX 7800 XT', price: 480, minPsu: 650, note: 'Excellent 1440p value' },
        { id: 'rtx4070s', name: 'NVIDIA RTX 4070 Super', price: 600, minPsu: 650, note: 'Strong 1440p, entry 4K' },
        { id: 'rtx4080s', name: 'NVIDIA RTX 4080 Super', price: 1000, minPsu: 750, note: 'High-refresh 4K gaming' }
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
        { id: 'air', name: 'Tower air cooler (Peerless Assassin 120)', price: 35, note: 'Quiet, reliable, unbeatable value' },
        { id: 'aio240', name: '240mm AIO liquid cooler', price: 90, note: 'Cooler temps, cleaner look' },
        { id: 'aio360', name: '360mm AIO liquid cooler', price: 140, note: 'For 16-core chips under sustained load' }
      ]
    },
    pcCase: {
      label: 'Case',
      hint: 'Prioritize mesh front panels — airflow beats looks.',
      options: [
        { id: 'case-budget', name: 'Budget mesh ATX case', price: 70, note: 'Plain but cool and quiet' },
        { id: 'case-mid', name: 'Lian Li Lancool 216', price: 100, note: 'Outstanding airflow per dollar' },
        { id: 'case-prem', name: 'Lian Li O11 Dynamic EVO', price: 150, note: 'The showcase build favorite' }
      ]
    },
    psu: {
      label: 'Power Supply',
      hint: "Don't cheap out here — it powers everything else.",
      options: [
        { id: 'psu550', name: '550W 80+ Bronze', price: 55, watts: 550, note: 'Budget builds without a big GPU' },
        { id: 'psu650', name: '650W 80+ Gold', price: 90, watts: 650, note: 'Covers most single-GPU builds' },
        { id: 'psu750', name: '750W 80+ Gold', price: 110, watts: 750, note: 'Headroom for high-end GPUs' },
        { id: 'psu850', name: '850W 80+ Gold', price: 140, watts: 850, note: 'Future-proof for flagship cards' }
      ]
    }
  };

  const PRESETS = {
    budget: {
      label: 'Budget Gaming',
      picks: { cpu: 'r5-7600', motherboard: 'b650', memory: 'ram16', gpu: 'rtx4060', storage: 'ssd1', cooling: 'air', pcCase: 'case-budget', psu: 'psu550' }
    },
    sweet: {
      label: 'Sweet Spot',
      picks: { cpu: 'r7-7800x3d', motherboard: 'b650', memory: 'ram32', gpu: 'rx7800xt', storage: 'ssd2', cooling: 'aio240', pcCase: 'case-mid', psu: 'psu650' }
    },
    high: {
      label: 'High-End Gaming',
      picks: { cpu: 'r7-7800x3d', motherboard: 'x670', memory: 'ram32', gpu: 'rtx4080s', storage: 'ssd2', cooling: 'aio360', pcCase: 'case-prem', psu: 'psu850' }
    },
    creator: {
      label: 'Creator',
      picks: { cpu: 'r9-7950x', motherboard: 'x670', memory: 'ram64', gpu: 'rtx4070s', storage: 'ssd4', cooling: 'aio360', pcCase: 'case-mid', psu: 'psu750' }
    }
  };

  const selection = { ...PRESETS.sweet.picks };
  const summaryList = document.getElementById('summary-list');
  const summaryTotal = document.getElementById('summary-total');
  const summaryNote = document.getElementById('summary-note');
  const copyBtn = document.getElementById('copy-build');
  const presetBar = document.getElementById('preset-bar');

  function getOption(cat, id) {
    return CATALOG[cat].options.find(o => o.id === id);
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
      label.dataset.platform = opt.platform || '';

      const top = document.createElement('span');
      top.className = 'builder-option-top';
      const name = document.createElement('span');
      name.className = 'builder-option-name';
      name.textContent = opt.name;
      const price = document.createElement('span');
      price.className = 'builder-option-price';
      price.textContent = opt.price === 0 ? '$0' : `~$${opt.price}`;
      top.append(name, price);

      const note = document.createElement('span');
      note.className = 'builder-option-note';
      note.textContent = opt.note;

      label.append(top, note);
      fieldset.append(input, label);

      input.addEventListener('change', () => {
        selection[cat] = opt.id;
        if (cat === 'cpu') enforcePlatform(opt.platform);
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
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      Object.assign(selection, preset.picks);
      syncRadios();
      enforcePlatform(getOption('cpu', selection.cpu).platform);
      update(preset.label);
    });
    presetBar.appendChild(btn);
  });

  function syncRadios() {
    Object.entries(selection).forEach(([cat, id]) => {
      const input = document.getElementById(`opt-${id}`);
      if (input) input.checked = true;
    });
  }

  // Hide motherboards that don't fit the chosen CPU platform; re-pick if needed
  function enforcePlatform(platform) {
    const group = root.querySelector('[data-category="motherboard"]');
    let needsRepick = false;
    CATALOG.motherboard.options.forEach(opt => {
      const input = document.getElementById(`opt-${opt.id}`);
      const label = group.querySelector(`label[for="opt-${opt.id}"]`);
      const fits = opt.platform === platform;
      input.disabled = !fits;
      label.classList.toggle('builder-option-disabled', !fits);
      if (!fits && selection.motherboard === opt.id) needsRepick = true;
    });
    if (needsRepick) {
      const first = CATALOG.motherboard.options.find(o => o.platform === platform);
      selection.motherboard = first.id;
      document.getElementById(`opt-${first.id}`).checked = true;
    }
  }

  // ===== Summary =====
  function update(presetLabel) {
    summaryList.innerHTML = '';
    let total = 0;

    Object.entries(CATALOG).forEach(([cat, group]) => {
      const opt = getOption(cat, selection[cat]);
      total += opt.price;

      const li = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'summary-cat';
      label.textContent = group.label;

      const value = document.createElement('span');
      value.className = 'summary-part';
      value.textContent = opt.name;

      const meta = document.createElement('span');
      meta.className = 'summary-meta';
      const price = document.createElement('span');
      price.textContent = opt.price === 0 ? '$0' : `~$${opt.price}`;
      meta.appendChild(price);

      if (opt.price > 0 && window.hbShop) {
        [['Amazon', window.hbShop.amazonSearchUrl(opt.name)],
         ['Newegg', window.hbShop.neweggSearchUrl(opt.name)]].forEach(([store, url]) => {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'sponsored nofollow noopener';
          a.textContent = store;
          a.setAttribute('aria-label', `Shop for ${opt.name} on ${store} (opens in new tab)`);
          meta.appendChild(a);
        });
      }

      li.append(label, value, meta);
      summaryList.appendChild(li);
    });

    summaryTotal.textContent = `~$${total.toLocaleString()}`;

    // PSU sanity check against the GPU
    const gpu = getOption('gpu', selection.gpu);
    const psu = getOption('psu', selection.psu);
    if (psu.watts < gpu.minPsu) {
      summaryNote.textContent = `Heads up: that GPU wants at least a ${gpu.minPsu}W power supply — consider stepping the PSU up.`;
      summaryNote.classList.add('warn');
    } else if (presetLabel) {
      summaryNote.textContent = `${presetLabel} preset loaded — customize any part below.`;
      summaryNote.classList.remove('warn');
    } else {
      summaryNote.textContent = '';
      summaryNote.classList.remove('warn');
    }
  }

  // ===== Copy build list =====
  copyBtn.addEventListener('click', async () => {
    const lines = Object.entries(CATALOG).map(([cat, group]) => {
      const opt = getOption(cat, selection[cat]);
      return `${group.label}: ${opt.name} — ${opt.price === 0 ? '$0' : `~$${opt.price}`}`;
    });
    const total = Object.entries(selection)
      .reduce((sum, [cat, id]) => sum + getOption(cat, id).price, 0);
    lines.push(`Total: ~$${total.toLocaleString()}`);
    lines.push('Built with the guide at https://huntersb.com/guide.html');
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      copyBtn.textContent = 'Copied!';
    } catch {
      copyBtn.textContent = 'Copy failed — select manually';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy build list'; }, 2000);
  });

  // ===== Init =====
  syncRadios();
  enforcePlatform(getOption('cpu', selection.cpu).platform);
  update(PRESETS.sweet.label);
});
