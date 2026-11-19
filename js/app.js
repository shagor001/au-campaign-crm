import { state, toggleTheme } from './state.js';
import { API, IC } from './config.js';
import { render } from './router.js';
import { boot, save, log } from './services/sync.js';
import { isA, who, ALL, logout } from './services/auth.js';
import { $, closeModal } from './utils/dom.js';
import { today, getQuickCallbackTime } from './utils/dates.js';
import { exportCompaniesCSV, parseCSVLine } from './utils/csv.js';
import { getFilteredCompanies, rows } from './views/companies.js';
import { openLg, openAp, openCo, openEventModal } from './components/modals.js';
import { openAdSetup, updateAdModalCount } from './components/autodialer-setup.js';
import { startAdLead } from './views/autodialer.js';

// Central Form Submission Handler
function onSub(f) {
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
    state.P = 'autodial';
    startAdLead(render);
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
        state.P = 'dash';
        try {
          localStorage.setItem('aucrm_u', state.U);
          localStorage.setItem('aucrm_p', state.PW);
          localStorage.setItem('aucrm_r', state.ROLE);
        } catch (x) {}
        boot(render);
      }).catch(() => {
        $('#er').textContent = 'Cannot reach the sync server.';
      });
      return;
    }

    if (ALL().some(u => u.e === em && u.p === v.p)) {
      state.U = em;
      state.P = 'dash';
      try {
        localStorage.setItem('aucrm_u', state.U);
      } catch (x) {}
      render();
    } else {
      $('#er').textContent = 'Wrong email or password.';
    }
  }

  // Call Log Form
  if (f.id === 'flg') {
    const c = state.D.companies.find(x => x.id == f.dataset.id);
    if (c) {
      c.status = v.status;
      if (v.phone !== undefined) c.phone = (v.phone || '').trim();
      c.contact = v.contact;
      c.altPhone = v.altPhone || c.altPhone || '';
      c.email = v.email || c.email || '';
      c.notes = v.notes;
      c.cb = v.status === 'Callback' ? (v.cb || today()) : '';
      c.by = state.U;
      c.at = today();

      c.history = c.history || [];
      c.history.unshift({
        at: new Date().toISOString(),
        by: who(),
        status: v.status,
        notes: v.notes
      });

      log(`${who()}: ${c.name} → ${v.status}`);
      save();
      closeModal();
      render();
      if (v.status === 'Appointment') {
        openAp(null, c.id);
      }
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
}

// Delegated Click Handlers
document.addEventListener('click', e => {
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
    case 'theme':
      toggleTheme();
      render();
      break;
    case 'go':
      clearInterval(state.AD.timer);
      state.P = d.p;
      render();
      window.scrollTo(0, 0);
      break;
    case 'out':
      clearInterval(state.AD.timer);
      logout();
      render();
      break;
    case 'evco':
      clearInterval(state.AD.timer);
      state.EV = d.id;
      state.P = 'evd';
      render();
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
      openCo(d.id, d.ev);
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
      openLg(d.id);
      break;
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
  onSub(e.target);
});

// Keyboard Accessibility (Esc closes modal) - No disposition hotkeys
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
  }
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.form && e.target.type !== 'textarea') {
    e.preventDefault();
    onSub(e.target.form);
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

// Initial Render and Sync Initialization
render();
if (API && state.U) {
  boot(render);
}
