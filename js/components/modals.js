// ==========================================================================
// AU Campaign CRM — Enterprise Modal Dialogs (Stripe Forms & Attio Layout)
// ==========================================================================

import { state } from '../state.js';
import { ST, APS, NOTE_SNIPPETS, IC } from '../config.js';
import { esc } from '../utils/dom.js';
import { isA, isEventAccessible, getAccessibleEvents } from '../services/auth.js';
import { getQuickCallbackTime } from '../utils/dates.js';
import { getCompanyContacts } from '../views/company-detail.js';
import { navigate } from '../router.js';
import { getGeminiApiKey, setGeminiApiKey, isAiConfigured } from '../services/ai.js';

export function openLg(id, evId) {
  navigate('co', { id, ev: evId });
}

export function openAp(id, co) {
  const allowedCompanies = isA()
    ? state.D.companies.filter(c => isEventAccessible(c.ev))
    : state.D.companies;
  const defaultCoId = co || allowedCompanies[0]?.id;
  const selectedCo = state.D.companies.find(x => x.id == defaultCoId);
  const a = id ? state.D.appts.find(x => x.id == id) : {
    co: defaultCoId,
    contact: selectedCo?.contact || '',
    stand: selectedCo?.stand || '',
    status: 'New Appointment',
    calls: 0
  };
  if (!a) return;

  const m = document.createElement('div');
  m.id = 'm';
  m.innerHTML = `
    <div class="mb">
      <div class="mb-header">
        <div>
          <h3>${id ? 'Edit Sales Appointment' : 'Book Sales Appointment'}</h3>
          <p class="mu" style="margin:2px 0 0;font-size:12px">Track exhibition space appointment, meeting time and quote</p>
        </div>
        <button class="mb-close" data-act="x">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form id="fap" data-id="${id || ''}">
        <div class="form-field">
          <label>Company / Exhibitor</label>
          <select name="co" required>
            ${allowedCompanies.map(c => `<option value="${c.id}" ${a.co == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>

        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Key Contact Name</label>
            <input name="contact" placeholder="Contact person" value="${esc(a.contact || '')}">
          </div>
          <div class="form-field">
            <label>Stand Requirement</label>
            <input name="stand" placeholder="e.g. Shell Scheme 3x3, Space Only" value="${esc(a.stand || '')}">
          </div>
        </div>

        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Pipeline Stage</label>
            <select name="status">
              ${APS.map(s => `<option ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label>Next Call / Meeting Time</label>
            <input type="datetime-local" name="next" value="${(a.next || '').slice(0, 16)}">
          </div>
        </div>

        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Quote Reference</label>
            <input name="quote" placeholder="e.g. SP-2026-001" value="${esc(a.quote || '')}">
          </div>
          <div class="form-field">
            <label>Assigned Sales Rep</label>
            <input name="with" placeholder="Sales Rep Name" value="${esc(a.with || '')}">
          </div>
        </div>

        <div class="form-field">
          <label>Number of Calls Completed</label>
          <input type="number" min="0" name="calls" value="${a.calls || 0}">
        </div>

        <div class="row" style="justify-content:space-between;margin-top:16px">
          ${id && !isA() ? `<button type="button" class="btn btn-danger" data-act="apdel" data-id="${id}">Delete Appointment</button>` : '<div></div>'}
          <div class="row" style="margin:0;gap:8px">
            <button type="button" class="btn" data-act="x">Cancel</button>
            <button class="btn pri">Save Appointment</button>
          </div>
        </div>
      </form>
    </div>`;
  document.body.append(m);
}

export function openCo(id, presetEv) {
  // Disallow agents from adding new companies
  if (!id && isA()) {
    alert('Adding new companies is restricted to Administrators.');
    return;
  }

  const c = id ? state.D.companies.find(x => x.id == id) : {
    ev: presetEv || state.F.ev || state.D.events[0]?.id || 1,
    status: 'New'
  };
  if (!c) return;

  const m = document.createElement('div');
  m.id = 'm';

  // ------------------------------------------------------------------------
  // Agent Modal: Only phone number updates and managing/adding contacts
  // ------------------------------------------------------------------------
  if (isA()) {
    const evObj = state.D.events.find(x => x.id == c.ev);
    const evName = evObj ? evObj.name : 'Unassigned';

    m.innerHTML = `
      <div class="mb">
        <div class="mb-header">
          <div>
            <h3>Update Contacts & Phone</h3>
            <p class="mu" style="margin:2px 0 0;font-size:12px">Update primary telephone and decision maker contact info</p>
          </div>
          <button class="mb-close" data-act="x">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style="background:var(--bg-app);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:16px;border:1px solid var(--border-default)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <b style="font-size:14.5px;color:var(--tx-primary)">${esc(c.name)}</b>
            <span class="pill pill-new" style="font-size:10.5px">Core Record Protected</span>
          </div>
          <div class="mu" style="font-size:12px">Campaign: <b>${esc(evName)}</b> ${c.stand ? `· Stand: <b>${esc(c.stand)}</b>` : ''} · Status: <b>${esc(c.status || 'New')}</b></div>
        </div>

        <form id="fc" data-id="${id}">
          <div style="margin-bottom:10px;font-weight:600;font-size:12px;color:var(--tx-secondary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-default);padding-bottom:4px">
            Primary Telephony
          </div>
          <div class="form-field">
            <label>Primary Company Telephone</label>
            <input name="phone" placeholder="e.g. 02 9000 0000" value="${esc(c.phone || '')}">
            <small class="mu" style="font-size:11px">Main switchboard, general office line, or primary telephone</small>
          </div>

          <div style="margin:16px 0 10px;font-weight:600;font-size:12px;color:var(--tx-secondary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-default);padding-bottom:4px">
            Primary Contact Person
          </div>
          <div class="form-field">
            <label>Contact Name & Title</label>
            <input name="contact" placeholder="e.g. Jane Doe (Marketing Director)" value="${esc(c.contact || '')}">
          </div>
          <div class="g2" style="margin-bottom:0">
            <div class="form-field">
              <label>Direct Mobile / Alternate Phone</label>
              <input name="altPhone" placeholder="e.g. 0412 345 678" value="${esc(c.altPhone || '')}">
            </div>
            <div class="form-field">
              <label>Contact Email Address</label>
              <input name="email" type="email" placeholder="jane@company.com" value="${esc(c.email || '')}">
            </div>
          </div>

          <div style="margin:16px 0 10px;font-weight:600;font-size:12px;color:var(--tx-secondary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-default);padding-bottom:4px">
            Additional Contact Person (Optional)
          </div>
          <div class="form-field">
            <label>Additional Contact Name & Title</label>
            <input name="contact2" placeholder="e.g. Mark Smith (Operations Manager)" value="${esc(c.contact2 || '')}">
          </div>
          <div class="g2" style="margin-bottom:0">
            <div class="form-field">
              <label>Additional Contact Mobile</label>
              <input name="phone2" placeholder="e.g. 0423 456 789" value="${esc(c.phone2 || '')}">
            </div>
            <div class="form-field">
              <label>Additional Contact Email</label>
              <input name="email2" type="email" placeholder="mark@company.com" value="${esc(c.email2 || '')}">
            </div>
          </div>

          <div class="row" style="justify-content:flex-end;margin-top:18px;gap:8px">
            <button type="button" class="btn" data-act="x">Cancel</button>
            <button class="btn pri">Save Contact Updates</button>
          </div>
        </form>
      </div>`;
    document.body.append(m);
    return;
  }

  // ------------------------------------------------------------------------
  // Admin Modal: Full Company Add / Edit
  // ------------------------------------------------------------------------
  m.innerHTML = `
    <div class="mb">
      <div class="mb-header">
        <div>
          <h3>${id ? 'Edit Company Record' : 'Add New Company'}</h3>
          <p class="mu" style="margin:2px 0 0;font-size:12px">Manage company identity, campaign allocation, and contact records</p>
        </div>
        <button class="mb-close" data-act="x">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form id="fc" data-id="${id || ''}">
        <div class="form-field">
          <label>Company Legal / Trading Name</label>
          <input name="name" placeholder="Company Name Pty Ltd" value="${esc(c.name || '')}" required>
        </div>

        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Campaign / Event</label>
            <select name="ev">
              ${state.D.events.map(e => `<option value="${e.id}" ${c.ev == e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label>Stand / Booth Details</label>
            <input name="stand" placeholder="e.g. 3x3 Shell Scheme, Stand 42" value="${esc(c.stand || '')}">
          </div>
        </div>

        <div style="margin:16px 0 10px;font-weight:600;font-size:12px;color:var(--tx-secondary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-default);padding-bottom:4px">
          Telephony & Status
        </div>
        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Primary Telephone</label>
            <input name="phone" placeholder="e.g. 02 9000 0000" value="${esc(c.phone || '')}">
          </div>
          <div class="form-field">
            <label>Outreach Status</label>
            <select name="status">
              ${ST.map(s => `<option ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="margin:16px 0 10px;font-weight:600;font-size:12px;color:var(--tx-secondary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-default);padding-bottom:4px">
          Primary Contact Details
        </div>
        <div class="form-field">
          <label>Primary Contact Name</label>
          <input name="contact" placeholder="Contact person" value="${esc(c.contact || '')}">
        </div>
        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Direct Mobile / Alt Phone</label>
            <input name="altPhone" placeholder="e.g. 0412 345 678" value="${esc(c.altPhone || '')}">
          </div>
          <div class="form-field">
            <label>Direct Email Address</label>
            <input name="email" type="email" placeholder="lead@company.com" value="${esc(c.email || '')}">
          </div>
        </div>

        <div style="margin:16px 0 10px;font-weight:600;font-size:12px;color:var(--tx-secondary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-default);padding-bottom:4px">
          Additional / Secondary Contact
        </div>
        <div class="form-field">
          <label>Additional Contact Name</label>
          <input name="contact2" placeholder="Secondary contact person" value="${esc(c.contact2 || '')}">
        </div>
        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Additional Contact Mobile</label>
            <input name="phone2" placeholder="e.g. 0423 456 789" value="${esc(c.phone2 || '')}">
          </div>
          <div class="form-field">
            <label>Additional Contact Email</label>
            <input name="email2" type="email" placeholder="contact2@company.com" value="${esc(c.email2 || '')}">
          </div>
        </div>

        <div style="margin:16px 0 10px;font-weight:600;font-size:12px;color:var(--tx-secondary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-default);padding-bottom:4px">
          Callback Schedule & Notes
        </div>
        <div class="form-field">
          <label>Callback Date & Time</label>
          <input type="datetime-local" name="cb" id="co-cb" value="${(c.cb || '').slice(0, 16)}">
        </div>
        <div class="form-field">
          <label>Lead Notes & History</label>
          <textarea name="notes" placeholder="Notes...">${esc(c.notes || '')}</textarea>
        </div>
        <div class="row" style="justify-content:space-between;margin-top:16px">
          ${id ? `<button type="button" class="btn btn-danger" data-act="del" data-id="${id}">Delete Company</button>` : '<div></div>'}
          <div class="row" style="margin:0;gap:8px">
            <button type="button" class="btn" data-act="x">Cancel</button>
            <button class="btn pri">${id ? 'Save Changes' : 'Create Company'}</button>
          </div>
        </div>
      </form>
    </div>`;
  document.body.append(m);
}

export function openEventModal(id) {
  const e = id ? state.D.events.find(x => x.id == id) : { name: '', start: '', end: '', where: '' };
  if (!e) return;

  const m = document.createElement('div');
  m.id = 'm';
  m.innerHTML = `
    <div class="mb">
      <div class="mb-header">
        <div>
          <h3>${id ? 'Edit Campaign Event' : 'Add Campaign Event'}</h3>
          <p class="mu" style="margin:2px 0 0;font-size:12px">Register an exhibition, tradeshow or outreach campaign</p>
        </div>
        <button class="mb-close" data-act="x">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form id="fe" data-id="${id || ''}">
        <div class="form-field">
          <label>Event / Exhibition Name</label>
          <input name="name" placeholder="e.g. Melbourne Build Expo 2026" value="${esc(e.name || '')}" required>
        </div>
        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Start Date</label>
            <input type="date" name="start" value="${e.start || ''}">
          </div>
          <div class="form-field">
            <label>End Date</label>
            <input type="date" name="end" value="${e.end || ''}">
          </div>
        </div>
        <div class="form-field">
          <label>Venue / Location</label>
          <input name="where" placeholder="e.g. Sydney Convention Centre, Darling Harbour" value="${esc(e.where || '')}">
        </div>
        <div class="form-field">
          <label>Assigned Call Agent</label>
          <select name="assignedAgent">
            <option value="">— Unassigned (Admin Only) —</option>
            ${(state.D.agents || []).map(a => `
              <option value="${esc(a.e)}" ${(e.assignedAgent || '').toLowerCase() === a.e.toLowerCase() ? 'selected' : ''}>
                ${esc(a.n)} (${esc(a.e)})
              </option>
            `).join('')}
          </select>
          <small class="mu" style="font-size:11px;display:block;margin-top:4px">
            When assigned, only this agent will be permitted to access this campaign and its leads.
          </small>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px">
          <button type="button" class="btn" data-act="x">Cancel</button>
          <button class="btn pri">Save Campaign</button>
        </div>
      </form>
    </div>`;
  document.body.append(m);
}

export function openAddContactModal(companyId) {
  const c = state.D.companies.find(x => x.id == companyId);
  if (!c) return;

  const m = document.createElement('div');
  m.id = 'm';
  m.innerHTML = `
    <div class="mb">
      <div class="mb-header">
        <div>
          <h3>Add Contact to ${esc(c.name)}</h3>
          <p class="mu" style="margin:2px 0 0;font-size:12px">Register a new contact person or decision maker</p>
        </div>
        <button class="mb-close" data-act="x" title="Close dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form id="f-add-contact" data-id="${companyId}">
        <div class="form-field">
          <label>Contact Full Name *</label>
          <input name="name" placeholder="e.g. Sarah Miller" required>
        </div>
        <div class="form-field">
          <label>Role / Job Title</label>
          <select name="role" id="f-contact-role">
            <option value="">Select role / job title…</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="Manager">Manager</option>
            <option value="Owner">Owner</option>
            <option value="Reception">Reception</option>
            <option value="Other">Other…</option>
          </select>
        </div>
        <div class="form-field" id="f-contact-custom-role-wrap" style="display:none">
          <label>Specify Custom Title</label>
          <input name="customRole" id="f-contact-custom-role" placeholder="e.g. General Manager, Operations Director">
        </div>
        <div class="g2" style="margin-bottom:0">
          <div class="form-field">
            <label>Phone / Direct Mobile</label>
            <input name="phone" placeholder="e.g. 0409 905 251">
          </div>
          <div class="form-field">
            <label>Email Address</label>
            <input name="email" type="email" placeholder="e.g. sarah@shapetins.com.au">
          </div>
        </div>
        <div class="form-field">
          <label>LinkedIn Profile URL</label>
          <input name="linkedin" placeholder="https://linkedin.com/in/...">
        </div>
        <div class="form-field" style="margin-top:10px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:normal">
            <input type="checkbox" name="isPrimary" value="1">
            <span>Set as primary company contact</span>
          </label>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px">
          <button type="button" class="btn" data-act="x">Cancel</button>
          <button class="btn pri">Save Contact</button>
        </div>
      </form>
    </div>`;
  document.body.append(m);
}

export function openAddEventAttendanceModal(companyId) {
  const c = state.D.companies.find(x => x.id == companyId);
  if (!c) return;

  const m = document.createElement('div');
  m.id = 'm';
  m.innerHTML = `
    <div class="mb">
      <div class="mb-header">
        <div>
          <h3>Register Event for ${esc(c.name)}</h3>
          <p class="mu" style="margin:2px 0 0;font-size:12px">Add this company as an exhibitor / attendee at a campaign event</p>
        </div>
        <button class="mb-close" data-act="x" title="Close dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form id="f-add-event-att" data-id="${companyId}">
        <div class="form-field">
          <label>Campaign / Exhibition Event *</label>
          <select name="evId" required>
            ${state.D.events.map(ev => `
              <option value="${ev.id}">${esc(ev.name)} (${ev.where || 'Exhibition'})</option>
            `).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Stand / Booth Number</label>
          <input name="stand" placeholder="e.g. Stand G43 or 3x3 Space Only">
        </div>
        <div class="form-field">
          <label>Initial Outreach Status</label>
          <select name="status">
            ${ST.map(s => `<option value="${s}" ${s === 'New' ? 'selected' : ''}>${s === 'New' ? 'Not called' : s}</option>`).join('')}
          </select>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px">
          <button type="button" class="btn" data-act="x">Cancel</button>
          <button class="btn pri">Register Attendance</button>
        </div>
      </form>
    </div>`;
  document.body.append(m);
}

export function openAiSettingsModal() {
  const currentKey = getGeminiApiKey();
  const isSet = !!currentKey;

  const m = document.createElement('div');
  m.id = 'm';
  m.innerHTML = `
    <div class="mb" style="max-width:540px">
      <div class="mb-header">
        <div>
          <h3 style="display:flex;align-items:center;gap:8px">
            <span style="color:#a78bfa">${IC.sparkles}</span> Google Gemini AI Settings
          </h3>
          <p class="mu" style="margin:2px 0 0;font-size:12px">Free-tier AI call summarization powered by Google Gemini 1.5/2.0 Flash</p>
        </div>
        <button class="mb-close" data-act="x" title="Close dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="padding:14px;background:var(--bg-app);border:1px solid var(--border-default);border-radius:var(--radius-sm);margin-bottom:16px;font-size:12.5px;line-height:1.5">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:600;color:var(--tx-primary)">Active Summarizer Engine:</span>
          <span class="pill pill-interested" style="font-size:11px;padding:2px 8px">
            ${isSet ? '● Google Gemini Cloud (Active)' : '● Smart Built-in Engine (No API Key Required)'}
          </span>
        </div>
        <p style="margin:0 0 8px;color:var(--tx-secondary)">
          ${isSet ? 'Gemini Cloud Flash is connected. Summaries will be generated via Google Gemini.' : 'The CRM built-in smart summarizer is active and works 100% locally with zero external API keys and zero costs. Optionally, you can paste a Google Gemini API key below if you want cloud AI.'}
        </p>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="lk" style="font-weight:600;display:inline-flex;align-items:center;gap:4px">
          Get a free Gemini API key at Google AI Studio (optional) ↗
        </a>
      </div>

      <form id="f-ai-settings">
        <div class="form-field">
          <label style="display:flex;justify-content:space-between">
            <span>Gemini API Key</span>
            <span class="mu" style="font-size:11px">Stored locally in your browser</span>
          </label>
          <div style="display:flex;gap:8px">
            <input type="password" id="gemini-api-key-input" name="apiKey" value="${esc(currentKey)}" placeholder="AIzaSy..." style="flex:1;font-family:var(--font-mono);font-size:12.5px" autocomplete="off" required>
            <button type="button" class="btn btn-sm" id="btn-toggle-key-vis" data-act="toggle-key-visibility" style="padding:0 10px;font-size:11.5px">Show</button>
          </div>
        </div>

        <div id="ai-test-result" style="display:none;margin-bottom:14px;padding:10px 12px;border-radius:var(--radius-xs);font-size:12px"></div>

        <div class="row" style="justify-content:space-between;margin-top:20px;align-items:center">
          <div>
            ${isSet ? `<button type="button" class="btn btn-sm btn-danger" data-act="clear-ai-key">Remove Key</button>` : ''}
          </div>
          <div style="display:flex;gap:8px">
            <button type="button" class="btn btn-sm" data-act="test-ai-key">⚡ Test Key</button>
            <button type="button" class="btn btn-sm" data-act="x">Cancel</button>
            <button type="submit" class="btn btn-sm pri">Save Key</button>
          </div>
        </div>
      </form>
    </div>`;
  document.body.append(m);
}
