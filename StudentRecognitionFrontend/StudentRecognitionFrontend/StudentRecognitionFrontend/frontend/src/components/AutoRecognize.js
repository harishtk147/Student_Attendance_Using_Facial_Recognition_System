// src/components/AutoRecognize.js
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function AutoRecognize() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const modelsLoadedRef = useRef(false);
  const [status, setStatus] = useState("Initializing...");
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    async function loadModels() {
      if (modelsLoadedRef.current) {
        console.log("⚠️ Models already loaded, skipping...");
        setModelsLoaded(true);
        setStatus("Ready to mark attendance");
        return;
      }
      setStatus("Loading AI models...");
      console.log("🔄 Loading face-api.js models...");
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        console.log("✅ Models loaded successfully!");
        modelsLoadedRef.current = true;
        setModelsLoaded(true);
        setStatus("Ready to mark attendance");
      } catch (err) {
        console.error("❌ Error loading models:", err);
        setStatus("Error loading models");
      }
    }
    loadModels();

    return () => {
      stopCamera();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Simple liveness: require 3 consecutive detections with slight movement
  const buffer = useRef([]);
  const recognitionSuccessful = useRef(false);

  async function startAttendance() {
    if (!modelsLoaded) {
      alert("⏳ Please wait, models are still loading...");
      return;
    }

    setIsScanning(true);
    recognitionSuccessful.current = false;
    buffer.current = [];
    setStatus("Starting camera...");
    console.log("📹 Starting attendance marking process...");

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      console.log("✅ Camera started");
      setStatus("Camera active - Scanning for face...");

      // Start scanning every 2 seconds
      intervalRef.current = setInterval(() => attemptRecognize(), 2000);

      // Set 15-second timeout
      timeoutRef.current = setTimeout(() => {
        if (!recognitionSuccessful.current) {
          console.log("⏱️ 15-second timeout reached");
          stopCamera();
          setStatus("❌ Time expired - No match found");
          alert("❌ ATTENDANCE NOT MARKED\n\nNo face recognized within 15 seconds.\n\nPlease try again with:\n• Better lighting\n• Face directly to camera\n• Slight head movement");
        }
      }, 15000);

    } catch (err) {
      console.error("❌ Camera error:", err);
      setStatus("Camera access denied");
      alert("❌ Cannot access camera. Please grant permission.");
      setIsScanning(false);
    }
  }

  function stopCamera() {
    console.log("🛑 Stopping camera...");
    
    // Stop all media tracks to release camera hardware
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("🔴 Track stopped:", track.kind, "- State:", track.readyState);
      });
      streamRef.current = null;
    }
    
    // Clear video element more aggressively
    if (videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.pause();
      videoElement.srcObject = null;
      videoElement.src = "";
      videoElement.load(); // Force reload to clear buffer
      console.log("📹 Video element cleared");
    }
    
    // Clear intervals and timeouts
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsScanning(false);
    buffer.current = [];
    recognitionSuccessful.current = false;
    console.log("✅ Camera fully stopped and released");
  }

  async function attemptRecognize() {
    if (!modelsLoaded || !videoRef.current) {
      console.log("⏳ Waiting... Models loaded:", modelsLoaded, "Video ready:", !!videoRef.current);
      setStatus("Waiting for initialization...");
      return;
    }
    console.log("🔍 Attempting face detection...");
    setStatus("Scanning for face...");

    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
      buffer.current = [];
      console.log("❌ No face detected in frame");
      setStatus("No face detected - Position yourself in front of camera");
      return;
    }
    console.log("✅ Face detected! Buffer size:", buffer.current.length + 1);
    setStatus(`Face detected! Collecting data... (${buffer.current.length + 1}/3)`);

    // push descriptor + center x for movement
    const box = detection.detection.box;
    const centerX = box.x + box.width / 2;
    buffer.current.push({ desc: Array.from(detection.descriptor), cx: centerX });

    // keep last 3
    if (buffer.current.length > 3) buffer.current.shift();

    // if we have 3 frames, check small movement (not identical) and descriptor stability
    if (buffer.current.length === 3) {
      const cxs = buffer.current.map(b => b.cx);
      const movement = Math.max(...cxs) - Math.min(...cxs);

      // compute pairwise descriptor distances (variance)
      const d0 = buffer.current[0].desc;
      const d1 = buffer.current[1].desc;
      const d2 = buffer.current[2].desc;

      function dist(a,b) {
        let s=0; for(let i=0;i<a.length;i++){ const d=a[i]-b[i]; s+=d*d } return Math.sqrt(s);
      }
      const v01 = dist(d0,d1);
      const v12 = dist(d1,d2);
      const avgVar = (v01+v12)/2;

      // conditions: small movement (to avoid static photo) AND descriptor stable
      // TEMPORARILY RELAXED FOR TESTING
      console.log("Liveness check - move:", movement, "var:", avgVar);
      if (movement > 2 && avgVar < 1.0) {
        // send middle descriptor
        const descriptor = buffer.current[1].desc;
        console.log("✅ Liveness check PASSED! Sending to backend...");
        setStatus("Verifying identity...");
        await sendDescriptor(descriptor);
        buffer.current = []; // reset
      } else {
        // keep sliding window (do nothing)
        console.log("⚠️ Liveness check failed; move:", movement.toFixed(2), "var:", avgVar.toFixed(4));
        setStatus(`Liveness check: Move slightly (movement: ${movement.toFixed(1)}px, need >2px)`);
      }
    }
  }

  async function sendDescriptor(descriptor) {
    try {
      const res = await fetch("http://localhost:8000/api/students/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor })
      });
      const data = await res.json();
      if (res.ok) {
        console.log("✅✅✅ ATTENDANCE MARKED:", data.student.name, "| Status:", data.status, "| Score:", data.score);
        recognitionSuccessful.current = true;
        stopCamera();
        
        const statusEmoji = data.status === 'Late' ? '⏰' : '✅';
        const statusText = data.status === 'Late' ? 'LATE' : 'PRESENT';
        
        setStatus(`${statusEmoji} Attendance marked for ${data.student.name}`);
        alert(`${statusEmoji} ATTENDANCE MARKED - ${statusText}!\n\nRoll Number: ${data.student.rollNumber}\nName: ${data.student.name}\nClass: ${data.student.department} Year-${data.student.year} Section-${data.student.section}\nStatus: ${data.status}\nSimilarity Score: ${data.score.toFixed(4)}\nTime: ${new Date(data.markedAt).toLocaleTimeString()}\n\nAttendance has been recorded successfully!`);
      } else if (res.status === 409) {
        // Attendance already marked today
        console.log("⚠️ Attendance already marked:", data);
        recognitionSuccessful.current = true;
        stopCamera();
        const markedTime = new Date(data.markedAt).toLocaleTimeString();
        const statusEmoji = data.status === 'Late' ? '⏰' : '✅';
        
        setStatus(`ℹ️ Already marked for ${data.student.name}`);
        alert(`ℹ️ ATTENDANCE ALREADY MARKED\n\nRoll Number: ${data.student.rollNumber}\nName: ${data.student.name}\nClass: ${data.student.department} Year-${data.student.year} Section-${data.student.section}\nStatus: ${data.status}\nSimilarity Score: ${data.score.toFixed(4)}\n\nYour attendance was already recorded today at ${markedTime}.\n\nNo duplicate entry created.`);
      } else {
        console.log("❌ Not matched:", data);
        const scoreMsg = data.score ? `Best match score: ${data.score.toFixed(4)}` : 'No students in database';
        setStatus("❌ Face not recognized - Keep trying...");
        // Don't stop camera, let it continue until timeout
      }
    } catch (e) {
      console.error("Error sending descriptor", e);
    }
  }

  return (
    <div style={{ padding: '20px', border: '2px solid #ccc', borderRadius: '10px', margin: '20px 0', textAlign: 'center' }}>
      <h2>📋 Attendance System</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <strong>Status:</strong> <span style={{ color: status.includes('✅') ? 'green' : status.includes('❌') ? 'red' : 'blue' }}>{status}</span>
      </div>

      {isScanning && (
        <div style={{ marginBottom: '20px' }}>
          <video ref={videoRef} autoPlay muted width={480} height={360} style={{ border: '3px solid #007bff', borderRadius: '10px', backgroundColor: '#000' }} />
        </div>
      )}

      {!isScanning && (
        <div style={{ marginBottom: '20px', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
          <p style={{ fontSize: '18px', color: '#666' }}>Click the button below to mark your attendance</p>
          <div style={{ fontSize: '48px', margin: '20px 0' }}>📸</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={startAttendance} 
          disabled={isScanning || !modelsLoaded}
          style={{
            padding: '15px 40px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: isScanning ? '#6c757d' : '#28a745',
            border: 'none',
            borderRadius: '8px',
            cursor: isScanning || !modelsLoaded ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => !isScanning && modelsLoaded && (e.target.style.backgroundColor = '#218838')}
          onMouseOut={(e) => !isScanning && (e.target.style.backgroundColor = '#28a745')}
        >
          {isScanning ? '⏳ Scanning...' : '✅ Mark Attendance'}
        </button>

        {isScanning && (
          <button 
            onClick={stopCamera} 
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: '#dc3545',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#c82333')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#dc3545')}
          >
            🛑 Stop
          </button>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      <div style={{ marginTop: '20px', fontSize: '13px', color: '#666', textAlign: 'left', maxWidth: '480px', margin: '20px auto' }}>
        <p>💡 <strong>Instructions:</strong></p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>Click "Mark Attendance" to start</li>
          <li>Camera will activate for 15 seconds</li>
          <li>Ensure good lighting on your face</li>
          <li>Look directly at the camera</li>
          <li>Move your head slightly (left/right) for liveness check</li>
          <li>Attendance marked immediately upon recognition</li>
        </ul>
      </div>
    </div>
  );
}
