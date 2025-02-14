// Event Source for real-time updates
const eventSource = new EventSource('https://ak-sable.vercel.app/events');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    updateDisplayFromData(data);
};

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateDisplayFromData(data) {
    // Update Court 1
    document.getElementById('court1displayTeam1').textContent = data.court1?.team1 || 'Team A';
    document.getElementById('court1displayTeam2').textContent = data.court1?.team2 || 'Team B';
    document.getElementById('court1serveStatus').textContent =
        data.court1?.servingTeam === 'team1' ? 'Current Serve' : 'Receiving';
    document.getElementById('court1StatusBadge').textContent = (data.court1?.status || 'PAUSED').toUpperCase();
    document.getElementById('court1StatusBadge').className = `match-status-badge ${data.court1?.status || 'paused'}`;
    document.getElementById('court1TimerDisplay').textContent = formatTime(data.court1?.timeRemaining || 600);

    // Update Court 2
    document.getElementById('court2displayTeam1').textContent = data.court2?.team1 || 'Team C';
    document.getElementById('court2displayTeam2').textContent = data.court2?.team2 || 'Team D';
    document.getElementById('court2serveStatus').textContent =
        data.court2?.servingTeam === 'team1' ? 'Current Serve' : 'Receiving';
    document.getElementById('court2StatusBadge').textContent = (data.court2?.status || 'PAUSED').toUpperCase();
    document.getElementById('court2StatusBadge').className = `match-status-badge ${data.court2?.status || 'paused'}`;
    document.getElementById('court2TimerDisplay').textContent = formatTime(data.court2?.timeRemaining || 600);

    // Update Next Match
    document.getElementById('nextMatchDisplay').textContent = data.nextMatch || 'Upcoming Match';

    // Update Schedule
    updateUpcomingList(data.upcoming || []);
}

function updateUpcomingList(upcoming) {
    const upcomingList = document.getElementById('upcomingList');
    upcomingList.innerHTML = '';

    const matchesByCourt = {1: [], 2: []};
    upcoming.forEach(match => {
        const court = match.court || '1';
        matchesByCourt[court].push(match);
    });

    for (const [courtNumber, matches] of Object.entries(matchesByCourt)) {
        const section = document.createElement('div');
        section.className = 'court-section';
        section.innerHTML = `
            <div class="court-number">Court ${courtNumber}</div>
            <ul class="match-list"></ul>
        `;

        const list = section.querySelector('.match-list');
        matches.forEach(match => {
            const li = document.createElement('li');
            li.className = 'match-item';
            li.innerHTML = `
                <span>${match.team1 || 'Team A'} vs ${match.team2 || 'Team B'}</span>
                <span>${match.time || 'TBD'}</span>
            `;
            list.appendChild(li);
        });
        upcomingList.appendChild(section);
    }
}

// Initial data load
fetch('/match-data')
    .then(response => response.json())
    .then(data => {
        updateDisplayFromData(data);
    })
    .catch(error => console.error('Error loading data:', error));
