-- Transport Management System Schema (Jordan Bus Fleet)

-- 1. Enums for type safety
CREATE TYPE user_role AS ENUM ('student', 'driver', 'admin', 'parent');
CREATE TYPE bus_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'pending');
CREATE TYPE trip_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- 2. Profiles (Extends Auth.Users)
CREATE TABLE profiles (
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

-- 3. Routes
CREATE TABLE routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    origin TEXT,
    destination TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Stops
CREATE TABLE stops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Buses
CREATE TABLE buses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate_number TEXT UNIQUE NOT NULL,
    capacity INT NOT NULL,
    status bus_status DEFAULT 'active' NOT NULL,
    panic_status BOOLEAN DEFAULT FALSE NOT NULL, -- Added for safety features
    current_route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Subscriptions (Student Memberships)
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status subscription_status DEFAULT 'pending' NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    qr_secret TEXT UNIQUE NOT NULL, -- Used to generate dynamic QR codes
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Trips (Active Journeys)
CREATE TABLE trips (
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
CREATE TABLE scan_logs (
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
CREATE TABLE bus_locations (
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. Performance Indexes
CREATE INDEX idx_stops_route_id ON stops(route_id);
CREATE INDEX idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX idx_trips_bus_id ON trips(bus_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_scan_logs_trip_id ON scan_logs(trip_id);
CREATE INDEX idx_scan_logs_student_id ON scan_logs(student_id);
CREATE INDEX idx_bus_locations_updated_at ON bus_locations(updated_at);

-- 11. Row Level Security (RLS) - Basic Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read bus locations
CREATE POLICY "Public bus locations" ON bus_locations FOR SELECT USING (true);

-- Policy: Students can only see their own scan logs
CREATE POLICY "Student scan history" ON scan_logs FOR SELECT 
USING (auth.uid() = student_id);

-- Policy: Drivers can insert scan logs
CREATE POLICY "Driver scan entry" ON scan_logs FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver'
));
