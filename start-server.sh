#!/bin/bash

echo "════════════════════════════════════════════════"
echo "  🎮 DESAFIO DAS EMOÇÕES - Starting Server"
echo "════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting Node.js server..."
echo "📡 Server will run on: http://localhost:3000"
echo "📊 Results will be saved to: resultados_emocoes.csv"
echo ""
echo "Press Ctrl+C to stop the server"
echo "════════════════════════════════════════════════"
echo ""

# Start Node.js server
npm start
