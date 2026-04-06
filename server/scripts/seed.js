require('dotenv').config();
const pool = require('../db');
const bcrypt = require('bcryptjs');

async function seed() {
  // Institution
  await pool.query(`
    INSERT INTO institutions (name, slug) VALUES ('MCG Career College', 'mcg')
    ON CONFLICT (slug) DO NOTHING
  `);

  const { rows: [inst] } = await pool.query(`SELECT id FROM institutions WHERE slug = 'mcg'`);

  // Programs
  const programs = [
    'Medical Office Assistant & Unit Clerk',
    'Global Operations and Supply Chain',
    'Architectural Technology',
    'Basic Massage Therapy',
    'Advanced Massage Therapy',
    'Diagnostic Medical Sonography'
  ];
  for (const name of programs) {
    await pool.query(
      `INSERT INTO programs (institution_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [inst.id, name]
    );
  }

  // Admin user
  const hash = await bcrypt.hash('changeme123', 10);
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('admin@mcgcc.ca', $1, 'MCG Admin', 'admin')
    ON CONFLICT (email) DO NOTHING
  `, [hash]);

  // Finance user
  const fhash = await bcrypt.hash('changeme123', 10);
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('finance@mcgcc.ca', $1, 'Finance Team', 'finance')
    ON CONFLICT (email) DO NOTHING
  `, [fhash]);

  // OpenBox vendor user
  const vhash = await bcrypt.hash('changeme123', 10);
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('vendor@openbox.ca', $1, 'OpenBox Fulfillment', 'vendor')
    ON CONFLICT (email) DO NOTHING
  `, [vhash]);

  console.log('Seed complete');
  process.exit(0);
}

seed().catch(console.error);
