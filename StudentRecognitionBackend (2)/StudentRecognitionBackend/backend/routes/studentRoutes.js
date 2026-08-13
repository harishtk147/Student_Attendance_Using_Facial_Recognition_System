// backend/routes/studentRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Student = require("../models/Student");
const StudentAttendance = require("../models/StudentAttendance");

const router = express.Router();
const uploadPath = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ========================================
// STUDENT REGISTRATION
// ========================================
router.post("/register", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Photo is required" });
    }

    const { rollNumber, name, department, year, section, email, phone, descriptor } = req.body;

    // Validate required fields
    if (!rollNumber || !name || !department || !year || !section || !descriptor) {
      return res.status(400).json({ 
        error: "Missing required fields: rollNumber, name, department, year, section, descriptor" 
      });
    }

    // Parse descriptor
    let faceDescriptor;
    try {
      faceDescriptor = JSON.parse(descriptor);
      if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
        return res.status(400).json({ error: "Descriptor must be an array of 128 numbers" });
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid descriptor JSON" });
    }

    // Extract joining year from roll number (first 2 digits)
    const joiningYear = 2000 + parseInt(rollNumber.substring(0, 2));

    // Check if student already exists
    const existingStudent = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    if (existingStudent) {
      return res.status(409).json({ error: "Student with this roll number already exists" });
    }

    // Create new student
    const student = new Student({
      rollNumber: rollNumber.toUpperCase(),
      name,
      department: department.toUpperCase(),
      year: parseInt(year),
      section: section.toUpperCase(),
      email,
      phone,
      photo: req.file.filename,
      descriptor: faceDescriptor,
      joiningYear
    });

    await student.save();

    res.json({ 
      message: "Student registered successfully", 
      student: {
        rollNumber: student.rollNumber,
        name: student.name,
        department: student.department,
        year: student.year,
        section: student.section,
        classIdentifier: student.classIdentifier
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// FACE RECOGNITION & ATTENDANCE MARKING
// ========================================
function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

router.post("/recognize", async (req, res) => {
  try {
    const { descriptor } = req.body;
    
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
      return res.status(400).json({ error: "Descriptor is required and must be a non-empty array" });
    }

    // Get all active students
    const students = await Student.find({ isActive: true });
    let bestMatch = null;
    let bestScore = Infinity;

    // Find best matching student
    for (const student of students) {
      if (!student.descriptor || student.descriptor.length === 0) continue;
      const dist = euclideanDistance(descriptor, student.descriptor);
      if (dist < bestScore) { 
        bestScore = dist; 
        bestMatch = student; 
      }
    }

    const THRESHOLD = 0.5;

    if (bestMatch && bestScore <= THRESHOLD) {
      // Check if attendance already marked today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingAttendance = await StudentAttendance.findOne({
        studentId: bestMatch._id,
        date: { $gte: today, $lt: tomorrow }
      });

      if (existingAttendance) {
        console.log("⚠️ Attendance already marked for", bestMatch.name, "today");
        return res.status(409).json({ 
          message: "Attendance already marked today", 
          student: {
            rollNumber: bestMatch.rollNumber,
            name: bestMatch.name,
            department: bestMatch.department,
            year: bestMatch.year,
            section: bestMatch.section
          },
          score: bestScore,
          alreadyMarked: true,
          status: existingAttendance.status,
          markedAt: existingAttendance.markedAt
        });
      }

      // Mark attendance (will auto-determine if Late based on time)
      const attendance = new StudentAttendance({
        studentId: bestMatch._id,
        date: today,
        status: 'Present',
        markedBy: 'Face Recognition System'
      });
      await attendance.save();

      console.log("✅ Attendance marked for", bestMatch.name, "- Status:", attendance.status);
      
      return res.json({ 
        message: "Attendance marked successfully", 
        student: {
          rollNumber: bestMatch.rollNumber,
          name: bestMatch.name,
          department: bestMatch.department,
          year: bestMatch.year,
          section: bestMatch.section
        },
        score: bestScore,
        status: attendance.status,
        markedAt: attendance.markedAt,
        alreadyMarked: false
      });
    } else {
      return res.status(404).json({ 
        message: "No matching student found", 
        score: bestScore,
        threshold: THRESHOLD
      });
    }
  } catch (err) {
    console.error("Recognition error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET ALL STUDENTS
// ========================================
router.get("/students", async (req, res) => {
  try {
    const { department, year, section, isActive } = req.query;
    
    const filter = {};
    if (department) filter.department = department.toUpperCase();
    if (year) filter.year = parseInt(year);
    if (section) filter.section = section.toUpperCase();
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const students = await Student.find(filter)
      .select('-descriptor')  // Don't send face descriptor
      .sort({ rollNumber: 1 });

    res.json({
      count: students.length,
      students
    });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET UNIQUE DEPARTMENTS
// ========================================
router.get("/departments", async (req, res) => {
  try {
    const departments = await Student.distinct("department");
    res.json({ departments: departments.sort() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET SECTIONS FOR A DEPARTMENT & YEAR
// ========================================
router.get("/sections", async (req, res) => {
  try {
    const { department, year } = req.query;
    
    if (!department || !year) {
      return res.status(400).json({ error: "Department and year are required" });
    }

    const sections = await Student.distinct("section", {
      department: department.toUpperCase(),
      year: parseInt(year),
      isActive: true
    });

    res.json({ sections: sections.sort() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
