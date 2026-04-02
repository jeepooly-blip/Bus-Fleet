import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// ==========================================
/// PANIC BUTTON WIDGET
/// ==========================================
class PanicButton extends StatefulWidget {
  final String busId;
  const PanicButton({super.key, required this.busId});

  @override
  State<PanicButton> createState() => _PanicButtonState();
}

class _PanicButtonState extends State<PanicButton> {
  bool _isSending = false;

  Future<void> _triggerPanic() async {
    if (_isSending) return;
    
    setState(() => _isSending = true);
    
    try {
      // Immediate update to Supabase. 
      // The Supabase client handles retries automatically for transient network failures.
      await Supabase.instance.client
          .from('buses')
          .update({'panic_status': true})
          .match({'id': widget.busId});
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('PANIC SIGNAL SENT! Help is on the way.'),
            backgroundColor: Colors.redAccent,
            duration: Duration(seconds: 5),
          ),
        );
      }
    } catch (e) {
      debugPrint('Panic signal failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send signal. Retrying...')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onLongPress: _triggerPanic, // Require long press to prevent accidental triggers
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 150,
            height: 150,
            decoration: BoxDecoration(
              color: _isSending ? Colors.red.shade900 : Colors.red,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.red.withOpacity(0.5),
                  blurRadius: _isSending ? 40 : 20,
                  spreadRadius: _isSending ? 10 : 5,
                ),
              ],
              border: Border.all(color: Colors.white, width: 4),
            ),
            child: Center(
              child: _isSending 
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text(
                    'PANIC',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 28,
                      letterSpacing: 2,
                    ),
                  ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'LONG PRESS TO TRIGGER',
          style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600, fontSize: 12),
        ),
      ],
    );
  }
}

/// ==========================================
/// GEOFENCING SERVICE
/// ==========================================
class GeofencingService {
  // University Campus Coordinates (Example: University of Jordan)
  static const double campusLat = 31.9718;
  static const double campusLng = 35.8439;
  static const double radiusMeters = 100.0;

  bool _isInside = false;

  /// Starts monitoring the driver's location and updates bus status based on geofence.
  void startMonitoring(String busId) {
    // 1. Check/Request permissions first
    _checkPermissions().then((granted) {
      if (!granted) return;

      // 2. Listen to location stream
      Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10, // Check every 10 meters moved
        ),
      ).listen((Position position) async {
        // 3. Calculate distance to campus
        double distance = Geolocator.distanceBetween(
          position.latitude,
          position.longitude,
          campusLat,
          campusLng,
        );

        bool currentlyInside = distance <= radiusMeters;

        // 4. Trigger status change only on entry/exit
        if (currentlyInside != _isInside) {
          _isInside = currentlyInside;
          await _handleGeofenceEvent(busId, _isInside);
        }
      });
    });
  }

  Future<void> _handleGeofenceEvent(String busId, bool isEntering) async {
    final String newStatus = isEntering ? 'active' : 'inactive';
    
    try {
      await Supabase.instance.client
          .from('buses')
          .update({'status': newStatus})
          .match({'id': busId});
      
      debugPrint('Geofence: Bus $busId is now $newStatus');
    } catch (e) {
      debugPrint('Geofence update failed: $e');
    }
  }

  Future<bool> _checkPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }
    
    if (permission == LocationPermission.deniedForever) return false;
    
    return true;
  }
}
