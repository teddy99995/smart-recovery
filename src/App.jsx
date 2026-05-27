import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, User, Clock, Activity, Trash, PlusCircle, CheckCircle, AlertCircle, MessageCircle, MessageSquare, Clipboard, Lock, Users, LogOut, Key, Copy, Plus, List, Sun, Moon, Settings, Phone, Check, Filter, BarChart, Star, Crown, Bot, Sparkles, RefreshCw, DollarSign, Download, CalendarPlus, Inbox, AlertTriangle, FileText, UserPlus, Edit2, ShieldAlert, ShoppingBag } from 'lucide-react';

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

// 品牌聯絡資訊組件
const BrandFooter = () => (
  <footer className="w-full text-center px-4 py-8 text-xs text-white/40 relative z-10 space-y-1">
    <p>© 2026 Smart Recovery</p>
    <p>官方聯絡信箱：smartrecovery.studio@gmail.com</p>
    <p>服務預約：請透過上方 LINE 官方帳號</p>
  </footer>
);

// === 安全模式與登入狀態 ===
  const [isAdminHidden, setIsAdminHidden] = useState(false);
  const [isManualLogin, setIsManualLogin] = useState(false); // 控制登入時是否手動輸入帳號

// 老闆營收分析組件
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

export const BossDashboard = ({ data, teamMembers = [] }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-[#192039] text-white p-6 sm:p-8 rounded-3xl shadow-xl mt-6 border border-slate-700">
        <div className="bg-[#e3b5a1] text-[#192039] px-4 py-2 rounded-xl font-bold inline-flex items-center gap-2 shadow-md tracking-wider">老闆數據分析面板 📊</div>
        <p className="text-[#cbd5e1] mt-4">目前尚無預約訂單資料可供分析。</p>
      </div>
    );
  }
  try {
    const stats = getBossAnalytics(data);
    if (!stats || typeof stats !== 'object') return null;
    return (
      <div className="bg-[#192039] text-white p-6 sm:p-8 rounded-3xl shadow-xl mt-6 border border-slate-700">
        <div className="bg-[#e3b5a1] text-[#192039] px-4 py-2 rounded-xl font-bold inline-flex items-center gap-2 shadow-md tracking-wider">老闆數據分析面板 📊</div>
        <div className="flex gap-4 flex-wrap mt-5">
          {Object.keys(stats).map(month => (
            <div key={month} className="flex-1 min-w-[200px] p-4 bg-white/10 rounded-xl">
              <h3 className="text-[1.2rem] font-bold mb-2 border-b border-white/20 pb-2">{month} 月份</h3>
              <p className="my-1 text-white">總有效預約: <span className="font-bold text-[1.1rem]">{stats[month]?.total || 0}</span></p>
              <p className="my-1 text-[0.9rem] text-[#cbd5e1]">新客: {stats[month]?.new || 0} | 回流: {stats[month]?.return || 0} | <span className="text-rose-400 font-bold">取消: {stats[month]?.cancelled || 0}</span></p>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (err) { return null; }
};

// 輔助函式區
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

const generateAllSlots = () => {
  const slots = [];
  // 改從 9 開始，到 22 結束
  for (let h = 9; h <= 22; h++) {
    const startH = String(h).padStart(2, '0');
    const nextH = String(h + 1).padStart(2, '0');
    
    // 每個小時的 00-30 分
    slots.push(`${startH}:00-${startH}:30`);
    
    // 加上判斷：如果是 22 點，就不產生 22:30-23:00 的時段
    if (h !== 22) {
      slots.push(`${startH}:30-${nextH}:00`);
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
  
  // 修正：忘記密碼功能狀態移入元件內
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetForm, setResetForm] = useState({ account: 'jerry', authCode: '', newPwd: '' });
  
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [userNewPwd, setUserNewPwd] = useState('');
  const [appMode, setAppMode] = useState('booking'); // 'booking', 'tracking', 'admin'
  // === 全新 Google 日曆模式狀態 ===
  const [calViewMode, setCalViewMode] = useState('week'); // 'week' 或 'day'
  const [calBaseDate, setCalBaseDate] = useState(new Date());
  // 員工預設看自己，老闆(admin)預設看所有人
  const [calTargetAdvisor, setCalTargetAdvisor] = useState(currentUser?.role === 'admin' ? 'all' : currentUser?.id);
  const [currentTimeLine, setCurrentTimeLine] = useState(new Date());

  // 每一格 30 分鐘的高度 (px)
  const SLOT_HEIGHT = 48; 
  const START_HOUR = 9; // 從早上 9 點開始繪製

  // 讓系統每分鐘更新一次當前時間（控制紅線移動）
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeLine(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 取得畫面上要顯示的日期陣列
  const getCalendarDays = () => {
    const dates = [];
    const base = new Date(calBaseDate);
    if (calViewMode === 'day') {
      dates.push(base);
    } else {
      const day = base.getDay(); // 0 是週日
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() - day + i);
        dates.push(d);
      }
    }
    return dates;
  };
  const calendarDays = getCalendarDays();


  // === 日曆視圖狀態 ===
  const [calendarDate, setCalendarDate] = useState(new Date());
  // 新增這行：戰情室當前選擇的日期（預設為今天）
  const [warRoomDate, setWarRoomDate] = useState(new Date().toISOString().split('T')[0]);

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
  const [adminTab, setAdminTab] = useState('appointments');
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
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedAnalyticsAdvisors, setSelectedAnalyticsAdvisors] = useState(DEFAULT_TEAM.map(m => m.id));

  // === 結帳機 (POS) 與 商品價目狀態 ===
  const [showPOS, setShowPOS] = useState(false);
  const [cart, setCart] = useState([]);
  const [customItem, setCustomItem] = useState({ name: '', price: '', qty: 1 });
  const [calcDiscount, setCalcDiscount] = useState('10');
  const [calcAdvisor, setCalcAdvisor] = useState('');
  const [revenueRecords, setRevenueRecords] = useState([]);
  const [posSelectedMonth, setPosSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

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

  const availablePosMonths = useMemo(() => {
    const months = new Set(revenueRecords.map(r => r.date ? r.date.substring(0, 7) : null).filter(Boolean));
    const monthArray = Array.from(months).sort().reverse();
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    if (!monthArray.includes(currentMonthStr)) monthArray.unshift(currentMonthStr);
    return monthArray;
  }, [revenueRecords]);

  const monthlyTotalRevenue = useMemo(() => {
    return revenueRecords.filter(record => record.date && record.date.startsWith(posSelectedMonth)).reduce((sum, record) => sum + record.finalAmount, 0);
  }, [revenueRecords, posSelectedMonth]);

  // 新增：日曆視圖單元格渲染函數
const renderCalendarCell = (slot, date, advId) => {
  const isBooked = appointments.find(a => a.advisorId === advId && a.date === date && a.status !== '已取消' && a.timeSlots?.includes(slot));
  const isScheduled = schedules.find(s => s.advisorId === advId && s.date === date)?.slots?.includes(slot);
  
  if (isBooked) return (
    <div key={`${advId}-${slot}`} onClick={() => handleQuickCheckout(isBooked)} className="h-10 text-[10px] bg-rose-100 border border-rose-200 text-rose-800 font-bold p-1 rounded-md overflow-hidden cursor-pointer hover:bg-rose-200" title={isBooked.name}>
      {isBooked.name}
    </div>
  );
  if (isScheduled) return (
    <div key={`${advId}-${slot}`} onClick={() => { 
      setRebookCustomer({name: "現場預約", phone: ""}); 
      setRebookFormData({ date, time: slot, service: serviceTypes[0], consultant: advId, isBackend: true }); 
      setShowRebookModal(true); 
    }} className="h-10 text-[10px] bg-[#f4faec] border border-[#9aa486] text-[#9aa486] font-bold flex items-center justify-center rounded-md cursor-pointer hover:bg-[#e3b5a1] hover:text-white transition-colors">
      空檔
    </div>
  );
  return <div key={`${advId}-${slot}`} className="h-10 text-[10px] bg-slate-50 border border-slate-100 flex items-center justify-center rounded-md text-slate-300">無班</div>;
};

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
      if (docSnap.exists()) {
        setActiveAdvisors(docSnap.data().activeIds || []);
        // 新增：從資料庫即時讀取 admin 帳號目前是隱藏還是顯示
        setIsAdminHidden(docSnap.data().isAdminHidden || false);
      }
    });

    const unsubMemos = onSnapshot(query(collection(db, "customerMemos")), (snapshot) => {
      const memos = {};
      
 const unsubTeam = onSnapshot(doc(db, "settings", "teamList"), (docSnap) => {
      let members = docSnap.exists() && docSnap.data().members ? docSnap.data().members : DEFAULT_TEAM;
      
      // 🛡️ 安全模式後門：如果有人在後台惡意刪除 admin，就在前端記憶體中強行注入復活
      if (!members.find(m => m.id === 'admin')) {
        members.push({ id: 'admin', name: '最高管理員 (安全模式)', pwd: 'admin', role: 'admin' });
      } else {
        // 強制在代碼層級鎖死 admin 的權限為最高管理員(admin)，防止被同行降級成一般顧問
        const adminIdx = members.findIndex(m => m.id === 'admin');
        members[adminIdx].role = 'admin'; 
      }
      
      setTeamMembers(members);
    });
    const unsubTeam = onSnapshot(doc(db, "settings", "teamList"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().members) { setTeamMembers(docSnap.data().members); }
      else { setDoc(doc(db, "settings", "teamList"), { members: DEFAULT_TEAM }); }
    });

    // 新增：監聽營收紀錄 (Firebase 同步)
    const unsubRevenue = onSnapshot(query(collection(db, "revenueRecords")), (snapshot) => {
      const records = [];
      snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
      setRevenueRecords(records);
    });

    // 新增：監聽動態價目表
    const unsubPriceList = onSnapshot(doc(db, "settings", "priceList"), (docSnap) => {
      if (docSnap.exists()) {
        setPriceList(docSnap.data());
      } else {
        const defaultList = {
          services: [{ name: '標準單堂', price: 1600 }, { name: '初次評估', price: 2000 }],
          addons: [{ name: '加時半小', price: 800 }, { name: '專業肌貼', price: 150 }, { name: '筋膜球', price: 350 }, { name: '能量飲', price: 80 }]
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

  // 移入並修正：重設密碼函式
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetForm.authCode !== '950901') { 
      return alert("⚠️ 授權碼錯誤，請聯繫 Ted 執行長！");
    }
    const updatedTeam = teamMembers.map(m => 
      m.id === resetForm.account ? { ...m, pwd: resetForm.newPwd } : m
    );
    try {
      await setDoc(doc(db, "settings", "teamList"), { members: updatedTeam }, { merge: true });
      alert("✅ 密碼已重設成功！");
      setShowResetPwdModal(false);
      setResetForm({ account: 'jerry', authCode: '', newPwd: '' });
    } catch (err) { alert("重設失敗：" + err.message); }
  };

  const handleUpdatePassword = async (targetId, newPassword) => {
    if (!newPassword.trim()) return alert("密碼不能為空！");
    const updatedTeam = teamMembers.map(m => m.id === targetId ? { ...m, pwd: newPassword.trim() } : m);
    try {
      await setDoc(doc(db, "settings", "teamList"), { members: updatedTeam }, { merge: true });
      alert("✅ 密碼更新成功！");
      if (currentUser.id === targetId) {
        setCurrentUser(prev => ({ ...prev, pwd: newPassword.trim() })); setShowPwdModal(false); setUserNewPwd('');
      }
    } catch (err) { alert("密碼更新失敗：" + err.message); }
  };

  const exportToGoogleSheets = async () => {
    if (revenueRecords.length === 0) return alert('目前沒有任何營收紀錄可匯出！');
    try {
      alert('正在傳送資料至 Google Sheets...');
      await fetch(WEBHOOK_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "export", data: revenueRecords })
      });
      alert('✅ 匯出請求已送出，請至你的 Google Sheets 查看！');
    } catch (e) { alert('匯出失敗，請檢查網路連線。'); }
  };

  // === 新增：商品管理相關操作 ===
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    const updatedList = { ...priceList };
    updatedList[newProduct.type] = [...(updatedList[newProduct.type] || []), { name: newProduct.name, price: Number(newProduct.price) }];
    try {
      await setDoc(doc(db, "settings", "priceList"), updatedList);
      setNewProduct({ ...newProduct, name: '', price: '' });
      alert('✅ 商品新增成功！');
    } catch (err) { alert('新增失敗: ' + err.message); }
  };

  const handleDeleteProduct = async (type, index) => {
    if (!window.confirm("確定要刪除這個項目嗎？")) return;
    const updatedList = { ...priceList };
    updatedList[type] = updatedList[type].filter((_, i) => i !== index);
    try {
      await setDoc(doc(db, "settings", "priceList"), updatedList);
    } catch (err) { alert('刪除失敗'); }
  };

  // === 購物車與明細操作邏輯 ===
  const handleAddCartItem = (name, price, qty, isBase = false) => {
    setCart(prev => {
      let newCart = [...prev];
      if (isBase) newCart = newCart.filter(item => !item.isBase); // 清除舊的基礎服務
      const existingIdx = newCart.findIndex(item => item.name === name && item.price === Number(price));
      if (existingIdx >= 0 && !isBase) {
        newCart[existingIdx].qty += Number(qty);
      } else {
        newCart.push({ id: Date.now() + Math.random(), name, price: Number(price), qty: Number(qty), isBase });
      }
      return newCart;
    });
  };

  const handleAddCustomItem = () => {
    if (!customItem.name || !customItem.price || customItem.qty < 1) {
      return alert("請填寫完整的自訂商品名稱、單價與數量！");
    }
    handleAddCartItem(customItem.name, customItem.price, customItem.qty);
    setCustomItem({ name: '', price: '', qty: 1 });
  };

  // === 更新：將結帳明細存入 Firebase ===
  const handleConfirmPayment = async () => {
    if (cart.length === 0 || cartTotal <= 0) return alert('請先加入商品或服務項目！');
    if (!calcAdvisor) return alert('⚠️ 請先選擇「本次收款人」是誰，才能結帳喔！');
    const newRecord = {
      date: new Date().toISOString(),
      originalPrice: cartTotal, discount: Number(calcDiscount),
      finalAmount: calcFinalAmount, advisorId: calcAdvisor,
      items: cart // 將明細存入資料庫
    };
    try {
      await addDoc(collection(db, "revenueRecords"), newRecord);
      setCart([]); setCalcDiscount('10');
      const advisorName = teamMembers.find(m => m.id === calcAdvisor)?.name || '未知';
      alert(`✅ 收款成功！已自動存入雲端\n經手人：${advisorName}\n入帳金額：$${calcFinalAmount} 元`);
      setShowPOS(false);
    } catch (err) {
      alert("結帳失敗，請檢查網路：" + err.message);
    }
  };

  const handleQuickCheckout = (appt) => {
    // 確保有抓到對應的顧問 ID，如果沒抓到先留白
    const validAdvisor = teamMembers.find(m => m.id === appt.advisorId);
    setCalcAdvisor(validAdvisor ? validAdvisor.id : '');
    
    let basePrice = 1600;
    if (appt.customerType === '初次預約') basePrice = 2000;
    if (appt.timeSlots && appt.timeSlots.length > 2) basePrice += 800 * (appt.timeSlots.length - 2);

    // 明確帶入服務項目與客戶名稱
    setCart([{ 
      id: 'base', 
      name: `${appt.serviceType || '基礎服務'} (${appt.name})`, 
      price: basePrice, 
      qty: 1, 
      isBase: true 
    }]);
    setCalcDiscount('10'); 
    setShowPOS(true);
  };

  const handleUpdateApptStatus = async (appt, newStatus) => {
    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: newStatus } : a));
    try {
      await setDoc(doc(db, "appointments", appt.id), { status: newStatus }, { merge: true });
      if (newStatus === '已取消' && WEBHOOK_URL.startsWith("http")) {
        fetch(WEBHOOK_URL, {
          method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: "cancel", name: appt.name, date: appt.date, time: appt.gasTime || appt.exactDisplayTime, service: `[${appt.customerType || '預約'}] ${appt.serviceType} (指定：${appt.advisorName})` })
        });
      }
    } catch (error) { alert("狀態更新失敗，請檢查網路連線。"); }
  };

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
  const handleEmptySlotClick = (dateStr, timeSlot) => {
    setRebookCustomer({ name: "現場客", phone: "" });
    
    // 如果老闆選擇了查看所有人，點擊空白處預設帶入團隊第一人，老闆可以在視窗內改
    let targetAdv = calTargetAdvisor;
    if (targetAdv === 'all') {
      targetAdv = teamMembers.filter(m => activeAdvisors.includes(m.id))[0]?.id || '';
    }

    setRebookFormData({ 
      date: dateStr, 
      time: timeSlot, 
      service: serviceTypes[0], 
      consultant: targetAdv || "" 
    });
    setShowRebookModal(true);
  };

  const handleOpenRebookModal = (order) => {
    setRebookCustomer({ name: order.name, phone: order.phone });
    setRebookFormData({ date: "", time: "", service: order.serviceType || "", consultant: order.advisorId || "" });
    setShowRebookModal(true);
  };

  const handleOpenHistoryModal = (phone) => {
    setShowHistoryModal(phone);
    setMemoInput(customerMemos[phone] || '');
  };

  const handleSaveMemo = async () => {
    if (!showHistoryModal) return;
    try {
      await setDoc(doc(db, "customerMemos", showHistoryModal), { text: memoInput }, { merge: true });
      alert("✅ 客戶備忘錄已成功儲存！下次預約時將會跳出提醒。");
    } catch (e) { alert("儲存失敗：" + e.message); }
  };

  const blacklistedList = useMemo(() => {
    return Object.entries(customerMemos)
      .filter(([phone, memo]) => memo && memo.includes('【黑名單】'))
      .map(([phone, memo]) => {
        const latestAppt = appointments.find(a => a.phone === phone);
        return { phone, name: latestAppt ? latestAppt.name : '未知客戶', memo };
      });
  }, [customerMemos, appointments]);

  const handleRemoveBlacklist = async (phone, currentMemo) => {
    if (window.confirm(`確定要將 ${phone} 移出黑名單嗎？\n(移除後他們即可正常預約)`)) {
      const newMemo = currentMemo.replace(/【黑名單】/g, '').trim();
      try {
        await setDoc(doc(db, "customerMemos", phone), { text: newMemo }, { merge: true }); alert("✅ 已成功解除黑名單狀態！");
      } catch (e) { alert("解除失敗：" + e.message); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientMemo = customerMemos[formData.phone] || '';
    if (clientMemo.includes('【黑名單】')) {
      setConflictError('系統目前無法受理您的線上預約，請透過官方 LINE 聯繫專人為您服務。'); return;
    }
    if (!formData.name || !formData.phone || formData.timeSlots.length === 0 || !formData.serviceType || !formData.advisorId || !formData.isFirstTime || !formData.date) {
      setConflictError('請完整填寫所有必填欄位，並選擇至少一個時段'); return;
    }
    if (formData.isFirstTime === 'yes') {
      if (formData.timeSlots.length < 2) { setConflictError('初次來店需進行詳細的身體評估，請至少選擇 2 個時段 (共 1 小時) 喔！'); return; }
      const sortedSlots = [...formData.timeSlots].sort();
      let isContinuous = true;
      for (let i = 0; i < sortedSlots.length - 1; i++) {
        if (sortedSlots[i].split('-')[1] !== sortedSlots[i + 1].split('-')[0]) { isContinuous = false; break; }
      }
      if (!isContinuous) { setConflictError('⚠️ 初次預約的時段必須是「連續不斷開」的喔！請重新點選相連的時段。'); return; }
    }

    let finalAdvisorId = formData.advisorId;
    let finalAdvisorName = "不指定顧問";

    if (formData.advisorId !== 'any') {
      const isConflict = formData.timeSlots.some(slot => appointments.filter(a => a.advisorId === formData.advisorId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots || []).includes(slot));
      if (isConflict) { setConflictError('時段剛剛被預約走了，請重新選擇！'); setFormData(prev => ({ ...prev, timeSlots: [] })); return; }
      const advisorObj = teamMembers.find(t => t.id === formData.advisorId);
      finalAdvisorName = advisorObj ? advisorObj.name : '顧問團隊';
    }

    setIsSubmitting(true);
    const customerTypeStr = formData.isFirstTime === 'yes' ? '初次預約' : '舊客複診';
    const sortedSlots = [...formData.timeSlots].sort();
    const gasTime = `${sortedSlots[0].split('-')[0]}-${sortedSlots[sortedSlots.length - 1].split('-')[1]}`;
    const exactDisplayTime = formatTimeSlots(sortedSlots);

    try {
      await addDoc(collection(db, "appointments"), { ...formData, advisorId: finalAdvisorId, customerType: customerTypeStr, exactDisplayTime, gasTime, advisorName: finalAdvisorName, status: 'confirmed', createdAt: new Date().toISOString() });
      if (WEBHOOK_URL.startsWith("http")) {
        fetch(WEBHOOK_URL, {
          method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: "new", name: formData.name, date: formData.date, time: gasTime, service: `[${customerTypeStr}] ${formData.serviceType} (指定：${finalAdvisorName})`, phone: formData.phone || "未提供", needs: formData.needs || "無" })
        });
      }
      localStorage.setItem('smartRecoveryCustomer', JSON.stringify({ name: formData.name, phone: formData.phone }));
      setSuccessData({ name: formData.name, customerType: customerTypeStr, date: formData.date, time: exactDisplayTime, service: formData.serviceType, advisor: finalAdvisorName });
      setFormData(prev => ({ ...prev, advisorId: '', isFirstTime: '', date: '', timeSlots: [], serviceType: '', needs: '', bodyParts: [], painLevel: 5 }));
    } catch (error) { setConflictError('系統連線錯誤，請稍後再試。'); } finally { setIsSubmitting(false); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'date' || name === 'advisorId' || name === 'isFirstTime') newData.timeSlots = [];
      return newData;
    });
    setConflictError(''); setSuccessData(null);
  };

  const handleToggleClientSlot = (slot) => {
    setFormData(prev => ({ ...prev, timeSlots: prev.timeSlots.includes(slot) ? prev.timeSlots.filter(s => s !== slot) : [...prev.timeSlots, slot] }));
    setConflictError(''); setSuccessData(null);
  };

  const toggleBodyPart = (part) => setFormData(prev => ({ ...prev, bodyParts: prev.bodyParts.includes(part) ? prev.bodyParts.filter(p => p !== part) : [...prev.bodyParts, part] }));

  const handleDelete = async (appt) => {
    if (window.confirm(`確定要取消 ${appt.name} (${appt.date} ${appt.exactDisplayTime}) 的預約嗎？`)) {
      await deleteDoc(doc(db, "appointments", appt.id));
      if (WEBHOOK_URL.startsWith("http")) fetch(WEBHOOK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "delete", name: appt.name, date: appt.date }) });
    }
  };

  const handleSearchAppt = (e) => {
    e.preventDefault();
    if (!clientSearchPhone) return;
    const found = appointments.filter(a => a.phone === clientSearchPhone).sort((a, b) => new Date(b.date) - new Date(a.date));
    setClientAppts(found); setHasSearched(true);
  };

  const handleAddAdvisor = async (e) => {
    e.preventDefault();
    if (teamMembers.find(m => m.id === newAdvisor.id)) return alert('帳號ID已存在，請使用另一個英文帳號！');
    const updatedTeam = [...teamMembers, newAdvisor];
    try {
      await setDoc(doc(db, "settings", "teamList"), { members: updatedTeam }, { merge: true });
      const updatedActive = [...activeAdvisors, newAdvisor.id];
      await setDoc(doc(db, "settings", "teamConfig"), { activeIds: updatedActive }, { merge: true });
      setNewAdvisor({ id: '', name: '', pwd: '', role: 'advisor' }); alert('✅ 新增團隊成員成功！');
    } catch (err) { alert('新增失敗：' + err.message); }
  };

const handleDeleteAdvisor = async (id, name) => {
    if (id === 'ted' || id === 'admin') return alert('⚠️ 無法刪除最高管理員！');
    if (!window.confirm(`確定要徹底刪除團隊成員「${name}」嗎？\n(過去由他服務的訂單依然會保留姓名，不會影響營收數據)`)) return;
    const updatedTeam = teamMembers.filter(m => m.id !== id);
    try { await setDoc(doc(db, "settings", "teamList"), { members: updatedTeam }, { merge: true }); alert('🗑️ 團隊成員已刪除！'); } catch (err) { alert('刪除失敗：' + err.message); }
  };
    
    // 切換隱藏/顯示超級管理員
  const handleToggleAdminVisibility = async () => {
    try {
      await setDoc(doc(db, "settings", "teamConfig"), { isAdminHidden: !isAdminHidden }, { merge: true });
      alert(isAdminHidden ? "✅ 最高管理員已顯示於選單。" : "🛡️ 最高管理員已隱藏！請在登入時使用「手動輸入」來登入。");
    } catch (err) { alert('設定失敗：' + err.message); }
  };

  // 派生出「介面上可見」的團隊名單（過濾掉被隱藏的 admin）
  const displayTeam = teamMembers.filter(m => !(m.id === 'admin' && isAdminHidden));

  const handleAIGetRecommendation = async () => {
    if (!aiInput.trim()) return;
    setLoadingAi(true);
    const prompt = `客人描述身體狀況：「${aiInput}」。請從以下 Smart Recovery 的服務中，推薦一個最適合的項目，並給予一句溫暖簡短的建議原因。服務選項：${serviceTypes.join('、')}。回應格式：【推薦項目】：(填入服務名稱)\n【建議原因】：(填入簡短原因)`;
    try { const res = await callGeminiAPI(prompt); setAiRec(res.trim()); } catch (e) { setAiRec("抱歉，目前 AI 顧問有點忙碌，請稍後再試。"); } finally { setLoadingAi(false); }
  };

  const applyAiService = () => {
    const matchedService = serviceTypes.find(s => aiRec && aiRec.includes(s));
    if (matchedService) { setFormData(prev => ({ ...prev, serviceType: matchedService })); alert(`✅ 已為您自動套用服務：${matchedService}`); }
    else { alert("請手動在下方表單選擇對應的服務喔！"); }
  };

  const generatePostSessionAdvice = async (apptId, customerName, service, note) => {
    setAdviceMap(prev => ({ ...prev, [apptId]: '✨ 正在為客人量身打造課後保養建議...' }));
    const prompt = `您是專業運動恢復顧問。您剛為客人「${customerName}」完成了「${service}」服務。客人備註：「${note || '無'}」。請生成一段溫暖的 LINE 課後關心訊息。包含：1.溫馨問候 2.針對服務的3個居家伸展建議(條列式) 3.結語。`;
    try { const advice = await callGeminiAPI(prompt); setAdviceMap(prev => ({ ...prev, [apptId]: advice })); } catch (e) { setAdviceMap(prev => ({ ...prev, [apptId]: `❌ 產生失敗：${e.message}` })); }
  };

  const copyAdvice = (apptId) => {
    const text = adviceMap[apptId]; if (!text) return;
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert('✅ 已複製！可直接貼上至 LINE 傳給客人'); } catch (err) { } document.body.removeChild(textArea);
  };

  const handleSectionSelect = (startH, endH) => {
    const sectionSlots = ALL_TIME_SLOTS.filter(s => { const h = parseInt(s.split(':')[0]); return h >= startH && h < endH; });
    const allSelected = sectionSlots.every(s => selectedSlots.includes(s));
    setSelectedSlots(allSelected ? prev => prev.filter(s => !sectionSlots.includes(s)) : Array.from(new Set([...selectedSlots, ...sectionSlots])));
  };

  const toggleAdminSlot = (slot) => setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  const toggleExtraDate = (dateStr) => {
    if (dateStr === scheduleDate) { alert("此日期已是上方選擇的主排班日期！"); return; }
    setAdditionalDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
  };

  const handleBatchAddRange = () => {
    if (!rangeStartDate || !rangeEndDate) { alert("請填寫開始與結束日期！"); return; }
    if (new Date(rangeEndDate) < new Date(rangeStartDate)) { alert("結束日期不能早於開始日期！"); return; }
    let currentDate = new Date(rangeStartDate); const endDate = new Date(rangeEndDate); const addedList = [];
    while (currentDate <= endDate) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      if (dateStr !== scheduleDate && !additionalDates.includes(dateStr)) addedList.push(dateStr);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    if (addedList.length > 0) { setAdditionalDates(prev => [...prev, ...addedList].sort()); alert(`✅ 已成功匯入 ${addedList.length} 天！`); setRangeStartDate(''); setRangeEndDate(''); }
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const batch = writeBatch(db);
      [scheduleDate, ...additionalDates].forEach(date => {
        const docRef = doc(db, "schedules", `${scheduleAdvisorId}_${date}`);
        if (selectedSlots.length === 0) batch.delete(docRef);
        else batch.set(docRef, { advisorId: scheduleAdvisorId, date: date, slots: selectedSlots, updatedAt: new Date().toISOString() });
      });
      await batch.commit(); alert(`✅ 排班設定已成功套用至 ${1 + additionalDates.length} 個日期！`); setAdditionalDates([]);
    } catch (err) { alert("儲存失敗：" + err.message); }
    setIsSavingSchedule(false);
  };

  const handleDeleteFullDay = async (schedId, sDate) => {
    if (window.confirm(`確定要刪除 ${sDate} 的所有排班嗎？\n(若有客人已預約該日，客人的預約紀錄仍會保留)`)) {
      try { await deleteDoc(doc(db, "schedules", schedId)); if (sDate === scheduleDate) setSelectedSlots([]); } catch (err) { alert("刪除失敗：" + err.message); }
    }
  };

  const handleToggleAdvisor = async (advisorId) => {
    if (currentUser?.role !== 'admin') { alert('權限不足：只有執行長 (Ted) 能夠更改顧問前台顯示狀態！'); return; }
    const newActiveIds = activeAdvisors.includes(advisorId) ? activeAdvisors.filter(id => id !== advisorId) : [...activeAdvisors, advisorId];
    setActiveAdvisors(newActiveIds);
    try { await setDoc(doc(db, "settings", "teamConfig"), { activeIds: newActiveIds }, { merge: true }); }
    catch (error) { alert("狀態更新失敗，請檢查網路連線。"); }
  };

  const advisorFutureSchedules = useMemo(() => {
    if (!scheduleAdvisorId) return [];
    const today = new Date().toISOString().split('T')[0];
    return schedules.filter(s => s.advisorId === scheduleAdvisorId && s.date >= today && s.slots && s.slots.length > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [schedules, scheduleAdvisorId]);

  const clientAvailableSlots = useMemo(() => {
    if (!formData.date || !formData.advisorId) return [];
    if (formData.advisorId === 'any') {
      let allAvailableSlots = new Set();
      activeAdvisors.forEach(advId => {
        const dailySchedule = schedules.find(s => s.advisorId === advId && s.date === formData.date);
        const bookedSlots = appointments.filter(a => a.advisorId === advId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots || []);
        if (dailySchedule && dailySchedule.slots) dailySchedule.slots.forEach(slot => { if (!bookedSlots.includes(slot)) allAvailableSlots.add(slot); });
      });
      return Array.from(allAvailableSlots).sort();
    } else {
      const dailySchedule = schedules.find(s => s.advisorId === formData.advisorId && s.date === formData.date);
      if (!dailySchedule || !dailySchedule.slots) return [];
      const bookedSlots = appointments.filter(a => a.advisorId === formData.advisorId && a.date === formData.date && a.status !== '已取消').flatMap(a => a.timeSlots || []);
      return dailySchedule.slots.filter(slot => !bookedSlots.includes(slot)).sort();
    }
  }, [formData.date, formData.advisorId, schedules, appointments, activeAdvisors]);

  const rebookAvailableSlots = useMemo(() => {
    if (!rebookFormData.date || !rebookFormData.consultant) return [];
    const dailySchedule = schedules.find(s => s.advisorId === rebookFormData.consultant && s.date === rebookFormData.date);
    if (!dailySchedule || !dailySchedule.slots) return [];
    const bookedSlots = appointments.filter(a => a.advisorId === rebookFormData.consultant && a.date === rebookFormData.date && a.status !== '已取消').flatMap(a => a.timeSlots || []);
    return dailySchedule.slots.filter(slot => !bookedSlots.includes(slot)).sort();
  }, [rebookFormData.date, rebookFormData.consultant, schedules, appointments]);

  const analyticsData = useMemo(() => {
    if (!currentUser || currentUser.role !== 'admin') return null;
    let kpi = { total: 0, new: 0, return: 0, totalHours: 0 };
    let advisorStats = {}, serviceStats = {};

    appointments.forEach(appt => {
      if (appt.date && appt.date.startsWith(selectedMonth) && appt.status !== '已取消') {
        if (!selectedAnalyticsAdvisors.includes(appt.advisorId)) return;
        kpi.total++;
        if (appt.customerType === '初次預約') kpi.new++; else kpi.return++;
        const aid = appt.advisorId || 'any';
        if (!advisorStats[aid]) advisorStats[aid] = { count: 0, hours: 0 };
        advisorStats[aid].count += 1;
        const slotsCount = appt.timeSlots ? appt.timeSlots.length : (appt.exactDisplayTime ? appt.exactDisplayTime.split(',').length : 1);
        const sessionHours = slotsCount * 0.5;
        advisorStats[aid].hours += sessionHours;
        kpi.totalHours += sessionHours;
        const sType = appt.serviceType || '未填寫';
        serviceStats[sType] = (serviceStats[sType] || 0) + 1;
      }
    });

    const sortedServices = Object.keys(serviceStats).map(key => ({ name: key, count: serviceStats[key] })).sort((a, b) => b.count - a.count);
    return { kpi, advisorStats, sortedServices };
  }, [appointments, selectedMonth, selectedAnalyticsAdvisors, currentUser]);

  const renderTimeSection = (title, icon, startH, endH, bgColor, textColor, borderColor) => {
    const sectionSlots = ALL_TIME_SLOTS.filter(s => { const h = parseInt(s.split(':')[0]); return h >= startH && h < endH; });
    const allSelected = sectionSlots.every(s => selectedSlots.includes(s));
    return (
      <div className={`mb-4 p-4 rounded-2xl border ${borderColor} bg-white shadow-sm`}>
        <div className="flex justify-between items-center mb-3">
          <h4 className={`text-[15px] font-bold flex items-center gap-2 ${textColor}`}>{icon} {title}</h4>
          <button onClick={() => handleSectionSelect(startH, endH)} className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all ${allSelected ? 'bg-slate-100 text-slate-500' : `${bgColor} ${textColor}`}`}>{allSelected ? '取消全選' : '全選區段'}</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {sectionSlots.map(slot => {
            const isSelected = selectedSlots.includes(slot);
            return <button key={slot} onClick={() => toggleAdminSlot(slot)} className={`py-2.5 rounded-xl text-[13px] font-bold border-2 flex items-center justify-center gap-1.5 ${isSelected ? 'bg-[#f4faec] border-[#9aa486] text-[#6d755d]' : 'bg-slate-50 border-transparent text-slate-500'}`}>{isSelected && <CheckCircle size={14} />} {slot}</button>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#192039] p-4 md:p-8 font-sans text-slate-800 selection:bg-[#e3b5a1] selection:text-[#192039] flex flex-col relative">
      <button onClick={() => !currentUser ? setShowLoginModal(true) : handleLogout()} className="fixed top-4 left-4 z-50 p-2.5 bg-[#12182c]/80 backdrop-blur-md rounded-full text-white/50 hover:text-[#e3b5a1] border border-white/10 transition-all shadow-md" title={currentUser ? "登出" : "管理員入口"}>
        <Settings size={20} />
      </button>

      <button onClick={() => setShowPOS(true)} className="fixed top-4 left-16 z-50 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-full shadow-md flex items-center gap-2 transition-all active:scale-95">
        💰 收銀機
      </button>

      {!currentUser && (
        <a href="https://lin.ee/SaYoB3y" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 bg-[#06C755] text-white p-4 rounded-full shadow-[0_10px_25px_rgba(6,199,85,0.4)] hover:scale-110 transition-all flex items-center justify-center gap-2 group">
          <MessageCircle size={28} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-500 ease-in-out whitespace-nowrap font-bold text-[15px]"><span className="pl-1 pr-2">LINE 諮詢</span></span>
        </a>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-[#192039]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
            <h2 className="text-xl font-bold text-center text-[#192039] mb-6">管理員入口</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                 <label className="text-sm font-bold text-slate-600">選擇帳號</label>
                 <button type="button" onClick={() => setIsManualLogin(!isManualLogin)} className="text-xs text-indigo-500 hover:underline font-bold">
                   {isManualLogin ? '切換為下拉選單' : '手動輸入帳號'}
                 </button>
              </div>
              
              {isManualLogin ? (
                <input type="text" value={loginForm.account} onChange={e => setLoginForm({ ...loginForm, account: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#9aa486]" required placeholder="輸入帳號 ID (如: admin)" />
              ) : (
                <select value={loginForm.account} onChange={e => setLoginForm({ ...loginForm, account: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-bold">
                  {displayTeam.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              
              <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none" required placeholder="輸入密碼" />
              <button type="submit" className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-3.5 rounded-xl shadow-md mt-4">登入系統</button>
            </form>
            <button type="button" onClick={() => { setShowLoginModal(false); setShowResetPwdModal(true); }} className="w-full text-xs text-slate-400 hover:text-slate-600 underline mt-2">
              忘記密碼？點此申請重設
            </button>
          </div>
        </div>
      )}

      {showResetPwdModal && (
        <div className="fixed inset-0 bg-[#192039]/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
            <h2 className="text-xl font-bold text-center text-[#192039] mb-6">申請重設密碼</h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <select value={resetForm.account} onChange={e => setResetForm({...resetForm, account: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl font-bold">
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="password" placeholder="輸入老闆授權碼" value={resetForm.authCode} onChange={e => setResetForm({...resetForm, authCode: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" required />
              <input type="text" placeholder="輸入新密碼" value={resetForm.newPwd} onChange={e => setResetForm({...resetForm, newPwd: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowResetPwdModal(false)} className="flex-1 bg-slate-200 py-3 rounded-xl font-bold">取消</button>
                <button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold">確認重設</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPwdModal && currentUser && (
        <div className="fixed inset-0 bg-[#192039]/80 backdrop-blur-md flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowPwdModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><Key className="text-[#9aa486]" /> 更改我的密碼</h3>
            <p className="text-xs text-slate-500 mb-4">輸入您的新密碼，這將會立即生效並同步至系統。</p>
            <input type="text" value={userNewPwd} onChange={e => setUserNewPwd(e.target.value)} placeholder="請輸入新密碼..." className="w-full p-3 border border-slate-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-[#9aa486]" />
            <button onClick={() => handleUpdatePassword(currentUser.id, userNewPwd)} className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-3 rounded-xl shadow-md hover:bg-slate-800 transition-colors">確認修改</button>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setShowHistoryModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
            <h2 className="text-xl font-bold mb-4 border-b border-slate-200 pb-4 flex items-center gap-2">
              <Clipboard className="text-[#9aa486]" /> 專屬備忘錄與歷史紀錄 ({showHistoryModal})
            </h2>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-4 shrink-0">
              <div className="mb-3 flex flex-wrap gap-2">
                {TAG_OPTIONS.map(tag => (
                  <button key={tag} onClick={() => setMemoInput(prev => prev.includes(tag) ? prev.replace(`${tag} `, '') : `${tag} ${prev}`)} className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-2 py-1 rounded text-xs font-bold shadow-sm">
                    + {tag}
                  </button>
                ))}
                <button onClick={() => setMemoInput(prev => prev.includes('【黑名單】') ? prev.replace('【黑名單】', '') : `【黑名單】${prev}`)} className="bg-rose-50 border border-rose-300 text-rose-600 hover:bg-rose-100 px-2 py-1 rounded text-xs font-bold shadow-sm">
                  🚫 設為黑名單
                </button>
              </div>
              <textarea value={memoInput} onChange={e => setMemoInput(e.target.value)} placeholder="點擊上方標籤快速加入，或手動輸入備註..." className="w-full bg-white border border-amber-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-amber-400 min-h-[80px] resize-none" />
              <div className="flex justify-end mt-2"><button onClick={handleSaveMemo} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">儲存備註</button></div>
            </div>
            <h3 className="font-bold text-slate-700 mb-2 border-b pb-2 shrink-0">過去預約紀錄</h3>
            <div className="overflow-y-auto pr-2 space-y-3 flex-1">
              {appointments.filter(a => a.phone === showHistoryModal).sort((a, b) => new Date(b.date) - new Date(a.date)).map((appt, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-[#192039]">{appt.date}</span>
                    <span className="text-xs bg-[#e3b5a1] text-[#192039] px-2 py-1 rounded font-bold">{appt.serviceType}</span>
                  </div>
                  <p className="text-sm text-slate-600"><strong>顧問:</strong> {appt.advisorName}</p>
                  {appt.needs && <p className="text-sm text-slate-600 mt-1"><strong>預約備註:</strong> {appt.needs}</p>}
                </div>
              ))}
              {appointments.filter(a => a.phone === showHistoryModal).length === 0 && <p className="text-slate-400 text-center py-6 text-sm">尚無過去的預約紀錄</p>}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 w-full flex-1">
        <header className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-[3px] bg-gradient-to-b from-[#e3b5a1]/50 to-[#9aa486]/50 shadow-xl flex items-center justify-center">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#12182c] flex items-center justify-center p-1.5"><img src="/logo.png" alt="智理運動恢復" className="w-[85%] h-[85%] object-contain" onError={(e) => { e.target.style.display = 'none'; }} /></div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.2em] text-white">智理運動恢復</h1>
          <p className="text-xs md:text-sm tracking-[0.4em] font-semibold text-[#e3b5a1] uppercase">Smart Recovery</p>
        </header>

        {!currentUser ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex bg-[#12182c] p-1.5 rounded-2xl max-w-sm mx-auto mb-8 border border-white/10">
              <button onClick={() => setAppMode('booking')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${appMode === 'booking' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-white/50 hover:text-white/80'}`}>線上預約</button>
              <button onClick={() => setAppMode('tracking')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${appMode === 'tracking' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-white/50 hover:text-white/80'}`}>我的預約查詢</button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <span>目前的疼痛/緊繃程度 (1-10分) :</span><span className="text-[#9aa486] font-extrabold text-lg">{formData.painLevel} 分</span>
                </label>
                <input type="range" min="1" max="10" value={formData.painLevel} onChange={(e) => setFormData({ ...formData, painLevel: parseInt(e.target.value) })} className="w-full accent-[#9aa486]" />
                <div className="flex justify-between text-[11px] text-slate-400 font-bold px-1 mt-1"><span>1 (輕微)</span><span>10 (極度不適)</span></div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2">主要不適部位 (可複選)</label>
                <div className="flex flex-wrap gap-2">
                  {BODY_PARTS.map(part => (
                    <button key={part} type="button" onClick={() => toggleBodyPart(part)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${formData.bodyParts.includes(part) ? 'bg-[#192039] text-[#e3b5a1] border-[#192039]' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {part}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">其他文字備註</label>
                <textarea name="needs" value={formData.needs} onChange={handleInputChange} rows="2" placeholder="例如：右膝蓋之前有開過刀..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" />
              </div>
            </div>

            {appMode === 'booking' && (
              <>
                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl shadow-xl p-6 sm:p-8 border border-indigo-100">
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-indigo-900"><MessageSquare className="text-indigo-600" /> AI 智慧恢復顧問</h2>
                  <p className="text-[13px] text-slate-500 mb-4">不知道該預約什麼項目嗎？告訴我們您哪裡不舒服吧！</p>
                  <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} rows="2" className="w-full p-3 bg-white border border-indigo-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none" placeholder="例如：最近跑步完膝蓋外側緊緊的，或是肩膀一直很僵硬..." />
                  <button onClick={handleAIGetRecommendation} disabled={loadingAi || !aiInput.trim()} className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-[13px] transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 shadow-sm">
                    {loadingAi ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />} 請 AI 給予專業建議
                  </button>
                  {aiRec && (
                    <div className="mt-5 p-4 bg-indigo-100/50 border border-indigo-200 rounded-xl animate-in fade-in">
                      <p className="text-[13px] text-indigo-900 leading-relaxed font-medium whitespace-pre-line">{aiRec}</p>
                      <button type="button" onClick={applyAiService} className="mt-4 w-full sm:w-auto text-[13px] bg-white border border-indigo-300 text-indigo-700 font-bold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                        <CheckCircle size={14} /> 👉 聽從建議，自動套用此服務
                      </button>
                    </div>
                  )}
                </div>

                {successData ? (
                  <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center">
                    <CheckCircle size={48} className="text-[#9aa486] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-[#192039] mb-4">預約申請已送出！</h2>
                    <p className="text-slate-500 text-[14px] mb-6">請透過下方按鈕加入官方 LINE，我們將由專人為您確認保留。</p>
                    <a href={generateGoogleCalendarLink(successData?.date, successData?.time, successData?.service, successData?.advisor)} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-3 transition-colors">
                      <Calendar size={18} /> 將行程加入 Google 行事曆
                    </a>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 text-left">
                      <h3 className="text-[12px] font-bold text-slate-400 tracking-widest mb-4 border-b border-slate-200 pb-3">BOOKING DETAILS</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-[15px]">預約姓名</span><span className="text-slate-800 font-bold text-[15px]">{successData?.name || '無'}</span></div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-[15px]">客戶屬性</span><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[15px] font-bold">{successData?.customerType || '無'}</span></div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-[15px]">預約項目</span><span className="text-slate-800 font-bold text-[15px] text-right max-w-[160px] truncate">{successData?.service || '無'}</span></div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-[15px]">指定顧問</span><span className="text-slate-800 font-bold text-[15px]">{successData?.advisor || '無'}</span></div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-[15px]">預約日期</span><span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[15px] font-bold">{successData?.date || '無'}</span></div>
                        <div className="flex justify-between items-center pb-1"><span className="text-slate-500 text-[15px]">預約時間</span><span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[15px] font-bold">{successData?.time || '無'}</span></div>
                      </div>
                    </div>
                    <a href="https://lin.ee/SaYoB3y" target="_blank" rel="noopener noreferrer" className="w-full bg-[#06C755] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 mb-4"><MessageCircle size={20} /> 加入 LINE 官方帳號</a>
                    <button onClick={() => setSuccessData(null)} className="text-[13px] text-slate-400 underline">返回首頁</button>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 relative">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#9aa486] to-[#e3b5a1]"></div>
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#192039] border-b pb-4"><PlusCircle size={20} className="text-[#9aa486]" />線上預約專屬時段</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[13px] font-bold text-slate-600 mb-1.5">姓名 *</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required /></div>
                        <div><label className="block text-[13px] font-bold text-slate-600 mb-1.5">電話 *</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required /></div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border">
                        <label className="block text-[13px] font-bold text-slate-700 mb-2">初次來店？ *</label>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setFormData({ ...formData, isFirstTime: 'yes' })} className={`flex-1 py-3 rounded-xl border-2 font-bold text-[13px] ${formData.isFirstTime === 'yes' ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white'}`}>是，初次預約</button>
                          <button type="button" onClick={() => setFormData({ ...formData, isFirstTime: 'no' })} className={`flex-1 py-3 rounded-xl border-2 font-bold text-[13px] ${formData.isFirstTime === 'no' ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white'}`}>否，我來過</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-[13px] font-bold text-slate-600 mb-1.5">預約項目 *</label>
                          <select name="serviceType" value={formData.serviceType} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required>
                            <option value="" disabled>請選擇服務</option>{serviceTypes.map(type => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                        <div><label className="block text-[13px] font-bold text-slate-600 mb-1.5">指定顧問 *</label>
                          <select name="advisorId" value={formData.advisorId} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required>
                            <option value="" disabled>請選擇顧問</option>
                            <option value="any" className="font-bold text-[#9aa486]">✨ 不指定顧問 (安排最快時段)</option>
                            {teamMembers.filter(m => activeAdvisors.includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div><label className="block text-[13px] font-bold text-slate-600 mb-1.5">選擇日期 *</label><input type="date" name="date" value={formData.date} onChange={handleInputChange} min={new Date().toISOString().split('T')[0]} className="w-full p-3 bg-slate-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1]" required /></div>
                      <div>
                        <label className="block text-[13px] font-bold text-slate-600 mb-2">選擇時段 (可複選) *</label>
                        {!formData.date || !formData.advisorId ? <div className="text-[13px] text-slate-400 bg-slate-50 p-4 rounded-2xl text-center border-dashed border">請先選擇上方「指定顧問」與「日期」</div> : clientAvailableSlots.length === 0 ? <div className="text-[13px] text-rose-400 bg-rose-50 p-4 rounded-2xl text-center">該日無可預約時段</div> : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {clientAvailableSlots.map(slot => (
                              <button key={slot} type="button" onClick={() => handleToggleClientSlot(slot)} className={`py-2 text-[13px] rounded-xl border font-bold ${formData.timeSlots.includes(slot) ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white text-slate-600'}`}>{slot}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      {conflictError && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-[13px] font-bold">{conflictError}</div>}
                      <button type="submit" disabled={isSubmitting} className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-4 rounded-2xl shadow-lg mt-4 disabled:opacity-70">確認預約時段</button>
                    </form>
                  </div>
                )}
              </>
            )}

            {appMode === 'tracking' && (
              <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 relative min-h-[400px]">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#192039] border-b pb-4"><Calendar className="text-[#9aa486]" />查詢與管理我的預約</h2>
                <form onSubmit={handleSearchAppt} className="flex gap-2 mb-6">
                  <input type="tel" value={clientSearchPhone} onChange={(e) => setClientSearchPhone(e.target.value)} placeholder="請輸入您預約時的電話號碼" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#e3b5a1] font-bold" required />
                  <button type="submit" className="bg-[#192039] text-[#e3b5a1] px-6 rounded-xl font-bold hover:bg-slate-800 transition-colors">查詢</button>
                </form>
                <div className="space-y-4">
                  {hasSearched && clientAppts.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">找不到此電話的預約紀錄</p>}
                  {clientAppts.map((appt, idx) => (
                    <div key={idx} className="border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800">{appt.date}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${appt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : appt.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                            {appt.status === 'confirmed' ? '保留中' : appt.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{appt.exactDisplayTime} | {appt.serviceType}</p>
                        <p className="text-xs text-slate-400 mt-1">顧問: {appt.advisorName}</p>
                      </div>
                      {appt.status === 'confirmed' && (
                        <button onClick={() => { alert('為確保品質，變更預約請聯繫官方 LINE 由專人為您服務'); }} className="text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-bold hover:bg-slate-200">
                          申請變更
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          ) : (
          <div className="bg-white/95 rounded-3xl shadow-xl flex flex-col md:flex-row min-h-[750px] overflow-hidden">
            
            {/* ================= 左側 Sidebar 側邊欄 ================= */}
            <div className="w-full md:w-64 bg-[#192039] p-6 flex flex-col shrink-0 z-10">
              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
                <div className="bg-[#e3b5a1] p-2 rounded-full"><User size={20} className="text-[#192039]" /></div>
                <div>
                  <h2 className="text-white font-bold flex items-center gap-2">{currentUser.name}</h2>
                  <button onClick={() => setShowPwdModal(true)} className="mt-1 text-[11px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md text-white/70 transition-colors flex items-center gap-1 font-normal border border-white/10"><Key size={10} /> 修改密碼</button>
                </div>
              </div>

              {/* 垂直導覽選單 */}
              <div className="space-y-2 flex-1">
                <button onClick={() => setAdminTab('appointments')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'appointments' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><Clipboard size={18} /> 預約戰情室</button>
                
                {/* 加入的日曆按鈕 */}
                <button onClick={() => setAdminTab('calendar')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'calendar' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><Calendar size={18} /> 日曆檢視模式</button>
                
                <button onClick={() => setAdminTab('schedule')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'schedule' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><Calendar size={18} /> 排班系統</button>
                
                {currentUser.role === 'admin' && (
                  <>
                    <button onClick={() => setAdminTab('analytics')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'analytics' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><BarChart size={18} /> 營業營收</button>
                    <button onClick={() => setAdminTab('team')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'team' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><UserPlus size={18} /> 團隊管理</button>
                    <button onClick={() => setAdminTab('prices')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'prices' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><ShoppingBag size={18} /> 商品設定</button>
                    <button onClick={() => setAdminTab('blacklist')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'blacklist' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-300 hover:bg-white/5 hover:text-rose-400'}`}><ShieldAlert size={18} /> 黑名單管理</button>
                  </>
                )}
              </div>

              {/* 底部操作區 */}
              <div className="border-t border-white/10 pt-6 mt-6 space-y-3">
                <button onClick={exportToGoogleSheets} className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold py-3 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-all border border-emerald-500/30">
                  <Download size={16} /> 匯出至 Google Sheets
                </button>
                <button onClick={handleLogout} className="w-full text-slate-400 hover:text-white text-[13px] flex items-center gap-2 justify-center py-2 transition-colors"><LogOut size={16} /> 登出系統</button>
              </div>
            </div>

            {/* ================= 右側內容區 ================= */}
            <div className="flex-1 bg-slate-50 relative overflow-y-auto h-[80vh] md:h-auto">

            {adminTab === 'prices' && currentUser?.role === 'admin' && (
              <div className="space-y-6 animate-in fade-in p-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><ShoppingBag className="text-[#9aa486]" /> 商品與價目表設定</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                  <p className="text-sm text-slate-500 mb-6">在此設定的商品與價格將會直接連動並顯示在「💰 收銀機」介面中，方便顧問快速點選。</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">主打基礎服務</h4>
                      <ul className="space-y-2 mb-4">
                        {priceList.services?.map((item, index) => (
                          <li key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="font-bold text-[14px] text-slate-700">{item.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[#9aa486] font-bold">${item.price}</span>
                              <button onClick={() => handleDeleteProduct('services', index)} className="text-rose-400 hover:text-rose-600"><Trash size={14} /></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">加價購與周邊商品</h4>
                      <ul className="space-y-2 mb-4">
                        {priceList.addons?.map((item, index) => (
                          <li key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="font-bold text-[14px] text-slate-700">{item.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-indigo-500 font-bold">${item.price}</span>
                              <button onClick={() => handleDeleteProduct('addons', index)} className="text-rose-400 hover:text-rose-600"><Trash size={14} /></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><PlusCircle size={18} className="text-[#e3b5a1]" /> 新增商品項目</h4>
                    <form onSubmit={handleAddProduct} className="flex flex-col sm:flex-row gap-3">
                      <select value={newProduct.type} onChange={e => setNewProduct({ ...newProduct, type: e.target.value })} className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none font-bold">
                        <option value="services">基礎服務</option>
                        <option value="addons">加價購與周邊</option>
                      </select>
                      <input type="text" placeholder="輸入商品名稱" required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="flex-1 p-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" />
                      <input type="number" placeholder="價格 (NT$)" required value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="w-32 p-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" />
                      <button type="submit" className="bg-[#192039] text-[#e3b5a1] font-bold px-6 py-2.5 rounded-lg shadow hover:bg-slate-800 transition-colors">新增</button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'blacklist' && (
              <div className="space-y-6 animate-in fade-in p-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><ShieldAlert className="text-rose-500" /> 系統黑名單管理</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                  <p className="text-sm text-slate-500 mb-4">被列入黑名單的客戶，將無法透過前台系統進行線上預約。您可以在此集中管理這些名單。</p>

                  {blacklistedList.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed">目前系統中沒有任何黑名單客戶。</div>
                  ) : (
                    <div className="space-y-3">
                      {blacklistedList.map((client, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-rose-50/50 rounded-xl border border-rose-100 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-800">{client.name}</span>
                              <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-bold">{client.phone}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border border-rose-100 inline-block w-full sm:w-auto">
                              <strong>備註原因：</strong>{client.memo}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleOpenHistoryModal(client.phone)} className="text-xs bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg font-bold transition-all shadow-sm">
                              查看歷史紀錄
                            </button>
                            <button onClick={() => handleRemoveBlacklist(client.phone, client.memo)} className="text-xs bg-rose-500 text-white hover:bg-rose-600 px-3 py-2 rounded-lg font-bold transition-all shadow-sm">
                              解除黑名單
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminTab === 'team' && currentUser?.role === 'admin' && (
              <div className="space-y-6 animate-in fade-in p-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><UserPlus className="text-[#9aa486]" /> 顧問與團隊管理</h3>
                <button onClick={handleToggleAdminVisibility} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors border border-slate-300 shadow-sm">
                 {isAdminHidden ? '👁️ 顯示 admin 帳號' : '🛡️ 隱藏 admin 帳號'}
                 </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border md:col-span-1 h-fit">
                    <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><PlusCircle size={18} /> 新增團隊成員</h4>
                    <form onSubmit={handleAddAdvisor} className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-600 mb-1">登入帳號</label><input type="text" required value={newAdvisor.id} onChange={e => setNewAdvisor({ ...newAdvisor, id: e.target.value.toLowerCase() })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" placeholder="例如: kevin" /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1">顯示名稱</label><input type="text" required value={newAdvisor.name} onChange={e => setNewAdvisor({ ...newAdvisor, name: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" placeholder="例如: Kevin" /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1">登入密碼</label><input type="text" required value={newAdvisor.pwd} onChange={e => setNewAdvisor({ ...newAdvisor, pwd: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" placeholder="設定初始密碼" /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1">系統權限</label>
                        <select value={newAdvisor.role} onChange={e => setNewAdvisor({ ...newAdvisor, role: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]">
                          <option value="advisor">一般顧問</option><option value="admin">管理員</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-3 rounded-xl shadow-md mt-2 flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors"><Plus size={16} /> 確認新增</button>
                    </form>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border md:col-span-2">
                    <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><Users size={18} /> 目前團隊帳號名單</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead><tr className="border-b text-slate-500"><th className="pb-3 font-bold pl-2">顯示名稱</th><th className="pb-3 font-bold">帳號</th><th className="pb-3 font-bold">密碼 (點擊修改)</th><th className="pb-3 font-bold">角色</th><th className="pb-3 font-bold text-right pr-2">操作</th></tr></thead>
                        <tbody>
                          {displayTeam.map(m => (
                            <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="py-3 font-bold text-slate-700 pl-2">{m.name}</td><td className="py-3 text-slate-600">{m.id}</td>
                              <td className="py-3 text-slate-600 font-mono text-xs">
                                <div className="flex items-center gap-2"><span>{m.pwd}</span>
                                  <button onClick={() => {
                                    const newPwd = window.prompt(`請為 ${m.name} 重新設定新密碼：\n(目前密碼: ${m.pwd})`, m.pwd);
                                    if (newPwd !== null && newPwd.trim() !== "" && newPwd !== m.pwd) handleUpdatePassword(m.id, newPwd.trim());
                                  }} className="text-slate-400 hover:text-indigo-600 p-1 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded transition-colors shadow-sm"><Edit2 size={12} /></button>
                                </div>
                              </td>
                              <td className="py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${m.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{m.role === 'admin' ? '管理員' : '顧問'}</span></td>
                              <td className="py-3 text-right pr-2">
                                {m.id !== 'ted' ? (<button onClick={() => handleDeleteAdvisor(m.id, m.name)} className="text-rose-500 hover:bg-rose-100 p-2 rounded-lg transition-colors shadow-sm border border-rose-100"><Trash size={16} /></button>) : (<span className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded">最高權限</span>)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'analytics' && currentUser.role === 'admin' && (
              <div className="space-y-6 animate-in fade-in p-6">
                <div className="flex justify-between items-center border-b pb-4"><h3 className="text-xl font-bold flex items-center gap-2"><BarChart className="text-indigo-600" /> 營業營收儀表板</h3></div>
                <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border">
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border rounded-lg font-bold">
                    {availableMonths.map(m => <option key={m} value={m}>{m} 月份</option>)}
                  </select>
                  <div className="flex gap-2 flex-wrap">
                    {teamMembers.map(m => (
                      <button key={m.id} onClick={() => setSelectedAnalyticsAdvisors(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-transparent ${selectedAnalyticsAdvisors.includes(m.id) ? 'bg-[#192039] text-[#e3b5a1] border-[#192039] shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{m.name}</button>
                    ))}
                  </div>
                </div>
                {analyticsData && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-[#192039] to-[#232d4e] p-5 rounded-2xl shadow-sm border border-[#192039] text-center">
                        <p className="text-[#e3b5a1] text-xs font-bold mb-1">總預估產值 (NT$)</p><h2 className="text-3xl font-extrabold text-white">${(analyticsData.kpi.totalHours * SESSION_PRICE).toLocaleString()}</h2>
                      </div>
                      <div className="bg-white p-5 rounded-2xl shadow-sm border text-center">
                        <p className="text-slate-500 text-xs font-bold mb-1">總接單數</p><h2 className="text-3xl font-extrabold text-[#192039]">{analyticsData.kpi.total}</h2>
                      </div>
                      <div className="bg-blue-50 p-5 rounded-2xl shadow-sm border border-blue-200 text-center">
                        <p className="text-blue-600 text-xs font-bold mb-1">服務總時數 (hr)</p><h2 className="text-3xl font-extrabold text-[#192039]">{analyticsData.kpi.totalHours}</h2>
                      </div>
                      <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 text-center">
                        <p className="text-amber-600 text-xs font-bold mb-1">新舊客佔比</p><h2 className="text-lg font-extrabold text-amber-700 mt-2">新 {analyticsData.kpi.new} : 舊 {analyticsData.kpi.return}</h2>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border mt-6">
                      <h4 className="font-bold flex items-center gap-2 mb-4 text-lg"><Users className="text-blue-500" /> 顧問績效與工時統計表</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead><tr className="border-b text-slate-500"><th className="pb-3 font-bold">顧問名稱</th><th className="pb-3 font-bold text-center">接單數</th><th className="pb-3 font-bold text-center">總工時 (小時)</th><th className="pb-3 font-bold text-right">該顧問貢獻產值 (NT$)</th></tr></thead>
                          <tbody>
                            {teamMembers.map(m => {
                              const stats = analyticsData.advisorStats[m.id] || { count: 0, hours: 0 };
                              const revenue = stats.hours * SESSION_PRICE;
                              if (stats.count === 0) return null;
                              return (
                                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="py-4 font-bold text-slate-700 text-[15px]">{m.name}</td><td className="py-4 text-center font-medium text-slate-600">{stats.count} 單</td>
                                  <td className="py-4 text-center font-bold text-blue-600 text-[15px]">{stats.hours} hr</td><td className="py-4 text-right font-bold text-green-600 text-[15px]">${revenue.toLocaleString()}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {adminTab === 'appointments' && (
              <div className="space-y-4 p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-4 gap-4 flex-wrap">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Clipboard className="text-[#9aa486]" /> 預約戰情室</h3>
                  <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button onClick={() => setApptFilter('today')} className={`px-4 py-1.5 rounded-lg text-[13px] font-bold ${apptFilter === 'today' ? 'bg-white shadow' : 'text-slate-500'}`}>今日</button>
                    <button onClick={() => setApptFilter('upcoming')} className={`px-4 py-1.5 rounded-lg text-[13px] font-bold ${apptFilter === 'upcoming' ? 'bg-white shadow' : 'text-slate-500'}`}>未來</button>
                    <button onClick={() => setApptFilter('past')} className={`px-4 py-1.5 rounded-lg text-[13px] font-bold ${apptFilter === 'past' ? 'bg-white shadow' : 'text-slate-500'}`}>歷史 (已完成)</button>
                  </div>
                </div>
                {displayAppointments.map(appt => (
                  <div key={appt.id} className="border p-5 bg-white rounded-2xl shadow-sm flex flex-col gap-3 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${appt.customerType === '初次預約' ? 'bg-amber-400' : 'bg-[#9aa486]'}`}></div>
                    <div className="pl-2">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-bold text-lg">{appt.name}</span><span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-600">{appt.customerType}</span>
                        <span className="bg-[#192039] text-[#e3b5a1] px-2 py-0.5 rounded text-xs font-bold tracking-wider">{appt.date} {appt.exactDisplayTime}</span>
                      </div>
                      <div className="text-[13px] font-bold text-slate-500 mb-2">{appt.serviceType} | 顧問: {appt.advisorName}</div>
                      {customerMemos[appt.phone] && (
                        <div className="text-xs bg-amber-50 text-amber-700 p-3 rounded-lg border border-amber-200 mb-2 leading-relaxed flex items-start gap-1.5 shadow-sm">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                          <span><strong className="font-bold">內部備忘錄：</strong>{customerMemos[appt.phone]}</span>
                        </div>
                      )}
                      {apptFilter !== 'past' && (
                        <button onClick={() => handleQuickCheckout(appt)} className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm w-fit">
                          <DollarSign size={12} /> 一鍵結帳
                        </button>
                      )}
                      {appt.needs && <div className="text-xs bg-slate-50 p-2.5 rounded border text-slate-600 mb-2 leading-relaxed">預約備註：{appt.needs}</div>}

                      <div className="flex gap-2 border-t border-slate-100 pt-3 mt-3 flex-wrap items-center justify-between">
                        <div className="flex gap-2">
                          <a href={`tel:${appt.phone}`} className="text-xs bg-green-50 border border-green-200 text-green-600 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"><Phone size={12} /> 撥打</a>
                          <button onClick={() => handleOpenHistoryModal(appt.phone)} className="text-xs bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all">
                            <Clipboard size={12} /> 查看歷史 & 備註
                          </button>
                          {apptFilter !== 'past' && <button onClick={() => handleDelete(appt)} className="text-xs bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"><Trash size={12} /> 取消</button>}
                        </div>
                        {apptFilter === 'past' && (
                          <button onClick={() => generatePostSessionAdvice(appt.id, appt.name, appt.serviceType, appt.needs)} className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm">
                            <Sparkles size={12} /> ✨ 產生課後溫馨建議
                          </button>
                        )}
                      </div>
                      {adviceMap[appt.id] && (
                        <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative group animate-in fade-in">
                          <p className="text-[13px] text-indigo-900 font-medium whitespace-pre-line leading-relaxed pb-6">{adviceMap[appt.id]}</p>
                          <button onClick={() => copyAdvice(appt.id)} className="absolute bottom-3 right-3 text-xs bg-white text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-50 flex items-center gap-1 shadow-sm transition-all"><Copy size={12} /> 複製訊息</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">📅 預約訂單管理 (本月)</h3>
                  <div className="space-y-3">
                    {appointments.filter(appt => appt.date >= `${new Date().toISOString().substring(0, 7)}-01`).length === 0 ? (
                      <p className="text-slate-500 text-center py-4">本月目前尚無預約記錄</p>
                    ) : (
                      appointments.filter(appt => appt.date >= `${new Date().toISOString().substring(0, 7)}-01`).map(appt => (
                        <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-[#9aa486] transition-colors">
                          <button onClick={() => handleOpenRebookModal(appt)} className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm"><CalendarPlus size={12} /> 現場預約下次</button>
                          <div className="mb-3 sm:mb-0 mt-3 sm:mt-0 flex-1 sm:ml-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-[#192039]">{appt.date}</span>
                              <span className="text-sm bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">{Array.isArray(appt.timeSlots) ? appt.timeSlots.join(', ') : appt.timeSlots}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${appt.status === '已取消' ? 'bg-red-100 text-red-600' : appt.status === '已完成' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{appt.status || '已預約'}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                              {appt.name} ({appt.phone}) - <span className="text-[#9aa486]">{appt.serviceType}</span>
                              <span className="ml-2 text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-bold">
                                指定：{appt.advisorName}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateApptStatus(appt, '已完成')} disabled={appt.status === '已完成' || appt.status === '已取消'} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-[#9aa486] text-white hover:bg-[#868f74] disabled:opacity-50">✓ 完成</button>
                            <button onClick={() => handleUpdateApptStatus(appt, '已取消')} disabled={appt.status === '已取消'} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50">✕ 取消</button>
                            {appt.status === '已取消' && (
                              <button onClick={async () => {
                                if (window.confirm(`⚠️ 確定要徹底刪除 ${appt.name} 的這筆廢單嗎？(刪除後無法恢復)`)) {
                                  try { await deleteDoc(doc(db, "appointments", appt.id)); } catch (error) { alert("刪除失敗：" + error.message); }
                                }
                              }} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-rose-600 transition-colors shadow-sm">🗑️ 刪除</button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

           {/* ▼▼▼ Google Calendar 樣式戰情室 ▼▼▼ */}
            {adminTab === 'calendar' && (
              <div className="space-y-4 p-4 md:p-6 animate-in fade-in h-full flex flex-col min-h-[750px]">
                {/* 頂部工具列 */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCalBaseDate(new Date())} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                      今天
                    </button>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                      <button onClick={() => setCalBaseDate(new Date(calBaseDate.setDate(calBaseDate.getDate() - (calViewMode === 'week' ? 7 : 1))))} className="p-1.5 rounded text-slate-500 hover:bg-white hover:shadow-sm transition-all">&lt;</button>
                      <button onClick={() => setCalBaseDate(new Date(calBaseDate.setDate(calBaseDate.getDate() + (calViewMode === 'week' ? 7 : 1))))} className="p-1.5 rounded text-slate-500 hover:bg-white hover:shadow-sm transition-all">&gt;</button>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-700 min-w-[150px]">
                      {calBaseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    {/* 權限控管：只有老闆可以看所有人，員工只能看自己 */}
                    {currentUser?.role === 'admin' && (
                      <select value={calTargetAdvisor} onChange={(e) => setCalTargetAdvisor(e.target.value)} className="p-2 text-sm font-bold border border-slate-200 rounded-lg outline-none bg-white shadow-sm flex-1 lg:flex-none">
                        <option value="all">👥 查看全團隊</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    )}
                    <div className="flex bg-slate-100 rounded-lg p-1 shrink-0">
                      <button onClick={() => setCalViewMode('week')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${calViewMode === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>週</button>
                      <button onClick={() => setCalViewMode('day')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${calViewMode === 'day' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>日</button>
                    </div>
                  </div>
                </div>

                {/* 網格區塊 (時間軸 + 日期欄) */}
                <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-sm flex custom-scrollbar relative">
                  
                  {/* 左側：固定時間軸 */}
                  <div className="w-16 shrink-0 border-r border-slate-200 bg-slate-50/50 pt-10">
                    {ALL_TIME_SLOTS.map((slot, i) => (
                      <div key={i} className="relative border-b border-slate-100 text-right pr-2 text-[10px] font-bold text-slate-400" style={{ height: `${SLOT_HEIGHT}px` }}>
                        <span className="absolute -top-2.5 right-2 bg-slate-50 px-1">{slot.split('-')[0]}</span>
                      </div>
                    ))}
                  </div>

                  {/* 右側：可滾動的日期欄位 */}
                  <div className="flex-1 flex overflow-x-auto min-w-[600px]">
                    {calendarDays.map((d, index) => {
                      const dateStr = d.toISOString().split('T')[0];
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                      // 篩選出該日的預約
                      const dayAppts = appointments.filter(a => {
                        if (a.date !== dateStr || a.status === '已取消') return false;
                        if (calTargetAdvisor !== 'all' && a.advisorId !== calTargetAdvisor) return false;
                        return true;
                      });

                      // 計算當前時間紅線高度
                      const nowHour = currentTimeLine.getHours();
                      const nowMin = currentTimeLine.getMinutes();
                      const nowTop = ((nowHour - START_HOUR) * 2 + (nowMin / 30)) * SLOT_HEIGHT;
                      const showNowLine = isToday && nowHour >= START_HOUR && nowHour < 22;

                      return (
                        <div key={dateStr} className="flex-1 min-w-[120px] border-r border-slate-200 relative">
                          
                          {/* 頂部日期標題 */}
                          <div className={`h-10 border-b border-slate-200 flex flex-col items-center justify-center sticky top-0 bg-white/90 backdrop-blur z-20 ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                            <span className="text-[10px] font-bold uppercase">{dayNames[d.getDay()]}</span>
                            <span className={`text-[15px] font-extrabold ${isToday ? 'bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}`}>
                              {d.getDate()}
                            </span>
                          </div>

                          {/* 日曆背景格子 (點擊代客預約) */}
                          <div className="relative w-full">
                            {ALL_TIME_SLOTS.map((slot) => {
                              // 檢查是否為排班時間 (若是排班，給予微綠底色)
                              const isWorking = schedules.find(s => s.date === dateStr && (calTargetAdvisor === 'all' || s.advisorId === calTargetAdvisor))?.slots?.includes(slot);
                              return (
                                <div 
                                  key={slot} 
                                  onClick={() => handleEmptySlotClick(dateStr, slot)}
                                  className={`border-b border-slate-100 cursor-pointer hover:bg-indigo-50 transition-colors ${isWorking ? 'bg-[#9aa486]/5' : ''}`}
                                  style={{ height: `${SLOT_HEIGHT}px` }} 
                                />
                              );
                            })}

                            {/* 預約事件方塊 (絕對定位) */}
                            {dayAppts.map(appt => {
                              if (!appt.timeSlots || appt.timeSlots.length === 0) return null;
                              const sortedSlots = [...appt.timeSlots].sort();
                              const startSlot = sortedSlots[0];
                              const [startHr, startMin] = startSlot.split('-')[0].split(':');
                              
                              const top = ((parseInt(startHr) - START_HOUR) * 2 + (parseInt(startMin) === 30 ? 1 : 0)) * SLOT_HEIGHT;
                              const height = sortedSlots.length * SLOT_HEIGHT;
                              const isFirstTime = appt.customerType === '初次預約';

                              return (
                                <div 
                                  key={appt.id} 
                                  onClick={(e) => { e.stopPropagation(); handleOpenRebookModal(appt); }}
                                  className={`absolute left-1 right-1 rounded-md p-1.5 text-xs shadow-sm cursor-pointer overflow-hidden border transition-all hover:shadow-md hover:scale-[1.02] ${
                                    isFirstTime ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-indigo-500 border-indigo-600 text-white'
                                  }`}
                                  style={{ top: `${top}px`, height: `${height - 2}px`, zIndex: 10 }}
                                >
                                  <div className="font-bold truncate">{appt.name}</div>
                                  <div className="opacity-80 text-[10px] truncate">{appt.serviceType}</div>
                                  {calTargetAdvisor === 'all' && <div className="mt-1 opacity-70 text-[9px] truncate">({appt.advisorName})</div>}
                                </div>
                              );
                            })}

                            {/* 走時紅線 */}
                            {showNowLine && (
                              <div className="absolute left-0 right-0 h-[2px] bg-red-500 z-30 pointer-events-none" style={{ top: `${nowTop}px` }}>
                                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {/* ▲▲▲ Google Calendar 樣式戰情室結束 ▲▲▲ */}

            {/* ▼▼▼ 原本的排班系統區塊 ▼▼▼ */}
            {adminTab === 'schedule' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6">
                <div className="xl:col-span-7 bg-white p-6 rounded-2xl shadow-sm border h-full flex flex-col">
                  {currentUser.role === 'admin' && (
                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <h3 className="text-[15px] font-bold mb-4 flex items-center gap-2 text-slate-800"><Users size={16} className="text-[#9aa486]" /> 顧問前台顯示狀態 (控制排班系統可見度)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {teamMembers.map(m => {
                          const isActive = activeAdvisors.includes(m.id);
                          return (
                            <div key={m.id} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                              <span className="text-[13px] font-bold text-slate-700">{m.name}</span>
                              <button type="button" onClick={() => handleToggleAdvisor(m.id)} className={`relative w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shadow-inner ${isActive ? 'bg-[#9aa486]' : 'bg-slate-300'}`}>
                                <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <select value={scheduleAdvisorId} onChange={e => setScheduleAdvisorId(e.target.value)} className="p-3 border border-slate-200 rounded-xl flex-1 font-bold outline-none focus:ring-2 focus:ring-[#e3b5a1]">
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="p-3 border border-slate-200 rounded-xl font-bold outline-none flex-1 sm:flex-none" min={new Date().toISOString().split('T')[0]} />
                  </div>
                  {renderTimeSection('早班 (10:00-14:00)', <Sun size={14} />, 10, 14, 'bg-amber-100', 'text-amber-700', 'border-amber-100')}
                  {renderTimeSection('午班 (14:00-18:00)', <Sun size={14} />, 14, 18, 'bg-orange-100', 'text-orange-700', 'border-orange-100')}
                  {renderTimeSection('晚班 (18:00-22:00)', <Moon size={14} />, 18, 22, 'bg-indigo-100', 'text-indigo-700', 'border-indigo-100')}

                  <div className="mt-auto border-t border-slate-100 pt-6">
                    <h4 className="font-bold text-[14px] text-slate-700 mb-3 flex items-center gap-1.5"><Copy size={16} className="text-[#e3b5a1]" /> 快速同步多日排班 (區間與點選)</h4>
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                      <div className="flex flex-1 gap-2">
                        <input type="date" value={rangeStartDate} onChange={e => setRangeStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-bold focus:ring-2 focus:ring-[#e3b5a1] outline-none w-full" placeholder="開始" />
                        <input type="date" value={rangeEndDate} onChange={e => setRangeEndDate(e.target.value)} min={rangeStartDate || new Date().toISOString().split('T')[0]} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-bold focus:ring-2 focus:ring-[#e3b5a1] outline-none w-full" placeholder="結束" />
                      </div>
                      <button type="button" onClick={handleBatchAddRange} className="bg-[#e3b5a1] hover:bg-[#d6a590] text-[#192039] px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"><Plus size={14} /> 區間全選</button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
                      {next28Days.map(dateStr => {
                        const { date, weekday } = getDayLabel(dateStr);
                        const isSelected = additionalDates.includes(dateStr);
                        const isMainDate = dateStr === scheduleDate;
                        return (
                          <button key={dateStr} onClick={() => toggleExtraDate(dateStr)} disabled={isMainDate} className={`py-2 rounded-lg border text-xs flex flex-col items-center transition-all ${isMainDate ? 'bg-slate-100 opacity-50 cursor-not-allowed' : isSelected ? 'bg-[#192039] text-[#e3b5a1] border-[#192039] shadow-md scale-105' : 'bg-slate-50 text-slate-500 hover:border-[#9aa486]'}`}>
                            <span className="opacity-70 mb-0.5 scale-90">週{weekday}</span><span className="font-bold">{date}</span>
                          </button>
                        );
                      })}
                    </div>
                    {additionalDates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[12px] text-slate-500 font-bold w-full flex justify-between items-center mb-1">
                          <span>已選同步日期 ({additionalDates.length} 天)：</span><button type="button" onClick={() => setAdditionalDates([])} className="text-rose-500 hover:underline">全部清空</button>
                        </span>
                        {additionalDates.map(d => (
                          <span key={d} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 shadow-sm">
                            {d} <button onClick={() => setAdditionalDates(additionalDates.filter(x => x !== d))} className="text-rose-400 hover:text-rose-600">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <button onClick={handleSaveSchedule} disabled={isSavingSchedule} className="w-full bg-[#9aa486] hover:bg-[#868f74] text-white font-bold py-4 rounded-xl transition-all shadow-md tracking-wider flex justify-center items-center gap-2">
                      <CheckCircle size={18} /> 儲存這 {1 + additionalDates.length} 天的排班
                    </button>
                  </div>
                </div>
                <div className="xl:col-span-5 bg-slate-100/80 rounded-2xl border border-slate-200 p-5 shadow-inner flex flex-col h-[750px]">
                  <div className="flex items-center gap-2 mb-5 border-b border-slate-200 pb-4">
                    <List size={18} className="text-[#8e6856]" /><h3 className="text-[16px] font-bold text-slate-800">班表總覽 ({teamMembers.find(m => m.id === scheduleAdvisorId)?.name})</h3>
                    <span className="ml-auto text-[11px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold">未來有 {advisorFutureSchedules.length} 天排班</span>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {advisorFutureSchedules.length === 0 ? (
                      <div className="text-center text-slate-400 py-32 flex flex-col items-center"><Calendar size={48} className="opacity-20 mb-4" /><p className="font-medium text-[13px]">目前尚無未來的排班</p></div>
                    ) : (
                      advisorFutureSchedules.map(sched => (
                        <div key={sched.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-[#e3b5a1] transition-all relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#9aa486]"></div>
                          <div className="pl-2">
                            <p className="font-bold text-[#192039] text-[14px] mb-1">{sched.date}</p>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[200px]">{formatTimeSlots(sched.slots)}</p>
                          </div>
                          <button onClick={() => handleDeleteFullDay(sched.id, sched.date)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-200 shrink-0 shadow-sm" title="刪除這天的班表"><Trash size={14} /></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            </div> 
          </div>
        )}

        {!currentUser && (
          <div className="flex justify-center pb-8 pt-4 relative z-10">
            <a href="https://www.instagram.com/_smart.recovery?igsh=MWxocGJqanEwa2Rhaw==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/50 hover:text-white transition-all text-sm font-bold bg-white/5 px-6 py-3 rounded-full border border-white/10 hover:bg-white/10 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              追蹤我們的 Instagram
            </a>
          </div>
        )}
        <BrandFooter />
      </div>

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
                      <button key={s.name} onClick={() => handleAddCartItem(s.name, s.price, 1, true)} className="bg-[#9aa486] text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm">
                        {s.name} (${s.price})
                      </button>
                    ))}
                  </div>
                  
                  <label className="block text-sm font-bold text-slate-600 mb-2">周邊商品與加價購 (點擊可自動累加)</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {priceList.addons?.map(a => (
                      <button key={a.name} onClick={() => handleAddCartItem(a.name, a.price, 1)} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm">
                        + {a.name} (${a.price})
                      </button>
                    ))}
                  </div>

                  <label className="block text-sm font-bold text-slate-600 mb-2">自訂商品新增</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="商品名稱" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" />
                    <input type="number" placeholder="單價$" value={customItem.price} onChange={e => setCustomItem({...customItem, price: e.target.value})} className="w-20 p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" />
                    <span className="self-center font-bold text-slate-400 text-sm">x</span>
                    <input type="number" min="1" placeholder="數量" value={customItem.qty} onChange={e => setCustomItem({...customItem, qty: e.target.value})} className="w-16 p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" />
                    <button onClick={handleAddCustomItem} className="bg-blue-500 hover:bg-blue-600 transition-colors text-white px-4 rounded-lg font-bold text-sm shadow-sm">加入</button>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <label className="block text-sm font-bold text-amber-800 mb-2">🧑‍⚕️ 本次收款人 (必選)</label>
                  <select value={calcAdvisor} onChange={(e) => setCalcAdvisor(e.target.value)} className="w-full text-lg p-3 border border-amber-300 rounded-lg font-bold text-slate-800 focus:ring-4 focus:ring-amber-200 outline-none transition-all bg-white">
                    <option value="" disabled>請選擇是誰收的錢...</option>
                    {teamMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">折扣 (10 代表不打折，8.5 代表 85折)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.1" value={calcDiscount} onChange={(e) => setCalcDiscount(e.target.value)} className="w-full text-2xl p-4 border border-slate-300 rounded-xl text-right font-bold text-slate-800 focus:ring-4 focus:ring-[#9aa486]/30 outline-none transition-all" />
                    <span className="text-2xl font-bold text-slate-600 whitespace-nowrap">折</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col h-full min-h-[400px]">
                <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-200 pb-3 flex justify-between items-center">
                  <span className="flex items-center gap-2">🧾 購物車明細</span>
                  <button onClick={() => setCart([])} className="text-xs text-rose-500 hover:underline font-normal">清空全部</button>
                </h4>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                  {cart.length === 0 && <p className="text-slate-400 text-sm text-center py-10">目前沒有加入任何項目</p>}
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-800">{item.name}</span>
                        <span className="text-xs text-slate-500">${item.price} x {item.qty}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700">${item.price * item.qty}</span>
                        <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-rose-400 hover:text-rose-600 p-1 bg-rose-50 rounded-md"><Trash size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t-2 border-slate-200 pt-5 mt-auto">
                  <div className="flex justify-between items-center mb-3 text-slate-500 font-bold">
                    <span>小計 (原價總額)：</span>
                    <span className="text-lg">${cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-end mb-6">
                    <span className="text-slate-600 font-bold text-xl">最終應收：</span>
                    <span className="text-5xl font-bold text-rose-600">${calcFinalAmount.toLocaleString()}</span>
                  </div>
                  <button onClick={() => { handleConfirmPayment(); setShowPOS(false); }} className="w-full bg-[#9aa486] hover:bg-[#868f74] text-white text-3xl font-bold py-6 rounded-2xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-3">💵 確認收款</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
{showRebookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-[#1E293B] text-white p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            
            {/* 關閉按鈕 */}
            <button 
              onClick={() => setShowRebookModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            
            {/* 標題 */}
            <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-4 flex items-center gap-2">
              <CalendarPlus className="text-[#9aa486]" /> 內部代客預約
            </h2>
            
            {/* 表單內容 */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1.5 text-slate-300">客人姓名 *</label>
                  <input 
                    type="text" 
                    className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" 
                    value={rebookCustomer.name} 
                    onChange={(e) => setRebookCustomer({...rebookCustomer, name: e.target.value})} 
                    placeholder="例如: 王大明" 
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-slate-300">聯絡電話</label>
                  <input 
                    type="tel" 
                    className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" 
                    value={rebookCustomer.phone} 
                    onChange={(e) => setRebookCustomer({...rebookCustomer, phone: e.target.value})} 
                    placeholder="09XX..." 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm mb-1.5 text-slate-300">指定顧問 (已為您帶入)</label>
                <select 
                  className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" 
                  value={rebookFormData.consultant} 
                  onChange={(e) => setRebookFormData({ ...rebookFormData, consultant: e.target.value, time: "" })}
                >
                  <option value="">請選擇顧問</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1.5 text-slate-300">選擇日期</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]} 
                  className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" 
                  value={rebookFormData.date} 
                  onChange={(e) => setRebookFormData({ ...rebookFormData, date: e.target.value, time: "" })} 
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1.5 text-slate-300">選擇時間</label>
                {!rebookFormData.date || !rebookFormData.consultant ? (
                  <div className="text-[13px] text-gray-400 bg-gray-800 p-3 rounded-lg text-center border-dashed border border-gray-600">
                    請先確認上方「顧問」與「日期」
                  </div>
                ) : rebookAvailableSlots.length === 0 ? (
                  <div className="text-[13px] text-rose-400 bg-rose-900/20 p-3 rounded-lg text-center border border-rose-900/50">
                    該顧問此日無空檔或未排班
                  </div>
                ) : (
                  <select 
                    className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" 
                    value={rebookFormData.time} 
                    onChange={(e) => setRebookFormData({...rebookFormData, time: e.target.value})}
                  >
                    <option value="">請選擇時段</option>
                    {rebookAvailableSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div>
                <label className="block text-sm mb-1.5 text-slate-300">預約項目 (已為您帶入上次項目)</label>
                <select 
                  className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" 
                  value={rebookFormData.service} 
                  onChange={(e) => setRebookFormData({...rebookFormData, service: e.target.value})}
                >
                  <option value="">請選擇項目</option>
                  {serviceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 按鈕區塊 */}
            <div className="mt-8 flex justify-end space-x-3">
              <button 
                className="px-4 py-2.5 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm font-bold" 
                onClick={() => setShowRebookModal(false)}
              >
                取消
              </button>
              <button 
                className="px-6 py-2.5 bg-[#9aa486] rounded-lg hover:bg-[#868f74] text-[#192039] font-bold transition-colors shadow-lg" 
                onClick={async () => {
                  // 1. 表單驗證
                  if(!rebookFormData.date || !rebookFormData.time || !rebookFormData.service || !rebookFormData.consultant) { 
                    alert("請填寫完整預約資料！"); 
                    return; 
                  }
                  
                  const finalAdvisorName = teamMembers.find(m => m.id === rebookFormData.consultant)?.name || '未指定';
                  
                  try {
                    // 2. 寫入 Firebase
                    await addDoc(collection(db, "appointments"), {
                      name: rebookCustomer.name, 
                      phone: rebookCustomer.phone, 
                      isFirstTime: 'no', 
                      advisorId: rebookFormData.consultant, 
                      advisorName: finalAdvisorName,
                      customerType: '舊客複診', 
                      serviceType: rebookFormData.service, 
                      date: rebookFormData.date, 
                      timeSlots: [rebookFormData.time], 
                      exactDisplayTime: rebookFormData.time,
                      gasTime: rebookFormData.time, 
                      needs: '現場預約下次', 
                      status: 'confirmed', 
                      createdAt: new Date().toISOString()
                    });
                    
                    // 3. 發送 Webhook (LINE 或其他通知)
                    if (typeof WEBHOOK_URL === 'string' && WEBHOOK_URL.startsWith("http")) {
                      fetch(WEBHOOK_URL, {
                        method: 'POST', 
                        mode: 'no-cors', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          action: "new", 
                          name: rebookCustomer.name, 
                          date: rebookFormData.date, 
                          time: rebookFormData.time, 
                          service: `[舊客複診] ${rebookFormData.service} (指定：${finalAdvisorName})`, 
                          phone: rebookCustomer.phone, 
                          needs: "現場直接預約下次" 
                        })
                      });
                    }
                    
                    // 4. 成功回饋
                    alert("✅ 現場預約大成功！資料已同步至戰情室與 LINE。"); 
                    setShowRebookModal(false); 

                  } catch (error) { 
                    alert("預約失敗，請稍後再試：" + error.message); 
                  }
                }}
              >
                確認送出預約
              </button>
            </div>
          </div>
  </div>
      )}
    </div>
  )
