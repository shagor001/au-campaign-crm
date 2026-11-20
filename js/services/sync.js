import { state } from '../state.js';
import { API } from '../config.js';
import { isA } from './auth.js';
import { $ } from '../utils/dom.js';

const COLS = ['events', 'companies', 'appts', 'agents', 'reports'];
const SN = {};
let busy = 0, again = 0, since = 0, tm = null;

export const sy = t => {
  let e = $('#sy');
  if (!e) {
    e = document.createElement('div');
    e.id = 'sy';
    e.style.cssText = 'position:fixed;left:16px;bottom:16px;background:#ef4444;color:#fff;padding:6px 14px;border-radius:99px;font-size:12px;font-weight:600;z-index:99;box-shadow:var(--shadow)';
    document.body.append(e);
  }
  e.textContent = t;
  e.style.display = t ? 'block' : 'none';
};

export const log = t => {
  state.D.log.unshift(new Date().toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) + ' – ' + t);
  state.D.log = state.D.log.slice(0, 50);
};

export const save = () => {
  if (API) {
    sync();
  } else {
    try {
      localStorage.setItem('aucrm', JSON.stringify(state.D));
    } catch (e) {}
  }
};

export async function sync(onUpdate) {
  if (!API || !state.U) return false;
  if (busy) {
    again = 1;
    return false;
  }
  busy = 1;
  let ok = false;
  const up = [], del = [], seen = {};

  COLS.forEach(c => state.D[c].forEach(r => {
    const k = c + ':' + r.id, j = JSON.stringify(r);
    seen[k] = 1;
    if (SN[k] !== j) up.push({ c, id: r.id, j });
  }));

  Object.keys(SN).forEach(k => {
    if (!seen[k]) {
      const i = k.indexOf(':');
      del.push({ c: k.slice(0, i), id: k.slice(i + 1) });
    }
  });

  try {
    const R = await (await fetch(API, {
      method: 'POST',
      body: JSON.stringify({ op: 'sync', u: state.U, p: state.PW, since, up, del })
    })).json();
    if (!R.ok) throw R.err;

    up.forEach(x => SN[x.c + ':' + x.id] = x.j);
    del.forEach(x => delete SN[x.c + ':' + x.id]);
    since = R.ts;
    let ch = 0;

    R.rows.forEach(w => {
      const a = state.D[w.c], k = w.c + ':' + w.id, i = a.findIndex(x => x.id == w.id);
      if (w.del) {
        if (i >= 0) { a.splice(i, 1); ch++; }
        delete SN[k];
      } else if (SN[k] !== w.j) {
        const r = JSON.parse(w.j);
        if (i >= 0) a[i] = r;
        else a.push(r);
        SN[k] = w.j;
        ch++;
      }
    });

    sy('');
    ok = true;
    if (ch && !$('#m') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && onUpdate) {
      onUpdate();
    }
  } catch (e) {
    sy(e === 'auth' ? 'Signed out – please sign in again' : 'Offline – retrying…');
  }

  busy = 0;
  if (again) {
    again = 0;
    sync(onUpdate);
  }
  return ok;
}

export async function boot(renderFn) {
  const ok = await sync(renderFn);
  if (ok && !isA() && !state.D.events.length) {
    state.D.events.push({
      id: 1,
      name: 'Melbourne Build Expo 2026',
      start: '2026-06-18',
      end: '2026-06-19',
      where: 'Melbourne Convention Centre',
      assignedAgent: 'agent1@crm.au'
    });
    save();
  }
  if (renderFn) renderFn();
  clearInterval(tm);
  tm = setInterval(() => sync(renderFn), 8000);
}
