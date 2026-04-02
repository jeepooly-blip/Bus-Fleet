-- Phase 2: Security & Access Control (Supabase RLS)

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;

-- 2. Helper Function: Check if User is Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper Function: Check if User is Driver
CREATE OR REPLACE FUNCTION is_driver()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'driver' 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Helper Function: Check if User is Parent
CREATE OR REPLACE FUNCTION is_parent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'parent' 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PROFILES POLICIES
-- ==========================================
CREATE POLICY "Admins have full access to profiles" 
ON profiles FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Parents can view their children's profiles" 
ON profiles FOR SELECT TO authenticated USING (parent_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ==========================================
-- TRIPS POLICIES
-- ==========================================
CREATE POLICY "Admins have full access to trips" 
ON trips FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Drivers can view all trips" 
ON trips FOR SELECT TO authenticated USING (is_driver());

CREATE POLICY "Drivers can insert their own trips" 
ON trips FOR INSERT TO authenticated 
WITH CHECK (is_driver() AND driver_id = auth.uid());

CREATE POLICY "Drivers can update their own trips" 
ON trips FOR UPDATE TO authenticated 
USING (is_driver() AND driver_id = auth.uid())
WITH CHECK (is_driver() AND driver_id = auth.uid());

CREATE POLICY "Students can view active trips" 
ON trips FOR SELECT TO authenticated 
USING (status = 'in_progress');

CREATE POLICY "Parents can view trips their children are on" 
ON trips FOR SELECT TO authenticated 
USING (
  is_parent() AND 
  EXISTS (
    SELECT 1 FROM scan_logs 
    JOIN profiles ON scan_logs.student_id = profiles.id 
    WHERE scan_logs.trip_id = trips.id 
    AND profiles.parent_id = auth.uid()
  )
);

-- ==========================================
-- SCAN_LOGS POLICIES
-- ==========================================
CREATE POLICY "Admins have full access to scan_logs" 
ON scan_logs FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Drivers can insert scan logs for their trips" 
ON scan_logs FOR INSERT TO authenticated 
WITH CHECK (
  is_driver() AND 
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = scan_logs.trip_id 
    AND trips.driver_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own scan logs" 
ON scan_logs FOR SELECT TO authenticated 
USING (student_id = auth.uid());

CREATE POLICY "Parents can view their children's scan logs" 
ON scan_logs FOR SELECT TO authenticated 
USING (
  is_parent() AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = scan_logs.student_id 
    AND profiles.parent_id = auth.uid()
  )
);

-- ==========================================
-- SUBSCRIPTIONS POLICIES
-- ==========================================
CREATE POLICY "Admins have full access to subscriptions" 
ON subscriptions FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Students can view their own subscriptions" 
ON subscriptions FOR SELECT TO authenticated 
USING (student_id = auth.uid());

CREATE POLICY "Drivers can view all subscriptions for verification" 
ON subscriptions FOR SELECT TO authenticated 
USING (is_driver());

-- ==========================================
-- BUS_LOCATIONS POLICIES
-- ==========================================
CREATE POLICY "Everyone can view bus locations" 
ON bus_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Drivers can update their assigned bus location" 
ON bus_locations FOR UPDATE TO authenticated 
USING (
  is_driver() AND 
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.bus_id = bus_locations.bus_id 
    AND trips.driver_id = auth.uid() 
    AND trips.status = 'in_progress'
  )
);

-- ==========================================
-- BUSES POLICIES
-- ==========================================
CREATE POLICY "Admins have full access to buses" 
ON buses FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Everyone can view buses" 
ON buses FOR SELECT TO authenticated USING (true);

-- ==========================================
-- ACTION_LOGS POLICIES
-- ==========================================
CREATE POLICY "Admins have full access to action_logs" 
ON action_logs FOR ALL TO authenticated USING (is_admin());

-- ==========================================
-- BUS_LOCATION_HISTORY POLICIES
-- ==========================================
CREATE POLICY "Admins can view all location history" 
ON bus_location_history FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Parents can view history for their children's trips" 
ON bus_location_history FOR SELECT TO authenticated 
USING (
  is_parent() AND 
  EXISTS (
    SELECT 1 FROM scan_logs 
    JOIN profiles ON scan_logs.student_id = profiles.id 
    WHERE scan_logs.trip_id = bus_location_history.trip_id 
    AND profiles.parent_id = auth.uid()
  )
);

CREATE POLICY "Drivers can update their assigned bus status" 
ON buses FOR UPDATE TO authenticated 
USING (
  is_driver() AND 
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.bus_id = buses.id 
    AND trips.driver_id = auth.uid() 
    AND trips.status = 'in_progress'
  )
)
WITH CHECK (
  is_driver() AND 
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.bus_id = buses.id 
    AND trips.driver_id = auth.uid() 
    AND trips.status = 'in_progress'
  )
);
