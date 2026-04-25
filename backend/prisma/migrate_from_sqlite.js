/**
 * MIGRATION SCRIPT: SQLite → PostgreSQL
 * 
 * Run ONCE after setting up your PostgreSQL (Supabase) database:
 *   1. Set DATABASE_URL in .env to your PostgreSQL connection string
 *   2. Set SQLITE_PATH to point to your old SQLite database file
 *   3. Run: node prisma/migrate_from_sqlite.js
 */

const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config();

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../dev.db');

const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Starting migration from SQLite → PostgreSQL...');
  console.log(`📁 SQLite path: ${SQLITE_PATH}`);

  let db;
  try {
    db = new Database(SQLITE_PATH, { readonly: true });
  } catch (err) {
    console.error('❌ Cannot open SQLite database:', err.message);
    console.log('   Set SQLITE_PATH in .env to point to your old database file');
    process.exit(1);
  }

  // ── USERS ────────────────────────────────────────────────────────────────
  const users = db.prepare('SELECT * FROM User').all();
  console.log(`\n👤 Migrating ${users.length} users...`);
  for (const u of users) {
    try {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role === 'MANAGER' ? 'CO_ADMIN' : u.role,
          avatar: u.avatar || null,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        }
      });
    } catch (e) { console.warn(`  ⚠ User ${u.email}: ${e.message}`); }
  }
  console.log('✅ Users done');

  // ── LEADS ─────────────────────────────────────────────────────────────────
  const leads = db.prepare('SELECT * FROM Lead').all();
  console.log(`\n📋 Migrating ${leads.length} leads...`);
  for (const l of leads) {
    try {
      await prisma.lead.upsert({
        where: { id: l.id },
        update: {},
        create: {
          id: l.id,
          name: l.name,
          phone: l.phone,
          phone2: l.phone2 || null,
          email: l.email || null,
          city: l.city || null,
          source: l.source,
          sourceDetail: l.sourceDetail || null,
          projectType: l.projectType,
          propertyType: l.propertyType || null,
          areaSqft: l.areaSqft || null,
          rooms: l.rooms || null,
          style: l.style || null,
          budget: l.budget,
          expectedStart: l.expectedStart || null,
          notes: l.notes || null,
          status: l.status,
          lostReason: l.lostReason || null,
          tags: l.tags || '[]',
          assignedToId: l.assignedToId || null,
          createdById: l.createdById,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        }
      });
    } catch (e) { console.warn(`  ⚠ Lead ${l.name}: ${e.message}`); }
  }
  console.log('✅ Leads done');

  // ── INTERACTIONS ──────────────────────────────────────────────────────────
  const interactions = db.prepare('SELECT * FROM Interaction').all();
  console.log(`\n💬 Migrating ${interactions.length} interactions...`);
  for (const i of interactions) {
    try {
      await prisma.interaction.upsert({
        where: { id: i.id },
        update: {},
        create: {
          id: i.id,
          leadId: i.leadId,
          userId: i.userId,
          type: i.type,
          summary: i.summary,
          outcome: i.outcome || 'NEUTRAL',
          followUpDate: i.followUpDate ? new Date(i.followUpDate) : null,
          createdAt: new Date(i.createdAt),
        }
      });
    } catch (e) { console.warn(`  ⚠ Interaction ${i.id}: ${e.message}`); }
  }
  console.log('✅ Interactions done');

  // ── ATTACHMENTS ───────────────────────────────────────────────────────────
  const attachments = db.prepare('SELECT * FROM Attachment').all();
  console.log(`\n📎 Migrating ${attachments.length} attachments...`);
  for (const a of attachments) {
    try {
      await prisma.attachment.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          leadId: a.leadId,
          userId: a.userId,
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileType: a.fileType,
          publicId: a.publicId || null,
          createdAt: new Date(a.createdAt),
        }
      });
    } catch (e) { console.warn(`  ⚠ Attachment ${a.id}: ${e.message}`); }
  }
  console.log('✅ Attachments done');

  // ── REMINDERS ─────────────────────────────────────────────────────────────
  const reminders = db.prepare('SELECT * FROM Reminder').all();
  console.log(`\n🔔 Migrating ${reminders.length} reminders...`);
  for (const r of reminders) {
    try {
      await prisma.reminder.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          leadId: r.leadId,
          userId: r.userId,
          dueDate: new Date(r.dueDate),
          note: r.note || null,
          isDone: r.isDone === 1,
          createdAt: new Date(r.createdAt),
        }
      });
    } catch (e) { console.warn(`  ⚠ Reminder ${r.id}: ${e.message}`); }
  }
  console.log('✅ Reminders done');

  db.close();
  await prisma.$disconnect();

  console.log('\n🎉 Migration complete! All your old data is now in PostgreSQL.');
  console.log('   You can now run the new app with: npm run dev');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
