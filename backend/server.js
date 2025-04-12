// server.js
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const axios = require("axios"); // Use axios for making API requests
const serviceAccount = require("./firebaseServiceAccount.json");
require("dotenv").config();

// Initialize express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://soilfirebase2003-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();

// Endpoint to get sensor data from Firebase
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

// Endpoint to handle PDF generation using Gemini AI
app.post("/generate-report", async (req, res) => {
  const { plantName, sensorData } = req.body;

  if (!plantName || !sensorData) {
    return res.status(400).json({ error: "Missing plantName or sensorData" });
  }

  try {
    // Request report generation from Gemini AI (assuming it has an endpoint for this)
    const geminiResponse = await axios.post("https://api.gemini.com/generate-report", {
      plantName,
      sensorData
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const geminiReport = geminiResponse.data.report; // Assuming the response contains a report in text or structured format

    // Generate PDF
    const doc = new PDFDocument();
    const reportDir = path.join(__dirname, "reports");
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
    const filePath = path.join(reportDir, `${plantName}_report.pdf`);
    doc.pipe(fs.createWriteStream(filePath));

    // Add content to PDF
    doc.fontSize(20).text(`🌱 Smart Plant Report`, { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Plant: ${plantName}`);
    doc.moveDown().text(`📈 Sensor Data:`);
    doc.text(`- Temperature: ${sensorData.dht22?.temperature ?? "N/A"} °C`);
    doc.text(`- Humidity: ${sensorData.dht22?.humidity ?? "N/A"} %`);
    doc.text(`- Soil Moisture: ${sensorData.soil ?? "N/A"} %`);
    doc.text(`- Light Intensity: ${sensorData.gy302 ?? "N/A"} lux`);
    doc.text(`- Soil pH: ${sensorData.phvalue?.toFixed(2) ?? "N/A"}`);
    doc.moveDown();
    doc.text(`\nGenerated Report by Gemini AI:\n${geminiReport}`);
    doc.end();

    doc.on("finish", () => {
      res.json({
        pdfUrl: `http://localhost:${PORT}/reports/${plantName}_report.pdf`,
      });
    });
  } catch (error) {
    console.error("Error generating report with Gemini AI:", error);
    res.status(500).json({ error: "Failed to generate report." });
  }
});

// Serve PDF files statically
app.use("/reports", express.static(path.join(__dirname, "reports")));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
