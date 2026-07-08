import { useState, useRef } from "react";
import axios from "axios";

// Backend URL
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function Driver() {
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
    if (!navigator.geolocation) {
      alert("Geolocation is not supported");
      return;
    }

    setStatus("Online");

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

    intervalId.current = setInterval(async () => {
      try {
        await axios.post(`${BACKEND_URL}/bus/location`, {
          busId: 1,
          tripType: tripType,
          latitude: latestLocation.current.latitude,
          longitude: latestLocation.current.longitude,
          speed: latestLocation.current.speed,
        });

        console.log("Location Sent");
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

      <label>Select Trip</label>

      <br />

      <select
        value={tripType}
        onChange={(e) => setTripType(e.target.value)}
        disabled={status === "Online"}
      >
        <option value="morning">Home → College</option>

        <option value="evening">College → Home</option>
      </select>

      <br />
      <br />

      <p>
        <strong>Latitude:</strong> {latitude}
      </p>

      <p>
        <strong>Longitude:</strong> {longitude}
      </p>

      <p>
        <strong>Speed:</strong> {speed} km/h
      </p>

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