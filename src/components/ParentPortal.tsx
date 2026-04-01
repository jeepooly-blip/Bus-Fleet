import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { MapPin, Clock, User, Bus } from 'lucide-react';

interface ChildData {
  id: string;
  full_name: string;
  last_scan?: {
    scanned_at: string;
    latitude: number;
    longitude: number;
    trip_id: string;
    is_valid: boolean;
  };
  bus_location?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  };
}

export const ParentPortal: React.FC = () => {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParentData = async () => {
      try {
        setLoading(true);
        
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 2. Fetch children
        const { data: childrenData, error: childrenError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('parent_id', user.id);

        if (childrenError) throw childrenError;
        if (!childrenData) return;

        const childrenWithLogs: ChildData[] = [];

        for (const child of childrenData) {
          // 3. Fetch latest scan log for child
          const { data: scanLogs, error: scanError } = await supabase
            .from('scan_logs')
            .select('scanned_at, latitude, longitude, trip_id, is_valid')
            .eq('student_id', child.id)
            .order('scanned_at', { ascending: false })
            .limit(1);

          if (scanError) console.error('Error fetching scan logs:', scanError);
          
          const lastScan = scanLogs?.[0];
          let busLocation = null;

          if (lastScan) {
            // 4. Fetch trip to get bus_id
            const { data: tripData, error: tripError } = await supabase
              .from('trips')
              .select('bus_id')
              .eq('id', lastScan.trip_id)
              .single();

            if (tripError) console.error('Error fetching trip:', tripError);

            if (tripData?.bus_id) {
              // 5. Fetch bus location
              const { data: locData, error: locError } = await supabase
                .from('bus_locations')
                .select('latitude, longitude, updated_at')
                .eq('bus_id', tripData.bus_id)
                .single();

              if (locError) console.error('Error fetching bus location:', locError);
              busLocation = locData;
            }
          }

          childrenWithLogs.push({
            ...child,
            last_scan: lastScan,
            bus_location: busLocation
          });
        }

        setChildren(childrenWithLogs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParentData();

    // Set up realtime subscription for bus locations
    const subscription = supabase
      .channel('bus_locations_parent_portal')
      .on('postgres_changes' as any, { event: 'UPDATE', table: 'bus_locations' }, (payload: any) => {
        setChildren(prev => prev.map(child => {
          // This is a bit simplified, we'd need to check if this update belongs to the child's bus
          // For now, let's just trigger a re-fetch or handle it specifically if we had the bus_id stored
          return child;
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) return <div className="p-8 text-center">Loading portal...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6" /> Parent Portal
        </h1>
        <div className="text-sm text-muted-foreground">
          Welcome back
        </div>
      </header>

      {children.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
          <p>No children linked to this account.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {children.map(child => (
            <div key={child.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 bg-primary/5 border-b flex items-center justify-between">
                <h2 className="font-semibold text-lg">{child.full_name}</h2>
                <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Student</span>
              </div>
              
              <div className="p-6 grid md:grid-cols-2 gap-8">
                {/* Latest Scan Log */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Latest Activity
                  </h3>
                  {child.last_scan ? (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold">
                          {child.last_scan.is_valid ? '✅ Scanned Successfully' : '❌ Scan Refused'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(child.last_scan.scanned_at), 'h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">
                        Boarded at {format(new Date(child.last_scan.scanned_at), 'MMMM do')}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {child.last_scan.latitude.toFixed(4)}, {child.last_scan.longitude.toFixed(4)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No scan activity recorded.</p>
                  )}
                </div>

                {/* Bus Location */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                    <Bus className="w-4 h-4" /> Bus Location
                  </h3>
                  {child.bus_location ? (
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-primary">LIVE TRACKING</span>
                        <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                          ACTIVE
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Current Coordinates:</p>
                        <p className="text-xs font-mono bg-background p-2 rounded border">
                          LAT: {child.bus_location.latitude.toFixed(6)}<br />
                          LNG: {child.bus_location.longitude.toFixed(6)}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Last updated: {format(new Date(child.bus_location.updated_at), 'h:mm:ss a')}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-center">
                      <p className="text-sm text-muted-foreground">Bus location unavailable.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
