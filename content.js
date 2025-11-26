// Content Script

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
sidebar.className = 'sidebar visible'; // Visible by default for now
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
  <button class="toggle-btn" style="display: none;">‹</button>
`;

shadowRoot.appendChild(sidebar);

// State
let highlights = [];

// Helper: Generate a unique CSS selector path for an element
function getPath(element) {
    if (!(element instanceof Element)) return null;
    const path = [];
    while (element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();

        // Only use ID if it looks stable (simple heuristic: no numbers, not too long)
        if (element.id && /^[a-zA-Z_-]+$/.test(element.id) && element.id.length < 50) {
            selector += '#' + element.id;
            path.unshift(selector);
            break;
        } else {
            let sibling = element;
            let nth = 1;
            while (sibling = sibling.previousElementSibling) {
                if (sibling.nodeName.toLowerCase() == selector)
                    nth++;
            }
            if (nth != 1)
                selector += ":nth-of-type(" + nth + ")";
        }
        path.unshift(selector);
        element = element.parentNode;
    }
    return path.join(" > ");
}

// Refined Path Logic for Text Nodes
function getDomPath(node) {
    if (!node) return null;

    // If it's a text node, get path to parent and index
    if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentNode;
        const parentPath = getPath(parent);
        const childIndex = Array.from(parent.childNodes).indexOf(node);
        return { parentPath, childIndex, type: 'text' };
    }

    // If element
    return { parentPath: getPath(node), type: 'element' };
}

function getNodeFromDomPath(pathObj) {
    if (!pathObj) return null;
    try {
        const parent = document.querySelector(pathObj.parentPath);
        if (!parent) return null;

        if (pathObj.type === 'text') {
            // Try exact index first
            if (parent.childNodes[pathObj.childIndex]) {
                return parent.childNodes[pathObj.childIndex];
            }
            // Fallback: Return the parent (we might highlight the whole element or search text)
            return parent;
        }
        return parent;
    } catch (e) {
        console.error("Error finding node:", e);
        return null;
    }
}

function highlightRange(range, id) {
    try {
        const span = document.createElement('span');
        span.style.backgroundColor = '#ffd700';
        span.style.color = '#000';
        span.dataset.highlightId = id; // Store ID to remove later if needed
        range.surroundContents(span);
        return true;
    } catch (e) {
        console.warn("Could not highlight range:", e);
        return false;
    }
}

function addHighlight(text, range) {
    const startPath = getDomPath(range.startContainer);
    const endPath = getDomPath(range.endContainer);

    const highlight = {
        id: Date.now(),
        text: text,
        url: window.location.href,
        date: new Date().toLocaleDateString(),
        dom: {
            startPath: startPath,
            startOffset: range.startOffset,
            endPath: endPath,
            endOffset: range.endOffset,
            containerText: range.startContainer.textContent // Store context for fallback
        }
    };

    // Visual Highlight
    highlightRange(range, highlight.id);

    highlights.unshift(highlight);
    saveHighlights();
    renderHighlights();

    sidebar.classList.add('visible');
    toggleBtn.style.display = 'none';
}

function restoreHighlights() {
    highlights.forEach(h => {
        if (!h.dom) return;

        let startNode = getNodeFromDomPath(h.dom.startPath);
        let endNode = getNodeFromDomPath(h.dom.endPath);

        // Fallback: Text Search if exact path fails or content changed
        if ((!startNode || !endNode) && h.text) {
            console.log("Exact path failed, trying text search for:", h.text);
            // Simple fallback: search in body
            // This is expensive and risky, but better than nothing.
            // A better approach is to search within the parent of the path if found.

            // Try to find the parent element at least
            const parent = document.querySelector(h.dom.startPath.parentPath);
            if (parent) {
                // Look for text node containing the text
                const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent.includes(h.text)) {
                        startNode = node;
                        endNode = node;
                        h.dom.startOffset = node.textContent.indexOf(h.text);
                        h.dom.endOffset = h.dom.startOffset + h.text.length;
                        break;
                    }
                }
            }
        }

        if (startNode && endNode) {
            const range = document.createRange();
            try {
                // Ensure offsets are valid
                const startLen = startNode.length || startNode.textContent.length;
                const endLen = endNode.length || endNode.textContent.length;

                const startOffset = Math.min(h.dom.startOffset, startLen);
                const endOffset = Math.min(h.dom.endOffset, endLen);

                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                highlightRange(range, h.id);
            } catch (e) {
                console.warn("Failed to restore highlight:", h.id, e);
            }
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

function saveHighlights() {
    chrome.storage.local.set({ ['highlights_' + window.location.hostname]: highlights });
}

function loadHighlights() {
    chrome.storage.local.get(['highlights_' + window.location.hostname], (result) => {
        if (result['highlights_' + window.location.hostname]) {
            highlights = result['highlights_' + window.location.hostname];
            renderHighlights();
            // Delay restoration slightly to allow dynamic content to settle
            setTimeout(restoreHighlights, 500);
            // And try again on window load just in case
            window.addEventListener('load', restoreHighlights);
        }
    });
}

// Event Listeners
const closeBtn = sidebar.querySelector('.close-btn');
const toggleBtn = sidebar.querySelector('.toggle-btn');

closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('visible');
    toggleBtn.style.display = 'flex';
});

toggleBtn.addEventListener('click', () => {
    sidebar.classList.add('visible');
    toggleBtn.style.display = 'none';
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "HIGHLIGHT_TEXT") {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

            // Add to sidebar and highlight
            addHighlight(request.selectionText, range);

            // Clear selection
            selection.removeAllRanges();
        }
    }
});

// Initialize
loadHighlights();
