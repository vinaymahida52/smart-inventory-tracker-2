import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import './db/init.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.set('io', io);
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'Dukaan Tracker API' }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 4873;
httpServer.listen(PORT, () => {
  console.log(`Dukaan Tracker API running on http://localhost:${PORT}`);
});
