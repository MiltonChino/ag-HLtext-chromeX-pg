// PDF Content Script (runs inside viewer.html)

// --- Sidebar UI Setup ---

// Create the sidebar container
const sidebarHost = document.createElement('div');
sidebarHost.id = 'text-highlighter-sidebar-host';
document.body.appendChild(sidebarHost);

// Attach Shadow DOM to isolate styles
const shadowRoot = sidebarHost.attachShadow({ mode: 'open' });

// Inject Styles
const style = document.createElement('style');
style.textContent = `
  :host {
    all: initial;
    position: fixed;
    top: 0;
    right: 0; /* Fixed to the right */
    width: 300px;
    height: 100vh;
    z-index: 2147483647; /* Max z-index */
    pointer-events: none; /* Let clicks pass through when not interacting */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .sidebar {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    transform: translateX(100%); /* Hidden by default */
    transition: transform 0.3s ease;
    pointer-events: auto; /* Re-enable clicks for the sidebar itself */
  }

  .sidebar.visible {
    transform: translateX(0);
  }

  .header {
    padding: 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
  }

  .header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    color: #666;
  }

  .highlights-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .footer {
    padding: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    background: #f8f9fa;
  }

  .manage-btn {
    width: 100%;
    padding: 8px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .manage-btn:hover {
    background: #0056b3;
  }

  .highlight-card {
    background: white;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: transform 0.2s;
  }
  
  .highlight-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .highlight-text {
    font-size: 14px;
    line-height: 1.5;
    color: #333;
    margin-bottom: 8px;
    border-left: 3px solid #ffd700;
    padding-left: 8px;
  }

  .highlight-meta {
    font-size: 11px;
    color: #888;
    display: flex;
    justify-content: space-between;
  }

  .delete-btn {
    color: #ff4444;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    font-size: 11px;
  }

  /* Toggle Button (Visible when sidebar is hidden) */
  .toggle-btn {
    position: absolute;
    top: 50%;
    left: -40px;
    width: 40px;
    height: 40px;
    background: white;
    border: 1px solid rgba(0,0,0,0.1);
    border-right: none;
    border-radius: 8px 0 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: -2px 0 5px rgba(0,0,0,0.05);
    pointer-events: auto;
  }
`;

shadowRoot.appendChild(style);

// Sidebar HTML
const sidebar = document.createElement('div');
sidebar.className = 'sidebar'; // Default hidden
sidebar.innerHTML = `
  <div class="header">
    <h2>Highlights</h2>
    <button class="close-btn">×</button>
  </div>
  <div class="highlights-list" id="list">
    <!-- Highlights will go here -->
    <div style="text-align: center; color: #888; margin-top: 20px; font-size: 13px;">
      Select text and right-click to highlight
    </div>
  </div>
  <div class="footer">
    <button class="manage-btn">Manage Highlights</button>
  </div>
  <button class="toggle-btn" style="display: none;">‹</button>
`;

shadowRoot.appendChild(sidebar);

// --- Logic ---

let highlights = [];
const fileUrl = new URLSearchParams(window.location.search).get('file');

// Initialize
loadState();

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "HIGHLIGHT_TEXT") {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      addHighlight(request.selectionText, range);
      selection.removeAllRanges();
    }
  }
});

function addHighlight(text, range) {
  // For PDF.js, we need to be careful about what we are selecting.
  // The selection is likely across multiple spans in the textLayer.

  // We will store the text and a simplified location (page number + text index/context)
  // Since our viewer.js creates a simple text layer, we can try to use the text content.

  // Find which page we are on
  const startNode = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentNode : range.startContainer;
  const pageDiv = startNode.closest('.page');
  const pageNum = pageDiv ? parseInt(pageDiv.dataset.pageNumber) : 1;

  const highlight = {
    id: Date.now(),
    text: text,
    url: fileUrl, // Key by the actual PDF URL
    date: new Date().toLocaleDateString(),
    pdf: {
      page: pageNum,
      // We'll just store the text for now and try to find it again.
      // A robust implementation would store rects or precise offsets.
      context: text // Storing text as context
    }
  };

  highlights.unshift(highlight);
  saveHighlights();
  renderHighlights(); // Update sidebar
  renderHighlight(highlight, range); // Visual render

  sidebar.classList.add('visible');
  toggleBtn.style.display = 'none';
  saveState(true);
}

function saveState(isVisible) {
  const storageKey = 'sidebarVisible_' + fileUrl;
  chrome.storage.local.set({ [storageKey]: isVisible });
}

function saveHighlights() {
  const storageKey = 'highlights_' + fileUrl;
  chrome.storage.local.set({ [storageKey]: highlights });
}

function loadState() {
  const storageKey = 'highlights_' + fileUrl;
  const visibilityKey = 'sidebarVisible_' + fileUrl;

  chrome.storage.local.get([storageKey, visibilityKey], (result) => {
    if (result[storageKey]) {
      highlights = result[storageKey];
      renderHighlights();
      // We need to wait for pages to render before restoring highlights.
      // This is tricky with PDF.js lazy loading.
      // For this MVP, we'll try to restore periodically or hook into rendering.
      setInterval(restoreHighlights, 1000); // Simple polling for now
    }

    // Load Visibility
    const savedVisibility = result[visibilityKey];
    const isVisible = savedVisibility !== false; // Default true

    if (isVisible) {
      sidebar.classList.add('visible');
      toggleBtn.style.display = 'none';
    } else {
      sidebar.classList.remove('visible');
      toggleBtn.style.display = 'flex';
    }
  });
}

function renderHighlights() {
  const list = shadowRoot.getElementById('list');
  list.innerHTML = '';

  if (highlights.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; color: #888; margin-top: 20px; font-size: 13px;">
        Select text and right-click to highlight
      </div>
    `;
    return;
  }

  highlights.forEach(h => {
    const card = document.createElement('div');
    card.className = 'highlight-card';
    card.innerHTML = `
      <div class="highlight-text">${h.text}</div>
      <div class="highlight-meta">
        <span>${h.date}</span>
        <button class="delete-btn" data-id="${h.id}">Delete</button>
      </div>
    `;

    // Add delete listener
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHighlight(h.id);
    });

    // Optional: Click to scroll to highlight
    card.addEventListener('click', () => {
      const el = document.querySelector(`span[data-highlight-id="${h.id}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    list.appendChild(card);
  });
}

function deleteHighlight(id) {
  // Remove visual highlight from DOM
  const spans = document.querySelectorAll(`span[data-highlight-id="${id}"]`);
  spans.forEach(span => {
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });

  highlights = highlights.filter(h => h.id !== id);
  saveHighlights();
  renderHighlights();
}

function restoreHighlights() {
  highlights.forEach(h => {
    // Check if already rendered
    if (document.querySelector(`span[data-highlight-id="${h.id}"]`)) return;

    // Find page
    const pageDiv = document.querySelector(`.page[data-page-number="${h.pdf.page}"]`);
    if (!pageDiv) return; // Page not rendered yet

    // Simple text search in the page
    // This is a naive implementation: finds the first occurrence of the text on the page.
    const textLayer = pageDiv.querySelector('.textLayer');
    if (!textLayer) return;

    // We need to find the text nodes that contain this text.
    // Since PDF.js splits text into spans, the text might be fragmented.
    // This is the hard part of PDF highlighting.

    // Fallback: Just highlight the first matching span(s) if possible or use a visual overlay.
    // Let's try to find the text in the textLayer's innerText.

    // For this MVP, let's just try to find the exact text in one of the spans (unlikely if long)
    // or just warn that we can't restore perfectly without complex logic.

    // Better approach for MVP:
    // Iterate spans and try to match.

    const spans = Array.from(textLayer.querySelectorAll('span'));
    for (let span of spans) {
      if (span.textContent.includes(h.text)) {
        // Found a match (partial)
        highlightElement(span, h.id);
        return;
      }
    }
  });
}

function highlightElement(element, id) {
  element.style.backgroundColor = 'rgba(255, 215, 0, 0.5)';
  element.dataset.highlightId = id;
}

function renderHighlight(highlight, range) {
  // Visual highlight for the current selection
  // We can use the standard surroundContents if the range is within a single node
  // But PDF.js text layer often has immutable DOM or complex structure.

  try {
    const span = document.createElement('span');
    span.className = 'highlight';
    span.dataset.highlightId = highlight.id;
    range.surroundContents(span);
  } catch (e) {
    console.warn('Could not highlight range visually:', e);
  }
}

// Event Listeners
const closeBtn = sidebar.querySelector('.close-btn');
const toggleBtn = sidebar.querySelector('.toggle-btn');
const manageBtn = sidebar.querySelector('.manage-btn');

closeBtn.addEventListener('click', () => {
  sidebar.classList.remove('visible');
  toggleBtn.style.display = 'flex';
  saveState(false);
});

toggleBtn.addEventListener('click', () => {
  sidebar.classList.add('visible');
  toggleBtn.style.display = 'none';
  saveState(true);
});

manageBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "OPEN_DASHBOARD" });
});
