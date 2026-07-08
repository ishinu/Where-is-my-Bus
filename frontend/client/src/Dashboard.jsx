import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./Dashboard.css";

// Use environment variable for backend URL, fallback to localhost for development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Real stops along Manjalpur to Tarsali road (Vadodara, Gujarat)
// These will be populated dynamically from OSRM route data
const BUS_STOPS = [];

const routes = {

    morning: [

        {
            name: "Ganga Sagar",
            lat: 22.256082,
            lng: 73.211874,
            distanceFromStart: 0
        },

        {
            name: "Tarsali",
            lat: 22.256882,
            lng: 73.217215,
            distanceFromStart: 0.8
        },

        {
            name: "Bansal Mall",
            lat: 22.267546,
            lng: 73.224017,
            distanceFromStart: 1.8
        },

        {
            name: "Soma talav",
            lat: 22.279276,
            lng: 73.230331,
            distanceFromStart: 3.2
        },

        {
            name: "Parivar Char Rasta",
            lat: 22.293173,
            lng: 73.237562,
            distanceFromStart: 5.8
        },

        {
            name: "Vrundavan",
            lat: 22.300147,
            lng: 73.238099,
            distanceFromStart: 6.5
        },

        {
            name: "Sardar Estate",
            lat: 22.307656,
            lng: 73.237677,
            distanceFromStart: 7.8
        },

        {
            name: "Khodiyar Nagar",
            lat: 22.317923,
            lng: 73.226695,
            distanceFromStart: 9.2
        },

        {
            name: "Nikita Mam Stop",
            lat: 22.321274,
            lng: 73.222372,
            distanceFromStart: 10.3
        },

        {
            name: "Airport Circle",
            lat: 22.322369,
            lng: 73.216628,
            distanceFromStart: 10.9
        },

        {
            name: "Harni Lake Zone",
            lat: 22.334836,
            lng: 73.228992,
            distanceFromStart: 12.6
        },

        {
            name: "VIER College",
            lat: 22.404918,
            lng: 73.287756,
            distanceFromStart: 28.1
        }

    ],

    evening: [

        {
            name: "VIER College",
            lat: 22.404918,
            lng: 73.287756,
            distanceFromStart: 0
        },

        {
            name: "Harni Laken Zone",
            lat: 22.334836,
            lng: 73.228992,
            distanceFromStart: 15.1
        },

        {
            name: "Airport Circle",
            lat: 22.322369,
            lng: 73.216628,
            distanceFromStart: 16.6
        },

        {
            name: "Nikita Mam Stop",
            lat: 22.321274,
            lng: 73.222372,
            distanceFromStart: 17.2
        },

        {
            name: "Khodiyar Nagar",
            lat: 22.317923,
            lng: 73.226695,
            distanceFromStart: 18.4
        },

        {
            name: "Sardar Estate",
            lat: 22.307656,
            lng: 73.237677,
            distanceFromStart: 19.5
        },

        {
            name: "Vrundavan",
            lat: 22.300147,
            lng: 73.238099,
            distanceFromStart: 20.9
        },

        {
            name: "Parivar Char Rasta",
            lat: 22.293173,
            lng: 73.237562,
            distanceFromStart: 21.6
        },
        ,

        {
            name: "Soma talav",
            lat: 22.279276,
            lng: 73.230331,
            distanceFromStart: 23.1
        },

        {
            name: "Bansal Mall",
            lat: 22.267546,
            lng: 73.224017,
            distanceFromStart: 24.5
        },

        {
            name: "Tarsali",
            lat: 22.256882,
            lng: 73.217215,
            distanceFromStart: 25.8
        },
        
        {
            name: "Ganga Sagar",
            lat: 22.256082,
            lng: 73.211874,
            distanceFromStart: 26.5
        }

    ]

};

const BUS_ID = 1;

function Dashboard({ setPage, user, onLogout }) {
    const [busLocation, setBusLocation] = useState(null);
    const [journeyActive, setJourneyActive] = useState(false);
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default for mobile
    const [loading, setLoading] = useState(true);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [busStops, setBusStops] = useState([]);
    const [totalDistance, setTotalDistance] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [tripType, setTripType] = useState("morning"); // Default to morning
    const [animatedPosition, setAnimatedPosition] = useState([22.325, 73.190]);
    const markerRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [journeyStartTime, setJourneyStartTime] = useState(null);

    // Smooth animation for marker position
    useEffect(() => {
        if (busLocation && journeyActive) {
            const targetPosition = [busLocation.latitude, busLocation.longitude];
            
            // Cancel any ongoing animation
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            const startPosition = [...animatedPosition];
            const startTime = performance.now();
            const duration = 1000; // 1 second animation

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function for smooth animation
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                
                const newPosition = [
                    startPosition[0] + (targetPosition[0] - startPosition[0]) * easeOutCubic,
                    startPosition[1] + (targetPosition[1] - startPosition[1]) * easeOutCubic
                ];
                
                setAnimatedPosition(newPosition);
                
                if (progress < 1) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                }
            };

            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [busLocation, journeyActive]);

    // Initialize route based on tripType
    useEffect(() => {
        const selectedRoute = routes[tripType] || routes.morning;
        
        // Convert route stops to bus stops format without times initially
        const stops = selectedRoute.map((stop, index) => ({
            id: index + 1,
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng,
            distance: stop.distanceFromStart || 0,
            arrival: "--:--",
            departure: "--:--"
        }));
        
        setBusStops(stops);
        
        // Calculate route coordinates for polyline
        const coordinates = selectedRoute.map(stop => [stop.lat, stop.lng]);
        setRouteCoordinates(coordinates);
        
        // Calculate total distance from the last stop's distanceFromStart
        const lastStopDistance = stops.length > 0 ? stops[stops.length - 1].distance : 0;
        setTotalDistance(lastStopDistance);
    }, [tripType]);

    // Track journey start time and calculate dynamic arrival times
    useEffect(() => {
        if (journeyActive && !journeyStartTime && busLocation) {
            // Journey just started - record start time
            setJourneyStartTime(new Date());
        } else if (!journeyActive && journeyStartTime) {
            // Journey ended - reset start time
            setJourneyStartTime(null);
        }
    }, [journeyActive, journeyStartTime, busLocation]);

    // Recalculate arrival times dynamically based on current speed and journey start time
    useEffect(() => {
        if (journeyStartTime && busStops.length > 0) {
            const currentSpeed = busLocation?.speed || 0;
            const speedKmh = currentSpeed > 0 ? currentSpeed * 3.6 : 30; // Use actual speed or default 30 km/h
            
            const updatedStops = busStops.map((stop, index) => {
                const distanceFromStart = stop.distance;
                
                // Calculate time to reach this stop (in hours)
                const timeToReach = distanceFromStart / speedKmh;
                const timeInMinutes = Math.round(timeToReach * 60);
                
                // Calculate arrival time from journey start
                const arrivalTime = new Date(journeyStartTime);
                arrivalTime.setMinutes(arrivalTime.getMinutes() + timeInMinutes);
                
                // Calculate departure time (2 minutes after arrival, except for last stop)
                const departureTime = index === busStops.length - 1 
                    ? arrivalTime 
                    : new Date(arrivalTime.getTime() + 2 * 60000); // Add 2 minutes
                
                return {
                    ...stop,
                    arrival: arrivalTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                    }),
                    departure: departureTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                    })
                };
            });
            
            setBusStops(updatedStops);
        }
    }, [journeyStartTime, busLocation?.speed, busStops]);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
            // Open sidebar on desktop, close on mobile
            if (window.innerWidth > 768) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch bus location and check journey status
    useEffect(() => {
        const fetchBusLocation = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/bus/location/${BUS_ID}`);
                const data = await response.json();

                if (data.success && data.location) {
                    setBusLocation(data.location);
                    
                    // Update tripType from backend if available
                    if (data.location.tripType && data.location.tripType !== tripType) {
                        setTripType(data.location.tripType);
                    }
                    
                    // Check if journey is active by checking if location was updated recently (within last 30 seconds)
                    const lastUpdate = new Date(data.location.updated_at);
                    const now = new Date();
                    const timeDiff = (now - lastUpdate) / 1000; // in seconds
                    
                    setJourneyActive(timeDiff < 30);
                } else {
                    setJourneyActive(false);
                    setBusLocation(null);
                }
            } catch (err) {
                console.error("Error fetching bus location:", err);
                setJourneyActive(false);
            } finally {
                setLoading(false);
            }
        };

        fetchBusLocation();
        
        // Poll every 10 seconds for real-time updates (as requested)
        const interval = setInterval(fetchBusLocation, 10000);

        return () => clearInterval(interval);
    }, [tripType]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000; // Return distance in meters
    };

    // Calculate current stop based on geofencing
    useEffect(() => {
        if (busLocation && journeyActive && busStops.length > 0) {
            const nextStopIndex = currentStopIndex + 1;
            
            // Only check if there's a next stop
            if (nextStopIndex < busStops.length) {
                const nextStop = busStops[nextStopIndex];
                const distanceToNextStop = calculateDistance(
                    busLocation.latitude,
                    busLocation.longitude,
                    nextStop.lat,
                    nextStop.lng
                );
                
                // If bus is within 100 meters of next stop, advance the timeline
                if (distanceToNextStop <= 100) {
                    setCurrentStopIndex(nextStopIndex);
                }
            }
        }
    }, [busLocation, journeyActive, busStops, currentStopIndex]);

    const calculateETA = (distance, speed) => {
        if (!speed || speed === 0) return "--";
        const timeInHours = distance / (speed * 3.6); // Convert speed from m/s to km/h
        const timeInMinutes = Math.round(timeInHours * 60);
        return `${timeInMinutes} min`;
    };

    const formatStopTime = (time) => {
        if (!time || time === "--:--") return "--:--";
        const [hours, minutes] = time.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const getStopMinutesUntil = (stop, index) => {
        if (index <= currentStopIndex) return null;
        const currentDistance = busStops[currentStopIndex]?.distance || 0;
        const distanceToStop = stop.distance - currentDistance;
        const speed = busLocation?.speed || 0;
        return calculateETA(distanceToStop, speed);
    };

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            setPage("login");
        }
    };

    // Sidebar Component
    const Sidebar = () => (
        <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" fill="#4CAF50"/>
                    </svg>
                </div>
                <h2>VIE Bus Tracker</h2>
            </div>
            <nav className="sidebar-nav">
                <button className="nav-item active">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4CAF50"/>
                    </svg>
                    Live Tracking
                </button>
            </nav>
            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="user-details">
                        <p className="user-name">{user?.name || "User"}</p>
                        <p className="user-email">{user?.email || ""}</p>
                    </div>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="#666"/>
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    );

    // BusInfoCard Component
    const BusInfoCard = () => {
        const currentStop = busStops[currentStopIndex] || busStops[0];
        const lastStop = currentStopIndex > 0 ? busStops[currentStopIndex - 1] : null;
        const nextStop = busStops[currentStopIndex + 1] || null;
        const lastStopName = lastStop ? lastStop.name : "Starting";
        const nextStopName = nextStop ? nextStop.name : "Destination";
        const distanceLeft = totalDistance - (busLocation && busStops[currentStopIndex] ? 
            busStops[currentStopIndex].distance : 0);
        const speed = busLocation?.speed || 0;
        const eta = calculateETA(distanceLeft, speed);
        const speedDisplay = speed > 0 ? `${(speed * 3.6).toFixed(1)} km/h` : "0 km/h";
        const lastUpdated = busLocation?.updated_at
            ? new Date(busLocation.updated_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            })
            : "--:--:--";

        return (
            <div className="bus-info-card">
                <div className="info-card-header">
                    <h3>Bus Information</h3>
                    <div className={`journey-status ${journeyActive ? "active" : "inactive"}`}>
                        <span className="status-dot"></span>
                        <span className="journey-status-desktop">
                            {journeyActive ? "Journey Active" : "Waiting for Driver"}
                        </span>
                        <span className="journey-status-mobile">
                            {journeyActive ? "Moving" : "Waiting"}
                        </span>
                    </div>
                </div>
                <div className="info-grid">
                    <div className="info-item">
                        <div className="info-icon info-icon-location" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4CAF50"/>
                            </svg>
                        </div>
                        <div className="info-item-body">
                            <div className="info-label">Current Stop</div>
                            <div className="info-value">{currentStop.name}</div>
                        </div>
                    </div>
                    <div className="info-item info-item-desktop-only">
                        <div className="info-item-body">
                            <div className="info-label">Last Stop</div>
                            <div className="info-value">{lastStopName}</div>
                        </div>
                    </div>
                    <div className="info-item">
                        <div className="info-icon info-icon-next" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" fill="#4CAF50"/>
                            </svg>
                        </div>
                        <div className="info-item-body">
                            <div className="info-label">Next Stop</div>
                            <div className="info-value">{nextStopName}</div>
                        </div>
                    </div>
                    <div className="info-item info-item-desktop-only">
                        <div className="info-item-body">
                            <div className="info-label">ETA</div>
                            <div className="info-value">{eta}</div>
                        </div>
                    </div>
                    <div className="info-item">
                        <div className="info-icon info-icon-speed" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="#4CAF50"/>
                            </svg>
                        </div>
                        <div className="info-item-body">
                            <div className="info-label">Speed</div>
                            <div className="info-value">{speedDisplay}</div>
                        </div>
                    </div>
                    <div className="info-item">
                        <div className="info-icon info-icon-distance" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" fill="#4CAF50"/>
                            </svg>
                        </div>
                        <div className="info-item-body">
                            <div className="info-label">Distance Left</div>
                            <div className="info-value">{distanceLeft.toFixed(1)} km</div>
                        </div>
                    </div>
                </div>
                <div className="bus-info-footer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="#888"/>
                    </svg>
                    <span>Last updated: {lastUpdated}</span>
                </div>
            </div>
        );
    };

    // RouteTimeline Component
    const RouteTimeline = () => (
        <div className="route-timeline">
            <h3>Route Timeline</h3>
            <div className="timeline-container">
                {busStops.map((stop, index) => (
                    <div 
                        key={stop.id} 
                        className={`timeline-item ${index === currentStopIndex ? "current" : ""} ${index < currentStopIndex ? "passed" : ""} ${index > currentStopIndex ? "upcoming" : ""}`}
                    >
                        <div className="timeline-marker">
                            {index === currentStopIndex && !isMobile && <div className="pulse-ring"></div>}
                            {isMobile ? (
                                <>
                                    {index < currentStopIndex && (
                                        <div className="marker-check">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
                                            </svg>
                                        </div>
                                    )}
                                    {index === currentStopIndex && (
                                        <div className="marker-bus">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" fill="white"/>
                                            </svg>
                                        </div>
                                    )}
                                    {index > currentStopIndex && (
                                        <div className="marker-dot marker-dot-upcoming"></div>
                                    )}
                                </>
                            ) : (
                                <div className="marker-dot"></div>
                            )}
                        </div>
                        <div className="timeline-content">
                            <div className="stop-name">{stop.name}</div>
                            <div className="stop-details">
                                <span className="stop-distance">{stop.distance} km</span>
                                <span className="stop-time">{isMobile ? formatStopTime(stop.arrival) : stop.arrival}</span>
                            </div>
                        </div>
                        {isMobile && (
                            <div className="timeline-badge">
                                {index < currentStopIndex && (
                                    <span className="badge badge-departed">Departed</span>
                                )}
                                {index === currentStopIndex && (
                                    <span className="badge badge-current">Current Stop</span>
                                )}
                                {index > currentStopIndex && (
                                    <span className="badge badge-eta">{getStopMinutesUntil(stop, index)}</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="timeline-footer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="#4CAF50"/>
                </svg>
                <span>All timings are estimated</span>
            </div>
        </div>
    );

    // BusMap Component
    const BusMap = () => {
        const center = busLocation ? [busLocation.latitude, busLocation.longitude] : [22.325, 73.190];
        const currentStop = busStops[currentStopIndex] || busStops[0];
        const nextStop = busStops[currentStopIndex + 1] || null;
        const nextStopName = nextStop ? nextStop.name : "Destination";

        // Use OSRM route coordinates if available, otherwise fallback to stop coordinates
        const routePoints = routeCoordinates.length > 0 ? routeCoordinates : busStops.map(stop => [stop.lat, stop.lng]);

        // Custom bus icon
        const busIcon = L.divIcon({
            className: "custom-bus-marker",
            html: `<div class="bus-icon-wrapper">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#4CAF50">
                    <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
                </svg>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });

        return (
            <div className="bus-map">
                <MapContainer 
                    center={center} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                    bounds={routePoints.length > 0 ? routePoints : busStops.map(stop => [stop.lat, stop.lng])}
                    boundsOptions={{ padding: [50, 50] }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Bus route polyline - dark and bold using OSRM data */}
                    <Polyline 
                        positions={routePoints}
                        color="#2E7D32"
                        weight={6}
                        opacity={1}
                    />
                    
                    {/* Bus stops markers */}
                    {busStops.map((stop, index) => (
                        <CircleMarker
                            key={stop.id}
                            center={[stop.lat, stop.lng]}
                            radius={index === currentStopIndex ? 12 : 8}
                            fillColor={index === currentStopIndex ? "#4CAF50" : index < currentStopIndex ? "#888" : "#2196F3"}
                            color="#fff"
                            weight={2}
                            opacity={1}
                        >
                            <Popup>
                                <div className="popup-content">
                                    <strong>{stop.name}</strong>
                                    <br/>
                                    <small>Distance: {stop.distance} km</small>
                                    <br/>
                                    <small>Arrival: {stop.arrival}</small>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                    
                    {/* Current bus location marker with animation */}
                    {busLocation && journeyActive && (
                        <>
                            <Marker 
                                ref={markerRef}
                                position={animatedPosition}
                                icon={busIcon}
                            >
                                {/* Click popup with detailed bus info */}
                                <Popup>
                                    <div className="bus-popup-content">
                                        <div className="bus-popup-header">
                                            <strong>Bus #{BUS_ID}</strong>
                                        </div>
                                        <div className="bus-popup-info">
                                            <div><strong>Current Stop:</strong> {currentStop.name}</div>
                                            <div><strong>Speed:</strong> {busLocation.speed ? (busLocation.speed * 3.6).toFixed(1) : 0} km/h</div>
                                            <div><strong>Last Updated:</strong> {new Date(busLocation.updated_at).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                            
                            {/* Floating info overlay - positioned using CSS */}
                            <div 
                                className="floating-bus-info-overlay"
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    bottom: '80px',
                                    transform: 'translateX(-50%)',
                                    zIndex: 1000,
                                    pointerEvents: 'none'
                                }}
                            >
                                <div className="floating-bus-info">
                                    <div className="floating-info-header">
                                        <span className="bus-number">Bus #{BUS_ID}</span>
                                        <span className={`live-status ${journeyActive ? 'live' : ''}`}>
                                            {journeyActive ? '● LIVE' : '○ OFFLINE'}
                                        </span>
                                    </div>
                                    <div className="floating-info-details">
                                        <div className="info-row">
                                            <span className="info-label">Current:</span>
                                            <span className="info-value">{currentStop.name}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Next:</span>
                                            <span className="info-value">{nextStopName}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Speed:</span>
                                            <span className="info-value">{busLocation.speed ? (busLocation.speed * 3.6).toFixed(1) : 0} km/h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </MapContainer>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className={`dashboard ${isMobile ? "dashboard-mobile" : ""}`}>
            <Sidebar />
            {isMobile && sidebarOpen && (
                <div 
                    className="sidebar-overlay active" 
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
            <div className={`dashboard-main ${sidebarOpen ? "" : "expanded"}`}>
                <header className="mobile-header">
                    <div className="mobile-header-brand">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" fill="#4CAF50"/>
                        </svg>
                        <h2>VIE Bus Tracker</h2>
                    </div>
                    <button className="mobile-notification-btn" type="button" aria-label="Notifications">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill="#4CAF50"/>
                        </svg>
                        <span className="notification-dot"></span>
                    </button>
                </header>

                <div className="dashboard-header">
                    <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="#333"/>
                        </svg>
                    </button>
                    <h1>Live Bus Tracking</h1>
                </div>

                <div className="mobile-section-header">
                    <h2>Live Tracking</h2>
                    <span className="mobile-live-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 3C7.03 3 3 7.03 3 12h2c0-3.87 3.13-7 7-7s7 3.13 7 7h2c0-4.97-4.03-9-9-9zm0 4c-2.76 0-5 2.24-5 5h2c0-1.66 1.34-3 3-3s3 1.34 3 3h2c0-2.76-2.24-5-5-5zm0 4c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" fill="#4CAF50"/>
                        </svg>
                        Live
                    </span>
                </div>
                
                <div className="dashboard-content">
                    <div className="dashboard-grid">
                        <div className="map-section">
                            <BusMap />
                        </div>
                        <div className="info-section">
                            <BusInfoCard />
                            <RouteTimeline />
                        </div>
                    </div>
                </div>

                <nav className="mobile-bottom-nav" aria-label="Main navigation">
                    <button className="mobile-nav-item active" type="button">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4CAF50"/>
                        </svg>
                        <span>Live Tracking</span>
                    </button>
                    <button className="mobile-nav-item" type="button">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" fill="#999"/>
                        </svg>
                        <span>History</span>
                    </button>
                    <button className="mobile-nav-item" type="button">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#999"/>
                        </svg>
                        <span>Profile</span>
                    </button>
                </nav>
            </div>
        </div>
    );
}

export default Dashboard;
