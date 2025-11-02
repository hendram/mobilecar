import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import "./Map.css";
import carIcon from "../assets/car.png";

const libraries = ["geometry", "marker"];
const containerStyle = { width: "100%", height: "100%" };
const center = { lat: -6.2, lng: 106.816666 };
const MAP_ID = "2b8757efac2172e4321a3e69";

let newTrip = false;
const API_URL = "http://localhost:3001";

export default function Map() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const mapRef = useRef(null);
  const carRef = useRef(null);
  const [path, setPath] = useState([]);

useEffect(() => {
  const carId = sessionStorage.getItem("selectedCarId")  || "car1";
  if (!carId) return; // user must select car first

  const tripKey = `tripStarted_${carId}`;
  const hasStarted = sessionStorage.getItem(tripKey);

  if (!hasStarted) {
    fetch(`${API_URL}/startTrip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId, startTime: new Date().toISOString() }),
    }).catch(console.error);

    sessionStorage.setItem(tripKey, "true");
  }
}, []);

  useEffect(() => {
    const carId = sessionStorage.getItem("selectedCarId") || "car1";

    fetch(`${API_URL}/getcarroute?carId=${carId}`)
      .then((res) => res.json())
      .then((data) => setPath(data))
      .catch((err) => console.error("Error fetching route:", err));
  }, []);

  // --- rest of your Map.jsx logic (car movement) stays exactly the same ---
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
      const start = car.path[car.index];
      const end = car.path[car.index + 1] || car.path[0];
      if (!start || !end) return;

      const startLatLng = new window.google.maps.LatLng(start.lat, start.lng);
      const endLatLng = new window.google.maps.LatLng(end.lat, end.lng);

      const distance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          startLatLng,
          endLatLng
        );

      const step = (car.speed || 2) / (distance || 1);
      car.fraction += step;

      if (car.fraction >= 1) {
        car.fraction = 0;
        car.index = (car.index + 1) % car.path.length;
      }

      const lat = start.lat + (end.lat - start.lat) * car.fraction;
      const lng = start.lng + (end.lng - start.lng) * car.fraction;
      const position = { lat, lng };

      const heading =
        window.google.maps.geometry.spherical.computeHeading(startLatLng, endLatLng) +
        90;

      car.marker.position = position;
      car.carEl.style.transform = `translate(-50%, -50%) rotate(${heading}deg)`;

     const carId = sessionStorage.getItem("selectedCarId") || "car1";
     const tripcurpos = `tripCurpos_${carId}`;
     if (!sessionStorage.getItem("tripcurpos")) { 
        newTrip = true; 
         sessionStorage.setItem("tripcurpos", "true"); 
        console.log("🆕 New trip started — will create new Firestore collection"); 
         } 
     else { 
        newTrip = false; 
        }

      const now = Date.now();
      const shouldSendNow = !car.lastSent || now - car.lastSent > 5000;
      if (shouldSendNow) {
        car.lastSent = now;
        fetch(`${API_URL}/carcurpos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carId,
            lat,
            lng,
            newTrip,
          }),
        }).catch(() => {});
        newTrip = false;
      }
    };

    const interval = setInterval(moveCar, 200);
    return () => clearInterval(interval);
  }, [isLoaded, path]);

  if (!isLoaded) return <div className="loader">Loading map...</div>;

  return (
    <div className="map-container">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        options={{ mapId: MAP_ID }}
        onLoad={(map) => (mapRef.current = map)}
      />
    </div>
  );
}
