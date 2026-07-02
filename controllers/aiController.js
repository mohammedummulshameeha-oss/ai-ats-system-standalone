const { analyzeResume } = require("../utils/geminiService");
// Ensure the model path correctly references your actual Mongoose schema location
const Resume = require("../models/Resume"); 

const analyze = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resumeText, filePath, fileName } = req.body; 

    // Validate that text extraction from the document didn't return an empty string
    if (!resumeText || resumeText.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "No readable text content extracted from the resume.",
      });
    }

    // Run the live real-time analysis pipeline using your Gemini utility service
    const result = await analyzeResume(resumeText, jobId);

    // =========================================================================
    // 🎯 AUTOMATIC EXCEL DATA STORAGE PIPELINE (FIXED STRUCTURE)
    // =========================================================================
    // Extract the raw numerical score returned from the AI response
    const finalScore = Number(result?.score) || 0;

    // Check if the applicant passes your HR automation benchmark threshold
    if (finalScore >= 80) {
      const highScorer = new Resume({
        jobId: jobId,
        extractedText: resumeText,
        
        // Use the filename to keep the candidate's name clean on the root document level
        // (e.g., if result.candidateName is passed or if we parse fileName)
        fileName: result.candidateName ? `${result.candidateName}.pdf` : (fileName || "uploaded_resume.pdf"),
        filePath: filePath || "uploads/temporary_placeholder.pdf",

        // ✨ FIX: Match your Resume.js schema architecture perfectly by wrapping inside analysis!
        analysis: {
          score: finalScore,
          matchedSkills: result.matchedSkills || [],
          missingSkills: result.missingSkills || [],
          recommendation: result.recommendation || ""
        }
      });

      // Commit the verified candidate record straight to your MongoDB collection
      await highScorer.save();
      console.log(`🎯 Automation Complete: Saved candidate "${result.candidateName || fileName}" to MongoDB with a score of ${finalScore}%!`);
    }
    // =========================================================================

    // Explicitly send back the exact wrapped payload structure the frontend expects
    return res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.log("AI CONTROLLER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// CRITICAL: Export matching exactly what your router imports
module.exports = { analyze };