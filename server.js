const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// CORS Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://pckle4.github.io'); // Replace with your GitHub Pages URL
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Respond to preflight requests
    }
    next();
});

// Serve static files from the "public" folder
app.use(express.static('public'));

// Match state storage
let matchState = {
    court1: {
        team1: 'Team A',
        team2: 'Team B',
        servingTeam: 'team1',
        status: 'paused',
        timeRemaining: 600,
        lastUpdateTime: Date.now()
    },
    court2: {
        team1: 'Team C',
        team2: 'Team D',
        servingTeam: 'team1',
        status: 'paused',
        timeRemaining: 600,
        lastUpdateTime: Date.now()
    },
    nextMatch: 'Upcoming Match',
    upcoming: []
};

// SSE client connections
let clients = [];

// Timer update function
function updateTimers() {
    const currentTime = Date.now();
    ['court1', 'court2'].forEach(court => {
        if (matchState[court].status === 'live') {
            const timePassed = Math.floor((currentTime - matchState[court].lastUpdateTime) / 1000);
            matchState[court].timeRemaining = Math.max(0, matchState[court].timeRemaining - timePassed);
        }
        matchState[court].lastUpdateTime = currentTime;
    });
}

// SSE endpoint
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);
    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });
    // Send initial state
    sendEventToClient(newClient, matchState);
});

function sendEventToClient(client, data) {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastEvent(data) {
    updateTimers();
    clients.forEach(client => sendEventToClient(client, matchState));
}

// Routes
app.get('/match-data', (req, res) => {
    updateTimers();
    res.json(matchState);
});

app.post('/update-match', (req, res) => {
    const newState = req.body;
    ['court1', 'court2'].forEach(court => {
        if (newState[court]) {
            const wasLive = matchState[court].status === 'live';
            const willBeLive = newState[court].status === 'live';
            const currentStatus = matchState[court].status;
            const newStatus = newState[court].status;
            if (newStatus === 'completed') {
                newState[court].timeRemaining = 600; // Reset only when explicitly completed
                newState[court].lastUpdateTime = Date.now();
            } else {
                newState[court].timeRemaining = matchState[court].timeRemaining;
                newState[court].lastUpdateTime = Date.now();
            }
            newState[court].status = newStatus;
        }
    });
    matchState = {
        ...matchState,
        ...newState
    };
    broadcastEvent(matchState);
    res.json({ status: 'success' });
});

// Admin route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Root route
app.get('/', (req, res) => {
    res.send('<h1>Welcome to the Backend Server</h1>');
});

// Catch-all route
app.all('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Regular interval updates for connected clients
setInterval(() => {
    if (clients.length > 0) {
        broadcastEvent(matchState);
    }
}, 1000);

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Export the app for Vercel
module.exports = app;
