import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, User, Clock, Activity, Trash, PlusCircle, CheckCircle, AlertCircle, MessageCircle, MessageSquare, Clipboard, Lock, Users, LogOut, Key, Copy, Plus, List, Sun, Moon, Settings, Phone, Check, Filter, BarChart, Star, Crown, Bot, Sparkles, RefreshCw, DollarSign, Download, CalendarPlus, Inbox, AlertTriangle, FileText, UserPlus, Edit2, ShieldAlert, ShoppingBag, Menu, X, LayoutGrid } from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, setDoc, onSnapshot, query, writeBatch } from "firebase/firestore";

// Firebase 初始化防護
let firebaseConfig = {
  apiKey: "AIzaSyB86wjSD0jdCPeOY_7XJBCU9_tWzpbdGFk",
  authDomain: "smart-recovery-9ec63.firebaseapp.com",
  projectId: "smart-recovery-9ec63",
  storageBucket: "smart-recovery-9ec63.firebasestorage.app",
  messagingSenderId: "886544028489",
  appId: "1:886544028489:web:72fcbd4a3235a0ba08c098"
};

try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
  }
} catch (e) { }

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz44rH6SVbcFQPUkdoxB7GVyeFuhZ-eO2lKqpYvFI-xDKHs1TP6eeV8HMLy5roCBIGyEQ/exec";

// 常數與預設資料
const SESSION_PRICE = 1600;
const BODY_PARTS = ['肩頸', '上背/下背', '骨盆/髖', '大腿', '膝蓋', '小腿/腳踝', '手臂/手腕'];
const TAG_OPTIONS = ['⭐ VIP', '⚠️ 常遲到', '💪 怕痛', '🤰 孕婦', '🤫 需要安靜', '常客', '需輕柔', '健談', '奧客'];

const DEFAULT_TEAM = [
  { id: 'ted', name: 'Ted (執行長)', pwd: 'pt', role: 'admin' },
  { id: 'jerry', name: 'Jerry (恢復顧問)', pwd: 'jerry123', role: 'advisor' },
  { id: 'amy', name: 'Amy (恢復顧問)', pwd: 'amy123', role: 'advisor' }
];

const serviceTypes = [
  "運動後疲勞恢復", "深層肌肉與筋膜放鬆", "動作控制與體態調整",
  "銀髮族活動力促進", "專項運動表現優化", "日常肌力與體能訓練",
  "身體大保養", "其他（詳情請打在備註）"
];

// 時間段產生器 (修改為 09:00 - 22:30)
const generateAllSlots = () => {
  const slots = [];
  for (let h = 9; h <= 22; h++) {
    if (h === 22) {
      slots.push(`22:00-22:30`);
    } else {
      slots.push(`${h}:00-${h}:30`);
      slots.push(`${h}:30-${h + 1}:00`);
    }
  }
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
    if (currentEnd === nextStart) { currentEnd = nextEnd; }
    else { merged.push(`${currentStart}-${currentEnd}`); currentStart = nextStart; currentEnd = nextEnd; }
  }
  merged.push(`${currentStart}-${currentEnd}`); return merged.join(', ');
};

const generateGoogleCalendarLink = (dateStr, timeStr, service, advisor) => {
  if (!dateStr || !timeStr) return '#';
  try {
    const startTime = timeStr.split('-')[0].replace(':', ''), endTime = timeStr.split('-')[1].replace(':', '');
    const cleanDate = dateStr.replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Smart Recovery: ${service}`)}&dates=${cleanDate}T${startTime}00/${cleanDate}T${endTime}00&details=${encodeURIComponent(`顧問: ${advisor}`)}`;
  } catch (e) { return '#'; }
};

const getDayLabel = (dateStr) => {
  const d = new Date(dateStr); const days = ['日', '一', '二', '三', '四', '五', '六'];
  return { date: `${d.getMonth() + 1}/${d.getDate()}`, weekday: days[d.getDay()] };
};

// 品牌聯絡資訊組件
const BrandFooter = () => (
  <footer className="w-full text-center px-4 py-8 text-xs text-white/40 relative z-10 space-y-1">
    <p>© 2026 Smart Recovery</p>
    <p>官方聯絡信箱：smartrecovery.studio@gmail.com</p>
    <p>服務預約：請透過上方 LINE 官方帳號</p>
  </footer>
);

async function callGeminiAPI(prompt, retries = 3, delay = 1000) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (response.ok) { const data = await response.json(); return data.candidates[0].content.parts[0].text; }
      if (response.status === 503) {
        if (i === retries - 1) throw new Error("Google 伺服器持續忙碌中，請稍後再試。");
        await new Promise(resolve => setTimeout(resolve, delay)); delay *= 2; continue;
      }
      const errorData = await response.json(); throw new Error(`API 錯誤: ${response.status}`);
    } catch (error) { if (i === retries - 1) throw error; }
  }
}

// ==============================================
// 🚀 核心 App 元件開始
// ==============================================
export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [customerMemos, setCustomerMemos] = useState({});

  // 團隊管理與身分驗證
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM);
  const [activeAdvisors, setActiveAdvisors] = useState(DEFAULT_TEAM.map(m => m.id));
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ account: 'ted', password: '' });
  
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetForm, setResetForm] = useState({ account: 'jerry', authCode: '', newPwd: '' });
  
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [userNewPwd, setUserNewPwd] = useState('');
  const [appMode, setAppMode] = useState('booking'); // 前台: 'booking', 'tracking'

  // Modal 彈出視窗與表單管理
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [memoInput, setMemoInput] = useState('');
  const [rebookCustomer, setRebookCustomer] = useState({ name: "", phone: "" });
  const [rebookFormData, setRebookFormData] = useState({ date: "", time: "", service: "", consultant: "" });

  const getSavedCustomer = () => {
    try { const saved = localStorage.getItem('smartRecoveryCustomer'); return saved ? JSON.parse(saved) : { name: '', phone: '' }; }
    catch { return { name: '', phone: '' }; }
  };
  const savedInfo = getSavedCustomer();

  const [formData, setFormData] = useState({
    name: savedInfo.name, phone: savedInfo.phone, isFirstTime: '', advisorId: '', date: '', timeSlots: [], serviceType: '', needs: '',
    painLevel: 5, bodyParts: []
  });

  const [conflictError, setConflictError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 後台專用狀態
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminTab, setAdminTab] = useState('appointments');
  const [adminViewMode, setAdminViewMode] = useState('list'); // 'list' 或 'calendar'
  const [adminSelectedDate, setAdminSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newAdvisor, setNewAdvisor] = useState({ id: '', name: '', pwd: '', role: 'advisor' });

  // 查詢功能
  const [clientSearchPhone, setClientSearchPhone] = useState('');
  const [clientAppts, setClientAppts] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 排班管理
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleAdvisorId, setScheduleAdvisorId] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [additionalDates, setAdditionalDates] = useState([]);
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // 數據與後台視角
  const [apptFilter, setApptFilter] = useState('today');
  const [adminViewAdvisor, setAdminViewAdvisor] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedAnalyticsAdvisors, setSelectedAnalyticsAdvisors] = useState(DEFAULT_TEAM.map(m => m.id));

  // === 結帳機 (POS) 與 商品價目狀態 ===
  const [showPOS, setShowPOS] = useState(false);
  const [cart, setCart] = useState([]);
  const [customItem, setCustomItem] = useState({ name: '', price: '', qty: 1 });
  const [calcDiscount, setCalcDiscount] = useState('10');
  const [calcAdvisor, setCalcAdvisor] = useState('');
  const [revenueRecords, setRevenueRecords] = useState([]);
  
  // 價目表設定狀態
  const [priceList, setPriceList] = useState({ services: [], addons: [] });
  const [newProduct, setNewProduct] = useState({ type: 'services', name: '', price: '' });

  // 衍生的購物車總計計算
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const calcFinalAmount = Math.round(cartTotal * (Number(calcDiscount) || 10) / 10);

  // AI 顧問
  const [aiInput, setAiInput] = useState('');
  const [aiRec, setAiRec] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [adviceMap, setAdviceMap] = useState({});

// Memo 計算與資料派生
  const next28Days = useMemo(() => {
    const days = []; const today = new Date();
    for (let i = 1; i <= 28; i++) {
      const nextDay = new Date(today); nextDay.setDate(today.getDate() + i); days.push(nextDay.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set(appointments.map(a => a.date ? a.date.substring(0, 7) : null).filter(Boolean));
    const monthArray = Array.from(months).sort().reverse();
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (!monthArray.includes(currentMonth)) monthArray.unshift(currentMonth);
    return monthArray;
  }, [appointments]);

  // Firebase 監聽器
  useEffect(() => {
    const isLineApp = navigator.userAgent.includes('Line');
    const hasExternalParam = window.location.search.includes('openExternalBrowser=1');
    if (isLineApp && !hasExternalParam) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('openExternalBrowser', '1');
      window.location.href = newUrl.toString();
    }

    const unsubAppt = onSnapshot(query(collection(db, "appointments")), (snapshot) => {
      const appts = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const slotsArray = data.timeSlots || (data.timeSlot ? [data.timeSlot] : []);
        appts.push({ id: doc.id, ...data, timeSlots: slotsArray });
      });
      appts.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        const timeA = a.timeSlots && a.timeSlots[0] ? new Date(`${a.date}T${a.timeSlots[0].split('-')[0]}`) : new Date(`${a.date}T00:00`);
        const timeB = b.timeSlots && b.timeSlots[0] ? new Date(`${b.date}T${b.timeSlots[0].split('-')[0]}`) : new Date(`${b.date}T00:00`);
        return timeA.getTime() - timeB.getTime();
      });
      setAppointments(appts);
    });

    const unsubSched = onSnapshot(query(collection(db, "schedules")), (snapshot) => {
      const scheds = [];
      snapshot.forEach(doc => scheds.push({ id: doc.id, ...doc.data() }));
      setSchedules(scheds);
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "teamConfig"), (docSnap) => {
      if (docSnap.exists()) setActiveAdvisors(docSnap.data().activeIds || []);
    });

    const unsubMemos = onSnapshot(query(collection(db, "customerMemos")), (snapshot) => {
      const memos = {};
      snapshot.forEach(doc => { memos[doc.id] = doc.data().text; });
      setCustomerMemos(memos);
    });

    const unsubTeam = onSnapshot(doc(db, "settings", "teamList"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().members) { setTeamMembers(docSnap.data().members); }
      else { setDoc(doc(db, "settings", "teamList"), { members: DEFAULT_TEAM }); }
    });

    const unsubRevenue = onSnapshot(query(collection(db, "revenueRecords")), (snapshot) => {
      const records = [];
      snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
      setRevenueRecords(records);
    });

    const unsubPriceList = onSnapshot(doc(db, "settings", "priceList"), (docSnap) => {
      if (docSnap.exists()) { setPriceList(docSnap.data()); } 
      else {
        const defaultList = {
          services: [{ name: '標準單堂', price: 1600 }, { name: '初次評估', price: 2000 }],
          addons: [{ name: '加時半小', price: 800 }, { name: '專業肌貼', price: 150 }]
        };
        setDoc(doc(db, "settings", "priceList"), defaultList);
        setPriceList(defaultList);
      }
    });

    return () => { unsubAppt(); unsubSched(); unsubSettings(); unsubMemos(); unsubTeam(); unsubRevenue(); unsubPriceList(); };
  }, []);

  useEffect(() => { setSelectedAnalyticsAdvisors(teamMembers.map(m => m.id)); }, [teamMembers]);

  useEffect(() => {
    if (scheduleAdvisorId && scheduleDate) {
      const existing = schedules.find(s => s.advisorId === scheduleAdvisorId && s.date === scheduleDate);
      setSelectedSlots(existing ? existing.slots : []); setAdditionalDates([]);
    }
  }, [scheduleAdvisorId, scheduleDate, schedules]);

const handleLogin = (e) => {
    e.preventDefault();
    const user = teamMembers.find(u => u.id === loginForm.account && u.pwd === loginForm.password);
    if (user) {
      setCurrentUser(user); setScheduleAdvisorId(user.id); setShowLoginModal(false);
      setLoginForm({ account: teamMembers[0]?.id || 'ted', password: '' }); setApptFilter('today'); setAdminViewAdvisor('all');
    } else { alert("密碼錯誤！請重新輸入。"); }
  };

  const handleLogout = () => { setCurrentUser(null); setAdminTab('appointments'); setAdditionalDates([]); setRangeStartDate(''); setRangeEndDate(''); };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetForm.authCode !== '950901') return alert("⚠️ 授權碼錯誤，請聯繫 Ted 執行長！");
    const updatedTeam = teamMembers.map(m => m.id === resetForm.account ? { ...m, pwd: resetForm.newPwd } : m);
    try {
      await setDoc(doc(db, "settings", "teamList"), { members: updatedTeam }, { merge: true });
      alert("✅ 密碼已重設成功！"); setShowResetPwdModal(false); setResetForm({ account: 'jerry', authCode: '', newPwd: '' });
    } catch (err) { alert("重設失敗：" + err.message); }
  };

  const handleUpdatePassword = async (targetId, newPassword) => {
    if (!newPassword.trim()) return alert("密碼不能為空！");
    const updatedTeam = teamMembers.map(m => m.id === targetId ? { ...m, pwd: newPassword.trim() } : m);
    try {
      await setDoc(doc(db, "settings", "teamList"), { members: updatedTeam }, { merge: true });
      alert("✅ 密碼更新成功！");
      if (currentUser.id === targetId) { setCurrentUser(prev => ({ ...prev, pwd: newPassword.trim() })); setShowPwdModal(false); setUserNewPwd(''); }
    } catch (err) { alert("密碼更新失敗：" + err.message); }
  };

  const exportToGoogleSheets = async () => {
    if (revenueRecords.length === 0) return alert('目前沒有任何營收紀錄可匯出！');
    try {
      alert('正在傳送資料至 Google Sheets...');
      await fetch(WEBHOOK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "export", data: revenueRecords }) });
      alert('✅ 匯出請求已送出，請至你的 Google Sheets 查看！');
    } catch (e) { alert('匯出失敗，請檢查網路連線。'); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    const updatedList = { ...priceList };
    updatedList[newProduct.type] = [...(updatedList[newProduct.type] || []), { name: newProduct.name, price: Number(newProduct.price) }];
    try {
      await setDoc(doc(db, "settings", "priceList"), updatedList);
      setNewProduct({ ...newProduct, name: '', price: '' }); alert('✅ 商品新增成功！');
    } catch (err) { alert('新增失敗: ' + err.message); }
  };

  const handleDeleteProduct = async (type, index) => {
    if (!window.confirm("確定要刪除這個項目嗎？")) return;
    const updatedList = { ...priceList };
    updatedList[type] = updatedList[type].filter((_, i) => i !== index);
    try { await setDoc(doc(db, "settings", "priceList"), updatedList); } catch (err) { alert('刪除失敗'); }
  };

  const handleAddCartItem = (name, price, qty, isBase = false) => {
    setCart(prev => {
      let newCart = [...prev];
      if (isBase) newCart = newCart.filter(item => !item.isBase); 
      const existingIdx = newCart.findIndex(item => item.name === name && item.price === Number(price));
      if (existingIdx >= 0 && !isBase) { newCart[existingIdx].qty += Number(qty); } 
      else { newCart.push({ id: Date.now() + Math.random(), name, price: Number(price), qty: Number(qty), isBase }); }
      return newCart;
    });
  };

  const handleAddCustomItem = () => {
    if (!customItem.name || !customItem.price || customItem.qty < 1) return alert("請填寫完整的自訂商品名稱、單價與數量！");
    handleAddCartItem(customItem.name, customItem.price, customItem.qty);
    setCustomItem({ name: '', price: '', qty: 1 });
  };

  const handleConfirmPayment = async () => {
    if (cart.length === 0 || cartTotal <= 0) return alert('請先加入商品或服務項目！');
    if (!calcAdvisor) return alert('⚠️ 請先選擇「本次收款人」是誰，才能結帳喔！');
    const newRecord = { date: new Date().toISOString(), originalPrice: cartTotal, discount: Number(calcDiscount), finalAmount: calcFinalAmount, advisorId: calcAdvisor, items: cart };
    try {
      await addDoc(collection(db, "revenueRecords"), newRecord);
      setCart([]); setCalcDiscount('10');
      const advisorName = teamMembers.find(m => m.id === calcAdvisor)?.name || '未知';
      alert(`✅ 收款成功！已自動存入雲端\n經手人：${advisorName}\n入帳金額：$${calcFinalAmount} 元`);
      setShowPOS(false);
    } catch (err) { alert("結帳失敗，請檢查網路：" + err.message); }
  };

  const handleQuickCheckout = (appt) => {
    setCalcAdvisor(appt.advisorId);
    let basePrice = 1600;
    if (appt.customerType === '初次預約') basePrice = 2000;
    if (appt.timeSlots && appt.timeSlots.length > 2) basePrice += 800 * (appt.timeSlots.length - 2);
    setCart([{ id: 'base', name: `${appt.serviceType || '服務'} (${appt.name})`, price: basePrice, qty: 1, isBase: true }]);
    setCalcDiscount('10'); setShowPOS(true);
  };

  // 其餘 CRUD 與 AI 邏輯 (為節省空間，沿用原本的 handleSubmit, handleDelete, AI 等邏輯)
  // ...包含 handleUpdateApptStatus, handleSubmit, handleDelete, handleAIGetRecommendation, etc.
  // ...這部分邏輯不變，直接沿用你原先的設定
const getFilteredAppointments = () => {
    let rawList = appointments;
    if (currentUser?.role === 'admin' && adminViewAdvisor !== 'all') rawList = appointments.filter(a => a.advisorId === adminViewAdvisor);
    else if (currentUser?.role !== 'admin') rawList = appointments.filter(a => a.advisorId === currentUser?.id);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return rawList.filter(appt => {
      if (!appt.date) return false;
      if (apptFilter === 'today') return appt.date === todayStr && appt.status !== '已完成' && appt.status !== '已取消';
      if (apptFilter === 'upcoming') return appt.date > todayStr && appt.status !== '已完成' && appt.status !== '已取消';
      if (apptFilter === 'past') return appt.date < todayStr || appt.status === '已完成' || appt.status === '已取消';
      return true;
    });
  };
  const displayAppointments = getFilteredAppointments();

  // (此處省略部分 Memo 如 analyticsData，請保留原代碼)

  return (
    <div className="min-h-screen bg-[#192039] font-sans text-slate-800 selection:bg-[#e3b5a1] selection:text-[#192039] flex flex-col relative overflow-hidden">
      
      {/* 浮動按鈕區 */}
      <button onClick={() => !currentUser ? setShowLoginModal(true) : handleLogout()} className="fixed top-4 right-4 z-50 p-2.5 bg-[#12182c]/80 backdrop-blur-md rounded-full text-white/50 hover:text-[#e3b5a1] border border-white/10 transition-all shadow-md" title={currentUser ? "登出" : "管理員入口"}>
        {currentUser ? <LogOut size={20} /> : <Settings size={20} />}
      </button>

      {/* POS 快捷鈕移至右下角，避免阻擋左側選單 */}
      {currentUser && (
        <button onClick={() => setShowPOS(true)} className="fixed bottom-6 right-6 z-[100] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-5 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.4)] flex items-center gap-2 transition-all active:scale-95">
          <DollarSign size={24} /> 結帳 POS
        </button>
      )}

      {/* 各式 Modals (登入、忘記密碼、POS、歷史紀錄) 請保留原代碼 */}
      {/* ... */}

      {/* === 前台介面 (客戶端) === */}
      {!currentUser ? (
        <div className="p-4 md:p-8 flex-1 overflow-y-auto w-full">
           <div className="max-w-7xl mx-auto space-y-6 w-full">
            <header className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-[3px] bg-gradient-to-b from-[#e3b5a1]/50 to-[#9aa486]/50 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#12182c] flex items-center justify-center p-1.5"><img src="/logo.png" alt="智理運動恢復" className="w-[85%] h-[85%] object-contain" /></div>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.2em] text-white">智理運動恢復</h1>
              <p className="text-xs md:text-sm tracking-[0.4em] font-semibold text-[#e3b5a1] uppercase">Smart Recovery</p>
            </header>

            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex bg-[#12182c] p-1.5 rounded-2xl max-w-sm mx-auto mb-8 border border-white/10">
                <button onClick={() => setAppMode('booking')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${appMode === 'booking' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-white/50 hover:text-white/80'}`}>線上預約</button>
                <button onClick={() => setAppMode('tracking')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${appMode === 'tracking' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-white/50 hover:text-white/80'}`}>我的預約查詢</button>
              </div>

              {/* 此處放置原有的表單 UI (formData) 與 AI 推薦區域 */}
              {/* 請保留你原本前台的表單輸入框 */}
            </div>
          </div>
          <BrandFooter />
        </div>
      ) : (

      /* === 後台介面 (Admin) === */
      <div className="flex h-screen bg-slate-100 w-full overflow-hidden relative">
        
        {/* 側邊欄 (Sidebar) */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-0 sm:w-20'} bg-[#192039] text-white transition-all duration-300 flex flex-col overflow-hidden shrink-0 z-40`}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
            {isSidebarOpen && <span className="font-extrabold tracking-widest text-[#e3b5a1]">SMART ADMIN</span>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg hidden sm:block">
              <Menu size={20} className="text-white/70" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
            <button onClick={() => setAdminTab('appointments')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${adminTab === 'appointments' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><Clipboard size={20} /> {isSidebarOpen && "現場戰情室"}</button>
            <button onClick={() => setAdminTab('schedule')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${adminTab === 'schedule' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><Calendar size={20} /> {isSidebarOpen && "顧問排班表"}</button>
            
            {currentUser.role === 'admin' && (
              <>
                <div className="my-4 border-t border-white/10"></div>
                <div className={`px-4 text-xs font-bold text-slate-500 mb-2 ${!isSidebarOpen && 'hidden'}`}>老闆專區</div>
                <button onClick={() => setAdminTab('analytics')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${adminTab === 'analytics' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><BarChart size={20} /> {isSidebarOpen && "營業營收"}</button>
                <button onClick={() => setAdminTab('team')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${adminTab === 'team' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><UserPlus size={20} /> {isSidebarOpen && "團隊管理"}</button>
                <button onClick={() => setAdminTab('prices')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${adminTab === 'prices' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><ShoppingBag size={20} /> {isSidebarOpen && "商品設定"}</button>
                <button onClick={() => setAdminTab('blacklist')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${adminTab === 'blacklist' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:bg-white/5'}`}><ShieldAlert size={20} /> {isSidebarOpen && "黑名單管理"}</button>
              </>
            )}
          </div>

          <div className="p-4 border-t border-white/10 shrink-0">
            {currentUser.role === 'admin' && isSidebarOpen && (
              <button onClick={exportToGoogleSheets} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-2 mb-3 shadow-md">
                <Download size={14} /> 匯出報表
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="bg-[#e3b5a1] p-2 rounded-full shrink-0"><User size={16} className="text-[#192039]" /></div>
              {isSidebarOpen && (
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate">{currentUser.name}</p>
                  <button onClick={() => setShowPwdModal(true)} className="text-[10px] text-white/50 hover:text-white underline">修改密碼</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* 手機版遮罩 */}
        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30 sm:hidden"></div>}

        {/* 主要內容區 */}
        <main className="flex-1 h-full overflow-y-auto bg-slate-50 relative">
          
          {/* 行動版漢堡選單按鈕 */}
          <button onClick={() => setIsSidebarOpen(true)} className="sm:hidden absolute top-4 left-4 z-20 p-2 bg-white rounded-lg shadow-sm border border-slate-200">
            <Menu size={20} />
          </button>

          <div className="p-4 sm:p-8 pt-16 sm:pt-8 max-w-7xl mx-auto pb-24">
            
            {/* 戰情室 (含日曆視圖) */}
            {adminTab === 'appointments' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Clipboard className="text-[#9aa486]" /> 預約戰情室</h3>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* 切換視圖按鈕 */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => setAdminViewMode('list')} className={`p-2 rounded-lg ${adminViewMode === 'list' ? 'bg-white shadow text-[#192039]' : 'text-slate-400'}`} title="列表視圖"><List size={18} /></button>
                      <button onClick={() => setAdminViewMode('calendar')} className={`p-2 rounded-lg ${adminViewMode === 'calendar' ? 'bg-white shadow text-[#192039]' : 'text-slate-400'}`} title="日曆視圖"><LayoutGrid size={18} /></button>
                    </div>
                  </div>
                </div>

                {adminViewMode === 'calendar' ? (
                  // --- 日曆視圖 (Calendar View) ---
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <input type="date" value={adminSelectedDate} onChange={e => setAdminSelectedDate(e.target.value)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none" />
                      <span className="text-xs text-slate-500 font-bold bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg border border-amber-200">點擊網格即可為該顧問預約</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        {/* 表頭 (顧問) */}
                        <div className="grid border-b-2 border-slate-200 sticky top-0 bg-white z-10" style={{ gridTemplateColumns: `80px repeat(${activeAdvisors.length}, minmax(150px, 1fr))`}}>
                          <div className="p-3 font-bold text-slate-400 text-xs text-center border-r border-slate-100">時間</div>
                          {activeAdvisors.map(advId => {
                            const adv = teamMembers.find(m => m.id === advId);
                            return <div key={advId} className="p-3 font-bold text-slate-700 text-center border-r border-slate-100 bg-slate-50">{adv?.name}</div>;
                          })}
                        </div>
                        
                        {/* 網格內容 (時間區塊) */}
                        {ALL_TIME_SLOTS.map(slot => {
                          return (
                            <div key={slot} className="grid border-b border-slate-100 hover:bg-slate-50 transition-colors group" style={{ gridTemplateColumns: `80px repeat(${activeAdvisors.length}, minmax(150px, 1fr))`}}>
                              <div className="p-2 text-[11px] font-bold text-slate-400 text-center flex items-center justify-center border-r border-slate-100">{slot.split('-')[0]}</div>
                              
                              {activeAdvisors.map(advId => {
                                // 尋找此時段是否有預約
                                const booked = appointments.find(a => a.date === adminSelectedDate && a.advisorId === advId && a.status !== '已取消' && a.timeSlots?.includes(slot));
                                
                                return (
                                  <div key={advId} className="border-r border-slate-100 p-1 relative h-12 flex items-center justify-center cursor-pointer"
                                       onClick={() => {
                                         if(!booked) {
                                           // 點擊空檔直接開啟後台預約 Modal
                                           setRebookCustomer({ name: "", phone: "" });
                                           setRebookFormData({ date: adminSelectedDate, time: slot, service: "", consultant: advId });
                                           setShowRebookModal(true);
                                         }
                                       }}>
                                    {booked ? (
                                      <div className={`w-full h-full rounded-md p-1 px-2 flex flex-col justify-center shadow-sm border ${booked.customerType === '初次預約' ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-indigo-100 border-indigo-200 text-indigo-800'}`}>
                                        <span className="text-[11px] font-bold truncate leading-tight">{booked.name}</span>
                                        <span className="text-[9px] truncate opacity-70">{booked.serviceType}</span>
                                      </div>
                                    ) : (
                                      <div className="opacity-0 group-hover:opacity-100 text-[10px] text-[#9aa486] font-bold">+ 預約</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  // --- 列表視圖 (List View) ---
                  <div className="space-y-4">
                     {/* 請保留你原本戰情室列表的 UI，並將 handleQuickCheckout 按鈕設計明顯一點 */}
                     {/* 省略原有列表渲染邏輯以節省空間... */}
                  </div>
                )}
              </div>
            )}

            {/* 其餘後台分頁 (Schedule, Analytics, Prices, Team, Blacklist) */}
            {/* 這些部分維持你原本設計的 UI 即可，只會顯示在主內容區內 */}

          </div>
        </main>
      </div>
      )}
    </div>
  );
}
