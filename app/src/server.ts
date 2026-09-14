import express from 'express';
import cors from 'cors';
import path from 'path';
import { transferRouter } from './routes/transfer.routes';

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/v1/transfers', transferRouter);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 One-Point Employee Portal — Internal Transfer System`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🏛️ SDD Methodology: INT Specification-Driven Delivery`);
    console.log(`=======================================================`);
  });
}
