import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDrag, useDrop } from "react-dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./App.css";

const images = [
  { id: 1, src: "assets/1.jpg", name: "Tomato" },
  { id: 2, src: "assets/2.jpg", name: "Potato" },
  { id: 3, src: "assets/3.jpg", name: "Carrot" },
  { id: 4, src: "assets/4.jpg", name: "Spinach" },
  { id: 5, src: "assets/1.jpg", name: "Tomato" },
];

function App() {
  const [sensorData, setSensorData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysis, setAnalysis] = useState("");

  useEffect(() => {
    axios.get("http://localhost:5000/sensor-data").then((response) => {
      setSensorData(response.data);
    });
  }, []);

  const handleDrop = (image) => {
    setSelectedImage(image);
  };

  const analyzePlant = async () => {
    if (!selectedImage) {
      alert("Please select an image first!");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/analyze", {
        plantName: selectedImage.name,
      });

      setAnalysis(response.data.result);
    } catch (error) {
      console.error("Error analyzing plant:", error);
      setAnalysis("Failed to analyze the plant.");
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <h1>Smart Plant Monitoring</h1>
        <div className="sensor-data">
          <h2>Sensor Data</h2>
          <p>Soil Moisture: {sensorData.soilMoisture}%</p>
          <p>Temperature: {sensorData.temperature}°C</p>
          <p>Humidity: {sensorData.humidity}%</p>
          <p>Light Intensity: {sensorData.lightIntensity} lux</p>
          <p>Soil pH: {sensorData.soilPH}</p>
        </div>

        <div className="image-selection">
          <h2>Select an Image (Drag & Drop)</h2>
          <div className="image-container">
            {images.map((image) => (
              <DraggableImage key={image.id} image={image} />
            ))}
          </div>
        </div>

        <div className="drop-zone-section">
          <h2>Drop Selected Image Here</h2>
          <DropZone image={selectedImage} onDrop={handleDrop} />
        </div>

        <button onClick={analyzePlant}>Analyze Plant</button>
        {analysis && <p>Analysis Result: {analysis}</p>}
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
      className="draggable-image"
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
    <div ref={drop} className="dropzone" style={{ backgroundColor: isOver ? "#e0ffe0" : "white" }}>
      {image ? <img src={image.src} alt="Selected" className="preview" /> : <p>Drop Image Here</p>}
    </div>
  );
};

export default App;
