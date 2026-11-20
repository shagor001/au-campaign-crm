// ==========================================================================
// AU Campaign CRM — Call Queue View (Attio / Linear High-Focus Dialer)
// ==========================================================================

import { state } from '../state.js';
import { ST, IC, NOTE_SNIPPETS } from '../config.js';
import { esc } from '../utils/dom.js';
import { isA, getAccessibleEvents, getAccessibleEventIds } from '../services/auth.js';
import { dueN } from '../components/toast.js';
import { today, getAuTimezoneInfo, getQuickCallbackTime } from '../utils/dates.js';
import { getBattlecardHTML } from '../components/battlecard.js';
import { getPacerHTML } from '../components/pacer.js';
import { getHistoryThreadHTML } from '../components/history.js';

export function queueView() {
  const accessibleEvents = getAccessibleEvents();
  const accessibleEventIds = accessibleEvents.map(e => e.id);

  if (isA() && !accessibleEvents.length) {
    return `
      <div class="page-header">
        <div class="page-header-title">
          <h2>Call Queue</h2>
          <p class="page-subtitle">Focused calling terminal</p>
        </div>
      </div>
      <div class="dialer-card" style="text-align:center;padding:56px 24px;max-width:600px;margin:32px auto">
        <div style="width:48px;height:48px;margin:0 auto 16px;background:var(--bg-subtle);color:var(--tx-muted);border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center">
          ${IC.shield}
        </div>
        <h3 style="font-size:18px;margin-bottom:8px">No Campaigns Assigned</h3>
        <p class="mu" style="font-size:13px;line-height:1.5">
          Your agent account (<code>${esc(state.U)}</code>) currently has no campaign events assigned to it. An administrator must assign an event to you from the administration portal.
        </p>
        <div style="margin-top:20px">
          <button class="btn pri" data-act="go" data-p="events">
            ${IC.events} View Campaigns
          </button>
        </div>
      </div>`;
  }

  const evId = state.F.ev ? (accessibleEventIds.includes(+state.F.ev) ? +state.F.ev : '') : (accessibleEvents[0]?.id ?? '');
  const pool = state.D.companies.filter(x => x.status === 'New' && (evId ? x.ev == evId : accessibleEventIds.includes(x.ev)));
  const c = pool[0];

  const currentEv = accessibleEvents.find(x => x.id == evId);
  const evCompanies = state.D.companies.filter(x => evId ? x.ev == evId : accessibleEventIds.includes(x.ev));
  const calledCount = evCompanies.filter(x => x.status !== 'New').length;
  const progressPct = evCompanies.length ? Math.round((calledCount / evCompanies.length) * 100) : 0;

  const tzInfo = c ? getAuTimezoneInfo(c.phone, currentEv?.where) : null;

  return `
    <div class="page-header">
      <div class="page-header-title">
        <h2>Call Queue</h2>
        <p class="page-subtitle">Focused calling terminal · ${pool.length} leads pending in selected campaign</p>
      </div>
      <div class="page-actions">
        ${isA() && currentEv ? `
          <button class="btn" data-act="ad-setup" data-id="${currentEv.id}">
            ${IC.zap} Event Auto Dialer
          </button>
        ` : ''}
        <select id="qev" style="font-size:12.5px;font-weight:500">
          <option value="">${isA() ? 'All Assigned Campaigns' : 'All Campaigns'} (${state.D.companies.filter(x => x.status === 'New' && accessibleEventIds.includes(x.ev)).length} pending)</option>
          ${accessibleEvents.map(e => {
            const pending = state.D.companies.filter(x => x.ev == e.id && x.status === 'New').length;
            return `<option value="${e.id}" ${evId == e.id ? 'selected' : ''}>${esc(e.name)} (${pending} left)</option>`;
          }).join('')}
        </select>
      </div>
    </div>

    ${getPacerHTML()}

    <!-- Campaign Calling Progress -->
    <div class="card" style="padding:14px 20px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600;font-size:13px">${currentEv ? esc(currentEv.name) : 'All Campaigns'} Outreach Progress</span>
        <span class="mu tabular" style="font-size:12px">${calledCount} of ${evCompanies.length} completed (${progressPct}%)</span>
      </div>
      <div class="pg"><i class="bl" data-w="${progressPct}"></i></div>
    </div>

    ${currentEv ? getBattlecardHTML(currentEv) : ''}

    ${!c ? `
      <div class="dialer-card" style="text-align:center;padding:56px 24px">
        <div style="width:48px;height:48px;margin:0 auto 14px;background:var(--color-success-bg);color:var(--color-success);border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center">
          ${IC.checkCircle}
        </div>
        <h3 style="font-size:18px;margin-bottom:6px">Call Queue Complete</h3>
        <p class="mu">All uncalled leads in this campaign have been contacted.</p>
        <div class="row" style="justify-content:center;margin-top:20px;gap:10px">
          <button class="btn" data-act="go" data-p="follow">
            ${IC.follow} Check Scheduled Follow-ups (${dueN()} due)
          </button>
          <button class="btn pri" data-act="go" data-p="companies">
            ${IC.companies} View Companies Directory
          </button>
        </div>
      </div>
    ` : `
      <div class="dialer-card">
        <!-- Lead Meta Bar -->
        <div class="dialer-meta">
          <span class="dialer-event">${(state.D.events.find(x => x.id == c.ev) || {}).name || '—'}</span>
          ${tzInfo ? tzInfo.badgeHtml : ''}
          <small class="mu tabular">${pool.length} leads in queue</small>
        </div>

        <div class="dialer-company">${esc(c.name)}</div>
        <div class="dialer-contact">
          <span>${IC.user} Contact: <b>${esc(c.contact || 'No contact named')}</b></span>
          <span>${IC.pin} Stand: <b>${esc(c.stand || 'Unassigned')}</b></span>
          ${c.email ? `<span>${IC.mail} <a class="lk" href="mailto:${esc(c.email)}">${esc(c.email)}</a></span>` : ''}
        </div>

        <!-- Telephony Information Box -->
        <div class="ph-box">
          <div class="ph-primary-row">
            <div>
              <small class="mu" style="display:block;text-transform:uppercase;font-size:11px;font-weight:600;letter-spacing:0.04em">Primary Telephone</small>
              <div class="ph-number">
                <span>${esc(c.phone || 'No phone on file')}</span>
                ${c.phone ? `
                  <button class="copy-btn" data-act="copy-val" data-val="${esc(c.phone)}" title="Copy Phone Number">
                    ${IC.copy} Copy
                  </button>
                ` : ''}
              </div>
            </div>
            <div class="row" style="margin:0;gap:8px">
              ${c.phone ? `
                <a class="btn pri dial-btn" href="tel:${esc(c.phone)}" data-act="dial" data-id="${c.id}">
                  ${IC.phone} Dial Now
                </a>
              ` : ''}
              ${isA() ? `
                <button class="btn btn-sm" data-act="co" data-id="${c.id}">
                  ${IC.user} Update Contacts & Phone
                </button>
              ` : `
                <button class="btn btn-sm" data-act="co" data-id="${c.id}">
                  ${IC.edit} Edit Details
                </button>
              `}
            </div>
          </div>

          ${c.altPhone || c.email || c.contact2 || c.phone2 || c.email2 ? `
            <div class="secondary-contact-row">
              ${c.altPhone ? `
                <div class="contact-chip">
                  <span>Direct Mobile: <b>${esc(c.altPhone)}</b></span>
                  <a class="lk" href="tel:${esc(c.altPhone)}" title="Dial Mobile">${IC.phone}</a>
                  <button class="copy-btn" data-act="copy-val" data-val="${esc(c.altPhone)}">${IC.copy}</button>
                </div>
              ` : ''}
              ${c.email ? `
                <div class="contact-chip">
                  <span>Direct Email: <b>${esc(c.email)}</b></span>
                  <a class="lk" href="mailto:${esc(c.email)}" title="Send Email">${IC.mail}</a>
                  <button class="copy-btn" data-act="copy-val" data-val="${esc(c.email)}">${IC.copy}</button>
                </div>
              ` : ''}
              ${c.contact2 ? `
                <div class="contact-chip">
                  <span>Alt Contact: <b>${esc(c.contact2)}</b></span>
                </div>
              ` : ''}
              ${c.phone2 ? `
                <div class="contact-chip">
                  <span>Alt Mobile: <b>${esc(c.phone2)}</b></span>
                  <a class="lk" href="tel:${esc(c.phone2)}">${IC.phone}</a>
                  <button class="copy-btn" data-act="copy-val" data-val="${esc(c.phone2)}">${IC.copy}</button>
                </div>
              ` : ''}
              ${c.email2 ? `
                <div class="contact-chip">
                  <span>Alt Email: <b>${esc(c.email2)}</b></span>
                  <a class="lk" href="mailto:${esc(c.email2)}">${IC.mail}</a>
                  <button class="copy-btn" data-act="copy-val" data-val="${esc(c.email2)}">${IC.copy}</button>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Call Notes & Snippets -->
        <div class="form-field">
          <label for="qn">Interaction Notes & Telemarketing Log</label>
          <div class="snippet-grid">
            ${NOTE_SNIPPETS.map(snip => `
              <button type="button" class="snippet-chip" data-act="add-snippet" data-target="#qn" data-val="${esc(snip)}">+ ${esc(snip)}</button>
            `).join('')}
          </div>
          <textarea id="qn" placeholder="Log key discussion points from your conversation or click a quick snippet above...">${esc(c.notes || '')}</textarea>
        </div>

        <!-- Precision Callback DateTime Picker -->
        <div class="form-field" id="cb-box" style="margin-top:10px">
          <label for="qcb">Scheduled Callback Date & Time</label>
          <input type="datetime-local" id="qcb" value="${(c.cb || '').slice(0, 16) || getQuickCallbackTime('2h')}">
          <div class="cb-shortcuts">
            <small class="mu" style="align-self:center;margin-right:4px">Quick Time:</small>
            <button type="button" class="cb-btn" data-act="set-cb" data-target="#qcb" data-type="2h">+2 Hours</button>
            <button type="button" class="cb-btn" data-act="set-cb" data-target="#qcb" data-type="tomorrow_10am">Tomorrow 10 AM</button>
            <button type="button" class="cb-btn" data-act="set-cb" data-target="#qcb" data-type="tomorrow_2pm">Tomorrow 2 PM</button>
            <button type="button" class="cb-btn" data-act="set-cb" data-target="#qcb" data-type="2d_11am">In 2 Days 11 AM</button>
          </div>
        </div>

        <!-- 1-Click Call Disposition Buttons -->
        <div style="margin-top:20px">
          <small class="mu" style="font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.04em">Select Call Outcome / Disposition:</small>
          <div class="disp-grid">
            <button class="disp-btn disp-appointment" data-act="disp" data-id="${c.id}" data-s="Appointment">
              ${IC.calendar} <span>Book Appointment</span>
            </button>
            <button class="disp-btn disp-interested" data-act="disp" data-id="${c.id}" data-s="Interested">
              ${IC.checkCircle} <span>Interested</span>
            </button>
            <button class="disp-btn disp-callback" data-act="disp" data-id="${c.id}" data-s="Callback">
              ${IC.clock} <span>Callback</span>
            </button>
            <button class="disp-btn disp-noanswer" data-act="disp" data-id="${c.id}" data-s="No Answer">
              ${IC.phone} <span>No Answer</span>
            </button>
            <button class="disp-btn disp-wrong" data-act="disp" data-id="${c.id}" data-s="Wrong Number">
              ${IC.alertCircle} <span>Wrong Number</span>
            </button>
            <button class="disp-btn disp-notint" data-act="disp" data-id="${c.id}" data-s="Not Interested">
              <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span>Not Interested</span>
            </button>
          </div>
        </div>

        ${getHistoryThreadHTML(c)}
      </div>
    `}`;
}
