// src/components/RegisterStudent.js
import React, { useState } from "react";
import * as faceapi from "face-api.js";

export default function RegisterStudent() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML'];
  const years = [1, 2, 3, 4];
  const sections = ['A', 'B', 'C', 'D', 'E'];

  async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
  }

  async function extractDescriptor(fileBlob) {
    const img = await faceapi.bufferToImage(fileBlob);
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (!detection) return null;
    return Array.from(detection.descriptor);
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Create preview
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    
    if (!file) {
      return alert("⚠️ Please select a photo");
    }

    const rollNumber = e.target.rollNumber.value.trim().toUpperCase();
    const name = e.target.name.value.trim();
    const department = e.target.department.value;
    const year = e.target.year.value;
    const section = e.target.section.value;
    const email = e.target.email.value.trim();
    const phone = e.target.phone.value.trim();

    // Validate roll number format
    const rollNumberPattern = /^[0-9]{2}[A-Z]{2,5}[0-9]{3}$/;
    if (!rollNumberPattern.test(rollNumber)) {
      return alert("⚠️ Invalid Roll Number Format!\n\nExpected format: 23ECE037\n- 2 digits (year)\n- 2-5 letters (department)\n- 3 digits (roll number)");
    }

    setLoading(true);
    
    try {
      console.log("🔄 Loading face recognition models...");
      await loadModels();
      
      console.log("🔍 Extracting face descriptor...");
      const descriptor = await extractDescriptor(file);
      
      if (!descriptor) {
        setLoading(false);
        return alert("❌ Face not detected in the photo!\n\nPlease ensure:\n• Face is clearly visible\n• Good lighting\n• Looking at camera\n• No obstructions");
      }

      console.log("✅ Face detected! Uploading...");

      const form = new FormData();
      form.append("photo", file);
      form.append("rollNumber", rollNumber);
      form.append("name", name);
      form.append("department", department);
      form.append("year", year);
      form.append("section", section);
      form.append("email", email);
      form.append("phone", phone);
      form.append("descriptor", JSON.stringify(descriptor));

      const res = await fetch("http://localhost:8000/api/students/register", {
        method: "POST",
        body: form
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        alert(`✅ STUDENT REGISTERED SUCCESSFULLY!\n\nRoll Number: ${data.student.rollNumber}\nName: ${data.student.name}\nClass: ${data.student.department} - Year ${data.student.year} - Section ${data.student.section}`);
        
        // Reset form
        e.target.reset();
        setFile(null);
        setPreview(null);
      } else {
        alert(`❌ Registration Failed!\n\n${data.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      setLoading(false);
      console.error("Registration error:", err);
      alert(`❌ Error: ${err.message}`);
    }
  }

  return (
    <div style={{ 
      padding: '30px', 
      border: '2px solid #007bff', 
      borderRadius: '15px', 
      margin: '20px 0',
      backgroundColor: '#f8f9fa'
    }}>
      <h2 style={{ textAlign: 'center', color: '#007bff', marginBottom: '20px' }}>
        📝 Student Registration
      </h2>

      <form onSubmit={submit} style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          
          {/* Roll Number */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Roll Number <span style={{ color: 'red' }}>*</span>
            </label>
            <input 
              type="text" 
              name="rollNumber" 
              placeholder="23ECE037" 
              required
              style={inputStyle}
              maxLength="10"
            />
            <small style={{ color: '#666' }}>Format: YYDEPTRRR (e.g., 23ECE037)</small>
          </div>

          {/* Name */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Full Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input 
              type="text" 
              name="name" 
              placeholder="Harish Kumar" 
              required
              style={inputStyle}
            />
          </div>

          {/* Department */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Department <span style={{ color: 'red' }}>*</span>
            </label>
            <select name="department" required style={inputStyle}>
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Year <span style={{ color: 'red' }}>*</span>
            </label>
            <select name="year" required style={inputStyle}>
              <option value="">Select Year</option>
              {years.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Section <span style={{ color: 'red' }}>*</span>
            </label>
            <select name="section" required style={inputStyle}>
              <option value="">Select Section</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Email
            </label>
            <input 
              type="email" 
              name="email" 
              placeholder="student@example.com"
              style={inputStyle}
            />
          </div>

          {/* Phone */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Phone Number
            </label>
            <input 
              type="tel" 
              name="phone" 
              placeholder="9876543210"
              style={inputStyle}
              maxLength="10"
            />
          </div>

          {/* Photo Upload */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Photo <span style={{ color: 'red' }}>*</span>
            </label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              required
              style={{ ...inputStyle, padding: '10px' }}
            />
            <small style={{ color: '#666' }}>
              📸 Clear face photo with good lighting
            </small>
          </div>

          {/* Photo Preview */}
          {preview && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              <img 
                src={preview} 
                alt="Preview" 
                style={{ 
                  maxWidth: '200px', 
                  maxHeight: '200px', 
                  border: '2px solid #007bff',
                  borderRadius: '10px'
                }} 
              />
            </div>
          )}

          {/* Submit Button */}
          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: loading ? '#6c757d' : '#007bff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#0056b3')}
              onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#007bff')}
            >
              {loading ? '⏳ Registering...' : '✅ Register Student'}
            </button>
          </div>
        </div>
      </form>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '8px',
        fontSize: '13px'
      }}>
        <strong>📌 Important Notes:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Roll number must follow format: YYDEPTRRR (e.g., 23ECE037)</li>
          <li>Photo must clearly show the student's face</li>
          <li>Ensure good lighting and no obstructions</li>
          <li>All fields marked with * are required</li>
        </ul>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  fontSize: '14px',
  border: '1px solid #ced4da',
  borderRadius: '5px',
  boxSizing: 'border-box'
};
