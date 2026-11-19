// ==========================================================================
// AU Campaign CRM — Agent Management (Team Roster & Administration)
// ==========================================================================

import { state } from '../state.js';
import { esc } from '../utils/dom.js';
import { today } from '../utils/dates.js';
import { IC } from '../config.js';

export function agentsView() {
  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>Agent Team Roster</h2>
        <p class="page-subtitle">${state.D.agents.length} telemarketing agents · User credentials, workload allocation and performance</p>
      </div>
    </div>

    <!-- Agent Directory Table -->
    <div class="tw" style="margin-bottom:24px">
      <table>
        <thead>
          <tr>
            <th>Agent Name</th>
            <th>Login Email</th>
            <th>Total Handled</th>
            <th>Calls Today</th>
            <th>Interested Leads</th>
            <th>Operations</th>
          </tr>
        </thead>
        <tbody>
          ${state.D.agents.length ? state.D.agents.map(a => {
            const m = state.D.companies.filter(x => x.by === a.e);
            const todayCount = m.filter(x => x.at === today()).length;
            const interestedCount = m.filter(x => x.status === 'Interested').length;
            const conversion = m.length ? Math.round((interestedCount / m.length) * 100) : 0;

            return `
              <tr>
                <td>
                  <div style="font-weight:600;display:flex;align-items:center;gap:8px">
                    <div style="width:24px;height:24px;border-radius:var(--radius-full);background:var(--bg-subtle);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600">
                      ${esc((a.n || 'A')[0])}
                    </div>
                    <span>${esc(a.n)}</span>
                  </div>
                </td>
                <td>
                  <span class="mu" style="font-family:var(--font-mono);font-size:12px">${esc(a.e)}</span>
                </td>
                <td>
                  <b class="tabular">${m.length}</b> <span class="mu" style="font-size:12px">leads</span>
                </td>
                <td>
                  <b class="tabular" style="color:var(--accent-primary)">${todayCount}</b>
                </td>
                <td>
                  <b class="tabular" style="color:var(--color-success)">${interestedCount}</b>
                  <small class="mu" style="font-size:11px">(${conversion}%)</small>
                </td>
                <td>
                  <button class="btn btn-sm btn-danger" data-act="delag" data-id="${a.id}">
                    ${IC.trash} Remove
                  </button>
                </td>
              </tr>`;
          }).join('') : `
            <tr>
              <td colspan="6" class="empty-box">
                <b>No agents registered yet</b>
                <p>Register agents below to enable multi-agent call distribution.</p>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>

    <!-- Add New Agent Form -->
    <div class="card">
      <div style="margin-bottom:14px">
        <h3>Add Team Agent</h3>
        <p class="mu" style="margin:0">Create agent credentials for CRM outreach and call queue access.</p>
      </div>
      <form id="fa" class="row" style="margin:0;gap:12px">
        <div style="flex:1;min-width:200px">
          <input name="n" placeholder="Agent Full Name (e.g. Sarah Miller)" required style="width:100%;box-sizing:border-box">
        </div>
        <div style="flex:1;min-width:200px">
          <input name="e" type="email" placeholder="Login Email (e.g. sarah@crm.au)" required style="width:100%;box-sizing:border-box">
        </div>
        <div style="flex:1;min-width:180px">
          <input name="p" type="password" placeholder="Password (minimum 6 characters)" required style="width:100%;box-sizing:border-box">
        </div>
        <button class="btn pri" style="align-self:flex-end">
          ${IC.plus} Add Agent
        </button>
      </form>
    </div>`;
}
