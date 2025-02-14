const express = require('express');
const app = express();
const path = require('path');

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

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Timer update function
function updateTimers() {
    const currentTime = Date.now();

    ['court1', 'court2'].forEach(court => {
        if (matchState[court].status === 'live') {
            const timePassed = Math.floor((currentTime - matchState[court].lastUpdateTime) / 1000);
            matchState[court].timeRemaining = Math.max(0, matchState[court].timeRemaining - timePassed);
            // Status will only be changed through admin panel, not automatically
        }
        matchState[court].lastUpdateTime = currentTime;
    });
}

// SSE endpoint
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

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

    // Update match state while preserving timer-related fields
    ['court1', 'court2'].forEach(court => {
        if (newState[court]) {
            const wasLive = matchState[court].status === 'live';
            const willBeLive = newState[court].status === 'live';
            const currentStatus = matchState[court].status;
            const newStatus = newState[court].status;

            // Preserve timer state for all status changes except when explicitly completed
            if (newStatus === 'completed') {
                newState[court].timeRemaining = 600; // Reset only when explicitly completed
                newState[court].lastUpdateTime = Date.now();
            } else {
                // Preserve existing time for all other status changes
                newState[court].timeRemaining = matchState[court].timeRemaining;
                newState[court].lastUpdateTime = Date.now();
            }

            // Update status
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