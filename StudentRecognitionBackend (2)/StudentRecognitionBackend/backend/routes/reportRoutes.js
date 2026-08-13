// backend/routes/reportRoutes.js
const express = require("express");
const Student = require("../models/Student");
const StudentAttendance = require("../models/StudentAttendance");

const router = express.Router();

// ========================================
// GET ATTENDANCE REPORT FOR A CLASS ON A DATE
// ========================================
router.get("/attendance", async (req, res) => {
  try {
    const { department, year, section, date } = req.query;

    if (!department || !year || !section || !date) {
      return res.status(400).json({ 
        error: "Missing required parameters: department, year, section, date" 
      });
    }

    const report = await StudentAttendance.getClassReport(
      department.toUpperCase(),
      parseInt(year),
      section.toUpperCase(),
      new Date(date)
    );

    // Calculate statistics
    const stats = {
      total: report.length,
      present: report.filter(r => r.status === 'Present').length,
      late: report.filter(r => r.status === 'Late').length,
      absent: report.filter(r => r.status === 'Absent').length
    };

    res.json({
      class: {
        department: department.toUpperCase(),
        year: parseInt(year),
        section: section.toUpperCase()
      },
      date: new Date(date).toISOString().split('T')[0],
      statistics: stats,
      students: report
    });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// MARK ALL ABSENT STUDENTS (END OF DAY)
// ========================================
router.post("/mark-absent", async (req, res) => {
  try {
    const { department, year, section, date } = req.body;

    if (!department || !year || !section) {
      return res.status(400).json({ 
        error: "Missing required parameters: department, year, section" 
      });
    }

    const targetDate = date ? new Date(date) : new Date();

    const result = await StudentAttendance.markAbsentStudents(
      department.toUpperCase(),
      parseInt(year),
      section.toUpperCase(),
      targetDate
    );

    res.json({
      message: "Absent students marked successfully",
      date: targetDate.toISOString().split('T')[0],
      ...result
    });
  } catch (err) {
    console.error("Mark absent error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET ATTENDANCE REPORT FOR DATE RANGE
// ========================================
router.get("/attendance-range", async (req, res) => {
  try {
    const { department, year, section, startDate, endDate } = req.query;

    if (!department || !year || !section || !startDate || !endDate) {
      return res.status(400).json({ 
        error: "Missing required parameters: department, year, section, startDate, endDate" 
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all students in the class
    const students = await Student.find({
      department: department.toUpperCase(),
      year: parseInt(year),
      section: section.toUpperCase(),
      isActive: true
    }).select('rollNumber name email');

    // Get all attendance records in the date range
    const attendanceRecords = await StudentAttendance.find({
      studentId: { $in: students.map(s => s._id) },
      date: { $gte: start, $lte: end }
    }).populate('studentId', 'rollNumber name');

    // Group by student
    const studentAttendanceMap = {};
    students.forEach(student => {
      studentAttendanceMap[student._id.toString()] = {
        rollNumber: student.rollNumber,
        name: student.name,
        email: student.email,
        attendance: [],
        stats: {
          present: 0,
          late: 0,
          absent: 0,
          total: 0
        }
      };
    });

    // Populate attendance data
    attendanceRecords.forEach(record => {
      const studentId = record.studentId._id.toString();
      if (studentAttendanceMap[studentId]) {
        studentAttendanceMap[studentId].attendance.push({
          date: record.date,
          status: record.status,
          markedAt: record.markedAt
        });
        
        // Update stats
        studentAttendanceMap[studentId].stats.total++;
        if (record.status === 'Present') studentAttendanceMap[studentId].stats.present++;
        else if (record.status === 'Late') studentAttendanceMap[studentId].stats.late++;
        else if (record.status === 'Absent') studentAttendanceMap[studentId].stats.absent++;
      }
    });

    // Calculate percentage
    Object.values(studentAttendanceMap).forEach(student => {
      const total = student.stats.total;
      if (total > 0) {
        const presentCount = student.stats.present + student.stats.late;
        student.stats.percentage = ((presentCount / total) * 100).toFixed(2);
      } else {
        student.stats.percentage = 0;
      }
    });

    res.json({
      class: {
        department: department.toUpperCase(),
        year: parseInt(year),
        section: section.toUpperCase()
      },
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      students: Object.values(studentAttendanceMap)
    });
  } catch (err) {
    console.error("Range report error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET STUDENT ATTENDANCE PERCENTAGE
// ========================================
router.get("/student-percentage/:rollNumber", async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const { startDate, endDate } = req.query;

    const student = await Student.findOne({ 
      rollNumber: rollNumber.toUpperCase() 
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const percentage = await student.getAttendancePercentage(start, end);

    res.json({
      student: {
        rollNumber: student.rollNumber,
        name: student.name,
        department: student.department,
        year: student.year,
        section: student.section
      },
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      attendancePercentage: percentage
    });
  } catch (err) {
    console.error("Percentage error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
