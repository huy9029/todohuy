const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let db;

// 🗃️ Kết nối SQLite
(async () => {
  db = await open({
    filename: "./flashcards.db",
    driver: sqlite3.Database,
  });

  // Tạo bảng nếu chưa có
  await db.run(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      front TEXT NOT NULL,
      back TEXT NOT NULL
    )
  `);

  console.log("📚 SQLite database connected (flashcards.db)");
})();

// ✅ Lấy danh sách flashcards
app.get("/api/flashcards", async (req, res) => {
  try {
    const cards = await db.all("SELECT * FROM flashcards ORDER BY id DESC");
    res.json(cards);
  } catch (err) {
    console.error("❌ Error fetching flashcards:", err);
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
});

// ✅ Thêm flashcard mới
app.post("/api/flashcards", async (req, res) => {
  try {
    const { front, back } = req.body;
    if (!front || !back) {
      return res.status(400).json({ error: "Both front and back are required" });
    }

    const result = await db.run(
      "INSERT INTO flashcards (front, back) VALUES (?, ?)",
      [front, back]
    );
    const newCard = await db.get("SELECT * FROM flashcards WHERE id = ?", [
      result.lastID,
    ]);
    res.json(newCard);
  } catch (err) {
    console.error("❌ Error adding flashcard:", err);
    res.status(500).json({ error: "Failed to add flashcard" });
  }
});

// ✅ Cập nhật flashcard
app.put("/api/flashcards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { front, back } = req.body;
    if (!front || !back) {
      return res.status(400).json({ error: "Both front and back are required" });
    }

    await db.run(
      "UPDATE flashcards SET front = ?, back = ? WHERE id = ?",
      [front, back, id]
    );
    const updatedCard = await db.get(
      "SELECT * FROM flashcards WHERE id = ?",
      [id]
    );
    res.json(updatedCard);
  } catch (err) {
    console.error("❌ Error updating flashcard:", err);
    res.status(500).json({ error: "Failed to update flashcard" });
  }
});

// ✅ Xóa flashcard
app.delete("/api/flashcards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM flashcards WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting flashcard:", err);
    res.status(500).json({ error: "Failed to delete flashcard" });
  }
});

// ✅ Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Flashcard backend running on http://localhost:${PORT}`);
});
