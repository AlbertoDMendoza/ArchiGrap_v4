#!/bin/bash

# ArchiGraph v4 Startup Script
# Starts both backend and frontend servers

cd "$(dirname "$0")"

echo "🚀 Starting ArchiGraph v4..."
echo ""

# Kill any existing processes on our ports
echo "Cleaning up existing processes..."
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start backend
echo "📦 Starting backend (port 3002)..."
cd backend
npm run dev > /tmp/archigraph-backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend (port 5173)..."
cd frontend
npm run dev > /tmp/archigraph-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

echo ""
echo "✅ ArchiGraph v4 is running!"
echo ""
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3002"
echo "   Health:    http://localhost:3002/api/health"
echo "   GraphDB:   http://192.168.0.105:7200"
echo ""
echo "   Backend PID:  $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "   Logs:"
echo "   - Backend:  tail -f /tmp/archigraph-backend.log"
echo "   - Frontend: tail -f /tmp/archigraph-frontend.log"
echo ""
echo "   To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""
