document.addEventListener('DOMContentLoaded', async () => {
  // ——— Theme: auto / day / night (3-state cycle) ———
  const themeToggle = document.getElementById('theme-toggle');
  const saved_theme = (await chrome.storage.local.get('theme')).theme || 'auto';
  let themeMode = saved_theme; // 'auto' | 'day' | 'night'

  function getAutoDay() {
    const hour = new Date().getHours();
    return hour >= 7 && hour < 19;
  }

  function applyTheme() {
    const isDay = themeMode === 'auto' ? getAutoDay() : themeMode === 'day';
    document.body.classList.toggle('day', isDay);
    if (themeMode === 'auto') {
      themeToggle.textContent = isDay ? '☀' : '☾';
      themeToggle.title = 'Auto (click to switch)';
    } else if (themeMode === 'day') {
      themeToggle.textContent = '☀';
      themeToggle.title = 'Day mode (click to switch)';
    } else {
      themeToggle.textContent = '☾';
      themeToggle.title = 'Night mode (click to switch)';
    }
  }
  applyTheme();

  themeToggle.addEventListener('click', async () => {
    // Spin animation
    themeToggle.classList.add('spin');
    setTimeout(() => themeToggle.classList.remove('spin'), 400);
    // Cycle: auto → day → night → auto
    if (themeMode === 'auto') themeMode = 'day';
    else if (themeMode === 'day') themeMode = 'night';
    else themeMode = 'auto';
    applyTheme();
    await chrome.storage.local.set({ theme: themeMode });
  });

  // ——— DOM refs ———
  const gridToggle = document.getElementById('grid-toggle');
  const boxesToggle = document.getElementById('boxes-toggle');
  const inspectToggle = document.getElementById('inspect-toggle');
  const rulersToggle = document.getElementById('rulers-toggle');
  const gridSizeRow = document.getElementById('grid-size-row');
  const pills = document.querySelectorAll('.pill');
  const disabledBanner = document.getElementById('disabled-banner');
  const overlaySection = document.getElementById('overlay-section');
  const hint = document.getElementById('hint');

  let gridEnabled = false;
  let boxesEnabled = false;
  let inspectEnabled = false;
  let rulersEnabled = false;
  let gridSize = 8;
  let gridMode = 'pixel';

  // ——— Check if we can run on this page ———
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('about:')
  ) {
    disabledBanner.style.display = 'block';
    overlaySection.style.display = 'none';
    document.getElementById('extract-btn')?.closest('.section').remove();
    hint.remove();
    return;
  }

  // ——— Load saved state ———
  const state = await chrome.storage.local.get(`tab-${tab.id}`);
  const saved = state[`tab-${tab.id}`];
  if (saved) {
    gridEnabled = saved.gridEnabled || false;
    boxesEnabled = saved.boxesEnabled || false;
    inspectEnabled = saved.inspectEnabled || false;
    rulersEnabled = saved.rulersEnabled || false;
    gridSize = saved.gridSize || 8;
    gridMode = saved.gridMode || 'pixel';
  }

  // ——— Apply UI state ———
  if (gridEnabled) gridToggle.classList.add('active');
  if (boxesEnabled) boxesToggle.classList.add('active');
  if (inspectEnabled) inspectToggle.classList.add('active');
  if (rulersEnabled) rulersToggle.classList.add('active');
  if (gridEnabled) gridSizeRow.style.display = 'flex';
  pills.forEach(p => {
    const match = p.dataset.mode === gridMode &&
      (gridMode !== 'pixel' || parseInt(p.dataset.size) === gridSize);
    p.classList.toggle('active', match);
  });

  // ——— Messaging ———
  async function sendToContent(message) {
    const response = await chrome.runtime.sendMessage({ target: 'content', ...message });
    if (response?.error) {
      disabledBanner.style.display = 'block';
      disabledBanner.querySelector('p').textContent = response.error;
      overlaySection.style.display = 'none';
      document.getElementById('extract-btn')?.closest('.section')?.remove();
      hint?.remove();
      return null;
    }
    return response;
  }

  async function saveState() {
    await chrome.storage.local.set({
      [`tab-${tab.id}`]: { gridEnabled, boxesEnabled, inspectEnabled, rulersEnabled, gridSize, gridMode }
    });
  }

  // ——— Grid toggle ———
  gridToggle.addEventListener('click', async () => {
    gridEnabled = !gridEnabled;
    gridToggle.classList.toggle('active', gridEnabled);
    gridSizeRow.style.display = gridEnabled ? 'flex' : 'none';
    await sendToContent({ action: 'toggleGrid', enabled: gridEnabled, gridMode, gridSize });
    await saveState();
  });

  // ——— Grid mode/size pills ———
  pills.forEach(pill => {
    pill.addEventListener('click', async () => {
      gridMode = pill.dataset.mode;
      if (pill.dataset.size) gridSize = parseInt(pill.dataset.size);
      pills.forEach(p => p.classList.toggle('active', p === pill));
      await sendToContent({ action: 'setGridMode', gridMode, gridSize });
      await saveState();
    });
  });

  // ——— Boxes toggle ———
  boxesToggle.addEventListener('click', async () => {
    boxesEnabled = !boxesEnabled;
    boxesToggle.classList.toggle('active', boxesEnabled);
    await sendToContent({ action: 'toggleBoxes', enabled: boxesEnabled });
    await saveState();
  });

  // ——— Inspect toggle ———
  inspectToggle.addEventListener('click', async () => {
    inspectEnabled = !inspectEnabled;
    inspectToggle.classList.toggle('active', inspectEnabled);
    await sendToContent({ action: 'toggleInspect', enabled: inspectEnabled });
    await saveState();
  });

  // ——— Rulers toggle ———
  rulersToggle.addEventListener('click', async () => {
    rulersEnabled = !rulersEnabled;
    rulersToggle.classList.toggle('active', rulersEnabled);
    await sendToContent({ action: 'toggleRulers', enabled: rulersEnabled });
    await saveState();
  });

  // ——— Extraction ———
  const extractBtn = document.getElementById('extract-btn');
  const typoSection = document.getElementById('typo-section');
  const typoList = document.getElementById('typo-list');
  const colorSection = document.getElementById('color-section');
  const colorList = document.getElementById('color-list');
  const exportSection = document.getElementById('export-section');

  let extractedData = null;

  extractBtn.addEventListener('click', async () => {
    extractBtn.classList.add('extracting');
    extractBtn.textContent = 'Scanning page...';

    const data = await sendToContent({ action: 'extract' });
    if (!data) {
      extractBtn.classList.remove('extracting');
      extractBtn.textContent = 'Extract Design Tokens';
      return;
    }
    extractedData = data;

    // Hide hint
    if (hint) hint.style.display = 'none';

    // ——— Render typography ———
    typoList.innerHTML = '';
    for (const font of data.fontFamilies) {
      const elements = data.typography.filter(t => t.font === font.name);
      const uniqueTags = [...new Set(elements.map(t => t.tag))];
      const sizes = [...new Set(elements.map(t => t.size))]
        .sort((a, b) => parseInt(a) - parseInt(b));
      const sizeRange = sizes.length === 1
        ? sizes[0]
        : `${sizes[0]} – ${sizes[sizes.length - 1]}`;

      const item = document.createElement('div');
      item.className = 'font-item';

      // Header: font name + weight pills
      const header = document.createElement('div');
      header.className = 'font-header';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'font-name';
      nameSpan.textContent = font.name;
      header.appendChild(nameSpan);

      const weightsDiv = document.createElement('div');
      weightsDiv.className = 'font-weights';
      for (const w of font.weights) {
        const pill = document.createElement('span');
        pill.className = 'weight-pill';
        pill.textContent = w;
        weightsDiv.appendChild(pill);
      }
      header.appendChild(weightsDiv);
      item.appendChild(header);

      // Elements: tag pills + size range
      const elementsDiv = document.createElement('div');
      elementsDiv.className = 'font-elements';
      for (const tag of uniqueTags) {
        const tagEl = document.createElement('span');
        tagEl.className = 'element-tag';
        tagEl.textContent = tag;
        elementsDiv.appendChild(tagEl);
      }
      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'font-size-range';
      sizeSpan.textContent = sizeRange;
      elementsDiv.appendChild(sizeSpan);

      item.appendChild(elementsDiv);
      typoList.appendChild(item);
    }

    // ——— Render colors (grouped by usage) ———
    colorList.innerHTML = '';

    const textColors = data.colors.filter(c => c.usage.includes('text'));
    const bgColors = data.colors.filter(c => c.usage.includes('background'));

    if (textColors.length > 0) {
      const group = createColorGroup('Text', textColors.slice(0, 8));
      colorList.appendChild(group);
    }

    if (bgColors.length > 0) {
      const group = createColorGroup('Background', bgColors.slice(0, 6));
      colorList.appendChild(group);
    }

    // Show sections
    typoSection.style.display = 'block';
    colorSection.style.display = 'block';
    exportSection.style.display = 'block';

    // Ensure dividers
    ensureDivider(typoSection);
    ensureDivider(colorSection);
    ensureDivider(exportSection);

    extractBtn.classList.remove('extracting');
    extractBtn.textContent = 'Re-extract';
  });

  function createColorGroup(label, colors) {
    const group = document.createElement('div');
    group.className = 'color-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'color-group-label';
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const items = document.createElement('div');
    items.className = 'color-items';

    for (const color of colors) {
      const item = document.createElement('div');
      item.className = 'color-item';

      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color.hex;
      item.appendChild(swatch);

      const hexSpan = document.createElement('span');
      hexSpan.className = 'color-hex';
      hexSpan.textContent = color.hex;
      item.appendChild(hexSpan);

      items.appendChild(item);
    }

    group.appendChild(items);
    return group;
  }

  function ensureDivider(section) {
    if (!section.previousElementSibling?.classList.contains('divider')) {
      section.before(Object.assign(document.createElement('div'), { className: 'divider' }));
    }
  }

  // ——— Export ———
  const downloadBtn = document.getElementById('download-btn');
  const copyBtn = document.getElementById('copy-btn');

  downloadBtn.addEventListener('click', () => {
    if (!extractedData) return;
    const md = generateMarkdown(extractedData);
    const blob = new Blob([md], { type: 'text/markdown' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${extractedData.url.replace(/[^a-zA-Z0-9.-]/g, '_')}-design-tokens.md`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  });

  copyBtn.addEventListener('click', async () => {
    if (!extractedData) return;
    const md = generateMarkdown(extractedData);
    await navigator.clipboard.writeText(md);
    const original = copyBtn.textContent;
    copyBtn.textContent = 'Copied';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = original;
      copyBtn.classList.remove('copied');
    }, 1500);
  });

  // ——— Reset ———
  const resetBtn = document.getElementById('reset-btn');

  resetBtn.addEventListener('click', async () => {
    gridEnabled = false;
    boxesEnabled = false;
    inspectEnabled = false;
    rulersEnabled = false;
    gridToggle.classList.remove('active');
    boxesToggle.classList.remove('active');
    inspectToggle.classList.remove('active');
    rulersToggle.classList.remove('active');
    gridSizeRow.style.display = 'none';
    await sendToContent({ action: 'toggleGrid', enabled: false });
    await sendToContent({ action: 'toggleBoxes', enabled: false });
    await sendToContent({ action: 'toggleInspect', enabled: false });
    await sendToContent({ action: 'toggleRulers', enabled: false });
    await sendToContent({ action: 'stopSelectMode' });
    await sendToContent({ action: 'stopPickMode' });
    await saveState();
  });

  // ——— Select & Measure ———
  const selectBtn = document.getElementById('select-btn');

  selectBtn.addEventListener('click', async () => {
    // Pass current overlay state so toolbar can show toggles
    await sendToContent({
      action: 'startSelectMode',
      overlays: { gridEnabled, boxesEnabled, rulersEnabled, gridMode, gridSize }
    });
    selectBtn.textContent = 'Selecting... (click page elements)';
    selectBtn.disabled = true;
  });

  // Listen for select mode ending (from content script)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'selectModeDone') {
      selectBtn.textContent = 'Select Elements to Measure';
      selectBtn.disabled = false;
    }
  });

  // ——— Pick → Code ———
  const pickCodeBtn = document.getElementById('pick-code-btn');

  pickCodeBtn.addEventListener('click', async () => {
    await sendToContent({ action: 'startPickMode' });
    pickCodeBtn.textContent = 'Click an element...';
    pickCodeBtn.disabled = true;
  });

  // Listen for pick result from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'pickCodeResult') {
      pickCodeBtn.textContent = 'Pick → Code';
      pickCodeBtn.disabled = false;

      const { css, html } = message.data;

      // Show result panel
      let panel = document.getElementById('code-panel');
      if (!panel) {
        panel = document.createElement('section');
        panel.id = 'code-panel';
        panel.className = 'section';
        document.getElementById('root').appendChild(panel);
      }

      panel.innerHTML = '';

      // Header with tabs
      const header = document.createElement('div');
      header.className = 'code-panel-header';
      Object.assign(header.style, {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px'
      });

      const tabs = document.createElement('div');
      Object.assign(tabs.style, { display: 'flex', gap: '4px' });

      function makeTab(label, active) {
        const btn = document.createElement('button');
        btn.textContent = label;
        Object.assign(btn.style, {
          padding: '3px 10px', fontSize: '10px', fontFamily: "'SF Mono','Menlo',monospace",
          border: 'none', borderRadius: '4px', cursor: 'pointer',
          background: active ? 'var(--pill-active-bg)' : 'var(--pill-bg)',
          color: active ? 'var(--pill-active-text)' : 'var(--pill-text)',
          fontWeight: active ? '600' : '400'
        });
        return btn;
      }

      const cssTab = makeTab('CSS', true);
      const htmlTab = makeTab('HTML', false);
      tabs.appendChild(cssTab);
      tabs.appendChild(htmlTab);
      header.appendChild(tabs);

      const copyCodeBtn = document.createElement('button');
      Object.assign(copyCodeBtn.style, {
        padding: '3px 8px', fontSize: '10px', fontFamily: 'inherit',
        background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)',
        border: '1px solid var(--btn-secondary-border)', borderRadius: '4px', cursor: 'pointer'
      });
      copyCodeBtn.textContent = 'Copy';
      header.appendChild(copyCodeBtn);
      panel.appendChild(header);

      // Code block
      const codeBlock = document.createElement('pre');
      Object.assign(codeBlock.style, {
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: '6px', padding: '12px', fontSize: '11px', lineHeight: '1.5',
        fontFamily: "'SF Mono','Menlo',monospace", color: 'var(--text-primary)',
        overflow: 'auto', maxHeight: '300px', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        margin: '0'
      });
      codeBlock.textContent = css;
      panel.appendChild(codeBlock);

      // Divider before panel
      if (!panel.previousElementSibling?.classList.contains('divider')) {
        panel.before(Object.assign(document.createElement('div'), { className: 'divider' }));
      }

      // Tab switching
      let currentCode = css;
      cssTab.addEventListener('click', () => {
        codeBlock.textContent = css;
        currentCode = css;
        Object.assign(cssTab.style, { background: 'var(--pill-active-bg)', color: 'var(--pill-active-text)', fontWeight: '600' });
        Object.assign(htmlTab.style, { background: 'var(--pill-bg)', color: 'var(--pill-text)', fontWeight: '400' });
      });
      htmlTab.addEventListener('click', () => {
        codeBlock.textContent = html;
        currentCode = html;
        Object.assign(htmlTab.style, { background: 'var(--pill-active-bg)', color: 'var(--pill-active-text)', fontWeight: '600' });
        Object.assign(cssTab.style, { background: 'var(--pill-bg)', color: 'var(--pill-text)', fontWeight: '400' });
      });

      // Copy
      copyCodeBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(currentCode);
        copyCodeBtn.textContent = 'Copied';
        copyCodeBtn.classList.add('copied');
        setTimeout(() => {
          copyCodeBtn.textContent = 'Copy';
          copyCodeBtn.classList.remove('copied');
        }, 1500);
      });

      panel.style.display = 'block';
      panel.style.animation = 'fadeIn 0.2s ease';
    }
  });

  // ——— Side Panel ———
  const sidepanelBtn = document.getElementById('sidepanel-btn');

  sidepanelBtn.addEventListener('click', async () => {
    try {
      await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
    } catch {
      // Fallback: side panel might not be supported
    }
  });
});
