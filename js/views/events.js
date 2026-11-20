// ==========================================================================
// AU Campaign CRM — Events & Exhibitions (Campaign Management)
// ==========================================================================

import { state } from '../state.js';
import { isA, isEventAccessible, getAccessibleEvents } from '../services/auth.js';
import { esc } from '../utils/dom.js';
import { fdy, formatDateRange } from '../utils/dates.js';
import { IC, PILL_CLASS } from '../config.js';

export function eventsView() {
  const ev = getAccessibleEvents().sort((a, b) => (a.start || '9').localeCompare(b.start || '9'));

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>${isA() ? 'My Assigned Campaigns' : 'Campaigns & Exhibitions'}</h2>
        <p class="page-subtitle">${ev.length} ${isA() ? 'assigned' : 'active'} campaigns · ${isA() ? 'Only campaigns assigned to you by administrators are shown' : 'Track progress, manage agent assignments and launch targeted auto dialers'}</p>
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
            <th style="min-width:180px">Calling Progress</th>
            <th>Assigned Agent</th>
            ${!isA() ? '<th>Operations</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${ev.length ? ev.map(e => {
            const c = state.D.companies.filter(x => x.ev == e.id);
            const dn = c.filter(x => x.status !== 'New').length;
            const p = c.length ? Math.round((dn / c.length) * 100) : 0;
            const dateStr = formatDateRange(e.start, e.end, e.when || '—');
            const agentObj = state.D.agents.find(a => (a.e || '').toLowerCase() === (e.assignedAgent || '').toLowerCase());
            const agentName = agentObj ? agentObj.n : (e.assignedAgent || '');
            const isMe = isA() && (e.assignedAgent || '').toLowerCase() === (state.U || '').toLowerCase();

            return `
              <tr data-act="evco" data-id="${e.id}" style="cursor:pointer" title="Click to view campaign leads">
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
                  ${agentName ? `
                    <span style="font-size:12.5px;color:var(--tx-primary)">${esc(agentName)}</span>
                  ` : `
                    <span class="mu" style="font-size:12.5px">—</span>
                  `}
                </td>
                ${!isA() ? `
                  <td>
                    <div class="row" style="margin:0;gap:6px">
                      <button class="btn btn-sm" data-act="evedit" data-id="${e.id}" title="Edit Campaign & Agent Assignment">
                        ${IC.edit} Edit
                      </button>
                      <button class="btn btn-sm btn-danger" data-act="evdel" data-id="${e.id}" title="Delete Campaign">
                        ${IC.trash} Delete
                      </button>
                    </div>
                  </td>
                ` : ''}
              </tr>`;
          }).join('') : `
            <tr>
              <td colspan="${isA() ? 6 : 7}" class="empty-box">
                ${isA() ? `
                  <div style="width:40px;height:40px;margin:0 auto 12px;background:var(--bg-subtle);color:var(--tx-muted);border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center">
                    ${IC.shield}
                  </div>
                  <b>No Campaigns Assigned Yet</b>
                  <p>An administrator has not assigned your agent account (<code>${esc(state.U)}</code>) to any active campaign events.</p>
                ` : `
                  <b>No campaigns registered yet</b>
                  <p>Add a new campaign to begin organizing leads and outreach.</p>
                `}
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

  // Access Guard: Agents can only view events assigned to them
  if (isA() && !isEventAccessible(e)) {
    return `
      <div style="margin-bottom:12px">
        <a class="lk" data-act="go" data-p="events" style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px">
          ${IC.arrowLeft} Back to My Campaigns
        </a>
      </div>
      <div class="card" style="text-align:center;padding:56px 24px;max-width:620px;margin:32px auto">
        <div style="width:48px;height:48px;margin:0 auto 16px;background:var(--color-danger-bg);color:var(--color-danger);border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center">
          ${IC.shield}
        </div>
        <h3 style="font-size:18px;margin-bottom:8px">Campaign Access Restricted</h3>
        <p class="mu" style="font-size:13px;line-height:1.5">
          You do not have permission to view <b>${esc(e.name)}</b>. This campaign has not been assigned to your agent account (<code>${esc(state.U)}</code>) from the administration side.
        </p>
        <div style="margin-top:20px">
          <button class="btn pri" data-act="go" data-p="events">
            ${IC.arrowLeft} Return to My Assigned Campaigns
          </button>
        </div>
      </div>`;
  }

  const c = state.D.companies.filter(x => x.ev == e.id).sort((a, b) => a.name.localeCompare(b.name));
  const dn = c.filter(x => x.status !== 'New').length;
  const p = c.length ? Math.round((dn / c.length) * 100) : 0;
  const dateStr = formatDateRange(e.start, e.end, e.when || '');

  return `
    <div style="margin-bottom:12px">
      <a class="lk" data-act="go" data-p="events" style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px">
        ${IC.arrowLeft} Back to Campaigns
      </a>
    </div>

    <div class="page-header">
      <div class="page-header-title">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <h2 style="margin:0">${esc(e.name)}</h2>
          <button class="btn btn-sm pri" data-act="ad-setup" data-id="${e.id}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;font-size:12.5px;font-weight:600">
            ${IC.zap} Auto Dial
          </button>
        </div>
        <p class="page-subtitle">${dateStr}${e.where ? ' · ' + esc(e.where) : ''} · ${c.length} exhibitors registered</p>
      </div>
      <div class="page-actions">
        ${isA() ? '' : `
          <button class="btn" data-act="evedit" data-id="${e.id}">
            ${IC.edit} Edit Campaign
          </button>
          <button class="btn pri" data-act="co" data-id="" data-ev="${e.id}">
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
            <tr data-act="co" data-id="${x.id}" data-ev="${e.id}" title="${isA() ? 'Click to update contacts and phone' : 'Click to view/edit lead'}">
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
                  <button class="btn btn-sm pri" data-act="lg" data-id="${x.id}" data-ev="${e.id}">
                    Log Call
                  </button>
                  <button class="btn btn-sm" data-act="co" data-id="${x.id}" data-ev="${e.id}">
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
