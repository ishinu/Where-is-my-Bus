import { useState } from "react";
import "./Register.css";

// Use environment variable for backend URL, fallback to localhost for development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function Register({ setPage }) {
    const [formData, setFormData] = useState({
        name: "",
        enrollment: "",
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Password validation
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            setError("Password must be at least 8 characters with a mix of letters, numbers & symbols");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                alert("Registration Successful!");
                setPage("login");
            } else {
                setError(data.message || "Registration failed");
            }
        } catch (err) {
            setError("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <div className="register-header">
                    <div className="bus-icon">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" fill="#4CAF50"/>
                        </svg>
                    </div>
                    <h1 className="register-title">VIER Bus Tracker</h1>
                    <p className="register-subtitle">Create your account</p>
                </div>

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="enrollment">Enrollment Number</label>
                        <input
                            type="text"
                            id="enrollment"
                            name="enrollment"
                            value={formData.enrollment}
                            onChange={handleChange}
                            placeholder="Enter your enrollment number"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                            required
                        />
                        <p className="password-hint">Password must be at least 8 characters with a mix of letters, numbers & symbols</p>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="register-btn" disabled={loading}>
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <div className="register-footer">
                    <p>Already have an account? <span className="login-link" onClick={() => setPage("login")}>Sign in</span></p>
                </div>
            </div>

            <div className="background-decoration">
                <div className="city-skyline"></div>
                <div className="decorative-bus"></div>
                <div className="dots-top-left"></div>
                <div className="dots-top-right"></div>
                <div className="dots-bottom-left"></div>
                <div className="dots-bottom-right"></div>
            </div>
        </div>
    );
}

export default Register;
