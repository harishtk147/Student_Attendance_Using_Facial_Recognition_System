# 🎓 Face Recognition Based Student Attendance System

A web-based **Student Attendance Management System** that uses **face recognition** to automatically identify students and mark their attendance. The application is built using the **MERN stack**, with `face-api.js` used in the React frontend for face detection and face descriptor generation.

The system also prevents duplicate attendance entries by allowing only **one attendance record per student per day**.

---

## 📌 Project Overview

Traditional attendance systems require students to manually sign attendance sheets or use identification cards. These approaches can be time-consuming and may allow proxy attendance.

This project provides an automated solution using a webcam and face recognition.

The system:

* Registers students with their personal and academic details.
* Extracts a **128-dimensional face descriptor** from the student's photograph.
* Stores the face descriptor in MongoDB.
* Uses a webcam during attendance.
* Generates a face descriptor from the live camera feed.
* Compares the live descriptor with registered student descriptors.
* Identifies the best matching student using Euclidean distance.
* Marks attendance automatically.
* Prevents duplicate attendance for the same student on the same day.
* Automatically identifies late attendance after **9:30 AM**.
* Generates class-wise attendance reports.
* Allows absent students to be automatically marked.

---

## ✨ Features

### 👨‍🎓 Student Registration

* Student roll number validation.
* Name, department, year and section details.
* Email and phone number.
* Student photograph upload.
* Face detection using `face-api.js`.
* Automatic generation of a 128-dimensional face descriptor.
* Duplicate roll number prevention.

### 📷 Face Recognition Attendance

* Webcam-based attendance.
* Real-time face detection.
* Facial landmark detection.
* 128-dimensional face descriptor generation.
* Euclidean distance based face matching.
* Recognition threshold of `0.5`.
* Only active students are considered for recognition.
* Attendance is automatically recorded after successful recognition.

### 🛡️ Duplicate Attendance Prevention

The backend checks whether attendance already exists for the recognized student on the current date.

If attendance already exists:

```text
HTTP 409 Conflict
```

is returned and another attendance record is not created.

The database also has a compound unique index:

```javascript
{ studentId: 1, date: 1 }
```

This ensures that a student can have only one attendance record for a particular day.

### ⏰ Late Attendance

Attendance marked after **9:30 AM** is automatically changed from:

```text
Present
```

to:

```text
Late
```

### 📊 Attendance Reports

Reports can be generated based on:

* Department
* Year
* Section
* Date

The report displays:

* Present students
* Late students
* Absent students
* Attendance percentage
* Attendance marking time

### ⚠️ Automatic Absent Marking

Students who do not have an attendance record for the selected date can be automatically marked as:

```text
Absent
```

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────────┐
                    │      React Frontend     │
                    │                         │
                    │  Student Registration   │
                    │  Face Recognition       │
                    │  Attendance Reports     │
                    └────────────┬────────────┘
                                 │
                                 │ HTTP / REST API
                                 ▼
                    ┌─────────────────────────┐
                    │   Node.js + Express     │
                    │        Backend          │
                    │                         │
                    │ Student APIs             │
                    │ Recognition API          │
                    │ Attendance APIs          │
                    │ Report APIs              │
                    └────────────┬────────────┘
                                 │
                                 │ Mongoose
                                 ▼
                    ┌─────────────────────────┐
                    │       MongoDB Atlas      │
                    │                         │
                    │ Students                │
                    │ Face Descriptors        │
                    │ Attendance Records      │
                    └─────────────────────────┘
```

---

# 🧰 Technologies Used

## Frontend

| Technology    | Purpose                        |
| ------------- | ------------------------------ |
| React 19      | User interface                 |
| face-api.js   | Face detection and recognition |
| react-webcam  | Webcam integration             |
| Axios / Fetch | API communication              |
| HTML / CSS    | UI styling                     |

## Backend

| Technology | Purpose                    |
| ---------- | -------------------------- |
| Node.js    | Backend runtime            |
| Express.js | REST API                   |
| Mongoose   | MongoDB object modeling    |
| Multer     | Image upload handling      |
| CORS       | Cross-origin requests      |
| dotenv     | Environment configuration  |
| Jimp       | Image processing           |
| Pixelmatch | Image comparison utilities |
| PNGJS      | PNG image processing       |

## Database

```text
MongoDB Atlas
```

---

# 🧠 How Face Recognition Works

The project uses `face-api.js` in the React frontend.

## Registration

When a student uploads a photograph:

```text
Student Photo
     │
     ▼
Tiny Face Detector
     │
     ▼
Face Detection
     │
     ▼
68 Facial Landmarks
     │
     ▼
Face Recognition Network
     │
     ▼
128-Dimensional Descriptor
     │
     ▼
MongoDB
```

The descriptor looks conceptually like:

```text
[
  0.123,
 -0.452,
  0.891,
  ...
  128 values
]
```

The image itself is not used as the primary matching representation. The generated 128-dimensional descriptor is stored with the student record.

---

# 📹 How Webcam Recognition Works

During attendance, the webcam captures the student's face.

The same `face-api.js` pipeline is used:

```text
Webcam Frame
     │
     ▼
TinyFaceDetector
     │
     ▼
Face Detection
     │
     ▼
68 Facial Landmarks
     │
     ▼
Face Recognition Network
     │
     ▼
128-Dimensional Descriptor
     │
     ▼
Compare with MongoDB Descriptors
     │
     ▼
Best Match
     │
     ▼
Attendance
```

Because registration and recognition use the same pretrained face recognition model, both produce descriptors in the same 128-dimensional feature space.

---

# 🔍 Face Matching

The backend calculates the **Euclidean distance** between the live descriptor and every registered student's descriptor.

Conceptually:

```text
Live Descriptor
       │
       ├──────── Student 1 → Distance 0.82
       ├──────── Student 2 → Distance 0.31  ← Best Match
       ├──────── Student 3 → Distance 0.94
       └──────── Student 4 → Distance 1.12
```

The project uses:

```text
Recognition Threshold = 0.5
```

If:

```text
Best Distance <= 0.5
```

the student is recognized.

Otherwise:

```text
No matching student found
```

---

# 🛡️ Duplicate Attendance Prevention

The system uses multiple levels of protection.

### Backend check

Before inserting attendance, the backend searches for an existing record for:

```text
Student ID + Current Date
```

If a record already exists:

```text
HTTP 409 Conflict
```

is returned.

### Database protection

The attendance collection has a compound unique index:

```javascript
studentAttendanceSchema.index(
  { studentId: 1, date: 1 },
  { unique: true }
);
```

Therefore:

```text
Student A + 13-Aug-2026
```

can exist only once.

---

# 👁️ Basic Liveness Verification

The attendance component performs a basic liveness check before sending the descriptor to the backend.

It collects **three consecutive face detections** and checks:

1. Slight movement of the detected face.
2. Stability of the face descriptors between frames.

Conceptually:

```text
Frame 1
   ↓
Frame 2
   ↓
Frame 3
   ↓
Movement Check
   +
Descriptor Stability
   ↓
Liveness Passed
   ↓
Face Recognition
```

> **Note:** This is a basic liveness mechanism and is not a complete anti-spoofing solution. A dedicated anti-spoofing model or challenge-response mechanism would be recommended for production systems.

---

# 📁 Project Structure

```text
EmployeeRecognitionBackend/
│
├── backend/
│   │
│   ├── models/
│   │   ├── Student.js
│   │   └── StudentAttendance.js
│   │
│   ├── routes/
│   │   ├── studentRoutes.js
│   │   └── reportRoutes.js
│   │
│   ├── uploads/
│   │   └── Student Photos
│   │
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── EmployeeRecognitionFrontend/
    │
    └── frontend/
        │
        ├── public/
        │   └── models/
        │       └── face-api.js models
        │
        ├── src/
        │   ├── components/
        │   │   ├── RegisterStudent.js
        │   │   ├── AutoRecognize.js
        │   │   └── AttendanceReport.js
        │   │
        │   ├── App.js
        │   ├── App.css
        │   └── index.js
        │
        ├── package.json
        └── package-lock.json
```

---

# 🔌 API Endpoints

## Student APIs

### Register Student

```http
POST /api/students/register
```

Registers a new student with:

* Student details
* Photograph
* 128-dimensional face descriptor

---

### Recognize Student

```http
POST /api/students/recognize
```

Receives a face descriptor and identifies the closest registered student.

Possible responses:

```text
200 OK
```

Attendance successfully marked.

```text
404 Not Found
```

No matching student found.

```text
409 Conflict
```

Attendance already marked today.

---

### Get Students

```http
GET /api/students/students
```

Supports filtering by:

```text
department
year
section
isActive
```

---

### Get Departments

```http
GET /api/students/departments
```

---

### Get Sections

```http
GET /api/students/sections
```

---

## Attendance Report APIs

### Get Attendance Report

```http
GET /api/reports/attendance
```

Filters:

```text
department
year
section
date
```

### Mark Absent Students

```http
POST /api/reports/mark-absent
```

### Attendance Range

```http
GET /api/reports/attendance-range
```

### Student Attendance Percentage

```http
GET /api/reports/student-percentage/:rollNumber
```

---

# 🗄️ Database Models

## Student

The `Student` collection contains:

```text
rollNumber
name
department
year
section
email
phone
photo
descriptor
isActive
joiningYear
createdAt
updatedAt
```

The face descriptor contains exactly:

```text
128 numerical values
```

---

## StudentAttendance

The attendance collection contains:

```text
studentId
date
status
markedAt
markedBy
remarks
```

Possible status values:

```text
Present
Late
Absent
```

---

# 🚀 Installation

## Prerequisites

Install the following:

* Node.js
* npm
* MongoDB Atlas account
* Modern web browser
* Webcam

---

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

---

# ⚙️ Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
MONGO_URI=your_mongodb_connection_string
PORT=8000
```

> Never commit your actual MongoDB connection string or other secrets to GitHub.

Start the backend:

```bash
npm start
```

For development:

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:8000
```

---

# 💻 Frontend Setup

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start React:

```bash
npm start
```

The frontend will normally run on:

```text
http://localhost:3000
```

---

# 🤖 Face-API Models

The frontend expects the `face-api.js` model files under:

```text
public/models/
```

The application loads:

```javascript
faceapi.nets.tinyFaceDetector.loadFromUri("/models");
faceapi.nets.faceRecognitionNet.loadFromUri("/models");
faceapi.nets.faceLandmark68Net.loadFromUri("/models");
```

Make sure the required model files are available in the `public/models` directory before running the application.

---

# 🔄 Complete Application Flow

## Student Registration

```text
Enter Student Details
        ↓
Upload Photo
        ↓
Load Face-API Models
        ↓
Detect Face
        ↓
Extract Face Landmarks
        ↓
Generate 128D Descriptor
        ↓
Validate Roll Number
        ↓
Check Duplicate Roll Number
        ↓
Upload Photo + Descriptor
        ↓
MongoDB
        ↓
Student Registered
```

## Attendance

```text
Start Attendance
        ↓
Request Webcam Permission
        ↓
Start Camera
        ↓
Capture Frames
        ↓
Detect Face
        ↓
Basic Liveness Check
        ↓
Generate 128D Descriptor
        ↓
Send Descriptor to Backend
        ↓
Compare with Active Students
        ↓
Find Best Match
        ↓
Check Attendance for Today
        ↓
┌─────────────────────────────┐
│ Already Marked?             │
├──────────────┬──────────────┤
│ YES          │ NO           │
│ ↓            │ ↓            │
│ 409          │ Save Record  │
│ Conflict     │ ↓            │
│              │ Present/Late │
└──────────────┴──────────────┘
```

---

# 🔐 Security Considerations

This project is designed primarily as an academic/project implementation.

For production deployment, additional security should be considered:

* Authentication and authorization.
* HTTPS.
* Secure environment variables.
* Rate limiting.
* Stronger face anti-spoofing.
* Random challenge-response liveness detection.
* Dedicated presentation-attack detection.
* Input validation and sanitization.
* Database access restrictions.
* Secure storage of biometric data.
* Audit logging.

Face descriptors are biometric information and should be handled carefully in real-world deployments.

---

# ⚠️ Current Limitations

The current implementation has some limitations:

* Basic liveness detection rather than advanced anti-spoofing.
* Face recognition depends on camera quality and lighting.
* Recognition accuracy can be affected by large changes in pose.
* The backend compares the incoming descriptor against active students.
* Production authentication/authorization should be added.
* The current project uses configured API URLs that should be changed appropriately when deploying your own environment.

---

# 🔮 Future Enhancements

Possible improvements include:

* [ ] Random blink/head-turn challenge.
* [ ] Advanced face anti-spoofing model.
* [ ] Deep learning based presentation-attack detection.
* [ ] Admin login and role-based access.
* [ ] Email notifications for attendance.
* [ ] Monthly and semester attendance analytics.
* [ ] Excel/PDF report generation.
* [ ] Student dashboard.
* [ ] Cloud-based image storage.
* [ ] Mobile application.
* [ ] Better recognition performance using optimized vector search.
* [ ] Docker deployment.
* [ ] HTTPS and production security hardening.

---

# 🎯 Use Cases

This system can be used for:

* Colleges and universities
* Classrooms
* Training institutes
* Workshops
* Employee attendance
* Small organizations
* Lab attendance

---

# 📸 Main Modules

### 1. Student Registration

Register students and generate their face descriptors.

### 2. Automatic Attendance

Use a webcam to recognize students and mark attendance.

### 3. Attendance Reports

View attendance based on department, year, section and date.

### 4. Automatic Absent Marking

Mark students without attendance records as absent.

---

# 📌 Key Technical Highlights

* MERN-based architecture.
* React-based frontend.
* Node.js and Express REST API.
* MongoDB Atlas database.
* Mongoose ODM.
* `face-api.js` for face recognition.
* 128-dimensional face embeddings.
* Euclidean distance based matching.
* Webcam-based recognition.
* Basic liveness verification.
* Duplicate attendance prevention.
* Automatic Present/Late/Absent status.
* Class-wise attendance reporting.

---

# 👨‍💻 Author

**HARISH T**

Student Attendance Management System
Built using React, Node.js, Express, MongoDB and face-api.js.

---

