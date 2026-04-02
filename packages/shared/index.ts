export type UserRole = 'student' | 'driver' | 'admin' | 'parent';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone_number: string | null;
  university_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bus {
  id: string;
  plate_number: string;
  capacity: number;
  status: 'active' | 'maintenance' | 'inactive';
  panic_status: boolean;
  current_route_id: string | null;
  assigned_driver_id: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  student_id: string;
  status: 'active' | 'expired' | 'pending';
  valid_from: string;
  valid_until: string;
  qr_secret: string;
  created_at: string;
}

export interface Trip {
  id: string;
  bus_id: string | null;
  driver_id: string | null;
  route_id: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Subscription {
  id: string;
  student_id: string;
  status: 'active' | 'expired' | 'pending';
  valid_from: string;
  valid_until: string;
  qr_secret: string;
  created_at: string;
  student?: Profile;
}
