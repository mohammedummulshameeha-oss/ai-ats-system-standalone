const express = require("express");
const router = express.Router();
const Job = require("../models/Job");


// ✅ GET ALL JOBS (clean)
router.get("/", async (req, res) => {
    try {
        const jobs = await Job.find();
        res.json({ success: true, jobs });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ✅ ADD JOB (with duplicate prevention)
router.post("/", async (req, res) => {
    try {
        const { jobTitle, company, location, experience, skills, description } = req.body;

        const existingJob = await Job.findOne({ jobTitle });

        if (existingJob) {
            return res.status(400).json({
                success: false,
                message: "Job already exists"
            });
        }

        const job = new Job({
            jobTitle,
            company,
            location,
            experience,
            skills,
            description
        });

        await job.save();

        res.json({
            success: true,
            message: "Job created successfully",
            job
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ✅ DELETE JOB
router.delete("/:id", async (req, res) => {
    try {
        await Job.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Job deleted successfully"
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const { jobTitle, company, location, experience, skills, description } = req.body;

        const updatedJob = await Job.findByIdAndUpdate(
            req.params.id,
            {
                jobTitle,
                company,
                location,
                experience,
                skills,
                description
            },
            { new: true }
        );

        res.json({
            success: true,
            message: "Job updated successfully",
            job: updatedJob
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
module.exports = router;
