import { pool } from "../db/index.js";

export const createBill = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      companyName,
      plantCode,
      plantName,
      location,
      billMonth,
      contractorName,
      noOfEmployees,
      mode,
      areaOfWork,
      maxEmployeesPerRC,
      invoices
    } = req.body;

    const billResult = await client.query(
      `
      INSERT INTO bill_requests (
        company_name, plant_code, plant_name, location,
        bill_month, contractor_name,
        no_of_emp_as_on_date, mode,
        area_of_work, max_employees_per_rc
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        companyName,
        plantCode,
        plantName,
        location,
        billMonth,
        contractorName,
        noOfEmployees,
        mode,
        areaOfWork,
        maxEmployeesPerRC
      ]
    );

    const bill = billResult.rows[0];

    for (const inv of invoices) {
      await client.query(
        `
        INSERT INTO bill_invoices (
          bill_request_id,
          invoice_no, invoice_date, invoice_type,
          amount, service_charge, esi, pf, pt, lwf,
          total, remarks, file_url
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `,
        [
          bill.id,
          inv.invoiceNo,
          inv.invoiceDate,
          inv.invoiceType,
          inv.amount,
          inv.serviceCharge,
          inv.esi,
          inv.pf,
          inv.pt,
          inv.lwf,
          inv.total,
          inv.remarks,
          inv.fileUrl
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Bill created successfully",
      data: bill
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to create bill" });
  } finally {
    client.release();
  }
};



export const getAllBills = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        br.*,
        COALESCE(
          json_agg(bi.*) FILTER (WHERE bi.id IS NOT NULL),
          '[]'
        ) AS invoices
      FROM bill_requests br
      LEFT JOIN bill_invoices bi
        ON br.id = bi.bill_request_id
      GROUP BY br.id
      ORDER BY br.created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
};




export const getBillById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        br.*,
        COALESCE(
          json_agg(bi.*) FILTER (WHERE bi.id IS NOT NULL),
          '[]'
        ) AS invoices
      FROM bill_requests br
      LEFT JOIN bill_invoices bi
        ON br.id = bi.bill_request_id
      WHERE br.id = $1
      GROUP BY br.id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bill not found" });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bill" });
  }
};
