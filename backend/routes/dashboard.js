const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireOwner } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/stats', async (req, res) => {
  try {
    const isExec = req.user.role === 'EXECUTIVE';
    const baseWhere = isExec ? { assignedToId: req.user.id } : {};

    const [totalLeads, byStatus, recentLeads, coldLeads, totalProjects, pendingQuotations] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.groupBy({ by: ['status'], where: baseWhere, _count: true }),
      prisma.lead.findMany({
        where: baseWhere, take: 5, orderBy: { createdAt: 'desc' },
        include: { assignedTo: { select: { id: true, name: true } } }
      }),
      prisma.lead.findMany({
        where: {
          ...baseWhere,
          status: { notIn: ['WON', 'LOST'] },
          updatedAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        take: 10,
        include: { assignedTo: { select: { id: true, name: true } } }
      }),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.quotation.count({ where: { status: 'SUBMITTED' } }),
    ]);

    const statusMap = {};
    byStatus.forEach(s => { statusMap[s.status] = s._count; });

    let teamStats = null;
    if (!isExec) {
      const users = await prisma.user.findMany({
        where: { role: 'EXECUTIVE', isActive: true },
        select: { id: true, name: true, _count: { select: { leads: true } } }
      });
      teamStats = users;
    }

    // Upcoming reminders (next 3 days)
    const upcomingReminders = await prisma.reminder.findMany({
      where: {
        isDone: false,
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        },
        ...(isExec ? { userId: req.user.id } : {})
      },
      include: {
        lead: { select: { id: true, name: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 5
    });

    res.json({ totalLeads, byStatus: statusMap, recentLeads, coldLeads, teamStats, totalProjects, pendingQuotations, upcomingReminders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/activity', requireOwner, async (req, res) => {
  try {
    const interactions = await prisma.interaction.findMany({
      take: 20, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } }
      }
    });
    res.json(interactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
