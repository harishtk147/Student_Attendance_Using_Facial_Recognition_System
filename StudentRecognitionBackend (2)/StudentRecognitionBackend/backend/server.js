// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// connect DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Atlas Connected"))
    .catch(err => console.log("DB Error:", err.message));

// ensure uploads folder
const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

// ========================================
// STUDENT SYSTEM ROUTES
// ========================================
const studentRoutes = require("./routes/studentRoutes");
app.use("/api/students", studentRoutes);

const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log("Server running on", PORT));
