(function () {
  if (window.__gridLensLoaded) return;
  window.__gridLensLoaded = true;

  // ——— Grid System ———
  let gridOverlay = null;
  let gridMode = 'pixel'; // 'pixel' | 'baseline' | 'columns'
  let gridSize = 8;
  let columnContainer = null;

  function createGridOverlay() {
    if (gridOverlay) return gridOverlay;
    gridOverlay = document.createElement('div');
    gridOverlay.id = 'grid-lens-pixel-grid';
    Object.assign(gridOverlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '2147483646', pointerEvents: 'none', display: 'none'
    });
    document.documentElement.appendChild(gridOverlay);
    return gridOverlay;
  }

  function updatePixelGrid(size) {
    gridSize = size;
    const el = createGridOverlay();
    // Clear column children if any
    el.innerHTML = '';
    el.style.backgroundImage =
      `linear-gradient(to right, rgba(0,112,243,0.15) 1px, transparent 1px),` +
      `linear-gradient(to bottom, rgba(0,112,243,0.15) 1px, transparent 1px)`;
    el.style.backgroundSize = `${size}px ${size}px`;
  }

  function updateBaselineGrid() {
    const el = createGridOverlay();
    el.innerHTML = '';
    // Detect body line-height
    const bodyStyle = window.getComputedStyle(document.body);
    let lh = parseFloat(bodyStyle.lineHeight);
    if (isNaN(lh)) {
      lh = parseFloat(bodyStyle.fontSize) * 1.5;
    }
    gridSize = Math.round(lh);
    // Horizontal lines only
    el.style.backgroundImage =
      `linear-gradient(to bottom, rgba(255,59,48,0.2) 1px, transparent 1px)`;
    el.style.backgroundSize = `100% ${gridSize}px`;
  }

  function updateColumnGrid(cols) {
    const el = createGridOverlay();
    el.style.backgroundImage = 'none';
    el.style.backgroundSize = 'auto';
    el.innerHTML = '';

    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex', gap: '16px', height: '100%',
      maxWidth: '1440px', margin: '0 auto', padding: '0 24px'
    });

    for (let i = 0; i < cols; i++) {
      const col = document.createElement('div');
      Object.assign(col.style, {
        flex: '1', background: 'rgba(0,112,243,0.07)',
        borderLeft: '1px solid rgba(0,112,243,0.12)',
        borderRight: '1px solid rgba(0,112,243,0.12)'
      });
      container.appendChild(col);
    }
    el.appendChild(container);
  }

  function showGrid(mode, size) {
    gridMode = mode || 'pixel';
    createGridOverlay();
    if (gridMode === 'baseline') {
      updateBaselineGrid();
    } else if (gridMode === 'columns') {
      updateColumnGrid(size || 12);
    } else {
      updatePixelGrid(size || 8);
    }
    gridOverlay.style.display = 'block';
  }

  function hideGrid() {
    if (gridOverlay) gridOverlay.style.display = 'none';
  }

  // ——— Element Boxes ———
  let boxesActive = false;
  const boxedElements = [];

  function getDepthOpacity(depth) {
    if (depth >= 4) return 0.6;
    if (depth >= 3) return 0.5;
    if (depth >= 2) return 0.4;
    return 0.3;
  }

  function showElementBoxes() {
    boxesActive = true;
    traverseAndOutline(document.body, 0);
  }

  function traverseAndOutline(element, depth) {
    if (!element || !element.children) return;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const prevOutline = element.style.outline;
    element.style.outline = `1px solid rgba(255, 0, 0, ${getDepthOpacity(depth)})`;
    boxedElements.push({ el: element, prev: prevOutline });

    for (const child of element.children) {
      traverseAndOutline(child, depth + 1);
    }
  }

  function hideElementBoxes() {
    boxesActive = false;
    for (const { el, prev } of boxedElements) {
      el.style.outline = prev;
    }
    boxedElements.length = 0;
  }

  // ——— Hover Inspect ———
  let inspectActive = false;
  let inspectHighlight = null;
  let inspectTooltip = null;
  let dimLabelW = null;
  let dimLabelH = null;

  function createInspectElements() {
    if (!inspectHighlight) {
      inspectHighlight = document.createElement('div');
      inspectHighlight.id = 'grid-lens-inspect-highlight';
      Object.assign(inspectHighlight.style, {
        position: 'fixed', pointerEvents: 'none', zIndex: '2147483645',
        border: '2px solid #0070f3', background: 'rgba(0,112,243,0.06)',
        display: 'none', transition: 'top 0.08s,left 0.08s,width 0.08s,height 0.08s'
      });
      document.documentElement.appendChild(inspectHighlight);
    }
    if (!inspectTooltip) {
      inspectTooltip = document.createElement('div');
      inspectTooltip.id = 'grid-lens-inspect-tooltip';
      Object.assign(inspectTooltip.style, {
        position: 'fixed', pointerEvents: 'none', zIndex: '2147483647',
        display: 'none', fontFamily: "'SF Mono','Menlo','Consolas',monospace",
        fontSize: '11px', lineHeight: '1.4', background: '#0a0a0a', color: '#ededed',
        padding: '6px 10px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap', maxWidth: '300px'
      });
      document.documentElement.appendChild(inspectTooltip);
    }
    const dimStyle = {
      position: 'fixed', pointerEvents: 'none', zIndex: '2147483647',
      display: 'none', fontFamily: "'SF Mono','Menlo',monospace",
      fontSize: '9px', fontWeight: '600', color: '#ff3b30', background: '#fff',
      border: '1px solid rgba(255,59,48,0.35)',
      padding: '2px 5px', borderRadius: '3px', whiteSpace: 'nowrap', lineHeight: '1',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    };
    if (!dimLabelW) {
      dimLabelW = document.createElement('div');
      Object.assign(dimLabelW.style, dimStyle);
      document.documentElement.appendChild(dimLabelW);
    }
    if (!dimLabelH) {
      dimLabelH = document.createElement('div');
      Object.assign(dimLabelH.style, dimStyle);
      document.documentElement.appendChild(dimLabelH);
    }
  }

  function handleInspectMove(e) {
    if (!inspectActive) return;

    // Hide our own elements so elementFromPoint doesn't hit them
    inspectHighlight.style.display = 'none';
    inspectTooltip.style.display = 'none';
    dimLabelW.style.display = 'none';
    dimLabelH.style.display = 'none';

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.documentElement || el === document.body ||
        el.id?.startsWith('grid-lens-')) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // Position highlight
    inspectHighlight.style.display = 'block';
    inspectHighlight.style.top = rect.top + 'px';
    inspectHighlight.style.left = rect.left + 'px';
    inspectHighlight.style.width = rect.width + 'px';
    inspectHighlight.style.height = rect.height + 'px';

    // Dimension labels on edges
    dimLabelW.textContent = `${w}`;
    dimLabelW.style.display = 'block';
    dimLabelW.style.left = (rect.left + rect.width / 2) + 'px';
    dimLabelW.style.top = (rect.top - 18) + 'px';
    dimLabelW.style.transform = 'translateX(-50%)';
    if (rect.top < 22) {
      dimLabelW.style.top = (rect.bottom + 4) + 'px';
    }

    dimLabelH.textContent = `${h}`;
    dimLabelH.style.display = 'block';
    dimLabelH.style.left = (rect.right + 4) + 'px';
    dimLabelH.style.top = (rect.top + rect.height / 2) + 'px';
    dimLabelH.style.transform = 'translateY(-50%)';
    if (rect.right + 40 > window.innerWidth) {
      dimLabelH.style.left = (rect.left - 40) + 'px';
    }

    // Build tooltip content
    const font = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    const fontSize = style.fontSize;
    const padding = style.padding;
    const margin = style.margin;

    inspectTooltip.innerHTML = '';

    const line1 = document.createElement('div');
    const tagSpan = document.createElement('span');
    tagSpan.style.color = '#0070f3';
    tagSpan.style.fontWeight = '600';
    tagSpan.textContent = `<${tag}>`;
    const dimSpan = document.createElement('span');
    dimSpan.style.color = '#ededed';
    dimSpan.textContent = `  ${w} × ${h}px`;
    line1.appendChild(tagSpan);
    line1.appendChild(dimSpan);
    inspectTooltip.appendChild(line1);

    const line2 = document.createElement('div');
    line2.style.color = '#888';
    line2.style.fontSize = '10px';
    line2.textContent = `${font} ${fontSize}`;
    if (padding !== '0px') line2.textContent += ` · p: ${padding}`;
    inspectTooltip.appendChild(line2);

    // Position tooltip
    inspectTooltip.style.display = 'block';
    let tooltipX = e.clientX + 12;
    let tooltipY = e.clientY + 12;

    // Keep tooltip in viewport
    const tooltipRect = inspectTooltip.getBoundingClientRect();
    if (tooltipX + tooltipRect.width > window.innerWidth - 8) {
      tooltipX = e.clientX - tooltipRect.width - 12;
    }
    if (tooltipY + tooltipRect.height > window.innerHeight - 8) {
      tooltipY = e.clientY - tooltipRect.height - 12;
    }

    inspectTooltip.style.left = tooltipX + 'px';
    inspectTooltip.style.top = tooltipY + 'px';
  }

  function showInspect() {
    inspectActive = true;
    createInspectElements();
    document.addEventListener('mousemove', handleInspectMove, true);
  }

  function hideInspect() {
    inspectActive = false;
    document.removeEventListener('mousemove', handleInspectMove, true);
    if (inspectHighlight) inspectHighlight.style.display = 'none';
    if (inspectTooltip) inspectTooltip.style.display = 'none';
    if (dimLabelW) dimLabelW.style.display = 'none';
    if (dimLabelH) dimLabelH.style.display = 'none';
  }

  // ——— Rulers ———
  let rulerTop = null;
  let rulerLeft = null;
  let rulerCanvasTop = null;
  let rulerCanvasLeft = null;

  function createRulers() {
    if (!rulerTop) {
      rulerTop = document.createElement('div');
      rulerTop.id = 'grid-lens-ruler-top';
      Object.assign(rulerTop.style, {
        position: 'fixed', top: '0', left: '0', right: '0', height: '20px',
        zIndex: '2147483644', pointerEvents: 'none', background: '#0a0a0a',
        borderBottom: '1px solid #333', display: 'none', overflow: 'hidden'
      });
      rulerCanvasTop = document.createElement('canvas');
      rulerCanvasTop.height = 20;
      rulerTop.appendChild(rulerCanvasTop);
      document.documentElement.appendChild(rulerTop);
    }
    if (!rulerLeft) {
      rulerLeft = document.createElement('div');
      rulerLeft.id = 'grid-lens-ruler-left';
      Object.assign(rulerLeft.style, {
        position: 'fixed', top: '20px', left: '0', bottom: '0', width: '20px',
        zIndex: '2147483644', pointerEvents: 'none', background: '#0a0a0a',
        borderRight: '1px solid #333', display: 'none', overflow: 'hidden'
      });
      rulerCanvasLeft = document.createElement('canvas');
      rulerCanvasLeft.width = 20;
      rulerLeft.appendChild(rulerCanvasLeft);
      document.documentElement.appendChild(rulerLeft);
    }
  }

  function drawRulers() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Horizontal ruler
    rulerCanvasTop.width = vw * dpr;
    rulerCanvasTop.height = 20 * dpr;
    rulerCanvasTop.style.width = vw + 'px';
    rulerCanvasTop.style.height = '20px';
    const ctxH = rulerCanvasTop.getContext('2d');
    ctxH.scale(dpr, dpr);
    ctxH.fillStyle = '#0a0a0a';
    ctxH.fillRect(0, 0, vw, 20);

    const step = 50;
    const smallStep = 10;

    // Small ticks
    ctxH.strokeStyle = '#444';
    ctxH.lineWidth = 1;
    for (let x = 0; x < vw; x += smallStep) {
      ctxH.beginPath();
      ctxH.moveTo(x + 0.5, 15);
      ctxH.lineTo(x + 0.5, 20);
      ctxH.stroke();
    }

    // Big ticks + labels
    ctxH.strokeStyle = '#666';
    ctxH.fillStyle = '#888';
    ctxH.font = '9px SF Mono, Menlo, monospace';
    ctxH.textAlign = 'left';
    for (let x = 0; x < vw; x += step) {
      ctxH.beginPath();
      ctxH.moveTo(x + 0.5, 10);
      ctxH.lineTo(x + 0.5, 20);
      ctxH.stroke();
      if (x > 0) {
        ctxH.fillText(x.toString(), x + 3, 9);
      }
    }

    // Vertical ruler
    rulerCanvasLeft.width = 20 * dpr;
    rulerCanvasLeft.height = vh * dpr;
    rulerCanvasLeft.style.width = '20px';
    rulerCanvasLeft.style.height = vh + 'px';
    const ctxV = rulerCanvasLeft.getContext('2d');
    ctxV.scale(dpr, dpr);
    ctxV.fillStyle = '#0a0a0a';
    ctxV.fillRect(0, 0, 20, vh);

    // Small ticks
    ctxV.strokeStyle = '#444';
    ctxV.lineWidth = 1;
    for (let y = 0; y < vh; y += smallStep) {
      ctxV.beginPath();
      ctxV.moveTo(15, y + 0.5);
      ctxV.lineTo(20, y + 0.5);
      ctxV.stroke();
    }

    // Big ticks + labels
    ctxV.strokeStyle = '#666';
    ctxV.fillStyle = '#888';
    ctxV.font = '9px SF Mono, Menlo, monospace';
    ctxV.textAlign = 'right';
    for (let y = 0; y < vh; y += step) {
      ctxV.beginPath();
      ctxV.moveTo(10, y + 0.5);
      ctxV.lineTo(20, y + 0.5);
      ctxV.stroke();
      if (y > 0) {
        ctxV.save();
        ctxV.translate(9, y + 3);
        ctxV.rotate(-Math.PI / 2);
        ctxV.textAlign = 'left';
        ctxV.fillText(y.toString(), 0, 0);
        ctxV.restore();
      }
    }
  }

  let rulerResizeHandler = null;

  function showRulers() {
    createRulers();
    rulerTop.style.display = 'block';
    rulerLeft.style.display = 'block';
    drawRulers();
    rulerResizeHandler = () => drawRulers();
    window.addEventListener('resize', rulerResizeHandler);
  }

  function hideRulers() {
    if (rulerTop) rulerTop.style.display = 'none';
    if (rulerLeft) rulerLeft.style.display = 'none';
    if (rulerResizeHandler) {
      window.removeEventListener('resize', rulerResizeHandler);
      rulerResizeHandler = null;
    }
  }

  // ——— Extraction ———
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    return '#' + [match[1], match[2], match[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  function extractDesignTokens() {
    const typographyMap = new Map();
    const colorMap = new Map();
    const fontFamilyMap = new Map();
    const spacingValues = new Map(); // value → count
    const radiusValues = new Map();
    const shadowValues = new Map();
    const cssVars = [];
    let elementCount = 0;
    const MAX_ELEMENTS = 1000;

    // Extract CSS custom properties from stylesheets
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText === ':root' || rule.selectorText === 'html') {
              for (const prop of rule.style) {
                if (prop.startsWith('--')) {
                  const val = rule.style.getPropertyValue(prop).trim();
                  // Only keep design tokens: colors, spacing, fonts, sizes
                  const isDesignToken = /^(#|rgb|hsl|oklch)/.test(val) ||
                    /^\d+(\.\d+)?(px|rem|em|%)$/.test(val) ||
                    /(color|bg|font|radius|shadow|space|gap|gutter|border)/i.test(prop);
                  if (isDesignToken) {
                    cssVars.push({ name: prop, value: val });
                  }
                }
              }
            }
          }
        } catch { /* cross-origin stylesheet */ }
      }
    } catch {}

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (node.id?.startsWith('grid-lens-')) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // Only include text-bearing elements in typography
    const textTags = new Set([
      'h1','h2','h3','h4','h5','h6','p','span','a','li','ol','ul',
      'strong','em','b','i','small','label','figcaption','caption',
      'blockquote','cite','code','pre','abbr','time','button','input','textarea','th','td'
    ]);

    let node = walker.currentNode;
    while (node && elementCount < MAX_ELEMENTS) {
      if (node.nodeType === Node.ELEMENT_NODE && node !== document.body) {
        const style = window.getComputedStyle(node);
        const tag = node.tagName.toLowerCase();
        const font = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        const size = style.fontSize;
        const weight = style.fontWeight;
        const lineHeight = style.lineHeight;

        // Typography — only text elements, dedup by tag+font+size+weight
        if (textTags.has(tag)) {
          const typoKey = `${tag}|${font}|${size}|${weight}`;
          if (!typographyMap.has(typoKey)) {
            typographyMap.set(typoKey, { tag, font, size, weight, lineHeight });
          }
          if (!fontFamilyMap.has(font)) fontFamilyMap.set(font, new Set());
          fontFamilyMap.get(font).add(weight);
        } else {
          // Still collect font families from non-text elements
          if (!fontFamilyMap.has(font)) fontFamilyMap.set(font, new Set());
          fontFamilyMap.get(font).add(weight);
        }

        // Colors
        const textColor = rgbToHex(style.color);
        if (textColor) {
          if (!colorMap.has(textColor)) colorMap.set(textColor, { count: 0, contexts: new Set() });
          const e = colorMap.get(textColor); e.count++; e.contexts.add('text');
        }
        const bgColor = rgbToHex(style.backgroundColor);
        if (bgColor) {
          if (!colorMap.has(bgColor)) colorMap.set(bgColor, { count: 0, contexts: new Set() });
          const e = colorMap.get(bgColor); e.count++; e.contexts.add('background');
        }

        // Spacing (padding + margin, only px values)
        for (const prop of ['paddingTop','paddingRight','paddingBottom','paddingLeft',
                            'marginTop','marginRight','marginBottom','marginLeft']) {
          const v = parseInt(style[prop]);
          if (v > 0 && v < 200) {
            spacingValues.set(v, (spacingValues.get(v) || 0) + 1);
          }
        }

        // Border radius
        const br = style.borderRadius;
        if (br && br !== '0px') {
          const val = br.split(' ')[0]; // take first value for uniform
          radiusValues.set(val, (radiusValues.get(val) || 0) + 1);
        }

        // Box shadow
        const bs = style.boxShadow;
        if (bs && bs !== 'none') {
          shadowValues.set(bs, (shadowValues.get(bs) || 0) + 1);
        }

        elementCount++;
      }
      node = walker.nextNode();
    }

    // Infer spacing scale: find values that appear 3+ times, sort
    const spacingScale = Array.from(spacingValues.entries())
      .filter(([, count]) => count >= 3)
      .map(([val]) => val)
      .sort((a, b) => a - b);

    // Detect scale ratio for typography
    const fontSizes = [...new Set(
      Array.from(typographyMap.values()).map(t => parseInt(t.size))
    )].filter(s => s > 0).sort((a, b) => a - b);

    let scaleRatio = null;
    if (fontSizes.length >= 3) {
      const ratios = [];
      for (let i = 1; i < fontSizes.length; i++) {
        ratios.push(fontSizes[i] / fontSizes[i - 1]);
      }
      const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      if (avgRatio > 1.1 && avgRatio < 2.0) {
        scaleRatio = Math.round(avgRatio * 100) / 100;
      }
    }

    // Layout: detect max-width from body/main containers
    let maxWidth = null;
    const containers = document.querySelectorAll('main, [class*="container"], [class*="wrapper"], [class*="content"]');
    for (const c of containers) {
      const mw = window.getComputedStyle(c).maxWidth;
      if (mw && mw !== 'none' && mw !== '0px') {
        maxWidth = mw;
        break;
      }
    }

    const typography = Array.from(typographyMap.values()).sort((a, b) => {
      const tagOrder = ['h1','h2','h3','h4','h5','h6','p','span','a','li','code','pre','small'];
      return (tagOrder.indexOf(a.tag) === -1 ? 99 : tagOrder.indexOf(a.tag))
           - (tagOrder.indexOf(b.tag) === -1 ? 99 : tagOrder.indexOf(b.tag));
    });

    const fontFamilies = Array.from(fontFamilyMap.entries()).map(([name, weights]) => ({
      name,
      weights: Array.from(weights).sort((a, b) => parseInt(a) - parseInt(b))
    }));

    const colors = Array.from(colorMap.entries())
      .map(([hex, { count, contexts }]) => ({
        hex, count, usage: Array.from(contexts).join(', ')
      }))
      .sort((a, b) => b.count - a.count);

    const radii = Array.from(radiusValues.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([val, count]) => ({ value: val, count }));

    const shadows = Array.from(shadowValues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([val, count]) => ({ value: val, count }));

    return {
      url: window.location.hostname,
      date: new Date().toISOString().split('T')[0],
      typography,
      fontFamilies,
      fontSizes,
      scaleRatio,
      colors,
      cssVars: cssVars.slice(0, 50),
      spacingScale,
      radii,
      shadows,
      maxWidth,
      capped: elementCount >= MAX_ELEMENTS
    };
  }

  // ——— Annotate All Elements (for screenshot) ———
  let annotationContainer = null;

  function annotateAll() {
    removeAnnotations();
    annotationContainer = document.createElement('div');
    annotationContainer.id = 'grid-lens-annotations';
    Object.assign(annotationContainer.style, {
      position: 'fixed', inset: '0', zIndex: '2147483645',
      pointerEvents: 'none', overflow: 'hidden'
    });
    document.documentElement.appendChild(annotationContainer);

    // Dim overlay — subtle darkening so red annotations pop
    const dimOverlay = document.createElement('div');
    Object.assign(dimOverlay.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0.2)',
      pointerEvents: 'none'
    });
    annotationContainer.appendChild(dimOverlay);

    // Shared label style
    const labelBase = {
      position: 'fixed', pointerEvents: 'none',
      fontFamily: "'SF Mono','Menlo','Consolas',monospace",
      fontSize: '9px', fontWeight: '600', lineHeight: '1',
      color: '#ff3b30', background: '#fff',
      border: '1px solid rgba(255,59,48,0.35)',
      padding: '2px 5px', borderRadius: '3px',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    };

    // Redline color
    const redline = 'rgba(255,59,48,0.5)';

    const MIN_SIZE = 30;
    const seen = [];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.id?.startsWith('grid-lens-')) return NodeFilter.FILTER_REJECT;
        const s = window.getComputedStyle(node);
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let count = 0;
    let node;
    while ((node = walker.nextNode()) && count < 200) {
      const rect = node.getBoundingClientRect();
      if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      if (rect.right < 0 || rect.left > window.innerWidth) continue;

      const dominated = seen.some(r =>
        Math.abs(r.top - rect.top) < 4 && Math.abs(r.left - rect.left) < 4 &&
        Math.abs(r.width - rect.width) < 4 && Math.abs(r.height - rect.height) < 4
      );
      if (dominated) continue;
      seen.push({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      // Element redline border
      const outline = document.createElement('div');
      Object.assign(outline.style, {
        position: 'fixed', pointerEvents: 'none',
        top: rect.top + 'px', left: rect.left + 'px',
        width: rect.width + 'px', height: rect.height + 'px',
        border: '1px solid ' + redline,
        boxSizing: 'border-box'
      });
      annotationContainer.appendChild(outline);

      // Width: horizontal redline + label (top)
      const wLine = document.createElement('div');
      const wLineY = rect.top - 8;
      Object.assign(wLine.style, {
        position: 'fixed', pointerEvents: 'none',
        top: wLineY + 'px', left: rect.left + 'px',
        width: rect.width + 'px', height: '1px',
        background: redline
      });
      annotationContainer.appendChild(wLine);

      const wLabel = document.createElement('div');
      Object.assign(wLabel.style, labelBase);
      wLabel.style.left = (rect.left + rect.width / 2) + 'px';
      wLabel.style.top = (wLineY - 8) + 'px';
      wLabel.style.transform = 'translateX(-50%)';
      wLabel.textContent = w;
      if (rect.top < 20) {
        wLine.style.top = (rect.bottom + 4) + 'px';
        wLabel.style.top = (rect.bottom + 8) + 'px';
      }
      annotationContainer.appendChild(wLabel);

      // Height: vertical redline + label (right)
      const hLine = document.createElement('div');
      const hLineX = rect.right + 6;
      Object.assign(hLine.style, {
        position: 'fixed', pointerEvents: 'none',
        top: rect.top + 'px', left: hLineX + 'px',
        width: '1px', height: rect.height + 'px',
        background: redline
      });
      annotationContainer.appendChild(hLine);

      const hLabel = document.createElement('div');
      Object.assign(hLabel.style, labelBase);
      hLabel.style.left = (hLineX + 4) + 'px';
      hLabel.style.top = (rect.top + rect.height / 2) + 'px';
      hLabel.style.transform = 'translateY(-50%)';
      hLabel.textContent = h;
      if (rect.right + 50 > window.innerWidth) {
        hLine.style.left = (rect.left - 8) + 'px';
        hLabel.style.left = (rect.left - 12) + 'px';
        hLabel.style.transform = 'translateX(-100%) translateY(-50%)';
      }
      annotationContainer.appendChild(hLabel);

      count++;
    }
  }

  function removeAnnotations() {
    if (annotationContainer) {
      annotationContainer.remove();
      annotationContainer = null;
    }
  }

  // ——— Interactive Select Mode ———
  let selectActive = false;
  let selectContainer = null;
  let selectToolbar = null;
  let selectedElements = [];

  function startSelectMode(overlays) {
    selectActive = true;
    selectedElements = [];

    if (!selectContainer) {
      selectContainer = document.createElement('div');
      selectContainer.id = 'grid-lens-select-container';
      Object.assign(selectContainer.style, {
        position: 'fixed', inset: '0', zIndex: '2147483644',
        pointerEvents: 'none'
      });
      document.documentElement.appendChild(selectContainer);
    }
    selectContainer.innerHTML = '';

    // Inject keyframes
    if (!document.getElementById('grid-lens-keyframes')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'grid-lens-keyframes';
      styleEl.textContent = `
        @keyframes glToolbarIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Floating toolbar
    selectToolbar = document.createElement('div');
    Object.assign(selectToolbar.style, {
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%) translateY(0)',
      zIndex: '2147483647', pointerEvents: 'auto',
      display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
      background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px',
      animation: 'glToolbarIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      fontFamily: "'SF Mono','Menlo',monospace", fontSize: '11px', color: '#ededed',
      maxWidth: '420px'
    });

    // Top row: overlay toggles
    const toggleRow = document.createElement('div');
    Object.assign(toggleRow.style, {
      display: 'flex', gap: '10px', alignItems: 'center', width: '100%',
      paddingBottom: '8px', borderBottom: '1px solid #222', marginBottom: '2px'
    });

    function makeCheckbox(label, checked, onChange) {
      const wrapper = document.createElement('label');
      Object.assign(wrapper.style, {
        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
        fontSize: '11px', color: checked ? '#ededed' : '#666'
      });
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      Object.assign(cb.style, { width: '12px', height: '12px', accentColor: '#0070f3', cursor: 'pointer' });
      cb.addEventListener('change', () => {
        wrapper.style.color = cb.checked ? '#ededed' : '#666';
        onChange(cb.checked);
      });
      wrapper.appendChild(cb);
      wrapper.appendChild(document.createTextNode(label));
      return wrapper;
    }

    const ov = overlays || {};
    toggleRow.appendChild(makeCheckbox('Grid', ov.gridEnabled, (on) => {
      if (on) showGrid(ov.gridMode || 'pixel', ov.gridSize || 8);
      else hideGrid();
    }));
    toggleRow.appendChild(makeCheckbox('Boxes', ov.boxesEnabled, (on) => {
      if (on) showElementBoxes();
      else hideElementBoxes();
    }));
    toggleRow.appendChild(makeCheckbox('Rulers', ov.rulersEnabled, (on) => {
      if (on) showRulers();
      else hideRulers();
    }));
    toggleRow.appendChild(makeCheckbox('Dim', false, (on) => {
      let dimEl = document.getElementById('grid-lens-select-dim');
      if (on) {
        if (!dimEl) {
          dimEl = document.createElement('div');
          dimEl.id = 'grid-lens-select-dim';
          Object.assign(dimEl.style, {
            position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.2)',
            zIndex: '2147483643', pointerEvents: 'none'
          });
          document.documentElement.appendChild(dimEl);
        }
      } else {
        if (dimEl) dimEl.remove();
      }
    }));
    selectToolbar.appendChild(toggleRow);

    // Bottom row: count + actions
    const actionRow = document.createElement('div');
    Object.assign(actionRow.style, {
      display: 'flex', gap: '8px', alignItems: 'center', width: '100%'
    });

    const countSpan = document.createElement('span');
    countSpan.id = 'grid-lens-select-count';
    countSpan.textContent = 'Click elements to measure';
    countSpan.style.color = '#888';
    countSpan.style.flex = '1';
    actionRow.appendChild(countSpan);

    const undoBtn = document.createElement('button');
    Object.assign(undoBtn.style, {
      background: 'none', color: '#888', border: '1px solid #444', borderRadius: '6px',
      padding: '6px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit'
    });
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', () => undoLastSelection());
    actionRow.appendChild(undoBtn);

    const exportBtn = document.createElement('button');
    Object.assign(exportBtn.style, {
      background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '6px',
      padding: '6px 14px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
      fontFamily: 'inherit'
    });
    exportBtn.textContent = 'Export';
    exportBtn.addEventListener('click', () => {
      if (selectToolbar) selectToolbar.style.display = 'none';
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'captureSelectMode' });
      }, 100);
    });
    actionRow.appendChild(exportBtn);

    const cancelBtn = document.createElement('button');
    Object.assign(cancelBtn.style, {
      background: 'none', color: '#888', border: '1px solid #444', borderRadius: '6px',
      padding: '6px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit'
    });
    cancelBtn.textContent = 'Done';
    cancelBtn.addEventListener('click', () => stopSelectMode());
    actionRow.appendChild(cancelBtn);

    selectToolbar.appendChild(actionRow);
    document.documentElement.appendChild(selectToolbar);

    // Handlers
    document.addEventListener('click', handleSelectClick, true);
    document.addEventListener('keydown', handleSelectKeydown, true);
    // Reposition annotations on scroll/resize
    selectScrollHandler = () => repositionAllAnnotations();
    window.addEventListener('scroll', selectScrollHandler, true);
    window.addEventListener('resize', selectScrollHandler);
  }

  function handleSelectKeydown(e) {
    if (!selectActive) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      undoLastSelection();
    }
    if (e.key === 'Escape') {
      stopSelectMode();
    }
  }

  function handleSelectClick(e) {
    if (!selectActive) return;
    const target = e.target;
    if (target.closest('#grid-lens-select-container') || target.closest('[id*="grid-lens"]')) return;
    if (selectToolbar && selectToolbar.contains(target)) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = target.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return;

    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    // Check if already selected — toggle off
    const existingIdx = selectedElements.findIndex(s => s.el === target);
    if (existingIdx !== -1) {
      removeSelection(existingIdx);
      updateSelectCount();
      return;
    }

    // Add new selection
    addSelection(target, rect);
    updateSelectCount();
  }

  function addSelection(target, rect) {
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // Create a group with 4 nodes: outline, wLine, wLabel, hLine, hLabel
    const nodes = { outline: null, wLine: null, wLabel: null, hLine: null, hLabel: null };

    const redline = 'rgba(255,59,48,0.5)';
    const labelBase = {
      position: 'fixed', pointerEvents: 'none',
      fontFamily: "'SF Mono','Menlo',monospace",
      fontSize: '9px', fontWeight: '600', lineHeight: '1',
      color: '#ff3b30', background: '#fff',
      border: '1px solid rgba(255,59,48,0.35)',
      padding: '2px 5px', borderRadius: '3px',
      whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    };

    nodes.outline = document.createElement('div');
    Object.assign(nodes.outline.style, {
      position: 'fixed', pointerEvents: 'none',
      border: '1px solid ' + redline, boxSizing: 'border-box'
    });
    selectContainer.appendChild(nodes.outline);

    nodes.wLine = document.createElement('div');
    Object.assign(nodes.wLine.style, {
      position: 'fixed', pointerEvents: 'none',
      height: '1px', background: redline
    });
    selectContainer.appendChild(nodes.wLine);

    nodes.wLabel = document.createElement('div');
    Object.assign(nodes.wLabel.style, labelBase);
    nodes.wLabel.textContent = w;
    selectContainer.appendChild(nodes.wLabel);

    nodes.hLine = document.createElement('div');
    Object.assign(nodes.hLine.style, {
      position: 'fixed', pointerEvents: 'none',
      width: '1px', background: redline
    });
    selectContainer.appendChild(nodes.hLine);

    nodes.hLabel = document.createElement('div');
    Object.assign(nodes.hLabel.style, labelBase);
    nodes.hLabel.textContent = h;
    selectContainer.appendChild(nodes.hLabel);

    const entry = { el: target, w, h, nodes };
    selectedElements.push(entry);

    // Position immediately
    positionAnnotation(entry);
  }

  function positionAnnotation(entry) {
    const { el, w, h, nodes } = entry;
    const rect = el.getBoundingClientRect();

    // Outline
    Object.assign(nodes.outline.style, {
      top: rect.top + 'px', left: rect.left + 'px',
      width: rect.width + 'px', height: rect.height + 'px'
    });

    // Width line
    const wLineY = rect.top < 20 ? rect.bottom + 4 : rect.top - 8;
    Object.assign(nodes.wLine.style, {
      top: wLineY + 'px', left: rect.left + 'px', width: rect.width + 'px'
    });

    // Width label
    nodes.wLabel.style.left = (rect.left + rect.width / 2) + 'px';
    nodes.wLabel.style.top = (rect.top < 20 ? rect.bottom + 8 : rect.top - 16) + 'px';
    nodes.wLabel.style.transform = 'translateX(-50%)';

    // Height line
    const hOnRight = rect.right + 50 <= window.innerWidth;
    nodes.hLine.style.top = rect.top + 'px';
    nodes.hLine.style.height = rect.height + 'px';
    nodes.hLine.style.left = (hOnRight ? rect.right + 6 : rect.left - 8) + 'px';

    // Height label
    nodes.hLabel.style.top = (rect.top + rect.height / 2) + 'px';
    if (hOnRight) {
      nodes.hLabel.style.left = (rect.right + 10) + 'px';
      nodes.hLabel.style.transform = 'translateY(-50%)';
    } else {
      nodes.hLabel.style.left = (rect.left - 12) + 'px';
      nodes.hLabel.style.transform = 'translateX(-100%) translateY(-50%)';
    }
  }

  function repositionAllAnnotations() {
    for (const entry of selectedElements) {
      positionAnnotation(entry);
    }
  }

  let selectScrollHandler = null;

  function removeSelection(idx) {
    const entry = selectedElements[idx];
    if (entry?.nodes) {
      const allNodes = Object.values(entry.nodes).filter(Boolean);
      // Flash red then fade out
      allNodes.forEach(n => {
        Object.assign(n.style, {
          transition: 'opacity 0.25s, transform 0.25s',
          opacity: '0'
        });
      });
      // Flash the original element briefly
      if (entry.el) {
        const prev = entry.el.style.outline;
        entry.el.style.outline = '2px solid rgba(255,59,48,0.6)';
        entry.el.style.transition = 'outline 0.15s';
        setTimeout(() => {
          entry.el.style.outline = prev;
          entry.el.style.transition = '';
        }, 200);
      }
      setTimeout(() => allNodes.forEach(n => n.remove()), 250);
    }
    selectedElements.splice(idx, 1);
  }

  function undoLastSelection() {
    if (selectedElements.length === 0) return;
    removeSelection(selectedElements.length - 1);
    updateSelectCount();
  }

  function updateSelectCount() {
    const countEl = document.getElementById('grid-lens-select-count');
    if (countEl) {
      countEl.textContent = selectedElements.length === 0
        ? 'Click elements to measure'
        : `${selectedElements.length} selected`;
    }
  }

  function stopSelectMode() {
    selectActive = false;
    document.removeEventListener('click', handleSelectClick, true);
    document.removeEventListener('keydown', handleSelectKeydown, true);
    if (selectScrollHandler) {
      window.removeEventListener('scroll', selectScrollHandler, true);
      window.removeEventListener('resize', selectScrollHandler);
      selectScrollHandler = null;
    }
    if (selectContainer) { selectContainer.innerHTML = ''; }
    if (selectToolbar) { selectToolbar.remove(); selectToolbar = null; }
    const dimEl = document.getElementById('grid-lens-select-dim');
    if (dimEl) dimEl.remove();
    selectedElements = [];
    // Notify popup that select mode ended
    chrome.runtime.sendMessage({ action: 'selectModeDone' }).catch(() => {});
  }

  // ——— Pick Element → Export Code ———
  let pickActive = false;
  let pickHighlight = null;

  // Default values to exclude (computed style noise)
  const defaultValues = new Set([
    'none', 'normal', 'auto', 'visible', 'static', 'start',
    '0px', '0s', '0', '0px 0px', '0px none rgb(0, 0, 0)',
    'rgba(0, 0, 0, 0)', 'transparent', 'row', 'stretch',
    'baseline', 'currentcolor', 'medium none currentcolor',
    'repeat', 'scroll', 'content-box', 'border-box',
  ]);

  // Shorthand groups — if we emit shorthand, skip longhands
  const shorthandMap = {
    padding: ['paddingTop','paddingRight','paddingBottom','paddingLeft'],
    margin: ['marginTop','marginRight','marginBottom','marginLeft'],
    borderRadius: ['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'],
  };

  // Properties worth extracting (ordered for readability)
  const relevantProps = [
    // Layout
    'display','position','flexDirection','alignItems','justifyContent','gap',
    'gridTemplateColumns',
    // Size (only max/min, not computed width/height)
    'maxWidth','minWidth','maxHeight','minHeight',
    // Spacing
    'padding','margin',
    // Typography
    'fontFamily','fontSize','fontWeight','fontStyle',
    'lineHeight','letterSpacing','textAlign','textDecoration','textTransform',
    // Color
    'color','backgroundColor',
    // Border
    'borderRadius',
    'borderTop','borderBottom','borderLeft','borderRight',
    // Effects
    'boxShadow','opacity','transform',
    'transition','animation',
    // Other
    'cursor','overflow',
  ];

  function captureStyles(el) {
    const style = window.getComputedStyle(el);
    const result = {};

    for (const prop of relevantProps) {
      const val = style[prop];
      if (!val || val === '') continue;
      const valLower = val.toLowerCase();
      if (defaultValues.has(valLower)) continue;

      // Skip 0px none borders
      if (prop.startsWith('border') && prop !== 'borderRadius' && /^0px\s/.test(val)) continue;

      // Skip opacity: 1 (default)
      if (prop === 'opacity' && val === '1') continue;

      // Skip transition: all (noise from computed styles)
      if (prop === 'transition' && (val === 'all' || val.startsWith('all 0s'))) continue;

      // Skip display: block (too common to be useful alone)
      if (prop === 'display' && val === 'block') continue;

      // Skip inherited font stacks on non-text containers
      if (prop === 'fontFamily' && el.children.length > 3 && !el.textContent.trim()) continue;

      result[prop] = val;
    }

    // Remove longhands if shorthand covers them uniformly
    for (const [shorthand, longhands] of Object.entries(shorthandMap)) {
      if (result[shorthand]) {
        for (const lh of longhands) delete result[lh];
      }
    }

    // Clean up font-family: remove fallback system fonts for readability
    if (result.fontFamily) {
      const primary = result.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      const rest = result.fontFamily.split(',').slice(1).map(s => s.trim()).filter(s =>
        !['Arial','Helvetica','sans-serif','serif','monospace','system-ui','-apple-system','BlinkMacSystemFont'].includes(s.replace(/['"]/g, ''))
      );
      result.fontFamily = rest.length > 0 ? `"${primary}", ${rest.join(', ')}` : `"${primary}"`;
    }

    return result;
  }

  function diffStyles(base, hover) {
    const diff = {};
    for (const [key, val] of Object.entries(hover)) {
      if (base[key] !== val) diff[key] = val;
    }
    return diff;
  }

  function camelToKebab(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  function stylesToCSS(styles, indent) {
    return Object.entries(styles)
      .map(([k, v]) => `${indent}${camelToKebab(k)}: ${v};`)
      .join('\n');
  }

  function getCleanHTML(el) {
    const clone = el.cloneNode(true);
    // Remove grid-lens attributes
    clone.querySelectorAll('[id^="grid-lens"]').forEach(n => n.remove());
    // Clean up the HTML
    let html = clone.outerHTML;
    // Truncate long text content
    if (html.length > 2000) {
      html = html.slice(0, 2000) + '\n  <!-- ... truncated -->';
    }
    return html;
  }

  function handlePickMove(e) {
    if (!pickActive) return;
    if (!pickHighlight) {
      pickHighlight = document.createElement('div');
      Object.assign(pickHighlight.style, {
        position: 'fixed', pointerEvents: 'none', zIndex: '2147483645',
        border: '2px solid #0070f3', background: 'rgba(0,112,243,0.06)',
        transition: 'top 0.06s,left 0.06s,width 0.06s,height 0.06s'
      });
      document.documentElement.appendChild(pickHighlight);
    }

    pickHighlight.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.documentElement || el === document.body || el.id?.startsWith('grid-lens-')) {
      return;
    }
    const rect = el.getBoundingClientRect();
    Object.assign(pickHighlight.style, {
      display: 'block',
      top: rect.top + 'px', left: rect.left + 'px',
      width: rect.width + 'px', height: rect.height + 'px'
    });
  }

  function handlePickClick(e) {
    if (!pickActive) return;
    e.preventDefault();
    e.stopPropagation();

    if (pickHighlight) pickHighlight.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.documentElement || el === document.body || el.id?.startsWith('grid-lens-')) return;

    const tag = el.tagName.toLowerCase();
    const className = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    const selector = tag + (className || '');

    // Primary: extract original CSS rules from stylesheets
    const { baseRules, pseudoRules, keyframeRules } = extractOriginalRules(el);

    let css = `/* ${selector} — extracted by Grid Lens */\n\n`;

    // For SVG elements, extract SVG attributes
    const svgTags = new Set(['svg','path','circle','rect','line','polyline','polygon','ellipse','g','use','defs','clippath','mask','text','tspan']);
    if (svgTags.has(tag)) {
      css += `/* ——— SVG Attributes ——— */\n\n`;
      css += `<${tag}`;
      const svgAttrs = ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin',
        'stroke-dasharray','d','viewBox','width','height','cx','cy','r','x','y',
        'x1','y1','x2','y2','rx','ry','points','transform','opacity','fill-rule','clip-rule'];
      for (const attr of svgAttrs) {
        const val = el.getAttribute(attr);
        if (val) css += `\n  ${attr}="${val}"`;
      }
      css += ` />\n\n`;
    }

    if (baseRules.length > 0 || pseudoRules.length > 0) {
      // We have original stylesheet rules — use those
      css += `/* ——— Original CSS Rules ——— */\n\n`;
      const seen = new Set();
      for (const rule of baseRules) {
        if (!seen.has(rule)) { seen.add(rule); css += rule + '\n\n'; }
      }
      for (const rule of pseudoRules) {
        if (!seen.has(rule)) { seen.add(rule); css += rule + '\n\n'; }
      }
      if (keyframeRules.length > 0) {
        css += `/* ——— Keyframes ——— */\n\n`;
        for (const kf of keyframeRules) {
          css += kf + '\n\n';
        }
      }
    } else if (!svgTags.has(tag)) {
      // Fallback: no same-origin stylesheet access, use computed styles
      // Skip for SVG elements — their computed CSS is inherited noise
      css += `/* ——— Computed Styles (no stylesheet access) ——— */\n\n`;
      const baseStyles = captureStyles(el);
      css += `${selector} {\n${stylesToCSS(baseStyles, '  ')}\n}\n`;
    }

    const html = getCleanHTML(el);

    stopPickMode();
    chrome.runtime.sendMessage({
      action: 'pickCodeResult',
      data: { css: css.trim(), html, selector }
    });
  }

  // Extract ALL original CSS rules that match an element from stylesheets
  function extractOriginalRules(el) {
    const baseRules = [];      // normal state
    const pseudoRules = [];    // :hover, :focus, :active, etc.
    const keyframeRules = [];  // @keyframes referenced by animations
    const animationNames = new Set();

    try {
      for (const sheet of document.styleSheets) {
        try {
          extractFromRuleList(sheet.cssRules, el, baseRules, pseudoRules, animationNames);
        } catch { /* cross-origin stylesheet */ }
      }
    } catch {}

    // Collect @keyframes that are referenced
    if (animationNames.size > 0) {
      try {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule.type === CSSRule.KEYFRAMES_RULE && animationNames.has(rule.name)) {
                keyframeRules.push(rule.cssText);
              }
            }
          } catch {}
        }
      } catch {}
    }

    return { baseRules, pseudoRules, keyframeRules };
  }

  // Selectors too generic to be useful
  const genericSelectors = new Set([
    '*', 'html', 'body', '*, ::before, ::after', '*,::before,::after',
    '*, *::before, *::after', '*,*::before,*::after',
    ':root', '::before', '::after',
  ]);

  function isGenericSelector(sel) {
    const cleaned = sel.replace(/\s+/g, ' ').trim();
    if (genericSelectors.has(cleaned)) return true;
    // Skip selectors that are just tag names with no class/id (too broad)
    if (/^[a-z]+$/i.test(cleaned) && ['div','span','p','a','img','section','article','header','footer','nav','main','ul','li','button'].includes(cleaned)) return true;
    return false;
  }

  function extractFromRuleList(rules, el, baseRules, pseudoRules, animationNames) {
    for (const rule of rules) {
      // Handle @media rules — recurse
      if (rule.type === CSSRule.MEDIA_RULE) {
        if (window.matchMedia(rule.conditionText || rule.media.mediaText).matches) {
          extractFromRuleList(rule.cssRules, el, baseRules, pseudoRules, animationNames);
        }
        continue;
      }

      if (!rule.selectorText) continue;

      // Skip generic selectors
      if (isGenericSelector(rule.selectorText)) continue;

      // Skip rules with only 1 property that's box-sizing, margin, or padding reset
      if (rule.style.length <= 1) {
        const only = rule.style[0];
        if (only === 'box-sizing' || only === 'margin' || only === 'padding') continue;
      }

      // Check for pseudo-class selectors
      const pseudoMatch = rule.selectorText.match(/^(.+?)(:{1,2}(?:hover|focus|active|focus-visible|focus-within|visited))/);

      if (pseudoMatch) {
        const baseSelector = pseudoMatch[1].trim();
        if (isGenericSelector(baseSelector)) continue;
        try {
          if (el.matches(baseSelector)) {
            pseudoRules.push(rule.cssText);
            const anim = rule.style.getPropertyValue('animation-name') || rule.style.getPropertyValue('animation');
            if (anim && anim !== 'none') extractAnimNames(anim, animationNames);
          }
        } catch {}
      } else {
        try {
          if (el.matches(rule.selectorText)) {
            baseRules.push(rule.cssText);
            const anim = rule.style.getPropertyValue('animation-name') || rule.style.getPropertyValue('animation');
            if (anim && anim !== 'none') extractAnimNames(anim, animationNames);
          }
        } catch {}
      }
    }
  }

  function extractAnimNames(val, set) {
    // animation shorthand or animation-name can have multiple values
    val.split(',').forEach(part => {
      const name = part.trim().split(/\s+/)[0];
      if (name && name !== 'none' && !name.match(/^[\d.]+/)) {
        set.add(name);
      }
    });
  }

  function startPickMode() {
    pickActive = true;
    document.addEventListener('mousemove', handlePickMove, true);
    document.addEventListener('click', handlePickClick, true);
  }

  function stopPickMode() {
    pickActive = false;
    document.removeEventListener('mousemove', handlePickMove, true);
    document.removeEventListener('click', handlePickClick, true);
    if (pickHighlight) { pickHighlight.style.display = 'none'; }
  }

  // ——— Message Listener ———
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping') {
      sendResponse({ ok: true });
      return;
    }

    if (message.action === 'extract') {
      const data = extractDesignTokens();
      sendResponse(data);
      return;
    }

    if (message.action === 'toggleGrid') {
      if (message.enabled) {
        showGrid(message.gridMode || 'pixel', message.gridSize || 8);
      } else {
        hideGrid();
      }
      sendResponse({ ok: true });
    }

    if (message.action === 'toggleBoxes') {
      if (message.enabled) {
        showElementBoxes();
      } else {
        hideElementBoxes();
      }
      sendResponse({ ok: true });
    }

    if (message.action === 'toggleInspect') {
      if (message.enabled) {
        showInspect();
      } else {
        hideInspect();
      }
      sendResponse({ ok: true });
    }

    if (message.action === 'toggleRulers') {
      if (message.enabled) {
        showRulers();
      } else {
        hideRulers();
      }
      sendResponse({ ok: true });
    }

    if (message.action === 'annotateAll') {
      annotateAll();
      sendResponse({ ok: true });
    }

    if (message.action === 'removeAnnotations') {
      removeAnnotations();
      sendResponse({ ok: true });
    }

    if (message.action === 'downloadCapture') {
      // Download the captured image then clean up
      const a = document.createElement('a');
      a.href = message.dataUrl;
      a.download = `${window.location.hostname.replace(/[^a-zA-Z0-9.-]/g, '_')}-annotated.png`;
      a.click();
      stopSelectMode();
      return;
    }

    if (message.action === 'startSelectMode') {
      startSelectMode(message.overlays);
      sendResponse({ ok: true });
    }

    if (message.action === 'stopSelectMode') {
      stopSelectMode();
      sendResponse({ ok: true });
    }

    if (message.action === 'startPickMode') {
      startPickMode();
      sendResponse({ ok: true });
    }

    if (message.action === 'stopPickMode') {
      stopPickMode();
      sendResponse({ ok: true });
    }

    if (message.action === 'setGridMode') {
      if (gridOverlay && gridOverlay.style.display !== 'none') {
        showGrid(message.gridMode, message.gridSize);
      }
      sendResponse({ ok: true });
    }
  });
})();
