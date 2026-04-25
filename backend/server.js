require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes        = require('./routes/auth');
const leadRoutes        = require('./routes/leads');
const interactionRoutes = require('./routes/interactions');
const reminderRoutes    = require('./routes/reminders');
const userRoutes        = require('./routes/users');
const dashboardRoutes   = require('./routes/dashboard');
const attachmentRoutes  = require('./routes/attachments');
const masterlistRoutes  = require('./routes/masterlist');
const projectRoutes     = require('./routes/projects');
const quotationRoutes   = require('./routes/quotations');
const financeRoutes     = require('./routes/finance');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api/auth',         authRoutes);
app.use('/api/leads',        leadRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/reminders',    reminderRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/attachments',  attachmentRoutes);
app.use('/api/master-items', masterlistRoutes);
app.use('/api/projects',     projectRoutes);
app.use('/api/quotations',   quotationRoutes);
app.use('/api/finance',      financeRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LeadPro server running on port ${PORT}`);
  console.log(`Access from LAN: http://<your-laptop-ip>:${PORT}`);
});
