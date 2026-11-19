// ==========================================================================
// AU Campaign CRM — Toast Alert Notification System
// ==========================================================================

import { state } from '../state.js';
import { isA } from '../services/auth.js';
import { today } from '../utils/dates.js';
import { IC } from '../config.js';

export const dueN = () => state.D.companies.filter(x =>
  x.status === 'Callback' && x.cb && x.cb <= today() && (!isA() || x.by === state.U)
).length;

export const overN = () => state.D.companies.filter(x =>
  x.status === 'Callback' && x.cb && x.cb < today() && (!isA() || x.by === state.U)
).length;

export const getToastHTML = () => {
  const due = dueN();
  const over = overN();
  if (!due || state.P === 'follow') return '';

  return `
    <div class="toast ${over ? 'red' : ''}" data-act="go" data-p="follow">
      ${IC.follow}
      <span>${due} scheduled callback${due > 1 ? 's' : ''} due ${over ? `(${over} overdue)` : ''}</span>
    </div>`;
};
