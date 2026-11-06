// Lapisan data. Dua pelaksanaan dengan antara muka sama:
//  - DemoStore: localStorage, untuk cuba tanpa Firebase.
//  - FirebaseStore: Auth + Firestore (luar talian) + FCM.
// Data dikongsi: families/{fid}/{col}. Data peribadi: users/{uid}/{col}.
import { firebaseConfig, vapidKey } from './config.js';
import { ymd, addDays, combine, ymOf } from './logic.js';

export const COLS = ['events', 'tasks', 'lists', 'reminders', 'expenses', 'commitments', 'goals', 'notes', 'dates', 'budgets'];
export const COLORS = ['#1F5A43', '#B3245A', '#2B6CB0', '#B7791F', '#6B46C1', '#0F766E', '#9C4221', '#4A5568'];
const emptyState = () => Object.fromEntries(COLS.map(c => [c, []]));
const newId = () => Math.random().toString(36).slice(2, 12);
export const hasFirebase = () => !!firebaseConfig.apiKey;

class Base {
  constructor() { this.state = emptyState(); this.members = []; this.locations = []; this.family = null; this.user = null; this.phase = 'loading'; this.listeners = new Set(); }
  on(fn) { this.listeners.add(fn); }
  emit() { this.listeners.forEach(f => f()); }
  find(col, id) { return this.state[col].find(x => x.id === id); }
  memberName(uid) { return this.members.find(m => m.uid === uid)?.name || ''; }
}

// ---------- Mod Demo ----------
function seed() {
  const now = Date.now(), d = n => ymd(addDays(now, n)), ym = ymOf(now);
  const s = emptyState();
  const shared = { _shared: true, ownerUid: 'u1' };
  const add = (col, o) => s[col].push({ id: newId(), createdAt: now, ...shared, ...o });
  add('events', { title: 'Mesyuarat PIBG', date: d(0), time: '20:30', endTime: '22:00', location: 'Sekolah', repeat: 'none', member: 'u2' });
  add('events', { title: 'Latihan bola sepak Aiman', date: d(1), time: '17:00', endTime: '18:30', location: 'Padang taman', repeat: 'weekly', member: 'u3' });
  add('events', { title: 'Kenduri rumah Tok', date: d(5), time: '12:00', location: 'Kampung', repeat: 'none' });
  add('tasks', { title: 'Tukar minyak hitam kereta', due: d(-1), priority: 'high', assignee: 'u1', repeat: 'none', done: false });
  add('tasks', { title: 'Isi borang lawatan sekolah', due: d(0), priority: 'normal', assignee: 'u2', repeat: 'none', done: false });
  add('tasks', { title: 'Bersihkan penapis air', due: d(4), priority: 'low', assignee: 'u3', repeat: 'monthly', done: false });
  add('lists', { title: 'Barang dapur', items: [{ id: 'a', text: 'Beras 10 kg', done: false }, { id: 'b', text: 'Telur', done: true }, { id: 'c', text: 'Sabun basuh', done: false }, { id: 'd', text: 'Susu', done: false }] });
  add('lists', { title: 'Persiapan balik kampung', items: [{ id: 'a', text: 'Servis kereta', done: true }, { id: 'b', text: 'Buah tangan', done: false }] });
  const tonight = combine(d(0), '21:45'), tomorrow = combine(d(1), '07:00');
  add('reminders', { title: 'Keluarkan tong sampah', startAt: tonight, nextAt: tonight, repeat: 'weekly', audience: 'all' });
  add('reminders', { title: 'Bawa bekal Sofea', startAt: tomorrow, nextAt: tomorrow, repeat: 'none', audience: 'all' });
  const cat = ['Dapur', 'Petrol dan tol', 'Makan luar', 'Anak-anak', 'Bil utiliti'];
  [[182.4, 0, -1, 'Pasar raya'], [60, 1, -2, 'Isi minyak'], [45.5, 2, -2, 'Makan malam'], [120, 3, -3, 'Yuran tuisyen'], [96.3, 0, -5, 'Barang basah'], [148.7, 4, -6, 'Bil elektrik']].forEach(([amount, c, n, note]) => add('expenses', { amount, category: cat[c], date: d(n), note, paidBy: 'u1' }));
  [['Dapur', 800], ['Petrol dan tol', 400], ['Makan luar', 200], ['Anak-anak', 500], ['Bil utiliti', 350]].forEach(([category, amount]) => add('budgets', { category, amount }));
  add('commitments', { name: 'Ansuran rumah', amount: 1650, dueDay: 5, category: 'Rumah', paid: { [ym]: true }, addExpense: false });
  add('commitments', { name: 'Ansuran kereta', amount: 780, dueDay: 12, category: 'Kenderaan', paid: {}, addExpense: false });
  add('commitments', { name: 'Internet rumah', amount: 129, dueDay: 18, category: 'Bil', paid: {}, addExpense: false });
  add('commitments', { name: 'Takaful keluarga', amount: 320, dueDay: 25, category: 'Takaful', paid: {}, addExpense: false });
  add('goals', { name: 'Tabung percutian', target: 5000, saved: 1850, deadline: d(180) });
  add('goals', { name: 'Dana kecemasan', target: 20000, saved: 12400 });
  add('notes', { text: 'Kunci pendua rumah ada dengan Mak Long.', pinned: true });
  add('notes', { text: 'Wifi tetamu: minta kata laluan daripada Ayah.', pinned: false });
  add('dates', { title: 'Cukai jalan kereta tamat', date: d(24), yearly: false });
  add('dates', { title: 'Hari jadi Sofea', date: d(40), yearly: true });
  add('dates', { title: 'Pasport Ibu tamat', date: d(160), yearly: false });
  return s;
}
class DemoStore extends Base {
  constructor() {
    super(); this.demo = true;
    let saved = null; try { saved = JSON.parse(localStorage.getItem('tk-demo')); } catch {}
    this.state = { ...emptyState(), ...(saved || seed()) };
    this.user = { uid: 'u1', name: 'Ayah' };
    this.family = { id: 'demo', name: 'Keluarga Contoh', inviteCode: 'DEMO1234' };
    this.members = [['u1', 'Ayah'], ['u2', 'Ibu'], ['u3', 'Aiman'], ['u4', 'Sofea']].map(([uid, name], i) => ({ uid, name, color: COLORS[i] }));
    const now = Date.now();
    this.locations = [
      { uid: 'u2', lat: 3.0733, lng: 101.5185, acc: 12, at: now - 240000, name: 'Ibu' },
      { uid: 'u3', lat: 3.0456, lng: 101.4471, acc: 25, at: now - 2400000, name: 'Aiman' }
    ];
    let pr = null; try { pr = JSON.parse(localStorage.getItem('tk-demo-prof')); } catch {}
    if (pr) { this.user.name = this.members[0].name = pr.name; this.members[0].color = pr.color; this.family.name = pr.family; }
    this.phase = 'ready';
  }
  save() { try { localStorage.setItem('tk-demo', JSON.stringify(this.state)); } catch {} this.emit(); }
  add(col, data, shared = true) { const id = newId(); this.state[col].push({ ...data, id, _shared: shared, ownerUid: this.user.uid, createdAt: Date.now() }); this.save(); return id; }
  update(col, id, patch) { const x = this.find(col, id); if (x) Object.assign(x, patch); this.save(); }
  remove(col, id) { this.state[col] = this.state[col].filter(x => x.id !== id); this.save(); }
  setShared(col, id, shared) { this.update(col, id, { _shared: shared }); }
  setLocation(loc) { this.locations = this.locations.filter(l => l.uid !== 'u1').concat({ uid: 'u1', name: 'Ayah', ...loc }); this.emit(); }
  clearLocation() { this.locations = this.locations.filter(l => l.uid !== 'u1'); this.emit(); }
  async updateProfile(name, color) { this.user.name = name; Object.assign(this.members[0], { name, ...(color ? { color } : {}) }); this.saveProf(); }
  async updateFamilyName(name) { this.family.name = name; this.saveProf(); }
  saveProf() { try { localStorage.setItem('tk-demo-prof', JSON.stringify({ name: this.user.name, color: this.members[0].color, family: this.family.name })); } catch {} this.emit(); }
  async regenerateInvite() { return this.family.inviteCode; }
  async enablePush() { throw new Error('Notifikasi push memerlukan Firebase. Sambungkan Firebase dahulu.'); }
  async signOut() { try { localStorage.removeItem('tk-demo'); localStorage.removeItem('tk-demo-prof'); } catch {} location.reload(); }
}

// ---------- Firebase ----------
class FirebaseStore extends Base {
  async init() {
    const fb = this.fb = await import('../vendor/firebase.js');
    this.app = fb.initializeApp(firebaseConfig);
    this.auth = fb.getAuth(this.app);
    this.db = fb.initializeFirestore(this.app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }) });
    fb.getRedirectResult(this.auth).catch(e => { this.authError = e.message; this.emit(); });
    fb.onAuthStateChanged(this.auth, u => this.onUser(u));
  }
  stop() { (this.unsubs || []).forEach(u => u()); this.unsubs = []; }
  onUser(u) {
    this.stop(); this.userUnsub?.();
    if (!u) { this.user = null; this.family = null; this.state = emptyState(); this.phase = 'signin'; this.emit(); return; }
    this.user = { uid: u.uid, name: u.displayName || (u.email || '').split('@')[0], email: u.email };
    this.phase = 'loading'; this.emit();
    const { doc, onSnapshot } = this.fb;
    this.userUnsub = onSnapshot(doc(this.db, 'users', u.uid), snap => {
      const fid = snap.data()?.familyId;
      if (!fid) { this.stop(); this.family = null; this.phase = 'family'; this.emit(); return; }
      if (this.family?.id !== fid) this.startFamily(fid);
    }, e => { this.loadError = e.message; this.phase = 'family'; this.emit(); });
  }
  startFamily(fid) {
    this.stop();
    const { doc, collection, onSnapshot } = this.fb, db = this.db, uid = this.user.uid;
    this.fid = fid; this.family = { id: fid, name: '' };
    this.state = emptyState();
    const buckets = {};
    const fail = e => { console.error(e); this.loadError = e.message; this.emit(); };
    COLS.forEach(col => {
      buckets[col] = { s: [], p: [] };
      const merge = () => { this.state[col] = [...buckets[col].s, ...buckets[col].p]; this.emit(); };
      this.unsubs.push(onSnapshot(collection(db, 'families', fid, col), q => { buckets[col].s = q.docs.map(d => ({ ...d.data(), id: d.id, _shared: true })); merge(); }, fail));
      this.unsubs.push(onSnapshot(collection(db, 'users', uid, col), q => { buckets[col].p = q.docs.map(d => ({ ...d.data(), id: d.id, _shared: false })); merge(); }, fail));
    });
    this.unsubs.push(onSnapshot(doc(db, 'families', fid), d => { this.family = { id: fid, ...d.data() }; this.phase = 'ready'; this.emit(); }, fail));
    this.unsubs.push(onSnapshot(collection(db, 'families', fid, 'members'), q => { this.members = q.docs.map(d => ({ uid: d.id, ...d.data() })); this.emit(); }, fail));
    this.unsubs.push(onSnapshot(collection(db, 'families', fid, 'locations'), q => { this.locations = q.docs.map(d => ({ uid: d.id, ...d.data() })); this.emit(); }, fail));
  }
  ref(col, id, shared) { const f = this.fb; return shared ? f.doc(this.db, 'families', this.fid, col, id) : f.doc(this.db, 'users', this.user.uid, col, id); }
  // Tulisan tidak ditunggu: Firestore menyimpannya setempat dan menyegerak bila dalam talian.
  write(p) { p.catch(e => { console.error(e); this.onWriteError?.(e); }); }
  add(col, data, shared = true) {
    const f = this.fb, base = shared ? f.collection(this.db, 'families', this.fid, col) : f.collection(this.db, 'users', this.user.uid, col);
    const r = f.doc(base);
    this.write(f.setDoc(r, { ...clean(data), ownerUid: this.user.uid, createdAt: Date.now() }));
    return r.id;
  }
  update(col, id, patch) { const x = this.find(col, id); if (x) this.write(this.fb.updateDoc(this.ref(col, id, x._shared), clean(patch))); }
  remove(col, id) { const x = this.find(col, id); if (x) this.write(this.fb.deleteDoc(this.ref(col, id, x._shared))); }
  // Tukar peribadi <-> kongsi = pindah dokumen ke laluan lain, ID dikekalkan.
  setShared(col, id, shared) {
    const x = this.find(col, id); if (!x || x._shared === shared) return;
    const { id: _i, _shared, ...data } = x;
    this.write(this.fb.setDoc(this.ref(col, id, shared), clean(data)));
    this.write(this.fb.deleteDoc(this.ref(col, id, !shared)));
  }
  setLocation(loc) { this.write(this.fb.setDoc(this.fb.doc(this.db, 'families', this.fid, 'locations', this.user.uid), { ...loc, name: this.user.name })); }
  clearLocation() { this.write(this.fb.deleteDoc(this.fb.doc(this.db, 'families', this.fid, 'locations', this.user.uid))); }

  // Pengesahan
  async signInGoogle() {
    const f = this.fb, p = new f.GoogleAuthProvider();
    try { await f.signInWithPopup(this.auth, p); }
    catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) await f.signInWithRedirect(this.auth, p); else throw e; }
  }
  signInEmail(email, pass) { return this.fb.signInWithEmailAndPassword(this.auth, email, pass); }
  async register(name, email, pass) {
    const c = await this.fb.createUserWithEmailAndPassword(this.auth, email, pass);
    await this.fb.updateProfile(c.user, { displayName: name });
    this.user = { ...this.user, name }; this.emit();
  }
  async signOut() { await this.fb.signOut(this.auth); location.reload(); }

  // Keluarga
  async createFamily(name) {
    const f = this.fb, uid = this.user.uid, r = f.doc(f.collection(this.db, 'families')), code = genCode();
    await f.setDoc(r, { name, ownerUid: uid, inviteCode: code, createdAt: Date.now() });
    await f.setDoc(f.doc(this.db, 'families', r.id, 'members', uid), { name: this.user.name, color: COLORS[0], joinedAt: Date.now() });
    await f.setDoc(f.doc(this.db, 'invites', code), { familyId: r.id });
    await f.setDoc(f.doc(this.db, 'users', uid), { familyId: r.id, name: this.user.name }, { merge: true });
  }
  async joinFamily(code) {
    const f = this.fb, uid = this.user.uid; code = code.trim().toUpperCase();
    const inv = await f.getDoc(f.doc(this.db, 'invites', code));
    if (!inv.exists()) throw new Error('Kod jemputan tidak sah. Minta kod terbaharu daripada ahli keluarga anda.');
    const fid = inv.data().familyId;
    await f.setDoc(f.doc(this.db, 'families', fid, 'members', uid), { name: this.user.name, color: COLORS[Math.floor(Math.random() * COLORS.length)], joinedAt: Date.now(), inviteCode: code });
    await f.setDoc(f.doc(this.db, 'users', uid), { familyId: fid, name: this.user.name }, { merge: true });
  }
  async regenerateInvite() {
    const f = this.fb, old = this.family.inviteCode, code = genCode();
    await f.setDoc(f.doc(this.db, 'invites', code), { familyId: this.fid });
    await f.updateDoc(f.doc(this.db, 'families', this.fid), { inviteCode: code });
    if (old) await f.deleteDoc(f.doc(this.db, 'invites', old));
    return code;
  }
  async updateFamilyName(name) { await this.fb.updateDoc(this.fb.doc(this.db, 'families', this.fid), { name }); }
  async updateProfile(name, color) {
    const f = this.fb, uid = this.user.uid;
    this.user.name = name;
    await f.updateProfile(this.auth.currentUser, { displayName: name });
    await f.updateDoc(f.doc(this.db, 'families', this.fid, 'members', uid), color ? { name, color } : { name });
    const loc = this.locations.find(l => l.uid === uid);
    if (loc) await f.updateDoc(f.doc(this.db, 'families', this.fid, 'locations', uid), { name });
    await f.setDoc(f.doc(this.db, 'users', uid), { name }, { merge: true });
    this.emit();
  }
  async enablePush() {
    const f = this.fb;
    if (!vapidKey) throw new Error('Kunci VAPID belum diisi dalam js/config.js.');
    if (!(await f.isSupported())) throw new Error('Pelayar ini tidak menyokong notifikasi push. Di iPhone, pasang aplikasi ke Skrin Utama dahulu.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notifikasi disekat. Benarkan dalam tetapan pelayar, kemudian cuba semula.');
    const reg = await navigator.serviceWorker.ready;
    const token = await f.getToken(f.getMessaging(this.app), { vapidKey, serviceWorkerRegistration: reg });
    const key = token.replace(/[^a-zA-Z0-9]/g, '').slice(-80);
    await f.setDoc(f.doc(this.db, 'users', this.user.uid, 'fcm', key), { token, at: Date.now(), ua: navigator.userAgent.slice(0, 120) });
  }
}
const clean = o => Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && k !== '_shared' && k !== 'id'));
function genCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(b, x => A[x % A.length]).join('');
}

export async function createStore() {
  if (!hasFirebase()) return new DemoStore();
  const s = new FirebaseStore();
  await s.init();
  return s;
}
