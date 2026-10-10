/**
 * CodePilot Express Server & Realtime Engine
 */

import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import analyzeRouter from './routes/analyze.js';
import chatRouter from './routes/chat.js';
import roomsRouter from './routes/rooms.js';
import { initSocketServer } from './services/realtime/socketService.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

// --- Security & Middleware ---
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Dev-friendly fallback
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting — protect AI API from abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 requests per minute per IP for collaborative rooms
  message: {
    error: 'Too many requests. Please wait a moment before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);

// --- Routes ---
app.use('/api/analyze', analyzeRouter);
app.use('/api/chat', chatRouter);
app.use('/api/rooms', roomsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CodePilot API with Realtime Collaborative Rooms' });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// Initialize Socket.IO server
initSocketServer(server, { origin: allowedOrigins });

// Start HTTP server only if executed directly (not in unit tests)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`✅ CodePilot API & Realtime Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  WARNING: GEMINI_API_KEY is not set. AI features will not work.');
    }
  });
}

export { app, server };
export default app;
