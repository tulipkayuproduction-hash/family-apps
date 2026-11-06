// Fungsi tulen (tiada DOM / Firebase) supaya mudah diuji.
export const DAY = 86400000;
export const pad = n => String(n).padStart(2, '0');
export const ymd = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const ymOf = d => ymd(d).slice(0, 7);
export const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const combine = (date, time) => { const d = parseYmd(date); if (time) { const [h, m] = time.split(':').map(Number); d.setHours(h, m); } return d.getTime(); };
export const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const shiftYm = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return ymOf(d); };
export const daysUntil = (date, now = Date.now()) => Math.round((startOfDay(parseYmd(date).getTime()) - startOfDay(now)) / DAY);

// Tambah k langkah dari tarikh asal; kira dari asal supaya 31 Jan > 28 Feb > 31 Mac (tidak hanyut).
function step(anchor, repeat, k) {
  const a = new Date(anchor);
  if (repeat === 'daily') return addDays(anchor, k);
  if (repeat === 'weekly') return addDays(anchor, 7 * k);
  const months = repeat === 'yearly' ? 12 * k : k;
  const y = a.getFullYear(), m = a.getMonth() + months;
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(a.getDate(), last), a.getHours(), a.getMinutes()).getTime();
}
const UNIT = { daily: DAY, weekly: 7 * DAY, monthly: 32 * DAY, yearly: 367 * DAY };

/** Kejadian pertama selepas `after`. Null jika tiada. */
export function nextOccurrence(anchor, repeat, after) {
  if (!repeat || repeat === 'none') return anchor > after ? anchor : null;
  if (anchor > after) return anchor;
  let k = Math.max(0, Math.floor((after - anchor) / UNIT[repeat]) - 1);
  for (let t = step(anchor, repeat, k); ; t = step(anchor, repeat, ++k)) if (t > after) return t;
}
export function occurrences(anchor, repeat, from, to) {
  const out = [];
  let t = nextOccurrence(anchor, repeat, from - 1);
  while (t !== null && t <= to && out.length < 400) { out.push(t); t = nextOccurrence(anchor, repeat, t); }
  return out;
}

/** Tarikh akhir komitmen pada bulan tertentu; null jika di luar tempoh. */
export function commitmentDue(c, ym) {
  if (c.startYm && ym < c.startYm) return null;
  if (c.endYm && ym > c.endYm) return null;
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, Math.min(Number(c.dueDay) || 1, daysInMonth(y, m - 1))).getTime();
}
export function commitmentMonth(list, ym) {
  const rows = list.map(c => ({ c, due: commitmentDue(c, ym), paid: !!(c.paid && c.paid[ym]) })).filter(r => r.due !== null).sort((a, b) => a.due - b.due);
  const total = rows.reduce((s, r) => s + Number(r.c.amount || 0), 0);
  const paid = rows.filter(r => r.paid).reduce((s, r) => s + Number(r.c.amount || 0), 0);
  return { rows, total, paid, unpaid: total - paid };
}

export function expenseMonth(list, ym, budgets = []) {
  const rows = list.filter(e => (e.date || '').startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  const total = rows.reduce((s, e) => s + Number(e.amount || 0), 0);
  const map = {};
  rows.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
  budgets.forEach(b => { if (!(b.category in map)) map[b.category] = 0; });
  const cats = Object.entries(map).map(([category, spent]) => ({ category, spent, budget: Number(budgets.find(b => b.category === category)?.amount || 0) })).sort((a, b) => b.spent - a.spent);
  const budget = budgets.reduce((s, b) => s + Number(b.amount || 0), 0);
  return { rows, total, cats, budget };
}

/** Semua perkara dalam julat masa, untuk kalendar dan laman utama. */
export function agenda(s, from, to) {
  const out = [];
  (s.events || []).forEach(e => {
    if (!e.date) return;
    occurrences(combine(e.date, e.time), e.repeat, from, to).forEach(t => out.push({ t, allDay: !e.time, kind: 'events', id: e.id, title: e.title, sub: [e.time && e.endTime ? `hingga ${e.endTime}` : '', e.location].filter(Boolean).join(', '), who: e.member }));
  });
  (s.tasks || []).forEach(x => {
    if (x.done || !x.due) return;
    const t = parseYmd(x.due).getTime();
    if (t >= from && t <= to) out.push({ t, allDay: true, kind: 'tasks', id: x.id, title: x.title, sub: 'Tugasan', who: x.assignee });
  });
  (s.reminders || []).forEach(r => {
    if (r.nextAt == null) return;
    const list = r.nextAt >= from && r.nextAt <= to ? [r.nextAt] : [];
    if (r.repeat && r.repeat !== 'none') occurrences(r.startAt, r.repeat, Math.max(from, r.nextAt + 1), to).forEach(t => list.push(t));
    list.forEach(t => out.push({ t, allDay: false, kind: 'reminders', id: r.id, title: r.title, sub: 'Peringatan' }));
  });
  let ym = ymOf(from);
  while (ym <= ymOf(to)) {
    (s.commitments || []).forEach(c => {
      const t = commitmentDue(c, ym);
      if (t !== null && t >= from && t <= to) out.push({ t, allDay: true, kind: 'commitments', id: c.id, title: c.name, sub: 'Komitmen', amount: Number(c.amount), paid: !!(c.paid && c.paid[ym]), ym });
    });
    ym = shiftYm(ym, 1);
  }
  (s.dates || []).forEach(d => {
    if (!d.date) return;
    occurrences(parseYmd(d.date).getTime(), d.yearly ? 'yearly' : 'none', from, to).forEach(t => out.push({ t, allDay: true, kind: 'dates', id: d.id, title: d.title, sub: 'Tarikh penting' }));
  });
  return out.sort((a, b) => (startOfDay(a.t) - startOfDay(b.t)) || (b.allDay - a.allDay) || (a.t - b.t));
}

export function taskBuckets(tasks, now = Date.now()) {
  const today = ymd(now);
  const b = { overdue: [], today: [], later: [], none: [], done: [] };
  tasks.forEach(t => {
    if (t.done) b.done.push(t);
    else if (!t.due) b.none.push(t);
    else if (t.due < today) b.overdue.push(t);
    else if (t.due === today) b.today.push(t);
    else b.later.push(t);
  });
  const rank = { high: 0, normal: 1, low: 2 };
  const by = (x, y) => (x.due || '').localeCompare(y.due || '') || (rank[x.priority] ?? 1) - (rank[y.priority] ?? 1);
  [b.overdue, b.today, b.later, b.none].forEach(l => l.sort(by));
  b.done.sort((x, y) => (y.doneAt || 0) - (x.doneAt || 0));
  return b;
}

/** Tarikh seterusnya bagi tugasan berulang selepas ditanda siap. */
export function nextTaskDue(due, repeat, now = Date.now()) {
  const n = nextOccurrence(parseYmd(due).getTime(), repeat, Math.max(startOfDay(now), parseYmd(due).getTime()));
  return n === null ? null : ymd(n);
}

export function distanceM(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function shouldSendLocation(last, cur, now = Date.now()) {
  if (!last) return true;
  const gap = now - last.at;
  return gap >= 120000 || (gap >= 20000 && distanceM(last, cur) >= 30);
}
export function ago(t, now = Date.now()) {
  const m = Math.round((now - t) / 60000);
  if (m < 1) return 'baru sahaja';
  if (m < 60) return `${m} minit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}
export const rm = n => 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
