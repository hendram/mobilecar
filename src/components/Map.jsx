import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import "./Map.css";
import carIcon from "../assets/car.png";

const libraries = ["geometry", "marker"];
const googlemap = { width: "100%", height: "100%" };
const center = { lat: -6.2, lng: 106.816666 };
const MAP_ID = "2b8757efac2172e4321a3e69";
const API_URL = import.meta.env.VITE_BACKEND_APPS;

let newTrip = false;

export default function Map() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });


  const mapRef = useRef(null);
  const carRef = useRef(null);
  const [path, setPath] = useState([]);
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(sessionStorage.getItem("selectedCarId") || "");
  const [showSelect, setShowSelect] = useState(!selectedCar);

  // --- Load car list once ---
  useEffect(() => {
    fetch(`${API_URL}/listcars`)
      .then((res) => res.json())
      .then((data) => setCars(data))
      .catch(console.error);
  }, []);

  // --- Handle trip start ---
  const handleStartTrip = () => {
    if (!selectedCar) return alert("Please select a car");

    sessionStorage.setItem("selectedCarId", selectedCar);
    const tripKey = `tripStarted_${selectedCar}`;

    if (!sessionStorage.getItem(tripKey)) {
      fetch(`${API_URL}/startTrip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId: selectedCar, startTime: new Date().toISOString() }),
      }).catch(console.error);
      sessionStorage.setItem(tripKey, "true");
    }

    setShowSelect(false);
  };

  // --- Fetch route once car selected ---
  useEffect(() => {
    if (!selectedCar) return;
    fetch(`${API_URL}/getcarroute?carId=${selectedCar}`)
      .then((res) => res.json())
      .then((data) => setPath(data))
      .catch((err) => console.error("Error fetching route:", err));
  }, [selectedCar]);

  // --- Car movement simulation ---
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !path || path.length < 2) return;

    const map = mapRef.current;
    if (carRef.current?.marker) carRef.current.marker.setMap(null);

    const carEl = document.createElement("img");
    carEl.src = carIcon;
    carEl.style.width = "50px";
    carEl.style.transformOrigin = "50% 50%";

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      position: path[0],
      content: carEl,
      map,
    });

    carRef.current = {
      path,
      marker,
      carEl,
      index: 0,
      fraction: 0,
      lastSent: null,
      speed: 2,
      paused: false,
    };

    const randomizeBehavior = () => {
      if (!carRef.current) return;
      const car = carRef.current;
      if (Math.random() < 0.2 && !car.paused) {
        car.paused = true;
        const pauseTime = 1000 + Math.random() * 1000;
        setTimeout(() => (car.paused = false), pauseTime);
      } else {
        car.speed = 0.5 + Math.random() * 3.0;
      }
      const nextChange = 1000 + Math.random() * 7000;
      setTimeout(randomizeBehavior, nextChange);
    };
    randomizeBehavior();

const moveCar = () => {
  const car = carRef.current;
  if (!car || car.paused) return;

  const path = car.path;
  if (path.length < 2) return;

  const start = path[car.index];
  const nextIndex = (car.index + 1) % path.length; // wrap around smoothly
  const end = path[nextIndex];

  const startLatLng = new google.maps.LatLng(start.lat, start.lng);
  const endLatLng = new google.maps.LatLng(end.lat, end.lng);
  const distance = google.maps.geometry.spherical.computeDistanceBetween(startLatLng, endLatLng);

  // Normalize step (speed relative to distance)
  const step = Math.min((car.speed || 2) / (distance || 1), 1);
  car.fraction = Math.min(car.fraction + step, 1);

  // Compute intermediate position
  const lat = start.lat + (end.lat - start.lat) * car.fraction;
  const lng = start.lng + (end.lng - start.lng) * car.fraction;
  const position = { lat, lng };

  // Heading angle (rotate car)
  const heading = google.maps.geometry.spherical.computeHeading(startLatLng, endLatLng) + 90;
  car.marker.position = position;
  car.carEl.style.transform = `translate(-50%, -50%) rotate(${heading}deg)`;

  // If finished this segment, go to next one
  if (car.fraction >= 1) {
    car.fraction = 0;
    car.index = nextIndex;
  }

  // --- Handle sending position to backend ---
  const carId = sessionStorage.getItem("selectedCarId");
  const tripcurpos = `tripCurpos_${carId}`;
  if (!sessionStorage.getItem(tripcurpos)) {
    newTrip = true;
    sessionStorage.setItem(tripcurpos, "true");
    console.log("🆕 New trip started — will create new Firestore collection");
  } else newTrip = false;

  const now = Date.now();
  const shouldSendNow = !car.lastSent || now - car.lastSent > 5000;
  if (shouldSendNow) {
    car.lastSent = now;
    fetch(`${API_URL}/carcurpos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId, lat, lng, newTrip }),
    }).catch(() => {});
    newTrip = false;
  }
};


    const interval = setInterval(moveCar, 200);
    return () => clearInterval(interval);
  }, [isLoaded, path]);

  if (!isLoaded) return <div className="loader">Loading map...</div>;

  return (
    <div className="map-container map-container-land">
      {/* Map underneath */}
      <GoogleMap
        mapContainerClassName="googlemap"
        center={center}
        zoom={14}
        options={{ mapId: MAP_ID }}
        onLoad={(map) => (mapRef.current = map)}
      />

      {/* Car selection overlay */}
      {showSelect && (
        <div className="car-select-overlay car-select-overlay-land">
          <div className="car-select-box car-select-box-land">
            <span>Select your car</span>
            <div className="carselect-tripbuttondiv carselect-tripbuttondiv-land">
            <select
              className="car-select-button car-select-button-land"
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
            >
              <option value="">-- Choose a car --</option>
              {cars.map((c) => (
                <option key={c.id} className="car-select-option car-select-option-land" value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
            <button className="starttripbutton starttripbutton-land" onClick={handleStartTrip}>Start Trip</button>
         </div>   
       </div>
        </div>
      )}
    </div>
  );
}
