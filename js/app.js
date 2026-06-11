// Forward Planner — front-end logic.
// Data lives server-side in Netlify Blobs (one shared copy for the team);
// this page reads and writes it through /api/data and runs the engine
// through /api/run, which streams progress lines as it works.

const PASSWORD = 'PicPR2026';
const $ = (sel) => document.querySelector(sel);

let events = [];
let clients = [];
let settings = {};

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ Gate ============
function tryUnlock() {
  if ($('#gate-input').value === PASSWORD) {
    sessionStorage.setItem('fp_unlocked', '1');
    $('#gate').classList.add('hidden');
    init();
  } else {
    $('#gate-error').textContent = 'Not quite. Try again.';
    $('#gate-input').value = '';
  }
}
$('#gate-submit').addEventListener('click', tryUnlock);
$('#gate-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
if (sessionStorage.getItem('fp_unlocked') === '1') { $('#gate').classList.add('hidden'); init(); }

// ============ Tabs ============
$('#tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab.dataset.tab));
});

// ============ Data plumbing ============
async function loadStore(name) {
  const res = await fetch('/api/data?store=' + name);
  if (!res.ok) throw new Error('Could not load ' + name);
  return res.json();
}

async function saveStore(name, value) {
  const res = await fetch('/api/data?store=' + name, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-password': PASSWORD },
    body: JSON.stringify(value)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Save failed');
  return data;
}

async function init() {
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
}

// ============ Events (calendar) ============
function sortKeyForEvent(e) {
  // Sort by next occurrence: MM-DD entries map onto the current cycle
  const d = (e.date || '').trim();
  return /^\d{4}-/.test(d) ? d.slice(5) + '!' + d : d;
}

function renderEvents() {
  const sorted = events.map((e, i) => ({ ...e, _i: i })).sort((a, b) => sortKeyForEvent(a).localeCompare(sortKeyForEvent(b)));
  const rows = sorted.map(e => `
    <tr>
      <td><strong>${escapeHtml(e.date)}</strong>${(e.duration || 1) > 1 ? '<div class="muted">' + e.duration + ' days</div>' : ''}</td>
      <td>${escapeHtml(e.event)}<div class="muted hide-mobile">${escapeHtml(e.description)}</div></td>
      <td class="hide-mobile muted">${escapeHtml(e.category)}</td>
      <td class="row-actions">
        <button data-edit-event="${e._i}">Edit</button>
        <button class="del" data-del-event="${e._i}">Delete</button>
      </td>
    </tr>`).join('');
  $('#events-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Date</th><th>Event</th><th class="hide-mobile">Category</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function eventFormHTML(e = {}, index = -1) {
  return `
    <div class="grid">
      <div><label class="form-label">Date: MM-DD recurring, YYYY-MM-DD one-off, or floating like 3:sun:06 (third Sunday of June) / last:fri:09</label><input type="text" id="ef-date" value="${escapeHtml(e.date || '')}"></div>
      <div><label class="form-label">Event name</label><input type="text" id="ef-event" value="${escapeHtml(e.event || '')}"></div>
      <div><label class="form-label">Category</label><input type="text" id="ef-category" value="${escapeHtml(e.category || '')}" placeholder="Awareness / Cultural / Sport / Seasonal/Retail / Political/Economic"></div>
      <div><label class="form-label">Typically suits (sectors)</label><input type="text" id="ef-relevant" value="${escapeHtml(e.relevantFor || '')}"></div>
      <div><label class="form-label">Duration in days (1 for a single day, 7 for a week, 30 for a month)</label><input type="text" id="ef-duration" value="${escapeHtml(String(e.duration || 1))}"></div>
      <div class="full"><label class="form-label">Description</label><textarea id="ef-description" rows="2">${escapeHtml(e.description || '')}</textarea></div>
      <div class="full"><label class="form-label">Hook ideas / notes</label><textarea id="ef-notes" rows="2">${escapeHtml(e.notes || '')}</textarea></div>
    </div>
    <div class="form-buttons">
      <button class="primary-btn" data-save-event="${index}">Save event</button>
      <button class="secondary-btn" data-cancel-form="event">Cancel</button>
    </div>`;
}

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
      duration: Math.max(1, parseInt($('#ef-duration').value, 10) || 1)
    };
    if (!ev.date || !ev.event) { alert('Date and event name are needed.'); return; }
    if (!/^(\d{2}-\d{2}|\d{4}-\d{2}-\d{2})$/.test(ev.date)) { alert('Date must be MM-DD or YYYY-MM-DD.'); return; }
    if (i === -1) events.push(ev); else events[i] = ev;
    $('#event-form').classList.add('hidden');
    await persist('events', events, renderEvents);
  }

  if (t.id === 'add-client-btn') { $('#client-form').innerHTML = clientFormHTML(); $('#client-form').classList.remove('hidden'); }
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
      name: $('#cf-name').value.trim(),
      industry: $('#cf-industry').value.trim(),
      description: $('#cf-description').value.trim(),
      topics: $('#cf-topics').value.trim(),
      tone: $('#cf-tone').value.trim(),
      avoid: $('#cf-avoid').value.trim(),
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
    const res = await fetch('/api/data?store=briefing&id=' + encodeURIComponent(t.dataset.openBriefing));
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
    alert('Save failed: ' + err.message + '. Your change is still on screen — try saving again.');
    rerender();
  }
}

// ============ Settings ============
function renderSettings() {
  $('#set-recipients').value = (settings.recipients || []).join(', ');
  $('#set-from').value = settings.fromAddress || '';
  $('#set-personal').value = settings.personalEmail || '';
  $('#set-livesearch').checked = settings.liveSearch !== false;
  $('#cron-url').textContent = location.origin + '/api/run?key=YOUR-SECRET&email=1';
}

$('#save-settings-btn').addEventListener('click', async () => {
  settings.recipients = $('#set-recipients').value.split(',').map(s => s.trim()).filter(Boolean);
  settings.fromAddress = $('#set-from').value.trim();
  settings.personalEmail = $('#set-personal').value.trim();
  settings.liveSearch = $('#set-livesearch').checked;
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
      fetch('/api/data?store=briefing&id=' + encodeURIComponent(id))
        .then(r => r.ok ? r.json() : null)
        .then(b => { if (b) { renderBriefing(b); document.querySelector('[data-tab="briefing"]').click(); } });
    }
  }
});

// ============ Run the engine ============
$('#run-btn').addEventListener('click', async () => {
  const btn = $('#run-btn');
  btn.disabled = true;
  btn.textContent = 'Running...';
  const statusEl = $('#run-status');
  statusEl.classList.remove('hidden');
  statusEl.innerHTML = '';
  document.querySelector('[data-tab="briefing"]').click();

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-password': PASSWORD },
      body: JSON.stringify({ emailMode: $('#email-mode').value })
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
        if (msg.type === 'status') statusEl.innerHTML += '<div>' + escapeHtml(msg.message) + '</div>';
        else if (msg.type === 'error') statusEl.innerHTML += '<div class="err">' + escapeHtml(msg.message) + '</div>';
        else if (msg.type === 'done') {
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
});

// ============ Briefing render ============
const BUCKET_ACCENT = { act: 'var(--navy)', plan: 'var(--teal-darker)', radar: 'var(--amber)' };

function seedTextFor(eventName, m) {
  const bits = [];
  if (m.idea) bits.push(m.idea.replace(/^"|"$/g, ''));
  bits.push((m.concept || m.angle || '').trim());
  if (m.headline) bits.push('Example headline: ' + m.headline);
  if (m.media || m.format) bits.push('Target media: ' + (m.media || m.format));
  return 'Pegged to ' + eventName + '. ' + bits.join(' ');
}

function renderBriefing(b) {
  const totalIdeas = (b.sections || []).reduce((n, s) => n + (s.items || []).reduce((m, it) => m + (it.matches || []).length, 0), 0);
  const chips = [
    (b.sections || []).reduce((n, s) => n + (s.items || []).length, 0) + ' moments',
    totalIdeas + ' ideas',
    b.freshCount ? b.freshCount + ' fresh finds' : '',
    b.emailed ? 'Emailed to the team' : ''
  ].filter(Boolean);

  const sections = (b.sections || []).filter(s => s.items && s.items.length).map(s => {
    const accent = BUCKET_ACCENT[s.key] || 'var(--teal-darker)';
    return `
    <div class="brief-section">
      <div class="brief-section-title" style="color:${accent}"><span class="section-dot" style="background:${accent}"></span>${escapeHtml(s.title)}<span class="section-count">${s.items.length}</span></div>
      ${s.items.map(it => `
        <div class="brief-item" style="border-left-color:${accent}">
          <div class="brief-item-head">${escapeHtml(it.event)}</div>
          <div class="brief-item-date">${escapeHtml(it.date)}${it.daysOut ? ' · ' + escapeHtml(String(it.daysOut)) + ' days out' : ''} · ${escapeHtml(it.why)}</div>
          ${(it.matches || []).map(m => `
            <div class="idea-card">
              <div class="idea-card-top">
                <span class="idea-client">${escapeHtml(m.client)}</span>
                ${m.idea ? `<span class="idea-name" style="color:${accent}">${escapeHtml(m.idea)}</span>` : ''}
                <button class="copy-seed" data-seed="${escapeHtml(seedTextFor(it.event, m))}">Copy for Idea Jacker</button>
              </div>
              <div class="idea-concept">${escapeHtml(m.concept || m.angle || '')}</div>
              ${m.headline ? `<div class="idea-headline">“${escapeHtml(m.headline)}”</div>` : ''}
              <div class="idea-meta"><span style="color:${accent}">Media:</span> ${escapeHtml(m.media || m.format || '')} &nbsp;·&nbsp; <span style="color:${accent}">This week:</span> ${escapeHtml(m.action || m.leadNote || '')}</div>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;
  }).join('');

  const also = (b.alsoNoted || []).length
    ? `<div class="brief-also"><strong>Also on the calendar:</strong> ${b.alsoNoted.map(escapeHtml).join(' · ')}</div>` : '';

  $('#briefing-view').innerHTML = `
    <div class="brief-hero">
      <div class="brief-eyebrow">Forward Planner briefing</div>
      <div class="brief-subject">${escapeHtml(b.subject)}</div>
      <div class="brief-chips">${chips.map(c => '<span class="brief-chip">' + escapeHtml(c) + '</span>').join('')}</div>
      ${b.thinWarning ? '<div class="brief-thin">' + escapeHtml(b.thinWarning) + '</div>' : ''}
      <p class="brief-intro">${escapeHtml(b.intro)}</p>
    </div>
    ${sections}
    ${also}`;
}

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
