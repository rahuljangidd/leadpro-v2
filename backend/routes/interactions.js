const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { buildMulterMiddleware, uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const router = express.Router();
const prisma = new PrismaClient();
const upload = buildMulterMiddleware('images', 10);

router.use(authenticate);

// Create interaction
router.post('/lead/:leadId', async (req, res) => {
  try {
    const { type, summary, outcome, followUpDate } = req.body;
    const interaction = await prisma.interaction.create({
      data: {
        leadId: req.params.leadId,
        userId: req.user.id,
        type, summary, outcome,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
      include: { user: { select: { id: true, name: true } }, images: true }
    });

    if (followUpDate) {
      await prisma.reminder.create({
        data: {
          leadId: req.params.leadId,
          userId: req.user.id,
          dueDate: new Date(followUpDate),
          note: `Follow up: ${summary.slice(0, 100)}`,
        }
      });
    }

    res.status(201).json(interaction);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload images to an interaction
router.post('/:id/images', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploaded = [];
    for (const file of req.files) {
      const result = await uploadToCloudinary(
        file.buffer,
        'leadpro/interactions',
        'SALES'
      );
      const img = await prisma.interactionImage.create({
        data: {
          interactionId: req.params.id,
          fileUrl: result.secure_url,
          fileName: file.originalname,
          publicId: result.public_id,
          caption: req.body.caption || null,
        }
      });
      uploaded.push(img);
    }
    res.status(201).json(uploaded);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update image caption
router.put('/:interactionId/images/:imageId', async (req, res) => {
  try {
    const img = await prisma.interactionImage.update({
      where: { id: req.params.imageId },
      data: { caption: req.body.caption }
    });
    res.json(img);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete interaction image
router.delete('/:interactionId/images/:imageId', async (req, res) => {
  try {
    const img = await prisma.interactionImage.findUnique({ where: { id: req.params.imageId } });
    if (img?.publicId) await deleteFromCloudinary(img.publicId, 'SALES');
    await prisma.interactionImage.delete({ where: { id: req.params.imageId } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete interaction
router.delete('/:id', async (req, res) => {
  try {
    await prisma.interaction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
