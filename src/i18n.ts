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
