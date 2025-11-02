import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001";

export default function CarSelect() {
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/listcars`)
      .then((res) => res.json())
      .then((data) => setCars(data))
      .catch(console.error);
  }, []);

  const handleStartTrip = () => {
    if (!selectedCar) return alert("Please select a car");
    sessionStorage.setItem("selectedCarId", selectedCar);
    navigate("/map");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Select your car</h2>
      <select
        value={selectedCar}
        onChange={(e) => setSelectedCar(e.target.value)}
      >
        <option value="">-- Choose a car --</option>
        {cars.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id}
          </option>
        ))}
      </select>
      <button onClick={handleStartTrip} style={{ marginLeft: "1rem" }}>
        Start Trip
      </button>
    </div>
  );
}
