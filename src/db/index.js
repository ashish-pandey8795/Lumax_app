// db/index.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Ensure DB tables/extensions exist (idempotent)
let dbInitialized = false;

export const initDb = async () => {
  if (dbInitialized) return;

  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        plant_code TEXT NOT NULL,
        plant_name TEXT NOT NULL,
        location TEXT,
        bill_month DATE NOT NULL,
        contractor_name TEXT NOT NULL,
        no_of_emp_as_on_date INTEGER,
        mode TEXT CHECK (mode IN ('PIECE', 'MONTHLY', 'DAILY')),
        area_of_work TEXT,
        max_employees_per_rc INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_request_id UUID REFERENCES bill_requests(id) ON DELETE CASCADE,
        invoice_no TEXT NOT NULL,
        invoice_date DATE NOT NULL,
        invoice_type TEXT,
        amount NUMERIC(12,2),
        service_charge NUMERIC(12,2),
        esi NUMERIC(12,2),
        pf NUMERIC(12,2),
        pt NUMERIC(12,2),
        lwf NUMERIC(12,2),
        total NUMERIC(12,2),
        remarks TEXT,
        file_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    dbInitialized = true;
    console.log("✅ Database tables ready");
  } catch (error) {
    console.error("❌ DB init failed:", error.message);
    throw error;
  }
};
