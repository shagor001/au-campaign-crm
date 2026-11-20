// ==========================================================================
// AU Campaign CRM — System Reports & Audit (Stripe Layout)
// ==========================================================================

import { state } from '../state.js';
import { isA, ALL, getAgentName } from '../services/auth.js';
import { esc } from '../utils/dom.js';
import { fdy } from '../utils/dates.js';
import { IC } from '../config.js';

export function reportsView() {
  const l = state.D.reports.filter(r => !isA() || r.by === state.U);

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>System Feedback & Problem Reports</h2>
        <p class="page-subtitle">${l.length} tickets filed · Report bugs, technical telephony issues or operational improvements</p>
      </div>
    </div>

    <!-- Submit Issue Form -->
    <div class="card" style="margin-bottom:24px">
      <div style="margin-bottom:14px">
        <h3>Submit a New Issue or Feature Request</h3>
        <p class="mu" style="margin:0">Reports are reviewed by the administrative operations team.</p>
      </div>
      <form id="fr" style="display:flex;flex-direction:column;gap:12px">
        <div class="form-field">
          <label>CRM Module / Screen</label>
          <select name="pg" style="max-width:320px">
            <option>Call Queue & Telephony</option>
            <option>Auto Dialer Engine</option>
            <option>Companies Directory</option>
            <option>Campaigns & Events</option>
            <option>Appointments Pipeline</option>
            <option>Follow-ups & Callbacks</option>
            <option>Agent Dashboard</option>
            <option>Other / General</option>
          </select>
        </div>
        <div class="form-field">
          <label>Issue Description & Expected Behavior</label>
          <textarea name="t" placeholder="Please describe what occurred, expected behavior, or workflow enhancements needed..." required></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end">
          <button class="btn pri">
            ${IC.checkCircle} Submit Report
          </button>
        </div>
      </form>
    </div>

    <!-- Ticket Management Table -->
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Date Logged</th>
            <th>Reported By</th>
            <th>Module</th>
            <th>Issue Details</th>
            <th>Ticket Status</th>
            <th>Operation</th>
          </tr>
        </thead>
        <tbody>
          ${l.length ? l.map(r => `
            <tr>
              <td>
                <span class="mu tabular" style="font-size:12px">${fdy(r.at)}</span>
              </td>
              <td><b>${esc(getAgentName(r.by))}</b></td>
              <td><span class="pill pill-new">${esc(r.pg)}</span></td>
              <td style="white-space:normal;min-width:260px;font-size:12.5px">${esc(r.t)}</td>
              <td>
                <span class="pill ${r.done ? 'pill-interested' : 'pill-callback'}">
                  ${r.done ? 'Resolved' : 'Open Ticket'}
                </span>
              </td>
              <td>
                ${isA() ? '—' : `
                  <button class="btn btn-sm ${r.done ? '' : 'pri'}" data-act="rres" data-id="${r.id}">
                    ${r.done ? 'Reopen' : 'Mark Resolved'}
                  </button>
                `}
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="6" class="empty-box">
                <b>No issue tickets filed</b>
                <p>All CRM modules and telephony workflows operating normally.</p>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>`;
}
