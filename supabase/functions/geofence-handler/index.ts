import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { record, table, type } = await req.json()
    
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (table === 'bus_locations' && (type === 'INSERT' || type === 'UPDATE')) {
      const { bus_id, latitude, longitude } = record
      
      // 1. Check for geofencing (proximity to stops)
      const { data: nearbyStops, error: stopsError } = await supabase.rpc('check_geofence', {
        bus_lat: latitude,
        bus_lng: longitude
      })

      if (stopsError) throw stopsError

      // 2. Trigger WhatsApp notifications if a stop is reached
      if (nearbyStops && nearbyStops.length > 0) {
        for (const stop of nearbyStops) {
          // Call WhatsApp API or internal notification service
          console.log(`Bus ${bus_id} reached stop ${stop.name}`)
        }
      }

      // 3. Route Compliance Check
      // ... logic to check if bus is on its assigned route ...
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
