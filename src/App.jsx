import React, { useState, useEffect, useMemo } from 'react';import { Calendar, User, Clock, Activity, Trash, PlusCircle, CheckCircle, AlertCircle, MessageCircle, MessageSquare, Clipboard, Lock, Users, LogOut, Key, Copy, Plus, List, Sun, Moon, Settings, Phone, Check, Filter, BarChart, Star, Crown, Bot, Sparkles, RefreshCw, DollarSign } from 'lucide-react';


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
} catch (e) {}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz44rH6SVbcFQPUkdoxB7GVyeFuhZ-eO2lKqpYvFI-xDKHs1TP6eeV8HMLy5roCBIGyEQ/exec";

// 💰 營收計算單價 (老闆可在此修改每次服務的金額)
const SESSION_PRICE = 1600; // 每小時價格
// 👑 團隊成員設定
const TEAM_MEMBERS = [
  { id: 'ted', name: 'Ted (執行長)', pwd: 'pt', role: 'admin' }, 
  { id: 'jerry', name: 'Jerry (恢復顧問)', pwd: 'jerry123', role: 'advisor' }, 
  { id: 'amy', name: 'Amy (恢復顧問)', pwd: 'amy123', role: 'advisor' }
];

const serviceTypes = [
  "運動後疲勞恢復", "深層肌肉與筋膜放鬆", "動作控制與體態調整",
  "銀髮族活動力促進", "專項運動表現優化", "日常肌力與體能訓練",
  "其他 (詳情請打在備註)"
];

// ✨ AI 指數退避重試機制
 async function callGeminiAPI(prompt) {
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  console.log("偵錯：API Key 長度為:", apiKey ? apiKey.length : "無效/未定義");
  
  const url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'x-goog-api-key': apiKey 
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API 錯誤: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  // 這是正確的 return 位置，因為它被包裹在上方定義的 async function {} 之中
  return data.candidates[0].content.parts[0].text;
}

const generateAllSlots = () => {
  const slots = [];
  for (let h = 10; h < 22; h++) {
    slots.push(`${h}:00-${h}:30`);
    slots.push(`${h}:30-${h + 1}:00`);
  }
  return slots;
};
const ALL_TIME_SLOTS = generateAllSlots();

const formatTimeSlots = (slots) => {
  if (!slots || slots.length === 0) return '';
  const sorted = [...slots].sort();
  let merged = [];
  let currentStart = sorted[0].split('-')[0];
  let currentEnd = sorted[0].split('-')[1];

  for (let i = 1; i < sorted.length; i++) {
    const [nextStart, nextEnd] = sorted[i].split('-');
    if (currentEnd === nextStart) { currentEnd = nextEnd; } 
    else { merged.push(`${currentStart}-${currentEnd}`); currentStart = nextStart; currentEnd = nextEnd; }
  }
  merged.push(`${currentStart}-${currentEnd}`);
  return merged.join(', ');
};

const getDayLabel = (dateStr) => {
  const d = new Date(dateStr);
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return { date: `${d.getMonth() + 1}/${d.getDate()}`, weekday: days[d.getDay()] };
};

export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState([]); 
  const [activeAdvisors, setActiveAdvisors] = useState(TEAM_MEMBERS.map(m => m.id)); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ account: 'ted', password: '' });

  const getSavedCustomer = () => {
    try { const saved = localStorage.getItem('smartRecoveryCustomer'); return saved ? JSON.parse(saved) : { name: '', phone: '' }; } 
    catch { return { name: '', phone: '' }; }
  };
  const savedInfo = getSavedCustomer();

  const [formData, setFormData] = useState({
    name: savedInfo.name, phone: savedInfo.phone, isFirstTime: '', advisorId: '', date: '', timeSlots: [], serviceType: '', needs: ''
  });
  
  const [conflictError, setConflictError] = useState('');
  const [successData, setSuccessData] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 後台狀態管理
  const [adminTab, setAdminTab] = useState('appointments'); 
  const [apptFilter, setApptFilter] = useState('today');
  const [adminViewAdvisor, setAdminViewAdvisor] = useState('all');

  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleAdvisorId, setScheduleAdvisorId] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [additionalDates, setAdditionalDates] = useState([]);
  const [newExtraDate, setNewExtraDate] = useState('');
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);

  // 📊 老闆營業營收看板狀態
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedAnalyticsAdvisors, setSelectedAnalyticsAdvisors] = useState(TEAM_MEMBERS.map(m => m.id));

  // ✨ AI 狀態管理
  const [aiInput, setAiInput] = useState('');
  const [aiRec, setAiRec] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [adviceMap, setAdviceMap] = useState({});

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
      if (docSnap.exists()) setActiveAdvisors(docSnap.data().activeIds || []);
    });

    return () => { unsubAppt(); unsubSched(); unsubSettings(); };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = TEAM_MEMBERS.find(u => u.id === loginForm.account && u.pwd === loginForm.password);
    if (user) {
      setCurrentUser(user); setScheduleAdvisorId(user.id); setShowLoginModal(false);
      setLoginForm({ account: 'ted', password: '' }); setApptFilter('today'); setAdminViewAdvisor('all');
    } else { alert("密碼錯誤！請重新輸入。"); }
  };

  const handleLogout = () => {
    setCurrentUser(null); setAdminTab('appointments'); setAdditionalDates([]); setRangeStartDate(''); setRangeEndDate('');
  };

  // ----------------------------------------------------
  // ✨ AI 功能 1：客端推薦與自動套用
  // ----------------------------------------------------
  const handleAIGetRecommendation = async () => {
    if (!aiInput.trim()) return;
    setLoadingAi(true);
    const prompt = `客人描述身體狀況：「${aiInput}」。請從以下 Smart Recovery 的服務中，推薦一個最適合的項目，並給予一句溫暖簡短的建議原因。
服務選項：${serviceTypes.join('、')}。
回應格式：
【推薦項目】：(填入服務名稱)
【建議原因】：(填入簡短原因)`;
    try {
      const res = await callGeminiAPI(prompt);
      setAiRec(res.trim());
    } catch (e) {
      setAiRec("抱歉，目前 AI 顧問有點忙碌，請稍後再試。");
    } finally {
      setLoadingAi(false);
    }
  };

  const applyAiService = () => {
    const matchedService = serviceTypes.find(s => aiRec && aiRec.includes(s));
    if (matchedService) {
      setFormData(prev => ({ ...prev, serviceType: matchedService }));
      alert(`✅ 已為您自動套用服務：${matchedService}`);
    } else {
      alert("請手動在下方表單選擇對應的服務喔！");
    }
  };

  // ----------------------------------------------------
  // ✨ AI 功能 2：顧問端生成課後專屬建議
  // ----------------------------------------------------
  const generatePostSessionAdvice = async (apptId, customerName, service, note) => {
    setAdviceMap(prev => ({ ...prev, [apptId]: '✨ 正在為客人量身打造課後保養建議...' }));
    const prompt = `您是專業運動恢復顧問。您剛為客人「${customerName}」完成了「${service}」服務。客人備註：「${note || '無'}」。
請生成一段溫暖的 LINE 課後關心訊息。包含：1.溫馨問候 2.針對服務的3個居家伸展建議(條列式) 3.結語。`;
    try {
      const advice = await callGeminiAPI(prompt);
      setAdviceMap(prev => ({ ...prev, [apptId]: advice }));
    } catch (e) {
      setAdviceMap(prev => ({ ...prev, [apptId]: '❌ 產生建議失敗，請稍後再試。' }));
    }
  };

  const copyAdvice = (apptId) => {
    const text = adviceMap[apptId];
    if (!text) return;
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert('✅ 已複製！可直接貼上至 LINE 傳給客人'); } catch (err) {} document.body.removeChild(textArea);
  };

  // ----------------------------------------------------
  // 📅 排班與預約邏輯
  // ----------------------------------------------------
  useEffect(() => {
    if (scheduleAdvisorId && scheduleDate) {
      const existing = schedules.find(s => s.advisorId === scheduleAdvisorId && s.date === scheduleDate);
      setSelectedSlots(existing ? existing.slots : []); setAdditionalDates([]); 
    }
  }, [scheduleAdvisorId, scheduleDate, schedules]);

  const toggleAdminSlot = (slot) => setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);

  const handleSectionSelect = (startH, endH) => {
    const sectionSlots = ALL_TIME_SLOTS.filter(s => { const h = parseInt(s.split(':')[0]); return h >= startH && h < endH; });
    const allSelected = sectionSlots.every(s => selectedSlots.includes(s));
    setSelectedSlots(allSelected ? prev => prev.filter(s => !sectionSlots.includes(s)) : Array.from(new Set([...selectedSlots, ...sectionSlots])));
  };

  const toggleExtraDate = (dateStr) => {
    if (dateStr === scheduleDate) { alert("此日期已是上方選擇的主排班日期！"); return; }
    setAdditionalDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
  };

  // 🚀 排班神器：區間全選
  const handleBatchAddRange = () => {
    if (!rangeStartDate || !rangeEndDate) { alert("請填寫開始與結束日期！"); return; }
    if (new Date(rangeEndDate) < new Date(rangeStartDate)) { alert("結束日期不能早於開始日期！"); return; }
    let currentDate = new Date(rangeStartDate); const endDate = new Date(rangeEndDate); const addedList = [];
    while (currentDate <= endDate) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      if (dateStr !== scheduleDate && !additionalDates.includes(dateStr)) addedList.push(dateStr);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    if (addedList.length > 0) { 
      setAdditionalDates(prev => [...prev, ...addedList].sort()); 
      alert(`✅ 已成功匯入 ${addedList.length} 天！`); 
      setRangeStartDate(''); setRangeEndDate(''); 
    }
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
      await batch.commit(); 
      alert(`✅ 排班設定已成功套用至 ${1 + additionalDates.length} 個日期！`); 
      setAdditionalDates([]); 
    } catch (err) { alert("儲存失敗：" + err.message); }
    setIsSavingSchedule(false);
  };

  // 🗑️ 刪除整日排班
  const handleDeleteFullDay = async (schedId, sDate) => {
    if(window.confirm(`確定要刪除 ${sDate} 的所有排班嗎？\n(若有客人已預約該日，客人的預約紀錄仍會保留)`)) {
      try {
        await deleteDoc(doc(db, "schedules", schedId));
        if (sDate === scheduleDate) setSelectedSlots([]);
      } catch (err) { alert("刪除失敗：" + err.message); }
    }
  };

  // 📱 iPhone 樣式開關 (限制僅有執行長可操作，並加入樂觀更新)
  const handleToggleAdvisor = async (advisorId) => {
    if (currentUser?.role !== 'admin') {
      alert('權限不足：只有執行長 (Ted) 能夠更改顧問前台顯示狀態！');
      return;
    }

    const newActiveIds = activeAdvisors.includes(advisorId)
      ? activeAdvisors.filter(id => id !== advisorId)
      : [...activeAdvisors, advisorId];
    
    // 樂觀更新：讓開關瞬間滑動，不需要等待網路
    setActiveAdvisors(newActiveIds);

    try {
      await setDoc(doc(db, "settings", "teamConfig"), { activeIds: newActiveIds }, { merge: true });
    } catch (error) { 
      alert("狀態更新失敗，請檢查網路連線。"); 
    }
  };

  // 🗓️ 我的班表總覽 (未來排班)
  const advisorFutureSchedules = useMemo(() => {
    if (!scheduleAdvisorId) return [];
    const today = new Date().toISOString().split('T')[0];
    return schedules
      .filter(s => s.advisorId === scheduleAdvisorId && s.date >= today && s.slots && s.slots.length > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [schedules, scheduleAdvisorId]);

  const clientAvailableSlots = useMemo(() => {
    if (!formData.date || !formData.advisorId) return [];
    if (formData.advisorId === 'any') {
      let allAvailableSlots = new Set();
      activeAdvisors.forEach(advId => {
        const dailySchedule = schedules.find(s => s.advisorId === advId && s.date === formData.date);
        const bookedSlots = appointments.filter(a => a.advisorId === advId && a.date === formData.date).flatMap(a => a.timeSlots || []);
        if (dailySchedule && dailySchedule.slots) dailySchedule.slots.forEach(slot => { if (!bookedSlots.includes(slot)) allAvailableSlots.add(slot); });
      });
      return Array.from(allAvailableSlots).sort();
    } else {
      const dailySchedule = schedules.find(s => s.advisorId === formData.advisorId && s.date === formData.date);
      if (!dailySchedule || !dailySchedule.slots) return [];
      const bookedSlots = appointments.filter(a => a.advisorId === formData.advisorId && a.date === formData.date).flatMap(a => a.timeSlots || []);
      return dailySchedule.slots.filter(slot => !bookedSlots.includes(slot)).sort();
    }
  }, [formData.date, formData.advisorId, schedules, appointments, activeAdvisors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || formData.timeSlots.length === 0 || !formData.serviceType || !formData.advisorId || !formData.isFirstTime || !formData.date) {
      setConflictError('請完整填寫所有必填欄位，並選擇至少一個時段'); return;
    }
    if (formData.isFirstTime === 'yes' && formData.timeSlots.length < 2) {
      setConflictError('初次來店需進行詳細的身體評估，請至少選擇 2 個時段 (共 1 小時) 喔！'); return;
    }

    let finalAdvisorId = formData.advisorId;
    let finalAdvisorName = "不指定顧問";

    if (formData.advisorId !== 'any') {
       const isConflict = formData.timeSlots.some(slot => appointments.filter(a => a.advisorId === formData.advisorId && a.date === formData.date).flatMap(a => a.timeSlots || []).includes(slot));
       if (isConflict) { setConflictError('時段剛剛被預約走了，請重新選擇！'); setFormData(prev => ({...prev, timeSlots: []})); return; }
       const advisorObj = TEAM_MEMBERS.find(t => t.id === formData.advisorId);
       finalAdvisorName = advisorObj ? advisorObj.name : '顧問團隊';
    }

    setIsSubmitting(true);
    const customerTypeStr = formData.isFirstTime === 'yes' ? '初次預約' : '舊客複診';
    const sortedSlots = [...formData.timeSlots].sort();
    const gasTime = `${sortedSlots[0].split('-')[0]}-${sortedSlots[sortedSlots.length - 1].split('-')[1]}`;
    const exactDisplayTime = formatTimeSlots(sortedSlots);
    
    try {
      await addDoc(collection(db, "appointments"), {
        ...formData, advisorId: finalAdvisorId, customerType: customerTypeStr, exactDisplayTime, gasTime, advisorName: finalAdvisorName, status: 'confirmed', createdAt: new Date().toISOString()
      });

      if (WEBHOOK_URL.startsWith("http")) {
        fetch(WEBHOOK_URL, {
          method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: "new", name: formData.name, date: formData.date, time: gasTime, service: `[${customerTypeStr}] ${formData.serviceType} (指定：${finalAdvisorName})`, phone: formData.phone || "未提供", needs: formData.needs || "無" })
        });
      }

      localStorage.setItem('smartRecoveryCustomer', JSON.stringify({ name: formData.name, phone: formData.phone }));
      setSuccessData({ name: formData.name, customerType: customerTypeStr, date: formData.date, time: exactDisplayTime, service: formData.serviceType, advisor: finalAdvisorName });
      setFormData(prev => ({ ...prev, advisorId: '', isFirstTime: '', date: '', timeSlots: [], serviceType: '', needs: '' }));
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
    setFormData(prev => {
      const isSelected = prev.timeSlots.includes(slot);
      const newSlots = isSelected ? prev.timeSlots.filter(s => s !== slot) : [...prev.timeSlots, slot];
      return { ...prev, timeSlots: newSlots };
    });
    setConflictError(''); setSuccessData(null);
  };

  const handleDelete = async (appt) => {
    if(window.confirm(`確定要取消 ${appt.name} (${appt.date} ${appt.exactDisplayTime}) 的預約嗎？`)) {
      await deleteDoc(doc(db, "appointments", appt.id));
      if (WEBHOOK_URL.startsWith("http")) {
        fetch(WEBHOOK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "cancel", name: appt.name, date: appt.date, time: appt.gasTime || appt.exactDisplayTime, service: `[${appt.customerType || '預約'}] ${appt.serviceType} (指定：${appt.advisorName})` }) });
      }
    }
  };

  const handleCopyPhone = (phone, id) => {
    const textArea = document.createElement("textarea");
    textArea.value = phone;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedPhoneId(id);
      setTimeout(() => setCopiedPhoneId(null), 2000);
    } catch (err) {}
    document.body.removeChild(textArea);
  };

  const getFilteredAppointments = () => {
    let rawList = appointments;
    if (currentUser?.role === 'admin' && adminViewAdvisor !== 'all') {
      rawList = appointments.filter(a => a.advisorId === adminViewAdvisor);
    } else if (currentUser?.role !== 'admin') {
      rawList = appointments.filter(a => a.advisorId === currentUser?.id);
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return rawList.filter(appt => {
      if (!appt.date) return false;
      if (apptFilter === 'today') return appt.date === todayStr;
      if (apptFilter === 'upcoming') return appt.date > todayStr;
      if (apptFilter === 'past') return appt.date < todayStr;
      return true;
    });
  };
  const displayAppointments = getFilteredAppointments();

  // ==============================================
  // 📊 👑 老闆專屬營業營收看板計算
  // ==============================================
  const analyticsData = useMemo(() => {
    if (!currentUser || currentUser.role !== 'admin') return null;

    let kpi = { total: 0, new: 0, return: 0 };
    let advisorStats = {}, serviceStats = {};

    appointments.forEach(appt => {
      if (appt.date && appt.date.startsWith(selectedMonth)) {
        if (!selectedAnalyticsAdvisors.includes(appt.advisorId)) return;
        kpi.total++;
        if (appt.customerType === '初次預約') kpi.new++; else kpi.return++;
        const aid = appt.advisorId || 'any';
        advisorStats[aid] = (advisorStats[aid] || 0) + 1;
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
      
      {/* 左上角隱藏登入按鈕 */}
      <button onClick={() => !currentUser ? setShowLoginModal(true) : handleLogout()} className="fixed top-4 left-4 z-50 p-2.5 bg-[#12182c]/80 backdrop-blur-md rounded-full text-white/50 hover:text-[#e3b5a1] border border-white/10 transition-all shadow-md" title={currentUser ? "登出" : "管理員入口"}>
        <Settings size={20} />
      </button>

      {/* 右下角懸浮 LINE */}
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
              <select value={loginForm.account} onChange={e => setLoginForm({...loginForm, account: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-bold">
                {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none" required placeholder="輸入密碼" />
              <button type="submit" className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-3.5 rounded-xl shadow-md mt-4">登入系統</button>
            </form>
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
            
            {/* ✨ AI 客端智慧推薦區塊 */}
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
                      <CheckCircle size={14}/> 👉 聽從建議，自動套用此服務
                    </button>
                 </div>
               )}
            </div>

            {successData ? (
            <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center">
  <CheckCircle size={48} className="text-[#9aa486] mx-auto mb-4" />
  <h2 className="text-2xl font-bold text-[#192039] mb-4">預約申請已送出！</h2>
  <p className="text-slate-500 text-[14px] mb-6">請透過下方按鈕加入官方 LINE，我們將由專人為您確認保留。</p>

{/* ================= BOOKING DETAILS 區塊開始 ================= */}
  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 text-left">
    
    <h3 className="text-[12px] font-bold text-slate-400 tracking-widest mb-4 border-b border-slate-200 pb-3">
      BOOKING DETAILS
    </h3>
    
    <div className="space-y-3">
      
      {/* 姓名標籤 */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <span className="text-slate-500 text-[15px]">預約姓名</span>
        <span className="text-slate-800 font-bold text-[15px]">{successData?.name || '無'}</span>
      </div>
      
      {/* 客戶屬性 - 藍色背景 */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <span className="text-slate-500 text-[15px]">客戶屬性</span>
        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[15px] font-bold">
          {successData?.customerType || '無'} 
        </span>
      </div>
      
      {/* 預約項目 */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <span className="text-slate-500 text-[15px]">預約項目</span>
        <span className="text-slate-800 font-bold text-[15px] text-right max-w-[160px] truncate">
          {successData?.service || '無'}
        </span>
      </div>
      
      {/* 指定顧問 */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <span className="text-slate-500 text-[15px]">指定顧問</span>
        <span className="text-slate-800 font-bold text-[15px]">
          {successData?.advisor || '無'}
        </span>
      </div>
      
      {/* 預約日期 - 綠色背景 */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <span className="text-slate-500 text-[15px]">預約日期</span>
        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[15px] font-bold">
          {successData?.date || '無'}
        </span>
      </div>
      
      {/* 預約時間 - 紫色背景 */}
      <div className="flex justify-between items-center pb-1">
        <span className="text-slate-500 text-[15px]">預約時間</span>
        <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[15px] font-bold">
          {successData?.time || '無'}
        </span>
      </div>
      
    </div>
  </div>
  {/* ================= BOOKING DETAILS 區塊結束 ================= */}

  {/* 原本的 LINE 按鈕和返回首頁保持不變 */}
  <a href="[https://lin.ee/SaYoB3y](https://lin.ee/SaYoB3y)" target="_blank" rel="noopener noreferrer" className="w-full bg-[#06C755] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 mb-4">
    <MessageCircle size={20} /> 加入 LINE 官方帳號
  </a>
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
                       <button type="button" onClick={() => setFormData({...formData, isFirstTime: 'yes'})} className={`flex-1 py-3 rounded-xl border-2 font-bold text-[13px] ${formData.isFirstTime === 'yes' ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white'}`}>是，初次預約</button>
                       <button type="button" onClick={() => setFormData({...formData, isFirstTime: 'no'})} className={`flex-1 py-3 rounded-xl border-2 font-bold text-[13px] ${formData.isFirstTime === 'no' ? 'bg-[#192039] text-[#e3b5a1]' : 'bg-white'}`}>否，我來過</button>
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
                        {TEAM_MEMBERS.filter(m => activeAdvisors.includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
                  <div><label className="block text-[13px] font-bold text-slate-600 mb-1.5">需求描述 / 備註</label><textarea name="needs" value={formData.needs} onChange={handleInputChange} rows="2" className="w-full p-3 bg-slate-50 border rounded-2xl text-sm outline-none" /></div>
                  {conflictError && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-[13px] font-bold">{conflictError}</div>}
                  <button type="submit" disabled={isSubmitting} className="w-full bg-[#192039] text-[#e3b5a1] font-bold py-4 rounded-2xl shadow-lg mt-4 disabled:opacity-70">確認預約時段</button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/95 rounded-3xl shadow-xl flex flex-col min-h-[700px] overflow-hidden">
            <div className="bg-[#192039] p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#e3b5a1] p-2 rounded-full"><User size={20} className="text-[#192039]" /></div>
                <div><h2 className="text-white font-bold">{currentUser.name}</h2><p className="text-[#e3b5a1] text-xs">管理後台</p></div>
              </div>
              <div className="flex flex-wrap bg-[#232d4e] p-1 rounded-xl gap-1">
                <button onClick={() => setAdminTab('appointments')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${adminTab === 'appointments' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300'}`}><Clipboard size={16} /> 戰情室</button>
                <button onClick={() => setAdminTab('schedule')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${adminTab === 'schedule' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300'}`}><Calendar size={16} /> 排班</button>
                {/* 👑 老闆專屬標籤：只有 Ted 登入才會顯示 */}
                {currentUser.role === 'admin' && (
                  <button onClick={() => setAdminTab('analytics')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${adminTab === 'analytics' ? 'bg-[#e3b5a1] text-[#192039]' : 'text-slate-300'}`}><BarChart size={16} /> 營業營收</button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-8 flex-1 bg-slate-50">
              
              {/* 👑 營業營收儀表板 (僅老闆可見) */}
              {adminTab === 'analytics' && currentUser.role === 'admin' && (
                <div className="space-y-6 animate-in fade-in">
                   <div className="flex justify-between items-center border-b pb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2"><BarChart className="text-indigo-600" /> 營業營收儀表板</h3>
                   </div>
                   <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border">
                     {/* 動態歷史月份選單 */}
                     <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border rounded-lg font-bold">
                       {availableMonths.map(m => <option key={m} value={m}>{m} 月份</option>)}
                     </select>
                     {/* 顧問多選過濾 (包含老闆) */}
                     <div className="flex gap-2 flex-wrap">
                       {TEAM_MEMBERS.map(m => (
                         <button key={m.id} onClick={() => setSelectedAnalyticsAdvisors(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-transparent ${selectedAnalyticsAdvisors.includes(m.id) ? 'bg-[#192039] text-[#e3b5a1] border-[#192039] shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{m.name}</button>
                       ))}
                     </div>
                   </div>
                   
                   {/* 數據看板渲染 */}
                   {analyticsData && (
                     <>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-[#192039] to-[#232d4e] p-5 rounded-2xl shadow-sm border border-[#192039] text-center">
                            <p className="text-[#e3b5a1] text-xs font-bold mb-1">預估總營收 (NT$)</p>
                            <h2 className="text-3xl font-extrabold text-white">${(analyticsData.kpi.total * SESSION_PRICE).toLocaleString()}</h2>
                          </div>
                          <div className="bg-white p-5 rounded-2xl shadow-sm border text-center">
                            <p className="text-slate-500 text-xs font-bold mb-1">總接單數</p>
                            <h2 className="text-3xl font-extrabold text-[#192039]">{analyticsData.kpi.total}</h2>
                          </div>
                          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 text-center">
                            <p className="text-amber-600 text-xs font-bold mb-1">初診新客</p>
                            <h2 className="text-3xl font-extrabold text-amber-700">{analyticsData.kpi.new}</h2>
                          </div>
                          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-center">
                            <p className="text-blue-600 text-xs font-bold mb-1">舊客回流</p>
                            <h2 className="text-3xl font-extrabold text-blue-700">{analyticsData.kpi.return}</h2>
                          </div>
                       </div>
                       
                       <div className="grid md:grid-cols-2 gap-6">
                          <div className="bg-white p-6 rounded-2xl shadow-sm border">
                             <h4 className="font-bold flex items-center gap-2 mb-6"><Crown className="text-amber-500"/> 團隊接單營收貢獻</h4>
                             {TEAM_MEMBERS.map(m => {
                               const count = analyticsData.advisorStats[m.id] || 0;
                               const revenue = count * SESSION_PRICE;
                               const percentage = analyticsData.kpi.total > 0 ? (count / analyticsData.kpi.total) * 100 : 0;
                               return (
                                 <div key={m.id} className="mb-4">
                                   <div className="flex justify-between items-end mb-1">
                                     <span className="text-sm font-bold w-24 truncate">{m.name}</span>
                                     <span className="text-[13px] font-bold text-slate-600">{count} 單 <span className="text-green-600 ml-1">(NT$ {revenue.toLocaleString()})</span></span>
                                   </div>
                                   <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                     <div className="bg-[#192039] h-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                   </div>
                                 </div>
                               );
                             })}
                          </div>
                          <div className="bg-white p-6 rounded-2xl shadow-sm border">
                             <h4 className="font-bold flex items-center gap-2 mb-4"><Star className="text-amber-500"/> 服務項目熱度</h4>
                             {analyticsData.sortedServices.length === 0 ? (
                               <p className="text-sm text-slate-400 text-center py-10">此月份尚無服務資料</p>
                             ) : (
                               analyticsData.sortedServices.map((s, i) => (
                                 <div key={i} className="flex justify-between text-sm py-3 border-b border-dashed text-slate-600">
                                   <span className="font-bold">{s.name}</span>
                                   <span className="font-bold text-[#192039] bg-slate-100 px-3 py-1 rounded-lg">{s.count} 單</span>
                                 </div>
                               ))
                             )}
                          </div>
                       </div>
                     </>
                   )}
                </div>
              )}

              {adminTab === 'appointments' && (
                <div className="space-y-4">
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
                          <span className="font-bold text-lg">{appt.name}</span>
                          <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-600">{appt.customerType}</span>
                          <span className="bg-[#192039] text-[#e3b5a1] px-2 py-0.5 rounded text-xs font-bold tracking-wider">{appt.date} {appt.exactDisplayTime}</span>
                        </div>
                        <div className="text-[13px] font-bold text-slate-500 mb-2">{appt.serviceType} | 顧問: {appt.advisorName}</div>
                        {appt.needs && <div className="text-xs bg-slate-50 p-2.5 rounded border text-slate-600 mb-2 leading-relaxed">{appt.needs}</div>}
                        
                        <div className="flex gap-2 border-t border-slate-100 pt-3 mt-3 flex-wrap items-center justify-between">
                          <div className="flex gap-2">
                            <a href={`tel:${appt.phone}`} className="text-xs bg-green-50 border border-green-200 text-green-600 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"><Phone size={12}/> 撥打</a>
                            {apptFilter !== 'past' && <button onClick={() => handleDelete(appt)} className="text-xs bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"><Trash size={12}/> 取消</button>}
                          </div>
                          {/* ✨ AI 課後建議按鈕 (僅在歷史紀錄出現) */}
                          {apptFilter === 'past' && (
                            <button onClick={() => generatePostSessionAdvice(appt.id, appt.name, appt.serviceType, appt.needs)} className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm">
                               <Sparkles size={12}/> ✨ 產生課後溫馨建議
                            </button>
                          )}
                        </div>
                        
                        {/* 顯示 AI 課後建議結果 */}
                        {adviceMap[appt.id] && (
                          <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative group animate-in fade-in">
                             <p className="text-[13px] text-indigo-900 font-medium whitespace-pre-line leading-relaxed pb-6">{adviceMap[appt.id]}</p>
                             <button onClick={() => copyAdvice(appt.id)} className="absolute bottom-3 right-3 text-xs bg-white text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-50 flex items-center gap-1 shadow-sm transition-all">
                               <Copy size={12}/> 複製訊息
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {adminTab === 'schedule' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* 左側：排班控制台 */}
                  <div className="xl:col-span-7 bg-white p-6 rounded-2xl shadow-sm border h-full flex flex-col">
                     {/* 📱 iPhone 樣式顧問開關 (僅老闆可見可點，包含樂觀更新) */}
                     {currentUser.role === 'admin' && (
                       <div className="mb-6 pb-6 border-b border-slate-100">
                         <h3 className="text-[15px] font-bold mb-4 flex items-center gap-2 text-slate-800"><Users size={16} className="text-[#9aa486]" /> 顧問前台顯示狀態 (僅執行長可控)</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                           {TEAM_MEMBERS.map(m => {
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
                           {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="p-3 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#e3b5a1] flex-1 sm:flex-none" min={new Date().toISOString().split('T')[0]} />
                     </div>
                     {renderTimeSection('早班 (10:00-14:00)', <Sun size={14}/>, 10, 14, 'bg-amber-100', 'text-amber-700', 'border-amber-100')}
                     {renderTimeSection('午班 (14:00-18:00)', <Sun size={14}/>, 14, 18, 'bg-orange-100', 'text-orange-700', 'border-orange-100')}
                     {renderTimeSection('晚班 (18:00-22:00)', <Moon size={14}/>, 18, 22, 'bg-indigo-100', 'text-indigo-700', 'border-indigo-100')}
                     
                     <div className="mt-auto border-t border-slate-100 pt-6">
                        <h4 className="font-bold text-[14px] text-slate-700 mb-3 flex items-center gap-1.5"><Copy size={16} className="text-[#e3b5a1]" /> 快速同步多日排班 (區間與點選)</h4>
                        
                        {/* ⚡ 區間匯入神器 */}
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                           <div className="flex flex-1 gap-2">
                             <input type="date" value={rangeStartDate} onChange={e => setRangeStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-bold focus:ring-2 focus:ring-[#e3b5a1] outline-none w-full" placeholder="開始" />
                             <input type="date" value={rangeEndDate} onChange={e => setRangeEndDate(e.target.value)} min={rangeStartDate || new Date().toISOString().split('T')[0]} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-bold focus:ring-2 focus:ring-[#e3b5a1] outline-none w-full" placeholder="結束" />
                           </div>
                           <button type="button" onClick={handleBatchAddRange} className="bg-[#e3b5a1] hover:bg-[#d6a590] text-[#192039] px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm whitespace-nowrap">
                              <Plus size={14}/> 區間全選
                           </button>
                        </div>

                        {/* ⚡ 28天極速點選神器 */}
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
                        
                        {/* 顯示已選取的同步日期清單 */}
                        {additionalDates.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-[12px] text-slate-500 font-bold w-full flex justify-between items-center mb-1">
                              <span>已選同步日期 ({additionalDates.length} 天)：</span>
                              <button type="button" onClick={() => setAdditionalDates([])} className="text-rose-500 hover:underline">全部清空</button>
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

                  {/* 右側：我的班表總覽 */}
                  <div className="xl:col-span-5 bg-slate-100/80 rounded-2xl border border-slate-200 p-5 shadow-inner flex flex-col h-[750px]">
                     <div className="flex items-center gap-2 mb-5 border-b border-slate-200 pb-4">
                        <List size={18} className="text-[#8e6856]" />
                        <h3 className="text-[16px] font-bold text-slate-800">班表總覽 ({TEAM_MEMBERS.find(m=>m.id===scheduleAdvisorId)?.name})</h3>
                        <span className="ml-auto text-[11px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold">未來有 {advisorFutureSchedules.length} 天排班</span>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {advisorFutureSchedules.length === 0 ? (
                          <div className="text-center text-slate-400 py-32 flex flex-col items-center">
                            <Calendar size={48} className="opacity-20 mb-4" />
                            <p className="font-medium text-[13px]">目前尚無未來的排班</p>
                          </div>
                        ) : (
                          advisorFutureSchedules.map(sched => (
                             <div key={sched.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-[#e3b5a1] transition-all relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#9aa486]"></div>
                                <div className="pl-2">
                                   <p className="font-bold text-[#192039] text-[14px] mb-1">{sched.date}</p>
                                   <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[200px]">{formatTimeSlots(sched.slots)}</p>
                                </div>
                                <button onClick={() => handleDeleteFullDay(sched.id, sched.date)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-200 shrink-0 shadow-sm" title="刪除這天的班表">
                                   <Trash size={14} />
                                </button>
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

        {/* 底部 IG SVG */}
        {!currentUser && (
          <div className="flex justify-center pb-8 pt-4 relative z-10">
             <a href="https://www.instagram.com/_smart.recovery?igsh=MWxocGJqanEwa2Rhaw==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/50 hover:text-white transition-all text-sm font-bold bg-white/5 px-6 py-3 rounded-full border border-white/10 hover:bg-white/10 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                追蹤我們的 Instagram
             </a>
          </div>
        )}
      </div>

      <footer className="w-full flex justify-between items-center px-4 pb-24 pt-4 text-xs text-white/30 relative z-10">
        <p className="mx-auto">© 2026 Smart Recovery</p>
      </footer>
    </div>
  );
  }
