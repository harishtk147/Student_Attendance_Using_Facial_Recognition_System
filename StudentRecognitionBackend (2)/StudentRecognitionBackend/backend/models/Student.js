// backend/models/Student.js
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  rollNumber: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[0-9]{2}[A-Z]{2,5}[0-9]{3}$/  // Format: 23ECE037
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  
  department: { 
    type: String, 
    required: true,
    enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML'],  // Add your departments
    uppercase: true
  },
  year: { 
    type: Number, 
    required: true,
    min: 1,
    max: 4
  },
  section: { 
    type: String, 
    required: true,
    uppercase: true,
    match: /^[A-Z]$/  // Single letter: A, B, C, etc.
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  photo: { 
    type: String,
    required: true
  },
  descriptor: { 
    type: [Number], 
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 128;  // Face descriptor must be 128 dimensions
      },
      message: 'Face descriptor must have exactly 128 values'
    }
  },
  isActive: { 
    type: Boolean, 
    default: true  // For graduated/suspended students
  },
  joiningYear: {
    type: Number,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes for fast queries
studentSchema.index({ department: 1, year: 1, section: 1 });
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ isActive: 1 });

// Virtual field for full class identifier
studentSchema.virtual('classIdentifier').get(function() {
  return `${this.department}-Year${this.year}-${this.section}`;
});

// Pre-save middleware to update timestamp
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate attendance percentage
studentSchema.methods.getAttendancePercentage = async function(startDate, endDate) {
  const Attendance = mongoose.model('StudentAttendance');
  
  const totalDays = await Attendance.countDocuments({
    studentId: this._id,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const presentDays = await Attendance.countDocuments({
    studentId: this._id,
    date: { $gte: startDate, $lte: endDate },
    status: { $in: ['Present', 'Late'] }
  });
  
  return totalDays > 0 ? (presentDays / totalDays * 100).toFixed(2) : 0;
};

module.exports = mongoose.model("Student", studentSchema);
