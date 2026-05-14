const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/test")
.then(() => console.log("DB connected"))
.catch(err => console.log(err));

// ✅ Import model
const Schedule = require("./models/Schedule");

// ✅ STEP 3 (paste HERE)
app.get("/test", async (req, res) => {
  const data = await Schedule.find();
  res.json(data);
});

app.post("/add", async (req, res) => {
  try {
    const newData = new Schedule(req.body);
    await newData.save();
    res.send("Saved successfully ✅");
  } catch (err) {
    res.status(500).send(err);
  }
});

// Static files will handle the "/" route automatically from the "public" folder

// server start
app.listen(5000, () => {
  console.log("RUNNING");
});

app.get("/add-test", async (req, res) => {
  const data = new Schedule({
    subject: "Math",
    date: "2026-05-01",
    time: "10:00 AM"
  });

  await data.save();
  res.send("Data added ✅");
});

app.delete("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;

    await Schedule.findByIdAndDelete(id);

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/generate", async (req, res) => {
  try {
    const { colleges, settings, holidays } = req.body;
    const SchedulerEngine = require("./services/SchedulerEngine");

    // Initialize Engine
    const engine = new SchedulerEngine(settings, holidays);

    // Run Engine (CSP Solver)
    const results = engine.generate(colleges);

    // Database Safety: Use a single transaction/atomic update if possible
    // For now, clear and re-insert. Drop collection to clear old unique indexes.
    await Schedule.collection.drop().catch(err => console.log("Collection might not exist yet:", err.message));
    await Schedule.insertMany(results);

    res.json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (err) {
    console.error("Generation Failed:", err);
    res.status(400).json({ 
      success: false,
      message: "Scheduling Conflict Detected",
      error: err.message 
    });
  }
});