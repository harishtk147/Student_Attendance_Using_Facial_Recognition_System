// backend/models/StudentAttendance.js
const mongoose = require("mongoose");

const studentAttendanceSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student", 
    required: true 
  },
  date: { 
    type: Date, 
    required: true,
    // Store only date part (no time) for easier querying
    set: function(val) {
      const d = new Date(val);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Present', 'Absent', 'Late'],
    default: 'Absent'
  },
  markedAt: { 
    type: Date,
    default: Date.now  // Actual timestamp when attendance was marked
  },
  markedBy: { 
    type: String,
    default: 'Face Recognition System'  // Can be 'Admin', 'Manual', etc.
  },
  remarks: {
    type: String,
    trim: true
  }
});

// Compound unique index: One attendance record per student per day
studentAttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Index for date range queries
studentAttendanceSchema.index({ date: 1 });

// Index for filtering by status
studentAttendanceSchema.index({ status: 1 });

// Index for class-wise queries (through student reference)
studentAttendanceSchema.index({ studentId: 1, date: -1 });

// Pre-save middleware to determine if Late
studentAttendanceSchema.pre('save', function(next) {
  if (this.status === 'Present' && this.markedAt) {
    const markedHour = this.markedAt.getHours();
    const markedMinute = this.markedAt.getMinutes();
    
    // If marked after 9:30 AM, mark as Late
    if (markedHour > 9 || (markedHour === 9 && markedMinute > 30)) {
      this.status = 'Late';
      this.remarks = this.remarks || 'Marked late after 9:30 AM';
    }
  }
  next();
});

// Static method to mark attendance
studentAttendanceSchema.statics.markAttendance = async function(studentId, status = 'Present', markedBy = 'Face Recognition System') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const attendance = await this.findOneAndUpdate(
    { studentId, date: today },
    { 
      status, 
      markedAt: new Date(),
      markedBy 
    },
    { 
      new: true, 
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
  
  return attendance;
};

// Static method to get attendance report for a class
studentAttendanceSchema.statics.getClassReport = async function(department, year, section, date) {
  const Student = mongoose.model('Student');
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  // Get all students in the class
  const students = await Student.find({
    department,
    year,
    section,
    isActive: true
  }).select('rollNumber name email');
  
  // Get attendance records for that date
  const attendanceRecords = await this.find({
    date: targetDate,
    studentId: { $in: students.map(s => s._id) }
  }).populate('studentId', 'rollNumber name');
  
  // Create a map for quick lookup
  const attendanceMap = {};
  attendanceRecords.forEach(record => {
    attendanceMap[record.studentId._id.toString()] = record;
  });
  
  // Build report
  const report = students.map(student => {
    const attendance = attendanceMap[student._id.toString()];
    return {
      rollNumber: student.rollNumber,
      name: student.name,
      email: student.email,
      status: attendance ? attendance.status : 'Absent',
      markedAt: attendance ? attendance.markedAt : null,
      remarks: attendance ? attendance.remarks : 'Not marked'
    };
  });
  
  return report;
};

// Static method to mark all absent students
studentAttendanceSchema.statics.markAbsentStudents = async function(department, year, section, date) {
  const Student = mongoose.model('Student');
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  // Get all students in the class
  const students = await Student.find({
    department,
    year,
    section,
    isActive: true
  });
  
  // Get students who already have attendance marked
  const markedAttendance = await this.find({
    date: targetDate,
    studentId: { $in: students.map(s => s._id) }
  });
  
  const markedStudentIds = markedAttendance.map(a => a.studentId.toString());
  
  // Find students without attendance
  const absentStudents = students.filter(s => !markedStudentIds.includes(s._id.toString()));
  
  // Mark them as absent
  const absentRecords = await this.insertMany(
    absentStudents.map(student => ({
      studentId: student._id,
      date: targetDate,
      status: 'Absent',
      markedBy: 'System Auto-Mark',
      remarks: 'Auto-marked as absent'
    })),
    { ordered: false }  // Continue even if some fail
  );
  
  return {
    totalStudents: students.length,
    markedPresent: markedStudentIds.length,
    markedAbsent: absentRecords.length
  };
};

module.exports = mongoose.model("StudentAttendance", studentAttendanceSchema);
