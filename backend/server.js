const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is correctly set in .env
});

// Simulated sensor data
const sensorData = {
  soilMoisture: 45, // in percentage
  temperature: 25, // in Celsius
  humidity: 60, // in percentage
  lightIntensity: 1000, // in lux
  soilPH: 6.5, // pH level
};

// Route to get sensor data
app.get("/sensor-data", (req, res) => {
  res.json(sensorData);
});

// Route to analyze plant health using OpenAI API
app.post("/analyze", async (req, res) => {
  const { plantName } = req.body;

  if (!plantName) {
    return res.status(400).json({ result: "No plant selected!" });
  }

  try {
    const prompt = `Analyze the health of a ${plantName} plant based on these conditions:
    - Soil Moisture: ${sensorData.soilMoisture}%
    - Temperature: ${sensorData.temperature}°C
    - Humidity: ${sensorData.humidity}%
    - Light Intensity: ${sensorData.lightIntensity} lux
    - Soil pH: ${sensorData.soilPH}
    
    Provide a concise diagnosis (max 2 sentences) and short recommendations (max 2 sentences).`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100, // Limit response size
      temperature: 0.7, // Adjust creativity level
    });

    const analysis = response.choices[0]?.message?.content || "No response generated.";
    res.json({ result: analysis });

  } catch (error) {
    console.error("Error calling OpenAI API:", error.response?.data || error.message);
    res.status(500).json({ result: "Failed to analyze the plant due to server error." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

