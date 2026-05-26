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

export const getBossAnalytics = (records) => {
  if (!records || !Array.isArray(records)) return {};
  return records.reduce((acc, curr) => {
    if (!curr || !curr.date) return acc;
    const dateObj = new Date(curr.date);
    if (isNaN(dateObj.getTime())) return acc;
    const month = dateObj.getMonth() + 1;
    if (!acc[month]) acc[month] = { total: 0, new: 0, return: 0, cancelled: 0 };
    if (curr.status === '已取消' || curr.status === '取消') { acc[month].cancelled += 1; return acc; }
    acc[month].total += 1;
    if (curr.customerType === '初次預約') acc[month].new += 1; else acc[month].return += 1;
    return acc;
  }, {});
};

const AdminLayout = ({ children, currentUser, onLogout, currentTab, setCurrentTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuItems = [
    { id: 'appointments', label: '戰情室 (列表)', icon: <List size={20} /> },
    { id: 'calendar', label: '日曆視圖', icon: <CalendarIcon size={20} /> },
    { id: 'schedule', label: '顧問排班', icon: <Clock size={20} /> },
    { id: 'analytics', label: '營收報表', icon: <BarChart size={20} />, adminOnly: true },
    { id: 'team', label: '團隊管理', icon: <Users size={20} />, adminOnly: true },
    { id: 'prices', label: '商品設定', icon: <ShoppingBag size={20} />, adminOnly: true },
    { id: 'blacklist', label: '黑名單', icon: <ShieldAlert size={20} />, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-slate-100 w-full overflow-hidden absolute inset-0 z-40">
      <button className="md:hidden fixed top-4 left-4 z-[70] p-2 bg-[#192039] text-[#e3b5a1] rounded-lg shadow-md" onClick={() => setIsOpen(true)}><Menu size={24} /></button>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[60] md:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed md:relative z-[65] w-64 h-full bg-[#192039] text-white transition-transform transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col shadow-2xl`}>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-[#e3b5a1]">管理中心</h2>
          <p className="text-xs text-white/60 mt-1">{currentUser.name}</p>
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

  const minTime = new Date(); minTime.setHours(09, 0, 0); // 營業開始時間 09:00
  const maxTime = new Date(); maxTime.setHours(22, 3, 0); // 營業結束時間 22:30

  return (
    <div className="h-[750px] bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2"><CalendarIcon className="text-[#9aa486]" /> 日曆戰情室 (點擊空白處可代客預約)</h3>
      <BigCalendar 
        localizer={localizer} 
        events={events} 
        startAccessor="start" 
        endAccessor="end" 
        views={['week', 'day']} 
        defaultView="week" 
        selectable={true} 
        onSelectSlot={onSelectSlot} 
        onSelectEvent={onSelectEvent} 
        step={30}         // 半小時為一格
        timeslots={1}     // 每個區塊顯示 1 個 step
        min={minTime} 
        max={maxTime} 
        className="font-sans text-sm" 
      />
    </div>
  );
};
export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [customerMemos, setCustomerMemos] = useState({});
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM);
  const [activeAdvisors, setActiveAdvisors] = useState(DEFAULT_TEAM.map(m => m.id));
  const [currentUser, setCurrentUser] = useState(null);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ account: 'ted', password: '' });
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetForm, setResetForm] = useState({ account: 'jerry', authCode: '', newPwd: '' });
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [userNewPwd, setUserNewPwd] = useState('');
  
  const [appMode, setAppMode] = useState('booking'); 
  const [adminTab, setAdminTab] = useState('appointments');

  const getSavedCustomer = () => { try { const saved = localStorage.getItem('smartRecoveryCustomer'); return saved ? JSON.parse(saved) : { name: '', phone: '' }; } catch { return { name: '', phone: '' }; } };
  const savedInfo = getSavedCustomer();
  const [formData, setFormData] = useState({ name: savedInfo.name, phone: savedInfo.phone, isFirstTime: '', advisorId: '', date: '', timeSlots: [], serviceType: '', needs: '', painLevel: 5, bodyParts: [] });
  
  const [conflictError, setConflictError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [memoInput, setMemoInput] = useState('');
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [rebookCustomer, setRebookCustomer] = useState({ name: "", phone: "" });
  const [rebookFormData, setRebookFormData] = useState({ date: "", time: "", service: "", consultant: "" });

  const [clientSearchPhone, setClientSearchPhone] = useState('');
  const [clientAppts, setClientAppts] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleAdvisorId, setScheduleAdvisorId] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [additionalDates, setAdditionalDates] = useState([]);
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const [apptFilter, setApptFilter] = useState('today');
  const [adminViewAdvisor, setAdminViewAdvisor] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedAnalyticsAdvisors, setSelectedAnalyticsAdvisors] = useState(DEFAULT_TEAM.map(m => m.id));

  const [showPOS, setShowPOS] = useState(false);
  const [cart, setCart] = useState([]);
  const [customItem, setCustomItem] = useState({ name: '', price: '', qty: 1 });
  const [calcDiscount, setCalcDiscount] = useState('10');
  const [calcAdvisor, setCalcAdvisor] = useState('');
  const [revenueRecords, setRevenueRecords] = useState([]);
  const [posSelectedMonth, setPosSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [priceList, setPriceList] = useState({ services: [], addons: [] });
  const [newProduct, setNewProduct] = useState({ type: 'services', name: '', price: '' });
  const [newAdvisor, setNewAdvisor] = useState({ id: '', name: '', pwd: '', role: 'advisor' });

  const [aiInput, setAiInput] = useState('');
  const [aiRec, setAiRec] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [adviceMap, setAdviceMap] = useState({});

  const [showStaffBookModal, setShowStaffBookModal] = useState(false);
  const [staffBookData, setStaffBookData] = useState({ date: '', time: '', name: '', phone: '', service: '', advisorId: '' });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const calcFinalAmount = Math.round(cartTotal * (Number(calcDiscount) || 10) / 10);

  const next28Days = useMemo(() => { const days = []; const today = new Date(); for (let i = 1; i <= 28; i++) { const nextDay = new Date(today); nextDay.setDate(today.getDate() + i); days.push(nextDay.toISOString().split('T')[0]); } return days; }, []);
  const availableMonths = useMemo(() => { const months = new Set(appointments.map(a => a.date ? a.date.substring(0, 7) : null).filter(Boolean)); const monthArray = Array.from(months).sort().reverse(); const currentMonth = new Date().toISOString().substring(0, 7); if (!monthArray.includes(currentMonth)) monthArray.unshift(currentMonth); return monthArray; }, [appointments]);

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
    const unsubPrice = onSnapshot(doc(db, "settings", "priceList"), docSnap => { 
      if (docSnap.exists()) { setPriceList(docSnap.data()); } else {
        const defaultList = { services: [{ name: '標準單堂', price: 1600 }, { name: '初次評估', price: 2000 }], addons: [{ name: '加時半小', price: 800 }, { name: '專業肌貼', price: 150 }] };
        setDoc(doc(db, "settings", "priceList"), defaultList); setPriceList(defaultList);
      }
    });
    return () => { unsubAppt(); unsubSched(); unsubSettings(); unsubMemos(); unsubTeam(); unsubRev(); unsubPrice(); };
  }, []);

  useEffect(() => { setSelectedAnalyticsAdvisors(teamMembers.map(m => m.id)); }, [teamMembers]);
  useEffect(() => { if (scheduleAdvisorId && scheduleDate) { const existing = schedules.find(s => s.advisorId === scheduleAdvisorId && s.date === scheduleDate); setSelectedSlots(existing ? existing.slots : []); setAdditionalDates([]); } }, [scheduleAdvisorId, scheduleDate, schedules]);

const handleLogin = (e) => { e.preventDefault(); const user = teamMembers.find(u => u.id === loginForm.account && u.pwd === loginForm.password); if (user) { setCurrentUser(user); setScheduleAdvisorId(user.id); setShowLoginModal(false); setAdminTab('appointments'); } else { alert("密碼錯誤！"); } };
  const handleResetPassword = async (e) => { e.preventDefault(); if (resetForm.authCode !== '950901') return alert("⚠️ 授權碼錯誤"); const updatedTeam = teamMembers.map(m => m.id === resetForm.account ? { ...m, pwd: resetForm.newPwd } : m); try { await setDoc(doc(db, "settings", "teamList"), { members: updatedTeam }, { merge: true }); alert("✅ 密碼重設成功！"); setShowResetPwdModal(false); } catch (err) { alert("失敗：" + err.message); } };
  const handleUpdatePassword = async (targetId, newPassword) => { if (!newPassword.trim()) return alert("密碼不能為空！"); const updatedTeam = teamMembers.map(m => m.id === targetId ? { ...m, pwd: newPassword.trim() } : m); try { await setDoc(doc(db, "settings", "teamList"), { members: updatedTeam }, { merge: true }); alert("✅ 密碼更新成功！"); if (currentUser.id === targetId) { setCurrentUser(prev => ({ ...prev, pwd: newPassword.trim() })); setShowPwdModal(false); } } catch (err) { alert("更新失敗：" + err.message); } };

  // 收銀機與商品
  const handleAddProduct = async (e) => { e.preventDefault(); if (!newProduct.name || !newProduct.price) return; const updatedList = { ...priceList }; updatedList[newProduct.type] = [...(updatedList[newProduct.type] || []), { name: newProduct.name, price: Number(newProduct.price) }]; try { await setDoc(doc(db, "settings", "priceList"), updatedList); setNewProduct({ ...newProduct, name: '', price: '' }); alert('✅ 新增成功！'); } catch (err) { alert('新增失敗'); } };
  const handleDeleteProduct = async (type, index) => { if (!window.confirm("確定刪除？")) return; const updatedList = { ...priceList }; updatedList[type] = updatedList[type].filter((_, i) => i !== index); try { await setDoc(doc(db, "settings", "priceList"), updatedList); } catch (err) { alert('刪除失敗'); } };
  const handleAddCartItem = (name, price, qty, isBase = false) => { setCart(prev => { let newCart = [...prev]; if (isBase) newCart = newCart.filter(item => !item.isBase); const existingIdx = newCart.findIndex(item => item.name === name && item.price === Number(price)); if (existingIdx >= 0 && !isBase) { newCart[existingIdx].qty += Number(qty); } else { newCart.push({ id: Date.now() + Math.random(), name, price: Number(price), qty: Number(qty), isBase }); } return newCart; }); };
  const handleAddCustomItem = () => { if (!customItem.name || !customItem.price || customItem.qty < 1) return alert("請填完整！"); handleAddCartItem(customItem.name, customItem.price, customItem.qty); setCustomItem({ name: '', price: '', qty: 1 }); };
  const handleConfirmPayment = async () => { if (cart.length === 0) return alert('請加入商品！'); if (!calcAdvisor) return alert('⚠️ 請選擇收款人！'); try { await addDoc(collection(db, "revenueRecords"), { date: new Date().toISOString(), originalPrice: cartTotal, discount: Number(calcDiscount), finalAmount: calcFinalAmount, advisorId: calcAdvisor, items: cart }); setCart([]); setCalcDiscount('10'); alert(`✅ 收款成功！入帳金額：$${calcFinalAmount}`); setShowPOS(false); } catch (err) { alert("結帳失敗：" + err.message); } };
  const handleQuickCheckout = (appt) => { setCalcAdvisor(appt.advisorId); setCart([{ id: 'base', name: `${appt.serviceType} (${appt.name})`, price: appt.customerType === '初次預約' ? 2000 : 1600, qty: 1, isBase: true }]); setCalcDiscount('10'); setShowPOS(true); };

  // 預約與日曆操作
  const clientAvailableSlots = useMemo(() => { if (!formData.date || !formData.advisorId) return []; if (formData.advisorId === 'any') { let allAvailable = new Set(); activeAdvisors.forEach(advId => { const sched = schedules.find(s => s.advisorId === advId && s.date === formData.date); const booked = appointments.filter(a => a.advisorId === advId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots); if (sched && sched.slots) sched.slots.forEach(slot => { if (!booked.includes(slot)) allAvailable.add(slot); }); }); return Array.from(allAvailable).sort(); } else { const sched = schedules.find(s => s.advisorId === formData.advisorId && s.date === formData.date); if (!sched || !sched.slots) return []; const booked = appointments.filter(a => a.advisorId === formData.advisorId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots); return sched.slots.filter(slot => !booked.includes(slot)).sort(); } }, [formData.date, formData.advisorId, schedules, appointments, activeAdvisors]);
  const handleClientSubmit = async (e) => { e.preventDefault(); const clientMemo = customerMemos[formData.phone] || ''; if (clientMemo.includes('【黑名單】')) return setConflictError('系統無法受理線上預約，請聯繫官方 LINE。'); if (!formData.name || !formData.phone || formData.timeSlots.length === 0 || !formData.serviceType || !formData.date || !formData.advisorId) return setConflictError('請完整填寫'); let isConflict = false; if (formData.advisorId !== 'any') isConflict = formData.timeSlots.some(slot => appointments.filter(a => a.advisorId === formData.advisorId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots).includes(slot)); if (isConflict) return setConflictError('時段剛剛被預約了，請重選！'); setIsSubmitting(true); const sortedSlots = [...formData.timeSlots].sort(); const gasTime = `${sortedSlots[0].split('-')[0]}-${sortedSlots[sortedSlots.length - 1].split('-')[1]}`; const advisorName = teamMembers.find(t => t.id === formData.advisorId)?.name || '不指定顧問'; try { await addDoc(collection(db, "appointments"), { ...formData, customerType: formData.isFirstTime === 'yes' ? '初次預約' : '舊客複診', exactDisplayTime: formatTimeSlots(sortedSlots), gasTime, advisorName, status: 'confirmed', createdAt: new Date().toISOString() }); localStorage.setItem('smartRecoveryCustomer', JSON.stringify({ name: formData.name, phone: formData.phone })); setSuccessData({ name: formData.name, date: formData.date, time: formatTimeSlots(sortedSlots), service: formData.serviceType, advisor: advisorName }); setFormData({ name: '', phone: '', isFirstTime: '', advisorId: '', date: '', timeSlots: [], serviceType: '', needs: '', bodyParts: [], painLevel: 5 }); } catch (e) { setConflictError('連線錯誤'); } finally { setIsSubmitting(false); } };
  const handleCalendarSelectSlot = (slotInfo) => { const dStr = moment(slotInfo.start).format('YYYY-MM-DD'); const tStr = `${moment(slotInfo.start).format('HH:mm')}-${moment(slotInfo.end).format('HH:mm')}`; setStaffBookData({ ...staffBookData, date: dStr, time: tStr, advisorId: currentUser?.id || '' }); setShowStaffBookModal(true); };
  const handleStaffDirectSubmit = async () => { if(!staffBookData.name || !staffBookData.date || !staffBookData.time || !staffBookData.advisorId) return alert('必填欄位不可空白'); const advisorName = teamMembers.find(t => t.id === staffBookData.advisorId)?.name || '未知'; try { await addDoc(collection(db, "appointments"), { name: staffBookData.name, phone: staffBookData.phone, customerType: '舊客複診', serviceType: staffBookData.service || '客製化服務', date: staffBookData.date, timeSlots: [staffBookData.time], exactDisplayTime: staffBookData.time, advisorId: staffBookData.advisorId, advisorName, status: 'confirmed', needs: '內部代客安插', createdAt: new Date().toISOString() }); alert('後台代客預約成功！(已略過前台驗證)'); setShowStaffBookModal(false); } catch(e) { alert('寫入失敗'); } };
  const handleUpdateApptStatus = async (appt, newStatus) => { try { await setDoc(doc(db, "appointments", appt.id), { status: newStatus }, { merge: true }); } catch (error) { alert("更新失敗"); } };
  const handleDelete = async (appt) => { if (window.confirm(`確定取消 ${appt.name} 嗎？`)) { await deleteDoc(doc(db, "appointments", appt.id)); } };
  const handleSaveMemo = async () => { if (!showHistoryModal) return; try { await setDoc(doc(db, "customerMemos", showHistoryModal), { text: memoInput }, { merge: true }); alert("✅ 備忘錄儲存成功！"); } catch (e) { alert("儲存失敗：" + e.message); } };
  const handleAIGetRecommendation = async () => { if (!aiInput.trim()) return; setLoadingAi(true); const prompt = `客人狀況：「${aiInput}」。請推薦一個最適合的項目，選項：${serviceTypes.join('、')}。`; try { const res = await callGeminiAPI(prompt); setAiRec(res.trim()); } catch (e) { setAiRec("AI 忙碌中，請稍後再試。"); } finally { setLoadingAi(false); } };
  const applyAiService = () => { const matched = serviceTypes.find(s => aiRec.includes(s)); if (matched) { setFormData(prev => ({ ...prev, serviceType: matched })); alert(`✅ 套用服務：${matched}`); } };

  // 排班與分析資料
  const handleBatchAddRange = () => { if (!rangeStartDate || !rangeEndDate) return alert("請填寫區間"); let curr = new Date(rangeStartDate); const end = new Date(rangeEndDate); const added = []; while (curr <= end) { const dStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`; if (dStr !== scheduleDate && !additionalDates.includes(dStr)) added.push(dStr); curr.setDate(curr.getDate() + 1); } setAdditionalDates(prev => [...prev, ...added].sort()); setRangeStartDate(''); setRangeEndDate(''); };
  const handleSaveSchedule = async () => { setIsSavingSchedule(true); try { const batch = writeBatch(db); [scheduleDate, ...additionalDates].forEach(date => { const ref = doc(db, "schedules", `${scheduleAdvisorId}_${date}`); if (selectedSlots.length === 0) batch.delete(ref); else batch.set(ref, { advisorId: scheduleAdvisorId, date, slots: selectedSlots }); }); await batch.commit(); alert(`✅ 套用至 ${1 + additionalDates.length} 個日期！`); setAdditionalDates([]); } catch (err) { alert("失敗：" + err.message); } setIsSavingSchedule(false); };
  
  const analyticsData = useMemo(() => {
    if (!currentUser || currentUser.role !== 'admin') return null;
    let kpi = { total: 0, new: 0, return: 0, totalHours: 0 }; let advisorStats = {};
    appointments.forEach(appt => {
      if (appt.date && appt.date.startsWith(selectedMonth) && appt.status !== '已取消') {
        if (!selectedAnalyticsAdvisors.includes(appt.advisorId)) return;
        kpi.total++; if (appt.customerType === '初次預約') kpi.new++; else kpi.return++;
        const aid = appt.advisorId || 'any'; if (!advisorStats[aid]) advisorStats[aid] = { count: 0, hours: 0 };
        advisorStats[aid].count += 1; advisorStats[aid].hours += (appt.timeSlots ? appt.timeSlots.length : 1) * 0.5;
        kpi.totalHours += (appt.timeSlots ? appt.timeSlots.length : 1) * 0.5;
      }
    });
    return { kpi, advisorStats };
  }, [appointments, selectedMonth, selectedAnalyticsAdvisors, currentUser]);

return (
    <div className="min-h-screen bg-[#192039] p-4 md:p-8 flex flex-col font-sans relative">
      <button onClick={() => setShowLoginModal(true)} className="fixed top-4 left-4 z-50 p-2 bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"><Settings size={20} /></button>
      
      {showLoginModal && (
        <div className="fixed inset-0 bg-[#192039]/90 backdrop-blur flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <button type="button" onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h2 className="text-xl font-bold text-center mb-6">管理員入口</h2>
            <select value={loginForm.account} onChange={e => setLoginForm({ ...loginForm, account: e.target.value })} className="w-full p-3 bg-slate-50 border rounded-xl mb-4 font-bold">
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full p-3 bg-slate-50 border rounded-xl mb-4" placeholder="密碼" />
            <button type="submit" className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-3 rounded-xl">登入系統</button>
          </form>
        </div>
      )}

      {/* 原版 POS 收銀機還原 */}
      {showPOS && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex justify-center items-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-4xl shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <button onClick={() => setShowPOS(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
            <h4 className="text-xl font-bold text-slate-700 mb-6 border-b pb-4">結帳明細計算機</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">服務快捷鍵 (點擊將自動覆蓋原服務)</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {priceList.services?.map(s => (
                      <button key={s.name} onClick={() => handleAddCartItem(s.name, s.price, 1, true)} className="bg-[#9aa486] text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm">{s.name} (${s.price})</button>
                    ))}
                  </div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">周邊商品與加價購 (點擊可自動累加)</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {priceList.addons?.map(a => (
                      <button key={a.name} onClick={() => handleAddCartItem(a.name, a.price, 1)} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm">+ {a.name} (${a.price})</button>
                    ))}
                  </div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">自訂商品新增</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="商品名稱" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
                    <input type="number" placeholder="單價$" value={customItem.price} onChange={e => setCustomItem({...customItem, price: e.target.value})} className="w-20 p-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
                    <input type="number" min="1" placeholder="數量" value={customItem.qty} onChange={e => setCustomItem({...customItem, qty: e.target.value})} className="w-16 p-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
                    <button onClick={handleAddCustomItem} className="bg-blue-500 text-white px-4 rounded-lg font-bold text-sm">加入</button>
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <label className="block text-sm font-bold text-amber-800 mb-2">🧑‍⚕️ 本次收款人 (必選)</label>
                  <select value={calcAdvisor} onChange={(e) => setCalcAdvisor(e.target.value)} className="w-full text-lg p-3 border border-amber-300 rounded-lg font-bold outline-none bg-white">
                    <option value="" disabled>請選擇是誰收的錢...</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">折扣 (10 代表不打折，8.5 代表 85折)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.1" value={calcDiscount} onChange={(e) => setCalcDiscount(e.target.value)} className="w-full text-2xl p-4 border border-slate-300 rounded-xl text-right font-bold outline-none" />
                    <span className="text-2xl font-bold text-slate-600 whitespace-nowrap">折</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col h-full min-h-[400px]">
                <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-200 pb-3 flex justify-between items-center"><span className="flex items-center gap-2">🧾 購物車明細</span><button onClick={() => setCart([])} className="text-xs text-rose-500 hover:underline">清空</button></h4>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                  {cart.length === 0 && <p className="text-slate-400 text-sm text-center py-10">無加入項目</p>}
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex flex-col"><span className="font-bold text-sm text-slate-800">{item.name}</span><span className="text-xs text-slate-500">${item.price} x {item.qty}</span></div>
                      <div className="flex items-center gap-3"><span className="font-bold text-slate-700">${item.price * item.qty}</span><button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-rose-400 p-1 bg-rose-50 rounded-md"><Trash size={14}/></button></div>
                    </div>
                  ))}
                </div>
                <div className="border-t-2 border-slate-200 pt-5 mt-auto">
                  <div className="flex justify-between items-center mb-3 text-slate-500 font-bold"><span>小計 (原價)：</span><span className="text-lg">${cartTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between items-end mb-6"><span className="text-slate-600 font-bold text-xl">最終應收：</span><span className="text-5xl font-bold text-rose-600">${calcFinalAmount.toLocaleString()}</span></div>
                  <button onClick={handleConfirmPayment} className="w-full bg-[#9aa486] hover:bg-[#868f74] text-white text-3xl font-bold py-6 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-3">💵 確認收款</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStaffBookModal && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <h3 className="font-bold text-lg mb-4 border-b pb-2">代客安插預約 (點選日曆寫入)</h3>
            <div className="space-y-3">
              <input type="text" placeholder="客戶姓名" value={staffBookData.name} onChange={e=>setStaffBookData({...staffBookData, name: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="text" placeholder="聯絡電話" value={staffBookData.phone} onChange={e=>setStaffBookData({...staffBookData, phone: e.target.value})} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-2">
                <input type="date" value={staffBookData.date} onChange={e=>setStaffBookData({...staffBookData, date: e.target.value})} className="w-full p-3 border rounded-xl" />
                <input type="text" placeholder="時段 (例: 10:00-10:30)" value={staffBookData.time} onChange={e=>setStaffBookData({...staffBookData, time: e.target.value})} className="w-full p-3 border rounded-xl" />
              </div>
              <select value={staffBookData.advisorId} onChange={e=>setStaffBookData({...staffBookData, advisorId: e.target.value})} className="w-full p-3 border rounded-xl"><option value="">指定顧問</option>{teamMembers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <div className="flex gap-2 pt-4">
                <button onClick={()=>setShowStaffBookModal(false)} className="flex-1 bg-slate-100 p-3 rounded-xl font-bold">取消</button>
                <button onClick={handleStaffDirectSubmit} className="flex-1 bg-[#192039] text-[#e3b5a1] p-3 rounded-xl font-bold">強制寫入</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentUser ? (
        <AdminLayout currentUser={currentUser} onLogout={() => setCurrentUser(null)} currentTab={adminTab} setCurrentTab={setAdminTab}>
          
          {/* ================= 戰情室列表 ================= */}
          {adminTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm mb-6 border">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><List className="text-[#9aa486]" /> 預約戰情室</h2>
                <div className="flex gap-2 items-center">
                  <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={()=>setApptFilter('today')} className={`px-4 py-1.5 rounded-md text-sm font-bold ${apptFilter==='today'?'bg-white shadow':''}`}>今日</button>
                    <button onClick={()=>setApptFilter('upcoming')} className={`px-4 py-1.5 rounded-md text-sm font-bold ${apptFilter==='upcoming'?'bg-white shadow':''}`}>未來</button>
                  </div>
                  <button onClick={() => setShowPOS(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"><DollarSign size={18}/> POS收銀</button>
                </div>
              </div>
              <div className="grid gap-4">
                {appointments.filter(a => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  if(apptFilter==='today') return a.date === todayStr && a.status !== '已取消';
                  if(apptFilter==='upcoming') return a.date > todayStr && a.status !== '已取消';
                  return true;
                }).map(appt => (
                  <div key={appt.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-[#9aa486] flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg text-slate-800">{appt.name}</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-600">{appt.customerType}</span>
                        <span className="bg-[#192039] text-[#e3b5a1] px-2 py-1 rounded text-xs font-bold">{appt.date} {appt.exactDisplayTime}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-500">{appt.serviceType} | 顧問: {appt.advisorName}</div>
                      {appt.needs && <div className="text-xs bg-slate-50 p-2 mt-2 rounded border text-slate-600">備註：{appt.needs}</div>}
                    </div>
                    <div className="flex gap-2 items-center h-fit">
                      <button onClick={() => handleUpdateApptStatus(appt, '已取消')} className="px-3 py-2 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors">取消</button>
                      <button onClick={() => handleUpdateApptStatus(appt, '已完成')} className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">完成</button>
                      <button onClick={() => handleQuickCheckout(appt)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 shadow-sm"><DollarSign size={16}/> 結帳</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 日曆視圖 ================= */}
          {adminTab === 'calendar' && <AdminCalendarView appointments={appointments} onSelectSlot={handleCalendarSelectSlot} onSelectEvent={(e) => handleQuickCheckout(e.resource)} />}

          {/* ================= 顧問排班 ================= */}
          {adminTab === 'schedule' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border h-full">
              <h3 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2"><Clock className="text-[#9aa486]" /> 顧問排班設定</h3>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <select value={scheduleAdvisorId} onChange={e => setScheduleAdvisorId(e.target.value)} className="p-3 border rounded-xl flex-1 font-bold outline-none">
                  <option value="">選擇顧問...</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="p-3 border rounded-xl font-bold outline-none flex-1" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {ALL_TIME_SLOTS.map(slot => {
                  const isSelected = selectedSlots.includes(slot);
                  return <button key={slot} onClick={() => setSelectedSlots(prev => isSelected ? prev.filter(s=>s!==slot) : [...prev, slot])} className={`py-2 rounded-xl text-[13px] font-bold border ${isSelected ? 'bg-[#9aa486] text-white border-[#9aa486]' : 'bg-slate-50 text-slate-500 hover:border-[#9aa486]'}`}>{slot}</button>;
                })}
              </div>
              <button onClick={handleSaveSchedule} className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-4 rounded-xl shadow-md">儲存排班</button>
            </div>
          )}

          {/* ================= 營收報表 ================= */}
          {adminTab === 'analytics' && currentUser.role === 'admin' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><BarChart className="text-indigo-600" /> 營業營收儀表板</h3>
              <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="p-3 border rounded-xl font-bold w-48">{availableMonths.map(m=><option key={m} value={m}>{m} 月份</option>)}</select>
              {analyticsData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#192039] p-5 rounded-2xl shadow-sm text-center"><p className="text-[#e3b5a1] text-xs font-bold mb-1">預估產值</p><h2 className="text-2xl font-extrabold text-white">${(analyticsData.kpi.totalHours * SESSION_PRICE).toLocaleString()}</h2></div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border text-center"><p className="text-slate-500 text-xs font-bold mb-1">接單數</p><h2 className="text-2xl font-extrabold text-[#192039]">{analyticsData.kpi.total}</h2></div>
                  <div className="bg-blue-50 p-5 rounded-2xl shadow-sm border text-center"><p className="text-blue-600 text-xs font-bold mb-1">工時 (hr)</p><h2 className="text-2xl font-extrabold text-[#192039]">{analyticsData.kpi.totalHours}</h2></div>
                  <div className="bg-amber-50 p-5 rounded-2xl shadow-sm border text-center"><p className="text-amber-600 text-xs font-bold mb-1">新舊客</p><h2 className="text-lg font-extrabold text-amber-700 mt-2">新{analyticsData.kpi.new} 舊{analyticsData.kpi.return}</h2></div>
                </div>
              )}
            </div>
          )}

          {/* ================= 團隊管理 ================= */}
          {adminTab === 'team' && currentUser.role === 'admin' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Users className="text-[#9aa486]" /> 團隊管理</h3>
              <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b"><th className="pb-3 font-bold">顯示名稱</th><th className="pb-3 font-bold">帳號</th><th className="pb-3 font-bold">密碼</th><th className="pb-3 font-bold">角色</th></tr></thead>
                  <tbody>
                    {teamMembers.map(m => (
                      <tr key={m.id} className="border-b border-slate-100">
                        <td className="py-3 font-bold">{m.name}</td><td className="py-3 text-slate-500">{m.id}</td>
                        <td className="py-3 text-slate-500"><button onClick={()=>handleUpdatePassword(m.id, window.prompt('新密碼', m.pwd))} className="flex items-center gap-2 hover:text-indigo-600">{m.pwd} <Edit2 size={12}/></button></td>
                        <td className="py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{m.role}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 商品設定 ================= */}
          {adminTab === 'prices' && currentUser.role === 'admin' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><ShoppingBag className="text-[#9aa486]" /> 商品價目設定</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div><h4 className="font-bold mb-3 border-b pb-2">基礎服務</h4><ul className="space-y-2">{priceList.services?.map((item, i) => <li key={i} className="flex justify-between bg-slate-50 p-3 rounded-xl border"><span>{item.name}</span><span className="font-bold">${item.price}</span></li>)}</ul></div>
                <div><h4 className="font-bold mb-3 border-b pb-2">加價購周邊</h4><ul className="space-y-2">{priceList.addons?.map((item, i) => <li key={i} className="flex justify-between bg-slate-50 p-3 rounded-xl border"><span>{item.name}</span><span className="font-bold">${item.price}</span></li>)}</ul></div>
              </div>
              <form onSubmit={handleAddProduct} className="flex gap-3 pt-6 border-t"><select value={newProduct.type} onChange={e=>setNewProduct({...newProduct,type:e.target.value})} className="p-2.5 border rounded-lg"><option value="services">基礎服務</option><option value="addons">加價周邊</option></select><input type="text" placeholder="商品名稱" required value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})} className="flex-1 p-2.5 border rounded-lg"/><input type="number" placeholder="價格$" required value={newProduct.price} onChange={e=>setNewProduct({...newProduct,price:e.target.value})} className="w-24 p-2.5 border rounded-lg"/><button type="submit" className="bg-[#192039] text-[#e3b5a1] font-bold px-4 rounded-lg">新增</button></form>
            </div>
          )}

          {/* ================= 黑名單 ================= */}
          {adminTab === 'blacklist' && currentUser.role === 'admin' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="text-xl font-bold flex items-center gap-2 text-rose-500 mb-4"><ShieldAlert /> 黑名單管理</h3>
              <p className="text-slate-500 text-sm mb-4">被列入此名單的客戶將無法透過前台預約。</p>
              <div className="space-y-3">
                {Object.entries(customerMemos).filter(([_, memo])=>memo.includes('【黑名單】')).map(([phone, memo], i) => (
                  <div key={i} className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <p className="font-bold text-slate-800">{phone}</p><p className="text-sm text-slate-600 mt-1">原因：{memo.replace('【黑名單】', '')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </AdminLayout>
      ) : (
        /* ================= 前台客戶預約介面 ================= */
        <>
          <header className="flex flex-col items-center justify-center gap-4 text-center mb-8 pt-4 z-10 relative">
            <div className="w-32 h-32 rounded-full p-[3px] bg-gradient-to-b from-[#e3b5a1] to-[#9aa486] flex items-center justify-center shadow-lg"><div className="w-full h-full rounded-full bg-[#12182c] flex items-center justify-center p-1.5"><img src="/logo.png" alt="智理運動恢復" className="w-[85%] h-[85%] object-contain" onError={(e) => { e.target.style.display = 'none'; }} /></div></div>
            <h1 className="text-3xl font-extrabold tracking-widest text-white">智理運動恢復</h1>
          </header>

          <div className="max-w-xl mx-auto w-full space-y-6 z-10 relative">
            {successData ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-xl">
                <CheckCircle size={48} className="text-[#9aa486] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#192039] mb-2">預約申請已送出！</h2>
                <p className="text-slate-500 mb-6 text-sm">請透過下方按鈕加入 LINE，我們將由專人為您確認保留。</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-left space-y-2">
                  <p className="text-sm"><strong>預約姓名：</strong> {successData.name}</p>
                  <p className="text-sm"><strong>預約項目：</strong> {successData.service}</p>
                  <p className="text-sm text-[#9aa486] font-bold"><strong>預約時間：</strong> {successData.date} {successData.time}</p>
                </div>
                <button onClick={() => setSuccessData(null)} className="text-sm text-slate-400 underline">返回首頁</button>
              </div>
            ) : (
              <form onSubmit={handleClientSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
                <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-4 text-[#192039]"><CalendarIcon className="text-[#9aa486]"/> 快速線上預約</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="姓名 *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required />
                  <input type="tel" placeholder="電話 *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setFormData({...formData, isFirstTime: 'yes'})} className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${formData.isFirstTime === 'yes' ? 'bg-[#192039] text-[#e3b5a1] border-[#192039]' : 'bg-white text-slate-600'}`}>初次預約</button>
                  <button type="button" onClick={() => setFormData({...formData, isFirstTime: 'no'})} className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${formData.isFirstTime === 'no' ? 'bg-[#192039] text-[#e3b5a1] border-[#192039]' : 'bg-white text-slate-600'}`}>舊客回診</button>
                </div>
                <select value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required><option value="" disabled>請選擇預約項目 *</option>{serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <select value={formData.advisorId} onChange={e => setFormData({...formData, advisorId: e.target.value, timeSlots: []})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required><option value="" disabled>指定顧問 *</option><option value="any" className="font-bold text-[#9aa486]">✨ 不指定顧問 (安排最快時段)</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value, timeSlots: []})} min={new Date().toISOString().split('T')[0]} className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required />
                
                {formData.date && formData.advisorId && (
                  <div className="grid grid-cols-3 gap-2">
                    {clientAvailableSlots.length === 0 ? <p className="col-span-3 text-center text-rose-400 text-sm py-4 bg-rose-50 rounded-xl">該日無可預約空檔</p> : clientAvailableSlots.map(slot => (
                      <button type="button" key={slot} onClick={() => setFormData({...formData, timeSlots: formData.timeSlots.includes(slot) ? formData.timeSlots.filter(s=>s!==slot) : [...formData.timeSlots, slot]})} className={`py-2 border rounded-lg text-sm font-bold transition-colors ${formData.timeSlots.includes(slot) ? 'bg-[#9aa486] text-white border-[#9aa486]' : 'bg-white text-slate-600 hover:border-slate-300'}`}>{slot}</button>
                    ))}
                  </div>
                )}
                {conflictError && <p className="text-rose-500 font-bold text-sm bg-rose-50 p-3 rounded-lg">{conflictError}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-4 rounded-xl mt-4 shadow-lg active:scale-95 transition-transform disabled:opacity-70">確認送出預約</button>
              </form>
            )}
          </div>
          <BrandFooter />
        </>
      )}
    </div>
  );
}
