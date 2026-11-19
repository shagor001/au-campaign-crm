// ==========================================================================
// AU Campaign CRM — Application Router & Enterprise Layout Shell
// ==========================================================================

import { state } from './state.js';
import { isA, who } from './services/auth.js';
import { API, IC } from './config.js';
import { $, esc } from './utils/dom.js';
import { dueN, getToastHTML } from './components/toast.js';

import { dashView } from './views/dashboard.js';
import { eventsView, eventDetailView } from './views/events.js';
import { autodialerView } from './views/autodialer.js';
import { companiesView } from './views/companies.js';
import { queueView } from './views/queue.js';
import { followupsView } from './views/followups.js';
import { appointmentsView } from './views/appointments.js';
import { agentsView } from './views/agents.js';
import { reportsView } from './views/reports.js';

const viewMap = {
  dash: dashView,
  events: eventsView,
  evd: eventDetailView,
  autodial: autodialerView,
  companies: companiesView,
  queue: queueView,
  follow: followupsView,
  appts: appointmentsView,
  agents: agentsView,
  report: reportsView
};

export function render() {
  const r = $('#root');
  if (!r) return;

  // ------------------------------------------------------------------------
  // Unauthenticated: Premium Minimalist Login
  // ------------------------------------------------------------------------
  if (!state.U) {
    r.innerHTML = `
      <div class="login">
        <div class="card">
          <div style="text-align:center;margin-bottom:20px">
            <div style="width:36px;height:36px;margin:0 auto 12px;background:var(--accent-primary);color:#fff;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(91,91,214,0.3)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h2>AU Campaign CRM</h2>
            <p class="mu" style="font-size:12.5px">Enterprise Outreach & Calling Portal</p>
          </div>
          <form id="fl">
            <div class="form-field">
              <label>Work Email</label>
              <input name="e" type="email" placeholder="name@company.com" required autofocus>
            </div>
            <div class="form-field">
              <label>Password</label>
              <input name="p" type="password" placeholder="••••••••" required>
            </div>
            <p class="err" id="er"></p>
            <button class="pri" style="width:100%;padding:9px;font-size:13.5px;margin-top:4px">Sign In to Workspace</button>
          </form>
          ${API ? '' : `
            <div style="background:var(--bg-app);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:12px;margin-top:20px;font-size:12px;color:var(--tx-secondary)">
              <b style="color:var(--tx-primary)">Demo Accounts:</b>
              <div style="margin-top:4px;display:flex;flex-direction:column;gap:2px">
                <div>• Administrator: <code>admin@crm.au</code> / <code>admin123</code></div>
                <div>• Call Agent: <code>agent1@crm.au</code> / <code>agent123</code></div>
              </div>
            </div>
          `}
        </div>
      </div>`;
    return;
  }

  // ------------------------------------------------------------------------
  // Navigation Hierarchy (Linear Grouping)
  // ------------------------------------------------------------------------
  const pendingQueue = state.D.companies.filter(x => x.status === 'New').length;
  const followupsDue = dueN();

  const operationsNav = [
    { key: 'dash', label: isA() ? 'My Dashboard' : 'Overview', icon: IC.dash },
    { key: 'queue', label: 'Call Queue', icon: IC.queue, badge: pendingQueue ? String(pendingQueue) : null },
    { key: 'follow', label: isA() ? 'My Follow-ups' : 'Follow-ups', icon: IC.follow, badge: followupsDue ? String(followupsDue) : null, urgent: followupsDue > 0 }
  ];

  const campaignNav = [
    { key: 'events', label: 'Campaigns & Events', icon: IC.events },
    { key: 'companies', label: 'Companies Directory', icon: IC.companies },
    { key: 'appts', label: 'Sales Appointments', icon: IC.appts }
  ];

  const managementNav = isA() ? [
    { key: 'report', label: 'Report Issue', icon: IC.report }
  ] : [
    { key: 'agents', label: 'Team Agents', icon: IC.agents },
    { key: 'report', label: 'Audit Log & Issues', icon: IC.report }
  ];

  const allNavKeys = [...operationsNav, ...campaignNav, ...managementNav].map(n => n.key);
  if (!allNavKeys.includes(state.P) && state.P !== 'evd' && state.P !== 'autodial') {
    state.P = 'dash';
  }

  const activeViewFn = viewMap[state.P] || dashView;

  // Breadcrumbs text helper
  let breadcrumbCategory = 'Operations';
  let breadcrumbItem = 'Dashboard';
  if (['queue', 'follow'].includes(state.P)) {
    breadcrumbCategory = 'Operations';
    breadcrumbItem = state.P === 'queue' ? 'Call Queue' : 'Scheduled Follow-ups';
  } else if (['events', 'evd', 'autodial', 'companies', 'appts'].includes(state.P)) {
    breadcrumbCategory = 'Campaigns & Leads';
    if (state.P === 'events') breadcrumbItem = 'Events & Exhibitions';
    else if (state.P === 'evd') {
      const evObj = state.D.events.find(x => x.id == state.EV);
      breadcrumbItem = evObj ? evObj.name : 'Event Detail';
    } else if (state.P === 'autodial') {
      const evObj = state.D.events.find(x => x.id == state.AD.ev);
      breadcrumbItem = `Auto Dialer · ${evObj ? evObj.name : 'Session'}`;
    } else if (state.P === 'companies') breadcrumbItem = 'Companies Directory';
    else if (state.P === 'appts') breadcrumbItem = 'Sales Pipeline';
  } else if (['agents', 'report'].includes(state.P)) {
    breadcrumbCategory = 'Management';
    breadcrumbItem = state.P === 'agents' ? 'Agent Team Roster' : 'System Audit & Reports';
  }

  // User Initials
  const userName = who();
  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AU';

  r.innerHTML = `
    <div class="app">
      <!-- Linear-Inspired Left Navigation Sidebar -->
      <aside>
        <div class="brand">
          <div class="brand-wrapper">
            <div class="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div class="brand-info">
              <span class="brand-title">AU Campaign CRM</span>
              <span class="brand-subtitle">Commercial Outreach</span>
            </div>
          </div>
        </div>

        <nav>
          <div class="nav-section-label">Operations</div>
          ${operationsNav.map(n => renderNavItem(n)).join('')}

          <div class="nav-section-label">Campaigns & Leads</div>
          ${campaignNav.map(n => renderNavItem(n)).join('')}

          <div class="nav-section-label">${isA() ? 'Help & Support' : 'Administration'}</div>
          ${managementNav.map(n => renderNavItem(n)).join('')}
        </nav>

        <div class="user-box">
          <div class="user-profile-row">
            <div class="user-avatar">${esc(userInitials)}</div>
            <div class="user-details">
              <div class="user-name" title="${esc(userName)}">${esc(userName)}</div>
              <span class="user-role-badge">${isA() ? 'Agent' : 'Administrator'}</span>
            </div>
          </div>
          <div class="user-actions">
            <button class="theme-toggle-btn" data-act="theme" title="Toggle Light / Dark Interface">
              ${state.theme === 'dark' ? IC.sun : IC.moon}
              <span>${state.theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button class="out" data-act="out" title="Sign out of CRM session">
              ${IC.logout}
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Column with Top Bar & Views -->
      <div class="app-main-col">
        <header class="top-bar">
          <div class="top-bar-left">
            <div class="breadcrumbs">
              <span>${breadcrumbCategory}</span>
              <span class="bc-sep">/</span>
              <span class="bc-active">${esc(breadcrumbItem)}</span>
            </div>
          </div>
        </header>

        <main>
          ${activeViewFn()}
        </main>
      </div>
    </div>
    ${getToastHTML()}`;

  // Animate progress bars safely
  setTimeout(() => {
    document.querySelectorAll('.pg i').forEach(i => {
      const w = i.dataset.w;
      if (w !== undefined) i.style.width = w + '%';
    });
  }, 40);
}

function renderNavItem(n) {
  const isCurrent = state.P === n.key || (n.key === 'events' && (state.P === 'evd' || state.P === 'autodial'));
  return `
    <button data-act="go" data-p="${n.key}" class="nav-item ${isCurrent ? 'on' : ''}">
      <span class="nav-label">${n.icon} <span>${n.label}</span></span>
      ${n.badge ? `<span class="nav-badge ${n.urgent ? 'urgent' : ''}">${n.badge}</span>` : ''}
    </button>`;
}
