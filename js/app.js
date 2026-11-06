import { createStore, COLORS } from './store.js';
import { DAY, ymd, ymOf, combine, startOfDay, addDays, shiftYm, daysUntil, daysInMonth, parseYmd, nextOccurrence, occurrences, commitmentMonth, expenseMonth, agenda, taskBuckets, nextTaskDue, shouldSendLocation, ago, rm } from './logic.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const I = {
  home: '<path d="M12 21v-9"/><path d="M12 19c-3 0-6-1.500-7-4 3-.5 5.500.5 7 2.500 1.500-2 4-3 7-2.500-1 2.500-4 4-7 4z"/><path d="M6 3l3 3 3-3.500L15 6l3-3v6.500A6 6 0 0 1 6 9.500z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  task: '<path d="M4 6l2 2 3-3.500M4 13l2 2 3-3.500M4 20l2 2 3-3.500M13 7h8M13 14h8M13 21h8"/>',
  wallet: '<path d="M3 8a3 3 0 0 1 3-3h12v3M3 8v10a3 3 0 0 0 3 3h15V8z"/><circle cx="16.500" cy="14.500" r="1.200"/>',
  people: '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c.5-4 3-6 6.500-6s6 2 6.500 6"/><path d="M16 4.800a3.500 3.500 0 0 1 0 6.400M18.500 14.500c1.700.9 2.700 2.800 3 5.500"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.500l4.500 4.500L19 7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.700 1.700 0 0 0 .3 1.800l.1.100a2 2 0 1 1-2.800 2.800l-.1-.1a1.700 1.700 0 0 0-1.800-.3 1.700 1.700 0 0 0-1 1.500V21a2 2 0 1 1-4 0v-.1a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.800.3l-.1.100a2 2 0 1 1-2.800-2.800l.1-.1a1.700 1.700 0 0 0 .3-1.800 1.700 1.700 0 0 0-1.500-1H3a2 2 0 1 1 0-4h.1a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.3-1.800l-.1-.1a2 2 0 1 1 2.800-2.800l.1.100a1.700 1.700 0 0 0 1.800.3H9a1.700 1.700 0 0 0 1-1.500V3a2 2 0 1 1 4 0v.1a1.700 1.700 0 0 0 1 1.500 1.700 1.700 0 0 0 1.800-.3l.1-.1a2 2 0 1 1 2.800 2.800l-.1.100a1.700 1.700 0 0 0-.3 1.800V9a1.700 1.700 0 0 0 1.500 1H21a2 2 0 1 1 0 4h-.1a1.700 1.700 0 0 0-1.500 1z"/>',
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>'
};
const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const TULIP = '<svg viewBox="0 0 24 24" class="tul" aria-hidden="true" fill="currentColor"><path d="M5 3l3.500 3.500L12 2l3.500 4.500L19 3v8a7 7 0 0 1-14 0z"/></svg>';

const REPEAT = [['none', 'Tidak berulang'], ['daily', 'Setiap hari'], ['weekly', 'Setiap minggu'], ['monthly', 'Setiap bulan'], ['yearly', 'Setiap tahun']];
const CATS = ['Dapur', 'Makan luar', 'Petrol dan tol', 'Bil utiliti', 'Anak-anak', 'Sekolah', 'Kesihatan', 'Rumah', 'Sedekah', 'Hiburan', 'Lain-lain'];
const COMCATS = ['Rumah', 'Kenderaan', 'Bil', 'Takaful', 'Pendidikan', 'Pinjaman', 'Langganan', 'Lain-lain'];
const fmtD = (t, o) => new Date(t).toLocaleDateString('ms-MY', o);
const fmtT = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const monthName = ym => fmtD(parseYmd(ym + '-01'), { month: 'long', year: 'numeric' });
function hijri(t) { try { return new Intl.DateTimeFormat('ms-MY-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(t); } catch { return ''; } }

let store, ui = { tab: 'home', seg: { tasks: 'tasks', money: 'belanja', family: 'lokasi' }, ym: ymOf(Date.now()), comYm: ymOf(Date.now()), calYm: ymOf(Date.now()), day: ymd(Date.now()), who: 'all', listId: null, showDone: false };
const load = k => { try { return localStorage.getItem(k); } catch { return null; } };
const save = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
function setTheme(t) { if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t; save('tk-theme', t); }
setTheme(load('tk-theme') || 'auto');
function setSize(z) { if (z === 'm') document.documentElement.removeAttribute('data-size'); else document.documentElement.dataset.size = z; save('tk-size', z); }
setSize(load('tk-size') || 'm');
const weekStart = () => Number(load('tk-week') || 0);

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); }
const member = uid => store.members.find(m => m.uid === uid);
const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const avatar = (uid, sm = true) => { const m = member(uid); return m ? `<span class="avatar ${sm ? 'sm' : ''}" style="background:${esc(m.color)}" title="${esc(m.name)}">${esc(initials(m.name))}</span>` : ''; };
const privTag = x => x._shared === false ? ' <span class="tag">Peribadi</span>' : '';

// ---------- Borang ----------
const memberOpts = (blank = 'Sesiapa') => [['', blank], ...store.members.map(m => [m.uid, m.name])];
const FORMS = {
  events: { name: 'Acara', fields: () => [
    { k: 'title', l: 'Nama acara', req: 1 }, { row: [{ k: 'date', l: 'Tarikh', t: 'date', req: 1 }, { k: 'repeat', l: 'Ulangan', t: 'select', o: REPEAT }] },
    { row: [{ k: 'time', l: 'Mula (kosong = sepanjang hari)', t: 'time' }, { k: 'endTime', l: 'Tamat', t: 'time' }] },
    { k: 'location', l: 'Tempat' }, { k: 'member', l: 'Untuk siapa', t: 'select', o: memberOpts('Semua') }, { k: 'note', l: 'Catatan', t: 'area' }] },
  tasks: { name: 'Tugasan', fields: () => [
    { k: 'title', l: 'Apa yang perlu dibuat', req: 1 }, { row: [{ k: 'due', l: 'Tarikh akhir', t: 'date' }, { k: 'repeat', l: 'Ulangan', t: 'select', o: REPEAT }] },
    { row: [{ k: 'assignee', l: 'Ditugaskan kepada', t: 'select', o: memberOpts() }, { k: 'priority', l: 'Keutamaan', t: 'select', o: [['normal', 'Biasa'], ['high', 'Penting'], ['low', 'Rendah']] }] }, { k: 'note', l: 'Catatan', t: 'area' }],
    defaults: () => ({ done: false, priority: 'normal' }) },
  lists: { name: 'Senarai', fields: () => [{ k: 'title', l: 'Nama senarai', req: 1 }], defaults: () => ({ items: [] }) },
  reminders: { name: 'Peringatan', fields: () => [
    { k: 'title', l: 'Ingatkan tentang', req: 1 }, { row: [{ k: '_date', l: 'Tarikh', t: 'date', req: 1 }, { k: '_time', l: 'Masa', t: 'time', req: 1 }] },
    { k: 'repeat', l: 'Ulangan', t: 'select', o: REPEAT }, { k: 'audience', l: 'Hantar kepada', t: 'select', o: [['all', 'Semua ahli keluarga'], ...store.members.map(m => [m.uid, m.name])], sharedOnly: 1 }],
    prepare: d => { const t = combine(d._date, d._time); delete d._date; delete d._time; d.startAt = t; d.nextAt = nextOccurrence(t, d.repeat, Date.now() - 60000) ?? t; return d; },
    load: x => ({ ...x, _date: ymd(x.nextAt ?? x.startAt), _time: fmtT(x.nextAt ?? x.startAt) }) },
  expenses: { name: 'Perbelanjaan', fields: () => [
    { row: [{ k: 'amount', l: 'Jumlah (RM)', t: 'money', req: 1 }, { k: 'date', l: 'Tarikh', t: 'date', req: 1 }] },
    { row: [{ k: 'category', l: 'Kategori', t: 'select', o: CATS.map(c => [c, c]) }, { k: 'paidBy', l: 'Dibayar oleh', t: 'select', o: memberOpts('-') }] }, { k: 'note', l: 'Catatan' }],
    defaults: () => ({ date: ymd(Date.now()), paidBy: store.user.uid, category: 'Dapur' }), num: ['amount'] },
  commitments: { name: 'Komitmen', fields: () => [
    { k: 'name', l: 'Nama komitmen', req: 1 }, { row: [{ k: 'amount', l: 'Jumlah sebulan (RM)', t: 'money', req: 1 }, { k: 'dueDay', l: 'Hari bayaran (1–31)', t: 'number', min: 1, max: 31, req: 1 }] },
    { row: [{ k: 'category', l: 'Kategori', t: 'select', o: COMCATS.map(c => [c, c]) }, { k: 'payee', l: 'Bayar kepada' }] },
    { row: [{ k: 'startYm', l: 'Bulan mula', t: 'month' }, { k: 'endYm', l: 'Bulan tamat', t: 'month' }] },
    { k: 'addExpense', l: 'Masukkan ke perbelanjaan bila ditanda bayar', t: 'toggle' }],
    defaults: () => ({ paid: {}, addExpense: true, dueDay: 1, category: 'Bil' }), num: ['amount', 'dueDay'] },
  goals: { name: 'Simpanan', fields: () => [
    { k: 'name', l: 'Matlamat', req: 1 }, { row: [{ k: 'target', l: 'Sasaran (RM)', t: 'money', req: 1 }, { k: 'saved', l: 'Sudah terkumpul (RM)', t: 'money' }] }, { k: 'deadline', l: 'Sasaran tarikh', t: 'date' }],
    defaults: () => ({ saved: 0 }), num: ['target', 'saved'] },
  notes: { name: 'Nota', fields: () => [{ k: 'text', l: 'Nota', t: 'area', req: 1 }, { k: 'pinned', l: 'Sematkan di atas', t: 'toggle' }] },
  dates: { name: 'Tarikh penting', fields: () => [{ k: 'title', l: 'Perkara (cukai jalan, pasport, hari jadi)', req: 1 }, { k: 'date', l: 'Tarikh', t: 'date', req: 1 }, { k: 'yearly', l: 'Berulang setiap tahun', t: 'toggle' }] },
};
const PRIVATE_DEFAULT = ['goals'];

function fieldHtml(f, v) {
  if (f.row) return `<div class="f2">${f.row.map(x => fieldHtml(x, v)).join('')}</div>`;
  const val = v[f.k] ?? '', req = f.req ? 'required' : '', id = `f_${f.k}`;
  if (f.t === 'toggle') return `<label class="tog"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}><span>${esc(f.l)}</span></label>`;
  const wrap = h => `<label class="f" ${f.sharedOnly ? 'data-shared-only' : ''} for="${id}"><span>${esc(f.l)}</span>${h}</label>`;
  if (f.t === 'select') return wrap(`<select id="${id}" name="${f.k}">${f.o.map(([a, b]) => `<option value="${esc(a)}" ${String(val) === a ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`);
  if (f.t === 'area') return wrap(`<textarea id="${id}" name="${f.k}" ${req}>${esc(val)}</textarea>`);
  if (f.t === 'money') return wrap(`<input id="${id}" name="${f.k}" type="number" inputmode="decimal" step="0.01" min="0" value="${esc(val)}" ${req}>`);
  const extra = f.min ? `min="${f.min}" max="${f.max}"` : '';
  return wrap(`<input id="${id}" name="${f.k}" type="${f.t || 'text'}" value="${esc(val)}" ${extra} ${req}>`);
}
const sheet = () => $('#sheet');
function openSheet(html) { const d = sheet(); d.innerHTML = `<div class="sheet-in">${html}</div>`; if (!d.open) d.showModal(); }
function closeSheet() { const d = sheet(); if (d.open) d.close(); }
const head = t => `<div class="sheet-head"><h2 id="sheet-title">${esc(t)}</h2><button class="iconbtn" data-act="close" aria-label="Tutup">${ico('x')}</button></div>`;

function openForm(col, id, preset = {}) {
  const def = FORMS[col], x = id ? store.find(col, id) : null;
  const shared = x ? x._shared !== false : !PRIVATE_DEFAULT.includes(col);
  const v = x ? (def.load ? def.load(x) : x) : { ...(def.defaults?.() || {}), ...preset };
  openSheet(`${head((x ? 'Ubah ' : 'Tambah ') + def.name.toLowerCase())}
    <form data-form="${col}" data-id="${id || ''}">
      ${def.fields().map(f => fieldHtml(f, v)).join('')}
      <label class="tog"><input type="checkbox" name="_shared" ${shared ? 'checked' : ''}><span>Kongsi dengan keluarga</span></label>
      <div class="acts">${x ? `<button type="button" class="btn danger" data-act="del" data-col="${col}" data-id="${id}">Padam</button>` : '<span></span>'}<button class="btn">Simpan</button></div>
    </form>`);
  const sf = $('[name=_shared]', sheet()), so = $('[data-shared-only]', sheet());
  const sync = () => so && so.classList.toggle('hide', !sf.checked);
  sf.addEventListener('change', sync); sync();
}
function submitForm(form) {
  const col = form.dataset.form, id = form.dataset.id, def = FORMS[col], fd = new FormData(form), d = {};
  const walk = fs => fs.forEach(f => { if (f.row) walk(f.row); else d[f.k] = f.t === 'toggle' ? fd.has(f.k) : fd.get(f.k) ?? ''; });
  walk(def.fields());
  (def.num || []).forEach(k => d[k] = Number(d[k] || 0));
  const shared = fd.has('_shared');
  if (!shared && 'audience' in d) d.audience = store.user.uid;
  const data = def.prepare ? def.prepare(d) : d;
  if (id) { store.update(col, id, data); store.setShared(col, id, shared); }
  else store.add(col, { ...(def.defaults?.() || {}), ...data }, shared);
  closeSheet(); toast(`${def.name} disimpan`);
}

// ---------- Paparan ----------
const TABS = [['home', 'Utama', 'home'], ['cal', 'Kalendar', 'cal'], ['tasks', 'Tugasan', 'task'], ['money', 'Wang', 'wallet'], ['family', 'Keluarga', 'people']];
const seg = (tab, opts) => `<div class="seg">${opts.map(([k, l]) => `<button data-act="seg" data-tab="${tab}" data-k="${k}" aria-pressed="${ui.seg[tab] === k}">${l}</button>`).join('')}</div>`;
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Selamat pagi' : h < 14 ? 'Selamat tengah hari' : h < 19 ? 'Selamat petang' : 'Selamat malam'; };

function homeView() {
  const s = store.state, now = Date.now(), t0 = startOfDay(now), t1 = addDays(t0, 1) - 1;
  const today = agenda(s, t0, t1);
  const due = s.reminders.filter(r => r.nextAt != null && r.nextAt <= now);
  const b = taskBuckets(s.tasks, now);
  const later = agenda(s, t1 + 1, addDays(t0, 7)).slice(0, 5);
  const ym = ymOf(now), ex = expenseMonth(s.expenses, ym, s.budgets), com = commitmentMonth(s.commitments, ym);
  const pill = a => `<li class="${a.kind}"><button class="t" data-act="edit" data-col="${a.kind}" data-id="${a.id}">${esc(a.title)}</button><span class="when">${a.allDay ? '' : fmtT(a.t) + ' '}</span><span class="s">${esc(a.sub || '')}${a.amount ? ` ${rm(a.amount)}${a.paid ? ', sudah dibayar' : ''}` : ''}</span></li>`;
  const late = b.overdue.map(t => `<li class="late"><button class="t" data-act="edit" data-col="tasks" data-id="${t.id}">${esc(t.title)}</button><span class="s" style="color:var(--tulip)">Tertunggak sejak ${fmtD(parseYmd(t.due), { day: 'numeric', month: 'short' })}</span></li>`).join('');
  return `
    <p class="hero-sub" style="margin:0">${esc(greet())}, ${esc(store.user.name)}</p>
    <h1 class="hero-date">${fmtD(now, { weekday: 'long' })},<br>${fmtD(now, { day: 'numeric', month: 'long' })}</h1>
    <p class="hero-sub small">${esc(hijri(now))}</p>
    ${due.map(r => `<div class="alert"><div class="t">${esc(r.title)}</div><div class="small muted">Peringatan ${fmtD(r.nextAt, { day: 'numeric', month: 'short' })}, ${fmtT(r.nextAt)}</div><div class="acts"><button class="btn sm" data-act="rem-done" data-id="${r.id}">Selesai</button><button class="btn sm ghost" data-act="rem-snooze" data-id="${r.id}">Tunda 10 minit</button></div></div>`).join('')}
    <div class="bud">${TULIP}</div>
    ${today.length || late ? `<ul class="stem">${late}${today.map(pill).join('')}</ul>` : `<ul class="stem"><li><span class="t">Tiada apa-apa dijadualkan hari ini</span><span class="s">Tekan + untuk menambah acara, tugasan atau peringatan.</span></li></ul>`}
    <div class="glance">
      <button data-act="go" data-tab="money" data-k="belanja"><b>${rm(ex.total)}</b><span class="small muted">belanja bulan ini${ex.budget ? ` daripada ${rm(ex.budget)}` : ''}</span></button>
      <button data-act="go" data-tab="money" data-k="komitmen"><b>${rm(com.unpaid)}</b><span class="small muted">komitmen belum dibayar</span></button>
      <button data-act="go" data-tab="tasks" data-k="tasks"><b>${b.overdue.length + b.today.length}</b><span class="small muted">tugasan perlu disiapkan</span></button>
    </div>
    <h2 class="sec">Tujuh hari akan datang</h2>
    ${later.length ? `<ul class="rows">${later.map(a => `<li class="row"><button class="main" data-act="edit" data-col="${a.kind}" data-id="${a.id}"><div class="t">${esc(a.title)}</div><div class="s">${fmtD(a.t, { weekday: 'short', day: 'numeric', month: 'short' })}${a.allDay ? '' : ', ' + fmtT(a.t)}, ${esc(a.sub || "")}</div></button></li>`).join('')}</ul>` : '<p class="empty">Minggu depan masih lapang.</p>'}`;
}

function calView() {
  const ym = ui.calYm, [y, m] = ym.split('-').map(Number), first = new Date(y, m - 1, 1);
  const ws = weekStart(), lead = (first.getDay() - ws + 7) % 7, start = addDays(first.getTime(), -lead), cells = Math.ceil((lead + daysInMonth(y, m - 1)) / 7) * 7;
  const end = addDays(start, cells) - 1, items = agenda(store.state, start, end), by = {};
  items.forEach(a => (by[ymd(a.t)] ||= []).push(a));
  const todayS = ymd(Date.now());
  const DOW = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
  let g = [...DOW.slice(ws), ...DOW.slice(0, ws)].map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < cells; i++) {
    const t = addDays(start, i), k = ymd(t), kinds = [...new Set((by[k] || []).map(a => a.kind))].slice(0, 3);
    const label = `${fmtD(t, { day: 'numeric', month: 'long' })}, ${(by[k] || []).length} perkara`;
    g += `<button class="day ${k.slice(0, 7) !== ym ? 'out' : ''} ${k === todayS ? 'today' : ''}" data-act="day" data-d="${k}" aria-pressed="${ui.day === k}" aria-label="${esc(label)}"><span>${new Date(t).getDate()}</span><span class="dots">${kinds.map(n => `<i class="${n}"></i>`).join('')}</span></button>`;
  }
  const sel = by[ui.day] || [];
  return `
    <div class="cal-head"><button class="iconbtn" data-act="cal-m" data-n="-1" aria-label="Bulan sebelum">${ico('left')}</button><h2>${monthName(ym)}</h2><button class="iconbtn" data-act="cal-m" data-n="1" aria-label="Bulan seterusnya">${ico('right')}</button></div>
    <div class="grid">${g}</div>
    <div class="legend"><span><i></i>Acara</span><span><i style="background:var(--wood)"></i>Tugasan</span><span><i style="background:var(--tulip)"></i>Peringatan</span><span><i style="background:var(--honey)"></i>Komitmen dan tarikh</span></div>
    <h2 class="sec"><span>${fmtD(parseYmd(ui.day), { weekday: 'long', day: 'numeric', month: 'long' })}</span><button class="link" data-act="add" data-col="events" data-date="${ui.day}">Tambah acara</button></h2>
    <p class="small muted" style="margin:0">${esc(hijri(parseYmd(ui.day)))}</p>
    ${sel.length ? `<ul class="rows">${sel.map(a => `<li class="row"><button class="main" data-act="edit" data-col="${a.kind}" data-id="${a.id}"><div class="t">${esc(a.title)}</div><div class="s">${a.allDay ? 'Sepanjang hari' : fmtT(a.t)}${a.sub ? ', ' + esc(a.sub) : ''}${a.amount ? ', ' + rm(a.amount) : ''}</div></button>${a.who ? avatar(a.who) : ''}</li>`).join('')}</ul>` : '<p class="empty">Tiada apa-apa pada hari ini.</p>'}`;
}

function taskRow(t) {
  const P = { high: '<span class="tag high">Penting</span> ' };
  return `<li class="row ${t.done ? 'done' : ''}"><button class="check" role="checkbox" aria-checked="${!!t.done}" aria-label="Tanda siap: ${esc(t.title)}" data-act="task-toggle" data-id="${t.id}">${ico('check')}</button>
    <button class="main" data-act="edit" data-col="tasks" data-id="${t.id}"><div class="t">${esc(t.title)}</div><div class="s">${P[t.priority] || ''}${t.due ? fmtD(parseYmd(t.due), { weekday: 'short', day: 'numeric', month: 'short' }) : ''}${t.repeat && t.repeat !== 'none' ? ' (berulang)' : ''}${privTag(t)}</div></button>${t.assignee ? avatar(t.assignee) : ''}</li>`;
}
function tasksView() {
  const top = seg('tasks', [['tasks', 'Tugasan'], ['lists', 'Senarai'], ['reminders', 'Peringatan']]);
  if (ui.seg.tasks === 'lists') return top + listsView();
  if (ui.seg.tasks === 'reminders') return top + remindersView();
  const me = store.user.uid, list = ui.who === 'me' ? store.state.tasks.filter(t => t.assignee === me) : store.state.tasks, b = taskBuckets(list);
  const block = (title, arr, warn) => arr.length ? `<h2 class="sec ${warn ? 'warn' : ''}">${title}</h2><ul class="rows">${arr.map(taskRow).join('')}</ul>` : '';
  const none = !b.overdue.length && !b.today.length && !b.later.length && !b.none.length;
  return top + `<div class="chips"><button class="chip" data-act="who" data-k="all" aria-pressed="${ui.who === 'all'}">Semua</button><button class="chip" data-act="who" data-k="me" aria-pressed="${ui.who === 'me'}">Tugasan saya</button></div>
    ${none ? '<p class="empty">Semua tugasan sudah siap. Tekan + untuk menambah yang baharu.</p>' : ''}
    ${block('Tertunggak', b.overdue, 1)}${block('Hari ini', b.today)}${block('Akan datang', b.later)}${block('Tiada tarikh', b.none)}
    ${b.done.length ? `<h2 class="sec"><span>Sudah siap (${b.done.length})</span><button class="link" data-act="toggle-done">${ui.showDone ? 'Sorok' : 'Tunjuk'}</button></h2>${ui.showDone ? `<ul class="rows">${b.done.slice(0, 30).map(taskRow).join('')}</ul>` : ''}` : ''}`;
}
function listsView() {
  const l = ui.listId && store.find('lists', ui.listId);
  if (l) {
    const items = l.items || [], left = items.filter(i => !i.done).length;
    return `<div class="cal-head" style="justify-content:flex-start;gap:6px"><button class="iconbtn" data-act="list-back" aria-label="Kembali ke semua senarai">${ico('left')}</button><h2 style="flex:1;text-align:left">${esc(l.title)}</h2><button class="link" data-act="edit" data-col="lists" data-id="${l.id}">Ubah</button></div>
      <form class="addline" data-additem="${l.id}"><input name="text" placeholder="Tambah item" aria-label="Tambah item" autocomplete="off" required><button class="btn">Tambah</button></form>
      <ul class="rows">${[...items].sort((a, b) => a.done - b.done).map(i => `<li class="row ${i.done ? 'done' : ''}"><button class="check" role="checkbox" aria-checked="${!!i.done}" aria-label="${esc(i.text)}" data-act="item-toggle" data-list="${l.id}" data-id="${i.id}">${ico('check')}</button><span class="main t">${esc(i.text)}</span><button class="iconbtn" aria-label="Buang ${esc(i.text)}" data-act="item-del" data-list="${l.id}" data-id="${i.id}">${ico('x')}</button></li>`).join('')}</ul>
      ${items.length ? `<p class="small muted">${left} lagi belum siap. ${items.length - left ? `<button class="link" data-act="items-clear" data-list="${l.id}">Buang yang sudah siap</button>` : ''}</p>` : '<p class="empty">Senarai ini masih kosong.</p>'}`;
  }
  const ls = store.state.lists;
  return ls.length ? `<ul class="rows">${ls.map(x => { const n = (x.items || []).length, d = (x.items || []).filter(i => i.done).length; return `<li class="row"><button class="main" data-act="list-open" data-id="${x.id}"><div class="t">${esc(x.title)}${privTag(x)}</div><div class="s">${d} daripada ${n} siap</div><div class="bar" role="img" aria-label="${d} daripada ${n} siap"><i style="width:${n ? d / n * 100 : 0}%"></i></div></button></li>`; }).join('')}</ul>` : '<p class="empty">Belum ada senarai. Cipta senarai barang dapur, persiapan cuti dan lain-lain.</p>';
}
function remindersView() {
  const rs = store.state.reminders, up = rs.filter(r => r.nextAt != null).sort((a, b) => a.nextAt - b.nextAt), past = rs.filter(r => r.nextAt == null);
  const rp = Object.fromEntries(REPEAT), row = r => `<li class="row ${r.nextAt == null ? 'done' : ''}"><button class="main" data-act="edit" data-col="reminders" data-id="${r.id}"><div class="t">${esc(r.title)}</div><div class="s">${r.nextAt != null ? `${fmtD(r.nextAt, { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtT(r.nextAt)}` : 'Selesai'}${r.repeat && r.repeat !== 'none' ? `, ${rp[r.repeat].toLowerCase()}` : ''}${privTag(r)}</div></button></li>`;
  return up.length || past.length ? `<ul class="rows">${up.map(row).join('')}</ul>${past.length ? `<h2 class="sec">Selesai</h2><ul class="rows">${past.slice(0, 20).map(row).join('')}</ul>` : ''}` : '<p class="empty">Belum ada peringatan. Tekan + untuk menambahnya.</p>';
}

function monthHead(act, ym) { return `<div class="cal-head"><button class="iconbtn" data-act="${act}" data-n="-1" aria-label="Bulan sebelum">${ico('left')}</button><h2>${monthName(ym)}</h2><button class="iconbtn" data-act="${act}" data-n="1" aria-label="Bulan seterusnya">${ico('right')}</button></div>`; }
function moneyView() {
  const top = seg('money', [['belanja', 'Belanja'], ['komitmen', 'Komitmen'], ['simpanan', 'Simpanan']]);
  if (ui.seg.money === 'komitmen') return top + commitView();
  if (ui.seg.money === 'simpanan') return top + goalsView();
  const m = expenseMonth(store.state.expenses, ui.ym, store.state.budgets), days = {};
  m.rows.forEach(e => (days[e.date] ||= []).push(e));
  const barCls = (s, b) => b && s > b ? 'over' : b && s > b * .85 ? 'near' : '';
  return top + monthHead('m-ym', ui.ym) + `
    <div class="total">${rm(m.total)}</div>
    <div class="small muted">${m.budget ? `daripada bajet ${rm(m.budget)}. ${m.total > m.budget ? `Terlebih ${rm(m.total - m.budget)}.` : `Baki ${rm(m.budget - m.total)}.`}` : 'Belum ada bajet ditetapkan.'}</div>
    <h2 class="sec"><span>Ikut kategori</span><button class="link" data-act="budget">Tetapkan bajet</button></h2>
    ${m.cats.map(c => { const max = c.budget || m.cats[0].spent || 1; return `<div class="cat" title="${esc(c.category)}: ${rm(c.spent)}${c.budget ? ' / ' + rm(c.budget) : ''}"><div class="l"><span>${esc(c.category)}</span><span class="num">${rm(c.spent)}${c.budget ? ` <span class="muted">/ ${rm(c.budget)}</span>` : ''}${c.budget && c.spent > c.budget ? ' <span class="tag high">Terlebih</span>' : ''}</span></div><div class="bar"><i class="${barCls(c.spent, c.budget)}" style="width:${Math.min(100, c.spent / max * 100)}%"></i></div></div>`; }).join('') || '<p class="empty">Tiada perbelanjaan bulan ini.</p>'}
    ${m.rows.length ? `<h2 class="sec">Rekod</h2>` : ''}
    ${Object.entries(days).map(([d, list]) => `<div class="dayhead">${fmtD(parseYmd(d), { weekday: 'long', day: 'numeric', month: 'long' })}</div><ul class="rows">${list.map(e => `<li class="row"><button class="main" data-act="edit" data-col="expenses" data-id="${e.id}"><div class="t">${esc(e.note || e.category)}</div><div class="s">${esc(e.category)}${e.paidBy && member(e.paidBy) ? ', ' + esc(member(e.paidBy).name) : ''}${privTag(e)}</div></button><span class="amt">${rm(e.amount)}</span></li>`).join('')}</ul>`).join('')}`;
}
function commitView() {
  const c = commitmentMonth(store.state.commitments, ui.comYm), today = ymd(Date.now());
  return monthHead('c-ym', ui.comYm) + `<div class="total">${rm(c.total)}</div>
    <div class="small muted">${rm(c.paid)} sudah dibayar, ${rm(c.unpaid)} lagi</div>
    <div class="bar" role="img" aria-label="${rm(c.paid)} daripada ${rm(c.total)} dibayar" style="margin:10px 0 8px"><i style="width:${c.total ? c.paid / c.total * 100 : 0}%"></i></div>
    ${c.rows.length ? `<ul class="rows">${c.rows.map(r => { const lateNow = !r.paid && ymd(r.due) < today, soon = !r.paid && !lateNow && daysUntil(ymd(r.due)) <= 3; return `<li class="row ${r.paid ? 'done' : ''}"><button class="check" role="checkbox" aria-checked="${r.paid}" aria-label="Tanda dibayar: ${esc(r.c.name)}" data-act="com-pay" data-id="${r.c.id}">${ico('check')}</button><button class="main" data-act="edit" data-col="commitments" data-id="${r.c.id}"><div class="t">${esc(r.c.name)}</div><div class="s">${fmtD(r.due, { day: 'numeric', month: 'short' })}${r.c.payee ? ', ' + esc(r.c.payee) : ''} ${lateNow ? '<span class="tag high">Lewat</span>' : soon ? '<span class="tag warn">Hampir tiba</span>' : ''}${privTag(r.c)}</div></button><span class="amt">${rm(r.c.amount)}</span></li>`; }).join('')}</ul>` : '<p class="empty">Belum ada komitmen. Tambah ansuran, bil dan takaful bulanan anda.</p>'}`;
}
function goalsView() {
  const g = store.state.goals;
  return g.length ? `<ul class="rows">${g.map(x => { const p = x.target ? Math.min(100, x.saved / x.target * 100) : 0; return `<li class="row"><button class="main" data-act="edit" data-col="goals" data-id="${x.id}"><div class="t">${esc(x.name)}${privTag(x)}</div><div class="s num">${rm(x.saved)} daripada ${rm(x.target)}${x.deadline ? `, sasaran ${fmtD(parseYmd(x.deadline), { month: 'short', year: 'numeric' })}` : ''}</div><div class="bar" role="img" aria-label="${Math.round(p)} peratus"><i style="width:${p}%"></i></div></button></li>`; }).join('')}</ul>` : '<p class="empty">Belum ada matlamat simpanan.</p>';
}

function familyView() {
  const top = seg('family', [['lokasi', 'Lokasi'], ['papan', 'Papan'], ['tarikh', 'Tarikh'], ['ahli', 'Ahli']]);
  const k = ui.seg.family;
  if (k === 'papan') { const n = [...store.state.notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0)); return top + (n.length ? `<ul class="rows">${n.map(x => `<li class="row"><button class="main" data-act="edit" data-col="notes" data-id="${x.id}"><div class="note">${esc(x.text)}</div><div class="s" style="margin-top:3px">${x.pinned ? '<span class="tag ok">Disemat</span> ' : ''}${esc(store.memberName(x.ownerUid))}${privTag(x)}</div></button></li>`).join('')}</ul>` : '<p class="empty">Papan kosong. Tinggalkan pesanan untuk keluarga.</p>'); }
  if (k === 'tarikh') {
    const now = Date.now(), rows = store.state.dates.map(d => ({ d, next: d.yearly ? nextOccurrence(parseYmd(d.date).getTime(), 'yearly', startOfDay(now) - 1) : parseYmd(d.date).getTime() })).sort((a, b) => a.next - b.next);
    const lbl = n => n < 0 ? `<span class="tag high">Tamat ${-n} hari lalu</span>` : n === 0 ? '<span class="tag high">Hari ini</span>' : n <= 30 ? `<span class="tag warn">${n} hari lagi</span>` : `<span class="tag">${n} hari lagi</span>`;
    return top + (rows.length ? `<ul class="rows">${rows.map(({ d, next }) => `<li class="row"><button class="main" data-act="edit" data-col="dates" data-id="${d.id}"><div class="t">${esc(d.title)}</div><div class="s">${fmtD(next, { day: 'numeric', month: 'long', year: 'numeric' })}${d.yearly ? ', setiap tahun' : ''}${privTag(d)}</div></button>${lbl(daysUntil(ymd(next)))}</li>`).join('')}</ul>` : '<p class="empty">Rekod cukai jalan, insurans, pasport dan hari jadi di sini.</p>');
  }
  if (k === 'ahli') return top + `<ul class="rows">${store.members.map(m => `<li class="row">${avatar(m.uid, false)}<div class="main"><div class="t">${esc(m.name)}${m.uid === store.user.uid ? ' (anda)' : ''}</div></div></li>`).join('')}</ul>
    <h2 class="sec">Jemput ahli keluarga</h2><p class="small muted">Beri kod ini kepada ahli keluarga. Mereka log masuk dan pilih "Sertai keluarga". Sesiapa yang ada kod boleh menyertai, jadi kongsi secara peribadi sahaja.</p>
    <p class="total" style="font-size:1.6rem;overflow-wrap:anywhere">${esc(store.family.inviteCode || '-')}</p>
    <div class="chips"><button class="btn sm ghost" data-act="copy" data-v="${esc(store.family.inviteCode || '')}">Salin kod</button><button class="btn sm ghost" data-act="invite-new">Jana kod baharu</button></div>`;
  // Lokasi
  const sharing = locWatch !== null, auto = locAuto(), others = store.locations;
  return top + `<div id="map-host"></div>
    ${autoToggle()}
    ${auto ? '' : sharing ? `<p class="small" style="margin:0 0 8px">Lokasi anda sedang dikongsi${locUntil() ? ` hingga ${fmtT(locUntil())}` : ''}. Ia dikemas kini selagi aplikasi ini terbuka.</p><button class="btn ghost" data-act="loc-stop">Berhenti berkongsi</button>`
      : `<p class="small muted" style="margin:0 0 8px">Lokasi anda tidak dikongsi. Lokasi hanya dikemas kini ketika aplikasi terbuka di skrin.</p><div class="chips"><button class="btn sm" data-act="loc-start" data-h="1">Kongsi 1 jam</button><button class="btn sm ghost" data-act="loc-start" data-h="8">8 jam</button><button class="btn sm ghost" data-act="loc-start" data-h="0">Sehingga dimatikan</button></div>`}
    <h2 class="sec">Ahli keluarga</h2>
    <ul class="rows">${store.members.map(m => { const l = others.find(x => x.uid === m.uid); return `<li class="row">${avatar(m.uid, false)}<div class="main"><div class="t">${esc(m.name)}</div><div class="s">${l ? (Date.now() - l.at < 180000 ? '<span class="tag ok">Aktif sekarang</span>' : `Kali terakhir ${ago(l.at)}`) + (l.auto ? ' <span class="tag">Automatik</span>' : '') : 'Tidak berkongsi lokasi'}</div></div>${l ? `<a class="link" href="https://www.google.com/maps?q=${l.lat},${l.lng}" target="_blank" rel="noopener">Buka peta</a>` : ''}</li>`; }).join('')}</ul>`;
}

// ---------- Peta ----------
let map, mapEl, markers = {}, fitted = false;
function mountMap() {
  const host = $('#map-host'); if (!host || !window.L) return;
  if (!mapEl) {
    mapEl = document.createElement('div'); mapEl.id = 'map-el'; host.append(mapEl);
    map = L.map(mapEl, { zoomControl: true }).setView([3.139, 101.687], 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  } else host.append(mapEl);
  map.invalidateSize();
  const seen = new Set();
  store.locations.forEach(l => {
    seen.add(l.uid);
    const m = member(l.uid), stale = Date.now() - l.at > 30 * 60000;
    const icon = L.divIcon({ className: '', html: `<div class="pin ${stale ? 'stale' : ''}" style="width:38px;height:38px;background:${esc(m?.color || '#1F5A43')}">${esc(initials(m?.name || l.name))}</div>`, iconSize: [38, 38], iconAnchor: [19, 19] });
    if (markers[l.uid]) markers[l.uid].setLatLng([l.lat, l.lng]).setIcon(icon);
    else markers[l.uid] = L.marker([l.lat, l.lng], { icon, title: m?.name || l.name }).addTo(map);
    markers[l.uid].bindPopup(`${esc(m?.name || l.name)}<br>${ago(l.at)}`);
  });
  Object.keys(markers).forEach(u => { if (!seen.has(u)) { markers[u].remove(); delete markers[u]; } });
  const pts = store.locations.map(l => [l.lat, l.lng]);
  if (pts.length && !fitted) { map.fitBounds(pts, { padding: [50, 50], maxZoom: 15 }); fitted = true; }
}

// ---------- Lokasi langsung ----------
let locWatch = null, lastSent = null, locBeat = null;
const locUntil = () => Number(load('tk-loc-until') || 0);
const locAuto = () => load('tk-loc-auto') === '1';
const autoToggle = () => `<label class="tog autoloc" for="loc-auto"><input type="checkbox" id="loc-auto" data-act="loc-auto" ${locAuto() ? 'checked' : ''}><span><b>Kongsi lokasi secara automatik</b><br><span class="small muted">Lokasi dikongsi sendiri setiap kali aplikasi dibuka pada peranti ini, tanpa perlu tekan butang. Ia berhenti dikemas kini apabila aplikasi ditutup atau skrin dikunci.</span></span></label>`;
function sendFix(p) {
  if (locUntil() && Date.now() > locUntil()) return stopLoc();
  const cur = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), at: Date.now() };
  if (shouldSendLocation(lastSent, cur)) { lastSent = cur; store.setLocation({ ...cur, auto: locAuto() }); }
}
function locError(e) {
  if (e.code === 1) { save('tk-loc-auto', null); toast('Akses lokasi disekat. Benarkan lokasi untuk aplikasi ini dalam tetapan telefon, kemudian hidupkan semula.'); stopLoc(true); }
  else toast('Lokasi tidak dapat dikesan sekarang.');
}
// Hantar kedudukan segar sekarang (bila aplikasi dibuka semula, dan setiap 2 minit walaupun tidak bergerak).
function pingNow() { if (locWatch === null || document.hidden) return; lastSent = null; navigator.geolocation.getCurrentPosition(sendFix, () => {}, { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }); }
function startLoc(hours) {
  if (!navigator.geolocation) return toast('Peranti ini tidak menyokong lokasi.');
  save('tk-loc', '1'); save('tk-loc-until', hours ? String(Date.now() + hours * 3600000) : null);
  beginWatch(); render();
}
function beginWatch() {
  if (locWatch !== null) return;
  if (!navigator.geolocation) return;
  lastSent = null;
  locWatch = navigator.geolocation.watchPosition(sendFix, locError, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
  clearInterval(locBeat); locBeat = setInterval(() => { lastSent && Date.now() - lastSent.at >= 115000 && pingNow(); }, 30000);
}
function stopLoc(quiet) {
  if (locWatch !== null) navigator.geolocation.clearWatch(locWatch);
  clearInterval(locBeat); locWatch = null;
  if (locAuto() && quiet !== true) { save('tk-loc-auto', null); toast('Perkongsian automatik dimatikan'); }
  save('tk-loc', null); save('tk-loc-until', null);
  store.clearLocation(); render();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && store?.phase === 'ready') { if (locWatch === null) resumeLoc(); else pingNow(); } });
function resumeLoc() {
  if (locWatch !== null || store.phase !== 'ready') return;
  if (locAuto()) { save('tk-loc-until', null); beginWatch(); schedule(); return; }
  if (!load('tk-loc')) return;
  if (locUntil() && Date.now() > locUntil()) { save('tk-loc', null); save('tk-loc-until', null); store.clearLocation(); } else { beginWatch(); schedule(); }
}

// ---------- Peringatan tempatan (ketika aplikasi terbuka) ----------
function checkDue() {
  if (store.phase !== 'ready') return;
  const now = Date.now();
  store.state.reminders.forEach(r => {
    if (r.nextAt == null || r.nextAt > now || r.nextAt < now - DAY) return;
    if (r._shared && r.audience && r.audience !== 'all' && r.audience !== store.user.uid) return;
    const key = `tk-seen-${r.id}-${r.nextAt}`;
    if (load(key)) return; save(key, '1');
    toast(`Peringatan: ${r.title}`);
    if (window.Notification && Notification.permission === 'granted') navigator.serviceWorker?.ready.then(reg => reg.showNotification('Peringatan', { body: r.title, tag: `${r.id}-${r.nextAt}`, icon: 'icons/icon-192.png' }));
    render();
  });
}

// ---------- Tetapan ----------
function openSettings() {
  const theme = load('tk-theme') || 'auto', size = load('tk-size') || 'm', ws = weekStart(), standalone = matchMedia('(display-mode: standalone)').matches;
  const perm = window.Notification ? Notification.permission : 'unsupported', me = member(store.user.uid), myColor = me?.color || COLORS[0];
  const opt = (act, cur, list) => `<div class="chips" role="group">${list.map(([k, l]) => `<button type="button" class="chip" data-act="${act}" data-k="${k}" aria-pressed="${String(cur) === String(k)}">${l}</button>`).join('')}</div>`;
  openSheet(`${head('Tetapan')}
    <h3 class="sec">Profil</h3>
    <form data-profile>
      <label class="f" for="pname"><span>Nama paparan</span><input id="pname" name="name" value="${esc(store.user.name)}" maxlength="30" required autocomplete="nickname"></label>
      <fieldset class="f swatches"><legend>Warna avatar</legend>${COLORS.map((c, i) => `<label class="sw" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === myColor ? 'checked' : ''} aria-label="Warna ${i + 1}"><span>${esc(initials(store.user.name))}</span></label>`).join('')}</fieldset>
      <button class="btn sm">Simpan profil</button>
    </form>
    <h3 class="sec">Keluarga</h3>
    <form data-famname><label class="f" for="fname"><span>Nama keluarga (dilihat semua ahli)</span><input id="fname" name="name" value="${esc(store.family?.name || '')}" maxlength="40" required></label><button class="btn sm ghost">Simpan nama keluarga</button></form>
    <h3 class="sec">Paparan</h3>
    <p class="small muted lbl">Mod</p>${opt('theme', theme, [['auto', 'Ikut peranti'], ['light', 'Cerah'], ['dark', 'Gelap']])}
    <p class="small muted lbl">Saiz teks</p>${opt('size', size, [['m', 'Biasa'], ['l', 'Besar'], ['xl', 'Lebih besar']])}
    <p class="small muted lbl">Minggu bermula pada</p>${opt('week', ws, [[0, 'Ahad'], [1, 'Isnin']])}
    <p class="small muted">Tetapan paparan disimpan pada peranti ini sahaja.</p>
    <h3 class="sec">Lokasi</h3>${autoToggle()}
    <h3 class="sec">Notifikasi</h3><p class="small muted">${perm === 'granted' ? 'Notifikasi dibenarkan pada peranti ini.' : 'Benarkan notifikasi untuk menerima peringatan walaupun aplikasi ditutup.'}</p><button class="btn sm ghost" data-act="push">Aktifkan notifikasi</button>
    ${standalone ? '' : `<h3 class="sec">Pasang aplikasi</h3><p class="small muted">Android: tekan butang di bawah atau menu pelayar, kemudian "Pasang aplikasi". iPhone: buka dalam Safari, tekan Kongsi, kemudian "Add to Home Screen".</p>${installEvt ? '<button class="btn sm ghost" data-act="install">Pasang sekarang</button>' : ''}`}
    <h3 class="sec">Data</h3><div class="chips"><button class="btn sm ghost" data-act="export">Muat turun salinan (JSON)</button></div>
    ${store.demo ? '' : `<p class="small muted">ID keluarga (untuk Apps Script):</p><p class="small" style="overflow-wrap:anywhere"><code>${esc(store.family?.id)}</code> <button class="link" data-act="copy" data-v="${esc(store.family?.id)}">Salin</button></p>`}
    <div class="acts" style="margin-top:18px"><button class="btn danger" data-act="signout">${store.demo ? 'Tetapkan semula demo' : 'Log keluar'}</button></div>`);
}
function refreshSettings() { const d = sheet().scrollTop; openSettings(); sheet().scrollTop = d; }
function openBudget() {
  const b = Object.fromEntries(store.state.budgets.map(x => [x.category, x.amount]));
  openSheet(`${head('Bajet bulanan')}<form data-budget>${CATS.map(c => `<label class="f" for="b_${esc(c)}"><span>${esc(c)}</span><input id="b_${esc(c)}" type="number" min="0" step="1" inputmode="numeric" name="${esc(c)}" value="${esc(b[c] ?? '')}" placeholder="Tiada bajet"></label>`).join('')}<div class="acts"><span></span><button class="btn">Simpan bajet</button></div></form>`);
}
function openAdd() {
  const opts = [['expenses', 'Perbelanjaan'], ['tasks', 'Tugasan'], ['reminders', 'Peringatan'], ['events', 'Acara'], ['lists', 'Senarai'], ['commitments', 'Komitmen'], ['notes', 'Nota'], ['dates', 'Tarikh penting'], ['goals', 'Simpanan']];
  openSheet(`${head('Tambah')}<div class="pick">${opts.map(([c, l]) => `<button data-act="add" data-col="${c}">${l}</button>`).join('')}</div>`);
}

// ---------- Tindakan ----------
const actions = {
  nav(e) { ui.tab = e.dataset.tab; ui.listId = null; render(true); },
  seg(e) { ui.seg[e.dataset.tab] = e.dataset.k; ui.listId = null; render(); },
  go(e) { ui.tab = e.dataset.tab; ui.seg[e.dataset.tab] = e.dataset.k; render(true); },
  fab() { const t = ui.tab, s = ui.seg; const col = t === 'tasks' ? s.tasks : t === 'money' ? { belanja: 'expenses', komitmen: 'commitments', simpanan: 'goals' }[s.money] : t === 'family' ? { papan: 'notes', tarikh: 'dates' }[s.family] : t === 'cal' ? 'events' : null; if (col) openForm(col, null, col === 'events' && t === 'cal' ? { date: ui.day } : col === 'expenses' ? {} : {}); else openAdd(); },
  add(e) { openForm(e.dataset.col, null, e.dataset.date ? { date: e.dataset.date } : {}); },
  edit(e) { openForm(e.dataset.col, e.dataset.id); },
  close: closeSheet,
  del(e) { if (e.dataset.sure) { store.remove(e.dataset.col, e.dataset.id); if (e.dataset.col === 'lists') ui.listId = null; closeSheet(); toast('Dipadam'); } else { e.dataset.sure = 1; e.textContent = 'Tekan sekali lagi untuk padam'; } },
  'rem-done'(e) { const r = store.find('reminders', e.dataset.id); store.update('reminders', r.id, { nextAt: nextOccurrence(r.startAt, r.repeat, Date.now()) }); },
  'rem-snooze'(e) { store.update('reminders', e.dataset.id, { nextAt: Date.now() + 600000 }); toast('Ditunda 10 minit'); },
  day(e) { ui.day = e.dataset.d; render(); },
  'cal-m'(e) { ui.calYm = shiftYm(ui.calYm, +e.dataset.n); render(); },
  'm-ym'(e) { ui.ym = shiftYm(ui.ym, +e.dataset.n); render(); },
  'c-ym'(e) { ui.comYm = shiftYm(ui.comYm, +e.dataset.n); render(); },
  who(e) { ui.who = e.dataset.k; render(); },
  'toggle-done'() { ui.showDone = !ui.showDone; render(); },
  'task-toggle'(e) {
    const t = store.find('tasks', e.dataset.id);
    if (!t.done && t.repeat && t.repeat !== 'none' && t.due) { const due = nextTaskDue(t.due, t.repeat); store.update('tasks', t.id, { due }); toast(`Siap. Seterusnya ${fmtD(parseYmd(due), { day: 'numeric', month: 'short' })}`); }
    else store.update('tasks', t.id, { done: !t.done, doneAt: t.done ? null : Date.now() });
  },
  'list-open'(e) { ui.listId = e.dataset.id; render(); },
  'list-back'() { ui.listId = null; render(); },
  'item-toggle'(e) { const l = store.find('lists', e.dataset.list); store.update('lists', l.id, { items: l.items.map(i => i.id === e.dataset.id ? { ...i, done: !i.done } : i) }); },
  'item-del'(e) { const l = store.find('lists', e.dataset.list); store.update('lists', l.id, { items: l.items.filter(i => i.id !== e.dataset.id) }); },
  'items-clear'(e) { const l = store.find('lists', e.dataset.list); store.update('lists', l.id, { items: l.items.filter(i => !i.done) }); },
  'com-pay'(e) {
    const c = store.find('commitments', e.dataset.id), ym = ui.comYm, paid = { ...(c.paid || {}) }, links = { ...(c.expenseIds || {}) };
    if (paid[ym]) { delete paid[ym]; if (links[ym]) { store.remove('expenses', links[ym]); delete links[ym]; } }
    else { paid[ym] = true; if (c.addExpense) links[ym] = store.add('expenses', { amount: Number(c.amount), category: CATS.includes(c.category) ? c.category : 'Lain-lain', date: ymd(commitmentDateFor(c, ym)), note: c.name, paidBy: store.user.uid }, c._shared !== false); }
    store.update('commitments', c.id, { paid, expenseIds: links });
  },
  budget: openBudget,
  'loc-start'(e) { startLoc(+e.dataset.h); },
  'loc-stop': stopLoc,
  'loc-auto'(e) {
    if (e.checked) { if (!navigator.geolocation) { e.checked = false; return toast('Peranti ini tidak menyokong lokasi.'); } save('tk-loc-auto', '1'); save('tk-loc-until', null); if (locWatch === null) beginWatch(); else pingNow(); toast('Lokasi akan dikongsi setiap kali aplikasi dibuka'); }
    else stopLoc();
    schedule(); if (sheet().open && $('#pname', sheet())) refreshSettings();
  },
  copy(e) { navigator.clipboard?.writeText(e.dataset.v).then(() => toast('Disalin'), () => toast('Tidak dapat menyalin. Salin secara manual.')); },
  async 'invite-new'() { try { await store.regenerateInvite(); toast('Kod baharu dijana. Kod lama tidak lagi sah.'); } catch (x) { toast(x.message); } },
  settings: openSettings,
  theme(e) { setTheme(e.dataset.k); refreshSettings(); },
  size(e) { setSize(e.dataset.k); refreshSettings(); },
  week(e) { save('tk-week', e.dataset.k); refreshSettings(); render(); },
  async push() { try { await store.enablePush(); toast('Notifikasi diaktifkan'); openSettings(); } catch (x) { toast(x.message); } },
  async install() { installEvt.prompt(); installEvt = null; closeSheet(); },
  export() { const { state, members, family } = store; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), family, members, ...state }, null, 2)], { type: 'application/json' })); a.download = `tulip-kayu-${ymd(Date.now())}.json`; a.click(); URL.revokeObjectURL(a.href); },
  signout() { stopLocQuiet(); store.signOut(); },
  'gate-mode'(e) { ui.gate = e.dataset.k; ui.gateErr = ''; render(); },
  async google() { try { await store.signInGoogle(); } catch (x) { ui.gateErr = x.message; render(); } },
};
const commitmentDateFor = (c, ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, Math.min(Number(c.dueDay) || 1, daysInMonth(y, m - 1))); };
function stopLocQuiet() { if (locWatch !== null) { navigator.geolocation.clearWatch(locWatch); clearInterval(locBeat); locWatch = null; store.clearLocation(); } ['tk-loc', 'tk-loc-until', 'tk-loc-auto'].forEach(k => save(k, null)); }

document.addEventListener('click', ev => {
  const e = ev.target.closest('[data-act]'); if (!e) return;
  const a = actions[e.dataset.act]; if (a) { if (e.type !== 'checkbox') ev.preventDefault(); a(e); }
});
$('#sheet').addEventListener('click', ev => { if (ev.target === ev.currentTarget) closeSheet(); });
document.addEventListener('submit', async ev => {
  const f = ev.target; ev.preventDefault();
  if (f.dataset.form) return submitForm(f);
  if (f.dataset.additem) { const l = store.find('lists', f.dataset.additem), text = f.text.value.trim(); if (text) { store.update('lists', l.id, { items: [...(l.items || []), { id: Math.random().toString(36).slice(2, 9), text, done: false }] }); ui.focusAdd = true; } return; }
  if ('profile' in f.dataset) { const n = f.name.value.trim(); if (!n) return; try { await store.updateProfile(n, f.color.value); toast('Profil disimpan'); refreshSettings(); } catch (x) { toast('Gagal menyimpan profil: ' + x.message); } return; }
  if ('famname' in f.dataset) { const n = f.name.value.trim(); if (!n) return; try { await store.updateFamilyName(n); toast('Nama keluarga disimpan'); } catch (x) { toast('Gagal menyimpan: ' + x.message); } return; }
  if ('budget' in f.dataset) {
    new FormData(f).forEach((v, c) => {
      const cur = store.state.budgets.find(b => b.category === c), n = Number(v || 0);
      if (cur && !n) store.remove('budgets', cur.id); else if (cur) store.update('budgets', cur.id, { amount: n }); else if (n) store.add('budgets', { category: c, amount: n }, true);
    });
    closeSheet(); toast('Bajet disimpan'); return;
  }
  if (f.dataset.gate) {
    const b = $('button:not([type=button])', f); b.disabled = true; ui.gateErr = '';
    try {
      const d = Object.fromEntries(new FormData(f));
      if (f.dataset.gate === 'login') await store.signInEmail(d.email, d.pass);
      if (f.dataset.gate === 'register') await store.register(d.name, d.email, d.pass);
      if (f.dataset.gate === 'create') await store.createFamily(d.name);
      if (f.dataset.gate === 'join') await store.joinFamily(d.code);
    } catch (x) { ui.gateErr = authMsg(x); b.disabled = false; render(); }
  }
});
function authMsg(x) {
  return ({ 'auth/invalid-credential': 'E-mel atau kata laluan salah.', 'auth/email-already-in-use': 'E-mel ini sudah berdaftar. Log masuk sahaja.', 'auth/weak-password': 'Kata laluan perlu sekurang-kurangnya 6 aksara.', 'permission-denied': 'Kod jemputan tidak sah atau sudah ditukar.' })[x.code] || x.message;
}

// ---------- Skrin masuk ----------
function gateView() {
  const err = ui.gateErr || store.authError ? `<p class="err" role="alert">${esc(ui.gateErr || store.authError)}</p>` : '';
  if (store.phase === 'family') {
    const m = ui.gate === 'join' ? 'join' : 'create';
    return `<div class="gate">${TULIP}<h1>Selamat datang, ${esc(store.user.name)}</h1><p class="muted">Cipta ruang untuk keluarga anda, atau sertai yang sudah ada.</p>
      <div class="seg"><button data-act="gate-mode" data-k="create" aria-pressed="${m === 'create'}">Cipta keluarga</button><button data-act="gate-mode" data-k="join" aria-pressed="${m === 'join'}">Sertai keluarga</button></div>
      ${m === 'create' ? `<form data-gate="create"><label class="f" for="g1"><span>Nama keluarga</span><input id="g1" name="name" required placeholder="Contoh: Keluarga Ali"></label><button class="btn">Cipta keluarga</button></form>` : `<form data-gate="join"><label class="f" for="g2"><span>Kod jemputan</span><input id="g2" name="code" required autocapitalize="characters" autocomplete="off"></label><button class="btn">Sertai keluarga</button></form>`}
      ${err}<button class="btn ghost" style="margin-top:14px" data-act="signout">Log keluar</button></div>`;
  }
  const reg = ui.gate === 'register';
  return `<div class="gate">${TULIP}<h1>Tulip Kayu</h1><p class="muted">Jadual, wang dan lokasi keluarga di satu tempat.</p>
    <button class="btn" data-act="google" style="margin-top:18px">Teruskan dengan Google</button><div class="or">atau guna e-mel</div>
    <form data-gate="${reg ? 'register' : 'login'}" style="margin-top:0">
      ${reg ? '<label class="f" for="g3"><span>Nama</span><input id="g3" name="name" required autocomplete="name"></label>' : ''}
      <label class="f" for="g4"><span>E-mel</span><input id="g4" name="email" type="email" required autocomplete="email"></label>
      <label class="f" for="g5"><span>Kata laluan</span><input id="g5" name="pass" type="password" minlength="6" required autocomplete="${reg ? 'new-password' : 'current-password'}"></label>
      <button class="btn ghost">${reg ? 'Daftar' : 'Log masuk'}</button></form>${err}
    <button class="link" style="margin-top:14px" data-act="gate-mode" data-k="${reg ? 'login' : 'register'}">${reg ? 'Sudah ada akaun? Log masuk' : 'Belum ada akaun? Daftar'}</button></div>`;
}

// ---------- Lukis ----------
const VIEWS = { home: homeView, cal: calView, tasks: tasksView, money: moneyView, family: familyView };
const TITLE = { home: '', cal: 'Kalendar', tasks: 'Tugasan', money: 'Wang', family: 'Keluarga' };
let renderQ = false;
function render(top) {
  if (top) window.scrollTo(0, 0);
  const root = $('#app');
  if (store.phase === 'loading') { root.innerHTML = `<div class="gate">${TULIP}<p class="muted">Memuatkan...</p></div>`; return; }
  if (store.phase !== 'ready') {
    // Jangan padam input yang sedang ditaip kerana kemas kini latar belakang.
    const key = store.phase + (ui.gate || '') + (ui.gateErr || '');
    if (root.dataset.gk !== key) { root.innerHTML = gateView(); root.dataset.gk = key; }
    return;
  }
  root.dataset.gk = '';
  if (mapEl && mapEl.parentNode) mapEl.remove();
  const sy = window.scrollY, typing = $('.addline input');
  const draft = typing?.value;
  root.innerHTML = `${store.demo ? '<div class="demo">Mod Demo: data contoh dalam pelayar ini sahaja</div>' : ''}
    ${store.loadError ? `<div class="demo" role="alert">Data tidak dapat dimuatkan: ${esc(store.loadError)}</div>` : ''}
    ${locWatch !== null && !locAuto() && ui.tab !== 'family' ? '<div class="share-bar">Lokasi anda sedang dikongsi <button data-act="loc-stop">Berhenti</button></div>' : ''}
    <div class="shell">
      <header class="top"><div class="top-in"><h1>${TITLE[ui.tab] || esc(store.family?.name || 'Tulip Kayu')}</h1><div class="top-acts"><button class="iconbtn" data-act="settings" aria-label="Tetapan">${ico('gear')}</button><button data-act="settings" aria-label="Profil dan tetapan">${member(store.user.uid) ? avatar(store.user.uid, false) : `<span class="avatar" style="background:var(--wood)">${esc(initials(store.user.name))}</span>`}</button></div></div></header>
      <main>${VIEWS[ui.tab]()}</main>
    </div>
    <button class="fab" data-act="fab" aria-label="Tambah">${ico('plus')}</button>
    <nav class="tabs" aria-label="Menu utama">${TABS.map(([k, l, i]) => `<button data-act="nav" data-tab="${k}" ${ui.tab === k ? 'aria-current="page"' : ''}>${ico(i)}<span>${l}</span></button>`).join('')}</nav>`;
  if (!top) window.scrollTo(0, sy);
  mountMap();
  const add = $('.addline input');
  if (add) { if (ui.focusAdd) { add.focus(); ui.focusAdd = false; } else if (draft) add.value = draft; }
}
function schedule() { if (renderQ) return; renderQ = true; requestAnimationFrame(() => { renderQ = false; render(); }); }

// ---------- Mula ----------
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
(async () => {
  try {
    store = await createStore();
  } catch (x) { $('#app').innerHTML = `<div class="gate"><h1>Tulip Kayu</h1><p class="err" role="alert">Firebase gagal dimulakan: ${esc(x.message)}. Semak js/config.js.</p></div>`; return; }
  window.__store = store;
  store.onWriteError = e => toast(e.code === 'permission-denied' ? 'Tiada kebenaran menyimpan. Semak firestore.rules.' : 'Gagal menyimpan: ' + e.message);
  store.on(schedule);
  if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') navigator.serviceWorker?.register('sw.js').catch(e => console.warn('SW', e));
  render();
  const m = location.hash.match(/add=(\w+)/);
  if (m && FORMS[m[1]] && store.phase === 'ready') { history.replaceState(null, '', location.pathname); openForm(m[1]); }
  setInterval(checkDue, 30000); setTimeout(checkDue, 1500);
  setInterval(() => { if (store.phase === 'ready' && !sheet().open) schedule(); }, 60000);
  store.on(resumeLoc); resumeLoc();
})();
