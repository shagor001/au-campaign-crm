import { esc } from './dom.js';

export const today = () => new Date().toISOString().slice(0, 10);

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const formatDateRange = (startStr, endStr, fallback = '—') => {
  if (!startStr) return fallback || '—';
  const parsePart = s => {
    if (!s) return null;
    const p = s.split('T')[0].split('-');
    if (p.length < 3) return null;
    return { y: +p[0], m: +p[1], d: +p[2] };
  };

  const p1 = parsePart(startStr);
  const p2 = parsePart(endStr);

  if (!p1) return esc(startStr);
  const mName1 = MONTH_NAMES[p1.m - 1] || '';

  if (!p2 || (p1.y === p2.y && p1.m === p2.m && p1.d === p2.d)) {
    return `${p1.d} ${mName1}, ${p1.y}`;
  }

  const mName2 = MONTH_NAMES[p2.m - 1] || '';

  // Same year and same month: e.g. 18-19 June, 2026
  if (p1.y === p2.y && p1.m === p2.m) {
    return `${p1.d}-${p2.d} ${mName1}, ${p1.y}`;
  }

  // Same year, different months: e.g. 28 Feb – 2 Mar, 2026
  if (p1.y === p2.y) {
    return `${p1.d} ${mName1} – ${p2.d} ${mName2}, ${p1.y}`;
  }

  // Different years
  return `${p1.d} ${mName1}, ${p1.y} – ${p2.d} ${mName2}, ${p2.y}`;
};

export const fdy = s => {
  if (!s) return '—';
  const parts = s.split('T')[0].split('-');
  if (parts.length < 3) return esc(s);
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  return isNaN(d) ? esc(s) : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatFriendlyDateTime = s => {
  if (!s) return '—';
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.trim())) {
    const parts = s.trim().split('-');
    const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    if (isNaN(d)) return esc(s);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return esc(s);

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();

  const timeStr = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  const dateStr = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${dateStr}, ${timeStr}`;
};

export const fdt = s => formatFriendlyDateTime(s);

// Generate ISO datetime string offset by hours or set to a specific hour tomorrow
export const getQuickCallbackTime = type => {
  const now = new Date();
  if (type === '2h') {
    now.setHours(now.getHours() + 2);
  } else if (type === 'tomorrow_10am') {
    now.setDate(now.getDate() + 1);
    now.setHours(10, 0, 0, 0);
  } else if (type === 'tomorrow_2pm') {
    now.setDate(now.getDate() + 1);
    now.setHours(14, 0, 0, 0);
  } else if (type === '2d_11am') {
    now.setDate(now.getDate() + 2);
    now.setHours(11, 0, 0, 0);
  }
  // Format for datetime-local: YYYY-MM-DDTHH:mm
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return localIso;
};

// Australian State & Timezone Intelligence
export const getAuTimezoneInfo = (phone = '', eventWhere = '') => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  let stateCode = 'NSW / VIC';
  let offsetHours = 11; // Default AEDT (UTC+11)

  const whereLower = (eventWhere || '').toLowerCase();
  const isWA = whereLower.includes('wa') || whereLower.includes('perth');
  const isSA = whereLower.includes('sa') || whereLower.includes('adelaide');
  const isQLD = whereLower.includes('qld') || whereLower.includes('brisbane');

  if (cleanPhone.startsWith('08') || cleanPhone.startsWith('+618')) {
    if (isWA || (!isSA && !whereLower.includes('darwin'))) {
      stateCode = 'WA (AWST)';
      offsetHours = 8;
    } else if (isSA) {
      stateCode = 'SA (ACDT)';
      offsetHours = 10.5;
    } else {
      stateCode = 'NT (ACST)';
      offsetHours = 9.5;
    }
  } else if (cleanPhone.startsWith('07') || cleanPhone.startsWith('+617') || isQLD) {
    stateCode = 'QLD (AEST)';
    offsetHours = 10;
  } else if (cleanPhone.startsWith('03') || cleanPhone.startsWith('+613')) {
    stateCode = 'VIC / TAS';
    offsetHours = 11;
  } else if (cleanPhone.startsWith('02') || cleanPhone.startsWith('+612')) {
    stateCode = 'NSW / ACT';
    offsetHours = 11;
  } else if (isWA) {
    stateCode = 'WA (AWST)';
    offsetHours = 8;
  }

  // Calculate local time in destination zone
  const nowUtc = Date.now() + (new Date().getTimezoneOffset() * 60000);
  const targetDate = new Date(nowUtc + (offsetHours * 3600000));
  const hour = targetDate.getHours();
  const minute = targetDate.getMinutes().toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const timeString = `${displayHour}:${minute} ${ampm}`;

  let status = 'open';
  let badgeColor = 'var(--sc)';
  let statusText = 'Business Hours';

  if (hour < 8 || hour >= 18) {
    status = 'closed';
    badgeColor = 'var(--rd)';
    statusText = hour < 8 ? 'Too Early' : 'After Hours';
  } else if (hour === 8 || hour === 17) {
    status = 'warning';
    badgeColor = 'var(--wr)';
    statusText = hour === 8 ? 'Early Morning' : 'Closing Soon';
  }

  return {
    stateCode,
    timeString,
    status,
    badgeColor,
    statusText,
    badgeHtml: `<span class="ad-tz-badge" style="border-color:${badgeColor}">
      <span class="ad-tz-dot ${status === 'open' ? 'open' : (status === 'warning' ? 'closing' : 'closed')}"></span>
      <span>${stateCode}: <b class="tabular">${timeString}</b></span>
      <small style="color:${badgeColor};font-weight:600">(${statusText})</small>
    </span>`
  };
};
