import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bus, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Clock, 
  MapPin,
  ShieldAlert,
  Search,
  Route,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface DriverData {
  id: string;
  full_name: string;
}

interface TripData {
  id: string;
  status: string;
  start_time: string;
  route: {
    name: string;
    origin: string;
    destination: string;
  };
  bus: {
    id: string;
    plate_number: string;
    status: string;
    panic_status: boolean;
  };
}

export const DriverDashboard: React.FC = () => {
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [panicLoading, setPanicLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [complianceResult, setComplianceResult] = useState<{ name: string; allowed: boolean } | null>(null);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', user.id)
          .single();
        
        if (profile) setDriver(profile);

        // Fetch active trip
        const { data: trip } = await supabase
          .from('trips')
          .select(`
            id, 
            status, 
            start_time,
            route:routes(name, origin, destination),
            bus:buses(id, plate_number, status, panic_status)
          `)
          .eq('driver_id', user.id)
          .eq('status', 'in_progress')
          .single();

        if (trip) {
          setActiveTrip(trip as any);
        }
      } catch (error) {
        console.error('Error fetching driver data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();

    // Subscribe to bus changes (for panic status)
    const channel = supabase
      .channel('driver_dashboard_updates')
      .on('postgres_changes' as any, { event: 'UPDATE', table: 'buses' }, (payload: any) => {
        if (activeTrip && payload.new.id === activeTrip.bus.id) {
          setActiveTrip(prev => prev ? {
            ...prev,
            bus: { ...prev.bus, ...payload.new }
          } : null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTrip?.bus.id]);

  const handlePanic = async () => {
    if (!activeTrip || panicLoading) return;
    
    setPanicLoading(true);
    try {
      const { error } = await supabase
        .from('buses')
        .update({ panic_status: !activeTrip.bus.panic_status })
        .eq('id', activeTrip.bus.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Panic update failed:', error);
    } finally {
      setPanicLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip || tripLoading) return;

    setTripLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', activeTrip.id);

      if (error) throw error;
      
      // Clear active trip locally
      setActiveTrip(null);
      setShowCompleteConfirm(false);
    } catch (error) {
      console.error('Failed to complete trip:', error);
    } finally {
      setTripLoading(false);
    }
  };

  const checkCompliance = async () => {
    if (!searchQuery) return;
    
    // Simulate route compliance check
    // In a real app, this would query the 'profiles' table for assigned_route_id
    try {
      const { data: student } = await supabase
        .from('profiles')
        .select('full_name, assigned_route_id')
        .eq('university_id', searchQuery)
        .single();
      
      if (student) {
        // Check if student's assigned route matches current trip's route
        // This is a simplified check for the dashboard
        setComplianceResult({
          name: student.full_name,
          allowed: true // Logic would go here
        });
      } else {
        setComplianceResult(null);
      }
    } catch (error) {
      setComplianceResult(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#141414]"></div>
    </div>
  );

  if (!activeTrip) return (
    <div className="bg-white border border-[#141414]/10 rounded-3xl p-12 text-center">
      <div className="w-16 h-16 bg-[#F5F5F4] rounded-full flex items-center justify-center mx-auto mb-6">
        <Navigation size={32} className="text-[#141414]/30" />
      </div>
      <h2 className="text-xl font-serif italic mb-2">No Active Trip</h2>
      <p className="text-sm text-[#141414]/50 max-w-xs mx-auto">
        You don't have an active trip assigned. Please check with dispatch or wait for your next scheduled shift.
      </p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Driver Welcome */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-mono text-[#141414]/40 uppercase tracking-widest mb-1">Shift in progress</p>
          <h2 className="text-3xl font-serif italic">Welcome, {driver?.full_name || 'Driver'}</h2>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-tighter text-green-600 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            System Online
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trip Details Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-[#141414]/5 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Navigation size={120} />
            </div>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Route size={20} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-widest">Active Route</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-mono text-[#141414]/40 uppercase tracking-widest block mb-2">Route Name</label>
                  <p className="text-2xl font-serif italic">{activeTrip.route.name}</p>
                </div>
                <div className="flex items-center gap-8">
                  <div>
                    <label className="text-[10px] font-mono text-[#141414]/40 uppercase tracking-widest block mb-1">Origin</label>
                    <p className="text-sm font-bold">{activeTrip.route.origin}</p>
                  </div>
                  <div className="w-8 h-px bg-[#141414]/10"></div>
                  <div>
                    <label className="text-[10px] font-mono text-[#141414]/40 uppercase tracking-widest block mb-1">Destination</label>
                    <p className="text-sm font-bold">{activeTrip.route.destination}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-[#F5F5F4] rounded-2xl">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Bus size={20} className="text-[#141414]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#141414]/40 uppercase tracking-widest">Bus Plate</p>
                    <p className="text-lg font-bold tracking-tighter">{activeTrip.bus.plate_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Clock size={16} className="text-[#141414]/40" />
                  <p className="text-xs text-[#141414]/60">
                    Started at {format(new Date(activeTrip.start_time), 'h:mm a')}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-[#141414]/5">
                  <AnimatePresence mode="wait">
                    {!showCompleteConfirm ? (
                      <motion.button 
                        key="complete-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCompleteConfirm(true)}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        Mark Trip as Completed
                      </motion.button>
                    ) : (
                      <motion.div 
                        key="confirm-area"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-green-50 p-4 rounded-2xl border border-green-100 space-y-3"
                      >
                        <p className="text-xs font-bold text-green-800 text-center uppercase tracking-widest">Confirm Completion?</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowCompleteConfirm(false)}
                            className="flex-1 py-3 bg-white border border-green-200 text-green-800 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-green-100 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleCompleteTrip}
                            disabled={tripLoading}
                            className="flex-1 py-3 bg-green-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center disabled:opacity-50"
                          >
                            {tripLoading ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : 'Yes, Complete'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Route Compliance Tool */}
          <div className="bg-white border border-[#141414]/5 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} className="text-purple-600" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-widest">Route Compliance</h3>
              </div>
              <span className="text-[10px] font-mono text-[#141414]/40 uppercase tracking-widest">Verification Tool</span>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/30" size={18} />
                <input 
                  type="text" 
                  placeholder="Enter Student University ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#F5F5F4] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#141414]/10 outline-none"
                />
              </div>
              <button 
                onClick={checkCompliance}
                className="px-8 bg-[#141414] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#141414]/90 transition-all"
              >
                Verify
              </button>
            </div>

            <AnimatePresence>
              {complianceResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-6 rounded-2xl flex items-center justify-between ${complianceResult.allowed ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${complianceResult.allowed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {complianceResult.allowed ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{complianceResult.name}</p>
                      <p className="text-xs uppercase tracking-widest font-mono opacity-60">
                        {complianceResult.allowed ? 'Authorized for this route' : 'Assigned to different route'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setComplianceResult(null)}
                    className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100"
                  >
                    Clear
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Safety & Status Column */}
        <div className="space-y-8">
          {/* Panic Button Section */}
          <div className={`rounded-3xl p-8 shadow-xl transition-all duration-500 ${activeTrip.bus.panic_status ? 'bg-red-600 text-white animate-pulse' : 'bg-[#141414] text-white'}`}>
            <div className="flex items-center gap-3 mb-8">
              <ShieldAlert size={24} />
              <h3 className="text-lg font-serif italic">Safety Controls</h3>
            </div>
            
            <div className="text-center py-8">
              <button 
                onClick={handlePanic}
                disabled={panicLoading}
                className={`w-32 h-32 rounded-full border-4 border-white/20 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${activeTrip.bus.panic_status ? 'bg-white text-red-600 shadow-2xl' : 'bg-red-600 hover:bg-red-700'}`}
              >
                <AlertTriangle size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {activeTrip.bus.panic_status ? 'CANCEL' : 'PANIC'}
                </span>
              </button>
              <p className="mt-6 text-xs text-white/60 leading-relaxed">
                {activeTrip.bus.panic_status 
                  ? "EMERGENCY SIGNAL SENT. Dispatch has been notified of your location."
                  : "Press in case of emergency. This will alert dispatch and emergency services immediately."
                }
              </p>
            </div>
          </div>

          {/* Bus Health/Status */}
          <div className="bg-white border border-[#141414]/5 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xs font-mono text-[#141414]/40 uppercase tracking-widest mb-6">Vehicle Status</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm font-bold">Engine</p>
                </div>
                <span className="text-[10px] font-mono text-[#141414]/40">OPTIMAL</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm font-bold">GPS Signal</p>
                </div>
                <span className="text-[10px] font-mono text-[#141414]/40">STRONG</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <p className="text-sm font-bold">Fuel Level</p>
                </div>
                <span className="text-[10px] font-mono text-[#141414]/40">65%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
