require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.json({ app: 'HomeGo API v1.0', status: 'running' });
});

app.listen(PORT, () => {
  console.log(`HomeGo server running on port ${PORT}`);
});