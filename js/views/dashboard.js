// ==========================================================================
// AU Campaign CRM — Operational Dashboard (Stripe Data & Attio Layout)
// ==========================================================================

import { state } from '../state.js';
import { ST, PILL_CLASS, IC } from '../config.js';
import { esc } from '../utils/dom.js';
import { isA } from '../services/auth.js';
import { dueN } from '../components/toast.js';
import { today } from '../utils/dates.js';

export function agentDashView() {
  const m = state.D.companies.filter(x => x.by === state.U);
  const n = s => m.filter(x => x.status === s).length;
  const due = dueN();
  const calledToday = m.filter(x => x.at === today()).length;
  const interestedCount = n('Interested');
  const conversionRate = m.length ? Math.round((interestedCount / m.length) * 100) : 0;

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>My Calling Workspace</h2>
        <p class="page-subtitle">Personal outreach metrics, active campaign pacing and scheduled callbacks.</p>
      </div>
      <div class="page-actions">
        <button class="btn pri" data-act="go" data-p="queue">
          ${IC.phone} Start Calling Queue
        </button>
      </div>
    </div>

    <!-- Agent Metric Cards -->
    <div class="g4">
      <div class="card">
        <small>${IC.user} Handled by Me</small>
        <b>${m.length}</b>
        <span class="mu" style="font-size:11.5px;margin:4px 0 0">Lifetime allocated leads</span>
      </div>
      <div class="card">
        <small>${IC.phone} Calls Made Today</small>
        <b style="color:var(--accent-primary)">${calledToday}</b>
        <span class="mu" style="font-size:11.5px;margin:4px 0 0">Paced against daily goal</span>
      </div>
      <div class="card">
        <small>${IC.checkCircle} Interested Leads</small>
        <b style="color:var(--color-success)">${interestedCount}</b>
        <span class="mu" style="font-size:11.5px;margin:4px 0 0">${conversionRate}% conversion rate</span>
      </div>
      <div class="card">
        <small>${IC.follow} Callbacks Due</small>
        <b style="color:${due ? 'var(--color-warning)' : 'inherit'}">${due}</b>
        <span class="mu" style="font-size:11.5px;margin:4px 0 0">${due ? 'Requires immediate action' : 'All callbacks clear'}</span>
      </div>
    </div>

    <!-- Campaign Progress & Quick Actions -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <h3>Active Campaign Outreach</h3>
          <p class="mu" style="margin:0">Real-time telemarketing completion by registered campaign.</p>
        </div>
        <button class="btn btn-sm" data-act="go" data-p="events">View All Campaigns</button>
      </div>

      <div class="tw">
        <table>
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Venue / Location</th>
              <th>Exhibitors</th>
              <th style="min-width:200px">Calling Progress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${state.D.events.map(e => {
              const c = state.D.companies.filter(x => x.ev == e.id);
              const d = c.filter(x => x.status !== 'New').length;
              const p = c.length ? Math.round((d / c.length) * 100) : 0;
              return `
                <tr>
                  <td><b>${esc(e.name)}</b></td>
                  <td>${esc(e.where || '—')}</td>
                  <td><b>${c.length}</b> leads</td>
                  <td>
                    <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px">
                      <span class="tabular">${d} of ${c.length} called</span>
                      <span class="tabular" style="font-weight:600">${p}%</span>
                    </div>
                    <div class="pg"><i class="bl" data-w="${p}"></i></div>
                  </td>
                  <td>
                    <button class="btn btn-sm" data-act="evco" data-id="${e.id}">Open Event</button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

export function dashView() {
  if (isA()) return agentDashView();

  const c = state.D.companies;
  const n = s => c.filter(x => x.status === s).length;
  const mx = Math.max(1, ...ST.map(n));
  const due = dueN();
  const totalNew = n('New');
  const totalCalled = c.length - totalNew;
  const interestedCount = n('Interested');
  const appointmentsCount = state.D.appts.length;
  const conversionRate = c.length ? Math.round((interestedCount / c.length) * 100) : 0;

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>Commercial Operations Dashboard</h2>
        <p class="page-subtitle">High-level calling throughput, conversion funnel and live telemarketing audit log.</p>
      </div>
      <div class="page-actions">
        <button class="btn" data-act="go" data-p="companies">View Leads</button>
        <button class="btn pri" data-act="go" data-p="queue">
          ${IC.phone} Open Call Queue
        </button>
      </div>
    </div>

    <!-- Stripe-Style KPI Metric Grid -->
    <div class="g4">
      <div class="card">
        <small>${IC.companies} Total Leads</small>
        <b>${c.length}</b>
        <span class="mu" style="font-size:11.5px;margin:4px 0 0">Across ${state.D.events.length} active campaigns</span>
      </div>
      <div class="card">
        <small>${IC.phone} Total Contacted</small>
        <b>${totalCalled}</b>
        <span class="mu" style="font-size:11.5px;margin:4px 0 0">${Math.round((totalCalled / Math.max(1, c.length)) * 100)}% campaign coverage</span>
      </div>
      <div class="card">
        <small>${IC.checkCircle} Interested Leads</small>
        <b style="color:var(--color-success)">${interestedCount}</b>
        <span class="mu" style="font-size:11.5px;margin:4px 0 0">${conversionRate}% conversion rate</span>
      </div>
      <div class="card">
        <small>${IC.appts} Appointments Booked</small>
        <b style="color:var(--accent-primary)">${appointmentsCount}</b>
        <span class="mu" style="font-size:11.5px;margin:4px 0 0">In sales pipeline</span>
      </div>
    </div>

    <!-- Funnel Breakdown & Recent Activity -->
    <div class="g2">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3>Lead Disposition Breakdown</h3>
          <span class="mu" style="font-size:12px">${c.length} total</span>
        </div>

        ${ST.map(s => {
          const count = n(s);
          const pct = Math.round((count / mx) * 100);
          return `
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:12.5px">
                <span class="pill ${PILL_CLASS[s]}">${s}</span>
                <span class="tabular" style="font-weight:600">${count} <small class="mu">(${Math.round((count / Math.max(1, c.length)) * 100)}%)</small></span>
              </div>
              <div class="pg" style="margin:0"><i class="bl" data-w="${pct}"></i></div>
            </div>`;
        }).join('')}
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3>Recent Operations Audit</h3>
          <span class="mu" style="font-size:12px">Live activity stream</span>
        </div>

        <div style="max-height:280px;overflow-y:auto;padding-right:4px">
          ${state.D.log.length ? state.D.log.slice(0, 10).map(l => {
            const [time, ...rest] = l.split(' – ');
            return `
              <div class="lg">
                <span class="lg-time">${esc(time || '')}</span>
                <span>${esc(rest.join(' – ') || l)}</span>
              </div>`;
          }).join('') : '<p class="mu">No operations logged yet.</p>'}
        </div>
      </div>
    </div>`;
}
