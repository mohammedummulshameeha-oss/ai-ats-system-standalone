require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer"); 
const ExcelJS = require("exceljs");

// Import the Resume model to interact with the collection for the leaderboard
const Resume = require("./models/Resume"); 

const app = express();

// CORS Configuration
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// Existing Application Pipeline Routes
const jobRoutes = require("./routes/jobRoutes");
const aiRoutes = require("./routes/aiRoutes");
const resumeRoutes = require("./routes/resumeRoutes");

app.use("/api/jobs", jobRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/resume", resumeRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log(err));

// ========================================================
// 📊 REAL-TIME HIGHEST SCORE DATA PIPELINE
// ========================================================

// 1. Endpoint to find the absolute highest-scoring candidate who passed the HR threshold (>= 80%)
app.get("/api/resume/highest-score", async (req, res) => {
  try {
    const topCandidate = await Resume.findOne({ score: { $gte: 80 } })
      .sort({ score: -1 })
      .populate("jobId");

    if (!topCandidate) {
      return res.status(200).json({ 
        success: false, 
        message: "No candidates matching or exceeding the 80% threshold were found." 
      });
    }

    return res.status(200).json({ success: true, data: topCandidate });
  } catch (err) {
    console.error("LEADERBOARD PIPELINE ERROR:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. EXCEL EXPORT: Compiles all candidates >= 80% into an Excel download sheet
app.get("/api/resume/export-excel", async (req, res) => {
  try {
    const qualifiedCandidates = await Resume.find({ score: { $gte: 80 } })
      .sort({ score: -1 })
      .populate("jobId");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Top Applicants (80%+)");

    worksheet.columns = [
      { header: "Candidate Identifier", key: "name", width: 25 },
      { header: "Target Professional Role", key: "role", width: 30 },
      { header: "Matrix Match Score", key: "score", width: 20 },
      { header: "Matched Competencies", key: "matched", width: 40 },
      { header: "Competency Variances (Missing)", key: "missing", width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4F46E5" }
    };

    qualifiedCandidates.forEach((candidate) => {
      worksheet.addRow({
        name: candidate.candidateName || "Shameeha",
        role: candidate.jobId?.jobTitle || "Network Design Engineer",
        score: `${candidate.score}%`,
        matched: Array.isArray(candidate.matchedSkills) ? candidate.matchedSkills.join(", ") : "",
        missing: Array.isArray(candidate.missingSkills) ? candidate.missingSkills.join(", ") : ""
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Highest_Scoring_Candidates.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("EXCEL SYSTEM GENERATION ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// 🛠️ REAL-TIME SMTP EMAIL CONFIGURATION & ROUTING PIPELINE
// ========================================================

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/api/send-interview", async (req, res) => {
  const { to, jobTitle, date, time, link } = req.body;

  if (!to) {
    return res.status(400).json({ success: false, message: "Recipient address is required." });
  }

  const mailOptions = {
    from: `"HR Team" <${process.env.EMAIL_USER}>`,
    to: to, 
    subject: `Interview Invitation for ${jobTitle} Role`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color: #4f46e5; margin-top: 0;">Dear Candidate,</h2>
        <p style="font-size: 15px; line-height: 1.6;">Congratulations! You have been successfully shortlisted based on your technical ATS evaluation layout metrics.</p>
        <p style="font-size: 15px; line-height: 1.6;">We are excited to invite you to a formal technical discussion panel for the <strong>${jobTitle}</strong> position.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #3b82f6;">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">📅 Live Synchronization Windows:</h3>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Target Date:</strong> ${date}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Live Time:</strong> ${time}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Access Link:</strong> <a href="${link}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">Join Stream Pipeline</a></p>
        </div>
        
        <p style="font-size: 14px; color: #64748b;">Please verify your local network communication elements 5 minutes prior to structural start.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 15px; margin: 0;">Best regards,<br/><strong style="color: #1e293b;">HR Recruitment Team</strong></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: "Live email sent successfully!" });
  } catch (error) {
    console.error("SMTP DISPATCH ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================
// SERVER STARTUP INITIALIZATION
// ========================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});