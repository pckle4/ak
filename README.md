# Pickleball Match Tracker

A real-time pickleball match tracking application with live timer updates and match management capabilities.

## Project Structure
```
├── frontend/            # Frontend code (GitHub Pages)
│   ├── public/         # Static assets
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/            # Backend code (Vercel)
│   ├── server.js
│   └── vercel.json
```

## Local Development

### Prerequisites
- Node.js v18 or higher
- VSCode (recommended)

### Setup Steps

1. Clone the repository:
```bash
git clone <your-repo-url>
cd pickleball-match-tracker
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Environment Setup:
Create a `.env` file in the backend directory:
```env
PORT=8000
```

4. Start the development server:
```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Serve frontend
cd frontend
npm run dev
```

5. Open in browser:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Deployment

### Backend (Vercel)
1. Create a new project on Vercel
2. Link your GitHub repository
3. Configure the following settings:
   - Build Command: `npm install`
   - Output Directory: `backend`
   - Install Command: `npm install`
   - Environment Variables: Copy from `.env`

### Frontend (GitHub Pages)
1. Enable GitHub Pages in your repository settings
2. Set the source branch to `gh-pages` and folder to `/docs` or `/(root)`
3. Update the API endpoint in `frontend/script.js` to point to your Vercel backend

## Development in VSCode

Recommended VSCode extensions:
- Live Server
- ESLint
- Prettier

VSCode settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "liveServer.settings.port": 3000
}
```
