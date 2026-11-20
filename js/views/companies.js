// ==========================================================================
// AU Campaign CRM — Companies / Lead Directory (Attio Table & Stripe Layout)
// ==========================================================================

import { state } from '../state.js';
import { ST, PILL_CLASS, IC } from '../config.js';
import { esc } from '../utils/dom.js';
import { isA, ALL, getAgentName, getAccessibleEvents, getAccessibleEventIds } from '../services/auth.js';

export function getFilteredCompanies() {
  const accessibleEventIds = isA() ? getAccessibleEventIds() : null;
  const q = state.F.q.toLowerCase().trim();
  let list = state.D.companies.filter(c => {
    if (accessibleEventIds) {
      const hasPrimary = accessibleEventIds.includes(c.ev);
      const hasAttended = Array.isArray(c.eventsAttended) && c.eventsAttended.some(att => accessibleEventIds.includes(att.evId || att.ev));
      if (!hasPrimary && !hasAttended) return false;
    }
    const textMatch = !q || (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.altPhone || '').toLowerCase().includes(q) ||
      (c.phone2 || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.email2 || '').toLowerCase().includes(q) ||
      (c.contact || '').toLowerCase().includes(q) ||
      (c.contact2 || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q)
    );
    const evMatch = !state.F.ev || c.ev == state.F.ev || (Array.isArray(c.eventsAttended) && c.eventsAttended.some(att => (att.evId || att.ev) == state.F.ev));
    const stMatch = !state.F.st || c.status === state.F.st;
    return textMatch && evMatch && stMatch;
  });

  list.sort((a, b) => {
    let va = a[state.F.sort] ?? '', vb = b[state.F.sort] ?? '';
    if (state.F.sort === 'ev') {
      va = (state.D.events.find(e => e.id == a.ev) || {}).name || '';
      vb = (state.D.events.find(e => e.id == b.ev) || {}).name || '';
    }
    return String(va).localeCompare(String(vb), undefined, { numeric: true }) * state.F.dir;
  });

  return list;
}

export function rows() {
  const list = getFilteredCompanies();
  if (!list.length) {
    return `
      <tr>
        <td colspan="6" class="empty-box">
          <div style="font-size:24px;margin-bottom:8px;opacity:0.6">${IC.search}</div>
          <b>No matching companies found</b>
          <p>Try clearing your search query or adjusting status & event filters.</p>
        </td>
      </tr>`;
  }

  return list.map(c => {
    const agentName = c.by ? getAgentName(c.by) : '—';
    const evName = (state.D.events.find(x => x.id == c.ev) || {}).name || '—';

    return `
      <tr data-act="co" data-id="${c.id}" title="${isA() ? 'Click to update contacts and phone' : 'Click to view & edit company details'}">
        <td>
          <div style="font-weight:600;color:var(--tx-primary)">${esc(c.name)}</div>
          ${c.stand ? `<div class="mu" style="font-size:11.5px">${esc(c.stand)}</div>` : ''}
        </td>
        <td>
          ${c.phone ? `
            <a class="lk" href="tel:${esc(c.phone)}" onclick="event.stopPropagation()" style="font-family:var(--font-mono);font-size:12.5px">
              ${IC.phone} ${esc(c.phone)}
            </a>
          ` : '<span class="mu">No main phone</span>'}
          ${c.altPhone ? `
            <div class="mu" style="font-size:11.5px;font-family:var(--font-mono)">
              ${esc(c.altPhone)}
            </div>
          ` : ''}
          ${c.phone2 ? `
            <div class="mu" style="font-size:11.5px;font-family:var(--font-mono)">
              ${esc(c.phone2)}
            </div>
          ` : ''}
        </td>
        <td>
          <div style="color:var(--tx-primary)">${esc(c.contact || '—')}</div>
          ${c.email ? `<div class="mu" style="font-size:11.5px">${esc(c.email)}</div>` : ''}
          ${c.contact2 ? `<div class="mu" style="font-size:11.5px">Alt: ${esc(c.contact2)}</div>` : ''}
        </td>
        <td>
          <span style="font-size:12.5px">${esc(evName)}</span>
        </td>
        <td>
          <span class="pill ${PILL_CLASS[c.status] || 'pill-new'}">${esc(c.status)}</span>
        </td>
        <td>
          <span class="mu" style="font-size:12px">${esc(agentName)}</span>
        </td>
      </tr>`;
  }).join('');
}

export function companiesView() {
  const list = getFilteredCompanies();

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>Companies Directory</h2>
        <p class="page-subtitle">${list.length} leads in active campaigns · Click any row to inspect records</p>
      </div>
      <div class="page-actions">
        <button class="btn" data-act="exportcsv">
          ${IC.download} Export CSV
        </button>
        ${isA() ? '' : `
          <label class="btn" style="cursor:pointer">
            ${IC.upload} Import CSV
            <input type="file" id="csv" accept=".csv" hidden>
          </label>
          <button class="btn pri" data-act="co" data-id="">
            ${IC.plus} Add Company
          </button>
        `}
      </div>
    </div>

    <!-- Filter & Search Toolbar (Stripe Style) -->
    <div class="row" style="margin-bottom:16px;gap:10px">
      <div style="flex:1;min-width:260px;position:relative">
        <input id="q" placeholder="Search by company, contact, phone, email or notes…" value="${esc(state.F.q)}" style="width:100%;box-sizing:border-box">
      </div>
      <select id="fev" style="min-width:180px">
        <option value="">${isA() ? 'All Assigned Campaigns' : 'All Campaigns / Events'}</option>
        ${getAccessibleEvents().map(e => `<option value="${e.id}" ${state.F.ev == e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}
      </select>
      <select id="fst" style="min-width:150px">
        <option value="">All Statuses</option>
        ${ST.map(s => `<option ${state.F.st === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>

    <!-- Attio / Stripe Lead Table -->
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th class="sortable" data-sort="name">
              Company ${state.F.sort === 'name' ? (state.F.dir === 1 ? '▲' : '▼') : ''}
            </th>
            <th>Telephone Numbers</th>
            <th class="sortable" data-sort="contact">
              Key Contacts ${state.F.sort === 'contact' ? (state.F.dir === 1 ? '▲' : '▼') : ''}
            </th>
            <th class="sortable" data-sort="ev">
              Campaign ${state.F.sort === 'ev' ? (state.F.dir === 1 ? '▲' : '▼') : ''}
            </th>
            <th class="sortable" data-sort="status">
              Outreach Status ${state.F.sort === 'status' ? (state.F.dir === 1 ? '▲' : '▼') : ''}
            </th>
            <th>Caller Assigned</th>
          </tr>
        </thead>
        <tbody id="tb">${rows()}</tbody>
      </table>
    </div>`;
}
