import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';

/// ==========================================
/// OFFLINE SYNC SERVICE (FLUTTER/DART)
/// ==========================================

// NOTE: Intelligent GPS frequency: 5s when moving, 30–60s when stopped (use Flutter sensors).
// This reduces battery consumption and database load.

class OfflineSyncService {
  static Database? _database;
  final _supabase = Supabase.instance.client;
  bool _isSyncing = false;

  /// Initialize SQLite Database
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('driver_app.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE offline_scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            trip_id TEXT NOT NULL,
            scanned_at TEXT NOT NULL,
            is_valid INTEGER NOT NULL,
            latitude REAL,
            longitude REAL,
            sync_attempts INTEGER DEFAULT 0
          )
        ''');
      },
    );
  }

  /// 1. Log Scan Locally (SQLite)
  Future<void> logScan({
    required String studentId,
    required String tripId,
    required bool isValid,
    double? latitude,
    double? longitude,
  }) async {
    final db = await database;
    await db.insert('offline_scans', {
      'student_id': studentId,
      'trip_id': tripId,
      'scanned_at': DateTime.now().toIso8601String(),
      'is_valid': isValid ? 1 : 0,
      'latitude': latitude,
      'longitude': longitude,
    });
    
    // Attempt immediate sync if online
    syncPendingScans();
  }

  /// 2. Sync Pending Scans to Supabase
  Future<void> syncPendingScans() async {
    if (_isSyncing) return;
    
    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) return;

    _isSyncing = true;
    final db = await database;
    
    // Fetch pending scans
    final List<Map<String, dynamic>> pending = await db.query(
      'offline_scans', 
      orderBy: 'scanned_at ASC',
      limit: 50 // Batch sync
    );

    if (pending.isEmpty) {
      _isSyncing = false;
      return;
    }

    for (var scan in pending) {
      try {
        await _supabase.from('scan_logs').insert({
          'student_id': scan['student_id'],
          'trip_id': scan['trip_id'],
          'scanned_at': scan['scanned_at'],
          'is_valid': scan['is_valid'] == 1,
          'latitude': scan['latitude'],
          'longitude': scan['longitude'],
          'offline_sync_id': _generateV4() // Optional: track original sync
        });

        // Success: Delete from local SQLite
        await db.delete('offline_scans', where: 'id = ?', whereArgs: [scan['id']]);
      } catch (e) {
        // Failure: Increment sync attempts for retry logic
        await db.update(
          'offline_scans',
          {'sync_attempts': (scan['sync_attempts'] ?? 0) + 1},
          where: 'id = ?',
          whereArgs: [scan['id']]
        );
        print('Sync failed for scan ${scan['id']}: $e');
      }
    }

    _isSyncing = false;
    
    // If there's more data, recurse
    if (pending.length == 50) syncPendingScans();
  }

  /// 3. Background Connectivity Monitor
  void startSyncMonitor() {
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      if (result != ConnectivityResult.none) {
        print('Network restored. Starting background sync...');
        syncPendingScans();
      }
    });
  }

  String _generateV4() {
    // Simple UUID placeholder logic or use 'uuid' package
    return DateTime.now().millisecondsSinceEpoch.toString(); 
  }
}

/*
/// ==========================================
/// USAGE IN DRIVER APP
/// ==========================================

final syncService = OfflineSyncService();

// At App Startup:
syncService.startSyncMonitor();

// When a QR is scanned:
void onScan(String studentId, String tripId, bool isValid) {
  syncService.logScan(
    studentId: studentId,
    tripId: tripId,
    isValid: isValid,
  );
}
*/
