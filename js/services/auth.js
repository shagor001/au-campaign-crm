import { state } from '../state.js';
import { API, USERS } from '../config.js';

export const ALL = () => [...USERS, ...(state.D?.agents || [])];

export const isA = () => (API ? state.ROLE !== 'admin' : state.U !== USERS[0].e);

export const who = () => (ALL().find(u => u.e === state.U) || {}).n || state.U;

export const logout = () => {
  state.U = null;
  state.PW = '';
  state.ROLE = '';
  try {
    ['aucrm_u', 'aucrm_p', 'aucrm_r'].forEach(k => localStorage.removeItem(k));
  } catch (x) {}
};
