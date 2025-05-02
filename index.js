const express = require("express");
const path = require("path");
const fs = require("fs");
const { scrapeMagazineArticles } = require("./utils/magazineScraper");
const {
  createContentPlanFromArticles,
  generatePostFromTopic,
  loadContentPlan,
  saveContentPlan,
  generateComments // Behalten für mögliche zukünftige Interaktionen
} = require("./utils/contentGenerator");
const { ActivityLogger, PerformanceTracker } = require("./utils/monitoring");

// Express-App erstellen
const app = express();
const PORT = process.env.PORT || 3000;

// Verzeichnisse für Daten
const DATA_DIR = path.join(__dirname, "data");
const CONTENT_DIR = path.join(DATA_DIR, "content");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const ARTICLES_DIR = path.join(DATA_DIR, "articles");

// Sicherstellen, dass die Verzeichnisse existieren
[DATA_DIR, CONTENT_DIR, IMAGES_DIR, ARTICLES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Aktivitätslogger und Performance-Tracker initialisieren
const activityLogger = new ActivityLogger();
const performanceTracker = new PerformanceTracker();

// Statische Dateien bereitstellen
app.use("/images", express.static(IMAGES_DIR));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // Middleware für JSON-Request-Bodies

// --- API-Routen ---

// Bestehenden Content-Plan abrufen
app.get("/api/content-plan", (req, res) => {
  try {
    const contentPlan = loadContentPlan();
    res.json(contentPlan);
  } catch (error) {
    console.error("Fehler beim Abrufen des Content-Plans:", error);
    res.status(500).json({ error: "Fehler beim Abrufen des Content-Plans" });
  }
});

// Gesammelte Artikel abrufen
app.get("/api/articles", (req, res) => {
  try {
    const articlesPath = path.join(ARTICLES_DIR, "articles.json");
    if (fs.existsSync(articlesPath)) {
      const articles = JSON.parse(fs.readFileSync(articlesPath, "utf8"));
      res.json(articles);
    } else {
      res.status(404).json({ error: "Artikel nicht gefunden" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generierte Kommentare abrufen (falls benötigt)
app.get("/api/comments", (req, res) => {
  try {
    const commentsPath = path.join(CONTENT_DIR, "comments.json");
    if (fs.existsSync(commentsPath)) {
      const comments = JSON.parse(fs.readFileSync(commentsPath, "utf8"));
      res.json(comments);
    } else {
      // Generiere Kommentare, wenn Datei nicht existiert
      const comments = generateComments();
      fs.writeFileSync(commentsPath, JSON.stringify(comments, null, 2));
      res.json(comments);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verfügbare Bilder abrufen
app.get("/api/images", (req, res) => {
  try {
    const images = fs.readdirSync(IMAGES_DIR)
      .filter(file => file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".gif") || file.endsWith(".webp"))
      .map(file => `/images/${file}`);
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aktivitäten abrufen
app.get("/api/activities", (req, res) => {
  try {
    const activities = activityLogger.getActivities();
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Performance-Daten abrufen (Platzhalter)
app.get("/api/performance", (req, res) => {
  try {
    // const performance = performanceTracker.getPerformanceData(); // Funktion existiert nicht in monitoring.js
    res.json({ message: "Performance-Tracking noch nicht implementiert" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Content-Plan manuell aktualisieren/speichern (z.B. aus Admin-UI)
app.post("/api/update-content-plan", (req, res) => {
  try {
    const contentPlan = req.body;
    if (!Array.isArray(contentPlan)) {
        return res.status(400).json({ error: "Ungültiges Format für Content-Plan" });
    }
    saveContentPlan(contentPlan);
    activityLogger.logActivity("content_plan_update", "Content-Plan manuell aktualisiert");
    res.json({ success: true });
  } catch (error) {
    console.error("Fehler beim manuellen Update des Content-Plans:", error);
    res.status(500).json({ error: "Fehler beim Speichern des Content-Plans" });
  }
});

// NEU: API-Endpunkt zum Generieren eines Posts basierend auf einem Thema
app.post("/api/generate-topic-post", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Thema fehlt im Request Body" });
  }

  try {
    console.log(`Anfrage zum Generieren eines Posts für Thema erhalten: ${topic}`);
    const newPost = await generatePostFromTopic(topic);
    
    // Lade bestehenden Plan, füge neuen Post hinzu und speichere
    const currentPlan = loadContentPlan();
    currentPlan.push(newPost);
    saveContentPlan(currentPlan);
    
    activityLogger.logActivity("topic_post_generated", `Post für Thema '${topic}' generiert und zum Plan hinzugefügt`);
    res.status(201).json(newPost); // Gebe den neu erstellten Post zurück

  } catch (error) {
    console.error(`Fehler beim Generieren des Posts für Thema '${topic}':`, error);
    activityLogger.logActivity("error", `Fehler bei Themen-Post-Generierung: ${error.message}`);
    res.status(500).json({ error: "Fehler beim Generieren des Posts" });
  }
});

// NEU: API-Endpunkt zum manuellen Auslösen des Scraping- und Planungs-Prozesses
app.post("/api/trigger-update", async (req, res) => {
    try {
        console.log("Manuelles Update angefordert...");
        activityLogger.logActivity("manual_update", "Manuelles Update gestartet");
        await updateContentPlanFromArticles(); // Rufe die aktualisierte Funktion auf
        res.json({ success: true, message: "Update erfolgreich gestartet und abgeschlossen." });
    } catch (error) {
        console.error("Fehler beim manuellen Update:", error);
        activityLogger.logActivity("error", `Fehler beim manuellen Update: ${error.message}`);
        res.status(500).json({ error: "Fehler beim Ausführen des Updates" });
    }
});


// --- Hauptseite ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Kernlogik ---

/**
 * Aktualisiert den Content-Plan basierend auf neuen Magazinartikeln.
 */
async function updateContentPlanFromArticles() {
  try {
    console.log("Starte Update des Content-Plans basierend auf Artikeln...");
    
    // Schritt 1: Magazinartikel sammeln
    const articles = await scrapeMagazineArticles();
    if (!articles || articles.length === 0) {
        console.log("Keine neuen Artikel gefunden oder Fehler beim Scraping.");
        return;
    }
    
    // Schritt 2: Neuen Content-Plan aus Artikeln erstellen
    const newArticlePosts = await createContentPlanFromArticles(articles);
    
    // Schritt 3: Bestehenden Content-Plan laden
    const currentPlan = loadContentPlan();
    
    // Schritt 4: Nur *neue* Artikel-Posts hinzufügen (verhindert Duplikate basierend auf URL)
    const existingArticleUrls = new Set(currentPlan.filter(p => p.type === 'article').map(p => p.url));
    const postsToAdd = newArticlePosts.filter(newPost => !existingArticleUrls.has(newPost.url));
    
    if (postsToAdd.length > 0) {
        console.log(`${postsToAdd.length} neue Artikel-Posts werden zum Plan hinzugefügt.`);
        const updatedPlan = [...currentPlan, ...postsToAdd];
        saveContentPlan(updatedPlan);
        activityLogger.logActivity("content_plan_updated", `${postsToAdd.length} neue Artikel-Posts hinzugefügt`);
    } else {
        console.log("Keine neuen Artikel-Posts zum Hinzufügen gefunden.");
    }

  } catch (error) {
    console.error("Fehler beim Aktualisieren des Content-Plans:", error);
    activityLogger.logActivity("error", `Fehler bei Content-Plan-Aktualisierung: ${error.message}`);
  }
}

// --- Server Start & Regelmäßige Ausführung ---

app.listen(PORT, () => {
  console.log(`Admin-Bereich läuft auf Port ${PORT}`);
  console.log(`Öffnen Sie http://localhost:${PORT} in Ihrem Browser`);
  
  // Führe das Update beim Start einmal aus
  updateContentPlanFromArticles();
  
  // Regelmäßige Aktualisierung (alle 24 Stunden)
  setInterval(() => {
    console.log("Starte regelmäßige Aktualisierung des Content-Plans...");
    updateContentPlanFromArticles();
  }, 24 * 60 * 60 * 1000);
});

