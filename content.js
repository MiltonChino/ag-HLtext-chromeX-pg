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
    right: 0;
    width: 320px;
    height: 100vh;
    z-index: 2147483647;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .sidebar {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(12px);
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
    box-sizing: border-box;
  }

  .sidebar.visible {
    transform: translateX(0);
  }

  .header {
    padding: 14px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
  }

  .header h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #1a1a1a;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 20px;
    color: #666;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .close-btn:hover { background: rgba(0,0,0,0.05); color: #000; }

  .sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .section-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .section-container:last-child {
    border-bottom: none;
  }

  .section-header {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #555;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 4px;
    border-bottom: 2px solid #e9ecef;
  }

  .count-badge {
    background: #e9ecef;
    color: #495057;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 600;
  }

  .footer {
    padding: 12px 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    background: #f8f9fa;
  }

  .manage-btn {
    width: 100%;
    padding: 9px;
    background: #0066ff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.2s, transform 0.1s;
    box-shadow: 0 2px 4px rgba(0,102,255,0.2);
  }

  .manage-btn:hover {
    background: #0052cc;
  }

  /* Highlight Card */
  .highlight-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .highlight-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 3px 6px rgba(0,0,0,0.06);
  }

  .highlight-text {
    font-size: 13px;
    line-height: 1.45;
    color: #1e293b;
    margin-bottom: 6px;
    border-left: 3px solid #f59e0b;
    padding-left: 8px;
    word-break: break-word;
  }

  .highlight-note {
    font-size: 12px;
    line-height: 1.4;
    color: #475569;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 6px 8px;
    margin-top: 6px;
    margin-bottom: 6px;
    word-break: break-word;
  }

  /* Task Card */
  .task-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: border-color 0.2s, opacity 0.2s;
  }

  .task-card.completed {
    opacity: 0.65;
    background: #f8fafc;
  }

  .task-header-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .task-checkbox {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    cursor: pointer;
    accent-color: #10b981;
  }

  .task-text {
    font-size: 13px;
    line-height: 1.45;
    color: #1e293b;
    flex: 1;
    word-break: break-word;
  }

  .task-card.completed .task-text {
    text-decoration: line-through;
    color: #64748b;
  }

  .task-note {
    font-size: 12px;
    color: #475569;
    background: #f1f5f9;
    border-radius: 4px;
    padding: 4px 8px;
    margin-top: 6px;
    margin-left: 24px;
    word-break: break-word;
  }

  .card-meta {
    font-size: 10px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
    padding-top: 4px;
    border-top: 1px solid #f1f5f9;
  }

  .action-btns {
    display: flex;
    gap: 8px;
  }

  .btn-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 11px;
    cursor: pointer;
    font-weight: 500;
  }

  .edit-btn { color: #0284c7; }
  .edit-btn:hover { text-decoration: underline; }
  .delete-btn { color: #ef4444; }
  .delete-btn:hover { text-decoration: underline; }

  .inline-editor {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .inline-textarea {
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 12px;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    resize: vertical;
    min-height: 50px;
    outline: none;
  }
  .inline-textarea:focus {
    border-color: #0284c7;
    box-shadow: 0 0 0 2px rgba(2,132,199,0.15);
  }

  .inline-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  .btn-sm {
    padding: 4px 8px;
    font-size: 11px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: 600;
  }
  .btn-primary { background: #0066ff; color: white; }
  .btn-primary:hover { background: #0052cc; }
  .btn-secondary { background: #e2e8f0; color: #334155; }
  .btn-secondary:hover { background: #cbd5e1; }

  .empty-state {
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
    padding: 16px 8px;
  }

  /* Toggle Button */
  .toggle-btn {
    position: absolute;
    top: 50%;
    left: -36px;
    width: 36px;
    height: 40px;
    background: white;
    border: 1px solid rgba(0,0,0,0.12);
    border-right: none;
    border-radius: 8px 0 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: -3px 0 8px rgba(0,0,0,0.08);
    pointer-events: auto;
    font-size: 16px;
    color: #475569;
  }
  .toggle-btn:hover { color: #0066ff; }

  /* Modal Backdrop & Content */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }

  .modal-card {
    background: white;
    width: 340px;
    max-width: 90vw;
    border-radius: 12px;
    padding: 18px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-family: inherit;
  }

  .modal-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }

  .modal-quote {
    font-size: 12px;
    line-height: 1.4;
    color: #334155;
    background: #f8fafc;
    border-left: 3px solid #0066ff;
    padding: 8px 10px;
    border-radius: 0 6px 6px 0;
    max-height: 70px;
    overflow-y: auto;
  }

  .modal-label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
  }

  .mode-switch {
    display: flex;
    background: #f1f5f9;
    padding: 3px;
    border-radius: 8px;
    gap: 4px;
  }

  .mode-option {
    flex: 1;
    text-align: center;
    padding: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s, color 0.15s;
  }

  .mode-option.active {
    background: white;
    color: #0066ff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .modal-textarea {
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 13px;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    resize: vertical;
    min-height: 60px;
    outline: none;
  }
  .modal-textarea:focus {
    border-color: #0066ff;
    box-shadow: 0 0 0 2px rgba(0,102,255,0.15);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
`;

shadowRoot.appendChild(style);

// Sidebar HTML
const sidebar = document.createElement('div');
sidebar.className = 'sidebar';
sidebar.innerHTML = `
  <div class="header">
    <h2><span>📝</span> Highlights & Tasks</h2>
    <button class="close-btn" title="Close Sidebar">×</button>
  </div>
  <div class="sidebar-content">
    <div class="section-container" id="highlights-section">
      <div class="section-header">
        <span>Highlights & Notes</span>
        <span class="count-badge" id="highlights-count">0</span>
      </div>
      <div id="highlights-list"></div>
    </div>
    <div class="section-container" id="tasks-section">
      <div class="section-header">
        <span>Tasks</span>
        <span class="count-badge" id="tasks-count">0</span>
      </div>
      <div id="tasks-list"></div>
    </div>
  </div>
  <div class="footer">
    <button class="manage-btn" id="manage-btn">Manage Hub Dashboard</button>
  </div>
  <button class="toggle-btn" id="toggle-btn" title="Open Sidebar">‹</button>
`;

shadowRoot.appendChild(sidebar);

// Modal container inside shadow root
const modalHost = document.createElement('div');
shadowRoot.appendChild(modalHost);

// State
let highlights = [];
let tasks = [];
let pendingCreation = null; // { text, range, initialType }

// Helper: Generate DOM Path
function getPath(element) {
  if (!(element instanceof Element)) return null;
  const path = [];
  while (element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    if (element.id && /^[a-zA-Z_-]+$/.test(element.id) && element.id.length < 50) {
      selector += '#' + element.id;
      path.unshift(selector);
      break;
    } else {
      let sibling = element;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() == selector) nth++;
      }
      if (nth != 1) selector += ":nth-of-type(" + nth + ")";
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(" > ");
}

function getDomPath(node) {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentNode;
    const parentPath = getPath(parent);
    const childIndex = Array.from(parent.childNodes).indexOf(node);
    return { parentPath, childIndex, type: 'text' };
  }
  return { parentPath: getPath(node), type: 'element' };
}

function getNodeFromDomPath(pathObj) {
  if (!pathObj) return null;
  try {
    const parent = document.querySelector(pathObj.parentPath);
    if (!parent) return null;
    if (pathObj.type === 'text') {
      if (parent.childNodes[pathObj.childIndex]) {
        return parent.childNodes[pathObj.childIndex];
      }
      return parent;
    }
    return parent;
  } catch (e) {
    console.error("Error finding node:", e);
    return null;
  }
}

function highlightRange(range, id, isTask = false) {
  try {
    const span = document.createElement('span');
    span.style.backgroundColor = isTask ? '#d1fae5' : '#ffd700';
    span.style.color = '#000';
    span.style.borderBottom = isTask ? '2px solid #10b981' : 'none';
    span.dataset.highlightId = id;
    range.surroundContents(span);
    return true;
  } catch (e) {
    console.warn("Could not highlight range:", e);
    return false;
  }
}

function openCreationModal(text, range, initialType = 'highlight') {
  pendingCreation = { text, range, type: initialType };

  modalHost.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <h3 class="modal-title">Create ${initialType === 'task' ? 'Task' : 'Highlight'}</h3>
        <div class="modal-quote">"${text}"</div>
        
        <div class="modal-label">Save As:</div>
        <div class="mode-switch">
          <div class="mode-option ${initialType === 'highlight' ? 'active' : ''}" id="mode-hl">Highlight</div>
          <div class="mode-option ${initialType === 'task' ? 'active' : ''}" id="mode-task">Task</div>
        </div>

        <div class="modal-label">Note / Details (Optional):</div>
        <textarea class="modal-textarea" id="modal-note-input" placeholder="Type your comment or task details here..."></textarea>

        <div class="modal-footer">
          <button class="btn-sm btn-secondary" id="modal-cancel-btn">Cancel</button>
          <button class="btn-sm btn-primary" id="modal-save-btn">Save</button>
        </div>
      </div>
    </div>
  `;

  const modeHl = modalHost.querySelector('#mode-hl');
  const modeTask = modalHost.querySelector('#mode-task');
  const noteInput = modalHost.querySelector('#modal-note-input');
  const cancelBtn = modalHost.querySelector('#modal-cancel-btn');
  const saveBtn = modalHost.querySelector('#modal-save-btn');

  noteInput.focus();

  modeHl.addEventListener('click', () => {
    pendingCreation.type = 'highlight';
    modeHl.classList.add('active');
    modeTask.classList.remove('active');
  });

  modeTask.addEventListener('click', () => {
    pendingCreation.type = 'task';
    modeTask.classList.add('active');
    modeHl.classList.remove('active');
  });

  cancelBtn.addEventListener('click', closeCreationModal);

  saveBtn.addEventListener('click', () => {
    const note = noteInput.value.trim();
    if (pendingCreation.type === 'highlight') {
      addHighlight(pendingCreation.text, note, pendingCreation.range);
    } else {
      addTask(pendingCreation.text, note, pendingCreation.range);
    }
    closeCreationModal();
  });
}

function closeCreationModal() {
  modalHost.innerHTML = '';
  pendingCreation = null;
}

function addHighlight(text, note, range) {
  const startPath = getDomPath(range.startContainer);
  const endPath = getDomPath(range.endContainer);

  const item = {
    id: Date.now(),
    text: text,
    note: note || '',
    url: window.location.href,
    date: new Date().toLocaleDateString(),
    dom: {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
      containerText: range.startContainer.textContent
    }
  };

  highlightRange(range, item.id, false);
  highlights.unshift(item);
  saveState(true);
  renderAll();

  sidebar.classList.add('visible');
  shadowRoot.getElementById('toggle-btn').style.display = 'none';
}

function addTask(text, note, range) {
  const startPath = getDomPath(range.startContainer);
  const endPath = getDomPath(range.endContainer);

  const item = {
    id: Date.now(),
    text: text,
    note: note || '',
    url: window.location.href,
    date: new Date().toLocaleDateString(),
    completed: false,
    dom: {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
      containerText: range.startContainer.textContent
    }
  };

  highlightRange(range, item.id, true);
  tasks.unshift(item);
  saveState(true);
  renderAll();

  sidebar.classList.add('visible');
  shadowRoot.getElementById('toggle-btn').style.display = 'none';
}

function restoreHighlights() {
  const allItems = [
    ...highlights.map(h => ({ ...h, isTask: false })),
    ...tasks.map(t => ({ ...t, isTask: true }))
  ];

  allItems.forEach(h => {
    if (!h.dom) return;

    let startNode = getNodeFromDomPath(h.dom.startPath);
    let endNode = getNodeFromDomPath(h.dom.endPath);

    if ((!startNode || !endNode) && h.text) {
      if (h.dom.startPath && h.dom.startPath.parentPath) {
        const parent = document.querySelector(h.dom.startPath.parentPath);
        if (parent) {
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
    }

    if (startNode && endNode) {
      const range = document.createRange();
      try {
        const startLen = startNode.length || startNode.textContent.length;
        const endLen = endNode.length || endNode.textContent.length;

        const startOffset = Math.min(h.dom.startOffset, startLen);
        const endOffset = Math.min(h.dom.endOffset, endLen);

        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        highlightRange(range, h.id, h.isTask);
      } catch (e) {
        console.warn("Failed to restore highlight:", h.id, e);
      }
    }
  });
}

function renderAll() {
  renderHighlights();
  renderTasks();
}

function renderHighlights() {
  const listEl = shadowRoot.getElementById('highlights-list');
  const countEl = shadowRoot.getElementById('highlights-count');
  listEl.innerHTML = '';
  countEl.textContent = highlights.length;

  if (highlights.length === 0) {
    listEl.innerHTML = `<div class="empty-state">No highlights yet. Select text & right-click to highlight.</div>`;
    return;
  }

  highlights.forEach(h => {
    const card = document.createElement('div');
    card.className = 'highlight-card';
    card.innerHTML = `
      <div class="highlight-text">${h.text}</div>
      ${h.note ? `<div class="highlight-note">💭 ${h.note}</div>` : ''}
      <div class="card-meta">
        <span>${h.date}</span>
        <div class="action-btns">
          <button class="btn-link edit-btn" data-action="edit">Edit Note</button>
          <button class="btn-link delete-btn" data-action="delete">Delete</button>
        </div>
      </div>
      <div class="inline-editor" style="display: none;">
        <textarea class="inline-textarea" placeholder="Edit note...">${h.note || ''}</textarea>
        <div class="inline-actions">
          <button class="btn-sm btn-secondary cancel-edit">Cancel</button>
          <button class="btn-sm btn-primary save-edit">Save</button>
        </div>
      </div>
    `;

    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    const editor = card.querySelector('.inline-editor');
    const textarea = card.querySelector('.inline-textarea');
    const cancelEditBtn = card.querySelector('.cancel-edit');
    const saveEditBtn = card.querySelector('.save-edit');

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editor.style.display = editor.style.display === 'none' ? 'flex' : 'none';
      if (editor.style.display === 'flex') textarea.focus();
    });

    cancelEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editor.style.display = 'none';
    });

    saveEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      h.note = textarea.value.trim();
      saveState(true);
      renderHighlights();
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHighlight(h.id);
    });

    card.addEventListener('click', () => {
      const el = document.querySelector(`span[data-highlight-id="${h.id}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    listEl.appendChild(card);
  });
}

function renderTasks() {
  const listEl = shadowRoot.getElementById('tasks-list');
  const countEl = shadowRoot.getElementById('tasks-count');
  listEl.innerHTML = '';
  countEl.textContent = tasks.length;

  if (tasks.length === 0) {
    listEl.innerHTML = `<div class="empty-state">No tasks created yet. Select text & choose "Create Task".</div>`;
    return;
  }

  tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = `task-card ${t.completed ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="task-header-row">
        <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} />
        <div class="task-text">${t.text}</div>
      </div>
      ${t.note ? `<div class="task-note">📋 ${t.note}</div>` : ''}
      <div class="card-meta">
        <span>${t.date}</span>
        <div class="action-btns">
          <button class="btn-link edit-btn" data-action="edit">Edit</button>
          <button class="btn-link delete-btn" data-action="delete">Delete</button>
        </div>
      </div>
      <div class="inline-editor" style="display: none;">
        <textarea class="inline-textarea" placeholder="Edit task note...">${t.note || ''}</textarea>
        <div class="inline-actions">
          <button class="btn-sm btn-secondary cancel-edit">Cancel</button>
          <button class="btn-sm btn-primary save-edit">Save</button>
        </div>
      </div>
    `;

    const checkbox = card.querySelector('.task-checkbox');
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    const editor = card.querySelector('.inline-editor');
    const textarea = card.querySelector('.inline-textarea');
    const cancelEditBtn = card.querySelector('.cancel-edit');
    const saveEditBtn = card.querySelector('.save-edit');

    checkbox.addEventListener('change', (e) => {
      t.completed = e.target.checked;
      saveState(true);
      renderTasks();
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editor.style.display = editor.style.display === 'none' ? 'flex' : 'none';
      if (editor.style.display === 'flex') textarea.focus();
    });

    cancelEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editor.style.display = 'none';
    });

    saveEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      t.note = textarea.value.trim();
      saveState(true);
      renderTasks();
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(t.id);
    });

    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
      const el = document.querySelector(`span[data-highlight-id="${t.id}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    listEl.appendChild(card);
  });
}

function deleteHighlight(id) {
  const spans = document.querySelectorAll(`span[data-highlight-id="${id}"]`);
  spans.forEach(span => {
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });

  highlights = highlights.filter(h => h.id !== id);
  saveState(true);
  renderHighlights();
}

function deleteTask(id) {
  const spans = document.querySelectorAll(`span[data-highlight-id="${id}"]`);
  spans.forEach(span => {
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });

  tasks = tasks.filter(t => t.id !== id);
  saveState(true);
  renderTasks();
}

function saveState(isVisible) {
  try {
    const hostname = window.location.hostname;
    chrome.storage.local.set({
      ['highlights_' + hostname]: highlights,
      ['tasks_' + hostname]: tasks,
      ['sidebarVisible_' + hostname]: isVisible
    });
  } catch (e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      console.warn('Extension context invalidated. Please reload the page.');
    } else {
      console.error('Error saving state:', e);
    }
  }
}

function loadState() {
  try {
    const hostname = window.location.hostname;
    chrome.storage.local.get([
      'highlights_' + hostname,
      'tasks_' + hostname,
      'sidebarVisible_' + hostname
    ], (result) => {
      if (chrome.runtime.lastError) return;

      if (result['highlights_' + hostname]) {
        highlights = result['highlights_' + hostname];
      }
      if (result['tasks_' + hostname]) {
        tasks = result['tasks_' + hostname];
      }

      renderAll();
      setTimeout(restoreHighlights, 500);
      window.addEventListener('load', restoreHighlights);

      const savedVisibility = result['sidebarVisible_' + hostname];
      const isVisible = savedVisibility !== false;

      const toggleBtn = shadowRoot.getElementById('toggle-btn');
      if (isVisible) {
        sidebar.classList.add('visible');
        toggleBtn.style.display = 'none';
      } else {
        sidebar.classList.remove('visible');
        toggleBtn.style.display = 'flex';
      }
    });
  } catch (e) {
    console.warn('Extension context invalidated during load.');
  }
}

// Event Listeners
const closeBtn = sidebar.querySelector('.close-btn');
const toggleBtn = shadowRoot.getElementById('toggle-btn');
const manageBtn = shadowRoot.getElementById('manage-btn');

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
  try {
    chrome.runtime.sendMessage({ action: "OPEN_DASHBOARD" });
  } catch (e) {
    alert('Please reload the page to use the extension dashboard.');
  }
});

// Messages from Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "HIGHLIGHT_TEXT" || request.action === "CREATE_TASK") {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const initialType = request.action === "CREATE_TASK" ? "task" : "highlight";
      openCreationModal(request.selectionText || selection.toString().trim(), range, initialType);
      selection.removeAllRanges();
    }
  }
});

// Keyboard Shortcut: Ctrl + .
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === '.') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      if (text) {
        openCreationModal(text, range, 'highlight');
        selection.removeAllRanges();
      }
    }
  }
});

// Initialize
loadState();

