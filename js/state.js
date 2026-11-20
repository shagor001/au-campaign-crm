import { API, USERS } from './config.js';
import { today } from './utils/dates.js';

// Central Application State
export const state = {
  D: null,
  U: null,
  PW: '',
  ROLE: '',
  P: 'dash',
  F: { q: '', ev: '', st: '', sort: 'name', dir: 1 },
  AF: 'All',
  EV: null,
  CID: null,
  theme: 'light',
  sidebarCollapsed: false,
  AD: {
    ev: null,
    statuses: ['New', 'No Answer'],
    delay: 5,
    autoOpenTel: true,
    list: [],
    idx: 0,
    state: 'ready',
    countdown: 0,
    timer: null,
    stats: { total: 0, disp: {} }
  }
};

// Theme initialization
state.theme = localStorage.getItem('aucrm_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', state.theme);

export const toggleTheme = () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('aucrm_theme', state.theme);
};

// Sidebar collapse initialization
try {
  state.sidebarCollapsed = localStorage.getItem('aucrm_sidebar') === 'true';
} catch (e) {}

export const toggleSidebar = () => {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  try {
    localStorage.setItem('aucrm_sidebar', state.sidebarCollapsed);
  } catch (e) {}
};

// State restore from localStorage
try {
  state.D = JSON.parse(localStorage.getItem('aucrm'));
  state.U = localStorage.getItem('aucrm_u');
  state.PW = localStorage.getItem('aucrm_p') || '';
  state.ROLE = localStorage.getItem('aucrm_r') || '';
} catch (e) {}

if (API) {
  state.D = null;
}

if (!state.D) {
  const yd = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  state.D = API ? { events: [], companies: [], appts: [], agents: [], reports: [], log: [] } : {
    events: [
      { id: 1, name: 'Melbourne Build Expo 2026', start: '2026-06-18', end: '2026-06-19', where: 'Melbourne Convention Centre', assignedAgent: 'agent1@crm.au' },
      { id: 2, name: 'Global Sourcing Expo Australia', start: '2026-07-14', end: '2026-07-16', where: 'ICC Sydney', assignedAgent: '' }
    ],
    log: [],
    companies: [
      {
        id: 1,
        name: 'Shape Tins',
        category: 'import',
        salesperson: 'Not allocated',
        website: 'https://shapetins.com.au/',
        phone: '0409 905 251',
        email: 'hello@shapetins.com.au',
        linkedin: '',
        address: '14 Production Way',
        country: 'Australia',
        contact: 'Sarah Miller',
        stand: 'Stand G43',
        ev: 1,
        status: 'Callback',
        cb: today() + 'T14:00',
        eventsAttended: [
          { evId: 1, stand: 'Stand G43', status: 'Callback', cb: today() + 'T14:00' },
          { evId: 2, stand: 'Stand B12', status: 'New', cb: '' }
        ],
        contacts: [],
        notes: 'Spoke with office coordinator. Requested full catalog info pack via email.',
        history: [
          { at: new Date().toISOString(), by: 'Agent One', status: 'Callback', notes: 'Spoke with office coordinator. Requested full catalog info pack via email.' }
        ]
      },
      { id: 2, name: 'Sample Sourcing Co', category: 'Manufacturing', salesperson: 'Not allocated', website: 'https://samplesourcing.com.au', phone: '0400 000 002', email: 'sales@samplesourcing.com.au', linkedin: '', address: '45 Trade Rd', country: 'Australia', contact: 'Sarah Smith', stand: '6x3 Space Only', ev: 2, status: 'Interested', cb: '', notes: '' },
      { id: 3, name: 'Sample Supplies', category: 'Retail', salesperson: 'Not allocated', website: '', phone: '0400 000 003', email: 'info@samplesupplies.com.au', linkedin: '', address: '', country: 'Australia', contact: 'Mike Brown', stand: '3x3 Shell Scheme', ev: 1, status: 'No Answer', cb: '', notes: '' },
      { id: 4, name: 'Sample Trading', category: 'Wholesale', salesperson: 'Not allocated', website: '', phone: '0400 000 004', email: 'contact@sampletrading.com.au', linkedin: '', address: '', country: 'Australia', contact: 'Emma Wilson', stand: '4x3 Shell Scheme', ev: 2, status: 'Callback', cb: today(), notes: '' }
    ],
    agents: [
      { id: 1, n: 'Agent One', e: 'agent1@crm.au', p: 'agent123' }
    ],
    appts: [
      { id: 1, co: 2, contact: 'Alex Rivera', stand: 'Shell Scheme 3x3', status: 'New Appointment', next: yd + 'T09:00', calls: 0, quote: '', with: 'Sales Rep', by: 'agent1@crm.au' },
      { id: 2, co: 3, contact: 'Sam Taylor', stand: 'Floor Space 3x3', status: 'Preparing Quote', next: today() + 'T15:00', calls: 1, last: yd, quote: '', with: 'Sales Rep', by: 'agent1@crm.au' },
      { id: 3, co: 4, contact: 'Jordan Lee', stand: 'Shell Scheme 3x6', status: 'Quoted', next: '', calls: 2, last: yd, quote: 'SP-0001 draft', with: 'Sales Rep', by: 'agent1@crm.au' }
    ],
    reports: []
  };
}

state.D.events = state.D.events || [];
// Ensure all events have assignedAgent defined
state.D.events.forEach(e => {
  if (e.assignedAgent === undefined) {
    e.assignedAgent = e.id === 1 ? 'agent1@crm.au' : '';
  }
});
state.D.companies = state.D.companies || [];
// Ensure company 1 has Shape Tins multi-event attendance for demo/testing
if (state.D.companies.length && (!state.D.companies[0].eventsAttended || !state.D.companies[0].eventsAttended.length)) {
  const c1 = state.D.companies[0];
  c1.name = 'Shape Tins';
  c1.category = c1.category || 'import';
  c1.salesperson = c1.salesperson || 'Not allocated';
  c1.website = c1.website || 'https://shapetins.com.au/';
  c1.phone = c1.phone || '0409 905 251';
  c1.email = c1.email || 'hello@shapetins.com.au';
  c1.country = c1.country || 'Australia';
  c1.stand = c1.stand || 'Stand G43';
  c1.eventsAttended = [
    { evId: 1, stand: 'Stand G43', status: c1.status || 'Callback', cb: c1.cb || (today() + 'T14:00') },
    { evId: 2, stand: 'Stand B12', status: 'New', cb: '' }
  ];
}
state.D.agents = state.D.agents || [{ id: 1, n: 'Agent One', e: 'agent1@crm.au', p: 'agent123' }];
state.D.reports = state.D.reports || [];
state.D.log = state.D.log || [];
state.D.appts = state.D.appts || [];
