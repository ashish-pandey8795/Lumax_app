import express from "express";
import billRoutes from "./routes/bill.routes.js";

const app = express();

app.use(express.json());

app.use("/api/bills", billRoutes);

app.get("/", (req, res) => {
  res.send("Bill API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
