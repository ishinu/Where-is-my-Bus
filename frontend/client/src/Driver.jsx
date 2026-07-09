import { useState, useRef } from "react";
import axios from "axios";

// Backend URL
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function Driver({ setPage, user, simulationMode, setSimulationMode }) {
  const [status, setStatus] = useState("Offline");

  const [tripType, setTripType] = useState("morning");

  const [latitude, setLatitude] = useState("");

  const [longitude, setLongitude] = useState("");

  const [speed, setSpeed] = useState(0);

  const watchId = useRef(null);
  const intervalId = useRef(null);

  const latestLocation = useRef({
    latitude: null,
    longitude: null,
    speed: 0,
  });

  const startJourney = () => {
    console.log("startJourney called - simulationMode:", simulationMode, "tripType:", tripType);
    
    // Save tripType to localStorage so Dashboard can use it in simulation mode
    localStorage.setItem('currentTripType', tripType);
    
    if (!simulationMode && !navigator.geolocation) {
      alert("Geolocation is not supported");
      return;
    }

    setStatus("Online");

    if (simulationMode) {
      // In simulation mode, don't use GPS - just set a flag
      console.log("Simulation mode started - no GPS used");
    } else {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const spd = position.coords.speed || 0;

          setLatitude(lat);
          setLongitude(lng);
          setSpeed(spd);

          latestLocation.current = {
            latitude: lat,
            longitude: lng,
            speed: spd,
          };
        },
        (error) => {
          console.log(error);
          alert("Unable to fetch location.");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
        }
      );
    }

    intervalId.current = setInterval(async () => {
      try {
        // Only send to backend if NOT in simulation mode
        if (!simulationMode) {
          await axios.post(`${BACKEND_URL}/bus/location`, {
            busId: 1,
            tripType: tripType,
            latitude: latestLocation.current.latitude,
            longitude: latestLocation.current.longitude,
            speed: latestLocation.current.speed,
          });
          console.log("Location Sent");
        } else {
          console.log("Simulation mode - skipping backend update");
        }
      } catch (err) {
        console.log(err);
      }
    }, 10000);
  };

  const stopJourney = () => {
    setStatus("Offline");

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    if (intervalId.current !== null) {
      clearInterval(intervalId.current);
    }
  };

  return (
    <div>

      <h2>Driver Dashboard</h2>

      <h3>Status : {status}</h3>

      <br />

      <label>Mode</label>

      <br />

      <select
        value={simulationMode ? "simulation" : "realtime"}
        onChange={(e) => setSimulationMode(e.target.value === "simulation")}
        disabled={status === "Online"}
      >
        <option value="realtime">Real-Time (GPS)</option>
        <option value="simulation">Simulation Mode (Testing)</option>
      </select>

      <br />
      <br />

      <label>Select Trip</label>

      <br />

      <select
        value={tripType}
        onChange={(e) => {
          setTripType(e.target.value);
          // Save to localStorage immediately when changed
          localStorage.setItem('currentTripType', e.target.value);
        }}
        disabled={status === "Online"}
      >
        <option value="morning">Home → College</option>

        <option value="evening">College → Home</option>
      </select>

      <br />
      <br />

      {!simulationMode && (
        <>
          <p>
            <strong>Latitude:</strong> {latitude}
          </p>

          <p>
            <strong>Longitude:</strong> {longitude}
          </p>

          <p>
            <strong>Speed:</strong> {speed} km/h
          </p>
        </>
      )}

      {simulationMode && (
        <p style={{ color: "#4CAF50", fontWeight: "bold" }}>
          Simulation Mode Active - Virtual bus will move through stops automatically
        </p>
      )}

      <button onClick={startJourney} disabled={status === "Online"}>
        Start Journey
      </button>

      <button onClick={stopJourney} disabled={status === "Offline"}>
        Stop Journey
      </button>

    </div>
  );
}

export default Driver;