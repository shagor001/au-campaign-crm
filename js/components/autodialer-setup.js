// ==========================================================================
// AU Campaign CRM — Auto Dialer Configuration Modal
// ==========================================================================

import { state } from '../state.js';
import { ST, PILL_CLASS, IC } from '../config.js';
import { $, esc } from '../utils/dom.js';

export function updateAdModalCount(eventId) {
  const checks = Array.from(document.querySelectorAll('.ad-st-check:checked')).map(c => c.value);
  const count = state.D.companies.filter(c => c.ev == eventId && checks.includes(c.status)).length;
  const cntEl = $('#ad-total-count');
  const btn = $('#ad-launch-btn');
  if (cntEl) cntEl.textContent = count + ' leads';
  if (btn) btn.disabled = count === 0;
}

export function openAdSetup(eventId) {
  const e = state.D.events.find(x => x.id == eventId);
  if (!e) return;
  const currentStatuses = state.AD.ev == eventId ? state.AD.statuses : ['New', 'No Answer'];
  const companies = state.D.companies.filter(x => x.ev == eventId);

  const m = document.createElement('div');
  m.id = 'm';
  m.innerHTML = `
    <div class="mb" style="max-width:520px">
      <div class="mb-header">
        <div>
          <h3 style="display:flex;align-items:center;gap:6px">${IC.zap} Auto Dialer Setup</h3>
          <small class="mu">${esc(e.name)}</small>
        </div>
        <button class="mb-close" data-act="x">&times;</button>
      </div>
      <form id="fad" data-ev="${eventId}">
        <div class="form-field">
          <label style="margin-bottom:6px">Select Target Lead Dispositions to Call:</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="ad-status-list">
            ${ST.map(s => {
              const count = companies.filter(c => c.status === s).length;
              const checked = currentStatuses.includes(s) ? 'checked' : '';
              return `
                <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg-app);border:1px solid var(--border-default);border-radius:var(--radius-sm);cursor:pointer">
                  <span style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="statuses" value="${s}" ${checked} class="ad-st-check">
                    <span class="pill ${PILL_CLASS[s]}" style="padding:1px 6px;font-size:10.5px">${s}</span>
                  </span>
                  <b class="tabular" style="font-size:12px;color:var(--tx-muted)">${count}</b>
                </label>`;
            }).join('')}
          </div>
        </div>

        <div class="form-field" style="margin-top:10px">
          <label>Delay Countdown Before Auto-Dialing Each Lead:</label>
          <select name="delay" id="ad-delay">
            <option value="0" ${state.AD.delay === 0 ? 'selected' : ''}>Manual (Wait for agent to click Dial)</option>
            <option value="3" ${state.AD.delay === 3 ? 'selected' : ''}>3 seconds countdown</option>
            <option value="5" ${state.AD.delay === 5 ? 'selected' : ''}>5 seconds countdown (Recommended)</option>
            <option value="8" ${state.AD.delay === 8 ? 'selected' : ''}>8 seconds countdown</option>
          </select>
        </div>

        <div class="form-field" style="margin-top:6px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12.5px;color:var(--tx-primary)">
            <input type="checkbox" name="autoOpenTel" ${state.AD.autoOpenTel ? 'checked' : ''}>
            <span>Automatically trigger telephony softphone (tel:)</span>
          </label>
        </div>

        <div id="ad-count-preview" style="background:var(--bg-app);border:1px solid var(--border-default);padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;margin:10px 0;display:flex;justify-content:space-between;align-items:center">
          <span class="mu">Target Leads in Queue:</span>
          <b id="ad-total-count" class="tabular" style="font-size:16px;color:var(--accent-primary)">0 leads</b>
        </div>

        <div class="row" style="justify-content:flex-end;margin-top:14px;gap:8px">
          <button type="button" class="btn" data-act="x">Cancel</button>
          <button class="btn pri" id="ad-launch-btn">
            ${IC.zap} Launch Auto Dialer
          </button>
        </div>
      </form>
    </div>`;
  document.body.append(m);
  updateAdModalCount(eventId);
}
