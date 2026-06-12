/* ============================================================
   The Idea Jacker — front-end logic
   Streaming reveal · brand management · light-mode design
   ============================================================ */

import { DEFAULT_BRANDS } from './default-brands.js';

const PASSWORD = 'PicPR2026';
const STORAGE_KEY = 'ij_brands';      // namespaced separately from News Jacker's "nj_clients"

// The suite's shared roster lives in the Forward Planner's store —
// one list for every tool, every team member, every device
const PLANNER_URL = 'https://pic-pr-forward-planner.netlify.app';
const ROSTER_API = PLANNER_URL + '/api/data?store=clients';
const SHORTLIST_KEY = 'ij_shortlist';
const MAX_ACTIVE_BRANDS = 5;
const $ = (sel) => document.querySelector(sel);

// ============================================================
// Shortlist state — saved ideas persist in localStorage
// ============================================================

// As ideas render, we stash their full data here keyed by a content id,
// so the save button can look the idea up when clicked.
const renderedIdeaData = {};

function ideaId(idea) {
  // A stable id derived from the idea's content, so the same idea gets the
  // same id across runs (lets us show the correct star state).
  const str = (idea.concept || '') + '|' + (idea.headline || '');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return 'idea_' + Math.abs(h).toString(36);
}

function loadShortlist() {
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}
function persistShortlist() {
  try { localStorage.setItem(SHORTLIST_KEY, JSON.stringify(shortlist)); } catch (e) {}
}
function isShortlisted(id) {
  return shortlist.some(i => i.id === id);
}
function toggleShortlist(id) {
  const idx = shortlist.findIndex(i => i.id === id);
  if (idx >= 0) {
    shortlist.splice(idx, 1);
  } else {
    const data = renderedIdeaData[id];
    if (data) shortlist.push({ ...data, id, savedAt: new Date().toISOString() });
  }
  persistShortlist();
  updateShortlistCount();
}

let shortlist = loadShortlist();

function updateShortlistCount() {
  const el = $('#shortlist-count');
  if (el) el.textContent = shortlist.length;
}

// ============================================================
// Header date
// ============================================================
function setHeaderDate() {
  const el = $('#header-date');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
setHeaderDate();

// ============================================================
// Password gate
// ============================================================
function checkPassword() {
  const input = $('#password-input').value;
  const error = $('#password-error');
  if (input === PASSWORD) {
    $('#password-gate').classList.add('hidden');
    $('#app').classList.remove('hidden');
    sessionStorage.setItem('unlocked', 'yes');
    initApp();
  } else {
    error.textContent = 'Incorrect password. Try again.';
    $('#password-input').value = '';
  }
}
$('#password-submit').addEventListener('click', checkPassword);
$('#password-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkPassword();
});

// ============================================================
// Brand state — loaded from localStorage, falls back to defaults
// ============================================================
function loadBrands() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // Deep clone the defaults so we don't mutate the imported array
  return JSON.parse(JSON.stringify(DEFAULT_BRANDS));
}

function saveBrands() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brands));
  } catch (e) {
    console.warn('Could not save brands to localStorage:', e);
  }
}

let brands = loadBrands();
let editIdx = -1;  // index of brand being edited, -1 for "add new"

// ============================================================
// Init — runs after the password gate is cleared
// ============================================================
function initApp() {
  renderBrandChips();
  updateShortlistCount();
  refreshSharedRoster();
}

// ============================================================
// Shared roster — fetched from the Forward Planner so the whole
// suite works from one client list. The ⭐ sector presets stay
// local to this tool; selections survive each refresh; the last
// good copy is cached so the tool still works if the fetch fails.
// ============================================================
async function refreshSharedRoster() {
  try {
    const res = await fetch(ROSTER_API, { headers: { 'x-password': PASSWORD } });
    if (!res.ok) return;
    const shared = await res.json();
    if (!Array.isArray(shared) || shared.length === 0) return;
    const selected = new Set(brands.filter(b => b.active).map(b => b.name));
    const presets = brands.filter(b => b.name.trim().startsWith('⭐'));
    const mapped = shared
      .filter(c => c.active !== false)
      .map(c => ({
        name: c.name,
        industry: c.industry || '',
        location: c.location || '',
        website: c.website || '',
        description: c.description || '',
        topics: c.topics || '',
        tone: c.tone || '',
        budget: c.budget || '',
        noGo: c.avoid || '',
        briefing: c.briefing || '',
        active: selected.has(c.name)
      }));
    brands = [...presets, ...mapped];
    saveBrands();
    renderBrandChips();
  } catch (e) {
    console.warn('Shared roster fetch failed — using cached list:', e);
  }
}

// ============================================================
// Brand chip rendering — grouped by sector, active first, searchable
// ============================================================

let brandSearchQuery = '';

function renderBrandChips() {
  const container = $('#brand-chips');
  if (!container) return;
  container.innerHTML = '';

  // 1. Filter by search query (matches name, industry, or topics)
  const q = brandSearchQuery.toLowerCase().trim();
  const filtered = brands
    .map((brand, idx) => ({ brand, idx }))  // preserve original index for editing
    .filter(({ brand }) => {
      if (!q) return true;
      const haystack = `${brand.name} ${brand.industry || ''} ${brand.topics || ''}`.toLowerCase();
      return haystack.includes(q);
    });

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'brand-empty-msg';
    empty.textContent = q
      ? `No brands match "${brandSearchQuery}".`
      : 'No brands yet. Click "+ Add brand" to start.';
    container.appendChild(empty);
  } else {
    // 2. Separate active brands (which go at the top)
    const activeBrands = filtered.filter(({ brand }) => brand.active);
    const inactiveBrands = filtered.filter(({ brand }) => !brand.active);

    // 3. Render "Selected" group if any are active
    if (activeBrands.length > 0) {
      container.appendChild(renderGroup(
        `Selected (${activeBrands.length}/${MAX_ACTIVE_BRANDS})`,
        activeBrands,
        'group-active'
      ));
    }

    // 4. Group the inactive ones by industry, sort group names alphabetically
    const byIndustry = {};
    inactiveBrands.forEach(item => {
      const key = (item.brand.industry || 'Other').trim() || 'Other';
      if (!byIndustry[key]) byIndustry[key] = [];
      byIndustry[key].push(item);
    });

    const industryOrder = Object.keys(byIndustry).sort((a, b) => {
      // Push "Other" to the bottom
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });

    industryOrder.forEach(industry => {
      // Sort each group alphabetically by name within (sector archetypes
      // start with ⭐ so they naturally float to the top)
      const items = byIndustry[industry].sort((a, b) => a.brand.name.localeCompare(b.brand.name));
      container.appendChild(renderGroup(industry, items));
    });
  }

  // 5. The "+ Add brand" chip sits in its own row at the very bottom
  const addRow = document.createElement('div');
  addRow.className = 'brand-chip-group brand-chip-group-add';
  const addChip = document.createElement('button');
  addChip.className = 'brand-chip-add';
  addChip.textContent = '+ Add brand';
  addChip.id = 'add-brand-chip';
  addRow.appendChild(addChip);
  container.appendChild(addRow);
}

/**
 * Render a labelled group of brand chips.
 */
function renderGroup(label, items, extraClass = '') {
  const group = document.createElement('div');
  group.className = 'brand-chip-group ' + extraClass;

  const heading = document.createElement('div');
  heading.className = 'brand-chip-group-label';
  heading.textContent = label;
  group.appendChild(heading);

  const row = document.createElement('div');
  row.className = 'brand-chips';
  items.forEach(({ brand, idx }) => {
    row.appendChild(buildBrandChip(brand, idx));
  });
  group.appendChild(row);

  return group;
}

/**
 * Build a single brand chip element (active state, edit, delete).
 */
function buildBrandChip(brand, idx) {
  const chip = document.createElement('span');
  chip.className = 'brand-chip' + (brand.active ? ' active' : '');
  chip.dataset.index = idx;

  const name = document.createElement('span');
  name.className = 'brand-chip-name';
  name.textContent = brand.name;
  chip.appendChild(name);

  const editBtn = document.createElement('button');
  editBtn.className = 'brand-chip-edit';
  editBtn.dataset.action = 'edit';
  editBtn.dataset.index = idx;
  editBtn.title = 'Edit brand';
  editBtn.innerHTML = '✎';
  chip.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'brand-chip-delete';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.dataset.index = idx;
  deleteBtn.title = 'Delete brand';
  deleteBtn.innerHTML = '×';
  chip.appendChild(deleteBtn);

  return chip;
}

function activeBrandCount() {
  return brands.filter(b => b.active).length;
}

// Wire up the search box — re-render on every keystroke
document.addEventListener('input', (e) => {
  if (e.target.id === 'brand-search') {
    brandSearchQuery = e.target.value;
    renderBrandChips();
  }
});

// ============================================================
// Brand chip event delegation — toggle, edit, delete, add
// ============================================================
document.addEventListener('click', (e) => {
  // "+ Add brand" chip OR the header "Add a brand" button
  if (e.target.id === 'manage-clients-btn') {
    window.open(PLANNER_URL + '/?k=' + encodeURIComponent(PASSWORD) + '#clients', '_blank');
    return;
  }
  if (e.target.id === 'add-brand-chip') {
    openBrandModal(-1);
    return;
  }

  // Delete button on a chip
  if (e.target.matches('.brand-chip-delete')) {
    e.stopPropagation();
    const idx = parseInt(e.target.dataset.index);
    if (confirm(`Delete "${brands[idx].name}"? This can't be undone.`)) {
      brands.splice(idx, 1);
      saveBrands();
      renderBrandChips();
    }
    return;
  }

  // Edit button on a chip
  if (e.target.matches('.brand-chip-edit')) {
    e.stopPropagation();
    const idx = parseInt(e.target.dataset.index);
    openBrandModal(idx);
    return;
  }

  // Click on the chip body (or the name inside) — toggle active
  const chip = e.target.closest('.brand-chip');
  if (chip && !e.target.matches('.brand-chip-edit, .brand-chip-delete')) {
    const idx = parseInt(chip.dataset.index);
    const brand = brands[idx];
    if (!brand.active && activeBrandCount() >= MAX_ACTIVE_BRANDS) {
      showStatusError(`Maximum ${MAX_ACTIVE_BRANDS} brands per scan. Deselect one first.`);
      return;
    }
    brand.active = !brand.active;
    saveBrands();
    chip.classList.toggle('active');
    return;
  }
});

function showStatusError(msg) {
  const status = $('#status');
  status.classList.remove('hidden');
  status.classList.remove('status-loading');
  status.textContent = msg;
  setTimeout(() => {
    if (status.textContent === msg) status.classList.add('hidden');
  }, 4000);
}

// ============================================================
// Brand modal — open / close / save / delete
// ============================================================
function openBrandModal(idx) {
  editIdx = idx;
  const isEdit = idx >= 0;
  $('#brand-modal-title').textContent = isEdit ? 'Edit brand' : 'Add a brand';
  $('#brand-modal-desc').textContent = isEdit
    ? 'Update or delete this brand.'
    : 'Add a new brand to match against creative ideas.';
  $('#brand-save').textContent = isEdit ? 'Save changes' : 'Add brand';

  // Show/hide the delete button (and reset link — only on Add, not Edit)
  $('#brand-delete').classList.toggle('hidden', !isEdit);
  const resetLink = $('#modal-footer-actions');
  if (resetLink) resetLink.classList.toggle('hidden', isEdit);

  // Populate the form
  if (isEdit) {
    const b = brands[idx];
    $('#brand-name').value = b.name || '';
    $('#brand-industry').value = b.industry || '';
    $('#brand-location').value = b.location || '';
    $('#brand-website').value = b.website || '';
    $('#brand-description').value = b.description || '';
    $('#brand-topics').value = b.topics || '';
    $('#brand-tone').value = b.tone || '';
    $('#brand-budget').value = b.budget || '';
    $('#brand-nogo').value = b.noGo || '';
    $('#brand-briefing').value = b.briefing || '';
  } else {
    ['brand-name', 'brand-industry', 'brand-location', 'brand-website', 'brand-description',
     'brand-topics', 'brand-tone', 'brand-budget', 'brand-nogo', 'brand-briefing']
      .forEach(id => { const el = $('#' + id); if (el) el.value = ''; });
  }

  $('#brand-modal').classList.remove('hidden');
  setTimeout(() => $('#brand-name').focus(), 50);
}

function closeBrandModal() {
  $('#brand-modal').classList.add('hidden');
  editIdx = -1;
}

$('#brand-cancel').addEventListener('click', closeBrandModal);

$('#brand-save').addEventListener('click', () => {
  const name = $('#brand-name').value.trim();
  if (!name) {
    $('#brand-name').focus();
    $('#brand-name').style.borderColor = 'var(--high)';
    return;
  }
  $('#brand-name').style.borderColor = '';

  const brand = {
    name,
    industry: $('#brand-industry').value.trim(),
    location: $('#brand-location').value.trim(),
    website: $('#brand-website').value.trim(),
    description: $('#brand-description').value.trim(),
    topics: $('#brand-topics').value.trim(),
    tone: $('#brand-tone').value.trim(),
    budget: $('#brand-budget').value.trim(),
    noGo: $('#brand-nogo').value.trim(),
    briefing: $('#brand-briefing').value.trim(),
    active: editIdx >= 0 ? brands[editIdx].active : false
  };

  if (editIdx >= 0) {
    brands[editIdx] = brand;
  } else {
    brands.push(brand);
  }
  saveBrands();
  renderBrandChips();
  closeBrandModal();
});

$('#brand-delete').addEventListener('click', () => {
  if (editIdx < 0) return;
  if (confirm(`Delete "${brands[editIdx].name}"? This can't be undone.`)) {
    brands.splice(editIdx, 1);
    saveBrands();
    renderBrandChips();
    closeBrandModal();
  }
});

// "Reset to defaults" — wipes localStorage and pulls in the full Pic PR starter list
$('#brand-reset-all').addEventListener('click', () => {
  const msg = `This will replace your entire brand list with the Pic PR defaults (${DEFAULT_BRANDS.length} brands).\n\n` +
    `Any brands you've added or edited will be lost. This can't be undone.\n\n` +
    `Continue?`;
  if (!confirm(msg)) return;

  // Second confirmation, because nuking the list is genuinely destructive
  if (!confirm('Last chance. Really reset the whole list?')) return;

  brands = JSON.parse(JSON.stringify(DEFAULT_BRANDS));
  saveBrands();
  renderBrandChips();
  closeBrandModal();
});

// Close modal on Escape key, or on background click
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#brand-modal').classList.contains('hidden')) {
    closeBrandModal();
  }
});
$('#brand-modal').addEventListener('click', (e) => {
  if (e.target.id === 'brand-modal') closeBrandModal();
});

// ============================================================
// Tolerant JSON parsing for streaming
// (Same as before — closes unclosed braces/strings so partial
// JSON can be parsed mid-stream)
// ============================================================
function parsePartialJson(text) {
  if (!text) return null;
  let buf = text.trim();
  if (buf.startsWith('```json')) buf = buf.slice(7);
  if (buf.startsWith('```')) buf = buf.slice(3);
  if (buf.endsWith('```')) buf = buf.slice(0, -3);
  buf = buf.trim();

  let inString = false;
  let escape = false;
  let braces = 0, brackets = 0;
  for (let i = 0; i < buf.length; i++) {
    const ch = buf[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  if (inString) {
    const lastQuote = buf.lastIndexOf('"');
    if (lastQuote > 0) buf = buf.slice(0, lastQuote + 1);
  }
  buf = buf.replace(/,\s*$/, '');

  let closer = '';
  for (let i = 0; i < brackets; i++) closer += ']';
  for (let i = 0; i < braces; i++) closer += '}';
  buf += closer;

  try { return JSON.parse(buf); } catch { return null; }
}

// ============================================================
// Run button — streams from /api/stream-ideas, reveals cards
// ============================================================
$('#run-btn').addEventListener('click', async () => {
  const status = $('#status');
  const results = $('#results');
  const button = $('#run-btn');

  const activeBrands = brands.filter(b => b.active);
  // No hard requirement — "general mode" runs with zero brands.

  button.disabled = true;
  status.classList.remove('hidden');
  status.classList.add('status-loading');
  status.textContent = activeBrands.length
    ? `Starting… (${activeBrands.length} brand${activeBrands.length === 1 ? '' : 's'} selected)`
    : 'Starting… (general mode — no brands selected)';
  results.innerHTML = '';

  // Streaming status block
  const streamStatus = document.createElement('div');
  streamStatus.className = 'stream-status';
  streamStatus.innerHTML = `
    <div class="stream-status-title" id="stream-title">Reading the news…</div>
    <div class="stream-status-sub" id="stream-sub">Scanning UK feeds for cultural patterns.</div>
    <div class="stream-progress-bar"></div>
  `;
  results.appendChild(streamStatus);

  let fullText = '';
  const renderedThemes = [];
  const renderedIdeas = [];
  let totalRendered = 0;
  currentSourcesMap = {};   // reset the evidence lookup for this run

  try {
    const response = await fetch('/api/stream-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-password': PASSWORD },
      body: JSON.stringify({ brands: activeBrands })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errText.slice(0, 200)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          handleStreamMessage(msg);
        } catch (err) {
          console.warn('Bad stream message:', line);
        }
      }
    }
  } catch (err) {
    status.textContent = 'Something went wrong: ' + err.message;
    status.classList.remove('status-loading');
  } finally {
    button.disabled = false;
  }

  function handleStreamMessage(msg) {
    if (msg.type === 'status') {
      const titleEl = $('#stream-title');
      if (titleEl) titleEl.textContent = msg.message;
    }
    else if (msg.type === 'newsDone') {
      if (msg.sources) currentSourcesMap = msg.sources;
      const sourcesEl = $('#sources-count');
      if (sourcesEl) sourcesEl.textContent = `${msg.totalStories || 0} stories scanned`;
      const titleEl = $('#stream-title');
      const subEl = $('#stream-sub');
      if (titleEl) titleEl.textContent = 'Pitching to the imaginary creative review…';
      if (subEl) subEl.textContent = `${msg.totalStories} stories in ${msg.seconds}s. Cards will appear below as Claude writes them.`;
    }
    else if (msg.type === 'delta') {
      fullText += msg.text;
      tryReveal();
    }
    else if (msg.type === 'done') {
      const streamEl = $('.stream-status');
      if (streamEl) streamEl.remove();
      status.classList.remove('status-loading');

      if (msg.parseError && totalRendered === 0) {
        results.innerHTML = `<div class="error-block">
          <h3>Claude returned text that couldn't be parsed</h3>
          <p>The prompt probably needs tweaking. Raw response below.</p>
          <pre>${escapeHtml(msg.rawText || '')}</pre>
        </div>`;
        status.textContent = 'Parse error.';
        return;
      }
      if (msg.themes && Array.isArray(msg.themes)) {
        renderAllThemes(msg.themes);
      }
      const themes = msg.themes || [];
      const ideaCount = themes.reduce((s, t) => s + (t.ideas?.length || 0), 0);
      const brandSuffix = activeBrands.length ? ` for ${activeBrands.map(b => b.name).join(', ')}` : '';
      status.textContent = `Done. ${themes.length} themes · ${ideaCount} ideas${brandSuffix}.`;
    }
    else if (msg.type === 'error') {
      status.textContent = 'Server error: ' + msg.message;
      status.classList.remove('status-loading');
    }
  }

  function tryReveal() {
    const parsed = parsePartialJson(fullText);
    if (!parsed || !parsed.themes || !Array.isArray(parsed.themes)) return;

    if (parsed.themes.length > 0 && totalRendered === 0) {
      const streamEl = $('.stream-status');
      if (streamEl) streamEl.remove();
    }

    parsed.themes.forEach((theme, themeIdx) => {
      if (!theme || !theme.name || !theme.summary) return;

      if (!renderedThemes[themeIdx]) {
        const node = document.createElement('section');
        node.className = 'theme-block';
        node.innerHTML = renderThemeShell(theme, themeIdx);
        results.appendChild(node);
        renderedThemes[themeIdx] = node;
        renderedIdeas[themeIdx] = [];
        totalRendered++;
      }

      const ideas = theme.ideas || [];
      const ideasGrid = renderedThemes[themeIdx].querySelector('.ideas-grid');

      ideas.forEach((idea, ideaIdx) => {
        if (!idea || !idea.concept || !idea.headline) return;
        if (renderedIdeas[themeIdx][ideaIdx]) return;

        const card = document.createElement('article');
        card.className = 'idea-card';
        card.innerHTML = renderIdeaBody(idea, theme);
        ideasGrid.appendChild(card);
        renderedIdeas[themeIdx][ideaIdx] = card;
        totalRendered++;
      });
    });
  }

  function renderAllThemes(themes) {
    themes.forEach((theme, themeIdx) => {
      if (!renderedThemes[themeIdx]) {
        const node = document.createElement('section');
        node.className = 'theme-block';
        node.innerHTML = renderThemeShell(theme, themeIdx);
        results.appendChild(node);
        renderedThemes[themeIdx] = node;
        renderedIdeas[themeIdx] = [];
      } else {
        // Theme already on screen from streaming — refresh its evidence block
        // now that we have the complete, correctly-parsed evidence IDs.
        refreshThemeEvidence(renderedThemes[themeIdx], theme);
      }
      const ideasGrid = renderedThemes[themeIdx].querySelector('.ideas-grid');
      (theme.ideas || []).forEach((idea, ideaIdx) => {
        if (renderedIdeas[themeIdx][ideaIdx]) return;
        const card = document.createElement('article');
        card.className = 'idea-card';
        card.innerHTML = renderIdeaBody(idea, theme);
        ideasGrid.appendChild(card);
        renderedIdeas[themeIdx][ideaIdx] = card;
      });
    });
  }
});

// Replace a rendered theme's evidence <details> with a freshly-resolved one
function refreshThemeEvidence(node, theme) {
  if (!node) return;
  const evidenceItems = (theme.evidence || []).filter(e => e !== null && e !== undefined && e !== '');
  if (evidenceItems.length === 0) return;
  const existing = node.querySelector('.theme-evidence');
  const html = `<summary>Evidence from the news (${evidenceItems.length})</summary>
    <ul>${evidenceItems.map(renderEvidenceItem).join('')}</ul>`;
  if (existing) {
    const wasOpen = existing.open;
    existing.innerHTML = html;
    existing.open = wasOpen;
  }
}

// ============================================================
// Shortlist — save buttons, modal, export
// ============================================================

// Save/unsave when a star button is clicked (event delegation)
document.addEventListener('click', (e) => {
  const saveBtn = e.target.closest('.idea-save-btn');
  if (saveBtn) {
    const id = saveBtn.dataset.ideaId;
    toggleShortlist(id);
    const saved = isShortlisted(id);
    saveBtn.classList.toggle('active', saved);
    const star = saveBtn.querySelector('.star-icon');
    if (star) star.textContent = saved ? '★' : '☆';
    return;
  }

  // Open the shortlist panel
  if (e.target.id === 'shortlist-btn' || e.target.closest('#shortlist-btn')) {
    openShortlistModal();
    return;
  }
  if (e.target.id === 'shortlist-close') {
    $('#shortlist-modal').classList.add('hidden');
    return;
  }
  if (e.target.id === 'shortlist-modal') {
    $('#shortlist-modal').classList.add('hidden');
    return;
  }

  // Remove a single idea from inside the shortlist panel
  const removeBtn = e.target.closest('.shortlist-remove');
  if (removeBtn) {
    const id = removeBtn.dataset.ideaId;
    const idx = shortlist.findIndex(i => i.id === id);
    if (idx >= 0) {
      shortlist.splice(idx, 1);
      persistShortlist();
      updateShortlistCount();
      renderShortlistItems();
      // Also un-star the matching card if it's on screen
      const card = document.querySelector(`.idea-save-btn[data-idea-id="${id}"]`);
      if (card) {
        card.classList.remove('active');
        const star = card.querySelector('.star-icon');
        if (star) star.textContent = '☆';
      }
    }
    return;
  }
});

function openShortlistModal() {
  renderShortlistItems();
  $('#shortlist-modal').classList.remove('hidden');
}

function renderShortlistItems() {
  const container = $('#shortlist-items');
  const exportActions = $('#shortlist-export-actions');
  if (!container) return;

  if (shortlist.length === 0) {
    container.innerHTML = '<div class="shortlist-empty">No saved ideas yet. Tap the ☆ on any idea to save it here.</div>';
    if (exportActions) exportActions.style.display = 'none';
    return;
  }
  if (exportActions) exportActions.style.display = '';

  // Most recently saved first
  const items = [...shortlist].reverse();
  container.innerHTML = items.map(idea => `
    <article class="shortlist-item">
      <div class="shortlist-item-top">
        <span class="budget-chip ${budgetTierClass(idea.budgetTier)}">${escapeHtml(idea.budgetTier || 'Unspecified')}</span>
        <button class="shortlist-remove" data-idea-id="${idea.id}" title="Remove from shortlist" aria-label="Remove">×</button>
      </div>
      <div class="shortlist-item-concept">${escapeHtml(idea.concept || '')}</div>
      <div class="shortlist-item-headline">"${escapeHtml(idea.headline || '')}"</div>
      <div class="shortlist-item-meta">
        ${idea.format ? `<span>${escapeHtml(idea.format)}</span>` : ''}
        ${idea.brandFit ? `<span>· ${escapeHtml(idea.brandFit)}</span>` : ''}
        ${idea.themeName ? `<span>· ${escapeHtml(idea.themeName)}</span>` : ''}
      </div>
      <button class="idea-develop-btn shortlist-develop" data-idea-id="${idea.id}">Develop this idea →</button>
    </article>
  `).join('');
}

function buildExportText() {
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let out = `THE IDEA JACKER — SHORTLIST\nExported ${date}\n${shortlist.length} idea${shortlist.length === 1 ? '' : 's'}\n\n`;
  out += '='.repeat(60) + '\n\n';
  shortlist.forEach((idea, i) => {
    out += `${i + 1}. ${idea.concept}\n\n`;
    out += `   Headline: "${idea.headline}"\n`;
    out += `   Budget tier: ${idea.budgetTier || '—'}\n`;
    out += `   Format: ${idea.format || '—'}\n`;
    if (idea.whyItWorks) out += `   Why it works: ${idea.whyItWorks}\n`;
    if (idea.prAngle) out += `   PR angle: ${idea.prAngle}\n`;
    if (idea.trend) out += `   Trend it rides: ${idea.trend}\n`;
    if (idea.brandFit) out += `   Brand fit: ${idea.brandFit}\n`;
    if (idea.themeName) out += `   Cultural theme: ${idea.themeName}\n`;
    out += `\n` + '-'.repeat(60) + '\n\n';
  });
  return out;
}

// Copy all
document.addEventListener('click', async (e) => {
  if (e.target.id === 'shortlist-copy') {
    try {
      await navigator.clipboard.writeText(buildExportText());
      e.target.textContent = 'Copied ✓';
      setTimeout(() => { e.target.textContent = 'Copy all'; }, 1800);
    } catch (err) {
      e.target.textContent = 'Copy failed';
      setTimeout(() => { e.target.textContent = 'Copy all'; }, 1800);
    }
  }

  // Download as text file
  if (e.target.id === 'shortlist-download') {
    const text = buildExportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idea-jacker-shortlist-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear the whole shortlist
  if (e.target.id === 'shortlist-clear') {
    if (shortlist.length === 0) return;
    if (!confirm(`Clear all ${shortlist.length} saved ideas? This can't be undone.`)) return;
    shortlist = [];
    persistShortlist();
    updateShortlistCount();
    renderShortlistItems();
    // Un-star any visible cards
    document.querySelectorAll('.idea-save-btn.active').forEach(btn => {
      btn.classList.remove('active');
      const star = btn.querySelector('.star-icon');
      if (star) star.textContent = '☆';
    });
  }
});

// Close shortlist modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#shortlist-modal').classList.contains('hidden')) {
    $('#shortlist-modal').classList.add('hidden');
  }
});

// ============================================================
// "Develop this idea" — expands one idea into a working brief
// ============================================================

document.addEventListener('click', (e) => {
  const devBtn = e.target.closest('.idea-develop-btn');
  if (devBtn) {
    const id = devBtn.dataset.ideaId;
    // Look the idea up: first in the rendered cards, then in the shortlist
    const idea = renderedIdeaData[id] || shortlist.find(i => i.id === id);
    if (idea) developIdea(idea);
    return;
  }
  if (e.target.id === 'develop-close' || e.target.id === 'develop-modal') {
    $('#develop-modal').classList.add('hidden');
    return;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#develop-modal').classList.contains('hidden')) {
    $('#develop-modal').classList.add('hidden');
  }
});

async function developIdea(idea, rework) {
  currentDevelopIdea = idea;

  // A fresh develop (no rework) starts a new version history.
  // A rework keeps the existing history and appends to it.
  if (!rework) {
    versionHistory = [];
    versionIndex = -1;
    pendingSteer = null;
  } else {
    pendingSteer = rework.steer && rework.steer.trim() ? rework.steer.trim() : null;
  }

  const modal = $('#develop-modal');
  const body = $('#develop-body');
  const titleEl = $('#develop-title');

  // Find the active brand (if exactly one is selected, pass it for context)
  const activeBrands = brands.filter(b => b.active);
  const brand = activeBrands.length === 1 ? activeBrands[0] : null;

  titleEl.textContent = rework ? 'Reworking…' : 'Developing…';
  body.innerHTML = `
    <div class="develop-loading">
      <div class="develop-concept-echo">${escapeHtml(idea.concept || '')}</div>
      <div class="stream-progress-bar"></div>
      <div class="develop-loading-msg">${rework ? 'Taking a fresh angle…' : 'Working up the mechanics, assets, timeline, and risks…'}</div>
    </div>`;
  modal.classList.remove('hidden');

  let fullText = '';

  try {
    const response = await fetch('/api/develop-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-password': PASSWORD },
      body: JSON.stringify({ idea, brand, rework })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errText.slice(0, 200)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          handleDevelopMessage(msg, idea);
        } catch (err) { /* partial line, ignore */ }
      }
    }
  } catch (err) {
    body.innerHTML = `<div class="error-block"><h3>Couldn't develop this idea</h3><p>${escapeHtml(err.message)}</p></div>`;
  }

  function handleDevelopMessage(msg, idea) {
    if (msg.type === 'delta') {
      fullText += msg.text;
      // Try to render progressively as the brief takes shape
      const partial = parsePartialJson(fullText);
      if (partial && partial.title) {
        renderBrief(partial, idea, false);
      }
    } else if (msg.type === 'done') {
      // Prefer the server's parsed brief; if that failed, fall back to our own
      // tolerant parse of the accumulated text so the complete view still renders.
      let finalBrief = msg.brief;
      if (!finalBrief) {
        finalBrief = parsePartialJson(fullText);
      }
      if (finalBrief && finalBrief.title) {
        renderBrief(finalBrief, idea, true);
      } else {
        body.innerHTML = `<div class="error-block">
          <h3>Couldn't parse the developed brief</h3>
          <p>Here's the raw text — you can still copy what's useful.</p>
          <pre>${escapeHtml(msg.rawText || fullText || '')}</pre>
        </div>`;
      }
    } else if (msg.type === 'error') {
      body.innerHTML = `<div class="error-block"><h3>Server error</h3><p>${escapeHtml(msg.message)}</p></div>`;
    }
  }

  function renderBrief(brief, idea, complete) {
    // While streaming (not complete), just show the partial brief with no chrome
    if (!complete) {
      titleEl.textContent = brief.title || 'Developing…';
      body.innerHTML = briefSectionsHtml(brief);
      return;
    }

    // On complete, record this version into history and render with navigator
    const version = {
      brief,
      text: buildBriefText(brief, idea),
      steer: pendingSteer || null
    };
    pendingSteer = null;

    // If we're viewing an older version and generate a new one, drop the "redo" tail
    if (versionIndex < versionHistory.length - 1) {
      versionHistory = versionHistory.slice(0, versionIndex + 1);
    }
    versionHistory.push(version);
    versionIndex = versionHistory.length - 1;

    showVersion(versionIndex, idea);
  }

  // Render a specific version from history (used by complete + the nav arrows)
  function showVersion(idx, idea) {
    versionIndex = idx;
    const version = versionHistory[idx];
    const brief = version.brief;
    titleEl.textContent = brief.title || 'Developed brief';

    const total = versionHistory.length;
    const navHtml = total > 1 ? `
      <div class="version-nav">
        <button type="button" class="version-arrow" id="version-prev" ${idx === 0 ? 'disabled' : ''} title="Previous version">‹</button>
        <span class="version-label">Version ${idx + 1} of ${total}${version.steer ? ` · "${escapeHtml(version.steer)}"` : ''}</span>
        <button type="button" class="version-arrow" id="version-next" ${idx === total - 1 ? 'disabled' : ''} title="Next version">›</button>
      </div>` : '';

    body.innerHTML = `
      ${navHtml}
      ${briefSectionsHtml(brief)}
      <div class="develop-actions">
        <button type="button" id="develop-copy" class="secondary-btn">Copy brief</button>
      </div>
      <div class="rework-box">
        <div class="rework-label">Want a different take? Tell it what to change.</div>
        <textarea id="rework-steer" class="rework-steer" rows="2" placeholder="e.g. 'make it cheaper', 'lean into the humour', 'what if it were a stunt not a study?' — or leave blank for a fresh angle."></textarea>
        <button type="button" id="rework-btn" class="secondary-btn rework-btn">↻ Rework</button>
      </div>
    `;

    // Keep the copy button + rework wired to THIS version
    lastDevelopedBriefText = version.text;
    lastDevelopedTitle = brief.title || '';
  }

  // Expose showVersion to the outer handlers via the shared refs
  developViewRefs = { showVersion, idea };

  function briefSectionsHtml(brief) {
    const list = (arr) => (arr || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
    return `
      ${brief.summary ? `<p class="develop-summary">${escapeHtml(brief.summary)}</p>` : ''}
      ${brief.mechanics ? `<div class="develop-section">
        <h4>How it works</h4>
        <ol class="develop-list">${list(brief.mechanics)}</ol>
      </div>` : ''}
      ${brief.assets ? `<div class="develop-section">
        <h4>What you'd need</h4>
        <ul class="develop-list">${list(brief.assets)}</ul>
      </div>` : ''}
      ${brief.timeline ? `<div class="develop-section">
        <h4>Timeline</h4>
        <p>${escapeHtml(brief.timeline)}</p>
      </div>` : ''}
      ${brief.earnedAngle ? `<div class="develop-section">
        <h4>How it earns coverage</h4>
        <p>${escapeHtml(brief.earnedAngle)}</p>
      </div>` : ''}
      ${brief.samplePitch ? `<div class="develop-section develop-pitch">
        <h4>Sample pitch</h4>
        <p>${escapeHtml(brief.samplePitch)}</p>
      </div>` : ''}
      ${brief.risks ? `<div class="develop-section">
        <h4>Risks & considerations</h4>
        <ul class="develop-list">${list(brief.risks)}</ul>
      </div>` : ''}
      ${brief.budgetNote ? `<div class="develop-section">
        <h4>Budget note</h4>
        <p>${escapeHtml(brief.budgetNote)}</p>
      </div>` : ''}
    `;
  }
}

// Context for develop + rework + version history
let lastDevelopedBriefText = '';
let lastDevelopedTitle = '';
let currentDevelopIdea = null;
let versionHistory = [];      // completed briefs for the current idea
let versionIndex = -1;        // which version is on screen
let pendingSteer = null;      // steer text used for the in-flight rework
let developViewRefs = null;   // { showVersion, idea } for the current modal

function buildBriefText(brief, idea) {
  let out = `${brief.title || 'DEVELOPED BRIEF'}\n${'='.repeat(50)}\n\n`;
  if (idea && idea.concept) out += `Original concept: ${idea.concept}\n\n`;
  if (brief.summary) out += `${brief.summary}\n\n`;
  if (brief.mechanics) out += `HOW IT WORKS\n${brief.mechanics.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n`;
  if (brief.assets) out += `WHAT YOU'D NEED\n${brief.assets.map(a => `- ${a}`).join('\n')}\n\n`;
  if (brief.timeline) out += `TIMELINE\n${brief.timeline}\n\n`;
  if (brief.earnedAngle) out += `HOW IT EARNS COVERAGE\n${brief.earnedAngle}\n\n`;
  if (brief.samplePitch) out += `SAMPLE PITCH\n${brief.samplePitch}\n\n`;
  if (brief.risks) out += `RISKS & CONSIDERATIONS\n${brief.risks.map(r => `- ${r}`).join('\n')}\n\n`;
  if (brief.budgetNote) out += `BUDGET NOTE\n${brief.budgetNote}\n`;
  return out;
}

// Copy the developed brief, rework, and version navigation
document.addEventListener('click', async (e) => {
  if (e.target.id === 'develop-copy') {
    try {
      await navigator.clipboard.writeText(lastDevelopedBriefText);
      e.target.textContent = 'Copied ✓';
      setTimeout(() => { e.target.textContent = 'Copy brief'; }, 1800);
    } catch (err) {
      e.target.textContent = 'Copy failed';
      setTimeout(() => { e.target.textContent = 'Copy brief'; }, 1800);
    }
    return;
  }

  // Rework the current idea — with optional steer
  if (e.target.id === 'rework-btn') {
    if (!currentDevelopIdea) return;
    const steerEl = $('#rework-steer');
    const steer = steerEl ? steerEl.value : '';
    developIdea(currentDevelopIdea, {
      steer,
      previousTitle: lastDevelopedTitle
    });
    return;
  }

  // Version navigation — undo (prev) / redo (next)
  if (e.target.id === 'version-prev') {
    if (developViewRefs && versionIndex > 0) {
      developViewRefs.showVersion(versionIndex - 1, developViewRefs.idea);
    }
    return;
  }
  if (e.target.id === 'version-next') {
    if (developViewRefs && versionIndex < versionHistory.length - 1) {
      developViewRefs.showVersion(versionIndex + 1, developViewRefs.idea);
    }
    return;
  }
});

// ============================================================
// Rendering helpers
// ============================================================

// Lookup of headline id -> { title, url, source } for the current run,
// used to turn theme evidence citations into clickable links.
let currentSourcesMap = {};

function renderEvidenceItem(e) {
  // Evidence may be a numeric id (new format) or a plain string (fallback).
  const entry = currentSourcesMap[e];
  if (entry && entry.title) {
    const label = `${escapeHtml(entry.title)} <span class="evidence-source">— ${escapeHtml(entry.source || '')}</span>`;
    if (entry.url) {
      return `<li><a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener" class="evidence-link">${label}</a></li>`;
    }
    return `<li>${label}</li>`;
  }
  // Fallback: if it's not a known id, just show whatever we got as text
  return `<li>${escapeHtml(typeof e === 'string' ? e : '')}</li>`;
}

function renderThemeShell(theme, idx) {
  const lensClass = lensClassFor(theme.lens);
  const evidenceItems = (theme.evidence || []).filter(e => e !== null && e !== undefined && e !== '');
  const evidence = evidenceItems.map(renderEvidenceItem).join('');
  return `
    <div class="theme-meta">
      <span class="lens-chip ${lensClass}">${escapeHtml(theme.lens || '')}</span>
      <span class="theme-counter">Theme ${idx + 1}</span>
    </div>
    <h2 class="theme-name">${escapeHtml(theme.name || '')}</h2>
    <p class="theme-summary">${escapeHtml(theme.summary || '')}</p>
    ${evidence ? `<details class="theme-evidence">
      <summary>Evidence from the news (${evidenceItems.length})</summary>
      <ul>${evidence}</ul>
    </details>` : ''}
    <div class="ideas-grid"></div>
  `;
}

function renderIdeaBody(idea, theme) {
  const id = ideaId(idea);
  // Stash the full idea (plus theme context) so the save button can retrieve it
  renderedIdeaData[id] = {
    concept: idea.concept || '',
    headline: idea.headline || '',
    budgetTier: idea.budgetTier || '',
    format: idea.format || '',
    whyItWorks: idea.whyItWorks || '',
    prAngle: idea.prAngle || '',
    trend: idea.trend || '',
    brandFit: idea.brandFit || '',
    themeName: theme ? (theme.name || '') : '',
    lens: theme ? (theme.lens || '') : ''
  };
  const saved = isShortlisted(id);
  const tierClass = budgetTierClass(idea.budgetTier);
  return `
    <div class="idea-chip-row">
      <span class="budget-chip ${tierClass}">${escapeHtml(idea.budgetTier || 'Unspecified')}</span>
      <span class="format-chip">${escapeHtml(idea.format || '')}</span>
      <button class="idea-save-btn${saved ? ' active' : ''}" data-idea-id="${id}" title="Save to shortlist" aria-label="Save to shortlist">
        <span class="star-icon">${saved ? '★' : '☆'}</span>
      </button>
    </div>
    <div class="idea-concept">${escapeHtml(idea.concept || '')}</div>
    <div class="idea-headline-block">
      <div class="idea-headline">"${escapeHtml(idea.headline || '')}"</div>
      <div class="idea-headline-label">Headline a journalist might write</div>
    </div>
    <div class="idea-field">
      <div class="idea-label">Why it works</div>
      <div class="idea-value">${escapeHtml(idea.whyItWorks || '')}</div>
    </div>
    <div class="idea-field">
      <div class="idea-label">PR angle</div>
      <div class="idea-value">${escapeHtml(idea.prAngle || '')}</div>
    </div>
    <div class="idea-field">
      <div class="idea-label">Trend it rides</div>
      <div class="idea-value">${escapeHtml(idea.trend || '')}</div>
    </div>
    <div class="idea-field">
      <div class="idea-label">Brand fit</div>
      <div class="idea-value">${escapeHtml(idea.brandFit || '')}</div>
    </div>
    <button class="idea-develop-btn" data-idea-id="${id}">Develop this idea →</button>
  `;
}

function budgetTierClass(tier) {
  if (!tier) return 'tier-default';
  const t = tier.toLowerCase();
  if (t.includes('reactive')) return 'tier-reactive';
  if (t.includes('low')) return 'tier-low';
  if (t.includes('mid')) return 'tier-mid';
  if (t.includes('big') || t.includes('swing')) return 'tier-big';
  return 'tier-default';
}

function lensClassFor(lens) {
  if (!lens) return '';
  const l = lens.toLowerCase();
  if (l.includes('gen')) return 'lens-gen';
  if (l.includes('life')) return 'lens-life';
  if (l.includes('controvers')) return 'lens-controversy';
  if (l.includes('tech')) return 'lens-tech';
  return '';
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Auto-unlock — runs last, after all state above is loaded.
// Accepts the key passed from the Creative Suite homepage and
// honours an unlock from earlier in this browser session.
// ============================================================
const suiteKey = new URLSearchParams(location.search).get('k');
if (suiteKey === PASSWORD) {
  sessionStorage.setItem('unlocked', 'yes');
  history.replaceState(null, '', location.pathname);
}
if (sessionStorage.getItem('unlocked') === 'yes') {
  $('#password-gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
  initApp();
}
