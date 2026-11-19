import { state } from '../state.js';
import { ALL } from '../services/auth.js';
import { today } from './dates.js';

// Robust CSV Line Parser handling quotes and commas
export const parseCSVLine = str => {
  const arr = [];
  let quote = false;
  let col = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const next = str[i + 1];
    if (c === '"') {
      if (quote && next === '"') {
        col += '"';
        i++;
      } else {
        quote = !quote;
      }
    } else if (c === ',' && !quote) {
      arr.push(col.trim());
      col = '';
    } else {
      col += c;
    }
  }
  arr.push(col.trim());
  return arr;
};

// Export filtered or full companies list
export const exportCompaniesCSV = list => {
  const csvRows = [
    ['Company', 'Phone', 'Direct Mobile', 'Email', 'Contact', 'Stand', 'Event', 'Status', 'Callback Date', 'Notes', 'Agent'].map(s => `"${s}"`).join(',')
  ];

  list.forEach(item => {
    const evName = (state.D.events.find(e => e.id == item.ev) || {}).name || '';
    const agentName = (ALL().find(a => a.e === item.by) || {}).n || item.by || '';
    csvRows.push([
      item.name || '',
      item.phone || '',
      item.altPhone || '',
      item.email || '',
      item.contact || '',
      item.stand || '',
      evName,
      item.status || '',
      item.cb || '',
      item.notes || '',
      agentName
    ].map(s => `"${String(s).replace(/"/g, '""')}"`).join(','));
  });

  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AU_Campaign_Companies_${today()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
