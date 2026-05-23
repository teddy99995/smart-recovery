export const BossDashboard = ({ data }) => {
  if (!data || !Array.isArray(data)) return null;

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mt-6">
        <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
          📊 老闆數據分析面板
        </h2>
        <p className="text-slate-500">目前尚無預約訂單資料可供分析。</p>
      </div>
    );
  }

  try {
    const stats = getBossAnalytics(data);
    if (!stats || typeof stats !== 'object') return null;

    return (
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mt-6">
        <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
          📊 老闆歷史月份分析
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(stats).map(month => (
            <div key={month} className="bg-slate-50 p-5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm">
              <h3 className="text-lg font-bold mb-3 border-b border-slate-200 pb-3 text-slate-700">
                {month} 月份
              </h3>
              <p className="text-slate-600 mb-4 flex items-center justify-between">
                <span>總有效預約</span>
                <span className="font-extrabold text-2xl text-indigo-600">{stats[month]?.total || 0}</span>
              </p>
              
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-blue-100 text-blue-700 py-1.5 rounded-lg font-bold">
                  新客 {stats[month]?.new || 0}
                </div>
                <div className="bg-emerald-100 text-emerald-700 py-1.5 rounded-lg font-bold">
                  回流 {stats[month]?.return || 0}
                </div>
                <div className="bg-rose-100 text-rose-700 py-1.5 rounded-lg font-bold">
                  取消 {stats[month]?.cancelled || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (err) {
    console.error("Dashboard 渲染錯誤:", err);
    return null;
  }
};
