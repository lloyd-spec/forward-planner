// Forward Planner — front-end logic.
// Data lives server-side in Netlify Blobs (one shared copy for the team);
// this page reads and writes it through /api/data and runs the engine
// through /api/run, which streams progress lines as it works.

const FP_VERSION = 'v15';
// The password never lives in this file. What you type (or what arrives
// from the suite homepage via #k=) is held for the session and checked
// server-side against /api/data?store=verify.
let suiteKey = sessionStorage.getItem('suite_key') || '';
const $ = (sel) => document.querySelector(sel);

// Any script error becomes a visible banner instead of a silent death.
// Stamp the running script version into the footer so it's always visible.
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('fp-version');
  if (el) el.textContent = 'Forward Planner ' + FP_VERSION;
});

window.addEventListener('error', (e) => {
  try {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;background:#b3403a;color:#fff;padding:11px 15px;border-radius:9px;z-index:999;font:13px Inter,sans-serif;';
    d.textContent = 'Script error: ' + e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '');
    document.body.appendChild(d);
  } catch (err) {}
});

// If the run-options dialogue isn't in the page's HTML, build it here.
// This makes the feature self-contained: it cannot be lost to a stale index.html.
(function ensureRunModal() {
  if (document.getElementById('run-modal')) return;
  const style = document.createElement('style');
  style.textContent = '.run-modal-card{max-width:480px}.run-client-list{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;max-height:300px;overflow-y:auto;padding:10px 12px;background:var(--card);border:0.5px solid var(--border);border-radius:10px;margin-bottom:6px}.run-client-row{display:flex;align-items:center;gap:7px;font-size:13px;padding:3px 0;cursor:pointer}.run-client-row input{width:14px;height:14px;accent-color:var(--teal-dark);flex-shrink:0}.run-list-note{grid-column:1/-1;font-size:13px;color:var(--navy-muted);padding:6px 2px}@media (max-width:560px){.run-client-list{grid-template-columns:1fr}}';
  document.head.appendChild(style);
  const d = document.createElement('div');
  d.id = 'run-modal';
  d.className = 'ideate-modal hidden';
  d.innerHTML = `
    <div class="ideate-modal-card run-modal-card">
      <div class="ideate-head"><span class="ideate-title">Run the briefing</span><button id="run-modal-close" class="secondary-btn">Close</button></div>
      <p class="panel-blurb">Everyone is ticked for a full run. Untick down to one or two clients to build a dedicated forward plan. The email choice in the header still applies.</p>
      <label class="toggle-row" style="margin:14px 0 10px;"><input type="checkbox" id="run-all-clients" checked> All clients</label>
      <div id="run-client-list" class="run-client-list"></div>
      <div class="form-buttons"><button id="run-confirm" class="primary-btn">Run now</button></div>
    </div>`;
  document.body.appendChild(d);
})();

// The Run button is wired here, at the top, before anything that could
// crash during load. Delegated, so it works no matter what happens below.
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'run-btn') {
    openRunModal().catch(err => alert('Run button error: ' + err.message));
  }
});

// Opens the run dialogue. If the roster isn't in memory yet (the page loads it
// in the background) the dialogue fetches it on the spot, so the list is never blank.
async function openRunModal() {
  const modal = $('#run-modal');
  const list = $('#run-client-list');
  if (!modal || !list || !$('#run-all-clients')) { startRun(null); return; }
  modal.classList.remove('hidden');
  list.classList.remove('hidden');
  $('#run-all-clients').checked = true;
  let roster = (clients || []).filter(c => c.active !== false);
  if (!roster.length) {
    list.innerHTML = '<p class="run-list-note">Fetching the client roster...</p>';
    try {
      const fresh = await loadStore('clients');
      if (Array.isArray(fresh) && fresh.length) clients = fresh;
      roster = (clients || []).filter(c => c.active !== false);
    } catch (err) {
      list.innerHTML = '<p class="run-list-note">Could not fetch the roster (' + escapeHtml(err.message) + '). Hitting Run now will still cover every client on file.</p>';
      return;
    }
  }
  if (!roster.length) {
    list.innerHTML = '<p class="run-list-note">No active clients found. Check the Clients tab. Hitting Run now will still cover every client on file.</p>';
    return;
  }
  list.innerHTML = roster.map(c => `<label class="run-client-row"><input type="checkbox" value="${escapeHtml(c.name)}" checked> ${escapeHtml(c.name)}${c.prospect ? ' <span class="tag">PROSPECT</span>' : ''}</label>`).join('');
}

let events = [];
const PROVENANCES = ['official', 'charity', 'cultural', 'industry', 'commercial'];
let activeProv = new Set(PROVENANCES);
let clients = [];
let settings = {};

function loaderHTML(label) {
  return `<div class="loader-row">
    <svg class="spoke-wheel" viewBox="0 0 44 44" aria-hidden="true">
      <circle class="rim" cx="22" cy="22" r="19"/>
      <g class="spokes">${[0, 30, 60, 90, 120, 150].map(d => `<line x1="22" y1="5" x2="22" y2="39" transform="rotate(${d} 22 22)"/>`).join('')}</g>
      <circle class="hub" cx="22" cy="22" r="5.5"/>
    </svg>
    <div>
      <div class="loader-label">${label}</div>
      <div class="loader-sub"><span class="loader-elapsed">Working on it</span><span class="dots"></span></div>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ Gate ============
async function tryUnlock() {
  const v = $('#gate-input').value;
  if (!v) return;
  const btn = $('#gate-submit');
  btn.disabled = true;
  try {
    const res = await fetch('/api/data?store=verify', { headers: { 'x-password': v } });
    if (res.status === 401) {
      $('#gate-error').textContent = 'Not quite. Try again.';
      $('#gate-input').value = '';
      return;
    }
    suiteKey = v;
    sessionStorage.setItem('suite_key', v);
    $('#gate').classList.add('hidden');
    init();
  } catch (e) {
    // Server unreachable: unlock optimistically, the first load will verify
    suiteKey = v;
    sessionStorage.setItem('suite_key', v);
    $('#gate').classList.add('hidden');
    init();
  } finally {
    btn.disabled = false;
  }
}
$('#gate-submit').addEventListener('click', tryUnlock);
$('#gate-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
// Accept the key passed in links from the Creative Suite homepage
// (#k= preferred, legacy ?k= still honoured), so one unlock opens all
const urlKeyMatch = location.hash.match(/k=([^&]+)/) || location.search.match(/[?&]k=([^&]+)/);
if (urlKeyMatch) {
  suiteKey = decodeURIComponent(urlKeyMatch[1]);
  sessionStorage.setItem('suite_key', suiteKey);
  history.replaceState(null, '', location.pathname + location.hash.replace(/k=[^&]+&?/, '').replace(/#$/, ''));
}
if (suiteKey) { $('#gate').classList.add('hidden'); init(); }

// ============ Tabs ============
$('#tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab.dataset.tab));
});

// Links from the other suite tools can deep-link a tab, e.g. /#clients
const hashTabMatch = location.hash.match(/tab=([a-z-]+)/);
const wantedTab = hashTabMatch ? hashTabMatch[1] : location.hash.replace('#', '');
if (wantedTab) {
  const tabBtn = document.querySelector('[data-tab="' + wantedTab + '"]');
  if (tabBtn) setTimeout(() => tabBtn.click(), 0);
}

// ============ Data plumbing ============
async function loadStore(name) {
  const res = await fetch('/api/data?store=' + name, { headers: { 'x-password': suiteKey } });
  if (!res.ok) throw new Error('Could not load ' + name);
  return res.json();
}

async function saveStore(name, value) {
  const res = await fetch('/api/data?store=' + name, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-password': suiteKey },
    body: JSON.stringify(value)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Save failed');
  return data;
}

async function init() {
  loadScout();
  loadStatuses();
  loadMediaOpps();
  try {
    [events, clients, settings] = await Promise.all([
      loadStore('events'), loadStore('clients'), loadStore('settings')
    ]);
  } catch (err) {
    $('#briefing-view').innerHTML = '<p class="empty-note">Could not reach the data store: ' + escapeHtml(err.message) + '. If this is a fresh deploy, check that the site finished deploying and refresh.</p>';
    return;
  }
  renderEvents();
  renderClients();
  renderSettings();
  loadArchive();
  showIncomingSeed();
}

// ============ Events (calendar) ============
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function displayDate(e) {
  const d = (e.date || '').trim();
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d))) return parseInt(m[3], 10) + ' ' + MONTH_NAMES[+m[2] - 1] + ' ' + m[1];
  if ((m = /^(\d{2})-(\d{2})$/.exec(d))) return parseInt(m[2], 10) + ' ' + MONTH_NAMES[+m[1] - 1];
  if ((m = /^(\d|last):(mon|tue|wed|thu|fri|sat|sun):(\d{2})$/i.exec(d))) {
    const nth = m[1].toLowerCase() === 'last' ? 'Last' : ({ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' })[m[1]];
    const dow = m[2][0].toUpperCase() + m[2].slice(1);
    return nth + ' ' + dow + ' of ' + MONTH_NAMES[+m[3] - 1];
  }
  return d;
}

function isValidDateRule(s) {
  const d = String(s || '').trim();
  return /^\d{2}-\d{2}$/.test(d) || /^\d{4}-\d{2}-\d{2}$/.test(d) || /^(\d|last):(mon|tue|wed|thu|fri|sat|sun):(\d{2})$/i.test(d);
}

// Live preview: as the date field is typed, show how the engine will read it
document.addEventListener('input', (e) => {
  if (e.target.id !== 'ef-date') return;
  const hint = document.getElementById('ef-date-hint');
  if (!hint) return;
  const v = e.target.value.trim();
  if (!v) { hint.textContent = ''; return; }
  if (isValidDateRule(v)) {
    hint.textContent = 'Reads as: ' + displayDate({ date: v });
    hint.style.color = 'var(--teal-darker)';
  } else {
    hint.textContent = 'Not a recognised format yet';
    hint.style.color = 'var(--amber)';
  }
});

function sortKeyForEvent(e) {
  // A number meaning "place in the year": month x 100 + approximate day
  const d = (e.date || '').trim();
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d))) return (+m[2]) * 100 + (+m[3]);
  if ((m = /^(\d{2})-(\d{2})$/.exec(d))) return (+m[1]) * 100 + (+m[2]);
  if ((m = /^(\d|last):(mon|tue|wed|thu|fri|sat|sun):(\d{2})$/i.exec(d))) {
    const nth = m[1].toLowerCase() === 'last' ? 4.3 : +m[1];
    return (+m[3]) * 100 + Math.min(28, Math.round(nth * 7 - 3));
  }
  return 1300;
}

function renderEvents() {
  const q = ($('#event-search') ? $('#event-search').value : '').trim().toLowerCase();
  let sorted = events.map((e, i) => ({ ...e, _i: i })).sort((a, b) => sortKeyForEvent(a) - sortKeyForEvent(b));
  sorted = sorted.filter(e => activeProv.has(e.provenance || 'official'));
  if (q) sorted = sorted.filter(e => (e.event + ' ' + e.description + ' ' + e.relevantFor + ' ' + e.category).toLowerCase().includes(q));
  renderProvChips();
  const countNote = q ? `<p class="empty-note">${sorted.length} of ${events.length} events match "${escapeHtml(q)}"</p>` : '';
  const rows = sorted.map(e => `
    <tr>
      <td><strong>${escapeHtml(displayDate(e))}</strong>${(e.duration || 1) > 1 ? '<div class="muted">runs ' + e.duration + ' days</div>' : ''}</td>
      <td>${escapeHtml(e.event)}<div class="muted hide-mobile">${escapeHtml(e.description)}</div></td>
      <td class="hide-mobile muted">${escapeHtml(e.category)}</td>
      <td class="row-actions">
        <button class="ideate-link" data-ideate-event="${e._i}">Ideate</button>
        <button data-edit-event="${e._i}">Edit</button>
        <button class="del" data-del-event="${e._i}">Delete</button>
      </td>
    </tr>`).join('');
  $('#events-table').innerHTML = countNote + `
    <table class="data-table">
      <thead><tr><th>Date</th><th>Event</th><th class="hide-mobile">Category</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function eventFormHTML(e = {}, index = -1) {
  return `
    <div class="grid">
      <div><label class="form-label">Date: MM-DD recurring, YYYY-MM-DD one-off, or floating like 3:sun:06 (third Sunday of June) / last:fri:09</label><input type="text" id="ef-date" value="${escapeHtml(e.date || '')}"><div id="ef-date-hint" class="muted" style="font-size:12px;margin-top:3px;">${e.date ? 'Reads as: ' + escapeHtml(displayDate(e)) : ''}</div></div>
      <div><label class="form-label">Event name</label><input type="text" id="ef-event" value="${escapeHtml(e.event || '')}"></div>
      <div><label class="form-label">Category</label><input type="text" id="ef-category" value="${escapeHtml(e.category || '')}" placeholder="Awareness / Cultural / Sport / Seasonal/Retail / Political/Economic"></div>
      <div><label class="form-label">Typically suits (sectors)</label><input type="text" id="ef-relevant" value="${escapeHtml(e.relevantFor || '')}"></div>
      <div><label class="form-label">Duration in days (1 for a single day, 7 for a week, 30 for a month)</label><input type="text" id="ef-duration" value="${escapeHtml(String(e.duration || 1))}"></div>
      <div><label class="form-label">Provenance</label><select id="ef-provenance">${PROVENANCES.map(p => `<option value="${p}" ${(e.provenance || 'official') === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></div>
      <div class="full"><label class="form-label">Description</label><textarea id="ef-description" rows="2">${escapeHtml(e.description || '')}</textarea></div>
      <div class="full"><label class="form-label">Hook ideas / notes</label><textarea id="ef-notes" rows="2">${escapeHtml(e.notes || '')}</textarea></div>
    </div>
    <div class="form-buttons">
      <button class="primary-btn" data-save-event="${index}">Save event</button>
      <button class="secondary-btn" data-cancel-form="event">Cancel</button>
    </div>`;
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'event-search') renderEvents();
});

function renderProvChips() {
  const counts = {};
  for (const e of events) counts[e.provenance || 'official'] = (counts[e.provenance || 'official'] || 0) + 1;
  $('#prov-filters').innerHTML = PROVENANCES.map(p => `
    <button class="prov-chip ${activeProv.has(p) ? 'on' : ''}" data-prov="${p}">${p[0].toUpperCase() + p.slice(1)} <span>${counts[p] || 0}</span></button>`).join('');
}

document.addEventListener('click', (e) => {
  const chip = e.target.closest('.prov-chip');
  if (!chip) return;
  const p = chip.dataset.prov;
  if (activeProv.has(p)) activeProv.delete(p); else activeProv.add(p);
  if (!activeProv.size) activeProv = new Set(PROVENANCES);
  renderEvents();
});

// ============ Clients ============
function renderClients() {
  const rows = clients.map((c, i) => `
    <tr>
      <td><strong>${escapeHtml(c.name)}</strong>${c.prospect ? '<span class="tag">PROSPECT</span>' : ''}${c.active === false ? '<span class="tag off">RESTING</span>' : ''}<div class="muted hide-mobile">${escapeHtml(c.industry)}</div></td>
      <td class="hide-mobile muted">${escapeHtml((c.tone || '').slice(0, 70))}</td>
      <td class="row-actions">
        <button data-edit-client="${i}">Edit</button>
        <button class="del" data-del-client="${i}">Delete</button>
      </td>
    </tr>`).join('');
  $('#clients-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Client</th><th class="hide-mobile">Tone</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function clientFormHTML(c = {}, index = -1) {
  return `
    <div class="grid">
      <div><label class="form-label">Name</label><input type="text" id="cf-name" value="${escapeHtml(c.name || '')}"></div>
      <div><label class="form-label">Industry / location</label><input type="text" id="cf-industry" value="${escapeHtml(c.industry || '')}"></div>
      <div class="full"><label class="form-label">Description</label><textarea id="cf-description" rows="2">${escapeHtml(c.description || '')}</textarea></div>
      <div class="full"><label class="form-label">Topics (keywords for matching)</label><textarea id="cf-topics" rows="2">${escapeHtml(c.topics || '')}</textarea></div>
      <div><label class="form-label">Tone of voice</label><input type="text" id="cf-tone" value="${escapeHtml(c.tone || '')}"></div>
      <div><label class="form-label">Topics to avoid</label><input type="text" id="cf-avoid" value="${escapeHtml(c.avoid || '')}"></div>
      <div><label class="form-label">Location</label><input type="text" id="cf-location" value="${escapeHtml(c.location || '')}"></div>
      <div><label class="form-label">Website</label><input type="text" id="cf-website" value="${escapeHtml(c.website || '')}"></div>
      <div><label class="form-label">Typical budget</label><input type="text" id="cf-budget" value="${escapeHtml(c.budget || '')}"></div>
      <div class="full"><label class="form-label">Current briefing (what they're pitching right now — feeds all three tools)</label><textarea id="cf-briefing" rows="2">${escapeHtml(c.briefing || '')}</textarea></div>
    </div>
    <div class="form-buttons">
      <label class="check-inline"><input type="checkbox" id="cf-prospect" ${c.prospect ? 'checked' : ''}> New business prospect</label>
      <label class="check-inline"><input type="checkbox" id="cf-active" ${c.active === false ? '' : 'checked'}> Active</label>
    </div>
    <div class="form-buttons">
      <button class="primary-btn" data-save-client="${index}">Save client</button>
      <button class="secondary-btn" data-cancel-form="client">Cancel</button>
    </div>`;
}

// ============ Shared click handling for tables and forms ============
document.addEventListener('click', async (e) => {
  const t = e.target;

  if (t.id === 'add-event-btn') { $('#event-form').innerHTML = eventFormHTML(); $('#event-form').classList.remove('hidden'); }
  if (t.dataset.editEvent !== undefined) { const i = +t.dataset.editEvent; $('#event-form').innerHTML = eventFormHTML(events[i], i); $('#event-form').classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (t.dataset.delEvent !== undefined) {
    const i = +t.dataset.delEvent;
    if (confirm('Delete "' + events[i].event + '" from the calendar?')) {
      events.splice(i, 1);
      await persist('events', events, renderEvents);
    }
  }
  if (t.dataset.saveEvent !== undefined) {
    const i = +t.dataset.saveEvent;
    const ev = {
      date: $('#ef-date').value.trim(),
      event: $('#ef-event').value.trim(),
      category: $('#ef-category').value.trim(),
      description: $('#ef-description').value.trim(),
      relevantFor: $('#ef-relevant').value.trim(),
      notes: $('#ef-notes').value.trim(),
      duration: Math.max(1, parseInt($('#ef-duration').value, 10) || 1),
      provenance: $('#ef-provenance').value
    };
    if (!ev.date || !ev.event) { alert('Date and event name are needed.'); return; }
    if (!isValidDateRule(ev.date)) { alert('Date must be MM-DD (recurring), YYYY-MM-DD (one-off) or a floating rule like 3:sun:06 or last:fri:09.'); return; }
    if (i === -1) events.push(ev); else events[i] = ev;
    $('#event-form').classList.add('hidden');
    await persist('events', events, renderEvents);
  }

  if (t.id === 'add-client-btn') { $('#client-form').innerHTML = clientFormHTML(); $('#client-form').classList.remove('hidden'); }
  if (t.id === 'sync-roster-btn') {
    t.disabled = true; t.textContent = 'Checking the master list...';
    try {
      const res = await fetch('/api/data?store=master-roster', { headers: { 'x-password': suiteKey } });
      if (!res.ok) throw new Error('Could not load the master list');
      const master = await res.json();
      const norm = (n) => (n || '').trim().toLowerCase().replace(/[\u2013\u2014-]/g, '-').replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ');
      const have = new Set(clients.map(c => norm(c.name)));
      const added = [];
      for (const m of master) {
        if (!have.has(norm(m.name))) { clients.push(m); added.push(m.name); }
      }
      if (added.length) {
        await persist('clients', clients, renderClients);
        alert('Added ' + added.length + ' client(s) from the master list:\n' + added.join('\n') + '\n\nNote: this adds clients missing from the roster. It never changes clients you already have.');
      } else {
        alert('Every master-list client is already on the roster. Nothing added. (This button adds missing clients; it never changes existing ones.)');
      }
    } catch (err) {
      alert('Add failed: ' + err.message);
    }
    t.disabled = false; t.textContent = 'Add missing clients';
  }
  if (t.dataset.editClient !== undefined) { const i = +t.dataset.editClient; $('#client-form').innerHTML = clientFormHTML(clients[i], i); $('#client-form').classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (t.dataset.delClient !== undefined) {
    const i = +t.dataset.delClient;
    if (confirm('Delete ' + clients[i].name + ' from the roster?')) {
      clients.splice(i, 1);
      await persist('clients', clients, renderClients);
    }
  }
  if (t.dataset.saveClient !== undefined) {
    const i = +t.dataset.saveClient;
    const c = {
      ...(i === -1 ? {} : clients[i]),
      name: $('#cf-name').value.trim(),
      industry: $('#cf-industry').value.trim(),
      description: $('#cf-description').value.trim(),
      topics: $('#cf-topics').value.trim(),
      tone: $('#cf-tone').value.trim(),
      avoid: $('#cf-avoid').value.trim(),
      location: $('#cf-location').value.trim(),
      website: $('#cf-website').value.trim(),
      budget: $('#cf-budget').value.trim(),
      briefing: $('#cf-briefing').value.trim(),
      prospect: $('#cf-prospect').checked,
      active: $('#cf-active').checked
    };
    if (!c.name) { alert('A name is needed.'); return; }
    if (i === -1) clients.push(c); else clients[i] = c;
    $('#client-form').classList.add('hidden');
    await persist('clients', clients, renderClients);
  }

  if (t.dataset.cancelForm === 'event') $('#event-form').classList.add('hidden');
  if (t.dataset.cancelForm === 'client') $('#client-form').classList.add('hidden');

  if (t.dataset.openBriefing) {
    const res = await fetch('/api/data?store=briefing&id=' + encodeURIComponent(t.dataset.openBriefing), { headers: { 'x-password': suiteKey } });
    if (res.ok) {
      renderBriefing(await res.json());
      document.querySelector('[data-tab="briefing"]').click();
    }
  }
});

async function persist(name, value, rerender) {
  try {
    await saveStore(name, value);
    rerender();
  } catch (err) {
    alert('Save failed: ' + err.message + '. Your change is still on screen, try saving again.');
    rerender();
  }
}

// ============ Settings ============
function renderSettings() {
  $('#set-recipients').value = (settings.recipients || []).join(', ');
  $('#set-from').value = settings.fromAddress || '';
  $('#set-personal').value = settings.personalEmail || '';
  $('#set-livesearch').checked = settings.liveSearch !== false;
  $('#set-commercial').checked = settings.includeCommercial !== false;
}

$('#save-settings-btn').addEventListener('click', async () => {
  settings.recipients = $('#set-recipients').value.split(',').map(s => s.trim()).filter(Boolean);
  settings.fromAddress = $('#set-from').value.trim();
  settings.personalEmail = $('#set-personal').value.trim();
  settings.liveSearch = $('#set-livesearch').checked;
  settings.includeCommercial = $('#set-commercial').checked;
  try {
    await saveStore('settings', settings);
    $('#settings-saved').textContent = 'Saved.';
    setTimeout(() => { $('#settings-saved').textContent = ''; }, 2500);
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
});

// ============ Archive ============
async function loadArchive() {
  try {
    const index = await loadStore('archive');
    if (!index.length) {
      $('#archive-list').innerHTML = '<p class="empty-note">No briefings yet. The first one lands here the moment you run the engine.</p>';
      return;
    }
    $('#archive-list').innerHTML = index.map(b => `
      <div class="archive-item" data-open-briefing="${escapeHtml(b.id)}">
        <div>
          <div class="archive-item-subject">${escapeHtml(b.subject)}</div>
          <div class="archive-item-meta">${escapeHtml(b.id)}${b.emailed ? ' · emailed' : ' · not emailed'}</div>
        </div>
        <span>→</span>
      </div>`).join('');
  } catch (err) {
    $('#archive-list').innerHTML = '<p class="empty-note">Could not load the archive: ' + escapeHtml(err.message) + '</p>';
  }
}

// Make archive items clickable through their children
document.addEventListener('click', (e) => {
  const item = e.target.closest('.archive-item');
  if (item && !e.target.dataset.openBriefing) {
    const id = item.dataset.openBriefing;
    if (id) {
      fetch('/api/data?store=briefing&id=' + encodeURIComponent(id), { headers: { 'x-password': suiteKey } })
        .then(r => r.ok ? r.json() : null)
        .then(b => { if (b) { renderBriefing(b); document.querySelector('[data-tab="briefing"]').click(); } });
    }
  }
});

// ============ Run the engine ============
// (Run button is wired at the top of this file.)


document.addEventListener('click', (e) => {
  if (e.target.id === 'run-modal-close' || e.target.id === 'run-modal') $('#run-modal').classList.add('hidden');
  if (e.target.id === 'run-confirm') {
    const boxes = [...document.querySelectorAll('#run-client-list input')];
    if (!boxes.length) { $('#run-modal').classList.add('hidden'); startRun(null); return; }
    const ticked = boxes.filter(i => i.checked).map(i => i.value);
    if (!ticked.length) { alert('Tick at least one client.'); return; }
    const names = ticked.length === boxes.length ? null : ticked;
    $('#run-modal').classList.add('hidden');
    startRun(names);
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'run-all-clients') {
    document.querySelectorAll('#run-client-list input').forEach(i => { i.checked = e.target.checked; });
  } else if (e.target.closest && e.target.closest('#run-client-list')) {
    const boxes = [...document.querySelectorAll('#run-client-list input')];
    $('#run-all-clients').checked = boxes.every(i => i.checked);
  }
});

async function startRun(clientNames) {
  const btn = $('#run-btn');
  btn.disabled = true;
  btn.textContent = 'Running...';
  const statusEl = $('#run-status');
  statusEl.classList.remove('hidden');
  statusEl.innerHTML = loaderHTML('Generating the briefing') + '<div class="run-log"></div>';
  const runT0 = Date.now();
  document.querySelector('[data-tab="briefing"]').click();

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-password': suiteKey },
      body: JSON.stringify({ emailMode: $('#email-mode').value, clients: clientNames || undefined })
    });
    if (!res.ok || !res.body) throw new Error('The engine did not start (' + res.status + ').');

    const reader = res.body.getReader();
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
        let msg;
        try { msg = JSON.parse(line); } catch (e) { continue; }
        if (msg.type === 'status') statusEl.querySelector('.run-log').innerHTML += '<div>' + escapeHtml(msg.message) + '</div>';
        else if (msg.type === 'tick') {
          const el = statusEl.querySelector('.loader-elapsed');
          if (el) el.textContent = 'Still composing, ' + Math.round((Date.now() - runT0) / 1000) + 's in. Long thoughts take a moment';
        }
        else if (msg.type === 'error') statusEl.querySelector('.run-log').innerHTML += '<div class="err">' + escapeHtml(msg.message) + '</div>';
        else if (msg.type === 'done') {
          statusEl.classList.add('hidden');
          renderBriefing(msg.briefing);
          loadArchive();
        }
      }
    }
  } catch (err) {
    statusEl.innerHTML += '<div class="err">' + escapeHtml(err.message) + '</div>';
  }
  btn.disabled = false;
  btn.textContent = 'Run the briefing';
}

// ============ Briefing render ============
const BUCKET_ACCENT = { act: 'var(--navy)', plan: 'var(--teal-darker)', radar: 'var(--amber)' };

function seedTextFor(eventName, m, it) {
  const bits = [];
  if (m.client) bits.push('Client: ' + m.client + '.');
  bits.push('Pegged to ' + eventName + (it && it.date ? ' (' + it.date + ')' : '') + '.');
  if (m.idea) bits.push(m.idea.replace(/^"|"$/g, '') + '.');
  bits.push((m.concept || m.angle || '').trim());
  if (m.headline) bits.push('Example headline: ' + m.headline);
  if (m.media || m.format) bits.push('Target media: ' + (m.media || m.format));
  if (it && it.pitchWindow) bits.push('Timing constraint: pitching must land ' + it.pitchWindow + '.');
  else if (it && it.startBy) bits.push('Timing constraint: work starts ' + it.startBy + '.');
  return bits.join(' ');
}

function ideaJackerButtons(seed) {
  const url = 'https://ideajacker.netlify.app/?seed=' + encodeURIComponent(seed);
  return '<a class="copy-seed ij-open" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Develop in Idea Jacker →</a>' +
         '<button class="copy-seed" data-seed="' + escapeHtml(seed) + '">Copy</button>';
}

const STATUS_OPTIONS = [
  ['', 'Unreviewed'],
  ['pursuing', 'Pursuing'],
  ['covered', 'Already covered'],
  ['notRelevant', 'Not relevant'],
  ['passed', 'Passed']
];
let eventStatuses = {};

function statusSelectHTML(statusKey) {
  if (!statusKey) return '';
  const current = (eventStatuses[statusKey] || {}).status || '';
  return `<select class="item-status" data-status-key="${escapeHtml(statusKey)}" title="Remembered for next Monday's briefing">` +
    STATUS_OPTIONS.map(([v, l]) => `<option value="${v}" ${v === current ? 'selected' : ''}>${l}</option>`).join('') +
    `</select>`;
}

function renderBriefing(b) {
  const totalIdeas = (b.sections || []).reduce((n, s) => n + (s.items || []).reduce((m, it) => m + (it.matches || []).length, 0), 0);
  const sc = b.statusCounts || {};
  const chips = [
    (b.sections || []).reduce((n, s) => n + (s.items || []).length, 0) + ' moments',
    totalIdeas + ' ideas',
    b.freshCount ? b.freshCount + ' fresh finds' : '',
    sc.covered ? sc.covered + ' already covered' : '',
    sc.passed ? sc.passed + ' passed' : '',
    b.emailed ? 'Emailed to the team' : ''
  ].filter(Boolean);

  const prios = (b.priorities || []);
  const prioBlock = prios.length ? `
    <div class="prio-block">
      <div class="prio-title">${prios.length} thing${prios.length === 1 ? '' : 's'} Pic must act on this week</div>
      ${prios.map((p, i) => `
        <div class="prio-row">
          <span class="prio-num">${i + 1}</span>
          <div><strong>${escapeHtml(p.client)}</strong> · ${escapeHtml(p.event)}
            <div class="prio-action">${escapeHtml(p.action)}${p.deadline ? ' <span class="prio-deadline">By ' + escapeHtml(p.deadline) + '</span>' : ''}</div>
          </div>
        </div>`).join('')}
    </div>` : '';

  const sections = (b.sections || []).filter(s => s.items && s.items.length).map(s => {
    const accent = BUCKET_ACCENT[s.key] || 'var(--teal-darker)';
    return `
    <div class="brief-section">
      <div class="brief-section-title" style="color:${accent}"><span class="section-dot" style="background:${accent}"></span>${escapeHtml(s.title)}<span class="section-count">${s.items.length}</span></div>
      ${s.items.map(it => `
        <div class="brief-item" style="border-left-color:${accent}">
          <div class="brief-item-head">${escapeHtml(it.event)}
            ${it.type ? `<span class="type-chip" style="color:${accent};border-color:${accent}">${escapeHtml(it.type)}</span>` : ''}
            ${statusSelectHTML(it.statusKey)}
          </div>
          <div class="brief-item-date">${escapeHtml(it.date)}${it.daysOut ? ' · ' + escapeHtml(String(it.daysOut)) + ' days out' : ''}</div>
          ${it.whyNow ? `<div class="why-now"><span style="color:${accent}">Why now:</span> ${escapeHtml(it.whyNow)}</div>` : (it.why ? `<div class="why-now">${escapeHtml(it.why)}</div>` : '')}
          ${(it.pitchWindow || it.startBy) ? `<div class="lead-times">${it.pitchWindow ? `<span style="color:${accent}">Pitch window:</span> ${escapeHtml(it.pitchWindow)}` : ''}${it.pitchWindow && it.startBy ? ' &nbsp;·&nbsp; ' : ''}${it.startBy ? `<span style="color:${accent}">Work starts:</span> ${escapeHtml(it.startBy)}` : ''}</div>` : ''}
          ${it.lead && (it.matches || []).length > 1 ? `<div class="lead-times"><span style="color:${accent}">Recommended lead:</span> ${escapeHtml(it.lead)} (others take a different route)</div>` : ''}
          ${(it.matches || []).map(m => `
            <div class="idea-card">
              <div class="idea-card-top">
                <span class="idea-client">${escapeHtml(m.client)}</span>
                ${m.idea ? `<span class="idea-name" style="color:${accent}">${escapeHtml(m.idea)}</span>` : ''}
                ${ideaJackerButtons(seedTextFor(it.event, m, it))}
              </div>
              <div class="idea-concept">${escapeHtml(m.concept || m.angle || '')}</div>
              ${m.headline ? `<div class="idea-headline">“${escapeHtml(m.headline)}”</div>` : ''}
              <div class="idea-meta"><span style="color:${accent}">Media:</span> ${escapeHtml(m.media || m.format || '')} &nbsp;·&nbsp; <span style="color:${accent}">This week:</span> ${escapeHtml(m.action || m.leadNote || '')}</div>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;
  }).join('');

  const longLead = (b.longLead || []);
  const longLeadBlock = longLead.length ? `
    <div class="also-block">
      <div class="brief-section-title" style="color:var(--sage,#5a7d5a)"><span class="section-dot" style="background:var(--sage,#5a7d5a)"></span>Long-lead horizon (2-6 months out)<span class="section-count">${longLead.length}</span></div>
      ${longLead.map(l => `<div class="long-lead-row"><strong>${escapeHtml(l.event)}</strong> · ${escapeHtml(l.date || '')}${l.weeksOut ? ' · ' + l.weeksOut + ' weeks out' : ''}<div class="muted">${escapeHtml(l.note || '')}</div></div>`).join('')}
    </div>` : '';

  const quiet = (b.quiet || []);
  const quietBlock = quiet.length ? `
    <div class="also-block">
      <div class="brief-section-title" style="color:var(--navy-muted)"><span class="section-dot" style="background:var(--navy-muted)"></span>No strong calendar-led opportunity<span class="section-count">${quiet.length}</span></div>
      ${quiet.map(q => `<div class="long-lead-row"><strong>${escapeHtml(q.client)}</strong>: ${escapeHtml(q.note)}${q.suggest ? ' <span style="color:var(--teal-darker)">' + escapeHtml(q.suggest) + '</span>' : ''}</div>`).join('')}
    </div>` : '';

  const gaps = (b.gaps || []);
  const gapsBlock = gaps.length
    ? `<div class="brief-thin" style="margin-top:16px;"><strong>Possible calendar gaps</strong> (unverified, run the Scout to check): ${gaps.map(escapeHtml).join(' · ')}</div>`
    : '';

  const alsoItems = (b.alsoNoted || []).map(x => typeof x === 'string'
    ? `<div class="also-card"><span class="also-name">${escapeHtml(x)}</span></div>`
    : `<div class="also-card">
         <div><div class="also-name">${escapeHtml(x.event)}</div><div class="also-date">${escapeHtml(x.date || '')}</div></div>
         <button class="also-ideate" data-name="${escapeHtml(x.event)}">Generate ideas</button>
       </div>`);
  const also = alsoItems.length
    ? `<div class="also-block">
         <div class="brief-section-title" style="color:var(--navy-muted)"><span class="section-dot" style="background:var(--navy-muted)"></span>Also on the calendar<span class="section-count">${alsoItems.length}</span></div>
         <div class="also-grid">${alsoItems.join('')}</div>
       </div>` : '';

  $('#briefing-view').innerHTML = `
    <div class="brief-hero">
      <div class="brief-eyebrow">Forward Planner briefing</div>
      <div class="brief-subject">${escapeHtml(b.subject)}</div>
      <div class="brief-chips">${chips.map(c => '<span class="brief-chip">' + escapeHtml(c) + '</span>').join('')}</div>
      ${b.thinWarning ? '<div class="brief-thin">' + escapeHtml(b.thinWarning) + '</div>' : ''}
      <p class="brief-intro">${escapeHtml(b.intro)}</p>
    </div>
    ${prioBlock}
    ${sections}
    ${longLeadBlock}
    ${quietBlock}
    ${gapsBlock}
    ${also}`;
}

// ---------- Event status: tiny institutional memory ----------
// Each briefing item carries a statusKey (event name + occurrence year).
// Changing the dropdown saves for the whole team; next Monday's run skips
// covered/passed/not-relevant occurrences and nudges pursuing ones.
async function loadStatuses() {
  try { eventStatuses = await loadStore('event-status'); } catch (e) { eventStatuses = {}; }
  if (!eventStatuses || typeof eventStatuses !== 'object' || Array.isArray(eventStatuses)) eventStatuses = {};
}

document.addEventListener('change', async (e) => {
  const sel = e.target.closest && e.target.closest('.item-status');
  if (!sel) return;
  const key = sel.dataset.statusKey;
  if (!key) return;
  let note = (eventStatuses[key] || {}).note || '';
  if (sel.value === 'pursuing') {
    note = prompt('Optional next action to remember (e.g. "Client approval due 14 August"):', note) || '';
  }
  if (sel.value) eventStatuses[key] = { status: sel.value, note, updatedOn: new Date().toISOString().slice(0, 10) };
  else delete eventStatuses[key];
  try {
    await saveStore('event-status', eventStatuses);
  } catch (err) {
    alert('Could not save the status: ' + err.message);
  }
});

// Copy-for-Idea-Jacker buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-seed');
  if (!btn) return;
  navigator.clipboard.writeText(btn.dataset.seed).then(() => {
    const was = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = was; btn.classList.remove('copied'); }, 1800);
  });
});


// ============ Ideate a single day (modal, callable from anywhere) ============
document.addEventListener('click', async (e) => {
  const cal = e.target.closest('[data-ideate-event]');
  if (cal) {
    const ev = events[+cal.dataset.ideateEvent];
    if (ev) runIdeation(ev);
    return;
  }
  const also = e.target.closest('.also-ideate');
  if (also) {
    const name = also.dataset.name;
    const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const match = events.find(ev => norm(ev.event) === norm(name)) ||
                  events.find(ev => norm(ev.event).includes(norm(name)) || norm(name).includes(norm(ev.event)));
    runIdeation(match || { event: name });
    return;
  }
  if (e.target.id === 'ideate-close' || e.target.id === 'ideate-modal') {
    $('#ideate-modal').classList.add('hidden');
  }
});

async function runIdeation(ev) {
  const modal = $('#ideate-modal');
  modal.classList.remove('hidden');
  $('#ideate-title').textContent = ev.event;
  const statusEl = $('#ideate-status');
  statusEl.classList.remove('hidden');
  statusEl.innerHTML = loaderHTML('Working up ideas') + '<div class="run-log"></div>';
  $('#ideate-results').innerHTML = '';
  const t0 = Date.now();

  try {
    const res = await fetch('/api/ideate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-password': suiteKey },
      body: JSON.stringify({ event: ev })
    });
    if (!res.ok || !res.body) throw new Error('The ideation engine did not start (' + res.status + ').');
    const reader = res.body.getReader();
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
        let msg;
        try { msg = JSON.parse(line); } catch (err) { continue; }
        if (msg.type === 'status') statusEl.querySelector('.run-log').innerHTML += '<div>' + escapeHtml(msg.message) + '</div>';
        else if (msg.type === 'tick') {
          const el = statusEl.querySelector('.loader-elapsed');
          if (el) el.textContent = 'Still writing, ' + Math.round((Date.now() - t0) / 1000) + 's in. Good ideas take a moment';
        }
        else if (msg.type === 'error') statusEl.querySelector('.run-log').innerHTML += '<div class="err">' + escapeHtml(msg.message) + '</div>';
        else if (msg.type === 'done') {
          statusEl.classList.add('hidden');
          $('#ideate-results').innerHTML = (msg.ideas || []).map(m => `
            <div class="idea-card">
              <div class="idea-card-top">
                <span class="idea-client">${escapeHtml(m.client)}</span>
                ${m.idea ? `<span class="idea-name" style="color:var(--teal-darker)">${escapeHtml(m.idea)}</span>` : ''}
                ${ideaJackerButtons(seedTextFor(ev.event, m))}
              </div>
              <div class="idea-concept">${escapeHtml(m.concept || '')}</div>
              ${m.headline ? `<div class="idea-headline">\u201C${escapeHtml(m.headline)}\u201D</div>` : ''}
              <div class="idea-meta"><span style="color:var(--teal-darker)">Media:</span> ${escapeHtml(m.media || '')} &nbsp;·&nbsp; <span style="color:var(--teal-darker)">This week:</span> ${escapeHtml(m.action || '')}</div>
            </div>`).join('') || '<p class="empty-note">No strong matches for this one.</p>';
        }
      }
    }
  } catch (err) {
    statusEl.querySelector('.run-log').innerHTML += '<div class="err">' + escapeHtml(err.message) + '</div>';
  }
}


// ---------- Media opportunities (editorial calendar) ----------
// Forward features, supplements and awards the account team hears about.
// Each carries a hard deadline; the briefing treats that as the date
// pitching must land BY and plans backwards from it.

let mediaOpps = [];

async function loadMediaOpps() {
  try { mediaOpps = await loadStore('media-opps'); } catch (e) { mediaOpps = []; }
  if (!Array.isArray(mediaOpps)) mediaOpps = [];
  renderMediaOpps();
}

function renderMediaOpps() {
  const el = document.getElementById('media-opps');
  if (!el) return;
  const today = new Date().toISOString().slice(0, 10);
  const sorted = mediaOpps.map((m, i) => ({ ...m, _i: i }))
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
  const rows = sorted.map(m => {
    const past = m.deadline < today;
    return `<tr${past ? ' style="opacity:0.45"' : ''}>
      <td><strong>${escapeHtml(displayDate({ date: m.deadline }))}</strong>${past ? '<div class="muted">passed</div>' : ''}</td>
      <td>${escapeHtml(m.title)}${m.outlet ? '<div class="muted">' + escapeHtml(m.outlet) + '</div>' : ''}</td>
      <td class="hide-mobile muted">${escapeHtml(m.client || '')}${m.notes ? '<div>' + escapeHtml(m.notes) + '</div>' : ''}</td>
      <td class="row-actions">
        <button data-edit-mo="${m._i}">Edit</button>
        <button class="del" data-del-mo="${m._i}">Delete</button>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `
    <div class="panel-head" style="margin-top:26px;">
      <p class="panel-blurb"><strong>Media opportunities.</strong> Forward features, supplements and awards with hard deadlines. The briefing plans backwards from each deadline: the pitch lands before it, not after.</p>
      <button id="add-mo-btn" class="secondary-btn">+ Add deadline</button>
    </div>
    <div id="mo-form" class="edit-form hidden"></div>
    ${mediaOpps.length ? `<table class="data-table">
      <thead><tr><th>Deadline</th><th>Opportunity</th><th class="hide-mobile">Client / notes</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<p class="empty-note">Nothing logged yet. Add the first forward feature or awards deadline the moment a journalist mentions one.</p>'}`;
}

function moFormHTML(m = {}, index = -1) {
  return `
    <div class="grid">
      <div><label class="form-label">Deadline (YYYY-MM-DD, the date pitching must land by)</label><input type="text" id="mo-deadline" value="${escapeHtml(m.deadline || '')}" placeholder="2026-09-12"></div>
      <div><label class="form-label">Opportunity (e.g. "Christmas gift guide", "Care awards entry")</label><input type="text" id="mo-title" value="${escapeHtml(m.title || '')}"></div>
      <div><label class="form-label">Outlet</label><input type="text" id="mo-outlet" value="${escapeHtml(m.outlet || '')}" placeholder="e.g. Cotswold Life"></div>
      <div><label class="form-label">Client (optional, if logged for one client)</label><input type="text" id="mo-client" value="${escapeHtml(m.client || '')}"></div>
      <div class="full"><label class="form-label">Notes (what they want, who to contact)</label><textarea id="mo-notes" rows="2">${escapeHtml(m.notes || '')}</textarea></div>
    </div>
    <div class="form-buttons">
      <button class="primary-btn" data-save-mo="${index}">Save deadline</button>
      <button class="secondary-btn" data-cancel-form="mo">Cancel</button>
    </div>`;
}

document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.id === 'add-mo-btn') { $('#mo-form').innerHTML = moFormHTML(); $('#mo-form').classList.remove('hidden'); }
  if (t.dataset.editMo !== undefined) { const i = +t.dataset.editMo; $('#mo-form').innerHTML = moFormHTML(mediaOpps[i], i); $('#mo-form').classList.remove('hidden'); }
  if (t.dataset.delMo !== undefined) {
    const i = +t.dataset.delMo;
    if (confirm('Delete "' + mediaOpps[i].title + '"?')) {
      mediaOpps.splice(i, 1);
      await persist('media-opps', mediaOpps, renderMediaOpps);
    }
  }
  if (t.dataset.saveMo !== undefined) {
    const i = +t.dataset.saveMo;
    const m = {
      id: i === -1 ? ('mo-' + Date.now()) : (mediaOpps[i].id || 'mo-' + Date.now()),
      deadline: $('#mo-deadline').value.trim(),
      title: $('#mo-title').value.trim(),
      outlet: $('#mo-outlet').value.trim(),
      client: $('#mo-client').value.trim(),
      notes: $('#mo-notes').value.trim()
    };
    if (!m.deadline || !m.title) { alert('A deadline and a name are needed.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.deadline)) { alert('Deadline must be YYYY-MM-DD.'); return; }
    if (i === -1) mediaOpps.push(m); else mediaOpps[i] = m;
    $('#mo-form').classList.add('hidden');
    await persist('media-opps', mediaOpps, renderMediaOpps);
  }
  if (t.dataset.cancelForm === 'mo') $('#mo-form').classList.add('hidden');
});

// ---------- Incoming seed (hand-off from the News Jacker) ----------
// The News Jacker's "send to" buttons can arrive with ?seed= carrying a
// reactive brief. Show it and offer to work it up on the spot.

function showIncomingSeed() {
  const m = location.search.match(/[?&]seed=([^&]+)/) || location.hash.match(/seed=([^&]+)/);
  if (!m) return;
  let seed = '';
  try { seed = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return; }
  if (!seed.trim()) return;
  history.replaceState(null, '', location.pathname);
  const view = $('#briefing-view');
  const banner = document.createElement('div');
  banner.className = 'brief-thin';
  banner.style.cssText = 'margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;';
  banner.innerHTML = '<span style="flex:1;min-width:200px;"><strong>Brief handed over:</strong> ' + escapeHtml(seed.slice(0, 300)) + (seed.length > 300 ? '...' : '') + '</span>' +
    '<button class="primary-btn" id="seed-ideate-btn">Generate ideas from this brief</button>';
  view.parentNode.insertBefore(banner, view);
  document.getElementById('seed-ideate-btn').addEventListener('click', () => {
    runIdeation({ event: seed.slice(0, 90), description: seed });
  });
}

// ---------- Event scout review queue ----------
// Proposals the monthly live-search sweep found, each with the source page
// that evidences its date. Approve to add to the calendar (source kept),
// reject to bin it for good. The queue being empty is the happy state.

async function loadScout() {
  try {
    const res = await fetch('/api/scout', { headers: { 'x-password': suiteKey } });
    if (!res.ok) return;
    const data = await res.json();
    renderScout(data.proposals || []);
  } catch (e) { /* scout unavailable: the calendar works as normal */ }
}

function renderScout(proposals) {
  const el = document.getElementById('scout-queue');
  if (!el) return;
  if (!proposals.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="scout-bar"><span><strong>' + proposals.length +
    '</strong> calendar update' + (proposals.length === 1 ? '' : 's') +
    ' found by the event scout - each links its evidence. Approve to add, reject to bin.</span>' +
    '<button onclick="runScout(this)">Run a fresh sweep</button></div>' +
    proposals.map(p => {
      const isUpdate = p.kind === 'update';
      const detail = isUpdate
        ? '<div class="sc-meta"><strong>Calendar says:</strong> ' + escapeHtml(p.currentResolved || p.currentDate || '?') +
          ' &nbsp;→&nbsp; <strong>Verified:</strong> ' + escapeHtml(p.date) +
          (p.duration > 1 ? ' (runs ' + p.duration + ' days)' : '') +
          (p.source ? ' <a href="' + escapeHtml(p.source) + '" target="_blank" rel="noopener">source</a>' : '') + '</div>'
        : '<div class="sc-meta">' + escapeHtml(p.description || '') +
          (p.duration > 1 ? ' Runs ' + p.duration + ' days.' : '') +
          (p.source ? ' <a href="' + escapeHtml(p.source) + '" target="_blank" rel="noopener">source</a>' : '') + '</div>';
      return '<div class="scout-card' + (isUpdate ? ' scout-update' : '') + '">' +
        '<div><strong>' + escapeHtml(p.event) + '</strong>' + (isUpdate ? '' : ' · ' + escapeHtml(p.date)) +
        ' <span class="chip">' + (isUpdate ? 'DATE UPDATE' : escapeHtml(p.category || '')) + '</span>' +
        detail + '</div>' +
        '<div class="scout-actions">' +
          '<button class="approve" onclick="scoutAct(\'' + p.id + '\', \'approve\')">' + (isUpdate ? 'Approve update' : 'Approve') + '</button>' +
          '<button onclick="scoutAct(\'' + p.id + '\', \'reject\')">Reject</button>' +
        '</div>' +
      '</div>';
    }).join('');
}

async function scoutAct(id, action) {
  await fetch('/api/scout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-password': suiteKey },
    body: JSON.stringify({ action: action, id: id })
  });
  await loadScout();
  if (action === 'approve') {
    // refresh the calendar so the new event appears immediately
    try {
      const res = await fetch('/api/data?store=events', { headers: { 'x-password': suiteKey } });
      if (res.ok) { events = await res.json(); renderEvents(); }
    } catch (e) {}
  }
}

async function runScout(btn) {
  btn.disabled = true; btn.textContent = 'Sweeping...';
  try {
    await fetch('/api/scout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-password': suiteKey },
      body: JSON.stringify({ action: 'run' })
    });
  } catch (e) {}
  btn.disabled = false; btn.textContent = 'Run a fresh sweep';
  loadScout();
}
