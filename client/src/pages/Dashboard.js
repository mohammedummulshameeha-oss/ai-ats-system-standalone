import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Dashboard() {
  // ================= STATE =================
  const [tab, setTab] = useState("ats"); // Default tab is ATS
  const [jobId, setJobId] = useState("");
  const [jobs, setJobs] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // State for Leaderboard Data Pipeline
  const [topCandidate, setTopCandidate] = useState(null);

  // Scheduling State Bindings
  const [interviewDate, setInterviewDate] = useState("2026-06-30");
  const [interviewTime, setInterviewTime] = useState("10:00 AM");
  const [meetLink, setMeetLink] = useState("https://meet.google.com/xyz");
  const [interviewer, setInterviewer] = useState("Sarah Johnson");

  const getSelectedJobTitle = () => {
    const selectedJob = jobs.find((job) => job._id === jobId);
    return selectedJob ? selectedJob.jobTitle : "Not Selected";
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj)) return dateStr;
    return dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    if (!minutes) return timeStr; // fallback if already formatted
    const hourInt = parseInt(hours, 10);
    const ampm = hourInt >= 12 ? "PM" : "AM";
    const formattedHours = hourInt % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  // Helper to extract clean Candidate Display Name from fileName schema property
  const getCandidateDisplayName = () => {
    if (!topCandidate) return "Shameeha"; // Fallback baseline if empty
    if (topCandidate.fileName) {
      return topCandidate.fileName.replace(/\.[^/.]+$/, ""); // Converts "TAHSEENA.pdf" -> "TAHSEENA"
    }
    return "Candidate";
  };

  // Helper to extract candidate email dynamically from extracted text or nested properties
  const getCandidateEmail = () => {
    if (!topCandidate) return "shameeha0702@gmail.com";
    if (topCandidate.email) return topCandidate.email;
    
    // Check inside the nested analysis or extracted text for an email pattern
    const textToSearch = topCandidate.extractedText || topCandidate.analysis?.extractedText || "";
    if (textToSearch) {
      const emailMatch = textToSearch.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) return emailMatch[0];
    }
    return "shameeha0702@gmail.com"; // Fallback if no email string is located
  };

  // Real-Time Leaderboard Fetch Function
  const fetchTopCandidate = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/resume/highest-score");
      if (res.data.success) {
        setTopCandidate(res.data.data);
      } else {
        setTopCandidate(null); // Clears custom state safely if no records hit threshold yet
      }
    } catch (err) {
      console.log("LEADERBOARD PIPELINE READ ERROR:", err.message);
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/jobs");
        setJobs(res.data.jobs || []);
      } catch (err) {
        console.log("JOB LOAD ERROR:", err.message);
      }
    };
    fetchJobs();
    fetchTopCandidate(); // Pull status from backend on load
  }, []);

  const analyze = async () => {
    try {
      setLoading(true);
      if (!jobId || !resumeFile) {
        alert("Select job and upload resume");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("jobId", jobId);

      const uploadRes = await axios.post("http://localhost:5000/api/resume/upload", formData);
      const payloadData = uploadRes.data.payload || {};
      const extractedText = typeof payloadData === "string" ? payloadData : (payloadData.text || payloadData.extractedText || payloadData.resumeText);
      
      if (!extractedText) {
        alert("❌ Text extraction failed.");
        setLoading(false);
        return;
      }

      const aiRes = await axios.post(`http://localhost:5000/api/ai/analyze/${jobId}`, { resumeText: extractedText });
      const backendPayload = aiRes.data.data;
      
      if (!backendPayload) {
        alert("❌ Real-time analysis empty.");
        setLoading(false);
        return;
      }

      setResult({
        score: Number(backendPayload.score) || 0,
        matchedSkills: Array.isArray(backendPayload.matchedSkills) ? backendPayload.matchedSkills : [],
        missingSkills: Array.isArray(backendPayload.missingSkills) ? backendPayload.missingSkills : [],
        recommendation: backendPayload.recommendation || "No recommendation text generated."
      });

      // Automatically sync and refresh the data display after a scan runs
      fetchTopCandidate();
      setLoading(false);
    } catch (err) {
      console.log("ANALYZE ERROR:", err.response?.data || err.message);
      alert("Analysis error: " + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const triggerLiveEmail = async () => {
    try {
      setLoading(true);
      
      const payload = {
        to: getCandidateEmail(), // ✨ FIX: Plugs in dynamic email address variable
        jobTitle: getSelectedJobTitle(),
        date: formatDisplayDate(interviewDate),
        time: formatDisplayTime(interviewTime),
        link: meetLink
      };

      const res = await axios.post("http://localhost:5000/api/send-interview", payload);
      
      if (res.data.success) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        alert("SMTP Server rejected mail: " + res.data.message);
      }
      setLoading(false);
    } catch (err) {
      console.error("EMAIL SYSTEM ERROR:", err);
      alert("Failed to send live email over SMTP: " + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{animations}</style>

      <h1 style={styles.title}>🚀 AI ATS Dashboard</h1>

      {/* TAB BAR WITH INTEGRATED EXPORT FUNCTIONAL ELEMENT */}
      <div style={styles.tabBar}>
        {["ats", "schedule", "email"].map((t) => (
          <button 
            key={t}
            onClick={() => setTab(t)} 
            style={{
              ...styles.tabBtn, 
              background: tab === t ? "linear-gradient(135deg, #4f46e5, #3b82f6)" : "white",
              color: tab === t ? "white" : "#4b5563",
              boxShadow: tab === t ? "0 4px 14px rgba(59, 130, 246, 0.4)" : "none"
            }}
          >
            {t === "ats" && "📄 ATS Evaluation"}
            {t === "schedule" && "📅 Schedule Panel"}
            {t === "email" && "📧 Email"}
          </button>
        ))}

        {/* 📊 CACHE-BUSTED EXPORT BUTTON TO FORCE RE-DOWNLOAD REAL-TIME DB DATA */}
        <button 
          className="interactive-btn"
          onClick={() => window.open(`http://localhost:5000/api/resume/export-excel?t=${Date.now()}`, "_blank")}
          style={styles.navExcelExportButton}
        >
          📥 Export candidate details
        </button>
      </div>

      <div style={{ animation: "fadeIn 0.4s ease-out" }} key={tab}>
        
        {/* ================= ATS ================= */}
        {tab === "ats" && (
          <>
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, color: "#1f2937" }}>Select target role</h3>
              <select style={styles.input} value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">Choose Job Template</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>{job.jobTitle}</option>
                ))}
              </select>
            </div>

            <div style={styles.card}>
              <h3 style={{ marginTop: 0, color: "#1f2937" }}>Upload Application Document</h3>
              <div style={styles.fileUploadArea}>
                <input type="file" accept="application/pdf" onChange={(e) => setResumeFile(e.target.files[0])} />
              </div>
            </div>

            <button className="interactive-btn" style={styles.actionButton} onClick={analyze} disabled={!jobId || !resumeFile || loading}>
              {loading ? "Parsing Data via Gemini..." : "Analyze Resume"}
            </button>

            {result && (
              <div style={styles.resultsContainer}>
                <div style={{ textAlign: "center", marginBottom: 25 }}>
                  <h3 style={{ margin: "0 0 10px 0", color: "#1f2937" }}>📊 Matrix Match Score</h3>
                  <div style={styles.progressBarWrapper}>
                    <div style={{ ...styles.progressBarFill, width: `${result.score}%` }}></div>
                  </div>
                  <span style={styles.scoreText}>{result.score}% Accuracy</span>
                </div>

                <div style={styles.skillsGrid}>
                  <div style={styles.skillsBox}>
                    <h4 style={{ margin: "0 0 12px 0", color: "#10b981" }}>✅ Validated Skills</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {result.matchedSkills.length > 0 ? result.matchedSkills.map((skill, index) => (
                        <span key={index} style={styles.matchBadge}>{skill}</span>
                      )) : <span style={{ color: "#9ca3af" }}>None detected</span>}
                    </div>
                  </div>

                  <div style={styles.skillsBox}>
                    <h4 style={{ margin: "0 0 12px 0", color: "#ef4444" }}>❌ Skill Variances</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {result.missingSkills.length > 0 ? result.missingSkills.map((skill, index) => (
                        <span key={index} style={styles.missingBadge}>{skill}</span>
                      )) : <span style={{ color: "#9ca3af" }}>Perfect Match</span>}
                    </div>
                  </div>
                </div>

                <div style={styles.recommendationBox}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#1e3a8a" }}>💡 AI Optimization Feedback</h4>
                  <p style={styles.recommendationText}>{result.recommendation}</p>
                </div>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <button className="interactive-btn" style={styles.nextTabButton} onClick={() => setTab("schedule")}>
                    📅 Advance to Scheduling
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= SCHEDULE MEETING PANEL ================= */}
        {tab === "schedule" && (
          <div style={{ width: "80%", margin: "auto" }}>
            <h2 style={{ textAlign: "center", color: "#1f2937", marginBottom: 20 }}>📅 Configure Interview Metrics</h2>
            <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
              <div style={{ ...styles.card, flex: 1, margin: 0 }}>
                <h3 style={{ marginTop: 0, color: "#4f46e5" }}>👤 Candidate Context</h3>
                <p style={styles.infoRow}><b>Identifier:</b> {getCandidateDisplayName()}</p>
                <p style={styles.infoRow}><b>Assigned Role:</b> {getSelectedJobTitle()}</p>
                <p style={styles.infoRow}><b>Pipeline Match:</b> <span style={{ color: "#3b82f6", fontWeight: "bold" }}>{topCandidate?.analysis?.score || result?.score || 0}%</span></p>
              </div>
              <div style={{ ...styles.card, flex: 1, margin: 0 }}>
                <h3 style={{ marginTop: 0, color: "#3b82f6" }}>🎛 Parameters Setup</h3>
                <input type="date" style={styles.input} value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
                <input type="time" style={styles.input} value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} />
                <input style={styles.input} placeholder="Custom Meet Link" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} />
                <select style={styles.input} value={interviewer} onChange={(e) => setInterviewer(e.target.value)}>
                  <option value="Sarah Johnson">Sarah Johnson (Tech Lead)</option>
                  <option value="Mike Ross">Mike Ross (Associate Partner)</option>
                </select>
              </div>
            </div>

            {/* EMAIL PREVIEW */}
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, color: "#1f2937" }}>👀 Generated Content Preview</h3>
              <pre style={styles.previewPreBox}>
{`Subject: Interview Invitation for ${getSelectedJobTitle()} Role

Dear ${getCandidateDisplayName()},

Congratulations! You have been processed through to the secondary evaluation window for the ${getSelectedJobTitle()} deployment profile.

Scheduled Synchronization Windows:
- Target Date: ${formatDisplayDate(interviewDate)}
- Live Time: ${formatDisplayTime(interviewTime)}
- Stream Access Link: ${meetLink}

Please check your environmental network access elements 5 minutes prior to structural start.

Regards,
HR Recruitment Team`}
              </pre>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 15 }}>
                <button className="interactive-btn" style={styles.cancelButton} onClick={() => setTab("ats")}>Back</button>
                <button className="interactive-btn" style={styles.nextStepButton} onClick={() => setTab("email")}>Proceed to Mailroom ➡️</button>
              </div>
            </div>
          </div>
        )}

        {/* ================= GMAIL / EMAIL TAB ================= */}
        {tab === "email" && (
          <div style={styles.emailContainer}>
            <div style={styles.emailCard}>
              <h2 style={{ marginTop: 0, color: "#1f2937" }}>📧 Compose Email</h2>
              <div style={styles.emailHeader}>
                <p><b>From:</b> mohammedummulshameeha@gmail.com</p>
                <p><b>To:</b> {getCandidateEmail()}</p> {/* ✨ FIX: Dynamically logs correct candidate address */}
              </div>
              <div style={{ marginBottom: 15, padding: "10px 0", borderBottom: "1px solid #e5e7eb" }}>
                <b>Subject:</b> Interview Invitation for {getSelectedJobTitle()} Role
              </div>
              <div style={styles.emailBody}>
                <p>Dear {getCandidateDisplayName()},</p>
                <p>Congratulations! You have been shortlisted based on your technical ATS evaluation layout metrics.</p>
                <p>We are excited to invite you to a technical discussion panel for the <b>{getSelectedJobTitle()}</b> profile.</p>
                <p>Scheduled details:</p>
                <ul style={{ background: "#f3f4f6", padding: "15px 35px", borderRadius: "8px", listStyleType: "disc" }}>
                  <li>Date: {formatDisplayDate(interviewDate)}</li>
                  <li>Time: {formatDisplayTime(interviewTime)}</li>
                  <li>Mode Connection: Online Live</li>
                  <li>Access Link: <a href={meetLink} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>{meetLink}</a></li>
                </ul>
                <p>Best regards,<br />HR team</p>
              </div>
              
              <button
                className="interactive-btn"
                style={styles.sendButton}
                onClick={triggerLiveEmail}
                disabled={loading}
              >
                {loading ? "Sending email over SMTP..." : "🚀 Send Email"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SUCCESS POPUP */}
      {emailSent && (
        <div style={styles.popup}>
          <span style={{ marginRight: 8 }}>📬</span> Email was sent successfully
        </div>
      )}
    </div>
  );
}

// ================= CSS STYLESHEETS =================
const styles = {
  container: { padding: "40px 20px", fontFamily: "'Segoe UI', Roboto, sans-serif", background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", minHeight: "100vh" },
  title: { textAlign: "center", color: "#1e293b", fontSize: "2.2rem", fontWeight: "800", marginBottom: 30 },
  tabBar: { display: "flex", gap: 12, justifyContent: "center", alignItems: "center", marginBottom: 35 },
  tabBtn: { padding: "12px 24px", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" },
  card: { background: "white", padding: 25, margin: "0 auto 25px auto", width: "65%", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" },
  navExcelExportButton: { padding: "12px 20px", background: "#10b981", color: "white", border: "none", borderRadius: "12px", fontWeight: "600", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", height: "100%", transition: "all 0.3s ease" },
  input: { width: "100%", padding: "12px 16px", marginTop: 12, boxSizing: "border-box", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#f8fafc", outline: "none" },
  fileUploadArea: { border: "2px dashed #cbd5e1", padding: "30px", borderRadius: "12px", textAlign: "center", background: "#f8fafc", marginTop: 10 },
  actionButton: { display: "block", margin: "25px auto", padding: "14px 35px", background: "linear-gradient(135deg, #4f46e5, #4338ca)", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "700", boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.3)" },
  resultsContainer: { background: "white", padding: "30px", margin: "25px auto", width: "65%", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" },
  progressBarWrapper: { width: "100%", height: "16px", backgroundColor: "#e2e8f0", borderRadius: "20px", overflow: "hidden", margin: "15px 0" },
  progressBarFill: { height: "100%", background: "linear-gradient(90deg, #4f46e5, #3b82f6)", transition: "width 0.8s ease-in-out" },
  scoreText: { fontSize: "1.4rem", fontWeight: "800", color: "#4f46e5" },
  skillsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", margin: "25px 0" },
  skillsBox: { background: "#f8fafc", padding: 15, borderRadius: 12, border: "1px solid #f1f5f9" },
  matchBadge: { backgroundColor: "#d1fae5", color: "#065f46", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600" },
  missingBadge: { backgroundColor: "#fee2e2", color: "#991b1b", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600" },
  recommendationBox: { backgroundColor: "#eff6ff", padding: "20px", borderRadius: "12px", borderLeft: "5px solid #3b82f6", margin: "20px 0" },
  recommendationText: { margin: 0, fontSize: "14px", color: "#1e3a8a", lineHeight: "1.7", textAlign: "justify" },
  nextTabButton: { padding: "14px 30px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" },
  emailContainer: { padding: "10px 0" },
  emailCard: { background: "white", width: "70%", margin: "auto", padding: "30px", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" },
  emailHeader: { background: "#f8fafc", padding: 15, borderRadius: 10, fontSize: "14px", color: "#475569", lineHeight: "1.6" },
  emailBody: { lineHeight: "1.7", fontSize: "15px", color: "#334155", marginTop: "20px" },
  sendButton: { marginTop: "25px", padding: "14px 28px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", width: "100%", boxShadow: "0 10px 20px -5px rgba(37, 99, 235, 0.3)" },
  infoRow: { margin: "10px 0", fontSize: "15px", color: "#475569" },
  previewPreBox: { whiteSpace: "pre-wrap", fontFamily: "monospace", lineHeight: "1.6", background: "#f8fafc", color: "#334155", padding: "20px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "13px" },
  cancelButton: { padding: "12px 24px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "600", color: "#64748b" },
  nextStepButton: { padding: "12px 28px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" },
  popup: { position: "fixed", top: 25, right: 25, background: "linear-gradient(135deg, #059669, #10b981)", color: "white", padding: "16px 28px", borderRadius: "12px", fontWeight: "600", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)", zIndex: 9999, animation: "slideInRight 0.3s ease-out" },
};

const animations = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .interactive-btn { transition: all 0.2s ease; }
  .interactive-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
  input:focus, select:focus { border-color: #4f46e5 !important; background-color: #fff !important; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
`;