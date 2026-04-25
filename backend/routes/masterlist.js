const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireOwner } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all master items
router.get('/', async (req, res) => {
  try {
    const { category, search, active = 'true' } = req.query;
    const where = {};
    if (active !== 'all') where.isActive = active !== 'false';
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.masterItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create item (owner only)
router.post('/', requireOwner, async (req, res) => {
  try {
    const { category, name, description, unit, baseRate } = req.body;
    if (!category || !name || !unit || baseRate === undefined) {
      return res.status(400).json({ error: 'category, name, unit, baseRate are required' });
    }
    const item = await prisma.masterItem.create({
      data: { category, name, description, unit, baseRate: parseFloat(baseRate) }
    });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update item (owner only)
router.put('/:id', requireOwner, async (req, res) => {
  try {
    const { category, name, description, unit, baseRate, isActive } = req.body;
    const item = await prisma.masterItem.update({
      where: { id: req.params.id },
      data: {
        ...(category !== undefined && { category }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(baseRate !== undefined && { baseRate: parseFloat(baseRate) }),
        ...(isActive !== undefined && { isActive }),
      }
    });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete item (soft delete - owner only)
router.delete('/:id', requireOwner, async (req, res) => {
  try {
    await prisma.masterItem.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: 'Item deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
