// ==========================================================================
// AU Campaign CRM — Events & Exhibitions (Campaign Management)
// ==========================================================================

import { state } from '../state.js';
import { isA } from '../services/auth.js';
import { esc } from '../utils/dom.js';
import { fdy } from '../utils/dates.js';
import { IC, PILL_CLASS } from '../config.js';

export function eventsView() {
  const ev = [...state.D.events].sort((a, b) => (a.start || '9').localeCompare(b.start || '9'));

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>Campaigns & Exhibitions</h2>
        <p class="page-subtitle">${ev.length} active campaigns · Track progress and launch targeted auto dialers</p>
      </div>
      <div class="page-actions">
        ${isA() ? '' : `
          <button class="btn pri" data-act="evnew">
            ${IC.plus} Add Campaign Event
          </button>
        `}
      </div>
    </div>

    <!-- Stripe Campaign Table -->
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Campaign / Exhibition</th>
            <th>Event Schedule</th>
            <th>Venue / City</th>
            <th>Total Leads</th>
            <th style="min-width:200px">Calling Progress</th>
            <th>Operations</th>
          </tr>
        </thead>
        <tbody>
          ${ev.length ? ev.map(e => {
            const c = state.D.companies.filter(x => x.ev == e.id);
            const dn = c.filter(x => x.status !== 'New').length;
            const p = c.length ? Math.round((dn / c.length) * 100) : 0;
            const dateStr = e.start ? fdy(e.start) + (e.end ? ' – ' + fdy(e.end) : '') : esc(e.when || '—');
            return `
              <tr>
                <td>
                  <div style="font-weight:600">
                    <a class="lk" data-act="evco" data-id="${e.id}">${esc(e.name)}</a>
                  </div>
                </td>
                <td>
                  <span class="mu" style="font-size:12.5px">${dateStr}</span>
                </td>
                <td>
                  <span style="font-size:12.5px">${esc(e.where || '—')}</span>
                </td>
                <td>
                  <b class="tabular">${c.length}</b> <span class="mu" style="font-size:12px">companies</span>
                </td>
                <td>
                  <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px">
                    <span class="tabular">${dn} of ${c.length} called</span>
                    <span class="tabular" style="font-weight:600">${p}%</span>
                  </div>
                  <div class="pg"><i class="bl" data-w="${p}"></i></div>
                </td>
                <td>
                  <div class="row" style="margin:0;gap:6px">
                    <button class="btn btn-sm pri" data-act="ad-setup" data-id="${e.id}" title="Launch Auto Dialer">
                      ${IC.zap} Auto Dial
                    </button>
                    <button class="btn btn-sm" data-act="evco" data-id="${e.id}">
                      Roster View
                    </button>
                    ${isA() ? '' : `
                      <button class="btn btn-sm" data-act="evedit" data-id="${e.id}" title="Edit Event Details">
                        ${IC.edit}
                      </button>
                      <button class="btn btn-sm btn-danger" data-act="evdel" data-id="${e.id}" title="Delete Campaign">
                        ${IC.trash}
                      </button>
                    `}
                  </div>
                </td>
              </tr>`;
          }).join('') : `
            <tr>
              <td colspan="6" class="empty-box">
                <b>No campaigns registered yet</b>
                <p>Add a new campaign to begin organizing leads and outreach.</p>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>`;
}

export function eventDetailView() {
  const e = state.D.events.find(x => x.id == state.EV);
  if (!e) return `<h2>Event Not Found</h2><button class="btn" data-act="go" data-p="events">${IC.arrowLeft} Back to Events</button>`;

  const c = state.D.companies.filter(x => x.ev == e.id).sort((a, b) => a.name.localeCompare(b.name));
  const dn = c.filter(x => x.status !== 'New').length;
  const p = c.length ? Math.round((dn / c.length) * 100) : 0;
  const dateStr = e.start ? fdy(e.start) + (e.end ? ' – ' + fdy(e.end) : '') : esc(e.when || '');

  return `
    <div style="margin-bottom:12px">
      <a class="lk" data-act="go" data-p="events" style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px">
        ${IC.arrowLeft} Back to Campaigns
      </a>
    </div>

    <div class="page-header">
      <div class="page-header-title">
        <h2>${esc(e.name)}</h2>
        <p class="page-subtitle">${dateStr}${e.where ? ' · ' + esc(e.where) : ''} · ${c.length} exhibitors registered</p>
      </div>
      <div class="page-actions">
        <button class="btn pri" data-act="ad-setup" data-id="${e.id}">
          ${IC.zap} Start Auto Dialer
        </button>
        ${isA() ? '' : `
          <button class="btn" data-act="co" data-id="" data-ev="${e.id}">
            ${IC.plus} Add Company
          </button>
        `}
      </div>
    </div>

    <!-- Calling Progress Card -->
    <div class="card" style="padding:14px 20px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600;font-size:13px">Campaign Calling Coverage</span>
        <span class="mu tabular" style="font-size:12px">${dn} of ${c.length} completed (${p}%)</span>
      </div>
      <div class="pg"><i class="bl" data-w="${p}"></i></div>
    </div>

    <!-- Exhibitor Roster Table -->
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Stand / Booth</th>
            <th>Exhibitor Name</th>
            <th>Telephone</th>
            <th>Key Contact</th>
            <th>Outreach Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${c.length ? c.map(x => `
            <tr data-act="co" data-id="${x.id}" title="${isA() ? 'Click to update contacts and phone' : 'Click to view/edit lead'}">
              <td>
                <span class="mu" style="font-size:12px">${esc(x.stand || '—')}</span>
              </td>
              <td><b>${esc(x.name)}</b></td>
              <td>
                ${x.phone ? `
                  <a class="lk" href="tel:${esc(x.phone)}" onclick="event.stopPropagation()" style="font-family:var(--font-mono);font-size:12.5px">
                    ${IC.phone} ${esc(x.phone)}
                  </a>
                ` : '<span class="mu">No phone</span>'}
              </td>
              <td>${esc(x.contact || '—')}</td>
              <td>
                <span class="pill ${PILL_CLASS[x.status] || 'pill-new'}">${x.status === 'New' ? 'Not called' : x.status}</span>
              </td>
              <td>
                <div class="row" style="margin:0;gap:6px">
                  <button class="btn btn-sm pri" data-act="lg" data-id="${x.id}" onclick="event.stopPropagation()">
                    Log Call
                  </button>
                  <button class="btn btn-sm" data-act="co" data-id="${x.id}" onclick="event.stopPropagation()">
                    ${isA() ? 'Contacts' : 'Edit'}
                  </button>
                </div>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="6" class="empty-box">
                <b>No companies registered for this campaign</b>
                <p>Import leads via CSV or add companies to get started.</p>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>`;
}
