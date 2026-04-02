import { Bus, Route, Users, ShieldCheck, Map as MapIcon, WifiOff, Activity, Languages, X, MessageSquare, BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LiveMap } from "./components/LiveMap";
import { DriverDashboard } from "./components/DriverDashboard";
import { AdminPanel } from "./components/AdminPanel";

// TODO: Implement Phone OTP auth (Supabase) alongside Google — essential for Jordanian users.
// This will improve accessibility for users without Google accounts.

export default function App() {
  const { t, i18n } = useTranslation();
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  const testWhatsApp = async () => {
    setIsSending(true);
    // Simulate API call to our backend webhook or service
    setTimeout(() => {
      setIsSending(false);
      showToast(t('whatsapp_triggered') || "WhatsApp Notification Triggered");
    }, 1500);
  };

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="min-h-screen bg-secondary text-primary font-sans selection:bg-primary selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] px-6 py-3 bg-primary text-white rounded-full shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md"
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-50 transition-opacity">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-primary/10 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center sm:text-left rtl:sm:text-right"
        >
          <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase italic font-serif">{t('app_name')}</h1>
          <p className="text-[10px] md:text-xs text-primary/50 uppercase tracking-widest font-mono">{t('admin_center')}</p>
        </motion.div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={toggleLanguage}
            className="btn-outline"
          >
            <Languages size={14} />
            {t('switch_lang')}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-tighter border border-green-200">
            <Activity size={14} className="animate-pulse" />
            {t('system_live')}
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-6 md:gap-8 border-b border-primary/10 mb-8 overflow-x-auto no-scrollbar scroll-smooth">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`tab-item ${activeTab === 'overview' ? 'tab-item-active' : 'tab-item-inactive'}`}
          >
            {t('arch_overview')}
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`tab-item ${activeTab === 'notifications' ? 'tab-item-active' : 'tab-item-inactive'}`}
          >
            WhatsApp & Alerts
          </button>
          <button 
            onClick={() => setActiveTab('driver')}
            className={`tab-item ${activeTab === 'driver' ? 'tab-item-active' : 'tab-item-inactive'}`}
          >
            {t('driver_dashboard')}
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`tab-item ${activeTab === 'admin' ? 'tab-item-active' : 'tab-item-inactive'}`}
          >
            {t('admin_panel')}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                {[
                  { label: t('active_buses'), value: "284 / 300", icon: Bus, color: "text-blue-600" },
                  { label: t('active_trips'), value: "42", icon: Route, color: "text-orange-600" },
                  { label: t('students_scanned'), value: "1,240", icon: Users, color: "text-purple-600" },
                  { label: t('offline_syncs'), value: `12 ${t('pending')}`, icon: WifiOff, color: "text-red-600" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="card p-6 cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-xl bg-secondary group-hover:scale-110 transition-transform`}>
                        <stat.icon className={stat.color} size={20} />
                      </div>
                      <span className="text-[10px] font-mono text-primary/40 uppercase tracking-widest">0{i + 1}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-light tracking-tighter mb-1">{stat.value}</h3>
                    <p className="text-[10px] md:text-xs font-semibold text-primary/60 uppercase tracking-wider">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Architecture Section */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 card p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <ShieldCheck className="text-primary" size={24} />
                    <h2 className="text-xl font-serif italic font-medium">{t('arch_overview')}</h2>
                  </div>
                  
                  <div className="aspect-video bg-secondary rounded-2xl flex items-center justify-center border border-dashed border-primary/20 p-4 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-center relative z-10">
                      <p className="font-mono text-[10px] text-primary/40 mb-6 uppercase tracking-widest">[ System Architecture ]</p>
                      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 max-w-2xl mx-auto">
                        <div className="p-4 bg-white border border-primary rounded-xl text-[10px] font-bold uppercase tracking-tighter shadow-sm w-full md:w-32">Flutter App</div>
                        <div className="hidden md:block w-8 h-px bg-primary/20" />
                        <div className="p-5 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-tighter shadow-xl w-full md:w-40 scale-110">Supabase Cloud</div>
                        <div className="hidden md:block w-8 h-px bg-primary/20" />
                        <div className="p-4 bg-white border border-primary rounded-xl text-[10px] font-bold uppercase tracking-tighter shadow-sm w-full md:w-32">Admin Web</div>
                      </div>
                      <div className="mt-8 text-xs md:text-sm text-primary/70 leading-relaxed max-w-lg mx-auto font-medium">
                        {t('arch_desc')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-primary text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
                      <Activity size={120} />
                    </div>
                    <h3 className="text-lg font-serif italic mb-6 relative z-10">{t('quick_actions')}</h3>
                    <div className="space-y-4 relative z-10">
                      <button 
                        onClick={() => setShowMap(true)}
                        className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-4 transition-all hover:translate-x-2 text-xs font-bold uppercase tracking-widest"
                      >
                        <MapIcon size={18} />
                        {t('live_map')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('admin')}
                        className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-4 transition-all hover:translate-x-2 text-xs font-bold uppercase tracking-widest"
                      >
                        <Users size={18} />
                        {t('manage_students')}
                      </button>
                      <button className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-4 transition-all hover:translate-x-2 text-xs font-bold uppercase tracking-widest">
                        <ShieldCheck size={18} />
                        {t('security_logs')}
                      </button>
                    </div>
                  </div>

                  <div className="card p-8">
                    <h3 className="text-[10px] font-mono text-primary/40 uppercase tracking-widest mb-4">{t('recent_scans')}</h3>
                    <div className="space-y-4">
                      {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-primary/5 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-sm font-bold tracking-tight">{t('student_id')}: #2940{i}</p>
                            <p className="text-[10px] text-primary/50 uppercase font-mono">{t('bus')} 42 • {t('route')} A</p>
                          </div>
                          <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter bg-green-50 px-2 py-1 rounded-full">{t('verified')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          ) : activeTab === 'notifications' ? (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <MessageSquare size={20} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-serif italic font-medium">WhatsApp Business API</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="p-6 bg-green-50/50 rounded-2xl border border-green-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-800 mb-2">Active Template: trip_arrival</h4>
                    <p className="text-sm text-green-700 leading-relaxed italic">
                      "Hello {'{{1}}'}, your bus (Plate: {'{{2}}'}) is arriving at your stop in 5 minutes. Please be ready."
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-mono text-primary/40 uppercase tracking-widest">Architecture Logic</h4>
                    <ul className="space-y-3">
                      {[
                        "Trigger: Supabase Webhook on 'trips' status update",
                        "Handler: Supabase Edge Function (TypeScript)",
                        "API: Meta Graph API v17.0",
                        "Compliance: WhatsApp Template Opt-in required"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs md:text-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    onClick={testWhatsApp}
                    disabled={isSending}
                    className="btn-primary w-full"
                  >
                    {isSending ? (
                      <Activity className="animate-spin" size={18} />
                    ) : (
                      <BellRing size={18} />
                    )}
                    {isSending ? "Triggering..." : "Test Arrival Notification"}
                  </button>
                </div>
              </div>

              <div className="card p-6 md:p-8">
                <h3 className="text-[10px] font-mono text-primary/40 uppercase tracking-widest mb-6">Notification History</h3>
                <div className="space-y-4">
                  {[
                    { student: "Ahmad K.", time: "2 mins ago", status: "Delivered", type: "WhatsApp" },
                    { student: "Sara M.", time: "15 mins ago", status: "Read", type: "WhatsApp" },
                    { student: "Omar J.", time: "1 hour ago", status: "Delivered", type: "WhatsApp" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-primary/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                          <MessageSquare size={16} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{log.student}</p>
                          <p className="text-[10px] text-primary/50 font-mono uppercase">{log.time} • {log.type}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded-full ${log.status === 'Read' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'driver' ? (
            <motion.div
              key="driver"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DriverDashboard />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Live Map Modal */}
      <AnimatePresence>
        {showMap && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-secondary/95 backdrop-blur-xl p-4 md:p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-serif italic font-medium">{t('live_map')}</h2>
                <p className="text-[10px] md:text-xs text-primary/50 uppercase tracking-widest font-mono">Real-time Bus Fleet Tracking</p>
              </div>
              <button 
                onClick={() => setShowMap(false)}
                className="p-3 md:p-4 bg-primary text-white rounded-full hover:scale-110 transition-transform shadow-xl"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 rounded-2xl md:rounded-3xl overflow-hidden border border-primary/10 shadow-2xl bg-white">
              <LiveMap />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
