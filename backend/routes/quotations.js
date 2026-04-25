const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireOwner } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

function calcTotals(rooms, gstType, gstPercent, discountAmount) {
  const subtotal = rooms.reduce((sum, r) =>
    sum + r.items.reduce((s, i) => s + parseFloat(i.amount), 0), 0);
  let gstAmount = 0;
  if (gstType === 'FULL' && gstPercent) gstAmount = subtotal * (parseFloat(gstPercent) / 100);
  else if (gstType === 'HALF' && gstPercent) gstAmount = subtotal * (parseFloat(gstPercent) / 200);
  const discount = parseFloat(discountAmount || 0);
  return {
    subtotal: subtotal.toFixed(2),
    gstAmount: gstAmount.toFixed(2),
    discount: discount.toFixed(2),
    total: (subtotal + gstAmount - discount).toFixed(2)
  };
}

// List quotations
router.get('/', async (req, res) => {
  try {
    const { leadId, projectId, status } = req.query;
    const where = {};
    if (leadId) where.leadId = leadId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    // Executives only see quotations they created
    if (req.user.role === 'EXECUTIVE') where.createdById = req.user.id;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        _count: { select: { rooms: true } }
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(quotations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single quotation with full details
router.get('/:id', async (req, res) => {
  try {
    const q = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true, city: true } },
        project: { select: { id: true, title: true, refNo: true } },
        createdBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        rooms: {
          include: {
            items: {
              include: { masterItem: { select: { id: true, name: true, category: true } } },
              orderBy: { sortOrder: 'asc' }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
        paymentSchedule: { orderBy: { sortOrder: 'asc' } },
        signoffDoc: true,
      }
    });
    if (!q) return res.status(404).json({ error: 'Quotation not found' });
    res.json(q);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create quotation
router.post('/', async (req, res) => {
  try {
    const { leadId, projectId, gstType, gstPercent, rooms, paymentSchedule } = req.body;

    // Generate refNo based on existing quotations for this lead
    const existing = await prisma.quotation.findMany({
      where: { leadId },
      orderBy: { version: 'desc' }
    });
    const version = existing.length > 0 ? existing[0].version + 1 : 1;

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { name: true } });
    const firmInitials = process.env.FIRM_INITIALS || 'KK';
    const year = new Date().getFullYear();
    const count = await prisma.quotation.count();
    const refNo = `${firmInitials}/Q/${year}/${String(count + 1).padStart(4, '0')}`;

    const q = await prisma.quotation.create({
      data: {
        leadId, projectId: projectId || null, refNo, version,
        gstType: gstType || 'NONE',
        gstPercent: gstPercent ? parseFloat(gstPercent) : null,
        createdById: req.user.id,
        rooms: {
          create: (rooms || []).map((room, ri) => ({
            name: room.name,
            sortOrder: ri,
            items: {
              create: (room.items || []).map((item, ii) => ({
                masterItemId: item.masterItemId || null,
                description: item.description,
                unit: item.unit,
                qty: parseFloat(item.qty),
                unitRate: parseFloat(item.unitRate), // FROZEN at creation
                amount: parseFloat(item.qty) * parseFloat(item.unitRate),
                remarks: item.remarks || null,
                sortOrder: ii,
              }))
            }
          }))
        },
        paymentSchedule: paymentSchedule?.length > 0 ? {
          create: paymentSchedule.map((p, i) => ({
            milestone: p.milestone,
            percentage: parseFloat(p.percentage),
            amount: parseFloat(p.amount),
            dueNote: p.dueNote || null,
            sortOrder: i,
          }))
        } : undefined
      },
      include: {
        rooms: { include: { items: true }, orderBy: { sortOrder: 'asc' } },
        paymentSchedule: true,
        createdBy: { select: { name: true } }
      }
    });
    res.status(201).json(q);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update quotation (only DRAFT)
router.put('/:id', async (req, res) => {
  try {
    const q = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!q) return res.status(404).json({ error: 'Not found' });
    if (!['DRAFT', 'REJECTED'].includes(q.status)) {
      return res.status(400).json({ error: 'Can only edit DRAFT or REJECTED quotations' });
    }
    if (req.user.role === 'EXECUTIVE' && q.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { gstType, gstPercent, discountAmount, discountNote, rooms, paymentSchedule } = req.body;

    // Delete existing rooms/items (re-create them)
    if (rooms !== undefined) {
      await prisma.quotationRoom.deleteMany({ where: { quotationId: req.params.id } });
    }

    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: {
        ...(gstType !== undefined && { gstType }),
        ...(gstPercent !== undefined && { gstPercent: gstPercent ? parseFloat(gstPercent) : null }),
        ...(discountAmount !== undefined && { discountAmount: parseFloat(discountAmount) }),
        ...(discountNote !== undefined && { discountNote }),
        status: 'DRAFT',
        rooms: rooms !== undefined ? {
          create: rooms.map((room, ri) => ({
            name: room.name, sortOrder: ri,
            items: {
              create: (room.items || []).map((item, ii) => ({
                masterItemId: item.masterItemId || null,
                description: item.description,
                unit: item.unit,
                qty: parseFloat(item.qty),
                unitRate: parseFloat(item.unitRate),
                amount: parseFloat(item.qty) * parseFloat(item.unitRate),
                remarks: item.remarks || null,
                sortOrder: ii,
              }))
            }
          }))
        } : undefined,
      },
      include: {
        rooms: { include: { items: true }, orderBy: { sortOrder: 'asc' } },
        paymentSchedule: true,
        createdBy: { select: { name: true } }
      }
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Submit for review (Employee → Owner)
router.post('/:id/submit', async (req, res) => {
  try {
    const q = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!q) return res.status(404).json({ error: 'Not found' });
    if (q.status !== 'DRAFT' && q.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Can only submit DRAFT quotations' });
    }
    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status: 'SUBMITTED', reviewNote: null }
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve (Owner only) - can also apply discount here
router.post('/:id/approve', requireOwner, async (req, res) => {
  try {
    const { discountAmount, discountNote } = req.body;
    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        reviewedById: req.user.id,
        reviewNote: null,
        ...(discountAmount !== undefined && { discountAmount: parseFloat(discountAmount) }),
        ...(discountNote !== undefined && { discountNote }),
      }
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reject / send back with notes (Owner only)
router.post('/:id/reject', requireOwner, async (req, res) => {
  try {
    const { reviewNote, itemRevisions } = req.body;
    // Mark specific items for revision if provided
    if (itemRevisions?.length > 0) {
      for (const r of itemRevisions) {
        await prisma.quotationItem.update({
          where: { id: r.itemId },
          data: { hasRevision: true, revisionNote: r.note }
        });
      }
    }
    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        reviewedById: req.user.id,
        reviewNote: reviewNote || null,
      }
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark as sent to client (Owner only)
router.post('/:id/mark-sent', requireOwner, async (req, res) => {
  try {
    const q = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (q.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only APPROVED quotations can be sent' });
    }
    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status: 'SENT', sentAt: new Date() }
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark as signed
router.post('/:id/mark-signed', requireOwner, async (req, res) => {
  try {
    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: { signedAt: new Date() }
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create new version from rejected
router.post('/:id/new-version', async (req, res) => {
  try {
    const old = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        rooms: { include: { items: true } },
        paymentSchedule: true,
      }
    });
    if (!old) return res.status(404).json({ error: 'Not found' });

    const count = await prisma.quotation.count();
    const firmInitials = process.env.FIRM_INITIALS || 'KK';
    const year = new Date().getFullYear();
    const refNo = `${firmInitials}/Q/${year}/${String(count + 1).padStart(4, '0')}`;

    const newQ = await prisma.quotation.create({
      data: {
        leadId: old.leadId,
        projectId: old.projectId,
        refNo,
        version: old.version + 1,
        gstType: old.gstType,
        gstPercent: old.gstPercent,
        discountAmount: old.discountAmount,
        discountNote: old.discountNote,
        createdById: req.user.id,
        status: 'DRAFT',
        rooms: {
          create: old.rooms.map((room, ri) => ({
            name: room.name, sortOrder: ri,
            items: {
              create: room.items.map((item, ii) => ({
                masterItemId: item.masterItemId,
                description: item.description,
                unit: item.unit,
                qty: item.qty,
                unitRate: item.unitRate,
                amount: item.amount,
                remarks: item.remarks,
                hasRevision: false,
                revisionNote: null,
                sortOrder: ii,
              }))
            }
          }))
        },
        paymentSchedule: {
          create: old.paymentSchedule.map((p, i) => ({
            milestone: p.milestone,
            percentage: p.percentage,
            amount: p.amount,
            dueNote: p.dueNote,
            sortOrder: i,
          }))
        }
      },
      include: {
        rooms: { include: { items: true }, orderBy: { sortOrder: 'asc' } },
        paymentSchedule: true,
        createdBy: { select: { name: true } }
      }
    });
    res.status(201).json(newQ);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate signoff document data
router.post('/:id/signoff', requireOwner, async (req, res) => {
  try {
    const { scopeIncludes, scopeExcludes, materialNotes, notes } = req.body;
    const existing = await prisma.signoffDocument.findUnique({
      where: { quotationId: req.params.id }
    });

    let doc;
    if (existing) {
      doc = await prisma.signoffDocument.update({
        where: { quotationId: req.params.id },
        data: {
          scopeIncludes: JSON.stringify(scopeIncludes || []),
          scopeExcludes: JSON.stringify(scopeExcludes || []),
          materialNotes, notes
        }
      });
    } else {
      doc = await prisma.signoffDocument.create({
        data: {
          quotationId: req.params.id,
          scopeIncludes: JSON.stringify(scopeIncludes || []),
          scopeExcludes: JSON.stringify(scopeExcludes || []),
          materialNotes, notes
        }
      });
    }
    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
