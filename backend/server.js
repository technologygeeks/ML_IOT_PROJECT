const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
require("dotenv").config();
const axios = require("axios");

// Firebase Admin SDK config
const serviceAccount = require("./firebaseServiceAccount.json");

// Initialize express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://soilfirebase2003-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();

// Helper: Delay function for retry
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: Generate OpenAI report with retry logic
async function generateReportWithRetry(prompt, retries = 3) {
  const url = "https://api.openai.com/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };
  const data = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that generates plant care reports based on sensor data.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 500,
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, data, { headers });
      return response.data.choices[0].message.content;
    } catch (error) {
      if (error.response && error.response.status === 429 && i < retries - 1) {
        console.warn(`⚠️ Rate limit hit. Retrying in 2 seconds... (Attempt ${i + 1})`);
        await delay(2000); // Wait before retry
      } else {
        throw error;
      }
    }
  }

  throw new Error("Failed after multiple retries due to rate limits.");
}

// Endpoint: Fetch sensor data from Firebase
app.get("/api/data", async (req, res) => {
  try {
    const snapshot = await db.ref("/").once("value");
    const data = snapshot.val();
    res.json(data);
  } catch (err) {
    console.error("❌ Error getting data:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// Endpoint: Generate Report using OpenAI
app.post("/generate-report", async (req, res) => {
  const { plantName, sensorData } = req.body;

  if (!plantName || !sensorData) {
    return res.status(400).json({ error: "Missing plantName or sensorData" });
  }

  const prompt = `Generate a detailed report for a plant named "${plantName}" with the following sensor data:

- Humidity: ${sensorData.dht22?.humidity}
- Temperature: ${sensorData.dht22?.temperature}
- Light Intensity: ${sensorData.gy302}
- pH Value: ${sensorData.phvalue}
- Soil Moisture: ${sensorData.soil}

Include insights, suggestions, and plant care tips.`;

  try {
    const reportText = await generateReportWithRetry(prompt);

    res.json({
      plantName,
      sensorData,
      report: reportText || "No report generated.",
    });
  } catch (error) {
    console.error("❌ Error generating report with OpenAI:", error.message);
    res.status(500).json({ error: "Failed to generate report with OpenAI." });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
