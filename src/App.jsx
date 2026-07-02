import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Calendar, User, Clock, Activity, Trash, PlusCircle, CheckCircle, AlertCircle, MessageCircle, MessageSquare, Clipboard, Lock, Users, LogOut, Key, Copy, Plus, List, Sun, Moon, Settings, Phone, Check, Filter, BarChart, Star, Crown, Bot, Sparkles, RefreshCw, DollarSign, Download, CalendarPlus, Inbox, AlertTriangle, FileText, UserPlus, Edit2, ShieldAlert, ShoppingBag, Zap, Ticket, Package, Trash2 } from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, setDoc, onSnapshot, query, writeBatch, updateDoc, getDocs, where } from "firebase/firestore";

// ==============================================
// ⚙️ Firebase 初始化防護與設定
// ==============================================
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

// ==============================================
// 📌 常數與預設資料
// ==============================================
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

// ==============================================
// 🧩 獨立共用子元件
// ==============================================

const BrandFooter = () => (
  <footer className="w-full text-center px-4 py-8 text-xs text-white/40 relative z-10 space-y-1">
    <p>© {new Date().getFullYear()} Smart Recovery</p>
    <p>官方聯絡信箱：smartrecovery.studio@gmail.com</p>
    <p>服務預約：請透過上方 LINE 官方帳號</p>
  </footer>
);

const BookingDisclaimer = () => {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handlePopState = (event) => {
      // 邏輯：偵測到滑動返回時，檢查是否有視窗開啟，有的話就優先關閉視窗
      if (showPOS) {
        setShowPOS(false);
      } else if (showHistoryModal) {
        setShowHistoryModal(null);
      } else if (showRebookModal) {
        setShowRebookModal(false);
      } else if (editingAppt) {
        setEditingAppt(null);
      } else if (editingRevenue) {
        setEditingRevenue(null);
      } else {
        // 如果沒有視窗開著，才允許滑動離開頁面（或是你也可以選擇什麼都不做，直接擋住）
        return; 
      }
      
      // 關鍵：這行是為了讓歷史紀錄保持在系統認為「我還在 App 裡」的狀態
      window.history.pushState(null, '', window.location.href);
    };

    // 初始化時先塞入一個紀錄
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPOS, showHistoryModal, showRebookModal, editingAppt, editingRevenue]);

  return (
    <div className="bg-[#f4faec] border border-[#9aa486] rounded-2xl p-5 sm:p-6 mb-6 shadow-sm text-slate-700 text-left transition-all">
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-xl font-bold text-[#192039] flex items-center gap-2 m-0">
          🌿 智理 Smart Recovery 專屬預約小叮嚀
        </h3>
        <button className="text-[#9aa486] font-bold bg-white px-3 py-1.5 rounded-lg border border-[#9aa486]/30 hover:bg-[#9aa486] hover:text-white transition-colors">
          {isOpen ? '▲ 收合' : '▼ 展開詳情'}
        </button>
      </div>
      
      {isOpen && (
        <div className="mt-5 animate-in fade-in slide-in-from-top-2">
          <p className="font-bold mb-4 text-base sm:text-lg">【歡迎來到 ✨智理運動恢復 Smart Recovery✨ 】</p>
          <p className="text-base sm:text-lg leading-relaxed mb-6">
            為了給您最完整、專屬的陪伴與動作優化體驗，我們採全預約制。以下為您準備了預約小叮嚀，希望能保障您的最高服務品質：
          </p>
          <div className="space-y-5 text-base sm:text-lg leading-relaxed">
            <div className="bg-white/60 p-4 rounded-xl">
              <h4 className="font-bold text-[#192039] mb-1">1. 關於時間與遲到（把最棒的狀態留給自己）</h4>
              <p>您的專屬時段是我們為您精心預留的。如果您不小心遲到了，為了不壓縮到下一位朋友的權益，我們的服務還是會在原定時間結束喔（費用將維持原預約時段計算）。建議您提早 5-10 分鐘抵達，先喝口水、喘口氣，讓身體在最放鬆的狀態下開始！</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl">
              <h4 className="font-bold text-[#192039] mb-1">2. 關於行程變更（謝謝您的體諒）</h4>
              <p>我們完全理解生活中總有突發狀況！若您的行程有異動，麻煩您最晚於預約時間的 <span className="text-rose-600 font-bold">24 小時前</span> 透過系統或官方 LINE 告訴我們，讓我們能把這個時段安排給其他同樣需要幫助的朋友。</p>
              <p className="mt-2 text-sm sm:text-base text-slate-500 font-bold">⚠️ 提醒您，若有「無故未到」或「24 小時內臨時取消」累計達 2 次的狀況，未來可能就只能麻煩您當天碰碰運氣、預約當日的空檔了，非常感謝您的體諒與配合！</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl">
              <h4 className="font-bold text-[#192039] mb-1">3. 我們的專業承諾</h4>
              <p>智理專注於「動作評估、健康促進與高階運動恢復」，非屬傳統醫療診斷與治療行為。若在評估過程中，發現您的身體需要進一步的醫療協助，我們也會為您提供最專業的轉介建議，陪您一起找到最適合的健康方案。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const getBossAnalytics = (records) => {
  if (!records || !Array.isArray(records)) return {};
  return records.reduce((acc, curr) => {
    if (!curr || !curr.date) return acc;
    const dateObj = new Date(curr.date);
    if (isNaN(dateObj.getTime())) return acc;

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}-${month}`;

    if (!acc[yearMonth]) acc[yearMonth] = { total: 0, new: 0, return: 0, cancelled: 0 };
    if (curr.status === '已取消' || curr.status === '取消') { 
      acc[yearMonth].cancelled += 1; 
      return acc; 
    }
    
    acc[yearMonth].total += 1;
    if (curr.customerType === '首次評估') acc[yearMonth].new += 1; 
    else acc[yearMonth].return += 1;
    
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
  for (let h = 9; h <= 22; h++) {
    const startH = String(h).padStart(2, '0');
    const nextH = String(h + 1).padStart(2, '0');
    slots.push(`${startH}:00-${startH}:30`);
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
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM);
  const [customers, setCustomers] = useState([]); // 已經修復第一階段

  const [depositPlans, setDepositPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({ label: '', sessions: '', defaultPrice: '' });
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editPlanForm, setEditPlanForm] = useState({ label: '', sessions: '', defaultPrice: '' });

  const [editingAppt, setEditingAppt] = useState(null);
  const [editFormData, setEditFormData] = useState({ date: '', timeSlots: [], advisorId: '' });

  const editAvailableSlots = useMemo(() => {
    if (!editFormData.date || !editFormData.advisorId) return [];
    const dailySchedule = schedules.find(s => s.advisorId === editFormData.advisorId && s.date === editFormData.date);
    if (!dailySchedule || !dailySchedule.slots) return [];
    
    const bookedSlots = appointments.filter(a => 
      a.advisorId === editFormData.advisorId && 
      a.date === editFormData.date && 
      a.status !== '已取消' &&
      a.id !== editingAppt?.id
    ).flatMap(a => a.timeSlots || []);
    
    return dailySchedule.slots.filter(slot => !bookedSlots.includes(slot)).sort();
  }, [editFormData.date, editFormData.advisorId, schedules, appointments, editingAppt]);

  const [isAdminHidden, setIsAdminHidden] = useState(false);
  const [isManualLogin, setIsManualLogin] = useState(false);
  
  const [activeAdvisors, setActiveAdvisors] = useState(DEFAULT_TEAM.map(m => m.id));
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ account: 'ted', password: '' });
  
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetForm, setResetForm] = useState({ account: 'jerry', authCode: '', newPwd: '' });
  
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [userNewPwd, setUserNewPwd] = useState('');
  const [appMode, setAppMode] = useState('booking');

  const [payrollSnapshots, setPayrollSnapshots] = useState({});
  const handleTogglePaid = async (advisorId, month, currentStats) => {
    const docId = `${advisorId}_${month}`;
    const isLocked = !!payrollSnapshots[docId];

    if (isLocked) {
      if (window.confirm("確定要取消「已發放」狀態嗎？\n這將解除歷史快照鎖定，該月薪資將隨最新規則重新計算。")) {
        await deleteDoc(doc(db, "payroll_snapshots", docId));
      }
    } else {
      if (window.confirm("💰 標記發放後，系統將永久鎖定此月份的薪資數字（建立歷史快照）。\n未來即使更改抽成率，此月份數字也不會變動。確定結算嗎？")) {
        await setDoc(doc(db, "payroll_snapshots", docId), {
          advisorId,
          month,
          laborPay: currentStats.laborPay,
          bonus: currentStats.bonus,
          totalSalary: currentStats.totalSalary,
          regularRate: currentStats.regularRate,
          designatedRate: currentStats.designatedRate,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  const [calViewMode, setCalViewMode] = useState('week');
  const [calBaseDate, setCalBaseDate] = useState(new Date());
  const [calTargetAdvisor, setCalTargetAdvisor] = useState(currentUser?.role === 'admin' ? 'all' : currentUser?.id);
  const [currentTimeLine, setCurrentTimeLine] = useState(new Date());

  const SLOT_HEIGHT = 48; 
  const START_HOUR = 9;

  const getSavedCustomer = () => {
    try { const saved = localStorage.getItem('smartRecoveryCustomer'); return saved ? JSON.parse(saved) : { name: '', phone: '' }; }
    catch { return { name: '', phone: '' }; }
  };
  const savedInfo = getSavedCustomer();

  const [showRebookModal, setShowRebookModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [memoInput, setMemoInput] = useState('');
  const [statusInput, setStatusInput] = useState('active');
  const [rebookCustomer, setRebookCustomer] = useState({ name: "", phone: "" });
  const [rebookFormData, setRebookFormData] = useState({ date: "", time: "", service: "", consultant: "" });
  const [formData, setFormData] = useState({
    name: savedInfo.name, phone: savedInfo.phone, isFirstTime: '', advisorId: '', date: '', timeSlots: [], serviceType: '', needs: '',
    painLevel: 5, bodyParts: []
  });

  const [conflictError, setConflictError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminTab, setAdminTab] = useState('appointments');
const [newAdvisor, setNewAdvisor] = useState({ id: '', name: '', pwd: '', role: 'advisor', commissionRate: 50 });

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
  const [isDesignated, setIsDesignated] = useState(false);
  const [revenueRecords, setRevenueRecords] = useState([]);
  const [priceList, setPriceList] = useState({ services: [], addons: [] });
  const [newProduct, setNewProduct] = useState({ type: 'services', name: '', price: '', commission: '' });

  const [expandedRevCustomer, setExpandedRevCustomer] = useState(null);
  const [editingRevenue, setEditingRevenue] = useState(null);

  const [aiInput, setAiInput] = useState('');
  const [aiRec, setAiRec] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [adviceMap, setAdviceMap] = useState({});

  // ✨ 層級二：彈出視窗的滑動攔截器 (History API 邏輯攔截)
  useEffect(() => {
    // 1. 偵測目前是否有任何「主要的彈出視窗」正在開啟
    const isAnyModalOpen = showPOS || showHistoryModal || showRebookModal || editingAppt || editingRevenue || showLoginModal || showResetPwdModal || showPwdModal;
    
    if (isAnyModalOpen) {
      // 2. 如果有視窗開啟，就塞入一個「假的」歷史紀錄作為緩衝
      window.history.pushState({ modalOpen: true }, '');
    }

    // 3. 監聽 iPad / 手機系統的「滑動返回」事件
    const handlePopState = () => {
      // 只要觸發滑動返回，就強制關閉所有彈出視窗
      setShowPOS(false);
      setShowHistoryModal(null);
      setShowRebookModal(false);
      setEditingAppt(null);
      setEditingRevenue(null);
      setShowLoginModal(false);
      setShowResetPwdModal(false);
      setShowPwdModal(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPOS, showHistoryModal, showRebookModal, editingAppt, editingRevenue, showLoginModal, showResetPwdModal, showPwdModal]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeLine(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const isLineApp = navigator.userAgent.includes('Line');
    const hasExternalParam = window.location.search.includes('openExternalBrowser=1');
    if (isLineApp && !hasExternalParam) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('openExternalBrowser', '1');
      window.location.href = newUrl.toString();
    }
  }, []);

  useEffect(() => {
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
        setIsAdminHidden(docSnap.data().isAdminHidden || false);
      }
    });

    const unsubMemos = onSnapshot(query(collection(db, "customerMemos")), (snapshot) => {
  const memos = {};
  snapshot.forEach(doc => { memos[doc.id] = doc.data(); }); // 改為存入完整物件
  setCustomerMemos(memos);
});

   const unsubTeam = onSnapshot(collection(db, "users"), (snapshot) => {
      if (snapshot.empty) {
        DEFAULT_TEAM.forEach(member => {
          setDoc(doc(db, "users", member.id), member);
        });
      } else {
        const members = [];
        let hasAdmin = false;
        snapshot.forEach(docSnap => {
          members.push({ id: docSnap.id, ...docSnap.data() });
          if (docSnap.id === 'admin') hasAdmin = true;
        });

        if (!hasAdmin) {
          const adminData = { id: 'admin', name: '最高管理員 (安全模式)', pwd: 'admin', role: 'admin' };
          setDoc(doc(db, "users", "admin"), adminData);
          members.push(adminData);
        }
        setTeamMembers(members);
      }
    });

    const unsubRevenue = onSnapshot(query(collection(db, "revenueRecords")), (snapshot) => {
      const records = [];
      snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
      setRevenueRecords(records);
    });

    const unsubPriceList = onSnapshot(doc(db, "settings", "priceList"), (docSnap) => {
      if (docSnap.exists()) {
        setPriceList(docSnap.data());
      } else {
        const defaultList = {
          services: [{ name: '標準單堂', price: 1600 }, { name: '首次評估', price: 2000 }],
          addons: [{ name: '加時半小', price: 800 }, { name: '專業肌貼', price: 150 }, { name: '筋膜球', price: 350 }, { name: '能量飲', price: 80 }]
        };
        setDoc(doc(db, "settings", "priceList"), defaultList);
        setPriceList(defaultList);
      }
    });

    const unsubPlans = onSnapshot(collection(db, "deposit_plans"), (snapshot) => {
      const plans = [];
      snapshot.forEach(doc => plans.push({ id: doc.id, ...doc.data() }));
      setDepositPlans(plans.sort((a, b) => a.sessions - b.sessions));
    });

// 🌟 修正第一階段：加上客戶的監聽器
    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      const custList = [];
      snapshot.forEach(doc => {
        custList.push({ id: doc.id, ...doc.data() });
      });
      setCustomers(custList);
    });

    // ✨ 薪資快照監聽器
    const unsubSnapshots = onSnapshot(collection(db, "payroll_snapshots"), (snapshot) => {
      const snaps = {};
      snapshot.forEach(doc => { snaps[doc.id] = doc.data(); });
      setPayrollSnapshots(snaps);
    });

    return () => { 
      unsubAppt(); 
      unsubSched(); 
      unsubSettings(); 
      unsubMemos(); 
      unsubTeam(); 
      unsubRevenue(); 
      unsubPriceList(); 
      unsubPlans(); 
      unsubCustomers();
      unsubSnapshots(); // ✨ 關閉快照監聽
    };
    
  }, []);

  useEffect(() => { setSelectedAnalyticsAdvisors(teamMembers.map(m => m.id)); }, [teamMembers]);

  useEffect(() => {
    if (scheduleAdvisorId && scheduleDate) {
      const existing = schedules.find(s => s.advisorId === scheduleAdvisorId && s.date === scheduleDate);
      setSelectedSlots(existing ? existing.slots : []); setAdditionalDates([]);
    }
  }, [scheduleAdvisorId, scheduleDate, schedules]);

  const monthlyRevenuesByCustomer = useMemo(() => {
    const filtered = revenueRecords.filter(r => r.date && r.date.startsWith(selectedMonth));
    const groups = {};
    filtered.forEach(r => {
      let cName = "一般現場客";
      const baseItem = (r.items || []).find(i => i.isBase || i.name.includes('('));
      if (baseItem) {
        const match = baseItem.name.match(/\(([^)]+)\)/);
        if (match) cName = match[1];
      }
      if (!groups[cName]) groups[cName] = { total: 0, records: [] };
      groups[cName].records.push(r);
      groups[cName].total += r.finalAmount;
    });
    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [revenueRecords, selectedMonth]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const calcFinalAmount = Math.round(cartTotal * (Number(calcDiscount) || 10) / 10);

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


  const handleUpdateRevenue = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "revenueRecords", editingRevenue.id), {
        finalAmount: Number(editingRevenue.finalAmount),
        advisorId: editingRevenue.advisorId,
        date: editingRevenue.date
      }, { merge: true });
      setEditingRevenue(null);
      alert("✅ 營收紀錄修改成功！");
    } catch (err) { alert("修改失敗：" + err.message); }
  };

  const handleDeleteRevenue = async (id) => {
    if (window.confirm("⚠️ 確定要刪除這筆營收紀錄嗎？\n(刪除後將從本月報表中永久移除，無法復原)")) {
      try {
        await deleteDoc(doc(db, "revenueRecords", id));
        alert("🗑️ 已成功刪除！");
      } catch (err) { alert("刪除失敗：" + err.message); }
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const user = teamMembers.find(u => u.id === loginForm.account && u.pwd === loginForm.password);
    if (user) {
      setCurrentUser(user); setScheduleAdvisorId(user.id); setShowLoginModal(false);
      setLoginForm({ account: teamMembers[0]?.id || 'ted', password: '' }); setApptFilter('today'); setAdminViewAdvisor('all');
      setCalTargetAdvisor(user.role === 'admin' ? 'all' : user.id);
    } else { alert("密碼錯誤！請重新輸入。"); }
  };

  const handleLogout = () => { setCurrentUser(null); setAdminTab('appointments'); setAdditionalDates([]); setRangeStartDate(''); setRangeEndDate(''); };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetForm.authCode !== '950901') { 
      return alert("⚠️ 授權碼錯誤，請聯繫 Ted 執行長！");
    }
    try {
      await setDoc(doc(db, "users", resetForm.account), { pwd: resetForm.newPwd }, { merge: true });
      alert("✅ 密碼已重設成功！");
      setShowResetPwdModal(false);
      setResetForm({ account: 'jerry', authCode: '', newPwd: '' });
    } catch (err) { alert("重設失敗：" + err.message); }
  };

  const handleUpdatePassword = async (targetId, newPassword) => {
    if (!newPassword.trim()) return alert("密碼不能為空！");
    try {
      await setDoc(doc(db, "users", targetId), { pwd: newPassword.trim() }, { merge: true });
      alert("✅ 密碼更新成功！");
      if (currentUser.id === targetId) {
        setCurrentUser(prev => ({ ...prev, pwd: newPassword.trim() })); setShowPwdModal(false); setUserNewPwd('');
      }
    } catch (err) { alert("密碼更新失敗：" + err.message); }
  };

const handleUpdateCommission = async (targetId, newRate) => {
    const rate = Number(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return alert("請輸入 0 ~ 100 之間的有效數字！");
    try {
      await setDoc(doc(db, "users", targetId), { commissionRate: rate }, { merge: true });
      alert("✅ 抽成率更新成功！報表已自動重新計算薪資。");
    } catch (err) { alert("更新失敗：" + err.message); }
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

const handleAddProduct = async (e) => {
  e.preventDefault();
  if (!newProduct.name || !newProduct.price) return;
  const updatedList = { ...priceList };
  updatedList[newProduct.type] = [...(updatedList[newProduct.type] || []), { 
    name: newProduct.name, 
    price: Number(newProduct.price),
    commission: Number(newProduct.commission) || 0 // 👈 新增寫入抽成金
  }];
  try {
    await setDoc(doc(db, "settings", "priceList"), updatedList);
    setNewProduct({ type: newProduct.type, name: '', price: '', commission: '' });
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

  const handleAddPlan = async (e) => {
    e.preventDefault();
    if (!newPlan.label || !newPlan.sessions || !newPlan.defaultPrice) return alert("請完整填寫方案名稱、堂數與價格！");
    try {
      await addDoc(collection(db, "deposit_plans"), {
        label: newPlan.label,
        sessions: Number(newPlan.sessions),
        defaultPrice: Number(newPlan.defaultPrice)
      });
      setNewPlan({ label: '', sessions: '', defaultPrice: '' });
      alert('✅ 儲值方案新增成功！前台將會自動同步。');
    } catch (err) { alert('新增失敗: ' + err.message); }
  };

  const handleDeletePlan = async (id, label) => {
    if (!window.confirm(`確定要刪除「${label}」嗎？\n這將會從前台收銀選項中移除。`)) return;
    try {
      await deleteDoc(doc(db, "deposit_plans", id));
    } catch (err) { alert('刪除失敗: ' + err.message); }
  };

  const handleSaveEditPlan = async (id) => {
    if (!editPlanForm.label || !editPlanForm.sessions || !editPlanForm.defaultPrice) return alert("資料不能為空！");
    try {
      await updateDoc(doc(db, "deposit_plans", id), {
        label: editPlanForm.label,
        sessions: Number(editPlanForm.sessions),
        defaultPrice: Number(editPlanForm.defaultPrice)
      });
      setEditingPlanId(null);
      alert('✅ 方案修改成功！');
    } catch (err) { alert('修改失敗: ' + err.message); }
  };

const handleAddCartItem = (name, price, qty, isBase = false, commission = 0) => {
  setCart(prev => {
    let newCart = [...prev];
    if (isBase) newCart = newCart.filter(item => !item.isBase);
    const existingIdx = newCart.findIndex(item => item.name === name && item.price === Number(price));
    if (existingIdx >= 0 && !isBase) {
      newCart[existingIdx].qty += Number(qty);
    } else {
      // 👈 結帳時將專屬抽成金 (commission) 綁定進購物車明細
      newCart.push({ id: Date.now() + Math.random(), name, price: Number(price), qty: Number(qty), isBase, commission: Number(commission) });
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

const handleConfirmPayment = async () => {
    if (cart.length === 0 || cartTotal <= 0) return alert('請先加入商品或服務項目！');
    if (!calcAdvisor) return alert('⚠️ 請先選擇「本次收款人」是誰，才能結帳喔！');
    const newRecord = {
      date: new Date().toISOString(),
      originalPrice: cartTotal, discount: Number(calcDiscount),
      finalAmount: calcFinalAmount, advisorId: calcAdvisor,
      items: cart,
      isDesignated: isDesignated // 👈 存入這筆是否為指定客
    };
    try {
      await addDoc(collection(db, "revenueRecords"), newRecord);
      setCart([]); setCalcDiscount('10'); setIsDesignated(false); // 👈 結帳完重置
      const advisorName = teamMembers.find(m => m.id === calcAdvisor)?.name || '未知';
      alert(`✅ 收款成功！已自動存入雲端\n經手人：${advisorName}\n入帳金額：$${calcFinalAmount} 元`);
      setShowPOS(false);
    } catch (err) {
      alert("結帳失敗，請檢查網路：" + err.message);
    }
  };

const handleQuickCheckout = (appt) => {
    const validAdvisor = teamMembers.find(m => m.id === appt.advisorId);
    setCalcAdvisor(validAdvisor ? validAdvisor.id : '');
    
    // 👈 自動判斷：如果預約時有選特定顧問，就自動幫收銀機打勾「指定客」
    setIsDesignated(appt.advisorName !== '不指定顧問' && appt.advisorName !== '未指定' && appt.advisorName !== '顧問團隊');
    
    let basePrice = 1600;
    if (appt.customerType === '首次評估') basePrice = 2000;
    if (appt.timeSlots && appt.timeSlots.length > 2) basePrice += 800 * (appt.timeSlots.length - 2);

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
  const handleDeductPackage = async (appt, cust) => {
    if (!window.confirm(`確定要扣抵 ${cust.name} 的套票 1 堂嗎？\n(扣抵後剩餘 ${cust.remainingSessions - 1} 堂)`)) return;
    try {
      // 1. 扣除該客戶的套票堂數
      await updateDoc(doc(db, "customers", cust.id), {
        remainingSessions: cust.remainingSessions - 1
      });
      // 2. 將預約單狀態改為「已完成」
      await setDoc(doc(db, "appointments", appt.id), { status: '已完成' }, { merge: true });
      
      // 3. 寫入一筆 0 元的服務核銷紀錄 (讓報表能追蹤服務人次，但不增加現金營收)
      await addDoc(collection(db, "revenueRecords"), {
        date: new Date().toISOString(),
        finalAmount: 0,
        advisorId: appt.advisorId,
        items: [{ name: `[套票核銷] ${appt.serviceType}`, price: 0, qty: 1, isBase: true }],
        isDesignated: false,
        isPackageDeduction: true
      });
      
      alert('✅ 套票核銷成功！預約已自動結案。');
    } catch (e) {
      alert('核銷失敗：' + e.message);
    }
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
    let targetAdv = calTargetAdvisor;
    if (targetAdv === 'all') {
      targetAdv = teamMembers.filter(m => activeAdvisors.includes(m.id))[0]?.id || '';
    }
    setRebookFormData({ date: dateStr, time: timeSlot, service: serviceTypes[0], consultant: targetAdv || "" });
    setShowRebookModal(true);
  };

  const handleOpenRebookModal = (order) => {
    setRebookCustomer({ name: order.name, phone: order.phone });
    setRebookFormData({ date: "", time: "", service: order.serviceType || "", consultant: order.advisorId || "" });
    setShowRebookModal(true);
  };

  // ✨ 替換這兩個函式：
const handleOpenHistoryModal = (phone) => {
  setShowHistoryModal(phone);
  const memoData = customerMemos[phone] || {};
  setMemoInput(memoData.text || '');
  setStatusInput(memoData.status || 'active'); // 預設為治療期
};

const handleSaveMemo = async () => {
  if (!showHistoryModal) return;
  try {
    await setDoc(doc(db, "customerMemos", showHistoryModal), { 
      text: memoInput,
      status: statusInput // 將狀態一併寫入 Firebase
    }, { merge: true });
    alert("✅ 客戶備忘錄與療程狀態已成功儲存！ 下次預約時將會跳出提醒。");
  } catch (e) { alert("儲存失敗：" + e.message); }
};

  const blacklistedList = useMemo(() => {
  return Object.entries(customerMemos)
    .filter(([phone, data]) => data?.text && data.text.includes('【黑名單】'))
    .map(([phone, data]) => {
      const latestAppt = appointments.find(a => a.phone === phone);
      return { phone, name: latestAppt ? latestAppt.name : '未知客戶', memo: data.text };
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

  // 🌟 修正第二階段：升級防撞堂機制 (提交前的雲端再驗證)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientMemo = customerMemos[formData.phone]?.text || '';
    if (clientMemo.includes('【黑名單】')) {
      setConflictError('系統目前無法受理您的線上預約，請透過官方 LINE 聯繫專人為您服務。'); return;
    }
    if (!formData.name || !formData.phone || formData.timeSlots.length === 0 || !formData.serviceType || !formData.advisorId || !formData.isFirstTime || !formData.date) {
      setConflictError('請完整填寫所有必填欄位，並選擇至少一個時段'); return;
    }

    const contactValue = formData.phone.trim();
    const phoneRegex = /^09\d{8}$/;
    const lineIdRegex = /^[a-zA-Z0-9.\-_]{4,20}$/; 
    const isPhone = phoneRegex.test(contactValue);
    const isLineId = lineIdRegex.test(contactValue);

    if (!isPhone && !isLineId) {
      setConflictError('⚠️ 聯絡資訊格式錯誤：請輸入 10 碼台灣手機號碼 (09開頭) 或有效的 LINE ID！'); 
      return;
    }

    if (formData.isFirstTime === 'yes') {
      if (formData.timeSlots.length < 2) { setConflictError('首次來店需進行詳細的身體評估，請至少選擇 2 個時段 (共 1 小時) 喔！'); return; }
      const sortedSlots = [...formData.timeSlots].sort();
      let isContinuous = true;
      for (let i = 0; i < sortedSlots.length - 1; i++) {
        if (sortedSlots[i].split('-')[1] !== sortedSlots[i + 1].split('-')[0]) { isContinuous = false; break; }
      }
      if (!isContinuous) { setConflictError('⚠️ 首次預約的時段必須是「連續不斷開」的喔！請重新點選相連的時段。'); return; }
    }

    let finalAdvisorId = formData.advisorId;
    let finalAdvisorName = "不指定顧問";

    if (formData.advisorId !== 'any') {
      const advisorObj = teamMembers.find(t => t.id === formData.advisorId);
      finalAdvisorName = advisorObj ? advisorObj.name : '顧問團隊';
    }

    setIsSubmitting(true);

    try {
      // 🌟 送出前的一毫秒，重新去 Firebase 撈一次最新資料，確保絕對不撞堂
      const q = query(collection(db, "appointments"), where("advisorId", "==", finalAdvisorId), where("date", "==", formData.date));
      const querySnapshot = await getDocs(q);
      const serverAppointments = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if(data.status !== '已取消') {
           serverAppointments.push(...(data.timeSlots || []));
        }
      });

      // 交叉比對客人選的時間，是不是剛剛被別人訂走了
      const isDoubleBooked = formData.timeSlots.some(slot => serverAppointments.includes(slot));
      if (isDoubleBooked) {
         setConflictError('⚠️ 哎呀！這個時段剛剛被別人預約走了，請重新選擇其他時段！');
         setFormData(prev => ({ ...prev, timeSlots: [] }));
         setIsSubmitting(false);
         return;
      }

      // 如果安全通過，才寫入資料庫
      const customerTypeStr = formData.isFirstTime === 'yes' ? '首次評估' : '舊客保養';
      const sortedSlots = [...formData.timeSlots].sort();
      const gasTime = `${sortedSlots[0].split('-')[0]}-${sortedSlots[sortedSlots.length - 1].split('-')[1]}`;
      const exactDisplayTime = formatTimeSlots(sortedSlots);

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
    
    } catch (error) { 
      setConflictError('系統連線錯誤，請稍後再試。'); 
    } finally { 
      setIsSubmitting(false); 
    }
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

  const handleSaveEditAppt = async () => {
    if (editFormData.timeSlots.length === 0) return alert("請至少選擇一個時段！");
    
    const sortedSlots = [...editFormData.timeSlots].sort();
    const exactDisplayTime = formatTimeSlots(sortedSlots);
    const gasTime = `${sortedSlots[0].split('-')[0]}-${sortedSlots[sortedSlots.length - 1].split('-')[1]}`;
    
    const finalAdvisorName = teamMembers.find(m => m.id === editFormData.advisorId)?.name || '未知';
    const oldDateStr = `${editingAppt.date} ${editingAppt.exactDisplayTime}`;
    const newDateStr = `${editFormData.date} ${exactDisplayTime}`;
    
    let updatedNeeds = editingAppt.needs || "";
    
    if (oldDateStr !== newDateStr || editingAppt.advisorId !== editFormData.advisorId) {
       const changeLog = `\n⚠️ [系統紀錄: 由 ${oldDateStr} 改期至 ${newDateStr}]`;
       updatedNeeds += changeLog;
    }

    try {
      await setDoc(doc(db, "appointments", editingAppt.id), {
        date: editFormData.date,
        timeSlots: editFormData.timeSlots,
        exactDisplayTime,
        gasTime,
        advisorId: editFormData.advisorId,
        advisorName: finalAdvisorName,
        needs: updatedNeeds.trim()
      }, { merge: true });
      
      alert(`✅ 改期成功！\n已更新為：${newDateStr}`);
      setEditingAppt(null);
    } catch (error) {
      alert("改期失敗：" + error.message);
    }
  };

  const handleOpenEditModal = (appt) => {
    setEditingAppt(appt);
    setEditFormData({
      date: appt.date,
      timeSlots: appt.timeSlots || [],
      advisorId: appt.advisorId
    });
  };

  const handleToggleEditSlot = (slot) => {
    setEditFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(slot) ? prev.timeSlots.filter(s => s !== slot) : [...prev.timeSlots, slot]
    }));
  };

const handleAddAdvisor = async (e) => {
    e.preventDefault();
    if (teamMembers.find(m => m.id === newAdvisor.id)) return alert('帳號ID已存在，請使用另一個英文帳號！');
    try {
      // 寫入時加上抽成變數
      const advisorData = { ...newAdvisor, commissionRate: Number(newAdvisor.commissionRate) || 50 };
      await setDoc(doc(db, "users", newAdvisor.id), advisorData);
      
      const updatedActive = [...activeAdvisors, newAdvisor.id];
      await setDoc(doc(db, "settings", "teamConfig"), { activeIds: updatedActive }, { merge: true });
      setNewAdvisor({ id: '', name: '', pwd: '', role: 'advisor', commissionRate: 50 }); 
      alert('✅ 新增團隊成員成功！');
    } catch (err) { alert('新增失敗：' + err.message); }
  };

  const handleDeleteAdvisor = async (id, name) => {
    if (id === 'ted' || id === 'admin') return alert('⚠️ 無法刪除最高管理員！');
    if (!window.confirm(`確定要徹底刪除團隊成員「${name}」嗎？\n(過去由他服務的訂單依然會保留姓名，不會影響營收數據)`)) return;
    try { 
      await deleteDoc(doc(db, "users", id)); 
      alert('🗑️ 團隊成員已刪除！'); 
    } catch (err) { alert('刪除失敗：' + err.message); }
  };
    
  const handleToggleAdminVisibility = async () => {
    try {
      await setDoc(doc(db, "settings", "teamConfig"), { isAdminHidden: !isAdminHidden }, { merge: true });
      alert(isAdminHidden ? "✅ 最高管理員已顯示於選單。" : "🛡️ 最高管理員已隱藏！請在登入時使用「手動輸入」來登入。");
    } catch (err) { alert('設定失敗：' + err.message); }
  };

  const displayTeam = teamMembers.filter(m => !(m.id === 'admin' && isAdminHidden));

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

    // 1. 計算「預約數量」與「勞務工時」
    appointments.forEach(appt => {
      if (appt.date && appt.date.startsWith(selectedMonth) && appt.status !== '已取消') {
        if (!selectedAnalyticsAdvisors.includes(appt.advisorId)) return;
        kpi.total++;
        if (appt.customerType === '首次評估') kpi.new++; else kpi.return++;
        
        const aid = appt.advisorId || 'any';
        if (!advisorStats[aid]) advisorStats[aid] = { count: 0, hours: 0, newCount: 0, revenue: 0 };
        
        advisorStats[aid].count += 1;
        if (appt.customerType === '首次評估') advisorStats[aid].newCount += 1;

        const slotsCount = appt.timeSlots ? appt.timeSlots.length : (appt.exactDisplayTime ? appt.exactDisplayTime.split(',').length : 1);
        const sessionHours = slotsCount * 0.5;
        advisorStats[aid].hours += sessionHours;
        kpi.totalHours += sessionHours;
        
        const sType = appt.serviceType || '未填寫';
        serviceStats[sType] = (serviceStats[sType] || 0) + 1;
      }
    });

    // 2. 彙整「雙系統」的實際營收金額，並分離出周邊商品與指定客
    revenueRecords.forEach(record => {
      const amount = record.finalAmount || record.amount || 0; 
      const recordDate = record.date || record.timestamp || record.dateStr || "";
      const aid = record.advisorId;
      
      if (recordDate.startsWith(selectedMonth) && aid && advisorStats[aid]) {
        advisorStats[aid].revenue += amount; 

        let addonRevenue = 0;
        let addonComm = 0;

        // 計算周邊商品的自訂抽成金
        if (record.items && Array.isArray(record.items)) {
          record.items.forEach(item => {
             if (!item.isBase && item.commission > 0) {
                 addonComm += (item.commission * item.qty);
                 addonRevenue += (item.price * item.qty);
             }
          });
        }
        
        // 分離出「純勞務」的營業額
        let baseRev = amount - addonRevenue;
        if (baseRev < 0) baseRev = 0;

        // 將純勞務營業額分流到「指定客」或「一般客」
        if (record.isDesignated) {
           advisorStats[aid].designatedRevenue = (advisorStats[aid].designatedRevenue || 0) + baseRev;
        } else {
           advisorStats[aid].regularRevenue = (advisorStats[aid].regularRevenue || 0) + baseRev;
        }

        advisorStats[aid].addonCommission = (advisorStats[aid].addonCommission || 0) + addonComm;
        advisorStats[aid].addonRevenue = (advisorStats[aid].addonRevenue || 0) + addonRevenue;
      }
    });

    // 3. 💸 核心薪資與抽成計算邏輯！(含 60% 封頂機制與歷史快照防護)
    Object.keys(advisorStats).forEach(aid => {
      const stats = advisorStats[aid];
      const snapId = `${aid}_${selectedMonth}`;
      const snapshot = payrollSnapshots[snapId];

      if (snapshot) {
        // 🔒 如果該月已經結算過，強制套用資料庫裡的「歷史快照」數字
        stats.regularRate = snapshot.regularRate;
        stats.designatedRate = snapshot.designatedRate || 0.6;
        stats.laborPay = snapshot.laborPay;
        stats.bonus = snapshot.bonus;
        stats.totalSalary = snapshot.totalSalary;
        stats.isLocked = true; // 標記為已鎖定
      } else {
        // 🔓 尚未結算，使用當前最新的規則進行「動態計算」
        const member = teamMembers.find(m => m.id === aid);
        const isBoss = member?.role === 'admin';
        
        const customRate = member?.commissionRate !== undefined ? Number(member.commissionRate) : 50;
        let baseRate = customRate / 100;
        let bonusRate = stats.count >= 40 ? 0.05 : 0;
        
        let finalRegularRate = baseRate + bonusRate;
        if (finalRegularRate > 0.60) finalRegularRate = 0.60;
        
        stats.regularRate = isBoss ? 1.0 : finalRegularRate;
        stats.designatedRate = isBoss ? 1.0 : 0.60;
        
        let regularPay = Math.round((stats.regularRevenue || 0) * stats.regularRate);
        let designatedPay = Math.round((stats.designatedRevenue || 0) * stats.designatedRate);
        
        stats.laborPay = regularPay + designatedPay + (stats.addonCommission || 0); 
        
        stats.bonus = 0;
        if (stats.newCount >= 20) stats.bonus = 2000;
        else if (stats.newCount >= 10) stats.bonus = 1000;
        else if (stats.newCount >= 5) stats.bonus = 500;

        stats.totalSalary = stats.laborPay + stats.bonus;
        stats.isLocked = false;
      }
    });

    const sortedServices = Object.keys(serviceStats).map(key => ({ name: key, count: serviceStats[key] })).sort((a, b) => b.count - a.count);
    return { kpi, advisorStats, sortedServices };
  }, [appointments, revenueRecords, selectedMonth, selectedAnalyticsAdvisors, currentUser]);

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

  const getCalendarDays = () => {
    const dates = [];
    const base = new Date(calBaseDate);
    if (calViewMode === 'day') {
      dates.push(base);
    } else {
      const day = base.getDay();
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() - day + i);
        dates.push(d);
      }
    }
    return dates;
  };
  const calendarDays = getCalendarDays();

  return (
    
    <div className="min-h-screen bg-[#192039] p-4 md:p-8 font-sans text-slate-800 selection:bg-[#e3b5a1] selection:text-[#192039] flex flex-col relative">
      
      {/* 🌟 這裡開始是手機字體強制放大的防護罩 */}
    <style dangerouslySetInnerHTML={{__html: `
      html {
        -webkit-text-size-adjust: 100% !important;
        text-size-adjust: 100% !important;
      }
      @media (max-width: 640px) {
        /* 手機版：將原本看不清的 text-xs 強制提升至好讀的大小 */
        .text-xs {
          font-size: 0.85rem !important; /* 約 13.6px */
          line-height: 1.35rem !important;
        }
        /* 手機版：將原本較小的 text-sm 稍微放大 */
        .text-sm {
          font-size: 0.95rem !important; /* 約 15.2px */
          line-height: 1.45rem !important;
        }
        /* 避免 iPhone 按鈕或輸入框點擊時頁面會稍微放大晃動 */
        input, select, textarea {
          font-size: 16px !important;
        }
      }
    `}} />
    {/* 🌟 手機防護罩結束 */}
    
      {/* ================= 左上角浮動按鈕群組 ================= */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
        <button onClick={() => !currentUser ? setShowLoginModal(true) : handleLogout()} className="p-2.5 bg-[#12182c]/80 backdrop-blur-md rounded-full text-white/50 hover:text-[#e3b5a1] border border-white/10 transition-all shadow-md" title={currentUser ? "登出" : "管理員入口"}>
          <Settings size={20} />
        </button>

        {currentUser && (
          <>
            <button onClick={() => setShowPOS(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-full shadow-md flex items-center gap-2 transition-all active:scale-95">
              💰 收銀機
            </button>

            {/* 🌟 修正第三階段：合規命名 */}
            <a 
              href="https://smart-recovery-chart.vercel.app/"     
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-[#151b2b] text-[#e2bba9] hover:bg-[#202942] border border-[#e2bba9]/30 font-bold py-2.5 px-4 rounded-full shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <Activity size={18} /> 
              開啟專屬評估戰情室
            </a>
          </>
        )}
      </div>
      
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

      {/* ================= 主要頁面架構開始 ================= */}
      <div className="max-w-7xl mx-auto space-y-6 w-full flex-1">
        
        <header className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-[3px] bg-gradient-to-b from-[#e3b5a1]/50 to-[#9aa486]/50 shadow-xl flex items-center justify-center">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#12182c] flex items-center justify-center p-1.5"><img src="/logo.png" alt="智理運動恢復" className="w-[85%] h-[85%] object-contain" onError={(e) => { e.target.style.display = 'none'; }} /></div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.2em] text-white">智理運動恢復</h1>
          <p className="text-xs md:text-sm tracking-[0.4em] font-semibold text-[#e3b5a1] uppercase">Smart Recovery</p>
        </header>

        {/* ================= 顧客前台區塊 ================= */}
        {!currentUser ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex bg-[#12182c] p-1.5 rounded-2xl max-w-sm mx-auto mb-8 border border-white/10">
              <button onClick={() => setAppMode('booking')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${appMode === 'booking' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-white/50 hover:text-white/80'}`}>線上預約</button>
              <button onClick={() => setAppMode('tracking')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${appMode === 'tracking' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-white/50 hover:text-white/80'}`}>我的預約查詢</button>
            </div>

            {appMode === 'booking' && (
              <>
                {successData ? (
                  <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center">
                    <CheckCircle size={56} className="text-[#9aa486] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-[#192039] mb-4">預約申請已送出！</h2>
                    <p className="text-slate-500 text-base mb-6">請透過下方按鈕加入官方 LINE，我們將由專人為您確認保留。</p>
                    <a href={generateGoogleCalendarLink(successData?.date, successData?.time, successData?.service, successData?.advisor)} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3 transition-colors">
                      <Calendar size={20} /> 將行程加入 Google 行事曆
                    </a>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 text-left">
                      <h3 className="text-sm font-bold text-slate-400 tracking-widest mb-4 border-b border-slate-200 pb-3">BOOKING DETAILS</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-base">預約姓名</span><span className="text-slate-800 font-bold text-base">{successData?.name || '無'}</span></div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-base">客戶屬性</span><span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md text-base font-bold">{successData?.customerType || '無'}</span></div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-base">預約項目</span><span className="text-slate-800 font-bold text-base text-right max-w-[160px] truncate">{successData?.service || '無'}</span></div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-base">指定顧問</span><span className="text-slate-800 font-bold text-base">{successData?.advisor || '無'}</span></div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-slate-500 text-base">預約日期</span><span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-md text-base font-bold">{successData?.date || '無'}</span></div>
                        <div className="flex justify-between items-center pb-1"><span className="text-slate-500 text-base">預約時間</span><span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-md text-base font-bold">{successData?.time || '無'}</span></div>
                      </div>
                    </div>
                    <a href="https://lin.ee/SaYoB3y" target="_blank" rel="noopener noreferrer" className="w-full bg-[#06C755] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-4"><MessageCircle size={24} /> 點擊加入 LINE 官方帳號確認</a>
                    <button onClick={() => setSuccessData(null)} className="text-base text-slate-400 underline mt-2">返回首頁</button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <BookingDisclaimer />
                    
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <div>
                        <label className="block text-base font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <span>目前的疼痛/緊繃程度 (1-10分) :</span><span className="text-[#9aa486] font-extrabold text-lg">{formData.painLevel} 分</span>
                        </label>
                        <input type="range" min="1" max="10" value={formData.painLevel} onChange={(e) => setFormData({ ...formData, painLevel: parseInt(e.target.value) })} className="w-full accent-[#9aa486]" />
                        <div className="flex justify-between text-sm text-slate-400 font-bold px-1 mt-1"><span>1 (輕微)</span><span>10 (極度不適)</span></div>
                      </div>
                      <div>
                        <label className="block text-base font-bold text-slate-700 mb-2">主要不適部位 (可複選)</label>
                        <div className="flex flex-wrap gap-2">
                          {BODY_PARTS.map(part => (
                            <button key={part} type="button" onClick={() => toggleBodyPart(part)} className={`px-4 py-2 rounded-lg text-base font-bold border transition-colors ${formData.bodyParts.includes(part) ? 'bg-[#192039] text-[#e3b5a1] border-[#192039]' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {part}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-base font-bold text-slate-700 mb-1.5">其他文字備註</label>
                        <textarea name="needs" value={formData.needs} onChange={handleInputChange} rows="2" placeholder="例如：右膝蓋之前有開過刀..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-[#e3b5a1]" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl shadow-xl p-6 sm:p-8 border border-indigo-100">
                      <h2 className="text-lg md:text-xl font-bold mb-3 flex items-center gap-2 text-indigo-900"><MessageSquare className="text-indigo-600" /> AI 智慧恢復顧問</h2>
                      <p className="text-base text-slate-500 mb-4">不知道該預約什麼項目嗎？告訴我們您哪裡不舒服吧！</p>
                      <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} rows="2" className="w-full p-4 bg-white border border-indigo-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-400 text-base resize-none" placeholder="例如：最近跑步完膝蓋外側緊緊的，或是肩膀一直很僵硬..." />
                      <button onClick={handleAIGetRecommendation} disabled={loadingAi || !aiInput.trim()} className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-base transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 shadow-sm">
                        {loadingAi ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />} 請 AI 給予專業建議
                      </button>
                      {aiRec && (
                        <div className="mt-5 p-4 bg-indigo-100/50 border border-indigo-200 rounded-xl animate-in fade-in">
                          <p className="text-base text-indigo-900 leading-relaxed font-medium whitespace-pre-line">{aiRec}</p>
                          <button type="button" onClick={applyAiService} className="mt-4 w-full sm:w-auto text-base bg-white border border-indigo-300 text-indigo-700 font-bold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                            <CheckCircle size={16} /> 👉 聽從建議，自動套用此服務
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 relative">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#9aa486] to-[#e3b5a1]"></div>
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#192039] border-b pb-4"><PlusCircle size={24} className="text-[#9aa486]" /> 線上預約專屬時段</h2>
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-base font-bold text-slate-600 mb-2">姓名 *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border rounded-2xl text-base outline-none focus:ring-2 focus:ring-[#e3b5a1]" required />
                          </div>
                          <div>
                            <label className="block text-base font-bold text-slate-600 mb-2">聯絡電話 / LINE ID *</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="09XX... 或 LINE ID" className="w-full p-4 bg-slate-50 border rounded-2xl text-base outline-none focus:ring-2 focus:ring-[#e3b5a1]" required />
                          </div>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border">
                          <label className="block text-base font-bold text-slate-700 mb-3">首次來店？ *</label>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => setFormData({ ...formData, isFirstTime: 'yes' })} className={`flex-1 py-4 rounded-xl border-2 font-bold text-base ${formData.isFirstTime === 'yes' ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white'}`}>是，首次評估</button>
                            <button type="button" onClick={() => setFormData({ ...formData, isFirstTime: 'no' })} className={`flex-1 py-4 rounded-xl border-2 font-bold text-base ${formData.isFirstTime === 'no' ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white'}`}>否，我來過</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-base font-bold text-slate-600 mb-2">預約項目 *</label>
                            <select name="serviceType" value={formData.serviceType} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border rounded-2xl text-base outline-none focus:ring-2 focus:ring-[#e3b5a1]" required>
                              <option value="" disabled>請選擇服務</option>{serviceTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-base font-bold text-slate-600 mb-2">指定顧問 *</label>
                            <select name="advisorId" value={formData.advisorId} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border rounded-2xl text-base outline-none focus:ring-2 focus:ring-[#e3b5a1]" required>
                              <option value="" disabled>請選擇顧問</option>
                              <option value="any" className="font-bold text-[#9aa486]">✨ 不指定顧問 (安排最快時段)</option>
                              {teamMembers.filter(m => activeAdvisors.includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-base font-bold text-slate-600 mb-2">選擇日期 *</label>
                          <input type="date" name="date" value={formData.date} onChange={handleInputChange} min={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border rounded-2xl text-base outline-none focus:ring-2 focus:ring-[#e3b5a1]" required />
                        </div>
                        <div>
                          <label className="block text-base font-bold text-slate-600 mb-3">選擇時段 (可複選) *</label>
                          {!formData.date || !formData.advisorId ? <div className="text-base text-slate-400 bg-slate-50 p-6 rounded-2xl text-center border-dashed border">請先選擇上方「指定顧問」與「日期」</div> : clientAvailableSlots.length === 0 ? <div className="text-base text-rose-500 bg-rose-50 p-6 rounded-2xl text-center font-bold">該日無可預約時段</div> : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {clientAvailableSlots.map(slot => (
                                <button key={slot} type="button" onClick={() => handleToggleClientSlot(slot)} className={`py-3 text-base rounded-xl border font-bold ${formData.timeSlots.includes(slot) ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white text-slate-600'}`}>{slot}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        {conflictError && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-base font-bold flex items-center gap-2"><AlertTriangle size={20} className="shrink-0" /> {conflictError}</div>}
                        <button type="submit" disabled={isSubmitting} className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-4 rounded-2xl shadow-lg mt-6 text-lg disabled:opacity-70">確認預約時段</button>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}

            {appMode === 'tracking' && (
              <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 relative min-h-[400px]">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#192039] border-b pb-4"><Calendar className="text-[#9aa486]" /> 查詢與管理我的預約</h2>
                <form onSubmit={handleSearchAppt} className="flex flex-col sm:flex-row gap-3 mb-8">
                  <input type="text" value={clientSearchPhone} onChange={(e) => setClientSearchPhone(e.target.value)} placeholder="請輸入您預約時的電話號碼或 LINE ID" className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-[#e3b5a1] font-bold" required />
                  <button type="submit" className="bg-[#192039] text-[#e3b5a1] py-4 px-8 rounded-xl font-bold hover:bg-slate-800 transition-colors text-lg">查詢</button>
                </form>
                <div className="space-y-4">
                  {hasSearched && clientAppts.length === 0 && <p className="text-center text-slate-400 py-10 text-base">找不到此電話或 LINE ID 的預約紀錄</p>}
                  {clientAppts.map((appt, idx) => (
                    <div key={idx} className="border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-slate-800 text-lg">{appt.date}</span>
                          <span className={`text-sm px-2 py-1 rounded font-bold ${appt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : appt.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                            {appt.status === 'confirmed' ? '保留中' : appt.status}
                          </span>
                        </div>
                        <p className="text-base text-slate-600 font-bold">{appt.exactDisplayTime} | {appt.serviceType}</p>
                        <p className="text-sm text-slate-500 mt-1">顧問: {appt.advisorName}</p>
                      </div>
                      {appt.status === 'confirmed' && (
                        <button onClick={() => { alert('為確保品質，變更預約請聯繫官方 LINE 由專人為您服務'); }} className="text-sm bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg font-bold hover:bg-slate-200 shadow-sm shrink-0">
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
                <button onClick={() => setAdminTab('calendar')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'calendar' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><Calendar size={18} /> 日曆檢視模式</button>
                <button onClick={() => setAdminTab('schedule')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'schedule' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><Clock size={18} /> 排班系統</button>
                
                {currentUser.role === 'admin' && (
                  <>
                    <button onClick={() => setAdminTab('analytics')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'analytics' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><BarChart size={18} /> 營業營收</button>
                    <button onClick={() => setAdminTab('team')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'team' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><UserPlus size={18} /> 團隊管理</button>
                    <button onClick={() => setAdminTab('prices')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'prices' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300 hover:bg-white/5'}`}><Package size={18} /> 商業邏輯設定</button>
                    <button onClick={() => setAdminTab('blacklist')} className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors ${adminTab === 'blacklist' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-300 hover:bg-white/5 hover:text-rose-400'}`}><ShieldAlert size={18} /> 黑名單管理</button>
                  </>
                )}

                {/* 🌟 修正第三階段：合規命名 */}
                <a 
                  href="https://smart-recovery-chart.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full text-left px-4 py-3 mt-2 rounded-xl text-[14px] font-bold flex items-center gap-3 transition-colors bg-[#151b2b] text-[#e2bba9] hover:bg-[#202942] border border-[#e2bba9]/30 shadow-sm"
                >
                  <Activity size={18} /> 開啟專屬評估戰情室
                </a>
              </div>

              {/* 底部操作區 */}
              <div className="border-t border-white/10 pt-6 mt-6 space-y-3">
                <button onClick={exportToGoogleSheets} className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold py-3 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-all border border-emerald-500/30">
                  <Download size={16} /> 匯出至 Google Sheets
                </button>
                <button onClick={handleLogout} className="w-full text-slate-400 hover:text-white text-[13px] flex items-center gap-2 justify-center py-2 transition-colors"><LogOut size={16} /> 登出系統</button>
              </div>
            </div>

            {/* ================= 右側內容區 (主控台) ================= */}
            <div className="flex-1 bg-slate-50 relative overflow-y-auto h-[80vh] md:h-auto custom-scrollbar">

              {/* ================= 模組 2：進階商品與商業邏輯設定 ================= */}
              {adminTab === 'prices' && currentUser?.role === 'admin' && (
                <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm m-6 animate-in fade-in">
                  <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-5">
                    <div className="bg-[#192039] p-2 rounded-xl"><Package className="text-[#e3b5a1]" size={24} /></div>
                    <h2 className="text-xl font-black text-[#192039]">商品與商業邏輯設定 (雲端連動)</h2>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
                    
                    {/* ===== 左側：單次服務與加價購 ===== */}
                    <div className="flex flex-col h-full bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-[15px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Zap size={18} className="text-[#9aa486]" /> 單次服務與周邊 (連動收銀機)
                      </h3>
                      
                      <div className="space-y-3 flex-1 mb-6 overflow-y-auto pr-2 max-h-[350px]">
                        {/* 渲染主打服務 */}
                        <div className="text-xs font-bold text-slate-400 mb-2">主打基礎服務</div>
                        {(priceList.services || []).map((item, index) => (
                          <div key={`s-${index}`} className="flex justify-between items-center bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm">
                            <span className="font-bold text-sm text-slate-700">{item.name}</span>
                            <div className="flex items-center gap-4">
                              <span className="font-black text-[#9aa486]">${item.price}</span>
                              <button onClick={() => handleDeleteProduct('services', index)} className="text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                        
                        {/* 渲染加價購 */}
                        <div className="text-xs font-bold text-slate-400 mt-4 mb-2">加價購與周邊商品</div>
                        {(priceList.addons || []).map((item, index) => (
                          <div key={`a-${index}`} className="flex justify-between items-center bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm">
                            <span className="font-bold text-sm text-slate-700">{item.name}</span>
                            <div className="flex items-center gap-4">
                              <span className="font-black text-indigo-400">${item.price}</span>
                              <button onClick={() => handleDeleteProduct('addons', index)} className="text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>

{/* 新增區 */}
                      <form onSubmit={handleAddProduct} className="bg-[#9aa486]/10 border border-[#9aa486]/20 rounded-2xl p-3 flex flex-col gap-3">
                        {/* 上排：類別與名稱 */}
                        <div className="flex gap-2">
                          <select value={newProduct.type} onChange={e => setNewProduct({ ...newProduct, type: e.target.value })} className="w-1/3 px-3 py-2.5 bg-white rounded-xl text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#9aa486]/50 shrink-0">
                            <option value="services">基礎服務</option>
                            <option value="addons">加價購/周邊</option>
                          </select>
                          <input type="text" required placeholder="新增項目名稱..." value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="flex-1 min-w-0 px-3 py-2.5 bg-white rounded-xl text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#9aa486]/50" />
                        </div>
                        {/* 下排：價格、抽成與按鈕 */}
                        <div className="flex gap-2">
                          <input type="number" required placeholder="$ 價格" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="flex-1 px-3 py-2.5 bg-white rounded-xl text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#9aa486]/50" />
                          {newProduct.type === 'addons' && (
                            <input type="number" placeholder="$ 顧問抽成" value={newProduct.commission} onChange={e => setNewProduct({...newProduct, commission: e.target.value})} className="flex-1 px-3 py-2.5 bg-white rounded-xl text-sm outline-none font-bold text-amber-600 focus:ring-2 focus:ring-amber-300" title="若賣出此商品，顧問可獲得的固定獎金" />
                          )}
                          <button type="submit" className="bg-[#9aa486] hover:bg-[#868f74] text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center shrink-0">
                            <Plus size={18} /> 新增
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* ===== 右側：套票方案區塊 ===== */}
                    <div className="flex flex-col h-full bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-[15px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Ticket size={18} className="text-[#e2bba9]" /> 儲值套票方案 (連動前台)
                      </h3>
                      <div className="space-y-3 flex-1 mb-6 overflow-y-auto pr-2 max-h-[350px]">
                        {depositPlans.length === 0 && <p className="text-slate-400 text-sm text-center py-10">尚無套票方案</p>}
                        {depositPlans.map(plan => (
                          <div key={plan.id} className="flex justify-between items-center bg-white border border-slate-100 p-3.5 rounded-2xl hover:border-[#192039]/30 transition-colors shadow-sm group">
                            <span className="font-bold text-sm text-slate-700">{plan.label} <span className="text-[#e2bba9] ml-1">({plan.sessions}堂)</span></span>
                            <div className="flex items-center gap-4">
                              <span className="font-black text-[#192039]">${plan.defaultPrice.toLocaleString()}</span>
                              <button onClick={() => handleDeletePlan(plan.id, plan.label)} className="text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 新增套票區 */}
                      <form onSubmit={handleAddPlan} className="bg-[#192039]/5 border border-[#192039]/10 rounded-2xl p-2.5 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <input type="text" required placeholder="方案名稱..." value={newPlan.label} onChange={e => setNewPlan({...newPlan, label: e.target.value})} className="flex-1 min-w-0 px-3 py-2.5 bg-white rounded-xl text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#192039]/30" />
                        <input type="number" required placeholder="堂數" value={newPlan.sessions} onChange={e => setNewPlan({...newPlan, sessions: e.target.value})} className="w-20 px-3 py-2.5 bg-white rounded-xl text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#192039]/30" title="輸入增加的堂數" />
                        <input type="number" required placeholder="$ 價格" value={newPlan.defaultPrice} onChange={e => setNewPlan({...newPlan, defaultPrice: e.target.value})} className="w-24 px-3 py-2.5 bg-white rounded-xl text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#192039]/30" />
                        <button type="submit" className="bg-[#192039] hover:bg-[#232d48] text-[#e3b5a1] p-2.5 rounded-xl transition-colors shadow-sm"><Plus size={18}/></button>
                      </form>
                    </div>

                  </div>

                  {/* ===== 底部：抽成與獎金規則 ===== */}
                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#192039] rounded-full"></span>
                      內部抽成與激勵獎金規則 (全自動套用至薪資結算)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {[
                        { id: 7, name: '基本勞務抽成', value: '50%' },
                        { id: 8, name: '月滿40堂抽成', value: '55%' },
                        { id: 9, name: '指定客/自帶客', value: '60%' },
                        { id: 10, name: '初評轉單 (5次)', value: '獎金 $500 (現領)' },
                        { id: 11, name: '初評轉單 (10次)', value: '獎金 $1000 (現領)' },
                        { id: 12, name: '初評轉單 (20次)', value: '獎金 $2000 (現領)' },
                        { id: 13, name: '初評轉單折抵', value: '全額免費' }
                      ].map(rule => (
                        <div key={rule.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3.5 rounded-xl shadow-sm">
                          <span className="font-bold text-xs text-slate-500">{rule.name}</span>
                          <span className="font-black text-[13px] text-[#192039]">{rule.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= 系統黑名單管理 ================= */}
              {adminTab === 'blacklist' && currentUser?.role === 'admin' && (
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

              {/* ================= 團隊管理 ================= */}
              {adminTab === 'team' && currentUser?.role === 'admin' && (
                <div className="space-y-6 animate-in fade-in p-6">
                  <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><UserPlus className="text-[#9aa486]" /> 顧問與團隊管理</h3>
                    <button onClick={handleToggleAdminVisibility} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors border border-slate-300 shadow-sm">
                      {isAdminHidden ? '👁️ 顯示 admin 帳號' : '🛡️ 隱藏 admin 帳號'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 新增成員表單 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border md:col-span-1 h-fit">
                      <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><PlusCircle size={18} /> 新增團隊成員</h4>
                      <form onSubmit={handleAddAdvisor} className="space-y-4">
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">登入帳號</label><input type="text" required value={newAdvisor.id} onChange={e => setNewAdvisor({ ...newAdvisor, id: e.target.value.toLowerCase() })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" placeholder="例如: kevin" /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">顯示名稱</label><input type="text" required value={newAdvisor.name} onChange={e => setNewAdvisor({ ...newAdvisor, name: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" placeholder="例如: Kevin" /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">登入密碼</label><input type="text" required value={newAdvisor.pwd} onChange={e => setNewAdvisor({ ...newAdvisor, pwd: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" placeholder="設定初始密碼" /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">系統權限</label>
                        <div>
  <label className="block text-xs font-bold text-slate-600 mb-1">基礎抽成 (%)</label>
  <input type="number" required value={newAdvisor.commissionRate} onChange={e => setNewAdvisor({ ...newAdvisor, commissionRate: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]" placeholder="例如: 50" />
</div>

                          <select value={newAdvisor.role} onChange={e => setNewAdvisor({ ...newAdvisor, role: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#9aa486]">
                            <option value="advisor">一般顧問</option><option value="admin">管理員</option>
                          </select>
                        </div>
                        <button type="submit" className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-3 rounded-xl shadow-md mt-2 flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors"><Plus size={16} /> 確認新增</button>
                      </form>
                    </div>
                   {/* 成員列表 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border md:col-span-2 overflow-x-auto h-fit">
                      <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><Users size={18} /> 目前團隊帳號名單</h4>
                      <table className="w-full text-left text-sm min-w-[500px]">
                        <thead>
                          <tr className="border-b text-slate-500 bg-slate-50">
                            <th className="p-3 font-bold rounded-tl-lg">顯示名稱</th>
                            <th className="p-3 font-bold">帳號</th>
                            <th className="p-3 font-bold">密碼 (點擊修改)</th>
                            <th className="p-3 font-bold">個人抽成 (點擊修改)</th>
                            <th className="p-3 font-bold text-center">角色</th>
                            <th className="p-3 font-bold text-center rounded-tr-lg">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamMembers.map(m => (
                            <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-800 text-[14px]">{m.name}</td>
                              <td className="p-3 text-slate-600">{m.id}</td>
                             <td className="p-3 text-slate-600">
  <div className="flex items-center gap-2">
    {/* 密碼隱藏或顯示 */}
    <span className={m.id === 'admin' ? "text-slate-400" : ""}>
      {m.id === 'admin' ? '********' : m.pwd}
    </span>
    
    {/* 只有登入者是 admin，且目標不是 admin 帳號時，才顯示修改按鈕 */}
    {currentUser?.role === 'admin' && m.id !== 'admin' && (
      <button onClick={() => {
        const newPwd = window.prompt(`請輸入 ${m.name} 的新密碼：`, m.pwd);
        if (newPwd !== null && newPwd.trim() !== '') handleUpdatePassword(m.id, newPwd);
      }} className="text-slate-400 hover:text-indigo-500 transition-colors" title="修改密碼">
        <Edit2 size={14} />
      </button>
    )}
    
    {/* 如果是 admin 帳號，顯示鎖定標籤 */}
    {m.id === 'admin' && (
      <span className="text-[11px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-bold ml-1">
        🔒 系統鎖定
      </span>
    )}
  </div>
</td>
<td className="p-3 text-slate-600">
  <div className="flex items-center gap-2">
    <span className="font-bold text-amber-600">{m.commissionRate !== undefined ? m.commissionRate : 50}%</span>
    {currentUser?.role === 'admin' && m.id !== 'admin' && (
      <button onClick={() => {
        const newRate = window.prompt(`請設定 ${m.name} 的專屬抽成比例\n(輸入數字，例如 55 代表 55%)：`, m.commissionRate !== undefined ? m.commissionRate : 50);
        if (newRate !== null && newRate.trim() !== '') handleUpdateCommission(m.id, newRate);
      }} className="text-slate-400 hover:text-amber-500 transition-colors" title="修改抽成比例">
        <Edit2 size={14} />
      </button>
    )}
  </div>
</td>
                              <td className="p-3 text-center">
                                {m.role === 'admin' ? (
                                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">管理員</span>
                                ) : (
                                  <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-bold">顧問</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <button onClick={() => handleDeleteAdvisor(m.id, m.name)} disabled={m.id === 'ted' || m.id === 'admin'} className={`p-1.5 rounded-lg border transition-colors shadow-sm ${m.id === 'ted' || m.id === 'admin' ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50'}`} title="刪除帳號">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= 營業營收 (Analytics) ================= */}
              {adminTab === 'analytics' && currentUser.role === 'admin' && (
                <div className="space-y-6 animate-in fade-in p-6">
                  <div className="flex justify-between items-center border-b pb-4"><h3 className="text-xl font-bold flex items-center gap-2"><BarChart className="text-indigo-600" /> 營業營收儀表板</h3></div>
                  
                  {/* 控制列 */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-2xl shadow-sm border">
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
                      {/* KPI 區塊 */}
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

                      {/* 顧問績效表 */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border mt-6 overflow-x-auto">
                        <h4 className="font-bold flex items-center gap-2 mb-4 text-lg"><Users className="text-blue-500" /> 顧問績效與工時統計表</h4>
                        <table className="w-full text-left text-sm min-w-[800px]">
                          <thead>
                            <tr className="border-b text-slate-500 bg-slate-50">
                              <th className="p-3 font-bold rounded-tl-lg">顧問名稱</th>
                              <th className="p-3 font-bold text-center">總工時 / 新客</th>
                              <th className="p-3 font-bold text-right">創造總營收</th>
                              <th className="p-3 font-bold text-center text-amber-600">達成抽成率</th>
                              <th className="p-3 font-bold text-right text-amber-600">勞務抽成</th>
                              <th className="p-3 font-bold text-right text-indigo-500">轉單獎金</th>
                              <th className="p-3 font-bold text-right text-emerald-600 rounded-tr-lg">✅ 應發總薪資</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamMembers.map(m => {
                              const stats = analyticsData.advisorStats[m.id];
                              if (!stats || stats.count === 0) return null;
                              return (
                                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="p-3 font-bold text-slate-800 text-[15px]">{m.name}</td>
                                  <td className="p-3 text-center font-medium text-slate-600">
                                    {stats.hours} hr <br/>
                                    <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded">新客 {stats.newCount}</span>
                                  </td>
                                  <td className="p-3 text-right font-bold text-slate-500">${stats.revenue.toLocaleString()}</td>
                                  
                                  {/* 抽成率判定：滿40小 55%，否則 50% */}
<td className="p-3 text-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                      {/* 一般客顯示 */}
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${stats.count >= 40 ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' : 'bg-slate-100 text-slate-600'}`} title="一般客抽成 (若滿40堂已包含+5%)">
                                        一般 {Math.round(stats.regularRate * 100)}%
                                      </span>
                                      
                                      {/* 如果有指定客業績，才會顯示這塊 */}
                                      {(stats.designatedRevenue || 0) > 0 && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                                          指定 60%
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  
                                  <td className="p-3 text-right font-bold text-amber-600">${stats.laborPay.toLocaleString()}</td>
                                  
                                  <td className="p-3 text-right font-bold text-indigo-500">
                                    {stats.bonus > 0 ? `+$${stats.bonus.toLocaleString()}` : '-'}
                                  </td>
                                  
<td className="p-3 text-right font-black text-emerald-600 text-[16px] bg-emerald-50/30">
                                 <div className="flex items-center justify-end gap-3">
                                <span>${stats.totalSalary.toLocaleString()}</span>
  
                                  {/* 支援快照的鎖定/解鎖按鈕 */}
                                  <button 
                                    onClick={() => handleTogglePaid(m.id, selectedMonth, stats)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1 ${
                                      stats.isLocked 
                                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    }`}
                                  >
                                    {stats.isLocked ? <><CheckCircle size={14} /> 已鎖定快照</> : '結算並鎖定'}
                                  </button>
                                 </div>
                              </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* 交易明細與客群檢視 (摺疊面板) */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border mt-6">
                        <h4 className="font-bold flex items-center gap-2 mb-4 text-lg"><FileText className="text-emerald-500" /> 交易明細與客群檢視 (摺疊面板)</h4>
                        <p className="text-sm text-slate-500 mb-4">以客人名字為索引。點擊即可展開查看該客人的詳細購買品項，並可修改金額、歸屬顧問或刪除廢單。</p>
                        
                        <div className="space-y-3">
                          {monthlyRevenuesByCustomer.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 border border-dashed rounded-xl border-slate-200">本月尚無任何交易明細</div>
                          ) : (
                            monthlyRevenuesByCustomer.map(([cName, group]) => (
                              <div key={cName} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-[#9aa486] transition-colors">
                                {/* 摺疊標題區 */}
                                <div onClick={() => setExpandedRevCustomer(expandedRevCustomer === cName ? null : cName)} className={`flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 transition-colors ${expandedRevCustomer === cName ? 'bg-slate-50 border-b border-slate-200' : ''}`}>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-800 text-[15px]">{cName}</span>
                                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">共 {group.records.length} 筆</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="font-bold text-emerald-600">${group.total.toLocaleString()}</span>
                                    <span className="text-slate-400 text-xs font-bold">{expandedRevCustomer === cName ? '▲ 收起' : '▼ 展開'}</span>
                                  </div>
                                </div>
                                
                                {/* 摺疊內容區 (展開才顯示) */}
                                {expandedRevCustomer === cName && (
                                  <div className="p-4 bg-slate-50/80 space-y-3">
                                    {group.records.map(rec => {
                                      const advisor = teamMembers.find(m => m.id === rec.advisorId);
                                      const dateObj = new Date(rec.date);
                                      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')} ${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
                                      
                                      return (
                                        <div key={rec.id} className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between gap-4 shadow-sm">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-sm font-bold text-slate-700">{dateStr}</span>
                                              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-bold">收款: {advisor ? advisor.name : rec.advisorId}</span>
                                            </div>
                                            <ul className="text-[13px] text-slate-600 space-y-1 mb-3">
                                              {rec.items?.map((item, idx) => (
                                                <li key={idx} className="flex items-center gap-2">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-[#e3b5a1]"></span>
                                                  {item.name} x {item.qty} <span className="text-slate-400">(${item.price * item.qty})</span>
                                                </li>
                                              ))}
                                            </ul>
                                            <div className="text-[11px] text-slate-400 font-bold bg-slate-50 p-1.5 rounded inline-block border border-slate-100">
                                              原價總額 ${rec.originalPrice} | 結帳折扣 {rec.discount} 折
                                            </div>
                                          </div>
                                          
                                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4 min-w-[120px]">
                                            <span className="font-extrabold text-xl text-[#192039]">${rec.finalAmount.toLocaleString()}</span>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                              <button onClick={() => setEditingRevenue({id: rec.id, finalAmount: rec.finalAmount, advisorId: rec.advisorId, date: rec.date})} className="flex-1 sm:flex-none text-[12px] bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg font-bold transition-colors">修改</button>
                                              <button onClick={() => handleDeleteRevenue(rec.id)} className="flex-1 sm:flex-none text-[12px] bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-200 hover:border-rose-500 px-3 py-1.5 rounded-lg font-bold transition-colors">刪除</button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
{/* ================= 預約戰情室 (Appointments) ================= */}
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
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${appt.customerType === '首次評估' ? 'bg-amber-400' : 'bg-[#9aa486]'}`}></div>
                      <div className="pl-2">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-bold text-lg">{appt.name}</span>
                          <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-600">{appt.customerType}</span>
                          {customerMemos[appt.phone]?.status === 'maintenance' && (
  <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
    🌿 保養期
  </span>
)}

                          {/* 自動連動顯示剩餘堂數 */}
                          {(() => {
                            const cust = customers.find(c => c.phone === appt.phone || c.id === appt.phone);
  return cust && cust.remainingSessions > 0 ? (
    <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black border border-amber-200 animate-pulse">
      套票剩 {cust.remainingSessions} 堂
    </span>
  ) : null;
})()}

                          <span className="bg-[#192039] text-[#e3b5a1] px-2 py-0.5 rounded text-xs font-bold tracking-wider">{appt.date} {appt.exactDisplayTime}</span>
                        </div>
                        <div className="text-[13px] font-bold text-slate-500 mb-2">{appt.serviceType} | 顧問: {appt.advisorName}</div>
                        {customerMemos[appt.phone]?.text && (
  <div className="text-xs bg-amber-50 text-amber-700 p-3 rounded-lg border border-amber-200 mb-2 leading-relaxed flex items-start gap-1.5 shadow-sm">
    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
    <span><strong className="font-bold">內部備忘錄：</strong>{customerMemos[appt.phone].text}</span>
  </div>
)}
                        {apptFilter !== 'past' && (
                          <div className="flex gap-2 mb-2">
                            <button onClick={() => handleQuickCheckout(appt)} className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm w-fit">
                              <DollarSign size={12} /> 單次收銀結帳
                            </button>
                            
                            {/* ✨ 自動判斷：如果這位客人還有套票，就跳出扣堂按鈕 ✨ */}
                            {(() => {
                              const cust = customers.find(c => c.phone === appt.phone || c.id === appt.phone);
                              if (cust && cust.remainingSessions > 0) {
                                return (
                                  <button onClick={() => handleDeductPackage(appt, cust)} className="text-xs bg-amber-100 border border-amber-300 text-amber-700 hover:bg-amber-500 hover:text-white px-3 py-1.5 rounded-lg font-black flex items-center gap-1 transition-all shadow-sm w-fit animate-pulse">
                                    <Ticket size={12} /> 扣抵套票 (剩 {cust.remainingSessions} 堂)
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )} 
                        
                        {appt.needs && <div className="text-xs bg-slate-50 p-2.5 rounded border text-slate-600 mb-2 leading-relaxed">預約備註：{appt.needs}</div>}

                        <div className="flex gap-2 border-t border-slate-100 pt-3 mt-3 flex-wrap items-center justify-between">
                          <div className="flex gap-2">
                            <a href={`tel:${appt.phone}`} className="text-xs bg-green-50 border border-green-200 text-green-600 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"><Phone size={12} /> 撥打</a>
                            <button onClick={() => handleOpenHistoryModal(appt.phone)} className="text-xs bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all">
                              <Clipboard size={12} /> 查看歷史 & 備註
                            </button>
                            
                            {/* 新增的報到按鈕 */}
                            {apptFilter !== 'past' && appt.status !== '已報到' && appt.status !== '已完成' && (
                              <button onClick={() => handleUpdateApptStatus(appt, '已報到')} className="text-xs bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all">
                                📍 報到
                              </button>
                            )}

                            {apptFilter !== 'past' && (
                              <button onClick={() => handleOpenEditModal(appt)} className="text-xs bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-500 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm">
                                <Edit2 size={12} /> 改期
                              </button>
                            )}
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
                      {appointments.filter(appt => appt.date && appt.date.startsWith(selectedMonth)).length === 0 ? (
                        <p className="text-slate-500 text-center py-4">本月目前尚無預約記錄</p>
                      ) : (
                        appointments.filter(appt => appt.date && appt.date.startsWith(selectedMonth)).map(appt => (
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
                                    try { 
                                      // 1. 刪除 Firebase 資料
                                      await deleteDoc(doc(db, "appointments", appt.id)); 
                                      
                                      // 2. 同步通知 Google Sheets 與日曆刪除 (加強連動)
                                      if (typeof WEBHOOK_URL === 'string' && WEBHOOK_URL.startsWith("http")) {
                                        fetch(WEBHOOK_URL, {
                                          method: 'POST',
                                          mode: 'no-cors',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ 
                                            action: "delete", 
                                            name: appt.name, 
                                            date: appt.date 
                                          })
                                        });
                                      }
                                    } catch (error) { alert("刪除失敗：" + error.message); }
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

                        const dayAppts = appointments.filter(a => {
                          if (a.date !== dateStr || a.status === '已取消') return false;
                          if (calTargetAdvisor !== 'all' && a.advisorId !== calTargetAdvisor) return false;
                          return true;
                        });

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
                                const isFirstTime = appt.customerType === '首次評估';

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

              {/* ▼▼▼ 排班系統區塊 ▼▼▼ */}
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

      {/* ================= 全域彈出視窗：修改營收明細 ================= */}
      {editingRevenue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex justify-center items-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95">
            <button onClick={() => setEditingRevenue(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
            <h3 className="text-xl font-bold text-[#192039] mb-5 border-b border-slate-100 pb-3 flex items-center gap-2"><Edit2 size={20} className="text-[#9aa486]" /> 修改營收明細</h3>
            
            <form onSubmit={handleUpdateRevenue} className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-slate-600 mb-1.5">交易時間 (可修正補單時間)</label>
                <input type="datetime-local" step="1" value={editingRevenue.date.substring(0, 19)} onChange={e => setEditingRevenue({...editingRevenue, date: new Date(e.target.value).toISOString()})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[#e3b5a1]" required />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-600 mb-1.5">業績歸屬顧問 (收款人)</label>
                <select value={editingRevenue.advisorId} onChange={e => setEditingRevenue({...editingRevenue, advisorId: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:ring-2 focus:ring-[#e3b5a1]">
                  {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-600 mb-1.5">最終實收金額 ($)</label>
                <input type="number" value={editingRevenue.finalAmount} onChange={e => setEditingRevenue({...editingRevenue, finalAmount: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-rose-600 outline-none focus:ring-2 focus:ring-rose-300" required />
              </div>
              
              <div className="flex gap-3 mt-8 pt-2">
                <button type="button" onClick={() => setEditingRevenue(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">取消</button>
                <button type="submit" className="flex-1 bg-[#192039] text-[#e3b5a1] font-bold py-3.5 rounded-xl shadow-md hover:bg-slate-800 transition-colors">儲存修改</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 全域彈出視窗：POS 收銀機 ================= */}
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
    <button key={a.name} onClick={() => handleAddCartItem(a.name, a.price, 1, false, a.commission || 0)} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm flex flex-col items-center">
      <span>+ {a.name} (${a.price})</span>
      {a.commission > 0 && <span className="text-[10px] text-amber-600 font-extrabold mt-0.5">抽成 ${a.commission}</span>}
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

{/* 新增：客戶狀態標籤切換 */}
<div className="flex gap-3 mb-4">
  <button
    onClick={() => setStatusInput('active')}
    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${statusInput === 'active' ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
  >
    🔥 急性治療期
  </button>
  <button
    onClick={() => setStatusInput('maintenance')}
    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${statusInput === 'maintenance' ? 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
  >
    🌿 常態保養期
  </button>
</div>


<div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-amber-800 mb-2">🧑‍⚕️ 本次收款人 (必選)</label>
                    <select value={calcAdvisor} onChange={(e) => setCalcAdvisor(e.target.value)} className="w-full text-lg p-3 border border-amber-300 rounded-lg font-bold text-slate-800 focus:ring-4 focus:ring-amber-200 outline-none transition-all bg-white">
                      <option value="" disabled>請選擇是誰收的錢...</option>
                      {teamMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                  </div>
                  
                  {/* 👈 新增：指定客切換開關 */}
                  <label className="flex items-center gap-3 cursor-pointer bg-white p-3 rounded-lg border border-amber-300 shadow-sm transition-all hover:bg-amber-100/50">
                    <input type="checkbox" checked={isDesignated} onChange={(e) => setIsDesignated(e.target.checked)} className="w-5 h-5 accent-amber-600" />
                    <span className="font-bold text-amber-800">💎 此單為「指定客 / 自帶客」 (抽成 60%)</span>
                  </label>
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

      {/* ================= 全域彈出視窗：內部代客預約 ================= */}
      {showRebookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-[#1E293B] text-white p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowRebookModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-4 flex items-center gap-2">
              <CalendarPlus className="text-[#9aa486]" /> 內部代客預約
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1.5 text-slate-300">客人姓名 *</label>
                  <input type="text" className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" value={rebookCustomer.name} onChange={(e) => setRebookCustomer({...rebookCustomer, name: e.target.value})} placeholder="例如: 王大明" />
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-slate-300">聯絡電話</label>
                  <input type="text" className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" value={rebookCustomer.phone} onChange={(e) => setRebookCustomer({...rebookCustomer, phone: e.target.value})} placeholder="09XX... 或 LINE" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm mb-1.5 text-slate-300">指定顧問 (已為您帶入)</label>
                <select className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" value={rebookFormData.consultant} onChange={(e) => setRebookFormData({ ...rebookFormData, consultant: e.target.value, time: "" })}>
                  <option value="">請選擇顧問</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1.5 text-slate-300">選擇日期</label>
                <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" value={rebookFormData.date} onChange={(e) => setRebookFormData({ ...rebookFormData, date: e.target.value, time: "" })} />
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
                  <select className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" value={rebookFormData.time} onChange={(e) => setRebookFormData({...rebookFormData, time: e.target.value})}>
                    <option value="">請選擇時段</option>
                    {rebookAvailableSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div>
                <label className="block text-sm mb-1.5 text-slate-300">預約項目 (已為您帶入上次項目)</label>
                <select className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#9aa486] border border-gray-600" value={rebookFormData.service} onChange={(e) => setRebookFormData({...rebookFormData, service: e.target.value})}>
                  <option value="">請選擇項目</option>
                  {serviceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-3">
              <button className="px-4 py-2.5 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm font-bold" onClick={() => setShowRebookModal(false)}>取消</button>
              <button 
                className="px-6 py-2.5 bg-[#9aa486] rounded-lg hover:bg-[#868f74] text-[#192039] font-bold transition-colors shadow-lg" 
                onClick={async () => {
                  if(!rebookFormData.date || !rebookFormData.time || !rebookFormData.service || !rebookFormData.consultant) { 
                    alert("請填寫完整預約資料！"); 
                    return; 
                  }
                  
                  const finalAdvisorName = teamMembers.find(m => m.id === rebookFormData.consultant)?.name || '未指定';
                  
                  try {
                    await addDoc(collection(db, "appointments"), {
                      name: rebookCustomer.name, 
                      phone: rebookCustomer.phone, 
                      isFirstTime: 'no', 
                      advisorId: rebookFormData.consultant, 
                      advisorName: finalAdvisorName,
                      customerType: '舊客保養', 
                      serviceType: rebookFormData.service, 
                      date: rebookFormData.date, 
                      timeSlots: [rebookFormData.time], 
                      exactDisplayTime: rebookFormData.time,
                      gasTime: rebookFormData.time, 
                      needs: '現場預約下次', 
                      status: 'confirmed', 
                      createdAt: new Date().toISOString()
                    });
                    
                    if (typeof WEBHOOK_URL === 'string' && WEBHOOK_URL.startsWith("http")) {
                      fetch(WEBHOOK_URL, {
                        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          action: "new", name: rebookCustomer.name, date: rebookFormData.date, time: rebookFormData.time, 
                          service: `[舊客保養] ${rebookFormData.service} (指定：${finalAdvisorName})`, phone: rebookCustomer.phone, needs: "現場直接預約下次" 
                        })
                      });
                    }
                    
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

      {/* ================= 全域彈出視窗：更改客戶預約時間 (改期) ================= */}
      {editingAppt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[300] p-4">
          <div className="bg-[#1E293B] text-white p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setEditingAppt(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-4 flex items-center gap-2 text-amber-400">
              <Edit2 size={20} /> 更改客戶預約時間
            </h2>

            <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 mb-5">
              <p className="text-sm text-gray-400 mb-1">正在為 <span className="text-white font-bold">{editingAppt.name}</span> 修改時間</p>
              <p className="text-sm font-bold text-rose-400 line-through">
                原預約：{editingAppt.date} {editingAppt.exactDisplayTime} ({editingAppt.advisorName})
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1.5 text-slate-300">選擇新日期</label>
                  <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-amber-400 border border-gray-600" value={editFormData.date} onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value, timeSlots: [] })} />
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-slate-300">負責顧問</label>
                  <select className="w-full p-2.5 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-amber-400 border border-gray-600" value={editFormData.advisorId} onChange={(e) => setEditFormData({ ...editFormData, advisorId: e.target.value, timeSlots: [] })}>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1.5 text-slate-300">重新勾選時段 (可複選)</label>
                {editAvailableSlots.length === 0 ? (
                  <div className="text-[13px] text-gray-400 bg-gray-800 p-3 rounded-lg text-center border-dashed border border-gray-600">
                    該日無可預約時段，或顧問未排班
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                    {editAvailableSlots.map(slot => (
                      <button key={slot} type="button" onClick={() => handleToggleEditSlot(slot)} className={`py-2 text-xs rounded-lg border font-bold transition-colors ${editFormData.timeSlots.includes(slot) ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-gray-700 text-slate-300 border-gray-600 hover:bg-gray-600'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3 border-t border-gray-600 pt-4">
              <button className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm font-bold" onClick={() => setEditingAppt(null)}>取消</button>
              <button className="px-5 py-2 bg-amber-500 rounded-lg hover:bg-amber-600 text-white font-bold transition-colors shadow-lg flex items-center gap-2" onClick={handleSaveEditAppt}>
                <CheckCircle size={16} /> 儲存新時間
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
  }
