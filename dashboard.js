document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

let allHighlights = []; // Array of { id, text, note, url, date, hostname }
let allTasks = [];      // Array of { id, text, note, url, date, completed, hostname }
let activeTab = 'highlights';
let taskFilter = 'all'; // 'all', 'active', 'completed'
let searchQuery = '';
let editingItem = null; // { type, item } if editing existing item

function initDashboard() {
  setupTabs();
  setupFilters();
  setupModal();
  setupExportImport();
  loadData();
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;

      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${activeTab}`).classList.add('active');

      const taskFilterGroup = document.getElementById('task-filter-group');
      if (activeTab === 'tasks') {
        taskFilterGroup.style.display = 'flex';
      } else {
        taskFilterGroup.style.display = 'none';
      }

      renderCurrentTab();
    });
  });
}

function setupFilters() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderCurrentTab();
  });

  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      taskFilter = chip.dataset.taskFilter;
      renderTasks();
    });
  });
}

function setupExportImport() {
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importData);
}

function loadData() {
  chrome.storage.local.get(null, (items) => {
    allHighlights = [];
    allTasks = [];

    const domainSet = new Set();

    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith('highlights_') && Array.isArray(value)) {
        const hostname = key.replace('highlights_', '');
        domainSet.add(hostname);
        value.forEach(item => {
          allHighlights.push({ ...item, hostname });
        });
      } else if (key.startsWith('tasks_') && Array.isArray(value)) {
        const hostname = key.replace('tasks_', '');
        domainSet.add(hostname);
        value.forEach(item => {
          allTasks.push({ ...item, hostname });
        });
      }
    }

    // Sort descending by ID (newest first)
    allHighlights.sort((a, b) => (b.id || 0) - (a.id || 0));
    allTasks.sort((a, b) => (b.id || 0) - (a.id || 0));

    // Update Counts
    document.getElementById('hl-tab-count').textContent = allHighlights.length;
    document.getElementById('task-tab-count').textContent = allTasks.length;
    document.getElementById('domain-tab-count').textContent = domainSet.size;

    renderCurrentTab();
  });
}

function renderCurrentTab() {
  if (activeTab === 'highlights') {
    renderHighlights();
  } else if (activeTab === 'tasks') {
    renderTasks();
  } else if (activeTab === 'domains') {
    renderDomains();
  }
}

function renderHighlights() {
  const container = document.getElementById('highlights-container');
  container.innerHTML = '';

  let filtered = allHighlights.filter(h => {
    if (!searchQuery) return true;
    return (
      (h.text && h.text.toLowerCase().includes(searchQuery)) ||
      (h.note && h.note.toLowerCase().includes(searchQuery)) ||
      (h.url && h.url.toLowerCase().includes(searchQuery))
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-msg">No highlights found.</div>`;
    return;
  }

  filtered.forEach(h => {
    const card = document.createElement('div');
    card.className = 'dash-card';
    card.innerHTML = `
      <div class="dash-card-header">
        <div class="dash-card-text">${escapeHtml(h.text)}</div>
      </div>
      ${h.note ? `<div class="dash-card-note">💭 ${escapeHtml(h.note)}</div>` : ''}
      <div class="dash-card-meta">
        <div>
          <span class="domain-tag">${escapeHtml(h.hostname)}</span>
          <span style="margin-left:8px;">${escapeHtml(h.date || '')}</span>
        </div>
        <div class="card-actions">
          <a href="${escapeHtml(h.url)}" target="_blank" class="link-btn">Visit Page ↗</a>
          <button class="action-link edit" data-action="edit">Edit</button>
          <button class="action-link delete" data-action="delete">Delete</button>
        </div>
      </div>
    `;

    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openModalForEdit('highlight', h);
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      deleteItem('highlight', h.hostname, h.id);
    });

    container.appendChild(card);
  });
}

function renderTasks() {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '';

  let filtered = allTasks.filter(t => {
    if (taskFilter === 'active' && t.completed) return false;
    if (taskFilter === 'completed' && !t.completed) return false;

    if (!searchQuery) return true;
    return (
      (t.text && t.text.toLowerCase().includes(searchQuery)) ||
      (t.note && t.note.toLowerCase().includes(searchQuery)) ||
      (t.url && t.url.toLowerCase().includes(searchQuery))
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-msg">No tasks found.</div>`;
    return;
  }

  filtered.forEach(t => {
    const card = document.createElement('div');
    card.className = `dash-card is-task ${t.completed ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="dash-card-header">
        <div class="task-row">
          <input type="checkbox" class="dash-task-check" ${t.completed ? 'checked' : ''} />
          <div class="dash-card-text">${escapeHtml(t.text)}</div>
        </div>
      </div>
      ${t.note ? `<div class="dash-card-note">📋 ${escapeHtml(t.note)}</div>` : ''}
      <div class="dash-card-meta">
        <div>
          <span class="domain-tag">${escapeHtml(t.hostname)}</span>
          <span style="margin-left:8px;">${escapeHtml(t.date || '')}</span>
        </div>
        <div class="card-actions">
          <a href="${escapeHtml(t.url)}" target="_blank" class="link-btn">Visit Page ↗</a>
          <button class="action-link edit" data-action="edit">Edit</button>
          <button class="action-link delete" data-action="delete">Delete</button>
        </div>
      </div>
    `;

    card.querySelector('.dash-task-check').addEventListener('change', (e) => {
      toggleTaskCompletion(t.hostname, t.id, e.target.checked);
    });

    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openModalForEdit('task', t);
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      deleteItem('task', t.hostname, t.id);
    });

    container.appendChild(card);
  });
}

function renderDomains() {
  const container = document.getElementById('domains-container');
  container.innerHTML = '';

  const domains = {};
  allHighlights.forEach(h => {
    if (!domains[h.hostname]) domains[h.hostname] = { highlights: [], tasks: [] };
    domains[h.hostname].highlights.push(h);
  });
  allTasks.forEach(t => {
    if (!domains[t.hostname]) domains[t.hostname] = { highlights: [], tasks: [] };
    domains[t.hostname].tasks.push(t);
  });

  const domainNames = Object.keys(domains);
  if (domainNames.length === 0) {
    container.innerHTML = `<div class="empty-msg">No domains stored yet.</div>`;
    return;
  }

  domainNames.forEach(hostname => {
    const data = domains[hostname];
    const card = document.createElement('div');
    card.className = 'domain-card';

    card.innerHTML = `
      <div class="domain-header">
        <div class="domain-info">
          <h3>🌐 ${escapeHtml(hostname)}</h3>
          <span>${data.highlights.length} Highlights • ${data.tasks.length} Tasks</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-danger btn-sm delete-domain-btn">Delete Domain Data</button>
        </div>
      </div>
      <div class="highlights-container">
        <div style="padding: 16px;">
          ${data.highlights.length > 0 ? `<strong>Highlights (${data.highlights.length}):</strong>` : ''}
          ${data.highlights.map(h => `
            <div style="margin: 8px 0; padding-left: 8px; border-left: 3px solid #f59e0b; font-size: 13px;">
              <div>${escapeHtml(h.text)}</div>
              ${h.note ? `<div style="color:#64748b; font-size:12px;">💭 ${escapeHtml(h.note)}</div>` : ''}
            </div>
          `).join('')}

          ${data.tasks.length > 0 ? `<strong style="display:block; margin-top:12px;">Tasks (${data.tasks.length}):</strong>` : ''}
          ${data.tasks.map(t => `
            <div style="margin: 8px 0; padding-left: 8px; border-left: 3px solid #10b981; font-size: 13px; ${t.completed ? 'text-decoration:line-through; opacity:0.7;' : ''}">
              <div>${escapeHtml(t.text)}</div>
              ${t.note ? `<div style="color:#64748b; font-size:12px;">📋 ${escapeHtml(t.note)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    card.querySelector('.domain-info').addEventListener('click', () => {
      card.querySelector('.highlights-container').classList.toggle('expanded');
    });

    card.querySelector('.delete-domain-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete all highlights and tasks for ${hostname}?`)) {
        chrome.storage.local.remove([`highlights_${hostname}`, `tasks_${hostname}`], () => {
          loadData();
        });
      }
    });

    container.appendChild(card);
  });
}

/* Modal Functions */
function setupModal() {
  const modal = document.getElementById('item-modal');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('modal-cancel');
  const saveBtn = document.getElementById('modal-save');
  const addHlBtn = document.getElementById('add-hl-btn');
  const addTaskBtn = document.getElementById('add-task-btn');
  const typeSelect = document.getElementById('item-type');
  const textLabel = document.getElementById('label-text');

  addHlBtn.addEventListener('click', () => openModalForCreate('highlight'));
  addTaskBtn.addEventListener('click', () => openModalForCreate('task'));

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  typeSelect.addEventListener('change', () => {
    textLabel.textContent = typeSelect.value === 'task' ? 'Task Title / Text *' : 'Highlighted Text *';
  });

  saveBtn.addEventListener('click', saveModalItem);
}

function openModalForCreate(type = 'highlight') {
  editingItem = null;
  document.getElementById('modal-heading').textContent = type === 'task' ? 'Add New Task' : 'Add New Highlight';
  document.getElementById('item-type').value = type;
  document.getElementById('label-text').textContent = type === 'task' ? 'Task Title / Text *' : 'Highlighted Text *';
  document.getElementById('item-text').value = '';
  document.getElementById('item-note').value = '';
  document.getElementById('item-url').value = '';
  document.getElementById('item-modal').style.display = 'flex';
}

function openModalForEdit(type, item) {
  editingItem = { type, item };
  document.getElementById('modal-heading').textContent = type === 'task' ? 'Edit Task' : 'Edit Highlight';
  document.getElementById('item-type').value = type;
  document.getElementById('label-text').textContent = type === 'task' ? 'Task Title / Text *' : 'Highlighted Text *';
  document.getElementById('item-text').value = item.text || '';
  document.getElementById('item-note').value = item.note || '';
  document.getElementById('item-url').value = item.url || '';
  document.getElementById('item-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('item-modal').style.display = 'none';
  editingItem = null;
}

function saveModalItem() {
  const type = document.getElementById('item-type').value;
  const text = document.getElementById('item-text').value.trim();
  const note = document.getElementById('item-note').value.trim();
  const rawUrl = document.getElementById('item-url').value.trim();

  if (!text) {
    alert('Please enter text/title.');
    return;
  }
  if (!rawUrl) {
    alert('Please enter a valid URL reference.');
    return;
  }

  let hostname = 'general';
  try {
    const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
    hostname = urlObj.hostname;
  } catch (e) {
    alert('Invalid URL format. Please enter a valid URL.');
    return;
  }

  const key = type === 'task' ? `tasks_${hostname}` : `highlights_${hostname}`;

  chrome.storage.local.get([key], (result) => {
    let list = result[key] || [];

    if (editingItem) {
      // Update existing item
      list = list.map(i => {
        if (i.id === editingItem.item.id) {
          return { ...i, text, note, url: rawUrl, date: i.date || new Date().toLocaleDateString() };
        }
        return i;
      });
    } else {
      // Create new item
      const newItem = {
        id: Date.now(),
        text,
        note,
        url: rawUrl,
        date: new Date().toLocaleDateString()
      };
      if (type === 'task') newItem.completed = false;
      list.unshift(newItem);
    }

    chrome.storage.local.set({ [key]: list }, () => {
      closeModal();
      loadData();
    });
  });
}

function toggleTaskCompletion(hostname, id, completed) {
  const key = `tasks_${hostname}`;
  chrome.storage.local.get([key], (result) => {
    let tasks = result[key] || [];
    tasks = tasks.map(t => t.id === id ? { ...t, completed } : t);
    chrome.storage.local.set({ [key]: tasks }, () => {
      loadData();
    });
  });
}

function deleteItem(type, hostname, id) {
  if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

  const key = type === 'task' ? `tasks_${hostname}` : `highlights_${hostname}`;
  chrome.storage.local.get([key], (result) => {
    let list = result[key] || [];
    list = list.filter(i => i.id !== id);
    chrome.storage.local.set({ [key]: list }, () => {
      loadData();
    });
  });
}

/* Export / Import */
function exportData() {
  chrome.storage.local.get(null, (items) => {
    const exportData = {
      highlights: {},
      tasks: {}
    };

    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith('highlights_')) {
        const hostname = key.replace('highlights_', '');
        exportData.highlights[hostname] = value;
      } else if (key.startsWith('tasks_')) {
        const hostname = key.replace('tasks_', '');
        exportData.tasks[hostname] = value;
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'highlights_and_tasks_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);

      chrome.storage.local.get(null, (currentData) => {
        const newData = {};

        // Import Highlights
        const highlightsMap = imported.highlights || (imported.highlights === undefined ? imported : {});
        for (const [hostname, items] of Object.entries(highlightsMap)) {
          if (hostname === 'tasks') continue;
          if (Array.isArray(items)) {
            const key = `highlights_${hostname}`;
            const existing = currentData[key] || [];
            const existingIds = new Set(existing.map(i => i.id));
            const merged = [...existing];

            items.forEach(item => {
              if (!existingIds.has(item.id)) {
                merged.push(item);
                existingIds.add(item.id);
              }
            });
            merged.sort((a, b) => (b.id || 0) - (a.id || 0));
            newData[key] = merged;
          }
        }

        // Import Tasks
        if (imported.tasks && typeof imported.tasks === 'object') {
          for (const [hostname, items] of Object.entries(imported.tasks)) {
            if (Array.isArray(items)) {
              const key = `tasks_${hostname}`;
              const existing = currentData[key] || [];
              const existingIds = new Set(existing.map(i => i.id));
              const merged = [...existing];

              items.forEach(item => {
                if (!existingIds.has(item.id)) {
                  merged.push(item);
                  existingIds.add(item.id);
                }
              });
              merged.sort((a, b) => (b.id || 0) - (a.id || 0));
              newData[key] = merged;
            }
          }
        }

        chrome.storage.local.set(newData, () => {
          alert('Import completed successfully!');
          loadData();
        });
      });
    } catch (err) {
      alert('Error importing data: ' + err.message);
    }
  };

  reader.readAsText(file);
  event.target.value = '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

