import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { Profile, Bus, Subscription } from "@jordan-bus-fleet/shared";
import { Users, Bus as BusIcon, Route, CreditCard, Plus, Trash2, Edit2, Check, X, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function AdminPanel() {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'drivers' | 'students' | 'subscriptions' | 'buses'>('drivers');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [allDrivers, setAllDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAssigning, setIsAssigning] = useState<{ busId: string, currentDriverId: string | null } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Profile>>({
    full_name: "",
    email: "",
    role: "student",
    phone_number: "",
    university_id: ""
  });

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeSubTab === 'subscriptions') {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*, student:profiles(*)');
        if (error) throw error;
        setSubscriptions(data || []);
      } else if (activeSubTab === 'buses') {
        const { data: busesData, error: busesError } = await supabase
          .from('buses')
          .select('*, assigned_driver:profiles(*)');
        if (busesError) throw busesError;
        setBuses(busesData || []);

        const { data: driversData, error: driversError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'driver');
        if (driversError) throw driversError;
        setAllDrivers(driversData || []);
      } else if (activeSubTab === 'drivers') {
        const { data: driversData, error: driversError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'driver');
        if (driversError) throw driversError;
        setProfiles(driversData || []);

        const { data: busesData, error: busesError } = await supabase
          .from('buses')
          .select('*');
        if (busesError) throw busesError;
        setBuses(busesData || []);
      } else if (activeSubTab === 'students') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student');
        if (error) throw error;
        setProfiles(data || []);
      }
    } catch (error) {
      logger.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string, table: string) => {
    if (!window.confirm(t('confirm_delete') || "Are you sure you want to delete this?")) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      logger.error("Error deleting:", error);
    }
  };

  const assignDriverToBus = async (busId: string, driverId: string | null) => {
    try {
      const { error } = await supabase
        .from('buses')
        .update({ assigned_driver_id: driverId })
        .eq('id', busId);
      if (error) throw error;
      setIsAssigning(null);
      fetchData();
    } catch (error) {
      logger.error("Error assigning driver:", error);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.university_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubscriptions = subscriptions.filter(s => 
    s.student?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student?.university_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBuses = buses.filter(b => 
    b.plate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Sub-Tabs */}
      <div className="flex gap-4 border-b border-primary/5 pb-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'drivers', icon: BusIcon, label: t('manage_drivers') },
          { id: 'students', icon: Users, label: t('manage_students') },
          { id: 'subscriptions', icon: CreditCard, label: t('manage_subscriptions') },
          { id: 'buses', icon: BusIcon, label: t('manage_buses') || "Manage Buses" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeSubTab === tab.id 
                ? "bg-primary text-white shadow-lg scale-105" 
                : "bg-secondary text-primary/60 hover:bg-primary/5"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Add */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={18} />
          <input 
            type="text"
            placeholder={t('search_placeholder') || "Search..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-primary/10 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary w-full md:w-auto"
        >
          <Plus size={18} />
          {activeSubTab === 'drivers' ? t('add_driver') : activeSubTab === 'students' ? t('add_student') : activeSubTab === 'subscriptions' ? t('add_subscription') : t('add_bus') || "Add Bus"}
        </button>
      </div>

      {/* Content Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right">
              <thead className="bg-secondary/50 border-b border-primary/5">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('full_name')}</th>
                  {activeSubTab !== 'subscriptions' && activeSubTab !== 'buses' && (
                    <>
                      {activeSubTab === 'drivers' && (
                        <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('assigned_bus') || "Assigned Bus"}</th>
                      )}
                      <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('email')}</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('phone')}</th>
                      {activeSubTab === 'students' && (
                        <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('university_id')}</th>
                      )}
                    </>
                  )}
                  {activeSubTab === 'subscriptions' && (
                    <>
                      <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('status')}</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('valid_until')}</th>
                    </>
                  )}
                  {activeSubTab === 'buses' && (
                    <>
                      <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('plate_number') || "Plate Number"}</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('assigned_driver') || "Assigned Driver"}</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('capacity') || "Capacity"}</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest">{t('status')}</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-[10px] font-mono text-primary/40 uppercase tracking-widest text-right rtl:text-left">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {activeSubTab === 'subscriptions' ? (
                  filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm">{sub.student?.full_name}</div>
                        <div className="text-[10px] text-primary/40 font-mono">{sub.student?.university_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded-full ${
                          sub.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-primary/60">
                        {new Date(sub.valid_until).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right rtl:text-left">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-primary/10 rounded-lg text-primary/60 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(sub.id, 'subscriptions')}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : activeSubTab === 'buses' ? (
                  filteredBuses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4 font-bold text-sm">{bus.plate_number}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-primary/60">
                            {bus.assigned_driver?.full_name || t('unassigned') || "Unassigned"}
                          </span>
                          <button 
                            onClick={() => setIsAssigning({ busId: bus.id, currentDriverId: bus.assigned_driver_id })}
                            className="p-1 hover:bg-primary/10 rounded text-primary/40 hover:text-primary transition-colors"
                          >
                            <Users size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-primary/60">{bus.capacity}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded-full ${
                          bus.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {bus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right rtl:text-left">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-primary/10 rounded-lg text-primary/60 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(bus.id, 'buses')}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4 font-bold text-sm">{profile.full_name}</td>
                      {activeSubTab === 'drivers' && (
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-primary/60">
                            {buses.find(b => b.assigned_driver_id === profile.id)?.plate_number || "-"}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-xs text-primary/60">{profile.email}</td>
                      <td className="px-6 py-4 text-xs font-mono text-primary/60">{profile.phone_number || "-"}</td>
                      {activeSubTab === 'students' && (
                        <td className="px-6 py-4 text-xs font-mono text-primary/60">{profile.university_id || "-"}</td>
                      )}
                      <td className="px-6 py-4 text-right rtl:text-left">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-primary/10 rounded-lg text-primary/60 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(profile.id, 'profiles')}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {(activeSubTab === 'subscriptions' ? filteredSubscriptions : activeSubTab === 'buses' ? filteredBuses : filteredProfiles).length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm text-primary/40 italic">No records found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal Placeholder */}
      <AnimatePresence>
        {isAssigning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-primary/20 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-primary/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-serif italic">{t('assign_driver') || "Assign Driver"}</h3>
                <button onClick={() => setIsAssigning(null)} className="p-2 hover:bg-secondary rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-1 block">{t('select_driver') || "Select Driver"}</label>
                  <select 
                    className="w-full p-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    value={isAssigning.currentDriverId || ""}
                    onChange={(e) => assignDriverToBus(isAssigning.busId, e.target.value || null)}
                  >
                    <option value="">{t('none') || "None"}</option>
                    {allDrivers.map(driver => (
                      <option key={driver.id} value={driver.id}>{driver.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4">
                  <button onClick={() => setIsAssigning(null)} className="btn-outline w-full">{t('cancel')}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-primary/20 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-primary/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-serif italic">{t('add_new')}</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-secondary rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-1 block">{t('full_name')}</label>
                  <input type="text" className="w-full p-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-1 block">{t('email')}</label>
                  <input type="email" className="w-full p-3 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={() => setIsAdding(false)} className="btn-outline flex-1">{t('cancel')}</button>
                  <button className="btn-primary flex-1">{t('save')}</button>
                </div>
              </div>
              <p className="mt-6 text-[10px] text-primary/40 italic text-center">
                Note: In this demo, adding a profile requires a valid Auth User ID. Use Supabase Dashboard for full user registration.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
