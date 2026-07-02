const express = require("express");
const router = express.Router();

// Import your controller function
const { analyze } = require("../controllers/aiController");

// Route the request to the controller
router.post("/analyze/:jobId", analyze);

module.exports = router;