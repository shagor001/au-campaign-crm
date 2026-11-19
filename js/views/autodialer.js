// ==========================================================================
// AU Campaign CRM — Auto Dialer Engine & Session UI (High Efficiency)
// ==========================================================================

import { state } from '../state.js';
import { esc } from '../utils/dom.js';
import { isA } from '../services/auth.js';
import { PILL_CLASS, IC, NOTE_SNIPPETS } from '../config.js';
import { log, save } from '../services/sync.js';
import { getAuTimezoneInfo, getQuickCallbackTime } from '../utils/dates.js';
import { getBattlecardHTML } from '../components/battlecard.js';
import { getPacerHTML } from '../components/pacer.js';
import { getHistoryThreadHTML } from '../components/history.js';

export function startAdLead(renderFn) {
  clearInterval(state.AD.timer);
  if (state.AD.idx >= state.AD.list.length) {
    state.AD.state = 'done';
    if (renderFn) renderFn();
    return;
  }
  const c = state.AD.list[state.AD.idx];
  if (state.AD.delay > 0) {
    state.AD.state = 'countdown';
    state.AD.countdown = state.AD.delay;
    if (renderFn) renderFn();
    state.AD.timer = setInterval(() => {
      state.AD.countdown--;
      if (state.AD.countdown <= 0) {
        clearInterval(state.AD.timer);
        state.AD.state = 'calling';
        log('Auto-dialled ' + c.name);
        save();
        if (renderFn) renderFn();
        if (state.AD.autoOpenTel && c.phone) {
          window.location.href = 'tel:' + c.phone;
        }
      } else {
        const pill = document.querySelector('.ad-timer-pill');
        if (pill) pill.innerHTML = `${IC.clock} Auto-dialing in ${state.AD.countdown}s...`;
      }
    }, 1000);
  } else {
    state.AD.state = 'calling';
    if (renderFn) renderFn();
  }
}

export function autodialerView() {
  const e = state.D.events.find(x => x.id == state.AD.ev);
  if (!e) return `<h2>Event Not Found</h2><button class="btn" data-act="go" data-p="events">${IC.arrowLeft} Back to Events</button>`;

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

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <p style="margin:0 0 4px">
          <a class="lk" data-act="evco" data-id="${e.id}" style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px">
            ${IC.arrowLeft} Exit Auto Dialer to ${esc(e.name)}
          </a>
        </p>
        <h2 style="margin:0"><span>${IC.zap} Auto Dialer: ${esc(e.name)}</span></h2>
      </div>
      <div class="row" style="margin:0;gap:8px">
        <button class="btn btn-sm" data-act="ad-setup" data-id="${e.id}">
          ${IC.settings} Settings
        </button>
        <button class="btn btn-sm" data-act="ad-skip">
          ${IC.skip} Skip Lead
        </button>
        ${state.AD.state === 'countdown' ? `
          <button class="btn btn-sm" data-act="ad-pause">
            ${IC.pause} Pause
          </button>
        ` : (state.AD.state === 'paused' ? `
          <button class="btn btn-sm pri" data-act="ad-resume">
            ${IC.play} Resume
          </button>
        ` : '')}
      </div>
    </div>

    ${getPacerHTML()}

    <!-- Session Progress -->
    <div class="card" style="padding:14px 20px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600;font-size:13px">Lead ${state.AD.idx + 1} of ${state.AD.list.length} (Current: ${esc(c.status)})</span>
        <span class="mu tabular" style="font-size:12px">
          ${progressPct}% complete · Calling: ${state.AD.statuses.map(s => `<span class="pill ${PILL_CLASS[s]}" style="padding:1px 6px;font-size:10px;margin-left:3px">${s}</span>`).join('')}
        </span>
      </div>
      <div class="pg"><i class="bl" data-w="${progressPct}"></i></div>
    </div>

    ${getBattlecardHTML(e)}

    <!-- Active Lead Terminal -->
    <div class="dialer-card">
      <div class="dialer-meta">
        <span class="dialer-event">${esc(e.name)}</span>
        <span class="pill ${PILL_CLASS[c.status]}">${esc(c.status)}</span>
        ${tzInfo ? tzInfo.badgeHtml : ''}
        ${state.AD.state === 'countdown' ? `
          <span class="ad-timer-pill ad-pulse">
            ${IC.clock} Auto-dialing in ${state.AD.countdown}s...
          </span>
        ` : (state.AD.state === 'paused' ? `
          <span class="pill pill-wrong">${IC.pause} Paused</span>
        ` : `
          <span class="pill pill-interested">${IC.phone} Active Call</span>
        `)}
      </div>

      <div class="dialer-company">${esc(c.name)}</div>
      <div class="dialer-contact">
        <span>${IC.user} Contact: <b>${esc(c.contact || 'No contact named')}</b></span>
        <span>${IC.pin} Stand: <b>${esc(c.stand || 'Unassigned')}</b></span>
        ${c.email ? `<span>${IC.mail} <a class="lk" href="mailto:${esc(c.email)}">${esc(c.email)}</a></span>` : ''}
      </div>

      <!-- Telephony Box -->
      <div class="ph-box">
        <div class="ph-primary-row">
          <div>
            <small class="mu" style="display:block;text-transform:uppercase;font-size:11px;font-weight:600;letter-spacing:0.04em">Primary Telephone</small>
            <div class="ph-number">
              <span>${esc(c.phone || 'No phone number')}</span>
              ${c.phone ? `
                <button class="copy-btn" data-act="copy-val" data-val="${esc(c.phone)}" title="Copy Phone Number">
                  ${IC.copy} Copy
                </button>
              ` : ''}
            </div>
          </div>
          <div class="row" style="margin:0;gap:8px">
            ${c.phone ? `
              <a class="btn pri dial-btn" href="tel:${esc(c.phone)}" data-act="ad-dial" data-id="${c.id}">
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
                <a class="lk" href="tel:${esc(c.altPhone)}">${IC.phone}</a>
                <button class="copy-btn" data-act="copy-val" data-val="${esc(c.altPhone)}">${IC.copy}</button>
              </div>
            ` : ''}
            ${c.email ? `
              <div class="contact-chip">
                <span>Direct Email: <b>${esc(c.email)}</b></span>
                <a class="lk" href="mailto:${esc(c.email)}">${IC.mail}</a>
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

      <!-- Call Notes & Quick Snippets -->
      <div class="form-field">
        <label for="ad-notes">Call Log & Notes (Saved automatically on disposition)</label>
        <div class="snippet-grid">
          ${NOTE_SNIPPETS.map(snip => `
            <button type="button" class="snippet-chip" data-act="add-snippet" data-target="#ad-notes" data-val="${esc(snip)}">+ ${esc(snip)}</button>
          `).join('')}
        </div>
        <textarea id="ad-notes" placeholder="Log details discussed during this call or click a quick snippet above...">${esc(c.notes || '')}</textarea>
      </div>

      <!-- Precision Callback DateTime Picker -->
      <div class="form-field" id="ad-cb-box" style="margin-top:10px">
        <label for="ad-cb">Scheduled Callback Date & Time (if scheduling follow-up)</label>
        <input type="datetime-local" id="ad-cb" value="${(c.cb || '').slice(0, 16) || getQuickCallbackTime('2h')}">
        <div class="cb-shortcuts">
          <small class="mu" style="align-self:center;margin-right:4px">Quick Time:</small>
          <button type="button" class="cb-btn" data-act="set-cb" data-target="#ad-cb" data-type="2h">+2 Hours</button>
          <button type="button" class="cb-btn" data-act="set-cb" data-target="#ad-cb" data-type="tomorrow_10am">Tomorrow 10 AM</button>
          <button type="button" class="cb-btn" data-act="set-cb" data-target="#ad-cb" data-type="tomorrow_2pm">Tomorrow 2 PM</button>
          <button type="button" class="cb-btn" data-act="set-cb" data-target="#ad-cb" data-type="2d_11am">In 2 Days 11 AM</button>
        </div>
      </div>

      <!-- 1-Click Auto-Advance Dispositions -->
      <div style="margin-top:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <small class="mu" style="font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.04em">Select Call Outcome to Save & Advance to Next Lead:</small>
        </div>
        <div class="disp-grid">
          <button class="disp-btn disp-appointment" data-act="ad-disp" data-s="Appointment">
            ${IC.calendar} <span>Book Appointment</span>
          </button>
          <button class="disp-btn disp-interested" data-act="ad-disp" data-s="Interested">
            ${IC.checkCircle} <span>Interested</span>
          </button>
          <button class="disp-btn disp-callback" data-act="ad-disp" data-s="Callback">
            ${IC.clock} <span>Callback</span>
          </button>
          <button class="disp-btn disp-noanswer" data-act="ad-disp" data-s="No Answer">
            ${IC.phone} <span>No Answer</span>
          </button>
          <button class="disp-btn disp-wrong" data-act="ad-disp" data-s="Wrong Number">
            ${IC.alertCircle} <span>Wrong Number</span>
          </button>
          <button class="disp-btn disp-notint" data-act="ad-disp" data-s="Not Interested">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>Not Interested</span>
          </button>
        </div>
      </div>

      ${getHistoryThreadHTML(c)}
    </div>`;
}
