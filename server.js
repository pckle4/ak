const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// CORS Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://pckle4.github.io'); // Allow your GitHub Pages URL
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve static files
app.use(express.static('public'));

// Match state storage (in-memory)
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
let clients = new Set();

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
    res.setHeader('Access-Control-Allow-Origin', 'https://pckle4.github.io');

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };

    clients.add(newClient); // Add client to the Set
    req.on('close', () => {
        clients.delete(newClient); // Remove client when connection closes
    });

    sendEventToClient(newClient, matchState); // Send initial state
});

function sendEventToClient(client, data) {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
}

let previousState = null;

function broadcastEvent(newState) {
    updateTimers(); // Update timers before broadcasting

    // Only broadcast if the state has changed
    if (JSON.stringify(newState) !== JSON.stringify(previousState)) {
        previousState = { ...newState }; // Deep copy the new state
        for (const client of clients) {
            sendEventToClient(client, newState);
        }
    }
}

// Routes
app.get('/', (req, res) => {
    res.send('<h1>Welcome to the Backend Server</h1>');
});

app.get('/match-data', (req, res) => {
    updateTimers();
    res.json(matchState);
});

app.post('/update-match', (req, res) => {
    try {
        const newState = req.body;

        ['court1', 'court2'].forEach(court => {
            if (newState[court]) {
                if (newState[court].status) {
                    if (newState[court].status === 'completed') {
                        matchState[court].timeRemaining = 600;
                    }
                    matchState[court].status = newState[court].status;
                }
                if (newState[court].team1) matchState[court].team1 = newState[court].team1;
                if (newState[court].team2) matchState[court].team2 = newState[court].team2;
                if (newState[court].servingTeam) matchState[court].servingTeam = newState[court].servingTeam;
                matchState[court].lastUpdateTime = Date.now();
            }
        });

        if (newState.upcoming) matchState.upcoming = newState.upcoming;
        if (newState.nextMatch) matchState.nextMatch = newState.nextMatch;

        broadcastEvent(matchState); // Broadcast updated state to all clients

        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error updating match state:', error);
        res.status(500).json({ error: 'Failed to update match state' });
    }
});

// Admin route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all route
app.all('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Regular interval updates for connected clients
setInterval(() => {
    if (clients.size > 0) {
        broadcastEvent(matchState); // Periodically broadcast updates
    }
}, 1000);

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
