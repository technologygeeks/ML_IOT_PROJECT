import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDrag, useDrop } from "react-dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./index.css";

// Sample images
const images = [
  { id: 1, src: "assets/1.png", name: "Tomato" },
  { id: 2, src: "assets/2.png", name: "Potato" },
  { id: 3, src: "assets/3.png", name: "Carrot" },
  { id: 4, src: "assets/4.png", name: "Spinach" },
  { id: 5, src: "assets/5.png", name: "Onion" },
];

function App() {
  const [sensorData, setSensorData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sensorLoading, setSensorLoading] = useState(true); // Track if sensor data is still loading

  useEffect(() => {
    fetch("http://localhost:5000/api/data")
      .then((res) => res.json())
      .then((data) => {
        console.log("Data from backend:", data);
        setSensorData(data.sensors || {});
        setSensorLoading(false); // Set loading to false once the data is fetched
      })
      .catch((err) => {
        console.error("Error fetching sensor data:", err);
        setSensorLoading(false); // Set loading to false even if there is an error
      });
  }, []);

  const handleDrop = (image) => {
    setSelectedImage(image);
  };

  const fetchReport = async () => {
    if (!selectedImage) {
      alert("Please select an image first!");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/generate-report",
        {
          plantName: selectedImage.name,
          sensorData: sensorData,
        }
      );

      setReport(response.data.report);
    } catch (error) {
      console.error("Error generating report:", error);
      setReport("Failed to generate the report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-green-50 text-gray-800 py-10 px-4 sm:px-6 md:px-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-10 text-green-700">
          🌿 Smart Plant Monitoring
        </h1>

        {/* Sensor + Image Picker Section */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sensor Data */}
          <div className="bg-white rounded-2xl shadow-lg p-6 flex-1">
            <h2 className="text-2xl font-semibold mb-4">📊 Sensor Data</h2>
            {sensorLoading ? (
              <p>Loading sensor data...</p>
            ) : (
              <ul className="space-y-2 text-base sm:text-lg">
                <li>🌱 Soil Moisture: {sensorData.soil ?? "N/A"}%</li>
                <li>
                  🌡️ Temperature: {sensorData.dht22?.temperature ?? "N/A"}°C
                </li>
                <li>💧 Humidity: {sensorData.dht22?.humidity ?? "N/A"}%</li>
                <li>💡 Light Intensity: {sensorData.gy302 ?? "N/A"} lux</li>
                <li>🧪 Soil pH: {sensorData.phvalue?.toFixed(2) ?? "N/A"}</li>
              </ul>
            )}
          </div>

          {/* Image Picker */}
          <div className="bg-white rounded-2xl shadow-lg p-6 flex-1">
            <h2 className="text-2xl font-semibold mb-4">
              🖼️ Select a Plant (Drag & Drop)
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {images.map((image) => (
                <DraggableImage key={image.id} image={image} />
              ))}
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div className="max-w-xl w-full h-auto mt-10 flex items-center justify-center flex-col bg-white rounded-2xl shadow-lg p-6 text-center mx-auto">
          <h2 className="text-2xl font-semibold mb-4">📥 Drop Zone</h2>
          <DropZone image={selectedImage} onDrop={handleDrop} />
        </div>

        {/* Button */}
        <div className="text-center mt-8">
          <button
            onClick={fetchReport}
            disabled={loading || !selectedImage}
            className={`px-6 py-3 rounded-lg font-semibold transition duration-200 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {loading ? "Generating Report..." : "Generate Report"}
          </button>
        </div>

        {/* Report Output */}
        {report && (
          <div className="mt-10 bg-white rounded-2xl shadow-lg p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">📄 Plant Report</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm sm:text-base">
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

const DraggableImage = ({ image }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "image",
    item: image,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <img
      ref={drag}
      src={image.src}
      alt={image.name}
      className="w-20 sm:w-24 h-20 sm:h-24 object-cover rounded-lg border-2 border-green-300 hover:scale-105 transition duration-200"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    />
  );
};

const DropZone = ({ image, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "image",
    drop: (item) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`w-full h-40 border-4 border-dashed rounded-xl flex items-center justify-center transition duration-200 ${
        isOver ? "border-green-500 bg-green-100" : "border-gray-300 bg-gray-50"
      }`}
    >
      {image ? (
        <img src={image.src} alt="Selected" className="h-24" />
      ) : (
        <p className="text-gray-500">Drop Image Here</p>
      )}
    </div>
  );
};

export default App;
