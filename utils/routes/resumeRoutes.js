const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Import all three active controller functions cleanly
const { uploadResume, getHighestScore, exportExcel } = require("../controllers/resumeController");

// 2. Ensure the temporary local 'uploads' storage directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 3. Configure Multer disk storage properties
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 4. CRITICAL: Define the missing "upload" middleware configuration instance
const upload = multer({ storage: storage });

// 5. Explicitly map your pipeline endpoints to their handlers
router.post("/upload", upload.single("resume"), uploadResume);
router.get("/highest-score", getHighestScore);
router.get("/export-excel", exportExcel);

module.exports = router;