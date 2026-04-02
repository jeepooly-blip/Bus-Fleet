import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  ar: {
    translation: {
      "app_name": "أسطول حافلات الأردن",
      "admin_center": "مركز التحكم الإداري v1.0",
      "system_live": "النظام يعمل",
      "active_buses": "الحافلات النشطة",
      "active_trips": "الرحلات النشطة",
      "students_scanned": "الطلاب الذين تم مسحهم",
      "offline_syncs": "مزامنة غير متصلة",
      "pending": "قيد الانتظار",
      "arch_overview": "نظرة عامة على هيكلية النظام",
      "quick_actions": "إجراءات سريعة",
      "live_map": "عرض الخريطة الحية",
      "manage_students": "إدارة الطلاب",
      "manage_drivers": "إدارة السائقين",
      "manage_subscriptions": "إدارة الاشتراكات",
      "manage_buses": "إدارة الحافلات",
      "admin_panel": "لوحة التحكم الإدارية",
      "add_driver": "إضافة سائق",
      "add_student": "إضافة طالب",
      "add_subscription": "إضافة اشتراك",
      "add_bus": "إضافة حافلة",
      "assign_driver": "تعيين سائق",
      "select_driver": "اختر سائقاً",
      "unassigned": "غير معين",
      "assigned_driver": "السائق المعين",
      "assigned_bus": "الحافلة المعينة",
      "none": "لا يوجد",
      "plate_number": "رقم اللوحة",
      "capacity": "السعة",
      "full_name": "الاسم الكامل",
      "email": "البريد الإلكتروني",
      "phone": "رقم الهاتف",
      "university_id": "رقم الجامعة",
      "actions": "الإجراءات",
      "save": "حفظ",
      "cancel": "إلغاء",
      "delete": "حذف",
      "edit": "تعديل",
      "status": "الحالة",
      "valid_until": "صالح حتى",
      "security_logs": "سجلات الأمان",
      "recent_scans": "سجلات المسح الأخيرة",
      "driver_dashboard": "لوحة تحكم السائق",
      "verified": "تم التحقق",
      "bus": "حافلة",
      "route": "مسار",
      "student_id": "رقم الطالب",
      "arch_desc": "يستخدم النظام PostgreSQL RLS للأمان، و Supabase Realtime لتتبع الحافلات مباشرة، وقائمة انتظار SQLite محلية في تطبيق Flutter لتسجيل المسح دون اتصال بالإنترنت.",
      "switch_lang": "English"
    }
  },
  en: {
    translation: {
      "app_name": "Jordan Bus Fleet",
      "admin_center": "Admin Control Center v1.0",
      "system_live": "System Live",
      "active_buses": "Active Buses",
      "active_trips": "Active Trips",
      "students_scanned": "Students Scanned",
      "offline_syncs": "Offline Syncs",
      "pending": "Pending",
      "arch_overview": "System Architecture Overview",
      "quick_actions": "Quick Actions",
      "live_map": "Live Map View",
      "manage_students": "Manage Students",
      "manage_drivers": "Manage Drivers",
      "manage_subscriptions": "Manage Subscriptions",
      "manage_buses": "Manage Buses",
      "admin_panel": "Admin Panel",
      "add_driver": "Add Driver",
      "add_student": "Add Student",
      "add_subscription": "Add Subscription",
      "add_bus": "Add Bus",
      "assign_driver": "Assign Driver",
      "select_driver": "Select Driver",
      "unassigned": "Unassigned",
      "assigned_driver": "Assigned Driver",
      "assigned_bus": "Assigned Bus",
      "none": "None",
      "plate_number": "Plate Number",
      "capacity": "Capacity",
      "full_name": "Full Name",
      "email": "Email",
      "phone": "Phone Number",
      "university_id": "University ID",
      "actions": "Actions",
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "status": "Status",
      "valid_until": "Valid Until",
      "security_logs": "Security Logs",
      "recent_scans": "Recent Scan Logs",
      "driver_dashboard": "Driver Dashboard",
      "verified": "Verified",
      "bus": "Bus",
      "route": "Route",
      "student_id": "Student ID",
      "arch_desc": "The system uses PostgreSQL RLS for security, Supabase Realtime for live bus tracking, and a Local SQLite queue in Flutter for offline-first scan logging.",
      "switch_lang": "العربية"
    }
  }
};

console.log('i18n is initializing');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // Force Arabic as default
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  }, (err, t) => {
    if (err) return console.error('i18n init error:', err);
    console.log('i18n initialized successfully');
  });

export default i18n;
