// server.js
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

// Firebase Admin SDK config
const serviceAccount = require("./firebaseServiceAccount.json");

// Initialize express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://soilfirebase2003-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();

// Endpoint: Fetch sensor data from Firebase
app.get("/api/data", async (req, res) => {
  try {
    const snapshot = await db.ref("/").once("value");
    const data = snapshot.val();
    res.json(data);
  } catch (err) {
    console.error("Error getting data:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.post("/generate-report", async (req, res) => {
  const { plantName, sensorData } = req.body;

  if (!plantName || !sensorData) {
    return res.status(400).json({ error: "Missing plantName or sensorData" });
  }

  try {
    const geminiAPIUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const requestData = {
      contents: [
        {
          parts: [
            {
              text: `Generate a detailed report for a plant named "${plantName}" with the following sensor data:\n\n${JSON.stringify(sensorData, null, 2)}\n\nInclude insights, suggestions, and plant care tips.`,
            },
          ],
        },
      ],
    };

    const response = await axios.post(geminiAPIUrl, requestData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const generatedReport = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No report generated.";

    res.json({
      plantName,
      sensorData,
      report: generatedReport,
    });
  } catch (error) {
    console.error("Error generating report with Gemini AI:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate report with Gemini AI." });
  }
});


// Serve static PDF reports
const reportsDir = path.join(__dirname, "reports");
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir); // Ensure reports directory exists
}
app.use("/reports", express.static(reportsDir));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
