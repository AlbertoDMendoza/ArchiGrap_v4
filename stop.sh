#!/bin/bash

# ArchiGraph v4 Stop Script

echo "🛑 Stopping ArchiGraph v4..."

lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "✅ Stopped"
