const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { buildMulterMiddleware, uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const router = express.Router();
const prisma = new PrismaClient();
const upload = buildMulterMiddleware('file', 1);

router.use(authenticate);

router.post('/lead/:leadId', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No file uploaded' });

    const file = req.files[0];
    const result = await uploadToCloudinary(file.buffer, `leadpro/leads/${req.params.leadId}`, 'SALES');

    const attachment = await prisma.attachment.create({
      data: {
        leadId: req.params.leadId,
        userId: req.user.id,
        fileUrl: result.secure_url,
        fileName: file.originalname,
        fileType: file.mimetype,
        publicId: result.public_id,
      },
      include: { user: { select: { id: true, name: true } } }
    });
    res.status(201).json(attachment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const att = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!att) return res.status(404).json({ error: 'Not found' });
    if (att.publicId) await deleteFromCloudinary(att.publicId, 'SALES').catch(() => {});
    await prisma.attachment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
