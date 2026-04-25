const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireOwner } = require('../middleware/auth');
const { buildMulterMiddleware, uploadToCloudinary } = require('../utils/cloudinary');

const router = express.Router();
const prisma = new PrismaClient();
const uploadReceipt = buildMulterMiddleware('receipt', 1);

// All finance routes require owner access
router.use(authenticate, requireOwner);

// ── PAYMENT ENTRIES ───────────────────────────────────────────────────────────

router.get('/entries', async (req, res) => {
  try {
    const { month, year, type, partyType, projectId } = req.query;
    const where = { isVoid: false };
    if (type) where.type = type;
    if (partyType) where.partyType = partyType;
    if (projectId) where.projectId = projectId;
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.entryDate = { gte: start, lte: end };
    }

    const entries = await prisma.paymentEntry.findMany({
      where,
      include: {
        milestone: { select: { milestone: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { entryDate: 'desc' }
    });

    const payIn = entries.filter(e => e.type === 'PAY_IN')
      .reduce((s, e) => s + parseFloat(e.amount), 0);
    const payOut = entries.filter(e => e.type === 'PAY_OUT')
      .reduce((s, e) => s + parseFloat(e.amount), 0);

    res.json({ entries, summary: { payIn, payOut, balance: payIn - payOut } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create payment entry
router.post('/entries', (req, res, next) => {
  uploadReceipt(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { milestoneId, projectId, type, partyType, partyName,
            amount, paymentMode, description, entryDate } = req.body;

    let receiptUrl = null, publicId = null;
    if (req.files?.length > 0 && paymentMode === 'ONLINE') {
      const result = await uploadToCloudinary(req.files[0].buffer, 'leadpro/receipts', 'DOCS');
      receiptUrl = result.secure_url;
      publicId = result.public_id;
    }

    const entry = await prisma.paymentEntry.create({
      data: {
        milestoneId: milestoneId || null,
        projectId: projectId || null,
        type, partyType, partyName,
        amount: parseFloat(amount),
        paymentMode: paymentMode || 'CASH',
        description, receiptUrl, publicId,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        createdById: req.user.id,
      },
      include: { createdBy: { select: { name: true } } }
    });

    // Update milestone status if linked
    if (milestoneId) {
      const pm = await prisma.projectPayment.findUnique({
        where: { id: milestoneId },
        include: { entries: { where: { isVoid: false } } }
      });
      const paid = pm.entries.reduce((s, e) => s + parseFloat(e.amount), 0);
      const status = paid >= parseFloat(pm.amount) ? 'PAID'
        : paid > 0 ? 'PARTIAL' : 'PENDING';
      await prisma.projectPayment.update({ where: { id: milestoneId }, data: { status } });
    }

    res.status(201).json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Edit entry
router.put('/entries/:id', async (req, res) => {
  try {
    const { type, partyType, partyName, amount, paymentMode, description, entryDate } = req.body;
    const entry = await prisma.paymentEntry.update({
      where: { id: req.params.id },
      data: {
        ...(type && { type }),
        ...(partyType && { partyType }),
        ...(partyName && { partyName }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(paymentMode && { paymentMode }),
        ...(description !== undefined && { description }),
        ...(entryDate && { entryDate: new Date(entryDate) }),
      }
    });
    res.json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Void entry
router.post('/entries/:id/void', async (req, res) => {
  try {
    const entry = await prisma.paymentEntry.update({
      where: { id: req.params.id },
      data: { isVoid: true, voidReason: req.body.reason || null }
    });
    res.json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── LEDGER ────────────────────────────────────────────────────────────────────

router.get('/ledger', async (req, res) => {
  try {
    const { partyName, partyType } = req.query;
    if (!partyName) return res.status(400).json({ error: 'partyName is required' });

    const where = { isVoid: false, partyName: { equals: partyName, mode: 'insensitive' } };
    if (partyType) where.partyType = partyType;

    const entries = await prisma.paymentEntry.findMany({
      where,
      orderBy: { entryDate: 'asc' }
    });

    let balance = 0;
    const ledger = entries.map(e => {
      const debit = e.type === 'PAY_OUT' ? parseFloat(e.amount) : 0;
      const credit = e.type === 'PAY_IN' ? parseFloat(e.amount) : 0;
      balance += credit - debit;
      return {
        id: e.id,
        date: e.entryDate,
        description: e.description || e.partyType,
        debit, credit, balance,
        paymentMode: e.paymentMode,
        receiptUrl: e.receiptUrl,
      };
    });

    res.json({
      partyName,
      ledger,
      totals: {
        totalDebit: ledger.reduce((s, r) => s + r.debit, 0),
        totalCredit: ledger.reduce((s, r) => s + r.credit, 0),
        closingBalance: balance,
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List all parties (for ledger search)
router.get('/parties', async (req, res) => {
  try {
    const parties = await prisma.paymentEntry.groupBy({
      by: ['partyName', 'partyType'],
      where: { isVoid: false },
      _sum: { amount: true },
      _count: true,
      orderBy: { partyName: 'asc' }
    });
    res.json(parties);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── FIXED COSTS ───────────────────────────────────────────────────────────────

router.get('/fixed-costs', async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const costs = await prisma.fixedCost.findMany({
      where, orderBy: [{ year: 'desc' }, { month: 'desc' }, { category: 'asc' }]
    });
    res.json(costs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/fixed-costs', async (req, res) => {
  try {
    const { month, year, category, description, amount, paidDate, notes } = req.body;
    const cost = await prisma.fixedCost.create({
      data: {
        month: parseInt(month), year: parseInt(year),
        category, description, amount: parseFloat(amount),
        paidDate: paidDate ? new Date(paidDate) : null,
        notes
      }
    });
    res.status(201).json(cost);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/fixed-costs/:id', async (req, res) => {
  try {
    const { category, description, amount, paidDate, notes } = req.body;
    const cost = await prisma.fixedCost.update({
      where: { id: req.params.id },
      data: {
        ...(category && { category }),
        ...(description && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(paidDate !== undefined && { paidDate: paidDate ? new Date(paidDate) : null }),
        ...(notes !== undefined && { notes }),
      }
    });
    res.json(cost);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/fixed-costs/:id', async (req, res) => {
  try {
    await prisma.fixedCost.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── MONTHLY P&L ───────────────────────────────────────────────────────────────

router.get('/monthly', async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [entries, fixedCosts] = await Promise.all([
      prisma.paymentEntry.findMany({
        where: { isVoid: false, entryDate: { gte: start, lte: end } },
        include: { milestone: { select: { milestone: true } } }
      }),
      prisma.fixedCost.findMany({ where: { month, year } })
    ]);

    const payIn = entries.filter(e => e.type === 'PAY_IN')
      .reduce((s, e) => s + parseFloat(e.amount), 0);
    const payOut = entries.filter(e => e.type === 'PAY_OUT')
      .reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalFixed = fixedCosts.reduce((s, c) => s + parseFloat(c.amount), 0);

    // Group fixed costs by category
    const fixedByCategory = {};
    fixedCosts.forEach(c => {
      if (!fixedByCategory[c.category]) fixedByCategory[c.category] = 0;
      fixedByCategory[c.category] += parseFloat(c.amount);
    });

    // Group pay-out by partyType
    const outByPartyType = {};
    entries.filter(e => e.type === 'PAY_OUT').forEach(e => {
      if (!outByPartyType[e.partyType]) outByPartyType[e.partyType] = 0;
      outByPartyType[e.partyType] += parseFloat(e.amount);
    });

    res.json({
      month, year,
      totalPayIn: payIn,
      totalPayOut: payOut,
      totalFixedCost: totalFixed,
      netProfit: payIn - payOut - totalFixed,
      payOutBreakdown: outByPartyType,
      fixedCostBreakdown: fixedByCategory,
      entries: entries.length,
      fixedCostItems: fixedCosts,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
