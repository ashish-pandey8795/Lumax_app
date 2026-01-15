// import pkg from "pg";
// const { Pool } = pkg;
// import dotenv from "dotenv";
// dotenv.config();

// // PostgreSQL connection using DATABASE_URL (NeonDB)
// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }, // required by NeonDB
// });

// export const initDb = async () => {
//   try {
//     await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS bill_requests (
//         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//         company_name TEXT NOT NULL,
//         plant_code TEXT NOT NULL,
//         plant_name TEXT NOT NULL,
//         location TEXT,
//         bill_month DATE NOT NULL,
//         contractor_name TEXT NOT NULL,
//         no_of_emp_as_on_date INTEGER,
//         mode TEXT CHECK (mode IN ('PIECE', 'MONTHLY')),
//         area_of_work TEXT,
//         max_employees_per_rc INTEGER,
//         created_at TIMESTAMP DEFAULT NOW()
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS bill_invoices (
//         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//         bill_request_id UUID REFERENCES bill_requests(id) ON DELETE CASCADE,
//         invoice_no TEXT NOT NULL,
//         invoice_date DATE NOT NULL,
//         invoice_type TEXT,
//         amount NUMERIC(12,2),
//         service_charge NUMERIC(12,2),
//         esi NUMERIC(12,2),
//         pf NUMERIC(12,2),
//         pt NUMERIC(12,2),
//         lwf NUMERIC(12,2),
//         total NUMERIC(12,2),
//         remarks TEXT,
//         file_url TEXT,
//         created_at TIMESTAMP DEFAULT NOW()
//       );
//     `);

//     console.log("✅ Database tables ready");
//   } catch (error) {
//     console.error("❌ DB init failed:", error.message);
//     if (error.code === "ECONNREFUSED") {
//       console.error("⚠️ Cannot connect to PostgreSQL. Check DATABASE_URL and SSL settings.");
//     }
//     throw error;
//   }
// };
