// ==========================================================================
// AU Campaign CRM — Call History & Timeline Thread
// ==========================================================================

import { esc } from '../utils/dom.js';
import { fdt } from '../utils/dates.js';
import { PILL_CLASS, IC } from '../config.js';

export function getHistoryThreadHTML(company) {
  const history = company?.history || [];
  if (!history.length && !company?.notes) {
    return `<div class="history-thread" style="text-align:center;color:var(--tx-muted);font-size:12px;padding:12px">No prior call logs recorded for this company.</div>`;
  }

  const displayItems = [...history];
  if (!displayItems.length && company.notes) {
    displayItems.push({
      at: company.at || new Date().toISOString(),
      by: company.by || 'Agent',
      status: company.status || 'Updated',
      notes: company.notes
    });
  }

  return `
    <div style="margin-top:20px">
      <small class="mu" style="font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.04em;display:flex;align-items:center;gap:6px">
        ${IC.clock} Interaction Audit History (${displayItems.length} attempts):
      </small>
      <div class="history-thread">
        ${displayItems.map(item => `
          <div class="history-item">
            <div style="flex:1">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
                <span style="font-weight:600;color:var(--tx-primary)">${esc(item.by || 'Agent')}</span>
                <span class="history-time">${item.at ? fdt(item.at) : 'Prior note'}</span>
              </div>
              <div style="margin:2px 0 4px">
                <span class="pill ${PILL_CLASS[item.status] || 'pill-new'}" style="padding:1px 6px;font-size:10.5px">${esc(item.status || 'Note')}</span>
              </div>
              <div style="color:var(--tx-secondary);font-size:12.5px;line-height:1.4">${esc(item.notes || '(No notes recorded)')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}
