import { state, toggleTheme, toggleSidebar } from './state.js';
import { API, IC } from './config.js';
import { render, navigate, handleHashChange, parseRouteFromHash } from './router.js';
import { boot, save, log } from './services/sync.js';
import { isA, who, ALL, logout } from './services/auth.js';
import { $, closeModal } from './utils/dom.js';
import { today, getQuickCallbackTime } from './utils/dates.js';
import { exportCompaniesCSV, parseCSVLine } from './utils/csv.js';
import { getFilteredCompanies, rows } from './views/companies.js';
import { openLg, openAp, openCo, openEventModal, openAddContactModal, openAddEventAttendanceModal, openAiSettingsModal } from './components/modals.js';
import { openAdSetup, updateAdModalCount } from './components/autodialer-setup.js';
import { startAdLead } from './views/autodialer.js';
import { getGeminiApiKey, setGeminiApiKey, isAiConfigured, generateCallSummary } from './services/ai.js';

let lastSubmitBtn = null;

function showNotification(msg) {
  const el = document.createElement('div');
  el.className = 'quick-notice';
  el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:var(--bg-surface);color:var(--tx-primary);border:1px solid var(--color-success-border);border-left:3px solid var(--color-success);padding:12px 20px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;box-shadow:var(--shadow-lg);transition:opacity 0.3s ease;pointer-events:none;max-width:360px;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

function updateContactCardSelection(selectedName) {
  const hiddenInput = document.getElementById('co-lg-contact-select') || document.getElementById('ad-contact-select');
  if (hiddenInput) {
    hiddenInput.value = selectedName || '';
  }
  document.querySelectorAll('.contact-card-item').forEach(card => {
    const isMatch = (card.dataset.name || '') === (selectedName || '');
    const radio = card.querySelector('input[type="radio"]');
    const badge = card.querySelector('.contact-check-status');
    if (radio) radio.checked = isMatch;
    if (isMatch) {
      card.classList.add('selected-contact');
      card.style.borderColor = 'var(--accent-primary, #5B5BD6)';
      card.style.backgroundColor = 'var(--accent-subtle, rgba(91,91,214,0.08))';
      if (badge) {
        badge.textContent = card.dataset.name ? '✓ Spoken With' : '✓ Selected';
        badge.style.color = 'var(--accent-primary, #5B5BD6)';
      }
    } else {
      card.classList.remove('selected-contact');
      card.style.borderColor = 'var(--border-default)';
      card.style.backgroundColor = 'var(--bg-app)';
      if (badge) {
        badge.textContent = 'Click to select';
        badge.style.color = 'var(--tx-muted)';
      }
    }
  });
}

// Central Form Submission Handler
function onSub(f, e) {
  if (!f.reportValidity()) return;
  const v = Object.fromEntries(new FormData(f));

  // Auto-Dialer Setup Form
  if (f.id === 'fad') {
    const eventId = +f.dataset.ev;
    const statuses = Array.from(f.querySelectorAll('input[name="statuses"]:checked')).map(x => x.value);
    if (!statuses.length) {
      alert('Please select at least one status to call.');
      return;
    }
    const delay = +f.delay.value;
    const autoOpenTel = !!f.autoOpenTel?.checked;

    const matching = state.D.companies.filter(c => c.ev == eventId && statuses.includes(c.status));
    if (!matching.length) {
      alert('No companies in this event match the selected statuses.');
      return;
    }

    state.AD.ev = eventId;
    state.AD.statuses = statuses;
    state.AD.delay = delay;
    state.AD.autoOpenTel = autoOpenTel;
    state.AD.list = matching;
    state.AD.idx = 0;
    state.AD.stats = { total: 0, disp: {} };
    closeModal();
    navigate('autodial', { ev: eventId });
    setTimeout(() => {
      startAdLead(render);
    }, 50);
    return;
  }

  // Login Form
  if (f.id === 'fl') {
    const em = v.e.trim().toLowerCase();
    if (API) {
      $('#er').textContent = 'Signing in…';
      fetch(API, {
        method: 'POST',
        body: JSON.stringify({ op: 'login', u: em, p: v.p })
      }).then(r => r.json()).then(R => {
        if (!R.ok) {
          $('#er').textContent = 'Wrong email or password.';
          return;
        }
        state.U = em;
        state.PW = v.p;
        state.ROLE = R.role;
        try {
          localStorage.setItem('aucrm_u', state.U);
          localStorage.setItem('aucrm_p', state.PW);
          localStorage.setItem('aucrm_r', state.ROLE);
        } catch (x) {}
        const targetRoute = parseRouteFromHash();
        if (targetRoute && targetRoute.p && targetRoute.p !== 'dash') {
          state.P = targetRoute.p;
          if (targetRoute.cid) state.CID = targetRoute.cid;
          if (targetRoute.ev) {
            if (targetRoute.p === 'autodial') state.AD.ev = targetRoute.ev;
            else state.EV = targetRoute.ev;
          }
        } else {
          state.P = 'dash';
        }
        navigate(state.P, { id: state.CID, ev: state.EV });
        boot(render);
      }).catch(() => {
        $('#er').textContent = 'Cannot reach the sync server.';
      });
      return;
    }

    if (ALL().some(u => u.e === em && u.p === v.p)) {
      state.U = em;
      try {
        localStorage.setItem('aucrm_u', state.U);
      } catch (x) {}
      const targetRoute = parseRouteFromHash();
      if (targetRoute && targetRoute.p && targetRoute.p !== 'dash') {
        state.P = targetRoute.p;
        if (targetRoute.cid) state.CID = targetRoute.cid;
        if (targetRoute.ev) {
          if (targetRoute.p === 'autodial') state.AD.ev = targetRoute.ev;
          else state.EV = targetRoute.ev;
        }
      } else {
        state.P = 'dash';
      }
      navigate(state.P, { id: state.CID, ev: state.EV });
    } else {
      $('#er').textContent = 'Wrong email or password.';
    }
  }

  // Call Log Form (Modal #flg, Embedded Lead Detail View #f-co-log, or Auto Dialer #f-ad-log)
  if (f.id === 'flg' || f.id === 'f-co-log' || f.id === 'f-ad-log') {
    const c = state.D.companies.find(x => x.id == f.dataset.id);
    if (c) {
      c.status = v.status || (f.id === 'f-ad-log' ? ($('#ad-status-input')?.value || c.status || 'No Answer') : c.status);
      if (v.phone !== undefined && v.phone.trim()) c.phone = v.phone.trim();

      // Contact spoken to resolution
      let contactPerson = (v.contactSpokenTo || '').trim();
      if (v.newContactName && v.newContactName.trim()) {
        const newCt = {
          id: Date.now(),
          name: v.newContactName.trim(),
          role: (v.newContactRole || '').trim(),
          phone: (v.newContactPhone || '').trim(),
          email: (v.newContactEmail || '').trim()
        };
        c.contacts = c.contacts || [];
        c.contacts.push(newCt);
        contactPerson = newCt.name;
        if (!c.contact) c.contact = newCt.name;
      }
      if (contactPerson) {
        c.contact = contactPerson;
      }

      // Lead Qualification data (matching inspiration questionnaire)
      c.qualification = c.qualification || {};
      if (v.spaceType !== undefined) c.qualification.spaceType = v.spaceType;
      if (v.spaceSize !== undefined) c.qualification.spaceSize = v.spaceSize.trim();
      if (v.exhibitFrequency !== undefined) c.qualification.exhibitFrequency = v.exhibitFrequency.trim();
      if (v.otherExpos !== undefined) c.qualification.otherExpos = v.otherExpos.trim();
      if (v.customerRequirements !== undefined) c.qualification.customerRequirements = v.customerRequirements.trim();

      if (v.spaceSize || v.spaceType) {
        const standDesc = [v.spaceSize, v.spaceType].filter(Boolean).join(' ');
        if (standDesc) c.stand = standDesc;
      }

      c.notes = (v.notes || '').trim();
      c.aiSummary = (v.aiSummary || '').trim();
      c.cb = c.status === 'Callback' ? (v.cb || today()) : '';
      c.by = state.U;
      c.at = today();

      // If logged specifically for an attended event
      const activeEvId = f.dataset.ev || c.ev || (c.eventsAttended && c.eventsAttended[0]?.evId);
      if (activeEvId && Array.isArray(c.eventsAttended)) {
        const att = c.eventsAttended.find(x => (x.evId || x.id || x.ev) == activeEvId);
        if (att) {
          att.status = c.status;
          att.cb = c.status === 'Callback' ? (v.cb || today()) : '';
          att.notes = c.notes;
          if (v.spaceSize || v.spaceType) {
            att.stand = [v.spaceSize, v.spaceType].filter(Boolean).join(' ') || att.stand;
          }
        }
      }

      c.history = c.history || [];
      c.history.unshift({
        at: new Date().toISOString(),
        by: who(),
        status: c.status,
        notes: c.notes,
        contactSpokenTo: contactPerson,
        aiSummary: c.aiSummary,
        qualification: {
          spaceType: v.spaceType,
          spaceSize: v.spaceSize,
          exhibitFrequency: v.exhibitFrequency,
          otherExpos: v.otherExpos,
          customerRequirements: v.customerRequirements
        }
      });

      log(`${who()}: ${c.name} → ${c.status}${contactPerson ? ' (spoke with ' + contactPerson + ')' : ''}`);
      save();
      closeModal();

      // Auto Dialer session submission
      if (f.id === 'f-ad-log') {
        clearInterval(state.AD.timer);
        state.AD.stats.total++;
        state.AD.stats.disp[c.status] = (state.AD.stats.disp[c.status] || 0) + 1;
        save();
        state.AD.idx++;
        showNotification(`Call logged for ${c.name} (${c.status})`);
        if (c.status === 'Appointment') {
          state.AD.state = 'paused';
          render();
          openAp(null, c.id);
        } else {
          startAdLead(render);
        }
        return;
      }

      const action = (e && e.submitter && e.submitter.value) || (lastSubmitBtn && lastSubmitBtn.form === f && lastSubmitBtn.value) || 'save';

      if (action === 'next') {
        const uncalled = activeEvId
          ? state.D.companies.filter(x => x.id != c.id && (x.ev == activeEvId || (Array.isArray(x.eventsAttended) && x.eventsAttended.some(att => (att.evId || att.id || att.ev) == activeEvId))) && x.status === 'New')
          : state.D.companies.filter(x => x.id != c.id && x.status === 'New');

        if (uncalled.length > 0) {
          const nextLead = uncalled[0];
          showNotification(`Saved! Moving to next lead: ${nextLead.name}`);
          navigate('co', { id: nextLead.id, ev: activeEvId });
        } else {
          showNotification(`Saved! All uncalled leads in this campaign are completed! 🎉`);
          render();
        }
      } else {
        showNotification(`Call log saved for ${c.name}`);
        render();
        if (v.status === 'Appointment') {
          openAp(null, c.id);
        }
      }
      return;
    }
  }

  // Company Note Form (from Single Company Detail View)
  if (f.id === 'f-co-note') {
    const c = state.D.companies.find(x => x.id == f.dataset.id);
    if (c && v.noteText && v.noteText.trim()) {
      const noteStr = v.noteText.trim();
      c.history = c.history || [];
      c.history.unshift({
        at: new Date().toISOString(),
        by: who(),
        status: c.status || 'Active',
        notes: noteStr
      });
      c.notes = noteStr;
      c.at = today();
      c.by = state.U;
      log(`${who()}: added note for ${c.name}`);
      save();
      render();
    }
  }

  // Add Contact Form
  if (f.id === 'f-add-contact') {
    const c = state.D.companies.find(x => x.id == f.dataset.id);
    if (c && v.name && v.name.trim()) {
      c.contacts = c.contacts || [];
      const isPri = !!v.isPrimary;
      const roleVal = (v.role === 'Other' && v.customRole ? v.customRole : v.role || '').trim();
      c.contacts.push({
        id: Date.now(),
        name: v.name.trim(),
        role: roleVal,
        phone: (v.phone || '').trim(),
        email: (v.email || '').trim(),
        linkedin: (v.linkedin || '').trim(),
        isPrimary: isPri
      });
      if (isPri || !c.contact) {
        c.contact = v.name.trim();
        if (v.phone) c.phone = c.phone || v.phone.trim();
        if (v.email) c.email = c.email || v.email.trim();
      }
      log(`${who()}: added contact ${v.name} to ${c.name}`);
      save();
      closeModal();
      render();
    }
  }

  // Add Event Attendance Form
  if (f.id === 'f-add-event-att') {
    const c = state.D.companies.find(x => x.id == f.dataset.id);
    if (c && v.evId) {
      c.eventsAttended = c.eventsAttended || [];
      c.eventsAttended.push({
        evId: +v.evId,
        stand: (v.stand || '').trim(),
        status: v.status || 'New',
        cb: ''
      });
      log(`${who()}: registered ${c.name} for event`);
      save();
      closeModal();
      render();
    }
  }

  // Report Problem Form
  if (f.id === 'fr') {
    state.D.reports.unshift({ id: Date.now(), by: state.U, pg: v.pg, t: v.t, at: today(), done: false });
    log(who() + ': reported an issue');
    save();
    render();
    alert('Thank you! Your report has been submitted.');
  }

  // Appointment Form
  if (f.id === 'fap') {
    const id = f.dataset.id;
    const old = id ? state.D.appts.find(x => x.id == id) : null;
    v.co = +v.co;
    v.calls = +v.calls || 0;

    if (old) {
      if (v.calls > old.calls) v.last = today();
      Object.assign(old, v);
    } else {
      state.D.appts.push({ id: Date.now(), ...v, by: state.U });
      const c = state.D.companies.find(x => x.id == v.co);
      if (c && (c.status === 'New' || c.status === 'Appointment')) {
        c.status = 'Appointment';
        c.by = state.U;
        c.at = today();
      }
    }
    const targetCo = state.D.companies.find(x => x.id == v.co);
    log(`${who()}: appointment for ${targetCo ? targetCo.name : 'company'}`);
    save();
    closeModal();
    render();
  }

  // Agent Form
  if (f.id === 'fa') {
    v.e = v.e.trim().toLowerCase();
    if (ALL().some(u => u.e === v.e)) {
      alert('This email is already registered.');
      return;
    }
    state.D.agents.push({ id: Date.now(), ...v });
    log('Added agent ' + v.n);
    save();
    render();
  }

  // Event Form
  if (f.id === 'fe') {
    const id = f.dataset.id;
    if (id) {
      const e = state.D.events.find(x => x.id == id);
      if (e) Object.assign(e, v);
      log('Updated event ' + v.name);
    } else {
      state.D.events.push({ id: Date.now(), ...v });
      log('Added event ' + v.name);
    }
    save();
    closeModal();
    render();
  }

  // Company Form
  if (f.id === 'fc') {
    const id = f.dataset.id;
    if (isA()) {
      if (!id) {
        alert('Adding new companies is restricted to Administrators.');
        return;
      }
      const c = state.D.companies.find(x => x.id == id);
      if (c) {
        c.phone = (v.phone || '').trim();
        c.contact = (v.contact || '').trim();
        c.altPhone = (v.altPhone || '').trim();
        c.email = (v.email || '').trim();
        c.contact2 = (v.contact2 || '').trim();
        c.phone2 = (v.phone2 || '').trim();
        c.email2 = (v.email2 || '').trim();
        c.by = state.U;
        c.at = today();
        log(`${who()}: updated contacts for ${c.name}`);
      }
      save();
      closeModal();
      render();
      return;
    }

    v.ev = +v.ev;
    if (v.status !== 'Callback') v.cb = '';
    if (id) {
      const c = state.D.companies.find(x => x.id == id);
      if (c) Object.assign(c, v);
      log('Updated ' + v.name);
    } else {
      state.D.companies.push({ id: Date.now(), ...v });
      log('Added ' + v.name);
    }
    save();
    closeModal();
    render();
  }

  // AI Settings Form
  if (f.id === 'f-ai-settings') {
    const key = (v.apiKey || '').trim();
    setGeminiApiKey(key);
    showNotification(key ? 'Google Gemini API Key saved!' : 'AI API Key removed.');
    closeModal();
    render();
    return;
  }
}

// Delegated Click Handlers
document.addEventListener('click', e => {
  // Open native calendar picker when clicking anywhere on date / datetime inputs
  const dateInput = e.target.closest('input[type="date"], input[type="datetime-local"]');
  if (dateInput && typeof dateInput.showPicker === 'function') {
    try {
      dateInput.showPicker();
    } catch (err) {}
  }

  const submitBtn = e.target.closest('button[type="submit"]');
  if (submitBtn) lastSubmitBtn = submitBtn;

  // Backdrop click closes modal
  if (e.target.id === 'm') {
    closeModal();
    return;
  }

  // Sortable table headers
  const th = e.target.closest('th.sortable');
  if (th) {
    const s = th.dataset.sort;
    if (state.F.sort === s) state.F.dir *= -1;
    else {
      state.F.sort = s;
      state.F.dir = 1;
    }
    const tb = $('#tb');
    if (tb) tb.innerHTML = rows();
    render();
    return;
  }

  const sb = e.target.closest('button');
  if (sb && sb.form && sb.type === 'submit' && !sb.dataset.act) {
    e.preventDefault();
    onSub(sb.form);
    return;
  }

  const a = e.target.closest('[data-act]');
  if (!a) return;
  const d = a.dataset;
  const c = state.D.companies.find(x => x.id == d.id);

  switch (d.act) {
    case 'toggle-sidebar':
      toggleSidebar();
      render();
      break;
    case 'theme':
      toggleTheme();
      render();
      break;
    case 'go':
      navigate(d.p);
      break;
    case 'out':
      clearInterval(state.AD.timer);
      logout();
      window.location.hash = '';
      render();
      break;
    case 'evco':
      navigate('evd', { id: d.id });
      break;
    case 'evnew':
      openEventModal(null);
      break;
    case 'evedit':
      openEventModal(d.id);
      break;
    case 'evdel':
      if (confirm('Are you sure you want to delete this event? Companies associated with it will remain.')) {
        state.D.events = state.D.events.filter(x => x.id != d.id);
        log('Deleted event');
        save();
        render();
      }
      break;
    case 'co':
      if (d.id) {
        navigate('co', { id: +d.id, ev: d.ev ? +d.ev : (state.EV || null) });
      } else {
        openCo(null, d.ev);
      }
      break;
    case 'co-edit':
      openCo(d.id);
      break;
    case 'add-contact':
      openAddContactModal(d.id);
      break;
    case 'add-event-att':
      openAddEventAttendanceModal(d.id);
      break;
    case 'x':
      closeModal();
      break;
    case 'del':
      if (isA()) {
        alert('Only administrators can delete companies.');
        break;
      }
      if (confirm(`Are you sure you want to delete "${c?.name || 'this company'}"?`)) {
        state.D.companies = state.D.companies.filter(x => x.id != d.id);
        log('Deleted ' + (c ? c.name : 'company'));
        save();
        closeModal();
        render();
      }
      break;
    case 'lg':
      navigate('co', { id: d.id, ev: d.ev });
      break;
    case 'toggle-lg-add-contact': {
      const box = $('#lg-add-contact-box');
      if (box) {
        const isHidden = box.style.display === 'none';
        box.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          const inp = $('#lg-new-ct-name');
          if (inp) inp.focus();
        }
      }
      break;
    }
    case 'toggle-co-add-contact': {
      const box = $('#co-add-contact-box');
      if (box) {
        const isHidden = box.style.display === 'none';
        box.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          const inp = $('#co-new-ct-name');
          if (inp) inp.focus();
        }
      }
      break;
    }
    case 'select-contact-row': {
      const name = d.name;
      const sel = $('#co-lg-contact-select') || $('#ad-contact-select');
      if (sel) {
        sel.value = name;
      }
      updateContactCardSelection(name);
      break;
    }
    case 'dial-call': {
      const statusEl = $('#lg-dial-status');
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--color-success);font-weight:600">● Dialing initiated…</span> Answer your Dialpad or softphone app.`;
      }
      break;
    }
    case 'co-dial-call': {
      const statusEl = $('#co-dial-status');
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--color-success);font-weight:600">● Dialing initiated…</span> Answer your Dialpad or softphone app.`;
      }
      break;
    }
    case 'choose-disp': {
      const targetInput = $(d.target);
      if (targetInput) {
        targetInput.value = d.s;
      }
      const grid = a.closest('.disp-grid');
      if (grid) {
        grid.querySelectorAll('.disp-btn').forEach(btn => btn.classList.remove('selected'));
      }
      a.classList.add('selected');

      const isCo = (d.target === '#co-lg-status-input');
      const isAd = (d.target === '#ad-status-input');
      const wrap = isCo ? $('#co-lg-cb-wrap') : (isAd ? $('#ad-cb-wrap') : $('#lg-cb-wrap'));
      const cbInp = isCo ? $('#co-lg-cb') : (isAd ? $('#ad-cb') : $('#lg-cb'));

      if (wrap) {
        const isCallback = (d.s === 'Callback');
        wrap.style.display = isCallback ? 'block' : 'none';
        if (isCallback && cbInp && !cbInp.value) {
          cbInp.value = getQuickCallbackTime('tomorrow_10am');
        }
      }
      break;
    }
    case 'rres': {
      const r = state.D.reports.find(x => x.id == d.id);
      if (r) {
        r.done = !r.done;
        save();
        render();
      }
      break;
    }
    case 'ap':
      openAp(d.id);
      break;
    case 'apnew':
      openAp(null, d.co);
      break;
    case 'apf':
      state.AF = d.f;
      render();
      break;
    case 'apdel':
      if (confirm('Are you sure you want to delete this appointment?')) {
        state.D.appts = state.D.appts.filter(x => x.id != d.id);
        save();
        closeModal();
        render();
      }
      break;
    case 'delag':
      if (confirm('Are you sure you want to remove this agent?')) {
        state.D.agents = state.D.agents.filter(x => x.id != d.id);
        save();
        render();
      }
      break;
    case 'dial':
      log('Dialled ' + (c?.name || ''));
      save();
      break;
    case 'disp': {
      if (!c) break;
      const notesVal = $('#qn') ? $('#qn').value.trim() : '';
      const cbVal = $('#qcb') ? $('#qcb').value : '';
      c.status = d.s;
      c.notes = notesVal;
      c.cb = d.s === 'Callback' ? (cbVal || today()) : '';
      c.by = state.U;
      c.at = today();

      c.history = c.history || [];
      c.history.unshift({
        at: new Date().toISOString(),
        by: who(),
        status: d.s,
        notes: notesVal
      });

      log(`${who()}: ${c.name} → ${d.s}`);
      save();
      render();
      if (d.s === 'Appointment') {
        openAp(null, c.id);
      }
      break;
    }
    case 'ad-setup':
      openAdSetup(d.id || state.AD.ev || state.EV);
      break;
    case 'ad-skip':
      clearInterval(state.AD.timer);
      state.AD.idx++;
      startAdLead(render);
      break;
    case 'ad-pause':
      clearInterval(state.AD.timer);
      state.AD.state = 'paused';
      render();
      break;
    case 'ad-resume':
      startAdLead(render);
      break;
    case 'ad-dial': {
      const cur = state.AD.list[state.AD.idx];
      if (cur) {
        clearInterval(state.AD.timer);
        state.AD.state = 'calling';
        log('Dialled ' + cur.name);
        save();
        render();
      }
      break;
    }
    case 'ad-disp': {
      const cur = state.AD.list[state.AD.idx];
      if (!cur) break;
      clearInterval(state.AD.timer);
      const notesVal = $('#ad-notes') ? $('#ad-notes').value.trim() : '';
      const cbVal = $('#ad-cb') ? $('#ad-cb').value : '';
      cur.status = d.s;
      cur.notes = notesVal;
      cur.cb = d.s === 'Callback' ? (cbVal || today()) : '';
      cur.by = state.U;
      cur.at = today();

      cur.history = cur.history || [];
      cur.history.unshift({
        at: new Date().toISOString(),
        by: who(),
        status: d.s,
        notes: notesVal
      });

      log(`${who()}: ${cur.name} → ${d.s}`);
      state.AD.stats.total++;
      state.AD.stats.disp[d.s] = (state.AD.stats.disp[d.s] || 0) + 1;
      save();
      state.AD.idx++;
      if (d.s === 'Appointment') {
        state.AD.state = 'paused';
        render();
        openAp(null, cur.id);
      } else {
        startAdLead(render);
      }
      break;
    }
    case 'exportcsv': {
      const list = getFilteredCompanies();
      exportCompaniesCSV(list);
      break;
    }
    case 'copy-val': {
      const val = d.val;
      if (val) {
        navigator.clipboard.writeText(val).then(() => {
          const original = a.innerHTML;
          a.innerHTML = `${IC.checkCircle} Copied`;
          a.classList.add('copied');
          setTimeout(() => {
            a.innerHTML = original;
            a.classList.remove('copied');
          }, 1500);
        }).catch(() => {
          prompt('Copy to clipboard: Ctrl+C, Enter', val);
        });
      }
      break;
    }
    case 'add-snippet': {
      const targetSel = d.target;
      const snippet = d.val;
      const ta = $(targetSel);
      if (ta && snippet) {
        const cur = ta.value.trim();
        ta.value = cur ? `${cur} | ${snippet}` : snippet;
        ta.focus();
      }
      break;
    }
    case 'set-cb': {
      const targetSel = d.target;
      const type = d.type;
      const input = $(targetSel);
      if (input && type) {
        input.value = getQuickCallbackTime(type);
      }
      break;
    }
    case 'open-picker': {
      const input = $(d.target);
      if (input) {
        if (typeof input.showPicker === 'function') {
          try {
            input.showPicker();
          } catch (err) {
            input.focus();
          }
        } else {
          input.focus();
        }
      }
      break;
    }
    case 'ai-settings': {
      openAiSettingsModal();
      break;
    }
    case 'toggle-key-visibility': {
      const inp = $('#gemini-api-key-input');
      if (inp) {
        const isPw = inp.type === 'password';
        inp.type = isPw ? 'text' : 'password';
        a.textContent = isPw ? 'Hide' : 'Show';
      }
      break;
    }
    case 'clear-ai-key': {
      setGeminiApiKey('');
      closeModal();
      showNotification('Google Gemini API Key removed.');
      render();
      break;
    }
    case 'clear-ai-summary': {
      const box = a.closest('.ai-preview-box') || $(d.target);
      if (box) {
        box.style.display = 'none';
        const inp = box.querySelector('input[name="aiSummary"]');
        if (inp) inp.value = '';
      }
      break;
    }
    case 'test-ai-key': {
      const inp = $('#gemini-api-key-input');
      const resBox = $('#ai-test-result');
      if (!inp || !resBox) break;
      const testKey = inp.value.trim();
      if (!testKey) {
        resBox.style.display = 'block';
        resBox.style.background = 'rgba(239,68,68,0.1)';
        resBox.style.color = '#ef4444';
        resBox.textContent = 'Please enter an API key first.';
        break;
      }

      const btn = a;
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Testing...';
      resBox.style.display = 'block';
      resBox.style.background = 'var(--bg-app)';
      resBox.style.color = 'var(--tx-secondary)';
      resBox.textContent = 'Connecting to Google Gemini API...';

      generateCallSummary({ companyName: 'Melbourne Exhibitor', notes: 'Client interested in 3x3 booth.' }, testKey).then(r => {
        btn.disabled = false;
        btn.textContent = origText;
        if (r.ok) {
          resBox.style.background = 'rgba(16,185,129,0.1)';
          resBox.style.color = '#10b981';
          resBox.innerHTML = `<b>✓ Connection Successful!</b><br>Gemini 1.5 Flash Free Tier is active and working.`;
        } else {
          resBox.style.background = 'rgba(239,68,68,0.1)';
          resBox.style.color = '#ef4444';
          resBox.innerHTML = `<b>✗ Connection Failed:</b><br>${esc(r.message || 'Invalid key')}`;
        }
      }).catch(err => {
        btn.disabled = false;
        btn.textContent = origText;
        resBox.style.background = 'rgba(239,68,68,0.1)';
        resBox.style.color = '#ef4444';
        resBox.textContent = 'Network error: ' + (err.message || 'Failed to connect');
      });
      break;
    }
    case 'gen-ai-summary': {
      const formSel = d.form || '#f-co-log';
      const form = $(formSel);
      if (!form) break;

      const isAd = formSel.includes('ad');
      const companyId = form.dataset.id;
      const co = state.D.companies.find(x => x.id == companyId) || {};

      const notesEl = isAd ? $('#ad-notes') : $('#co-lg-notes');
      const reqEl = isAd ? ($('#ad-q-customerRequirements') || $('#ad-cust-req')) : ($('#co-lg-cust-req') || form.querySelector('[name="customerRequirements"]'));
      const statusInp = isAd ? $('#ad-status-input') : $('#co-lg-status-input');
      const spaceTypeInp = form.querySelector('[name="spaceType"]');
      const spaceSizeInp = form.querySelector('[name="spaceSize"]');
      const contactSelect = isAd ? $('#ad-contact-select') : $('#co-lg-contact-select');
      const cbInp = isAd ? $('#ad-cb') : $('#co-lg-cb');

      const callData = {
        companyName: co.name || 'Client',
        contactName: (contactSelect ? contactSelect.value : '') || co.contact || '',
        status: (statusInp ? statusInp.value : '') || co.status || 'Active',
        notes: (notesEl ? notesEl.value : '').trim(),
        customerRequirements: (reqEl ? reqEl.value : '').trim(),
        spaceType: spaceTypeInp ? spaceTypeInp.value : '',
        spaceSize: spaceSizeInp ? spaceSizeInp.value : '',
        cb: (cbInp ? cbInp.value : '') || co.cb || ''
      };

      if (!callData.notes && !callData.customerRequirements && !callData.status) {
        showNotification('Please enter call notes or select a disposition first.');
        if (notesEl) notesEl.focus();
        break;
      }

      const btn = a;
      const origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block;animation:spin 0.8s linear infinite;margin-right:4px">⏳</span> Summarizing...`;

      generateCallSummary(callData).then(res => {
        btn.disabled = false;
        btn.innerHTML = origHtml;

        if (!res.ok) {
          showNotification(res.message || 'AI summarization failed.');
          if (res.error === 'INVALID_KEY' || res.error === 'NO_KEY') {
            openAiSettingsModal();
          }
          return;
        }

        const previewBox = isAd ? $('#ad-ai-preview') : $('#co-ai-preview');
        const summaryInp = isAd ? $('#ad-ai-summary-input') : $('#co-ai-summary-input');
        if (summaryInp) summaryInp.value = res.summary;
        if (previewBox) {
          const txt = previewBox.querySelector('.ai-summary-text');
          if (txt) txt.textContent = res.summary;
          previewBox.style.display = 'block';
        }
        showNotification('✨ AI Call Takeaways generated!');
      }).catch(err => {
        btn.disabled = false;
        btn.innerHTML = origHtml;
        showNotification('Error generating AI summary: ' + (err.message || 'Unknown error'));
      });
      break;
    }
    case 'toggle-battlecard': {
      const body = $('#battlecard-content');
      const toggleText = $('#battlecard-toggle-text');
      if (body) {
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'grid' : 'none';
        if (toggleText) {
          toggleText.innerHTML = isHidden ? `<span>Hide Battlecard</span> ${IC.chevronRight}` : `<span>Show Battlecard</span> ${IC.chevronDown}`;
        }
      }
      break;
    }
  }
});

// Form Submit Event
document.addEventListener('submit', e => {
  e.preventDefault();
  onSub(e.target, e);
});

// Keyboard Accessibility (Esc closes modal, Ctrl+B toggles sidebar) - No disposition hotkeys
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleSidebar();
    render();
  }
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.form && e.target.type !== 'textarea') {
    e.preventDefault();
    // Don't call onSub here — the form's submit event handler already handles it.
    // Calling it here caused double submissions (keydown fires onSub, then native submit fires onSub again).
  }
});

// Search Input Listener
document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    state.F.q = e.target.value;
    const tb = $('#tb');
    if (tb) tb.innerHTML = rows();
  }
});

// Dropdowns & CSV File Import
document.addEventListener('change', e => {
  const t = e.target;
  if (t.classList.contains('ad-st-check')) {
    const form = t.closest('form#fad');
    if (form) updateAdModalCount(+form.dataset.ev);
  }

  if (t.name === 'spoken_contact_radio') {
    updateContactCardSelection(t.value);
  }

  if (t.id === 'f-contact-role') {
    const wrap = $('#f-contact-custom-role-wrap');
    if (wrap) {
      const isOther = t.value === 'Other';
      wrap.style.display = isOther ? 'flex' : 'none';
      if (isOther) {
        const inp = $('#f-contact-custom-role');
        if (inp) inp.focus();
      }
    }
  }

  if (t.id === 'lg-status-select' || t.id === 'co-lg-status-select') {
    const wrapId = t.id === 'lg-status-select' ? '#lg-cb-wrap' : '#co-lg-cb-wrap';
    const inpId = t.id === 'lg-status-select' ? '#lg-cb' : '#co-lg-cb';
    const wrap = $(wrapId);
    if (wrap) {
      const isCallback = t.value === 'Callback';
      wrap.style.display = isCallback ? 'block' : 'none';
      if (isCallback) {
        const inp = $(inpId);
        if (inp && !inp.value) inp.value = getQuickCallbackTime('tomorrow_10am');
      }
    }
  }

  if (t.id === 'fev' || t.id === 'fst') {
    state.F[t.id === 'fev' ? 'ev' : 'st'] = t.value;
    const tb = $('#tb');
    if (tb) tb.innerHTML = rows();
  }

  if (t.id === 'qev') {
    state.F.ev = t.value;
    render();
  }

  if (t.id === 'csv' && t.files[0]) {
    const file = t.files[0];
    const r = new FileReader();
    r.onload = () => {
      const defaultEv = +(state.F.ev || state.D.events[0]?.id || 1);
      let count = 0;
      const lines = r.result.split(/\r?\n/);

      lines.forEach((l, i) => {
        if (!l.trim()) return;
        const cols = parseCSVLine(l);
        const name = cols[0];
        const phone = cols[1];
        const altPhone = cols.length >= 4 ? cols[2] : '';
        const email = cols.length >= 4 ? cols[3] : '';
        const contact = cols.length >= 5 ? cols[4] : cols[2];
        const stand = cols.length >= 6 ? cols[5] : cols[3];

        if (name && !(i === 0 && /name|company/i.test(name))) {
          state.D.companies.push({
            id: Date.now() + i,
            name,
            phone: phone || '',
            altPhone: altPhone || '',
            email: email || '',
            contact: contact || '',
            stand: stand || '',
            ev: defaultEv,
            status: 'New',
            cb: '',
            notes: '',
            history: []
          });
          count++;
        }
      });
      t.value = ''; // Reset input to allow re-upload
      log(`Imported ${count} companies from CSV`);
      save();
      render();
      alert(`Successfully imported ${count} companies!`);
    };
    r.readAsText(file);
  }
});

// Initialize routing from current URL hash
if (state.U) {
  const initialRoute = parseRouteFromHash();
  state.P = initialRoute.p;
  if (initialRoute.cid !== undefined) state.CID = initialRoute.cid;
  if (initialRoute.ev !== undefined) {
    if (initialRoute.p === 'autodial') state.AD.ev = initialRoute.ev;
    else state.EV = initialRoute.ev;
  }
}

window.addEventListener('hashchange', handleHashChange);

// Initial Render and Sync Initialization
render();
if (API && state.U) {
  boot(render);
}
