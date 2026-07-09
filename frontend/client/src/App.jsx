import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Driver from "./Driver";

function App() {
  const [page, setPage] = useState('register');
  const [user, setUser] = useState({
    email: "",
    password: ""
  });
  const [simulationMode, setSimulationMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check URL parameters and localStorage on app load
  useEffect(() => {
    // Load simulationMode from localStorage if available
    const savedSimulationMode = localStorage.getItem('simulationMode');
    if (savedSimulationMode !== null) {
      setSimulationMode(savedSimulationMode === 'true');
    }
    
    const driverParam = searchParams.get('driver');
    
    // If driver parameter is present (any truthy value), go directly to driver page
    // This works for both localhost and Netlify deployment
    if (driverParam === 'true' || driverParam === '1') {
      setPage('driver');
      return;
    }

    const savedUser = localStorage.getItem('user');
    const savedPage = localStorage.getItem('page');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      if (savedPage === 'dashboard') {
        setPage('dashboard');
      }
    }
  }, [searchParams]);

  // Save user and page to localStorage whenever they change
  useEffect(() => {
    if (user && user.email) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    if (page === 'dashboard') {
      localStorage.setItem('page', page);
    }
    // Save simulationMode to localStorage
    localStorage.setItem('simulationMode', simulationMode.toString());
  }, [user, page, simulationMode]);

  // Clear localStorage on logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('page');
    setUser({ email: "", password: "" });
    setPage('login');
  };

  return (
    <div>
      {
        page === 'register'
          ?
          <Register setPage={setPage} setUser={setUser} />
          :
          page === "login"
            ?
            <Login
              setPage={setPage}
              setUser={setUser}
            />
            :
            page === "driver"
              ?
              <Driver 
                setPage={setPage} 
                user={user} 
                simulationMode={simulationMode}
                setSimulationMode={setSimulationMode}
              />
              :
              <Dashboard
                setPage={setPage}
                user={user}
                onLogout={handleLogout}
                simulationMode={simulationMode}
              />
      }
    </div>
  );
}

export default App;