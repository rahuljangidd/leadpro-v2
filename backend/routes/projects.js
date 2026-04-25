const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireOwner } = require('../middleware/auth');
const { buildMulterMiddleware, uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const router = express.Router();
const prisma = new PrismaClient();
const uploadSite = buildMulterMiddleware('images', 20);

router.use(authenticate);

// Auto-generate ref number
async function generateRefNo() {
  const firmInitials = process.env.FIRM_INITIALS || 'KK';
  const year = new Date().getFullYear();
  const count = await prisma.project.count();
  const seq = String(count + 1).padStart(4, '0');
  return `${firmInitials}/${year}/${seq}`;
}

// List all projects
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { refNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    const projects = await prisma.project.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, status: true } },
        _count: { select: { designPhases: true, siteImages: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single project with all details
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true, status: true } },
        quotations: {
          include: { createdBy: { select: { name: true } }, reviewedBy: { select: { name: true } } },
          orderBy: [{ version: 'desc' }]
        },
        designPhases: {
          include: { images: { orderBy: { createdAt: 'asc' } } },
          orderBy: { sortOrder: 'asc' }
        },
        paymentSchedule: {
          include: { entries: { where: { isVoid: false } } },
          orderBy: { sortOrder: 'asc' }
        },
        siteImages: { orderBy: { takenAt: 'desc' } },
      }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create project from a WON lead
router.post('/', requireOwner, async (req, res) => {
  try {
    const {
      leadId, title, clientName, clientPhone, clientEmail,
      projectAddress, projectType, designerName, projectManager,
      executionLead, areaSqft, expectedEnd, notes,
      paymentSchedule // array of { milestone, amount, dueDate }
    } = req.body;

    const refNo = await generateRefNo();

    const project = await prisma.project.create({
      data: {
        leadId, refNo, title, clientName, clientPhone,
        clientEmail, projectAddress, projectType,
        designerName, projectManager, executionLead,
        areaSqft: areaSqft ? parseInt(areaSqft) : null,
        expectedEnd: expectedEnd ? new Date(expectedEnd) : null,
        notes,
        paymentSchedule: paymentSchedule?.length > 0 ? {
          create: paymentSchedule.map((p, i) => ({
            milestone: p.milestone,
            amount: parseFloat(p.amount),
            dueDate: p.dueDate ? new Date(p.dueDate) : null,
            sortOrder: i,
          }))
        } : undefined
      },
      include: { lead: true, paymentSchedule: true }
    });

    // Update lead status to WON if not already
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'WON' }
    });

    res.status(201).json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update project
router.put('/:id', requireOwner, async (req, res) => {
  try {
    const allowed = ['title', 'clientName', 'clientPhone', 'clientEmail', 'projectAddress',
      'designerName', 'projectManager', 'executionLead', 'areaSqft', 'status',
      'expectedEnd', 'actualEnd', 'notes'];
    const data = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    if (data.expectedEnd) data.expectedEnd = new Date(data.expectedEnd);
    if (data.actualEnd) data.actualEnd = new Date(data.actualEnd);
    if (data.areaSqft) data.areaSqft = parseInt(data.areaSqft);

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data
    });
    res.json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PAYMENT SCHEDULE ──────────────────────────────────────────────────────────

// Add payment milestone
router.post('/:id/payment-schedule', requireOwner, async (req, res) => {
  try {
    const { milestone, amount, dueDate } = req.body;
    const count = await prisma.projectPayment.count({ where: { projectId: req.params.id } });
    const pm = await prisma.projectPayment.create({
      data: {
        projectId: req.params.id,
        milestone, amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder: count,
      }
    });
    res.status(201).json(pm);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update milestone status
router.put('/payment-schedule/:pmId', requireOwner, async (req, res) => {
  try {
    const pm = await prisma.projectPayment.update({
      where: { id: req.params.pmId },
      data: { status: req.body.status, dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined }
    });
    res.json(pm);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SITE IMAGES ───────────────────────────────────────────────────────────────

router.post('/:id/site-images', (req, res, next) => {
  uploadSite(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files' });

    const saved = [];
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer, 'leadpro/site', 'SITE');
      const img = await prisma.siteImage.create({
        data: {
          projectId: req.params.id,
          fileUrl: result.secure_url,
          fileName: file.originalname,
          publicId: result.public_id,
          caption: req.body.caption || null,
          takenAt: req.body.takenAt ? new Date(req.body.takenAt) : new Date(),
        }
      });
      saved.push(img);
    }
    res.status(201).json(saved);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:projectId/site-images/:imageId', async (req, res) => {
  try {
    const img = await prisma.siteImage.findUnique({ where: { id: req.params.imageId } });
    if (img?.publicId) await deleteFromCloudinary(img.publicId, 'SITE');
    await prisma.siteImage.delete({ where: { id: req.params.imageId } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DESIGN PHASES ─────────────────────────────────────────────────────────────

const uploadDesign = buildMulterMiddleware('images', 10);

router.get('/:id/design', async (req, res) => {
  try {
    const phases = await prisma.designPhase.findMany({
      where: { projectId: req.params.id },
      include: { images: { orderBy: { createdAt: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(phases);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/design/phases', async (req, res) => {
  try {
    const count = await prisma.designPhase.count({ where: { projectId: req.params.id } });
    const phase = await prisma.designPhase.create({
      data: { projectId: req.params.id, name: req.body.name, sortOrder: count },
      include: { images: true }
    });
    res.status(201).json(phase);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:projectId/design/phases/:phaseId', async (req, res) => {
  try {
    const { status, clientNote } = req.body;
    const phase = await prisma.designPhase.update({
      where: { id: req.params.phaseId },
      data: { status, clientNote }
    });
    res.json(phase);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:projectId/design/phases/:phaseId/images', (req, res, next) => {
  uploadDesign(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files' });

    const count = await prisma.designImage.count({ where: { phaseId: req.params.phaseId } });
    const saved = [];
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer, 'leadpro/design', 'DESIGN');
      const img = await prisma.designImage.create({
        data: {
          phaseId: req.params.phaseId,
          fileUrl: result.secure_url,
          fileName: file.originalname,
          publicId: result.public_id,
          version: Math.floor(count / req.files.length) + 1,
          note: req.body.note || null,
        }
      });
      saved.push(img);
    }
    res.status(201).json(saved);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:projectId/design/images/:imageId', async (req, res) => {
  try {
    const { status, note } = req.body;
    const img = await prisma.designImage.update({
      where: { id: req.params.imageId },
      data: { status, note }
    });
    res.json(img);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
