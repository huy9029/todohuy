import React, { useEffect, useState } from "react";
import "./flashcards.css";

interface Flashcard {
  id: number;
  front: string;
  back: string;
}

const Flashcards: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // --- NEW: voice handling ---
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const populateVoices = () => {
    const voices = speechSynthesis.getVoices();
    const googleVoice =
      voices.find((v) => v.lang === "en-US" && v.name.includes("Google")) ||
      voices.find((v) => v.lang === "en-US");
    setSelectedVoice(googleVoice || null);
  };

  useEffect(() => {
    populateVoices();
    // Một số trình duyệt (như Chrome) cần lắng nghe sự kiện này để load giọng
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  // Fetch cards
  const fetchCards = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/flashcards");
      const data = await res.json();
      setCards(data);
    } catch (err) {
      console.error("Failed to fetch cards", err);
    }
  };
  useEffect(() => {
    fetchCards();
  }, []);

  // Add or update
  const saveCard = async () => {
    if (!front.trim() || !back.trim()) return alert("Fill both fields");
    if (editingId) {
      try {
        const res = await fetch(`http://localhost:4000/api/flashcards/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ front, back }),
        });
        const updated = await res.json();
        setCards((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        setEditingId(null);
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        const res = await fetch("http://localhost:4000/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ front, back }),
        });
        const newCard = await res.json();
        setCards((prev) => [newCard, ...prev]);
      } catch (err) {
        console.error(err);
      }
    }
    setFront("");
    setBack("");
  };

  // Delete
  const deleteCard = async (id: number) => {
    if (!confirm("Delete this flashcard?")) return;
    try {
      await fetch(`http://localhost:4000/api/flashcards/${id}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Edit
  const editCard = (card: Flashcard) => {
    setFront(card.front);
    setBack(card.back);
    setEditingId(card.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- UPDATED Speak function ---
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return alert("SpeechSynthesis not supported");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    if (selectedVoice) u.voice = selectedVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const handleFlip = (id: number) => {
    if (flippedCard === id) {
      setTimeout(() => setFlippedCard(null), 900);
    } else {
      setFlippedCard(id);
    }
  };

  const handleSearchClick = () => setSearchTerm(query.trim());
  const handleClearSearch = () => {
    setQuery("");
    setSearchTerm("");
  };
  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearchClick();
  };

  const filteredCards = cards.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q);
  });

  return (
    <div className="flashcard-container">
      <header>
        <h1>📘 English Flashcards</h1>
        <div className="header-right">
          <div className="search-row">
            <input
              className="search-input"
              type="text"
              placeholder="Tìm kiếm từ hoặc nghĩa..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDownSearch}
              aria-label="Search flashcards"
            />
            <button className="search-btn" onClick={handleSearchClick} title="Search">
              🔍
            </button>
            <button className="clear-btn" onClick={handleClearSearch} title="Clear">
              ✖
            </button>
          </div>

          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </header>

      {/* Add / Edit form */}
      <div className="add-card">
        <input
          type="text"
          placeholder="Từ tiếng Anh..."
          value={front}
          onChange={(e) => setFront(e.target.value)}
        />
        <input
          type="text"
          placeholder="Nghĩa tiếng Việt..."
          value={back}
          onChange={(e) => setBack(e.target.value)}
        />
        <button onClick={saveCard}>{editingId ? "💾 Cập nhật" : "➕ Thêm"}</button>
        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setFront("");
              setBack("");
            }}
            className="cancel-btn"
          >
            Hủy
          </button>
        )}
      </div>

      {/* Card grid */}
      <div className="card-grid">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className={`card ${flippedCard === card.id ? "flipped" : ""}`}
            onClick={() => handleFlip(card.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleFlip(card.id);
            }}
          >
            <div className="card-inner">
              <div className="card-front">
                <div className="card-text">{card.front}</div>
                <div className="card-actions">
                  <button
                    className="speak-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(card.front);
                    }}
                  >
                    🔊
                  </button>
                  <button
                    className="edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      editCard(card);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCard(card.id);
                    }}
                  >
                    ❌
                  </button>
                </div>
              </div>

              {/* --- BACK side without speak button --- */}
              <div className="card-back">
                <div className="card-text">{card.back}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && <p className="no-result">Không tìm thấy flashcards.</p>}
    </div>
  );
};

export default Flashcards;
