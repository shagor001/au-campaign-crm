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
  theme: 'light',
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
      { id: 1, name: 'Melbourne Build Expo 2026', start: '2026-06-18', end: '2026-06-19', where: 'Melbourne Convention Centre' },
      { id: 2, name: 'Global Sourcing Expo Australia', start: '2026-07-14', end: '2026-07-16', where: 'ICC Sydney' }
    ],
    log: [],
    companies: [
      { id: 1, name: 'Sample Builders Pty Ltd', phone: '0400 000 001', contact: 'John Doe', stand: '3x3 Shell Scheme', ev: 1, status: 'New', cb: '', notes: '' },
      { id: 2, name: 'Sample Sourcing Co', phone: '0400 000 002', contact: 'Sarah Smith', stand: '6x3 Space Only', ev: 2, status: 'Interested', cb: '', notes: '' },
      { id: 3, name: 'Sample Supplies', phone: '0400 000 003', contact: 'Mike Brown', stand: '3x3 Shell Scheme', ev: 1, status: 'No Answer', cb: '', notes: '' },
      { id: 4, name: 'Sample Trading', phone: '0400 000 004', contact: 'Emma Wilson', stand: '4x3 Shell Scheme', ev: 2, status: 'Callback', cb: today(), notes: '' }
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
state.D.companies = state.D.companies || [];
state.D.agents = state.D.agents || [{ id: 1, n: 'Agent One', e: 'agent1@crm.au', p: 'agent123' }];
state.D.reports = state.D.reports || [];
state.D.log = state.D.log || [];
state.D.appts = state.D.appts || [];
