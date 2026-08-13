// src/components/AttendanceReport.js
import React, { useState, useEffect } from "react";

export default function AttendanceReport() {
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const years = [1, 2, 3, 4];

  // Load departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Load sections when department and year change
  useEffect(() => {
    if (selectedDept && selectedYear) {
      fetchSections();
    }
  }, [selectedDept, selectedYear]);

  async function fetchDepartments() {
    try {
      const res = await fetch('http://localhost:8000/api/students/departments');
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }

  async function fetchSections() {
    try {
      const res = await fetch(`http://localhost:8000/api/students/sections?department=${selectedDept}&year=${selectedYear}`);
      const data = await res.json();
      setSections(data.sections || []);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setSections([]);
    }
  }

  async function fetchReport() {
    if (!selectedDept || !selectedYear || !selectedSection || !selectedDate) {
      setError('Please select all filters');
      return;
    }

    setLoading(true);
    setError('');
    setReport(null);

    try {
      const res = await fetch(
        `http://localhost:8000/api/reports/attendance?department=${selectedDept}&year=${selectedYear}&section=${selectedSection}&date=${selectedDate}`
      );
      const data = await res.json();

      if (res.ok) {
        setReport(data);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch report');
        setReport(null);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Network error. Please check if backend is running.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  async function markAbsentStudents() {
    if (!selectedDept || !selectedYear || !selectedSection) {
      alert('Please select department, year, and section');
      return;
    }

    if (!window.confirm('Mark all unmarked students as ABSENT for today?')) {
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/reports/mark-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: selectedDept,
          year: parseInt(selectedYear),
          section: selectedSection,
          date: selectedDate
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✅ Absent Marking Complete!\n\nTotal Students: ${data.totalStudents}\nMarked Present/Late: ${data.markedPresent}\nMarked Absent: ${data.markedAbsent}`);
        fetchReport(); // Refresh report
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error marking absent:', err);
      alert('❌ Network error');
    }
  }

  function exportToTxt() {
    if (!report) return;

    const { class: classInfo, date, statistics, students } = report;

    let txt = '';
    txt += '='.repeat(70) + '\n';
    txt += 'ATTENDANCE REPORT\n';
    txt += '='.repeat(70) + '\n\n';
    txt += `Department: ${classInfo.department}\n`;
    txt += `Year: ${classInfo.year}\n`;
    txt += `Section: ${classInfo.section}\n`;
    txt += `Date: ${date}\n\n`;
    txt += '-'.repeat(70) + '\n';
    txt += 'STATISTICS\n';
    txt += '-'.repeat(70) + '\n';
    txt += `Total Students: ${statistics.total}\n`;
    txt += `Present: ${statistics.present}\n`;
    txt += `Late: ${statistics.late}\n`;
    txt += `Absent: ${statistics.absent}\n`;
    txt += `Attendance %: ${((statistics.present + statistics.late) / statistics.total * 100).toFixed(2)}%\n\n`;

    // Present Students
    txt += '='.repeat(70) + '\n';
    txt += 'PRESENT STUDENTS\n';
    txt += '='.repeat(70) + '\n';
    const presentStudents = students.filter(s => s.status === 'Present');
    if (presentStudents.length > 0) {
      presentStudents.forEach((s, idx) => {
        txt += `${idx + 1}. ${s.rollNumber} - ${s.name} (Marked at: ${new Date(s.markedAt).toLocaleTimeString()})\n`;
      });
    } else {
      txt += 'No students marked present\n';
    }
    txt += '\n';

    // Late Students
    txt += '='.repeat(70) + '\n';
    txt += 'LATE STUDENTS\n';
    txt += '='.repeat(70) + '\n';
    const lateStudents = students.filter(s => s.status === 'Late');
    if (lateStudents.length > 0) {
      lateStudents.forEach((s, idx) => {
        txt += `${idx + 1}. ${s.rollNumber} - ${s.name} (Marked at: ${new Date(s.markedAt).toLocaleTimeString()})\n`;
      });
    } else {
      txt += 'No late students\n';
    }
    txt += '\n';

    // Absent Students
    txt += '='.repeat(70) + '\n';
    txt += 'ABSENT STUDENTS\n';
    txt += '='.repeat(70) + '\n';
    const absentStudents = students.filter(s => s.status === 'Absent');
    if (absentStudents.length > 0) {
      absentStudents.forEach((s, idx) => {
        txt += `${idx + 1}. ${s.rollNumber} - ${s.name}\n`;
      });
    } else {
      txt += 'No absent students\n';
    }
    txt += '\n';

    txt += '='.repeat(70) + '\n';
    txt += `Generated on: ${new Date().toLocaleString()}\n`;
    txt += '='.repeat(70) + '\n';

    // Create download
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${classInfo.department}_Year${classInfo.year}_${classInfo.section}_${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', color: '#007bff', marginBottom: '30px' }}>
        📊 Attendance Report
      </h2>

      {/* Filters */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0 }}>🔍 Select Class & Date</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          
          {/* Department */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Department
            </label>
            <select 
              value={selectedDept} 
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedSection('');
                setReport(null);
              }}
              style={selectStyle}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Year
            </label>
            <select 
              value={selectedYear} 
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedSection('');
                setReport(null);
              }}
              style={selectStyle}
            >
              <option value="">Select Year</option>
              {years.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Section
            </label>
            <select 
              value={selectedSection} 
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setReport(null);
              }}
              style={selectStyle}
              disabled={!selectedDept || !selectedYear}
            >
              <option value="">Select Section</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Date
            </label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setReport(null);
              }}
              style={selectStyle}
            />
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchReport}
            disabled={loading || !selectedDept || !selectedYear || !selectedSection}
            style={{
              ...buttonStyle,
              backgroundColor: loading ? '#6c757d' : '#007bff',
              cursor: loading || !selectedDept || !selectedYear || !selectedSection ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ Loading...' : '📊 Generate Report'}
          </button>

          <button 
            onClick={markAbsentStudents}
            disabled={!selectedDept || !selectedYear || !selectedSection}
            style={{
              ...buttonStyle,
              backgroundColor: '#ffc107',
              color: '#000'
            }}
          >
            ⚠️ Mark Absent Students
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Report Display */}
      {report && (
        <div>
          {/* Statistics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '15px',
            marginBottom: '20px'
          }}>
            <StatCard title="Total" value={report.statistics.total} color="#007bff" />
            <StatCard title="Present" value={report.statistics.present} color="#28a745" />
            <StatCard title="Late" value={report.statistics.late} color="#ffc107" />
            <StatCard title="Absent" value={report.statistics.absent} color="#dc3545" />
            <StatCard 
              title="Attendance %" 
              value={`${((report.statistics.present + report.statistics.late) / report.statistics.total * 100).toFixed(1)}%`} 
              color="#17a2b8" 
            />
          </div>

          {/* Export Button */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button onClick={exportToTxt} style={{ ...buttonStyle, backgroundColor: '#28a745' }}>
              📥 Download Report (TXT)
            </button>
          </div>

          {/* Student Lists */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Present Students */}
            <StudentList 
              title="✅ Present Students" 
              students={report.students.filter(s => s.status === 'Present')}
              color="#28a745"
              showTime={true}
            />

            {/* Late Students */}
            <StudentList 
              title="⏰ Late Students" 
              students={report.students.filter(s => s.status === 'Late')}
              color="#ffc107"
              showTime={true}
            />

            {/* Absent Students */}
            <StudentList 
              title="❌ Absent Students" 
              students={report.students.filter(s => s.status === 'Absent')}
              color="#dc3545"
              showTime={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, color }) {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: color,
      color: 'white',
      borderRadius: '10px',
      textAlign: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

// Student List Component
function StudentList({ title, students, color, showTime }) {
  return (
    <div style={{ 
      border: `2px solid ${color}`,
      borderRadius: '10px',
      overflow: 'hidden'
    }}>
      <div style={{ 
        backgroundColor: color,
        color: color === '#ffc107' ? '#000' : '#fff',
        padding: '15px',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        {title} ({students.length})
      </div>
      <div style={{ 
        maxHeight: '400px',
        overflowY: 'auto',
        backgroundColor: 'white'
      }}>
        {students.length > 0 ? (
          students.map((student, idx) => (
            <div 
              key={idx}
              style={{ 
                padding: '12px 15px',
                borderBottom: '1px solid #e0e0e0',
                fontSize: '14px'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{student.rollNumber}</div>
              <div style={{ color: '#666' }}>{student.name}</div>
              {showTime && student.markedAt && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '3px' }}>
                  🕐 {new Date(student.markedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            No students
          </div>
        )}
      </div>
    </div>
  );
}

const selectStyle = {
  width: '100%',
  padding: '10px',
  fontSize: '14px',
  border: '1px solid #ced4da',
  borderRadius: '5px',
  backgroundColor: 'white'
};

const buttonStyle = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  transition: 'opacity 0.3s'
};
