-- Transport Management System Schema (Jordan Bus Fleet)
-- Consolidated Script: Run this entire script at once in your Supabase SQL Editor.

-- 0. Enable Extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Enums for type safety (Idempotent creation)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'driver', 'admin', 'parent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bus_status') THEN
        CREATE TYPE bus_status AS ENUM ('active', 'maintenance', 'inactive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'pending');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
        CREATE TYPE trip_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
    END IF;
END $$;

-- 2. Routes (Must be created before profiles and buses)
CREATE TABLE IF NOT EXISTS routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    origin TEXT,
    destination TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Profiles (Extends Auth.Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'student' NOT NULL,
    phone_number TEXT,
    university_id TEXT,
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Link student to parent
    assigned_route_id UUID REFERENCES routes(id) ON DELETE SET NULL, -- Added for Route Compliance
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Stops
CREATE TABLE IF NOT EXISTS stops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    radius_meters INT DEFAULT 50 NOT NULL, -- For geofencing
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Buses
CREATE TABLE IF NOT EXISTS buses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate_number TEXT UNIQUE NOT NULL,
    capacity INT NOT NULL,
    status bus_status DEFAULT 'active' NOT NULL,
    panic_status BOOLEAN DEFAULT FALSE NOT NULL, -- Added for safety features
    current_route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    assigned_driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Added for Driver Assignment
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Subscriptions (Student Memberships)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status subscription_status DEFAULT 'pending' NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    qr_secret TEXT UNIQUE NOT NULL, -- Used to generate dynamic QR codes
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Trips (Active Journeys)
CREATE TABLE IF NOT EXISTS trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status trip_status DEFAULT 'scheduled' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Scan Logs (QR Verification)
CREATE TABLE IF NOT EXISTS scan_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE NOT NULL,
    offline_sync_id UUID, -- For tracking offline-first syncs from Flutter
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

-- 9. Bus Locations (Real-time tracking)
CREATE TABLE IF NOT EXISTS bus_locations (
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9.1 Bus Location History (Partitioned)
CREATE TABLE IF NOT EXISTS bus_location_history (
    id UUID DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE NOT NULL,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, updated_at)
) PARTITION BY RANGE (updated_at);

-- Create initial partition for current month
CREATE TABLE IF NOT EXISTS bus_location_history_current PARTITION OF bus_location_history
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Trigger to automatically log history
CREATE OR REPLACE FUNCTION log_bus_location()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO bus_location_history (bus_id, latitude, longitude, speed, heading, updated_at)
    VALUES (NEW.bus_id, NEW.latitude, NEW.longitude, NEW.speed, NEW.heading, NEW.updated_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_bus_location
AFTER INSERT OR UPDATE ON bus_locations
FOR EACH ROW EXECUTE FUNCTION log_bus_location();

-- 10. Action Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS action_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- Can be null if system action
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger to automatically log actions
CREATE OR REPLACE FUNCTION audit_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO action_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION audit_action();
CREATE TRIGGER trg_audit_buses AFTER INSERT OR UPDATE OR DELETE ON buses FOR EACH ROW EXECUTE FUNCTION audit_action();
CREATE TRIGGER trg_audit_subscriptions AFTER INSERT OR UPDATE OR DELETE ON subscriptions FOR EACH ROW EXECUTE FUNCTION audit_action();

-- 11. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_stops_route_id ON stops(route_id);

-- Spatial Functions for Geofencing
CREATE OR REPLACE FUNCTION check_geofence(bus_lat DOUBLE PRECISION, bus_lng DOUBLE PRECISION)
RETURNS TABLE (stop_id UUID, name TEXT, distance_meters DOUBLE PRECISION) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as stop_id, 
        s.name, 
        ST_Distance(s.geom, ST_SetSRID(ST_MakePoint(bus_lng, bus_lat), 4326)::geography) as distance_meters
    FROM stops s
    WHERE ST_DWithin(s.geom, ST_SetSRID(ST_MakePoint(bus_lng, bus_lat), 4326)::geography, s.radius_meters)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX IF NOT EXISTS idx_stops_geom ON stops USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_trips_bus_id ON trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_scan_logs_trip_id ON scan_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_student_id ON scan_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_locations_updated_at ON bus_locations(updated_at);

-- 11. Row Level Security (RLS) - Basic Setup
-- NOTE: Phone OTP Authentication should be enabled in Supabase Auth settings.
-- NOTE: Realtime load reduction: Use Presence for active buses status instead of high-frequency location broadcasts.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  BEGIN RETURN (SELECT role = 'admin' FROM profiles WHERE id = auth.uid()); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_driver() RETURNS BOOLEAN AS $$
  BEGIN RETURN (SELECT role = 'driver' FROM profiles WHERE id = auth.uid()); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_parent() RETURNS BOOLEAN AS $$
  BEGIN RETURN (SELECT role = 'parent' FROM profiles WHERE id = auth.uid()); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read action logs
DROP POLICY IF EXISTS "Admin action logs" ON action_logs;
CREATE POLICY "Admin action logs" ON action_logs FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Policy: Everyone can read bus locations (DROP/CREATE for idempotency)
DROP POLICY IF EXISTS "Public bus locations" ON bus_locations;
CREATE POLICY "Public bus locations" ON bus_locations FOR SELECT USING (true);

-- Policy: Students can only see their own scan logs
DROP POLICY IF EXISTS "Student scan history" ON scan_logs;
CREATE POLICY "Student scan history" ON scan_logs FOR SELECT 
USING (auth.uid() = student_id);

-- Policy: Drivers can insert scan logs
DROP POLICY IF EXISTS "Driver scan entry" ON scan_logs;
CREATE POLICY "Driver scan entry" ON scan_logs FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver'
));
