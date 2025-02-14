// Configuration for API endpoints
const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-vercel-app-url.vercel.app' // Replace with your Vercel deployment URL
    : 'http://localhost:8000',
  
  endpoints: {
    events: '/events',
    matchData: '/match-data',
    updateMatch: '/update-match',
    admin: '/admin'
  }
};

export default config;
