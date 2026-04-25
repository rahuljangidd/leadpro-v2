const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const where = {
      isDone: false,
      dueDate: { lte: endOfDay }
    };
    if (req.user.role === 'EXECUTIVE') where.userId = req.user.id;

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true, status: true } },
        user: { select: { id: true, name: true } }
      },
      orderBy: { dueDate: 'asc' }
    });
    res.json(reminders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my', async (req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.user.id, isDone: false },
      include: { lead: { select: { id: true, name: true, phone: true, status: true } } },
      orderBy: { dueDate: 'asc' }
    });
    res.json(reminders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/lead/:leadId', async (req, res) => {
  try {
    const reminder = await prisma.reminder.create({
      data: {
        leadId: req.params.leadId,
        userId: req.user.id,
        dueDate: new Date(req.body.dueDate),
        note: req.body.note,
      },
      include: { lead: { select: { id: true, name: true, phone: true } } }
    });
    res.status(201).json(reminder);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/done', async (req, res) => {
  try {
    const reminder = await prisma.reminder.update({
      where: { id: req.params.id },
      data: { isDone: true }
    });
    res.json(reminder);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.reminder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
