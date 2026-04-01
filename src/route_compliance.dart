import 'package:flutter/material.dart';

/// ==========================================
/// ROUTE COMPLIANCE LOGIC (FLUTTER/DART)
/// ==========================================

class RouteComplianceService {
  /// The local list of allowed students for the current route.
  /// Structured as a Map for O(1) lookup complexity.
  /// Key: student_id (String)
  /// Value: Map containing student details (name, assigned_route_name)
  Map<String, Map<String, dynamic>> _allowedStudentsMap = {};

  /// Updates the local cache from Supabase.
  /// This should be called at the start of the shift.
  void updateAllowedStudents(List<dynamic> supabaseData) {
    // Transform the list into a Map for O(1) lookup
    _allowedStudentsMap = {
      for (var item in supabaseData)
        item['id'].toString(): {
          'full_name': item['full_name'],
          'assigned_route_name': item['routes']?['name'] ?? 'Unknown Route',
        }
    };
  }

  /// Validation function triggered immediately after a QR code is scanned.
  void validateStudentScan(BuildContext context, String scannedStudentId) {
    // O(1) Lookup: Check if the ID exists in the map
    final studentData = _allowedStudentsMap[scannedStudentId];

    if (studentData == null) {
      // SCENARIO: WRONG BUS
      // We need to find the student's actual assigned route to show in the alert.
      // Note: In a real app, if the student isn't in the "allowed" list for THIS route,
      // you might need a separate quick lookup or have the scanner data include their route.
      // For this logic, we assume the "wrong bus" message is based on the data we have.
      
      _showErrorAlert(
        context, 
        "Wrong Bus!", 
        "This student is not assigned to this route."
      );
    } else {
      // SCENARIO: CORRECT BUS
      _showSuccessAlert(context, "Valid Scan", "Student: ${studentData['full_name']}");
    }
  }

  void _showErrorAlert(BuildContext context, String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.red.shade50,
        title: Text(title, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("OK", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showSuccessAlert(BuildContext context, String title, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.green,
        content: Text("$title: $message"),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}

/*
/// ==========================================
/// SUPABASE QUERY EXAMPLE
/// ==========================================
/// How to fetch the data to populate the map:

Future<void> downloadAllowedStudents(String currentRouteId) async {
  final response = await supabase
      .from('profiles')
      .select('id, full_name, routes(name)')
      .eq('assigned_route_id', currentRouteId)
      .eq('role', 'student');

  if (response != null) {
    routeComplianceService.updateAllowedStudents(response);
  }
}

/// ==========================================
/// JSON STRUCTURE FOR O(1) LOOKUP
/// ==========================================
{
  "u-u-i-d-1": {
    "full_name": "Ahmad Jordan",
    "assigned_route_name": "Amman Express"
  },
  "u-u-i-d-2": {
    "full_name": "Sara Smith",
    "assigned_route_name": "Amman Express"
  }
}
*/
