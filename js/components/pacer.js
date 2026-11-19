// ==========================================================================
// AU Campaign CRM — Daily Pacer Goal Tracker
// ==========================================================================

import { state } from '../state.js';
import { DAILY_CALL_GOAL, IC } from '../config.js';
import { today } from '../utils/dates.js';

export function getPacerHTML() {
  const callsToday = state.D.companies.filter(x => x.at === today() && x.by === state.U).length;
  const interestedToday = state.D.companies.filter(x => x.at === today() && x.by === state.U && x.status === 'Interested').length;
  const pct = Math.min(100, Math.round((callsToday / DAILY_CALL_GOAL) * 100));

  return `
    <div class="pacer-card">
      <div class="pacer-stats">
        <span>${IC.phone} Daily Calling Target:</span>
        <b>${callsToday}</b>
        <span>/ ${DAILY_CALL_GOAL} calls (${pct}%)</span>
      </div>
      <div style="flex:1;max-width:260px;margin:0 16px">
        <div class="pg" style="margin:0"><i class="bl" data-w="${pct}"></i></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--color-success)">
        ${IC.checkCircle}
        <span class="tabular">${interestedToday} Interested Today</span>
      </div>
    </div>`;
}
