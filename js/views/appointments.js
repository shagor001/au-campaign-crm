// ==========================================================================
// AU Campaign CRM — Sales Appointments Pipeline (Stripe Table Layout)
// ==========================================================================

import { state } from '../state.js';
import { isA } from '../services/auth.js';
import { esc } from '../utils/dom.js';
import { fdy, fdt } from '../utils/dates.js';
import { SC, SUB, IC } from '../config.js';

export function appointmentsView() {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const AC = ['New Appointment', 'Preparing Quote', 'Quoted'];
  const FL = {
    'Active': a => AC.includes(a.status),
    'Appointments to work': a => a.status === 'New Appointment',
    'Scheduled call backs': a => a.next && AC.includes(a.status),
    'Quoted': a => a.status === 'Quoted',
    'Sold': a => a.status === 'Sold',
    'Not proceeding': a => a.status === 'Not Proceeding',
    'Handed back': a => a.status === 'Handed Back',
    'All': () => true
  };

  const filterFn = FL[state.AF] || FL['All'];
  const l = state.D.appts.filter(a => (!isA() || a.by === state.U) && filterFn(a))
    .sort((a, b) => (a.next || '9').localeCompare(b.next || '9'));

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>Sales Appointments Pipeline</h2>
        <p class="page-subtitle">${l.length} appointments in pipeline · Stage progression and quote tracking</p>
      </div>
      <div class="page-actions">
        <button class="btn pri" data-act="apnew" data-co="">
          ${IC.plus} Book New Appointment
        </button>
      </div>
    </div>

    <!-- Attio / Stripe Filter Chips -->
    <div class="row" style="margin-bottom:16px;gap:8px">
      ${Object.keys(FL).map(k => `
        <button class="chip ${state.AF === k ? 'on' : ''}" data-act="apf" data-f="${k}">${k}</button>
      `).join('')}
    </div>

    <!-- Pipeline Table -->
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Company & Key Contact</th>
            <th>Exhibition & Stand</th>
            <th>Stage / Status</th>
            <th>Next Meeting / Call</th>
            <th>Calls Made</th>
            <th>Quote Ref</th>
            <th>Assigned Sales Rep</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${l.length ? l.map(a => {
            const c = state.D.companies.find(x => x.id == a.co) || { name: '(Deleted Company)', phone: '' };
            const e = state.D.events.find(x => x.id == c.ev) || {};
            const isOverdue = a.next && a.next < now;

            return `
              <tr>
                <td>
                  <div style="font-weight:600">
                    <a class="lk" data-act="ap" data-id="${a.id}">${esc(c.name)}</a>
                  </div>
                  <div class="mu" style="font-size:11.5px">
                    ${esc(a.contact || 'No contact')} · ${esc(c.phone || '')}
                  </div>
                </td>
                <td>
                  <div style="font-size:12.5px">${esc(e.name || '—')}</div>
                  <div class="mu" style="font-size:11.5px">
                    ${e.start ? fdy(e.start) : ''} ${a.stand ? `· ${esc(a.stand)}` : ''}
                  </div>
                </td>
                <td>
                  <span class="ap" style="border-left:3px solid ${SC[a.status] || 'var(--border-default)'}">
                    ${esc(a.status)}
                  </span>
                  ${SUB[a.status] ? `<div class="mu" style="font-size:10.5px;margin-top:2px">${SUB[a.status]}</div>` : ''}
                </td>
                <td>
                  <span class="${isOverdue ? 'od' : ''}" style="font-size:12px">
                    ${a.next ? fdt(a.next) : '—'}
                  </span>
                </td>
                <td>
                  <b class="tabular">${a.calls || 0}</b>
                  ${a.last ? `<div class="mu tabular" style="font-size:10.5px">Last: ${fdy(a.last)}</div>` : ''}
                </td>
                <td>
                  <span class="tabular" style="font-family:var(--font-mono);font-size:12px">
                    ${esc(a.quote || '—')}
                  </span>
                </td>
                <td>
                  <span style="font-size:12.5px">${esc(a.with || '—')}</span>
                </td>
                <td>
                  <button class="btn btn-sm" data-act="ap" data-id="${a.id}">
                    ${IC.edit} Details
                  </button>
                </td>
              </tr>`;
          }).join('') : `
            <tr>
              <td colspan="8" class="empty-box">
                <b>No appointments found matching this pipeline filter</b>
                <p>Try switching filter tabs or book a new appointment.</p>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>`;
}
