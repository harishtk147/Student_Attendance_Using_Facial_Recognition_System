import React, { useState } from "react";
import RegisterStudent from "./components/RegisterStudent";
import AutoRecognize from "./components/AutoRecognize";
import AttendanceReport from "./components/AttendanceReport";

function App(){
  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        color: 'white'
      }}>
        <h1 style={{ margin: 0, fontSize: '36px' }}>🎓 Student Attendance System</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
          Face Recognition Based Attendance Management
        </p>
      </header>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: 'none',
            borderBottom: activeTab === 'attendance' ? '3px solid #007bff' : 'none',
            backgroundColor: activeTab === 'attendance' ? '#f8f9fa' : 'transparent',
            color: activeTab === 'attendance' ? '#007bff' : '#666',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          📋 Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab('register')}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: 'none',
            borderBottom: activeTab === 'register' ? '3px solid #007bff' : 'none',
            backgroundColor: activeTab === 'register' ? '#f8f9fa' : 'transparent',
            color: activeTab === 'register' ? '#007bff' : '#666',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          📝 Register Student
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '3px solid #007bff' : 'none',
            backgroundColor: activeTab === 'reports' ? '#f8f9fa' : 'transparent',
            color: activeTab === 'reports' ? '#007bff' : '#666',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          📊 View Reports
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'attendance' && <AutoRecognize />}
        {activeTab === 'register' && <RegisterStudent />}
        {activeTab === 'reports' && <AttendanceReport />}
      </div>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        marginTop: '40px', 
        padding: '20px',
        color: '#666',
        fontSize: '14px',
        borderTop: '1px solid #e0e0e0'
      }}>
        <p>💡 <strong>Tip:</strong> Ensure good lighting and face the camera directly for best results</p>
        <p style={{ marginTop: '10px', fontSize: '12px' }}>
          Powered by Face-API.js | MongoDB | React
        </p>
      </footer>
    </div>
  );
}

export default App;
