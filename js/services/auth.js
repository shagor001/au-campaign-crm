import { state } from '../state.js';
import { API, USERS } from '../config.js';

export const ALL = () => [...USERS, ...(state.D?.agents || [])];

export const getAgentName = (emailOrName) => {
  if (!emailOrName) return 'Agent';
  const val = String(emailOrName).trim();
  const valLower = val.toLowerCase();
  const found = ALL().find(u => 
    (u.e && u.e.toLowerCase() === valLower) || 
    (u.email && u.email.toLowerCase() === valLower) || 
    (u.n && u.n.toLowerCase() === valLower) || 
    (u.name && u.name.toLowerCase() === valLower)
  );
  if (found && (found.n || found.name)) return found.n || found.name;
  if (val.includes('@')) {
    const local = val.split('@')[0];
    return local.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return val;
};

export const isA = () => (API ? state.ROLE !== 'admin' : state.U !== USERS[0].e);

export const who = () => getAgentName(state.U);

// Event Assignment & Role Access Guards
export const isEventAccessible = (eventOrId, userEmail = state.U) => {
  if (!userEmail) return false;
  // Administrators always have full access to all campaigns
  if (!isA()) return true;

  const event = typeof eventOrId === 'object' && eventOrId !== null
    ? eventOrId
    : state.D?.events?.find(x => x.id == eventOrId);

  if (!event) return false;

  // Agents only have access to events explicitly assigned to them
  if (event.assignedAgent && event.assignedAgent.toLowerCase() === userEmail.toLowerCase()) {
    return true;
  }
  if (Array.isArray(event.assignedAgents) && event.assignedAgents.some(a => a.toLowerCase() === userEmail.toLowerCase())) {
    return true;
  }

  return false;
};

export const getAccessibleEvents = (userEmail = state.U) => {
  if (!state.D?.events) return [];
  if (!isA()) return state.D.events;
  return state.D.events.filter(e => isEventAccessible(e, userEmail));
};

export const getAccessibleEventIds = (userEmail = state.U) => {
  return getAccessibleEvents(userEmail).map(e => e.id);
};

export const logout = () => {
  state.U = null;
  state.PW = '';
  state.ROLE = '';
  try {
    ['aucrm_u', 'aucrm_p', 'aucrm_r'].forEach(k => localStorage.removeItem(k));
  } catch (x) {}
};
