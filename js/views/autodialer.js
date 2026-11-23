// ==========================================================================
// AU Campaign CRM — Auto Dialer Engine & Session UI (High Efficiency)
// ==========================================================================

import { state } from '../state.js';
import { esc } from '../utils/dom.js';
import { isA, isEventAccessible, getAgentName } from '../services/auth.js';
import { PILL_CLASS, IC, NOTE_SNIPPETS } from '../config.js';
import { log, save } from '../services/sync.js';
import { getAuTimezoneInfo, getQuickCallbackTime, formatFriendlyDateTime, today, formatDateRange } from '../utils/dates.js';
import { getCompanyEvents, getCompanyContacts } from './company-detail.js';

export function startAdLead(renderFn) {
  clearInterval(state.AD.timer);
  state.AD.timer = null;
  if (!state.AD.list || state.AD.idx >= state.AD.list.length) {
    state.AD.state = 'done';
    if (renderFn) renderFn();
    return;
  }
  const c = state.AD.list[state.AD.idx];
  if (state.AD.delay > 0) {
    state.AD.state = 'countdown';
    state.AD.countdown = state.AD.delay;
    if (renderFn) renderFn();
    clearInterval(state.AD.timer);
    state.AD.timer = setInterval(() => {
      state.AD.countdown--;
      if (state.AD.countdown <= 0) {
        clearInterval(state.AD.timer);
        state.AD.timer = null;
        state.AD.state = 'calling';
        log('Auto-dialled ' + c.name);
        save();
        if (renderFn) renderFn();
        if (state.AD.autoOpenTel && c.phone) {
          try {
            const clean = c.phone.replace(/[\s\-\(\)]/g, '');
            const telLink = document.createElement('a');
            telLink.href = 'tel:' + clean;
            telLink.style.display = 'none';
            document.body.appendChild(telLink);
            telLink.click();
            telLink.remove();
          } catch (e) {}
        }
      } else {
        const pill = document.querySelector('.ad-timer-pill');
        if (pill) {
          pill.innerHTML = `${IC.clock} Auto-dialing in ${state.AD.countdown}s...`;
        }
      }
    }, 1000);
  } else {
    state.AD.state = 'calling';
    if (renderFn) renderFn();
  }
}

export function autodialerView() {
  if (!isA()) {
    return `
      <div class="card" style="text-align:center;padding:56px 24px;max-width:600px;margin:32px auto">
        <div style="width:48px;height:48px;margin:0 auto 16px;background:var(--bg-subtle);color:var(--tx-muted);border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center">
          ${IC.shield}
        </div>
        <h3 style="font-size:18px;margin-bottom:8px">Auto Dialer is an Agent Tool</h3>
        <p class="mu" style="font-size:13px;line-height:1.5">
          The automated calling queue is designed for telemarketing agents. As an administrator, you manage campaigns, agents, and lead records.
        </p>
        <div style="margin-top:20px">
          <button class="btn pri" data-act="go" data-p="events">View Campaigns</button>
        </div>
      </div>`;
  }

  const e = state.D.events.find(x => x.id == state.AD.ev);
  if (!e) return `<h2>Event Not Found</h2><button class="btn" data-act="go" data-p="events">${IC.arrowLeft} Back to Events</button>`;

  if (!isEventAccessible(e)) {
    return `
      <div class="card" style="text-align:center;padding:56px 24px;max-width:600px;margin:32px auto">
        <div style="width:48px;height:48px;margin:0 auto 16px;background:var(--color-danger-bg);color:var(--color-danger);border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center">
          ${IC.shield}
        </div>
        <h3 style="font-size:18px;margin-bottom:8px">Campaign Access Restricted</h3>
        <p class="mu" style="font-size:13px;line-height:1.5">
          You do not have access to run the Auto Dialer for <b>${esc(e.name)}</b> because this campaign is not assigned to your agent account.
        </p>
        <div style="margin-top:20px">
          <button class="btn pri" data-act="go" data-p="events">${IC.arrowLeft} Back to My Campaigns</button>
        </div>
      </div>`;
  }

  if (state.AD.state === 'done' || state.AD.idx >= state.AD.list.length) {
    return `
      <div style="margin-bottom:12px">
        <a class="lk" data-act="evco" data-id="${e.id}" style="display:inline-flex;align-items:center;gap:4px">
          ${IC.arrowLeft} Back to ${esc(e.name)}
        </a>
      </div>
      <div class="dialer-card" style="text-align:center;padding:48px 24px">
        <div style="width:48px;height:48px;margin:0 auto 14px;background:var(--color-success-bg);color:var(--color-success);border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center">
          ${IC.checkCircle}
        </div>
        <h2 style="justify-content:center;margin-bottom:6px">Auto-Dialer Session Complete</h2>
        <p class="mu">Successfully processed all target leads in <b>${esc(e.name)}</b>.</p>
        <div class="card" style="max-width:440px;margin:20px auto;text-align:left">
          <h3 style="font-size:14px;margin-bottom:12px">Session Summary</h3>
          <div class="row" style="justify-content:space-between;margin-bottom:8px">
            <span class="mu">Total Calls Completed:</span>
            <b class="tabular" style="font-size:16px">${state.AD.stats.total}</b>
          </div>
          ${Object.entries(state.AD.stats.disp).map(([st, cnt]) => `
            <div class="row" style="justify-content:space-between;margin-bottom:6px">
              <span class="pill ${PILL_CLASS[st] || 'pill-new'}">${st}</span>
              <b class="tabular">${cnt}</b>
            </div>
          `).join('')}
        </div>
        <div class="row" style="justify-content:center;gap:10px">
          <button class="btn" data-act="ad-setup" data-id="${e.id}">${IC.zap} Start Another Session</button>
          <button class="btn pri" data-act="evco" data-id="${e.id}">Return to Event Roster</button>
        </div>
      </div>`;
  }

  const c = state.AD.list[state.AD.idx];
  const progressPct = Math.round((state.AD.idx / state.AD.list.length) * 100);
  const tzInfo = c ? getAuTimezoneInfo(c.phone, e?.where) : null;

  const eventsList = getCompanyEvents(c);
  const contactsList = getCompanyContacts(c);

  const evName = e ? e.name : 'Outreach Campaign';
  const standName = c.stand ? (c.stand.toLowerCase().startsWith('stand') ? c.stand : 'Stand ' + c.stand) : 'Exhibition Stand';

  const displayPhone = c.phone || 'No phone on file';
  const cleanPhone = (c.phone || '').replace(/[\s\-\(\)]/g, '');
  const q = c.qualification || {};

  // History & Notes
  const notesList = [];
  if (Array.isArray(c.history) && c.history.length) {
    c.history.forEach(h => {
      if (h.notes) {
        notesList.push({
          ...h,
          by: getAgentName(h.by)
        });
      }
    });
  } else if (c.notes) {
    // Fallback: show top-level notes only when no history entries exist
    notesList.push({
      at: c.at || today(),
      by: getAgentName(c.by),
      notes: c.notes,
      status: c.status,
      contactSpokenTo: c.contact,
      qualification: c.qualification,
      aiSummary: c.aiSummary
    });
  }

  const selCtName = (c.contact && contactsList.some(ct => ct.name === c.contact))
    ? c.contact
    : (contactsList.find(ct => ct.isPrimary) ? contactsList.find(ct => ct.isPrimary).name : (contactsList[0] ? contactsList[0].name : ''));

  return `
    <div style="max-width:1320px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:20px">
      <!-- Top Navigation & Auto Dialer Session Controls -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="btn btn-sm" data-act="evco" data-id="${e.id}">
            ${IC.arrowLeft} Exit Auto Dialer to ${esc(e.name)}
          </button>
          <button class="btn btn-sm" data-act="go" data-p="companies">
            ${IC.companies} Companies Directory
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="pill pill-new" style="font-size:11.5px;padding:3px 9px">
            Lead ${state.AD.idx + 1} of ${state.AD.list.length} (${progressPct}%)
          </span>
          ${tzInfo ? tzInfo.badgeHtml : ''}
          ${state.AD.state === 'countdown' ? `
            <button class="ad-timer-pill ad-pulse" data-act="ad-dial" title="Click to dial immediately" style="background:var(--accent-subtle);border:1px solid var(--accent-border);border-radius:var(--radius-full);padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11.5px;color:var(--accent-text);display:inline-flex;align-items:center;gap:6px">
              ${IC.clock} Auto-dialing in ${state.AD.countdown}s... (Click to dial now)
            </button>
          ` : (state.AD.state === 'paused' ? `
            <span class="pill pill-wrong">${IC.pause} Paused</span>
          ` : `
            <span class="pill pill-interested">${IC.phone} Active Call</span>
          `)}
          <button class="btn btn-sm" data-act="ad-setup" data-id="${e.id}" title="Session Settings">
            ${IC.settings} Settings
          </button>
          <button class="btn btn-sm" data-act="ad-skip" title="Skip to next lead without logging">
            ${IC.skip} Skip Lead
          </button>
          ${state.AD.state === 'countdown' ? `
            <button class="btn btn-sm" data-act="ad-pause">${IC.pause} Pause</button>
          ` : (state.AD.state === 'paused' ? `
            <button class="btn btn-sm pri" data-act="ad-resume">${IC.play} Resume</button>
          ` : '')}
        </div>
      </div>

      <!-- Main Form: Wraps 2-Column Workspace and Stretched Disposition Card -->
      <form id="f-ad-log" data-id="${c.id}" data-ev="${e.id}" style="margin:0;display:flex;flex-direction:column;gap:20px">

        <!-- Top 2-Column Workspace Grid -->
        <div class="company-workspace-grid" style="display:grid;grid-template-columns:minmax(0, 1.35fr) minmax(0, 1fr);gap:20px;align-items:start">

          <!-- ============================================================= -->
          <!-- LEFT COLUMN: Live Call & Lead Qualification Terminal -->
          <!-- ============================================================= -->
          <div style="display:flex;flex-direction:column;gap:18px">

            <!-- Top Telephony / Calling Banner -->
            <div class="card" style="margin:0;padding:20px 24px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                <div>
                  <div style="font-size:16px;font-weight:700;color:var(--tx-primary);letter-spacing:-0.01em">
                    <span style="text-transform:uppercase">${esc(c.name)}</span>
                    <span style="font-weight:400;color:var(--tx-muted);margin-left:6px;font-size:13.5px">${esc(evName)} · ${esc(standName)}</span>
                  </div>
                  <div style="font-size:14px;color:var(--tx-secondary);font-family:var(--font-mono);margin-top:4px">
                    ${esc(displayPhone)}
                  </div>
                </div>
              </div>

              ${c.phone ? `
                <div style="text-align:center;margin:16px 0 6px">
                  <a class="btn" href="tel:${esc(cleanPhone)}" data-act="ad-dial" data-id="${c.id}" style="background:#10b981;color:#ffffff;border:none;padding:11px 28px;font-size:14px;font-weight:600;border-radius:var(--radius-sm);display:inline-flex;align-items:center;gap:8px;box-shadow:0 1px 3px rgba(16,185,129,0.3)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Call ${esc(displayPhone)}
                  </a>
                  <div id="ad-dial-status" class="mu" style="font-size:12px;margin-top:8px">
                    Calling ${esc(displayPhone)}. Answer your Dialpad app.
                  </div>
                </div>
              ` : `
                <div class="mu" style="text-align:center;margin:12px 0 4px;font-size:12.5px">
                  No telephone number on file for this lead.
                </div>
              `}
            </div>

            <!-- Card: LEAD QUALIFICATION (ASK AS SOON AS YOU'RE TALKING TO THEM) -->
            <div class="card" style="margin:0;padding:20px 22px">
              <div style="font-size:11.5px;font-weight:700;color:var(--tx-secondary);letter-spacing:0.04em;text-transform:uppercase;margin-bottom:14px">
                LEAD QUALIFICATION (ASK AS SOON AS YOU'RE TALKING TO THEM)
              </div>

              <div class="form-field" style="margin-bottom:12px">
                <label style="font-size:12.5px;font-weight:500;text-transform:none;letter-spacing:normal;color:var(--tx-primary);margin-bottom:4px">
                  Have they booked a shell scheme or floor space? <span style="color:var(--color-danger)">*</span>
                </label>
                <select name="spaceType" id="ad-q-spaceType">
                  <option value="">-</option>
                  <option value="Shell Scheme" ${q.spaceType === 'Shell Scheme' || (c.stand || '').toLowerCase().includes('shell') ? 'selected' : ''}>Shell Scheme</option>
                  <option value="Floor Space / Space Only" ${q.spaceType === 'Floor Space / Space Only' || (c.stand || '').toLowerCase().includes('space') ? 'selected' : ''}>Floor Space / Space Only</option>
                  <option value="Not yet booked / Deciding" ${q.spaceType === 'Not yet booked / Deciding' ? 'selected' : ''}>Not yet booked / Deciding</option>
                  <option value="Not exhibiting" ${q.spaceType === 'Not exhibiting' ? 'selected' : ''}>Not exhibiting</option>
                </select>
              </div>

              <div class="form-field" style="margin-bottom:12px">
                <label style="font-size:12.5px;font-weight:500;text-transform:none;letter-spacing:normal;color:var(--tx-primary);margin-bottom:4px">
                  Size of the space <span style="color:var(--color-danger)">*</span>
                </label>
                <input name="spaceSize" id="ad-q-spaceSize" placeholder="e.g. 3m x 3m" value="${esc(q.spaceSize || (c.stand && c.stand.match(/\d+x\d+|\d+m\s*x\s*\d+m/i) ? c.stand : ''))}">
              </div>

              <div class="form-field" style="margin-bottom:12px">
                <label style="font-size:12.5px;font-weight:500;text-transform:none;letter-spacing:normal;color:var(--tx-primary);margin-bottom:4px">
                  How often do they exhibit?
                </label>
                <input name="exhibitFrequency" id="ad-q-exhibitFrequency" placeholder="e.g. 1-2 times per year, First time" value="${esc(q.exhibitFrequency || '')}">
              </div>

              <div class="form-field" style="margin-bottom:12px">
                <label style="font-size:12.5px;font-weight:500;text-transform:none;letter-spacing:normal;color:var(--tx-primary);margin-bottom:4px">
                  What other expos do they attend?
                </label>
                <input name="otherExpos" id="ad-q-otherExpos" placeholder="e.g. Fine Food Australia, Sydney Build" value="${esc(q.otherExpos || '')}">
              </div>

              <div class="form-field" style="margin-bottom:0">
                <label style="font-size:12.5px;font-weight:500;text-transform:none;letter-spacing:normal;color:var(--tx-primary);margin-bottom:4px">
                  Customer Requirements / Notes
                </label>
                <textarea name="customerRequirements" id="ad-q-customerRequirements" rows="2" placeholder="e.g. Custom stand build, display lighting, AV equipment, budget, specific customer requests..." style="width:100%;box-sizing:border-box;font-size:13px">${esc(q.customerRequirements || q.requirements || '')}</textarea>
              </div>
            </div>

          </div>

          <!-- ============================================================= -->
          <!-- RIGHT COLUMN: Company Profile Reference, Contacts & Events -->
          <!-- ============================================================= -->
          <div style="display:flex;flex-direction:column;gap:18px">

            <!-- Company Details Card -->
            <div class="card" style="margin:0;padding:22px 24px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                <h3 style="margin:0;font-size:14.5px;font-weight:600;color:var(--tx-primary)">
                  Company Details
                </h3>
                <button type="button" class="btn btn-sm" data-act="co-edit" data-id="${c.id}" title="Edit company details">
                  ${IC.edit} Edit
                </button>
              </div>

              <div style="display:flex;flex-direction:column;gap:10px;font-size:12.5px">
                ${c.category ? `
                  <div class="detail-row">
                    <span class="detail-label">Industry</span>
                    <span class="detail-value" style="text-transform:capitalize">${esc(c.category)}</span>
                  </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Salesperson</span>
                  <span class="detail-value"><b style="color:var(--tx-primary)">${esc(c.salesperson || 'Not allocated')}</b></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Website</span>
                  <span class="detail-value">
                    ${c.website ? `
                      <a class="lk" href="${esc(c.website.startsWith('http') ? c.website : 'https://' + c.website)}" target="_blank" rel="noopener">
                        ${esc(c.website)}
                      </a>
                    ` : '<span class="mu">—</span>'}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Phone</span>
                  <span class="detail-value">
                    ${c.phone ? `
                      <a class="lk" href="tel:${esc(c.phone)}" style="font-family:var(--font-mono)">
                        ${IC.phone} ${esc(c.phone)}
                      </a>
                    ` : '<span class="mu">—</span>'}
                  </span>
                </div>
                ${c.altPhone ? `
                  <div class="detail-row">
                    <span class="detail-label">Alt Mobile</span>
                    <span class="detail-value" style="font-family:var(--font-mono)">${esc(c.altPhone)}</span>
                  </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Business email</span>
                  <span class="detail-value">
                    ${c.email ? `<a class="lk" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '<span class="mu">—</span>'}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">LinkedIn</span>
                  <span class="detail-value">
                    ${c.linkedin ? `
                      <a class="lk" href="${esc(c.linkedin.startsWith('http') ? c.linkedin : 'https://' + c.linkedin)}" target="_blank" rel="noopener">
                        ${esc(c.linkedin)}
                      </a>
                    ` : '<span class="mu">—</span>'}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Address</span>
                  <span class="detail-value">${esc(c.address || '—')}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Country</span>
                  <span class="detail-value">${esc(c.country || 'Australia')}</span>
                </div>
              </div>
            </div>

            <!-- Contacts Card with 1-Click Check Selection -->
            <div class="card" style="margin:0;padding:22px 24px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
                <div>
                  <h3 style="margin:0;font-size:14.5px;font-weight:600">Contacts (${contactsList.length})</h3>
                  <div class="mu" style="font-size:11.5px;margin-top:2px">Select contact you are speaking with:</div>
                </div>
                <button type="button" class="btn btn-sm" data-act="add-contact" data-id="${c.id}">
                  ${IC.plus} Add Contact
                </button>
              </div>

              <!-- Hidden Form Input that sends contactSpokenTo with the form -->
              <input type="hidden" name="contactSpokenTo" id="ad-contact-select" value="${esc(selCtName)}">

              ${!contactsList.length ? `
                <div style="padding:12px;background:var(--bg-app);border:1px dashed var(--border-default);border-radius:var(--radius-sm)">
                  <p class="mu" style="font-size:12.5px;margin:0 0 6px">
                    No named contacts on file for this lead yet.
                  </p>
                  <div class="mu" style="font-size:11.5px">
                    Use <b>+ Add Contact</b> above to register a person, or save call log as gatekeeper / general line.
                  </div>
                </div>
              ` : `
                <!-- Interactive Check/Select Contact Cards (Unified Design) -->
                <div style="display:flex;flex-direction:column;gap:8px" id="ad-contacts-container">
                  ${contactsList.map(ct => {
                    const isSelected = (ct.name === selCtName);
                    return `
                      <div class="contact-card-item ${isSelected ? 'selected-contact' : ''}" data-act="select-contact-row" data-name="${esc(ct.name)}" style="display:flex;align-items:flex-start;gap:12px;padding:11px 13px;background:${isSelected ? 'var(--accent-subtle)' : 'var(--bg-app)'};border:1.5px solid ${isSelected ? 'var(--accent-primary, #5B5BD6)' : 'var(--border-default)'};border-radius:var(--radius-sm);cursor:pointer;transition:all var(--transition-fast)">
                        <input type="radio" name="spoken_contact_radio" value="${esc(ct.name)}" ${isSelected ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent-primary, #5B5BD6);cursor:pointer;margin-top:2px;flex-shrink:0">
                        <div style="flex:1;min-width:0">
                          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
                              <b style="font-size:13px;color:var(--tx-primary)">${esc(ct.name)}</b>
                              ${ct.isPrimary ? '<span class="pill pill-new" style="font-size:10px;padding:1px 5px">Primary</span>' : ''}
                            </div>
                            <span class="contact-check-status" style="font-size:11px;font-weight:600;color:${isSelected ? 'var(--accent-primary, #5B5BD6)' : 'var(--tx-muted)'};white-space:nowrap">
                              ${isSelected ? '✓ Spoken With' : 'Click to select'}
                            </span>
                          </div>
                          ${ct.role ? `<div class="mu" style="font-size:11.5px;margin-bottom:4px">${esc(ct.role)}</div>` : ''}
                          <div style="display:flex;gap:12px;font-size:12px;flex-wrap:wrap">
                            ${ct.phone ? `<a class="lk" href="tel:${esc(ct.phone)}" style="font-family:var(--font-mono)">${IC.phone} ${esc(ct.phone)}</a>` : ''}
                            ${ct.email ? `<a class="lk" href="mailto:${esc(ct.email)}">${IC.mail} ${esc(ct.email)}</a>` : ''}
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

            <!-- Events Attended Card -->
            <div class="card" style="margin:0;padding:22px 24px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                <h3 style="margin:0;font-size:14.5px;font-weight:600">Campaigns & Events (${eventsList.length})</h3>
              </div>

              ${!eventsList.length ? `
                <p class="mu" style="font-size:12.5px;margin:0">
                  No campaign exhibitions recorded for this company.
                </p>
              ` : `
                <div style="display:flex;flex-direction:column;gap:10px">
                  ${eventsList.map(att => {
                    const ev = att.event;
                    const dateStr = formatDateRange(ev.start, ev.end, ev.when || 'Upcoming Event');
                    return `
                      <div style="padding:12px 14px;background:var(--bg-app);border:1px solid var(--border-default);border-radius:var(--radius-sm)">
                        <div style="font-weight:600;font-size:13.5px;color:var(--tx-primary)">
                          ${esc(ev.name)}
                        </div>
                        <div class="mu" style="font-size:11.5px;margin:2px 0 6px">
                          ${dateStr}${ev.where ? ' · ' + esc(ev.where) : ''}
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;font-size:12px;flex-wrap:wrap">
                          <span class="mu">Stand: <b style="color:var(--tx-primary)">${esc(att.stand || '—')}</b></span>
                          <span class="pill ${PILL_CLASS[att.status] || 'pill-new'}">
                            ${att.status === 'New' ? 'Not called' : esc(att.status)}
                          </span>
                        </div>
                      </div>`;
                  }).join('')}
                </div>
              `}
            </div>

          </div>

        </div>

        <!-- ============================================================= -->
        <!-- FULL-WIDTH STRETCHED: Call Outcome / Disposition & Notes -->
        <!-- ============================================================= -->
        <div class="card" style="margin:0;padding:22px 24px">
          <div class="form-field" style="margin-bottom:14px">
            <label style="font-size:13px;font-weight:600;color:var(--tx-primary);display:block;margin-bottom:10px">
              Call Outcome / Disposition <span style="color:var(--color-danger)">*</span>
            </label>
            <input type="hidden" name="status" id="ad-status-input" value="${esc(c.status || 'New')}" required>
            
            <!-- Wide 6-Button Disposition Grid Stretching Full Screen -->
            <div class="disp-grid" id="ad-disp-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;margin-bottom:14px">
              <button type="button" class="disp-btn disp-appointment ${(c.status === 'Appointment') ? 'selected' : ''}" data-act="choose-disp" data-target="#ad-status-input" data-s="Appointment" style="padding:11px 14px">
                ${IC.calendar} <span>Book Appointment</span>
              </button>
              <button type="button" class="disp-btn disp-interested ${(c.status === 'Interested') ? 'selected' : ''}" data-act="choose-disp" data-target="#ad-status-input" data-s="Interested" style="padding:11px 14px">
                ${IC.checkCircle} <span>Interested</span>
              </button>
              <button type="button" class="disp-btn disp-callback ${(c.status === 'Callback') ? 'selected' : ''}" data-act="choose-disp" data-target="#ad-status-input" data-s="Callback" style="padding:11px 14px">
                ${IC.clock} <span>Callback</span>
              </button>
              <button type="button" class="disp-btn disp-noanswer ${(c.status === 'No Answer') ? 'selected' : ''}" data-act="choose-disp" data-target="#ad-status-input" data-s="No Answer" style="padding:11px 14px">
                ${IC.phone} <span>No Answer</span>
              </button>
              <button type="button" class="disp-btn disp-wrong ${(c.status === 'Wrong Number') ? 'selected' : ''}" data-act="choose-disp" data-target="#ad-status-input" data-s="Wrong Number" style="padding:11px 14px">
                ${IC.alertCircle} <span>Wrong Number</span>
              </button>
              <button type="button" class="disp-btn disp-notint ${(c.status === 'Not Interested') ? 'selected' : ''}" data-act="choose-disp" data-target="#ad-status-input" data-s="Not Interested" style="padding:11px 14px">
                <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>Not Interested</span>
              </button>
            </div>
          </div>

          <!-- Scheduled Callback Date & Time (Conditional) -->
          <div class="form-field" id="ad-cb-wrap" style="margin-bottom:14px;${c.status === 'Callback' ? '' : 'display:none'}">
            <label style="font-size:12.5px;font-weight:500;text-transform:none;letter-spacing:normal;color:var(--tx-primary);margin-bottom:6px">
              Scheduled Callback Date & Time
            </label>
            <div style="display:flex;align-items:center;gap:8px;max-width:380px">
              <input type="datetime-local" name="cb" id="ad-cb" value="${(c.cb || '').slice(0, 16)}" style="flex:1;cursor:pointer">
              <button type="button" class="btn btn-sm" data-act="open-picker" data-target="#ad-cb" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;font-size:12px;white-space:nowrap" title="Click to open calendar">
                ${IC.calendar} <span>Calendar</span>
              </button>
            </div>
            <div class="cb-shortcuts" style="margin-top:8px">
              <button type="button" class="cb-btn" data-act="set-cb" data-target="#ad-cb" data-type="2h">+2 Hours</button>
              <button type="button" class="cb-btn" data-act="set-cb" data-target="#ad-cb" data-type="tomorrow_10am">Tomorrow 10 AM</button>
              <button type="button" class="cb-btn" data-act="set-cb" data-target="#ad-cb" data-type="tomorrow_2pm">Tomorrow 2 PM</button>
            </div>
          </div>

          <!-- Notes & Snippets -->
          <div class="form-field" style="margin-bottom:0">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">
              <label style="font-size:12.5px;font-weight:500;text-transform:none;letter-spacing:normal;color:var(--tx-primary);margin-bottom:0">
                Notes
              </label>
              <button type="button" class="btn btn-sm" id="btn-ad-gen-ai" data-act="gen-ai-summary" data-form="#f-ad-log" style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:4px 10px;background:var(--accent-subtle);color:var(--accent-text);border-color:var(--accent-border)" title="Generate 2-3 bullet point summary using Google Gemini free tier">
                ${IC.sparkles} <span>Generate AI Summary</span>
              </button>
            </div>
            <div class="snippet-grid" style="margin-bottom:8px">
              ${NOTE_SNIPPETS.slice(0, 5).map(snip => `
                <button type="button" class="snippet-chip" data-act="add-snippet" data-target="#ad-notes" data-val="${esc(snip)}">+ ${esc(snip)}</button>
              `).join('')}
            </div>
            <textarea id="ad-notes" name="notes" rows="3" placeholder="Write interaction details, who you spoke with, what they need, anything to remember..." style="width:100%;box-sizing:border-box">${esc(c.notes || '')}</textarea>

            <!-- Generated AI Summary Preview & Hidden Input -->
            <div id="ad-ai-preview" class="ai-preview-box" style="display:${c.aiSummary ? 'block' : 'none'};margin-top:10px;padding:10px 14px;background:var(--bg-app);border:1px solid var(--border-default);border-left:3px solid #8b5cf6;border-radius:var(--radius-xs)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-size:11px;font-weight:600;color:#a78bfa;display:inline-flex;align-items:center;gap:5px">
                  ${IC.sparkles} AI CALL TAKEAWAYS
                </span>
                <button type="button" class="btn btn-sm" data-act="clear-ai-summary" data-target="#ad-ai-preview" style="padding:1px 6px;font-size:10.5px">Remove</button>
              </div>
              <div class="ai-summary-text" style="font-size:12px;color:var(--tx-primary);line-height:1.45;white-space:pre-line">
                ${esc(c.aiSummary || '')}
              </div>
              <input type="hidden" name="aiSummary" id="ad-ai-summary-input" value="${esc(c.aiSummary || '')}">
            </div>
          </div>
        </div>

        <!-- Action Buttons: Skip Lead & Save & Advance (Full Width Bar) -->
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap">
          <button type="button" class="btn" data-act="ad-skip" style="padding:10px 22px;font-size:13.5px;font-weight:600">
            ${IC.skip} Skip Lead
          </button>
          <button type="submit" class="btn pri" style="background:#10b981;border-color:#10b981;color:#ffffff;padding:10px 26px;font-size:13.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px">
            Save & Advance to Next Lead (${state.AD.list.length - (state.AD.idx + 1)} left) →
          </button>
        </div>

      </form>

      <!-- ============================================================= -->
      <!-- FULL-WIDTH: Interaction History & Notes Timeline -->
      <!-- ============================================================= -->
      <div class="card" style="margin:0;padding:22px 24px">
        <h3 style="margin:0 0 14px;font-size:14.5px;font-weight:600">Interaction History & Notes (${notesList.length})</h3>
        ${notesList.length ? `
          <div style="display:flex;flex-direction:column;gap:10px">
            ${notesList.map(n => `
              <div style="padding:12px 14px;background:var(--bg-app);border:1px solid var(--border-default);border-radius:var(--radius-sm)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:11.5px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-weight:600;color:var(--tx-primary)">${esc(getAgentName(n.by))}</span>
                    ${n.contactSpokenTo ? `<span class="mu">· Spoke with <b>${esc(n.contactSpokenTo)}</b></span>` : ''}
                    ${n.status ? `<span class="pill ${PILL_CLASS[n.status] || 'pill-new'}" style="font-size:10px;padding:1px 5px">${esc(n.status)}</span>` : ''}
                  </div>
                  <span class="mu" style="font-size:11px" title="${esc(n.at || '')}">${esc(formatFriendlyDateTime(n.at))}</span>
                </div>
                ${(n.qualification && n.qualification.customerRequirements) ? `
                  <div style="font-size:12px;background:var(--accent-subtle);border-left:3px solid var(--accent-primary, #5B5BD6);padding:6px 10px;margin:6px 0;border-radius:2px">
                    <span class="mu" style="font-size:10.5px;text-transform:uppercase;font-weight:600;display:block;margin-bottom:2px">Customer Requirements:</span>
                    <span style="color:var(--tx-primary)">${esc(n.qualification.customerRequirements)}</span>
                  </div>
                ` : ''}
                ${n.aiSummary ? `
                  <div style="font-size:12px;background:rgba(139, 92, 246, 0.08);border-left:3px solid #8b5cf6;padding:8px 12px;margin:6px 0;border-radius:2px">
                    <span style="font-size:10.5px;text-transform:uppercase;font-weight:600;color:#a78bfa;display:flex;align-items:center;gap:4px;margin-bottom:3px">
                      ${IC.sparkles} AI Call Takeaways:
                    </span>
                    <div style="color:var(--tx-primary);line-height:1.45;white-space:pre-line">${esc(n.aiSummary)}</div>
                  </div>
                ` : ''}
                <div style="font-size:12.5px;color:var(--tx-secondary);line-height:1.4">
                  ${esc(n.notes)}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="mu" style="font-size:12.5px;margin:0">No prior interaction notes recorded for this lead yet.</p>
        `}
      </div>

    </div>`;
}
