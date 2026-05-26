import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, User, Clock, Activity, Trash, PlusCircle, CheckCircle, AlertCircle, MessageCircle, MessageSquare, Clipboard, Lock, Users, LogOut, Key, Copy, Plus, List, Sun, Moon, Settings, Phone, Check, Filter, BarChart, Star, Crown, Bot, Sparkles, RefreshCw, DollarSign, Download, CalendarPlus, Inbox, AlertTriangle, FileText, UserPlus, Edit2, ShieldAlert, ShoppingBag, Menu, X } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, setDoc, onSnapshot, query, writeBatch } from "firebase/firestore";
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

let firebaseConfig = {
  apiKey: "AIzaSyB86wjSD0jdCPeOY_7XJBCU9_tWzpbdGFk",
  authDomain: "smart-recovery-9ec63.firebaseapp.com",
  projectId: "smart-recovery-9ec63",
  storageBucket: "smart-recovery-9ec63.firebasestorage.app",
  messagingSenderId: "886544028489",
  appId: "1:886544028489:web:72fcbd4a3235a0ba08c098"
};

try { if (typeof __firebase_config !== 'undefined') firebaseConfig = JSON.parse(__firebase_config); } catch (e) { }
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz44rH6SVbcFQPUkdoxB7GVyeFuhZ-eO2lKqpYvFI-xDKHs1TP6eeV8HMLy5roCBIGyEQ/exec";

const SESSION_PRICE = 1600;
const BODY_PARTS = ['肩頸', '上背/下背', '骨盆/髖', '大腿', '膝蓋', '小腿/腳踝', '手臂/手腕'];
const TAG_OPTIONS = ['⭐ VIP', '⚠️ 常遲到', '💪 怕痛', '🤰 孕婦', '🤫 需要安靜', '常客', '需輕柔', '健談', '奧客'];
const DEFAULT_TEAM = [
  { id: 'ted', name: 'Ted (執行長)', pwd: 'pt', role: 'admin' },
  { id: 'jerry', name: 'Jerry (恢復顧問)', pwd: 'jerry123', role: 'advisor' },
  { id: 'amy', name: 'Amy (恢復顧問)', pwd: 'amy123', role: 'advisor' }
];
const serviceTypes = ["運動後疲勞恢復", "深層肌肉與筋膜放鬆", "動作控制與體態調整", "銀髮族活動力促進", "專項運動表現優化", "日常肌力與體能訓練", "身體大保養", "其他（詳情請打在備註）"];

async function callGeminiAPI(prompt, retries = 3, delay = 1000) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      if (response.ok) { const data = await response.json(); return data.candidates[0].content.parts[0].text; }
      if (response.status === 503) { if (i === retries - 1) throw new Error("伺服器忙碌中"); await new Promise(resolve => setTimeout(resolve, delay)); delay *= 2; continue; }
      throw new Error(`API 錯誤: ${response.status}`);
    } catch (error) { if (i === retries - 1) throw error; }
  }
}

const generateAllSlots = () => {
  const slots = [];
  for (let h = 10; h < 22; h++) { slots.push(`${h}:00-${h}:30`); slots.push(`${h}:30-${h + 1}:00`); }
  return slots;
};
const ALL_TIME_SLOTS = generateAllSlots();
const formatTimeSlots = (slots) => {
  if (!slots || slots.length === 0) return '';
  const sorted = [...slots].sort();
  let merged = [];
  let currentStart = sorted[0].split('-')[0], currentEnd = sorted[0].split('-')[1];
  for (let i = 1; i < sorted.length; i++) {
    const [nextStart, nextEnd] = sorted[i].split('-');
    if (currentEnd === nextStart) { currentEnd = nextEnd; } else { merged.push(`${currentStart}-${currentEnd}`); currentStart = nextStart; currentEnd = nextEnd; }
  }
  merged.push(`${currentStart}-${currentEnd}`); return merged.join(', ');
};
const getDayLabel = (dateStr) => { const d = new Date(dateStr); const days = ['日', '一', '二', '三', '四', '五', '六']; return { date: `${d.getMonth() + 1}/${d.getDate()}`, weekday: days[d.getDay()] }; };

const BrandFooter = () => (
  <footer className="w-full text-center px-4 py-8 text-xs text-white/40 relative z-10 space-y-1">
    <p>© 2026 Smart Recovery</p>
    <p>官方聯絡信箱：smartrecovery.studio@gmail.com</p>
  </footer>
);

const AdminLayout = ({ children, currentUser, onLogout, currentTab, setCurrentTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuItems = [
    { id: 'appointments', label: '預約列表', icon: <List size={20} /> },
    { id: 'calendar', label: '日曆戰情室', icon: <CalendarIcon size={20} /> },
    { id: 'schedule', label: '顧問排班', icon: <Clock size={20} /> },
    { id: 'analytics', label: '營收報表', icon: <BarChart size={20} />, adminOnly: true },
    { id: 'team', label: '團隊管理', icon: <Users size={20} />, adminOnly: true },
    { id: 'prices', label: '商品設定', icon: <ShoppingBag size={20} />, adminOnly: true },
    { id: 'blacklist', label: '黑名單', icon: <ShieldAlert size={20} />, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-slate-100 w-full overflow-hidden absolute inset-0 z-50">
      <button className="md:hidden fixed top-4 left-4 z-[70] p-2 bg-[#192039] text-[#e3b5a1] rounded-lg shadow-md" onClick={() => setIsOpen(true)}>
        <Menu size={24} />
      </button>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[60] md:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed md:relative z-[65] w-64 h-full bg-[#192039] text-white transition-transform transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col shadow-2xl`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-[#e3b5a1]">管理中心</h2>
            <p className="text-xs text-white/60 mt-1">{currentUser.name}</p>
          </div>
          <button className="md:hidden text-white/50 hover:text-white" onClick={() => setIsOpen(false)}><X size={20}/></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.filter(i => !i.adminOnly || currentUser.role === 'admin').map(item => (
            <button key={item.id} onClick={() => { setCurrentTab(item.id); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${currentTab === item.id ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/10'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 rounded-xl hover:bg-rose-500 text-white transition-colors text-sm font-bold"><LogOut size={16}/> 登出系統</button>
        </div>
      </aside>
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 relative pt-16 md:pt-8 bg-slate-50">{children}</main>
    </div>
  );
};

const AdminCalendarView = ({ appointments, onSelectSlot, onSelectEvent }) => {
  const events = appointments.filter(a => a.status !== '已取消').map(appt => {
    if(!appt.date || !appt.timeSlots || appt.timeSlots.length === 0) return null;
    const startStr = appt.timeSlots[0].split('-')[0];
    const endStr = appt.timeSlots[appt.timeSlots.length - 1].split('-')[1];
    return { id: appt.id, title: `${appt.name} (${appt.advisorName})`, start: new Date(`${appt.date}T${startStr}:00`), end: new Date(`${appt.date}T${endStr}:00`), resource: appt };
  }).filter(Boolean);

  return (
    <div className="h-[750px] bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2"><CalendarIcon className="text-[#9aa486]" /> 日曆戰情室 (點擊空白處可代客預約)</h3>
      <BigCalendar localizer={localizer} events={events} startAccessor="start" endAccessor="end" views={['month', 'week', 'day']} defaultView="week" selectable={true} onSelectSlot={onSelectSlot} onSelectEvent={onSelectEvent} className="font-sans text-sm" />
    </div>
  );
};

const MobilePOSModal = ({ onClose, cart, setCart, customItem, setCustomItem, calcDiscount, setCalcDiscount, calcAdvisor, setCalcAdvisor, teamMembers, priceList, handleConfirmPayment, cartTotal, calcFinalAmount }) => (
  <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex flex-col">
    <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#192039]">
      <h3 className="text-white font-bold text-lg flex items-center gap-2"><DollarSign className="text-emerald-400"/> 快速結帳核銷</h3>
      <button onClick={onClose} className="text-white/50 hover:text-white bg-white/10 p-2 rounded-full"><X size={20}/></button>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
        <label className="block text-emerald-400 text-sm font-bold mb-2">🧑‍⚕️ 收款顧問 (業績歸屬)</label>
        <select value={calcAdvisor} onChange={e => setCalcAdvisor(e.target.value)} className="w-full p-4 bg-white rounded-xl font-bold text-lg text-slate-800 outline-none">
          <option value="" disabled>請選擇收款人...</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-white/70 text-sm font-bold mb-3">服務快捷鍵</label>
        <div className="grid grid-cols-2 gap-3">
          {priceList.services?.map(s => (
            <button key={s.name} onClick={() => {
              const newCart = cart.filter(item => !item.isBase);
              setCart([...newCart, { id: Date.now(), name: s.name, price: Number(s.price), qty: 1, isBase: true }]);
            }} className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 py-4 rounded-xl font-bold active:scale-95 transition-all shadow-sm flex flex-col items-center justify-center"><span>{s.name}</span><span className="text-xs opacity-70">${s.price}</span></button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-white/70 text-sm font-bold mb-3">周邊加價購</label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {priceList.addons?.map(a => (
            <button key={a.name} onClick={() => setCart([...cart, { id: Date.now(), name: a.name, price: Number(a.price), qty: 1 }])} className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl font-bold whitespace-nowrap active:scale-95 transition-all">
              + {a.name} (${a.price})
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
        <label className="block text-white/70 text-sm font-bold mb-3">折扣設定</label>
        <div className="flex items-center gap-3">
          <input type="number" step="0.1" value={calcDiscount} onChange={e => setCalcDiscount(e.target.value)} className="w-full text-2xl p-4 bg-white rounded-xl font-bold text-slate-800 text-center outline-none" />
          <span className="text-xl text-white font-bold whitespace-nowrap">折</span>
        </div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-center mb-2 text-slate-500 font-bold"><span className="text-sm">購物車 ({cart.length}件)</span><span className="text-sm">${cartTotal.toLocaleString()}</span></div>
      <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-4"><span className="text-slate-800 font-extrabold text-xl">最終結帳</span><span className="text-5xl font-black text-rose-600">${calcFinalAmount.toLocaleString()}</span></div>
      <div className="flex gap-3">
        <button onClick={() => setCart([])} className="px-6 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">清空</button>
        <button onClick={handleConfirmPayment} className="flex-1 bg-emerald-500 text-white font-black text-2xl py-4 rounded-2xl shadow-lg active:scale-95 transition-all">確認收款</button>
      </div>
    </div>
  </div>
);
export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [customerMemos, setCustomerMemos] = useState({});
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM);
  const [activeAdvisors, setActiveAdvisors] = useState(DEFAULT_TEAM.map(m => m.id));
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ account: 'ted', password: '' });
  const [appMode, setAppMode] = useState('booking'); 
  const [adminTab, setAdminTab] = useState('appointments');

  const [formData, setFormData] = useState({ name: '', phone: '', isFirstTime: '', advisorId: '', date: '', timeSlots: [], serviceType: '', needs: '', painLevel: 5, bodyParts: [] });
  const [conflictError, setConflictError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleAdvisorId, setScheduleAdvisorId] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [additionalDates, setAdditionalDates] = useState([]);

  const [showPOS, setShowPOS] = useState(false);
  const [cart, setCart] = useState([]);
  const [customItem, setCustomItem] = useState({ name: '', price: '', qty: 1 });
  const [calcDiscount, setCalcDiscount] = useState('10');
  const [calcAdvisor, setCalcAdvisor] = useState('');
  const [revenueRecords, setRevenueRecords] = useState([]);
  const [priceList, setPriceList] = useState({ services: [{ name: '標準單堂', price: 1600 }], addons: [{ name: '筋膜球', price: 350 }] });
  
  const [showStaffBookModal, setShowStaffBookModal] = useState(false);
  const [staffBookData, setStaffBookData] = useState({ date: '', time: '', name: '', phone: '', service: '', advisorId: '' });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const calcFinalAmount = Math.round(cartTotal * (Number(calcDiscount) || 10) / 10);

  useEffect(() => {
    const unsubAppt = onSnapshot(query(collection(db, "appointments")), snapshot => {
      const appts = []; snapshot.forEach(doc => { const data = doc.data(); appts.push({ id: doc.id, ...data, timeSlots: data.timeSlots || [data.timeSlot || ''] }); });
      setAppointments(appts.sort((a, b) => new Date(`${a.date}T${(a.timeSlots[0]||'').split('-')[0]}`) - new Date(`${b.date}T${(b.timeSlots[0]||'').split('-')[0]}`)));
    });
    const unsubSched = onSnapshot(query(collection(db, "schedules")), snap => { const s = []; snap.forEach(doc => s.push({ id: doc.id, ...doc.data() })); setSchedules(s); });
    const unsubSettings = onSnapshot(doc(db, "settings", "teamConfig"), docSnap => { if (docSnap.exists()) setActiveAdvisors(docSnap.data().activeIds || []); });
    const unsubMemos = onSnapshot(query(collection(db, "customerMemos")), snap => { const m = {}; snap.forEach(doc => { m[doc.id] = doc.data().text; }); setCustomerMemos(m); });
    const unsubTeam = onSnapshot(doc(db, "settings", "teamList"), docSnap => { if (docSnap.exists()) setTeamMembers(docSnap.data().members || DEFAULT_TEAM); });
    const unsubRev = onSnapshot(query(collection(db, "revenueRecords")), snap => { const r = []; snap.forEach(doc => r.push({ id: doc.id, ...doc.data() })); setRevenueRecords(r); });
    const unsubPrice = onSnapshot(doc(db, "settings", "priceList"), docSnap => { if (docSnap.exists()) setPriceList(docSnap.data()); });
    return () => { unsubAppt(); unsubSched(); unsubSettings(); unsubMemos(); unsubTeam(); unsubRev(); unsubPrice(); };
  }, []);

  const clientAvailableSlots = useMemo(() => {
    if (!formData.date || !formData.advisorId) return [];
    if (formData.advisorId === 'any') {
      let allAvailable = new Set();
      activeAdvisors.forEach(advId => {
        const sched = schedules.find(s => s.advisorId === advId && s.date === formData.date);
        const booked = appointments.filter(a => a.advisorId === advId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots);
        if (sched && sched.slots) sched.slots.forEach(slot => { if (!booked.includes(slot)) allAvailable.add(slot); });
      });
      return Array.from(allAvailable).sort();
    } else {
      const sched = schedules.find(s => s.advisorId === formData.advisorId && s.date === formData.date);
      if (!sched || !sched.slots) return [];
      const booked = appointments.filter(a => a.advisorId === formData.advisorId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots);
      return sched.slots.filter(slot => !booked.includes(slot)).sort();
    }
  }, [formData.date, formData.advisorId, schedules, appointments, activeAdvisors]);
  const handleLogin = (e) => {
    e.preventDefault();
    const user = teamMembers.find(u => u.id === loginForm.account && u.pwd === loginForm.password);
    if (user) { setCurrentUser(user); setScheduleAdvisorId(user.id); setShowLoginModal(false); setAdminTab('appointments'); } 
    else { alert("密碼錯誤！"); }
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    const clientMemo = customerMemos[formData.phone] || '';
    if (clientMemo.includes('【黑名單】')) return setConflictError('無法線上預約，請聯繫官方 LINE。');
    if (!formData.name || !formData.phone || formData.timeSlots.length === 0 || !formData.serviceType || !formData.date || !formData.advisorId) return setConflictError('請完整填寫');
    
    let isConflict = false;
    if (formData.advisorId !== 'any') {
      isConflict = formData.timeSlots.some(slot => appointments.filter(a => a.advisorId === formData.advisorId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots).includes(slot));
    }
    if (isConflict) return setConflictError('時段已被預約，請重選！');

    setIsSubmitting(true);
    const sortedSlots = [...formData.timeSlots].sort();
    const gasTime = `${sortedSlots[0].split('-')[0]}-${sortedSlots[sortedSlots.length - 1].split('-')[1]}`;
    const advisorName = teamMembers.find(t => t.id === formData.advisorId)?.name || '不指定顧問';
    
    try {
      await addDoc(collection(db, "appointments"), { ...formData, customerType: formData.isFirstTime === 'yes' ? '初次預約' : '舊客複診', exactDisplayTime: formatTimeSlots(sortedSlots), gasTime, advisorName, status: 'confirmed', createdAt: new Date().toISOString() });
      setSuccessData({ name: formData.name, date: formData.date, time: formatTimeSlots(sortedSlots), service: formData.serviceType, advisor: advisorName });
      setFormData({ name: '', phone: '', isFirstTime: '', advisorId: '', date: '', timeSlots: [], serviceType: '', needs: '', bodyParts: [], painLevel: 5 });
    } catch (e) { setConflictError('連線錯誤'); } finally { setIsSubmitting(false); }
  };

  const handleStaffDirectSubmit = async () => {
    if(!staffBookData.name || !staffBookData.date || !staffBookData.time || !staffBookData.advisorId) return alert('必填欄位不可空白');
    const advisorName = teamMembers.find(t => t.id === staffBookData.advisorId)?.name || '未知';
    try {
      await addDoc(collection(db, "appointments"), { name: staffBookData.name, phone: staffBookData.phone, customerType: '舊客複診', serviceType: staffBookData.service || '客製化服務', date: staffBookData.date, timeSlots: [staffBookData.time], exactDisplayTime: staffBookData.time, advisorId: staffBookData.advisorId, advisorName, status: 'confirmed', needs: '內部代客安插', createdAt: new Date().toISOString() });
      alert('後台代客預約成功！(已略過前台驗證)');
      setShowStaffBookModal(false);
    } catch(e) { alert('寫入失敗'); }
  };

  const handleQuickPOSOpen = (appt) => {
    setCalcAdvisor(appt.advisorId);
    setCart([{ id: 'base', name: `${appt.serviceType} (${appt.name})`, price: appt.customerType === '初次預約' ? 2000 : 1600, qty: 1, isBase: true }]);
    setCalcDiscount('10'); setShowPOS(true);
  };

  const handleConfirmPayment = async () => {
    if (cart.length === 0 || !calcAdvisor) return alert('請加入商品並選擇收款人！');
    try {
      await addDoc(collection(db, "revenueRecords"), { date: new Date().toISOString(), originalPrice: cartTotal, discount: Number(calcDiscount), finalAmount: calcFinalAmount, advisorId: calcAdvisor, items: cart });
      alert(`收款成功！入帳金額：$${calcFinalAmount}`);
      setShowPOS(false); setCart([]);
    } catch (err) { alert("結帳失敗：" + err.message); }
  };

  const handleCalendarSelectSlot = (slotInfo) => {
    const dStr = moment(slotInfo.start).format('YYYY-MM-DD');
    const tStr = `${moment(slotInfo.start).format('HH:mm')}-${moment(slotInfo.end).format('HH:mm')}`;
    setStaffBookData({ ...staffBookData, date: dStr, time: tStr, advisorId: currentUser?.id || '' });
    setShowStaffBookModal(true);
  };
  if (currentUser) {
    return (
      <>
        <AdminLayout currentUser={currentUser} onLogout={() => setCurrentUser(null)} currentTab={adminTab} setCurrentTab={setAdminTab}>
          {adminTab === 'appointments' && (
             <div className="space-y-4">
               <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                 <h2 className="text-xl font-bold flex items-center gap-2"><List className="text-[#9aa486]" /> 預約列表戰情室</h2>
                 <button onClick={() => setShowPOS(true)} className="bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md"><DollarSign size={18}/> 收銀機 POS</button>
               </div>
               <div className="grid gap-4">
                 {appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).map(appt => (
                   <div key={appt.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-[#9aa486] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                       <div className="flex gap-2 items-center"><span className="text-lg font-bold">{appt.name}</span><span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold">{appt.timeSlots.join(', ')}</span></div>
                       <div className="text-sm text-slate-500 mt-1">{appt.serviceType} | 指定：{appt.advisorName}</div>
                     </div>
                     <button onClick={() => handleQuickPOSOpen(appt)} className="w-full sm:w-auto bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl font-bold transition-colors">一鍵結帳</button>
                   </div>
                 ))}
                 {appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length === 0 && <p className="text-slate-500 text-center py-10">今日尚無預約</p>}
               </div>
             </div>
          )}
          {adminTab === 'calendar' && <AdminCalendarView appointments={appointments} onSelectSlot={handleCalendarSelectSlot} onSelectEvent={(e) => handleQuickPOSOpen(e.resource)} />}
          {/* 其他管理分頁可以依此類推放入 */}
          {adminTab !== 'appointments' && adminTab !== 'calendar' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
              <Settings size={48} className="mb-4 opacity-20" />
              <p>其他進階管理功能模組開發中，請先使用戰情室與日曆視圖。</p>
            </div>
          )}
        </AdminLayout>

        {showPOS && <MobilePOSModal onClose={() => setShowPOS(false)} cart={cart} setCart={setCart} customItem={customItem} setCustomItem={setCustomItem} calcDiscount={calcDiscount} setCalcDiscount={setCalcDiscount} calcAdvisor={calcAdvisor} setCalcAdvisor={setCalcAdvisor} teamMembers={teamMembers} priceList={priceList} handleConfirmPayment={handleConfirmPayment} cartTotal={cartTotal} calcFinalAmount={calcFinalAmount} />}
        
        {showStaffBookModal && (
          <div className="fixed inset-0 bg-black/60 z-[300] flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-lg mb-4 border-b pb-2">代客安插預約 (無視前台規則)</h3>
              <div className="space-y-3">
                <input type="text" placeholder="客戶姓名" value={staffBookData.name} onChange={e=>setStaffBookData({...staffBookData, name: e.target.value})} className="w-full p-2 border rounded" />
                <input type="text" placeholder="聯絡電話" value={staffBookData.phone} onChange={e=>setStaffBookData({...staffBookData, phone: e.target.value})} className="w-full p-2 border rounded" />
                <div className="flex gap-2">
                  <input type="date" value={staffBookData.date} onChange={e=>setStaffBookData({...staffBookData, date: e.target.value})} className="w-full p-2 border rounded" />
                  <input type="text" placeholder="時段 (例: 10:00-10:30)" value={staffBookData.time} onChange={e=>setStaffBookData({...staffBookData, time: e.target.value})} className="w-full p-2 border rounded" />
                </div>
                <select value={staffBookData.advisorId} onChange={e=>setStaffBookData({...staffBookData, advisorId: e.target.value})} className="w-full p-2 border rounded"><option value="">選顧問</option>{teamMembers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
                <div className="flex gap-2 pt-4">
                  <button onClick={()=>setShowStaffBookModal(false)} className="flex-1 bg-slate-100 p-2 rounded font-bold">取消</button>
                  <button onClick={handleStaffDirectSubmit} className="flex-1 bg-[#192039] text-[#e3b5a1] p-2 rounded font-bold">強制寫入預約</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#192039] p-4 md:p-8 flex flex-col font-sans">
      <button onClick={() => setShowLoginModal(true)} className="fixed top-4 left-4 z-50 p-2 bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"><Settings size={20} /></button>
      
      {showLoginModal && (
        <div className="fixed inset-0 bg-[#192039]/90 backdrop-blur flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <button type="button" onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h2 className="text-xl font-bold text-center mb-6">管理員入口</h2>
            <select value={loginForm.account} onChange={e => setLoginForm({ ...loginForm, account: e.target.value })} className="w-full p-3 bg-slate-50 border rounded-xl mb-4"><option value="ted">Ted (執行長)</option><option value="jerry">Jerry (顧問)</option><option value="amy">Amy (顧問)</option></select>
            <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full p-3 bg-slate-50 border rounded-xl mb-4" placeholder="密碼" />
            <button type="submit" className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-3 rounded-xl">登入系統</button>
          </form>
        </div>
      )}

      <header className="flex flex-col items-center justify-center gap-4 text-center mb-8 pt-4">
        <div className="w-32 h-32 rounded-full p-[3px] bg-gradient-to-b from-[#e3b5a1] to-[#9aa486] flex items-center justify-center"><div className="w-full h-full rounded-full bg-[#12182c] flex items-center justify-center"><span className="text-[#e3b5a1] font-bold">LOGO</span></div></div>
        <h1 className="text-3xl font-extrabold tracking-widest text-white">智理運動恢復</h1>
      </header>

      <div className="max-w-xl mx-auto w-full space-y-6">
        {successData ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-xl">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">預約成功！</h2>
            <p className="text-slate-500 mb-6">您預約了 {successData.date} {successData.time} 的服務</p>
            <button onClick={() => setSuccessData(null)} className="text-sm text-slate-400 underline">返回首頁</button>
          </div>
        ) : (
          <form onSubmit={handleClientSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-4"><CalendarIcon className="text-[#9aa486]"/> 快速線上預約</h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="姓名 *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-3 bg-slate-50 border rounded-xl text-sm" required />
              <input type="tel" placeholder="電話 *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="p-3 bg-slate-50 border rounded-xl text-sm" required />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setFormData({...formData, isFirstTime: 'yes'})} className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm ${formData.isFirstTime === 'yes' ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white'}`}>初次預約</button>
              <button type="button" onClick={() => setFormData({...formData, isFirstTime: 'no'})} className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm ${formData.isFirstTime === 'no' ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white'}`}>舊客回診</button>
            </div>
            <select value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" required><option value="" disabled>請選擇預約項目 *</option>{serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <select value={formData.advisorId} onChange={e => setFormData({...formData, advisorId: e.target.value, timeSlots: []})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" required><option value="" disabled>指定顧問 *</option><option value="any">✨ 不指定 (安排最快)</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value, timeSlots: []})} min={new Date().toISOString().split('T')[0]} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" required />
            
            {formData.date && formData.advisorId && (
              <div className="grid grid-cols-3 gap-2">
                {clientAvailableSlots.length === 0 ? <p className="col-span-3 text-center text-rose-400 text-sm py-4">無可預約空檔</p> : clientAvailableSlots.map(slot => (
                  <button type="button" key={slot} onClick={() => setFormData({...formData, timeSlots: formData.timeSlots.includes(slot) ? formData.timeSlots.filter(s=>s!==slot) : [...formData.timeSlots, slot]})} className={`py-2 border rounded-lg text-sm font-bold ${formData.timeSlots.includes(slot) ? 'bg-[#9aa486] text-white' : 'bg-white text-slate-600'}`}>{slot}</button>
                ))}
              </div>
            )}
            {conflictError && <p className="text-rose-500 font-bold text-sm">{conflictError}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-4 rounded-xl mt-4">確認送出預約</button>
          </form>
        )}
      </div>
      <BrandFooter />
    </div>
  );
}
