// ==========================================================================
// AU Campaign CRM — Follow-ups & Callbacks View (Stripe Table Layout)
// ==========================================================================

import { state } from '../state.js';
import { esc } from '../utils/dom.js';
import { isA } from '../services/auth.js';
import { fdt, today } from '../utils/dates.js';
import { IC } from '../config.js';

export function followupsView() {
  const nowIso = new Date().toISOString();
  const l = state.D.companies.filter(x => x.status === 'Callback' && (!isA() || x.by === state.U))
    .sort((a, b) => (a.cb || '').localeCompare(b.cb || ''));

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>${isA() ? 'My Scheduled Follow-ups' : 'Company Follow-ups & Callbacks'}</h2>
        <p class="page-subtitle">${l.length} scheduled callbacks · Prioritized chronologically by callback time</p>
      </div>
      <div class="page-actions">
        <button class="btn pri" data-act="go" data-p="events">
          ${IC.events} View Campaigns
        </button>
      </div>
    </div>

    <!-- Stripe Data Table -->
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Company & Campaign</th>
            <th>Telephone Numbers</th>
            <th>Contact Person</th>
            <th>Scheduled Callback</th>
            <th>Notes & Intent</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${l.length ? l.map(c => {
            const isOverdue = c.cb && c.cb < nowIso.slice(0, 16);
            const isDueToday = c.cb && c.cb.startsWith(today());
            const evName = (state.D.events.find(e => e.id == c.ev) || {}).name || '—';

            return `
              <tr data-act="co" data-id="${c.id}" title="${isA() ? 'Click to update contacts and phone' : 'Click to edit company details'}">
                <td>
                  <div style="font-weight:600">${esc(c.name)}</div>
                  <div class="mu" style="font-size:11.5px">${esc(evName)}</div>
                </td>
                <td>
                  ${c.phone ? `
                    <a class="lk" href="tel:${esc(c.phone)}" onclick="event.stopPropagation()" style="font-family:var(--font-mono);font-size:12.5px">
                      ${IC.phone} ${esc(c.phone)}
                    </a>
                  ` : '—'}
                  ${c.altPhone ? `
                    <div class="mu" style="font-size:11.5px;font-family:var(--font-mono)">
                      ${esc(c.altPhone)}
                    </div>
                  ` : ''}
                </td>
                <td>
                  <div>${esc(c.contact || '—')}</div>
                  ${c.email ? `<div class="mu" style="font-size:11.5px">${esc(c.email)}</div>` : ''}
                </td>
                <td>
                  <span class="${isOverdue ? 'od' : (isDueToday ? 'pill pill-callback' : '')}" style="font-weight:600;font-size:12px">
                    ${fdt(c.cb)}
                    ${isOverdue ? ' (Overdue)' : (isDueToday ? ' (Due Today)' : '')}
                  </span>
                </td>
                <td style="white-space:normal;max-width:260px;font-size:12.5px">
                  ${esc(c.notes || '—')}
                </td>
                <td>
                  <button class="btn btn-sm pri" data-act="lg" data-id="${c.id}">
                    ${IC.phone} Log Call
                  </button>
                </td>
              </tr>`;
          }).join('') : `
            <tr>
              <td colspan="6" class="empty-box">
                <b>All scheduled callbacks are clear</b>
                <p>No pending follow-ups found for your account.</p>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>`;
}
