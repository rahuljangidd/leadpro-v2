const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

function safeParseJSON(val) {
  try { return JSON.parse(val); } catch { return []; }
}

function serializeLead(lead) {
  return { ...lead, tags: safeParseJSON(lead.tags) };
}

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, source, assignedToId, budget, search, tag, page = 1, limit = 20 } = req.query;
    const where = {};
    if (req.user.role === 'EXECUTIVE') where.assignedToId = req.user.id;
    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedToId && req.user.role !== 'EXECUTIVE') where.assignedToId = assignedToId;
    if (budget) where.budget = budget;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where, skip, take: parseInt(limit),
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.lead.count({ where })
    ]);
    // Parse tags from JSON string
    leads = leads.map(l => ({ ...l, tags: safeParseJSON(l.tags) }));
    // Filter by tag after fetch
    if (tag) leads = leads.filter(l => l.tags.includes(tag));
    res.json({ leads, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, createdById: req.user.id };
    if (Array.isArray(data.tags)) data.tags = JSON.stringify(data.tags);
    const lead = await prisma.lead.create({
      data,
      include: { assignedTo: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json(serializeLead(lead));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        interactions: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        attachments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        reminders: { include: { user: { select: { id: true, name: true } } }, orderBy: { dueDate: 'asc' } },
      }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (req.user.role === 'EXECUTIVE' && lead.assignedToId !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });
    res.json(serializeLead(lead));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });
    if (req.user.role === 'EXECUTIVE' && existing.assignedToId !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });
    const data = { ...req.body };
    if (Array.isArray(data.tags)) data.tags = JSON.stringify(data.tags);
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data,
      include: { assignedTo: { select: { id: true, name: true, email: true } } }
    });
    res.json(serializeLead(lead));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
