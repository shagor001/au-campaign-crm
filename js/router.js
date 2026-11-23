// ==========================================================================
// AU Campaign CRM — Application Router & Enterprise Layout Shell
// ==========================================================================

import { state } from './state.js';
import { isA, who, getAccessibleEventIds } from './services/auth.js';
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
import { companyDetailView } from './views/company-detail.js';

const viewMap = {
  dash: dashView,
  events: eventsView,
  evd: eventDetailView,
  autodial: autodialerView,
  companies: companiesView,
  co: companyDetailView,
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
  const accessibleEventIds = isA() ? getAccessibleEventIds() : null;
  const pendingQueue = state.D.companies.filter(x => x.status === 'New' && (!accessibleEventIds || accessibleEventIds.includes(x.ev))).length;
  const followupsDue = dueN();

  const operationsNav = [
    { key: 'dash', label: isA() ? 'My Dashboard' : 'Overview', icon: IC.dash },
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
  if (!allNavKeys.includes(state.P) && state.P !== 'evd' && state.P !== 'autodial' && state.P !== 'co') {
    state.P = 'dash';
  }

  // Synchronize browser URL hash with current validated state
  const desiredHash = getHashForState();
  if (window.location.hash !== desiredHash) {
    try {
      history.replaceState(null, '', desiredHash);
    } catch (e) {
      window.location.hash = desiredHash;
    }
  }

  const activeViewFn = viewMap[state.P] || dashView;

  // Breadcrumbs text helper
  let breadcrumbCategory = 'Operations';
  let breadcrumbItem = 'Dashboard';
  if (state.P === 'follow') {
    breadcrumbCategory = 'Operations';
    breadcrumbItem = 'Scheduled Follow-ups';
  } else if (['events', 'evd', 'autodial', 'companies', 'co', 'appts'].includes(state.P)) {
    breadcrumbCategory = 'Campaigns & Leads';
    if (state.P === 'events') breadcrumbItem = 'Events & Exhibitions';
    else if (state.P === 'evd') {
      const evObj = state.D.events.find(x => x.id == state.EV);
      breadcrumbItem = evObj ? evObj.name : 'Event Detail';
    } else if (state.P === 'autodial') {
      const evObj = state.D.events.find(x => x.id == state.AD.ev);
      breadcrumbItem = `Auto Dialer · ${evObj ? evObj.name : 'Session'}`;
    } else if (state.P === 'companies') breadcrumbItem = 'Companies Directory';
    else if (state.P === 'co') {
      const cObj = state.D.companies.find(x => x.id == state.CID);
      breadcrumbItem = cObj ? cObj.name : 'Company Detail';
    }
    else if (state.P === 'appts') breadcrumbItem = 'Sales Pipeline';
  } else if (['agents', 'report'].includes(state.P)) {
    breadcrumbCategory = 'Management';
    breadcrumbItem = state.P === 'agents' ? 'Agent Team Roster' : 'System Audit & Reports';
  }

  // User Initials
  const userName = who();
  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AU';

  r.innerHTML = `
    <div class="app ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
      <!-- Linear-Inspired Left Navigation Sidebar -->
      <aside class="${state.sidebarCollapsed ? 'collapsed' : ''}">
        <!-- Floating Border Edge Collapse Button (Circular Chevron) -->
        <button class="sidebar-edge-toggle" data-act="toggle-sidebar" aria-label="${state.sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}" title="${state.sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="${state.sidebarCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'}"/>
          </svg>
        </button>

        <div class="brand">
          <div class="brand-wrapper">
            <div class="brand-icon" ${state.sidebarCollapsed ? 'title="AU Campaign CRM"' : ''}>
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
            <div class="user-avatar" title="${esc(userName)}">${esc(userInitials)}</div>
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
          <div class="top-bar-right" style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-sm" data-act="ai-settings" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:6px 12px;background:var(--bg-surface);border:1px solid var(--border-default)" title="Configure Google Gemini Free AI Call Summaries">
              ${IC.sparkles} <span>AI Settings</span>
            </button>
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
  const isCurrent = state.P === n.key ||
    (n.key === 'events' && (state.P === 'evd' || state.P === 'autodial')) ||
    (n.key === 'companies' && state.P === 'co');
  return `
    <button data-act="go" data-p="${n.key}" class="nav-item ${isCurrent ? 'on' : ''}" title="${n.label}">
      <span class="nav-label">${n.icon} <span>${n.label}</span></span>
      ${n.badge ? `<span class="nav-badge ${n.urgent ? 'urgent' : ''}">${n.badge}</span>` : ''}
    </button>`;
}

export function getHashForState() {
  if (state.P === 'co' && state.CID) {
    const evQuery = state.EV ? `?ev=${state.EV}` : '';
    return `#/companies/${state.CID}${evQuery}`;
  }
  if (state.P === 'evd' && state.EV) {
    return `#/events/${state.EV}`;
  }
  if (state.P === 'autodial') {
    return state.AD.ev ? `#/autodial?ev=${state.AD.ev}` : `#/autodial`;
  }
  return `#/${state.P || 'dash'}`;
}

export function parseRouteFromHash() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '').trim();
  if (!raw) return { p: 'dash' };

  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const primary = (segments[0] || '').toLowerCase();
  const param = segments[1] || null;

  const query = {};
  if (queryPart) {
    try {
      new URLSearchParams(queryPart).forEach((v, k) => { query[k] = v; });
    } catch (e) {}
  }

  if (primary === 'companies') {
    if (param) return { p: 'co', cid: +param, ev: query.ev ? +query.ev : undefined };
    return { p: 'companies' };
  }
  if (primary === 'co') {
    const id = param || query.id;
    return { p: 'co', cid: id ? +id : null, ev: query.ev ? +query.ev : undefined };
  }
  if (primary === 'queue') {
    return { p: 'companies' };
  }
  if (primary === 'events') {
    if (param) return { p: 'evd', ev: +param };
    return { p: 'events' };
  }
  if (primary === 'evd') {
    const id = param || query.id;
    return { p: 'evd', ev: id ? +id : null };
  }
  if (primary === 'autodial') {
    const evId = param || query.ev || query.id;
    return { p: 'autodial', ev: evId ? +evId : null };
  }

  const validPages = ['dash', 'dashboard', 'follow', 'appts', 'agents', 'report'];
  if (validPages.includes(primary)) {
    return { p: primary === 'dashboard' ? 'dash' : primary };
  }

  return { p: 'dash' };
}

export function navigate(target, params = {}) {
  let newHash = '';
  if (target === 'co') {
    const id = params.id || params.cid || state.CID;
    state.CID = id ? +id : null;
    if (params.ev !== undefined) state.EV = params.ev ? +params.ev : null;
    state.P = 'co';
    const evQuery = state.EV ? `?ev=${state.EV}` : '';
    newHash = state.CID ? `#/companies/${state.CID}${evQuery}` : `#/companies`;
  } else if (target === 'evd') {
    const id = params.id || params.ev || state.EV;
    state.EV = id ? +id : null;
    state.P = 'evd';
    newHash = state.EV ? `#/events/${state.EV}` : `#/events`;
  } else if (target === 'autodial') {
    const evId = params.ev || state.AD.ev;
    state.AD.ev = evId ? +evId : null;
    state.P = 'autodial';
    newHash = state.AD.ev ? `#/autodial?ev=${state.AD.ev}` : `#/autodial`;
  } else {
    state.P = target || 'dash';
    newHash = `#/${state.P}`;
  }

  if (target !== 'autodial') {
    clearInterval(state.AD.timer);
  }

  if (window.location.hash !== newHash) {
    window.location.hash = newHash;
  } else {
    render();
  }
  window.scrollTo(0, 0);
}

export function handleHashChange() {
  if (!state.U) {
    render();
    return;
  }
  const route = parseRouteFromHash();
  if (route.p !== 'autodial') {
    clearInterval(state.AD.timer);
  }

  state.P = route.p;
  if (route.cid !== undefined) state.CID = route.cid;
  if (route.ev !== undefined) {
    if (route.p === 'autodial') state.AD.ev = route.ev;
    else state.EV = route.ev;
  }

  if (route.p === 'autodial' && state.AD.state === 'countdown' && state.AD.timer) {
    return;
  }

  render();
  window.scrollTo(0, 0);
}
