import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '../lib/supabase';

// Access token should be in .env.example
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface Bus {
  id: string;
  plate_number: string;
  current_route_id: string | null;
  status: 'active' | 'maintenance' | 'inactive';
  last_latitude: number;
  last_longitude: number;
}

interface RouteStop {
  latitude: number;
  longitude: number;
  order_index: number;
}

export const LiveMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [lng, setLng] = useState(35.9239); // Amman, Jordan
  const [lat, setLat] = useState(31.9454);
  const [zoom, setZoom] = useState(12);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [currentRouteId, setCurrentRouteId] = useState<string | null>(null);
  const [stopsVersion, setStopsVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const statusFilterRef = useRef<string | null>(null);
  const currentRouteIdRef = useRef<string | null>(null);
  const [counts, setCounts] = useState({ active: 0, maintenance: 0, inactive: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  useEffect(() => {
    currentRouteIdRef.current = currentRouteId;
  }, [currentRouteId]);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    if (!mapContainer.current) return;

    if (!mapboxgl.accessToken) {
      setError('Mapbox access token is missing. Please set VITE_MAPBOX_ACCESS_TOKEN in your environment.');
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [lng, lat],
        zoom: zoom
      });
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map. Check your access token and connection.');
      return;
    }

    map.current.on('load', () => {
      // Add a source and layer for the route line
      map.current?.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      map.current?.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#F27D26',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    });

    // Fetch initial bus locations
    const fetchBuses = async () => {
      // Join buses with bus_locations if possible, or just use buses if it has coords
      // Based on schema, buses has current_route_id, bus_locations has coords
      const { data, error } = await supabase
        .from('buses')
        .select(`
          id,
          plate_number,
          current_route_id,
          status,
          bus_locations (
            latitude,
            longitude
          )
        `);
      
      if (error) {
        console.error('Error fetching buses:', error);
        return;
      }

      data?.forEach((busData: any) => {
        const bus: Bus = {
          id: busData.id,
          plate_number: busData.plate_number,
          current_route_id: busData.current_route_id,
          status: busData.status,
          last_latitude: busData.bus_locations?.latitude || 31.9454,
          last_longitude: busData.bus_locations?.longitude || 35.9239
        };
        updateMarker(bus);
      });
      
      // Initial count update
      updateCounts();
    };

    fetchBuses();

    // Subscribe to realtime changes in bus_locations
    const channel = supabase
      .channel('bus-locations-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bus_locations' },
        async (payload) => {
          console.log('Location updated:', payload.new);
          // Fetch bus details to get plate_number, route_id, and status
          const { data: busData } = await supabase
            .from('buses')
            .select('id, plate_number, current_route_id, status')
            .eq('id', payload.new.bus_id)
            .single();

          if (busData) {
            const bus: Bus = {
              id: busData.id,
              plate_number: busData.plate_number,
              current_route_id: busData.current_route_id,
              status: busData.status,
              last_latitude: payload.new.latitude,
              last_longitude: payload.new.longitude
            };
            updateMarker(bus);
            updateCounts();
          }
        }
      )
      .subscribe();

    // Subscribe to realtime changes in stops
    const stopsChannel = supabase
      .channel('stops-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stops' },
        (payload) => {
          const changedRouteId = (payload.new as any)?.route_id || (payload.old as any)?.route_id;
          if (changedRouteId && changedRouteId === currentRouteIdRef.current) {
            console.log('Route stops modified, updating polyline...');
            setStopsVersion(v => v + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(stopsChannel);
      map.current?.remove();
    };
  }, []);

  const updateCounts = () => {
    let active = 0, maintenance = 0, inactive = 0;
    Object.keys(markers.current).forEach(id => {
      const el = markers.current[id].getElement();
      const status = el.getAttribute('data-status');
      if (status === 'active') active++;
      if (status === 'maintenance') maintenance++;
      if (status === 'inactive') inactive++;
    });
    setCounts({ active, maintenance, inactive });
  };

  // Effect to handle route highlighting when a bus is selected or stops change
  useEffect(() => {
    const highlightRoute = async () => {
      if (!selectedBusId || !map.current) {
        // Clear route
        const source = map.current?.getSource('route') as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [] }
          });
        }
        setCurrentRouteId(null);
        return;
      }

      // Get the bus's route_id
      const { data: bus } = await supabase
        .from('buses')
        .select('current_route_id')
        .eq('id', selectedBusId)
        .single();

      if (!bus?.current_route_id) {
        setCurrentRouteId(null);
        return;
      }

      setCurrentRouteId(bus.current_route_id);

      // Fetch stops for this route
      const { data: stops, error } = await supabase
        .from('stops')
        .select('latitude, longitude, order_index')
        .eq('route_id', bus.current_route_id)
        .order('order_index', { ascending: true });

      if (error || !stops) {
        console.error('Error fetching stops:', error);
        return;
      }

      const coordinates = stops.map(s => [s.longitude, s.latitude]);

      const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates as any
          }
        });

        // Fit map to route only if it's a new selection or coordinates changed significantly
        // For simplicity, we'll just fit bounds if coordinates exist
        if (coordinates.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          coordinates.forEach(coord => bounds.extend(coord as [number, number]));
          map.current.fitBounds(bounds, { padding: 50 });
        }
      }
    };

    highlightRoute();
  }, [selectedBusId, stopsVersion]);

  // Effect to handle marker filtering based on statusFilter
  useEffect(() => {
    Object.keys(markers.current).forEach(id => {
      const marker = markers.current[id];
      const el = marker.getElement();
      const status = el.getAttribute('data-status');
      
      if (!statusFilter || status === statusFilter) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
        // If the selected bus is filtered out, deselect it
        if (selectedBusId === id) {
          setSelectedBusId(null);
        }
      }
    });
    // Update counts whenever filtering happens to ensure UI is in sync
    updateCounts();
  }, [statusFilter, selectedBusId]);

  const updateMarker = (bus: Bus) => {
    if (!map.current) return;

    const { id, last_latitude, last_longitude, plate_number, status } = bus;

    // Status color mapping
    const statusColors = {
      active: '#22c55e', // green-500
      maintenance: '#eab308', // yellow-500
      inactive: '#ef4444' // red-500
    };

    const currentFilter = statusFilterRef.current;

    if (markers.current[id]) {
      // Update existing marker
      markers.current[id].setLngLat([last_longitude, last_latitude]);
      
      // Update status dot color if it exists
      const el = markers.current[id].getElement();
      el.setAttribute('data-status', status);
      
      // Apply filter immediately
      if (currentFilter && status !== currentFilter) {
        el.style.display = 'none';
      } else {
        el.style.display = 'flex';
      }

      const dot = el.querySelector('.status-dot') as HTMLDivElement;
      if (dot) {
        dot.style.backgroundColor = statusColors[status];
      }
    } else {
      // Create new marker
      const el = document.createElement('div');
      el.className = 'bus-marker cursor-pointer transition-all duration-300 hover:scale-110';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.backgroundColor = '#141414';
      el.style.border = '2px solid white';
      el.style.borderRadius = '50%';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontSize = '8px';
      el.style.fontWeight = 'bold';
      el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      el.style.position = 'relative';
      el.setAttribute('data-status', status);
      el.innerText = plate_number;

      // Initial visibility based on filter
      if (currentFilter && status !== currentFilter) {
        el.style.display = 'none';
      } else {
        el.style.display = 'flex';
      }

      // Add status dot
      const dot = document.createElement('div');
      dot.className = 'status-dot';
      dot.style.position = 'absolute';
      dot.style.top = '-2px';
      dot.style.right = '-2px';
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.borderRadius = '50%';
      dot.style.border = '2px solid white';
      dot.style.backgroundColor = statusColors[status];
      el.appendChild(dot);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedBusId(id);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([last_longitude, last_latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-sm">Bus ${plate_number}</h3>
            <p class="text-[10px] text-gray-500 uppercase mb-1">Status: <span class="font-bold" style="color: ${statusColors[status]}">${status}</span></p>
            <p class="text-[10px] text-gray-500 uppercase">Click to view route</p>
          </div>
        `))
        .addTo(map.current);

      markers.current[id] = marker;
    }
  };

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-[#141414]/10 shadow-lg" onClick={() => setSelectedBusId(null)}>
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-8 text-center">
          <div className="max-w-md">
            <p className="text-red-600 font-bold mb-2 uppercase tracking-widest text-xs">Configuration Error</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      ) : (
        <div ref={mapContainer} className="absolute inset-0" />
      )}
      <div className="absolute top-4 left-4 bg-[#E4E3E0] p-0 rounded-lg shadow-2xl border border-[#141414] z-10 w-56 overflow-hidden">
        <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2 border-b border-[#141414]">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-80">System Monitor</h3>
          <p className="text-xs font-bold italic serif">Amman Live Fleet</p>
        </div>
        
        <div className="p-1">
          <div className="grid grid-cols-4 px-3 py-1.5 border-b border-[#141414]/10">
            <span className="col-span-2 text-[9px] font-serif italic uppercase opacity-50">Status</span>
            <span className="text-[9px] font-serif italic uppercase opacity-50 text-right">Count</span>
            <span className="text-[9px] font-serif italic uppercase opacity-50 text-right">Filter</span>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setStatusFilter(statusFilter === 'active' ? null : 'active'); }}
            className={`grid grid-cols-4 items-center w-full px-3 py-2 transition-all duration-200 group border-b border-[#141414]/5 ${statusFilter === 'active' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
          >
            <div className="col-span-2 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'active' ? 'bg-[#22c55e]' : 'bg-[#22c55e]/60'}`} />
              <span className="text-[10px] font-mono uppercase tracking-wider">Active</span>
            </div>
            <span className="text-[10px] font-mono text-right">{counts.active}</span>
            <div className="flex justify-end">
              <div className={`w-2 h-2 border border-current rounded-sm flex items-center justify-center ${statusFilter === 'active' ? 'bg-white' : ''}`}>
                {statusFilter === 'active' && <div className="w-1 h-1 bg-[#141414]" />}
              </div>
            </div>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); setStatusFilter(statusFilter === 'maintenance' ? null : 'maintenance'); }}
            className={`grid grid-cols-4 items-center w-full px-3 py-2 transition-all duration-200 group border-b border-[#141414]/5 ${statusFilter === 'maintenance' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
          >
            <div className="col-span-2 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'maintenance' ? 'bg-[#eab308]' : 'bg-[#eab308]/60'}`} />
              <span className="text-[10px] font-mono uppercase tracking-wider">Service</span>
            </div>
            <span className="text-[10px] font-mono text-right">{counts.maintenance}</span>
            <div className="flex justify-end">
              <div className={`w-2 h-2 border border-current rounded-sm flex items-center justify-center ${statusFilter === 'maintenance' ? 'bg-white' : ''}`}>
                {statusFilter === 'maintenance' && <div className="w-1 h-1 bg-[#141414]" />}
              </div>
            </div>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); setStatusFilter(statusFilter === 'inactive' ? null : 'inactive'); }}
            className={`grid grid-cols-4 items-center w-full px-3 py-2 transition-all duration-200 group ${statusFilter === 'inactive' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
          >
            <div className="col-span-2 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'inactive' ? 'bg-[#ef4444]' : 'bg-[#ef4444]/60'}`} />
              <span className="text-[10px] font-mono uppercase tracking-wider">Offline</span>
            </div>
            <span className="text-[10px] font-mono text-right">{counts.inactive}</span>
            <div className="flex justify-end">
              <div className={`w-2 h-2 border border-current rounded-sm flex items-center justify-center ${statusFilter === 'inactive' ? 'bg-white' : ''}`}>
                {statusFilter === 'inactive' && <div className="w-1 h-1 bg-[#141414]" />}
              </div>
            </div>
          </button>
        </div>

        {(selectedBusId || statusFilter) && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setSelectedBusId(null); 
              setStatusFilter(null);
            }}
            className="w-full py-2 bg-[#141414] text-[#E4E3E0] text-[9px] font-mono uppercase tracking-[0.2em] hover:bg-orange-600 transition-colors border-t border-[#E4E3E0]/20"
          >
            Reset System View
          </button>
        )}
      </div>
    </div>
  );
};
