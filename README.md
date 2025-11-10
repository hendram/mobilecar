# 🗺️ Map Component (React + Google Maps)

This component is the core frontend simulator for vehicle movement visualization. It uses Google Maps JavaScript API to display a car moving dynamically along a pre-defined route retrieved from the backend. It’s designed for integration with your backend services (e.g., /listcars, /startTrip, /getcarroute, /carcurpos).

# 🧩 Overview

The Map component performs four major tasks:

| Step | Description |
|------|-------------|
| **1. Load Cars** | Fetches available cars from the backend via `/listcars`. |
| **2. Select & Start Trip** | User selects a car and triggers `/startTrip`. Session state is saved in `sessionStorage`. |
| **3. Fetch Route** | Retrieves the car’s path (array of coordinates) using `/getcarroute`. |
| **4. Simulate Movement** | Animates the car along the route, randomly changing speed or pausing, and reports current position to `/carcurpos`. |


## 🧠 Internal Logic
## 🏁 1. Initialization
```bash
const { isLoaded } = useJsApiLoader({
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  libraries: ["geometry", "marker"],
});
```

Loads Google Maps libraries (geometry for distance/heading computation, marker for custom icons).

## 🚗 2. Car Loading
useEffect(() => {
  fetch(`${API_URL}/listcars`)
    .then(res => res.json())
    .then(setCars)
    .catch(console.error);
}, []);


Fetches available cars from the backend and populates the dropdown menu.

## ▶️ 3. Start Trip

```bash
const handleStartTrip = () => {
  if (!selectedCar) return alert("Please select a car");
  fetch(`${API_URL}/startTrip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carId: selectedCar, startTime: new Date().toISOString() }),
  });
};
```

Stores selected car in sessionStorage.

Starts a new trip via /startTrip API.

Prevents duplicate trip creation by tracking tripStarted_<carId>.

## 🧭 4. Route Fetching
```bash
fetch(`${API_URL}/getcarroute?carId=${selectedCar}`)
  .then(res => res.json())
  .then(setPath);
```

Retrieves an array of GPS coordinates representing the route.
Example response:

```bash
[
  { "lat": -6.201, "lng": 106.816 },
  { "lat": -6.203, "lng": 106.819 }
]
```

## 🔄 5. Car Animation & Behavior
```bash
const moveCar = () => {
  const start = path[car.index];
  const end = path[nextIndex];
  const distance = google.maps.geometry.spherical.computeDistanceBetween(...);
  const step = Math.min(car.speed / distance, 1);
  ...
};

```

Moves the car marker smoothly between waypoints.

Adjusts speed randomly (0.5–3.0 m/s) to simulate natural driving.

Occasionally pauses randomly for 1–2 seconds.

Uses Google’s spherical geometry library to compute heading and interpolate position.

## 📡 6. Position Logging

Every 5 seconds, the frontend sends the car’s live position to the backend:

```bash
fetch(`${API_URL}/carcurpos`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ carId, lat, lng, newTrip }),
});
```

If the trip is new, newTrip = true, signaling the backend to create a new Firestore document.

## 🧩 Key Internal Functions
| Function | Purpose |
|-----------|----------|
| `handleStartTrip()` | Starts a new trip for the selected car and prevents duplicate starts. |
| `moveCar()` | Animates the car marker across all route points with natural driving behavior. |
| `randomizeBehavior()` | Randomly pauses or changes car speed to make movement realistic. |
| `fetch(.../getcarroute)` | Loads the car’s predefined route coordinates from the backend. |
| `fetch(.../carcurpos)` | Periodically sends live car position and new trip signals to the backend. |
