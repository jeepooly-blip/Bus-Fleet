import { Bus, Route, Users, ShieldCheck, Map as MapIcon, WifiOff, Activity, Languages, X, MessageSquare, BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LiveMap } from "./components/LiveMap";
import { DriverDashboard } from "./components/DriverDashboard";

export default function App() {
  const { t, i18n } = useTranslation();
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSending, setIsSending] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  const testWhatsApp = async () => {
    setIsSending(true);
    // Simulate API call to our backend webhook or service
    setTimeout(() => {
      setIsSending(false);
      alert("WhatsApp Notification Triggered (Simulation)\nTemplate: trip_arrival\nVars: [Student Name, Plate #]");
    }, 1500);
  };

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#141414] font-sans">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white px-8 py-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl font-bold tracking-tight uppercase italic font-serif">{t('app_name')}</h1>
          <p className="text-xs text-[#141414]/50 uppercase tracking-widest font-mono">{t('admin_center')}</p>
        </motion.div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1 border border-[#141414]/10 rounded-full text-xs font-bold hover:bg-[#141414]/5 transition-colors"
          >
            <Languages size={14} />
            {t('switch_lang')}
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-tighter">
            <Activity size={14} />
            {t('system_live')}
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-8 border-b border-[#141414]/10 mb-8">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-4 border-b-2 transition-all text-sm font-bold uppercase tracking-widest ${activeTab === 'overview' ? 'border-[#141414] text-[#141414]' : 'border-transparent text-[#141414]/40'}`}
          >
            {t('arch_overview')}
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`pb-4 border-b-2 transition-all text-sm font-bold uppercase tracking-widest ${activeTab === 'notifications' ? 'border-[#141414] text-[#141414]' : 'border-transparent text-[#141414]/40'}`}
          >
            WhatsApp & Alerts
          </button>
          <button 
            onClick={() => setActiveTab('driver')}
            className={`pb-4 border-b-2 transition-all text-sm font-bold uppercase tracking-widest ${activeTab === 'driver' ? 'border-[#141414] text-[#141414]' : 'border-transparent text-[#141414]/40'}`}
          >
            {t('driver_dashboard')}
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
                    className="bg-white p-6 border border-[#141414]/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <stat.icon className={stat.color} size={24} />
                      <span className="text-[10px] font-mono text-[#141414]/40 uppercase tracking-widest">0{i + 1}</span>
                    </div>
                    <h3 className="text-3xl font-light tracking-tighter mb-1">{stat.value}</h3>
                    <p className="text-xs font-semibold text-[#141414]/60 uppercase tracking-wider">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Architecture Section */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-[#141414]/5 rounded-3xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <ShieldCheck className="text-[#141414]" size={24} />
                    <h2 className="text-xl font-serif italic font-medium">{t('arch_overview')}</h2>
                  </div>
                  
                  <div className="aspect-video bg-[#F5F5F4] rounded-2xl flex items-center justify-center border border-dashed border-[#141414]/20 p-4">
                    <div className="text-center">
                      <p className="font-mono text-xs text-[#141414]/40 mb-4 uppercase tracking-widest">[ Mermaid Diagram Placeholder ]</p>
                      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                        <div className="p-4 bg-white border border-[#141414] rounded-lg text-[10px] font-bold uppercase tracking-tighter">Flutter App (Offline)</div>
                        <div className="p-4 bg-[#141414] text-white rounded-lg text-[10px] font-bold uppercase tracking-tighter">Supabase Realtime</div>
                        <div className="p-4 bg-white border border-[#141414] rounded-lg text-[10px] font-bold uppercase tracking-tighter">Next.js Admin</div>
                      </div>
                      <div className="mt-8 text-sm text-[#141414]/70 leading-relaxed max-w-lg mx-auto">
                        {t('arch_desc')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#141414] text-white rounded-3xl p-8 shadow-xl">
                    <h3 className="text-lg font-serif italic mb-6">{t('quick_actions')}</h3>
                    <div className="space-y-4">
                      <button 
                        onClick={() => setShowMap(true)}
                        className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-4 transition-colors text-sm font-bold uppercase tracking-widest"
                      >
                        <MapIcon size={18} />
                        {t('live_map')}
                      </button>
                      <button className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-4 transition-colors text-sm font-bold uppercase tracking-widest">
                        <Users size={18} />
                        {t('manage_students')}
                      </button>
                      <button className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-4 transition-colors text-sm font-bold uppercase tracking-widest">
                        <ShieldCheck size={18} />
                        {t('security_logs')}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-[#141414]/5 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-xs font-mono text-[#141414]/40 uppercase tracking-widest mb-4">{t('recent_scans')}</h3>
                    <div className="space-y-4">
                      {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-[#141414]/5 pb-3">
                          <div>
                            <p className="text-sm font-bold tracking-tight">{t('student_id')}: #2940{i}</p>
                            <p className="text-[10px] text-[#141414]/50 uppercase font-mono">{t('bus')} 42 • {t('route')} A</p>
                          </div>
                          <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">{t('verified')}</span>
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
              <div className="bg-white border border-[#141414]/5 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <MessageSquare className="text-green-600" size={24} />
                  <h2 className="text-xl font-serif italic font-medium">WhatsApp Business API</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-green-800 mb-2">Active Template: trip_arrival</h4>
                    <p className="text-sm text-green-700 leading-relaxed italic">
                      "Hello {'{{1}}'}, your bus (Plate: {'{{2}}'}) is arriving at your stop in 5 minutes. Please be ready."
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-[#141414]/40 uppercase tracking-widest">Architecture Logic</h4>
                    <ul className="space-y-3">
                      {[
                        "Trigger: Supabase Webhook on 'trips' status update",
                        "Handler: Supabase Edge Function (TypeScript)",
                        "API: Meta Graph API v17.0",
                        "Compliance: WhatsApp Template Opt-in required"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    onClick={testWhatsApp}
                    disabled={isSending}
                    className="w-full py-4 bg-[#141414] text-white rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-[#141414]/90 transition-all disabled:opacity-50"
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

              <div className="bg-white border border-[#141414]/5 rounded-3xl p-8 shadow-sm">
                <h3 className="text-xs font-mono text-[#141414]/40 uppercase tracking-widest mb-6">Notification History</h3>
                <div className="space-y-4">
                  {[
                    { student: "Ahmad K.", time: "2 mins ago", status: "Delivered", type: "WhatsApp" },
                    { student: "Sara M.", time: "15 mins ago", status: "Read", type: "WhatsApp" },
                    { student: "Omar J.", time: "1 hour ago", status: "Delivered", type: "WhatsApp" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-[#141414]/5 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F5F5F4] rounded-full flex items-center justify-center">
                          <MessageSquare size={16} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{log.student}</p>
                          <p className="text-[10px] text-[#141414]/50 font-mono uppercase">{log.time} • {log.type}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${log.status === 'Read' ? 'text-blue-600' : 'text-green-600'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="driver"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DriverDashboard />
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
            className="fixed inset-0 z-50 bg-[#F5F5F4]/95 backdrop-blur-xl p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-serif italic font-medium">{t('live_map')}</h2>
                <p className="text-xs text-[#141414]/50 uppercase tracking-widest font-mono">Real-time Bus Fleet Tracking</p>
              </div>
              <button 
                onClick={() => setShowMap(false)}
                className="p-4 bg-[#141414] text-white rounded-full hover:scale-110 transition-transform"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 rounded-3xl overflow-hidden border border-[#141414]/10 shadow-2xl bg-white">
              <LiveMap />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
