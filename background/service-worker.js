async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content/content.css']
      });
    } catch (e) {
      throw new Error('Cannot access this page');
    }
  }
}

// Message routing: popup ↔ content script + capture from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Content script Export button → capture screenshot then clean up
  if (message.action === 'captureSelectMode') {
    (async () => {
      try {
        // Hide toolbar before capture
        const tabId = sender.tab?.id;
        if (tabId) {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const tb = document.querySelector('[id*="grid-lens"] button')?.closest('div[style*="bottom"]');
              if (tb) tb.style.display = 'none';
            }
          });
        }
        await new Promise(r => setTimeout(r, 100));
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        // Send download URL back to content script tab
        if (tabId) {
          await chrome.tabs.sendMessage(tabId, { action: 'downloadCapture', dataUrl });
        }
      } catch (e) {
        console.error('Capture failed:', e);
      }
    })();
    return true;
  }

  if (message.target === 'content') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ error: 'No active tab' });
        return;
      }
      try {
        await ensureContentScript(tabs[0].id);
        const response = await chrome.tabs.sendMessage(tabs[0].id, message);
        sendResponse(response);
      } catch (e) {
        sendResponse({ error: e.message });
      }
    });
    return true;
  }
});

// Keyboard shortcuts — toggle features without opening popup
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await ensureContentScript(tab.id);
  } catch {
    return;
  }

  const stateKey = `tab-${tab.id}`;
  const state = (await chrome.storage.local.get(stateKey))[stateKey] || {};

  if (command === 'toggle-grid') {
    state.gridEnabled = !state.gridEnabled;
    await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleGrid', enabled: state.gridEnabled, gridSize: state.gridSize || 8
    });
  }

  if (command === 'toggle-inspect') {
    state.inspectEnabled = !state.inspectEnabled;
    await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleInspect', enabled: state.inspectEnabled
    });
  }

  if (command === 'toggle-rulers') {
    state.rulersEnabled = !state.rulersEnabled;
    await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleRulers', enabled: state.rulersEnabled
    });
  }

  await chrome.storage.local.set({ [stateKey]: state });
});

// Context menu — open as side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'open-side-panel',
    title: 'Open Grid Lens in Side Panel',
    contexts: ['action']
  });
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-side-panel') {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
