const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!user.isActive) return res.status(401).json({ error: 'Account deactivated' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ADMIN and CO_ADMIN both have owner-level access
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Owner = ADMIN or CO_ADMIN
const requireOwner = (req, res, next) => {
  if (!['ADMIN', 'CO_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only owners can perform this action' });
  }
  next();
};

module.exports = { authenticate, requireRole, requireOwner };
