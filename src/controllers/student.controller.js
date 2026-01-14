import { pool } from "../db/index.js";

export const createStudent = async (data) => {
  const { studentName, rollNo, subjectCode, subjectName } = data;

  await pool.query(
    `INSERT INTO students (student_name, roll_no, subject_code, subject_name)
     VALUES ($1,$2,$3,$4)`,
    [studentName, rollNo, subjectCode, subjectName]
  );
};
