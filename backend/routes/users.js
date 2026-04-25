const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all users — owners see everyone, executives only see own profile
router.get('/', requireRole('ADMIN', 'CO_ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create user (only ADMIN can create/promote roles)
router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    // Only ADMIN can create CO_ADMIN
    if (role === 'CO_ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only ADMIN can assign CO_ADMIN role' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'EXECUTIVE' },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update user
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete user
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    // Soft-delete by deactivating
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'User deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
