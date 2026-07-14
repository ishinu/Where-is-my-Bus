const express = require("express");
const cors = require("cors");
const session = require("express-session");

require("dotenv").config();


const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);
const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.static("public",{
    index : false
}));

app.use(session({
    secret: "123456",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    }
}));

app.use(cors({
    origin: [ 
        "http://localhost:5173",
        "https://whereismycollegebus.netlify.app"
    ],
    credentials: true
}));
app.use(express.json());

app.post("/register", async (req, res) => {

    const { name, enrollment, email, password } = req.body;

    try {

        const { data, error } = await supabase
            .from("students")
            .insert([
                {
                    name,
                    enrollment,
                    email,
                    password
                }
            ]);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(201).json({
            success: true,
            message: "Registration Successful",
            data
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    try {

        const { data, error } = await supabase
            .from("students")
            .select("*")
            .eq("email", email)
            .single();

        if (error || !data) {
            return res.status(401).json({
                success: false,
                message: "Invalid Email or Password"
            });
        }

        if (data.password !== password) {
            return res.status(401).json({
                success: false,
                message: "Invalid Email or Password"
            });
        }

        res.status(200).json({
            success: true,
            message: "Login Successful",
            user: {
                id: data.id,
                name: data.name,
                enrollment: data.enrollment,
                email: data.email
            }
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

app.get("/bus/location/:busId", async (req, res) => {

    const { busId } = req.params;

    try {

        const { data, error } = await supabase
            .from("bus_locations")
            .select("*")
            .eq("bus_id", busId)
            .order("updated_at", { ascending: false }) // newest first
            .limit(1);

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Bus location not found"
            });
        }

        res.json({
            success: true,
            location: data[0]
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

app.post("/bus/location", async (req, res) => {

    console.log("BODY RECEIVED");
    console.log(req.body);
    
    const {
        busId,
        tripType,
        latitude,
        longitude,
        speed,
    } = req.body;

    try {

        const { data, error } = await supabase
            .from("bus_locations")
            .upsert({
                bus_id: busId,
                tripType,
                latitude,
                longitude,
                speed,
                updated_at: new Date(),
            });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            message: "Location Updated"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


app.get("/bus/stops/:busId", async (req, res) => {

    const { busId } = req.params;

    try {

        const { data, error } = await supabase
            .from("bus_stops")
            .select("*")
            .eq("bus_id", busId)
            .order("stop_order", { ascending: true });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            stops: data
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// app.post("/bus/start", async (req, res) => {

//     const { busId, tripType } = req.body;

//     const { error } = await supabase
//         .from("bus_status")
//         .update({
//             journey_active: true,
//             trip_type: tripType,
//             updated_at: new Date()
//         })
//         .eq("bus_id", busId);

//     if (error)
//         return res.status(500).json(error);

//     res.json({
//         success: true
//     });

// });

app.post("/bus/start", async (req, res) => {

    const { busId, tripType } = req.body;

    const { error } = await supabase
        .from("bus_status")
        .update({
            journey_active: true,
            trip_type: tripType,
            journey_started_at: new Date().toISOString(), // <-- ADD THIS LINE
            updated_at: new Date().toISOString()
        })
        .eq("bus_id", busId);

    if (error)
        return res.status(500).json(error);

    res.json({
        success: true
    });

});

// app.post("/bus/stop", async (req, res) => {

//     const { busId } = req.body;

//     const { error } = await supabase
//         .from("bus_status")
//         .update({
//             journey_active: false,
//             updated_at: new Date()
//         })
//         .eq("bus_id", busId);

//     if (error)
//         return res.status(500).json(error);

//     res.json({
//         success: true
//     });

// });

app.post("/bus/stop", async (req, res) => {

    const { busId } = req.body;

    const { error } = await supabase
        .from("bus_status")
        .update({
            journey_active: false,
            updated_at: new Date().toISOString()
        })
        .eq("bus_id", busId);

    if (error)
        return res.status(500).json(error);

    res.json({
        success: true
    });

});

app.get("/bus/status/:busId", async (req, res) => {

    const { busId } = req.params;

    const { data, error } = await supabase
        .from("bus_status")
        .select("*")
        .eq("bus_id", busId)
        .single();

    if (error)
        return res.status(500).json(error);

    res.json({
        success: true,
        status: data
    });

});

app.get("/", (req, res) => {
  res.send("Hello World!");
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});

 