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
const creatomateService = require('./utils/creatomateService');
const instagramReelsService = require('./utils/instagramReelsService');

// Express-App erstellen
const app = express();
const PORT = process.env.PORT || 3000;

// Verzeichnisse für Daten
const DATA_DIR = path.join(__dirname, "data");
const CONTENT_DIR = path.join(DATA_DIR, "content");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const ARTICLES_DIR = path.join(DATA_DIR, "articles");
const REELS_DIR = path.join(DATA_DIR, "reels");

// Sicherstellen, dass die Verzeichnisse existieren
[DATA_DIR, CONTENT_DIR, IMAGES_DIR, ARTICLES_DIR, REELS_DIR].forEach(dir => {
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

// API-Endpunkt zum Generieren eines Posts mit manuellem Datum
app.post("/api/generate-topic-post", async (req, res) => {
    const { topic, scheduledDate, engagement } = req.body;
    if (!topic) {
        return res.status(400).json({ error: "Thema fehlt im Request Body" });
    }

    try {
        console.log(`Anfrage zum Generieren eines Posts für Thema erhalten: ${topic}`);
        const newPost = await generatePostFromTopic(topic, scheduledDate);
        
        // Engagement-Einstellungen anwenden, falls vorhanden
        if (engagement) {
            newPost.engagement = {
                shouldLike: engagement.shouldLike || false,
                shouldComment: engagement.shouldComment || false
            };
        }
        
        // Lade bestehenden Plan, füge neuen Post hinzu und speichere
        const currentPlan = loadContentPlan();
        currentPlan.push(newPost);
        saveContentPlan(currentPlan);
        
        activityLogger.logActivity("topic_post_generated", `Post für Thema '${topic}' generiert und zum Plan hinzugefügt`);
        res.status(201).json(newPost);

    } catch (error) {
        console.error(`Fehler beim Generieren des Posts für Thema '${topic}':`, error);
        activityLogger.logActivity("error", `Fehler bei Themen-Post-Generierung: ${error.message}`);
        res.status(500).json({ error: "Fehler beim Generieren des Posts" });
    }
});

// Neuer API-Endpunkt zum Aktualisieren der Posting-Frequenz
app.post("/api/update-posting-frequency", (req, res) => {
    try {
        const { postsPerDay, minTimeBetweenPosts, activeHours } = req.body;
        const config = require('./utils/config');
        
        if (postsPerDay) config.postingFrequency.postsPerDay = postsPerDay;
        if (minTimeBetweenPosts) config.postingFrequency.minTimeBetweenPosts = minTimeBetweenPosts;
        if (activeHours) {
            if (activeHours.weekdays) config.postingFrequency.activeHours.weekdays = activeHours.weekdays;
            if (activeHours.weekends) config.postingFrequency.activeHours.weekends = activeHours.weekends;
        }
        
        activityLogger.logActivity("config_update", "Posting-Frequenz aktualisiert");
        res.json({ success: true, config: config.postingFrequency });
    } catch (error) {
        console.error("Fehler beim Aktualisieren der Posting-Frequenz:", error);
        res.status(500).json({ error: "Fehler beim Aktualisieren der Konfiguration" });
    }
});

// Neuer API-Endpunkt zum Aktualisieren der Engagement-Einstellungen
app.post("/api/update-engagement-settings", (req, res) => {
    try {
        const { autoLike, autoComment, maxLikesPerDay, maxCommentsPerDay, targetHashtags, targetAccounts } = req.body;
        const config = require('./utils/config');
        
        if (typeof autoLike === 'boolean') config.engagement.autoLike = autoLike;
        if (typeof autoComment === 'boolean') config.engagement.autoComment = autoComment;
        if (maxLikesPerDay) config.engagement.maxLikesPerDay = maxLikesPerDay;
        if (maxCommentsPerDay) config.engagement.maxCommentsPerDay = maxCommentsPerDay;
        if (targetHashtags) config.engagement.targetHashtags = targetHashtags;
        if (targetAccounts) config.engagement.targetAccounts = targetAccounts;
        
        activityLogger.logActivity("config_update", "Engagement-Einstellungen aktualisiert");
        res.json({ success: true, config: config.engagement });
    } catch (error) {
        console.error("Fehler beim Aktualisieren der Engagement-Einstellungen:", error);
        res.status(500).json({ error: "Fehler beim Aktualisieren der Konfiguration" });
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

// API-Endpunkt zum Aktualisieren des Datums eines Posts
app.post("/api/update-post-date/:postId", (req, res) => {
    try {
        const { postId } = req.params;
        const { scheduledDate } = req.body;
        
        if (!scheduledDate) {
            return res.status(400).json({ error: "Datum fehlt im Request Body" });
        }
        
        const contentPlan = loadContentPlan();
        const postIndex = contentPlan.findIndex(p => p.id === postId);
        
        if (postIndex === -1) {
            return res.status(404).json({ error: "Post nicht gefunden" });
        }
        
        contentPlan[postIndex].scheduledDate = scheduledDate;
        saveContentPlan(contentPlan);
        
        activityLogger.logActivity("post_date_updated", `Datum für Post ${postId} aktualisiert`);
        res.json({ success: true });
    } catch (error) {
        console.error("Fehler beim Aktualisieren des Post-Datums:", error);
        res.status(500).json({ error: "Fehler beim Aktualisieren des Datums" });
    }
});

// API-Endpunkt zum Aktualisieren der Engagement-Einstellungen eines Posts
app.post("/api/update-post-engagement/:postId", (req, res) => {
    try {
        const { postId } = req.params;
        const updates = req.body;
        
        const contentPlan = loadContentPlan();
        const postIndex = contentPlan.findIndex(p => p.id === postId);
        
        if (postIndex === -1) {
            return res.status(404).json({ error: "Post nicht gefunden" });
        }
        
        // Engagement-Einstellungen aktualisieren
        if (!contentPlan[postIndex].engagement) {
            contentPlan[postIndex].engagement = {};
        }
        
        Object.assign(contentPlan[postIndex].engagement, updates);
        saveContentPlan(contentPlan);
        
        activityLogger.logActivity("post_engagement_updated", `Engagement-Einstellungen für Post ${postId} aktualisiert`);
        res.json({ success: true });
    } catch (error) {
        console.error("Fehler beim Aktualisieren der Engagement-Einstellungen:", error);
        res.status(500).json({ error: "Fehler beim Aktualisieren der Einstellungen" });
    }
});

// API-Endpunkt zum Generieren eines Reels aus einem Artikel
app.post("/api/generate-reel-from-article", async (req, res) => {
    try {
        const { articleId } = req.body;
        if (!articleId) {
            return res.status(400).json({ error: "Artikel-ID fehlt" });
        }

        // Artikel aus der Datenbank laden
        const articlesPath = path.join(ARTICLES_DIR, "articles.json");
        const articles = JSON.parse(fs.readFileSync(articlesPath, "utf8"));
        const article = articles.find(a => a.id === articleId);

        if (!article) {
            return res.status(404).json({ error: "Artikel nicht gefunden" });
        }

        // Video mit Creatomate generieren
        const modifications = creatomateService.createArticleModifications(article);
        const videoUrl = await creatomateService.generateVideo({ modifications });

        // Reel auf Instagram hochladen
        const creationId = await instagramReelsService.initializeUpload(videoUrl);
        const result = await instagramReelsService.publishReel(creationId);

        activityLogger.logActivity("reel_created", `Reel aus Artikel "${article.title}" erstellt`);
        res.json(result);
    } catch (error) {
        console.error("Fehler beim Generieren des Reels:", error);
        activityLogger.logActivity("error", `Fehler bei Reel-Generierung: ${error.message}`);
        res.status(500).json({ error: "Fehler beim Generieren des Reels" });
    }
});

// API-Endpunkt zum Generieren eines Reels aus einem Thema
app.post("/api/generate-reel-from-topic", async (req, res) => {
    try {
        const { topic, imageUrl } = req.body;
        if (!topic) {
            return res.status(400).json({ error: "Thema fehlt" });
        }

        // Video mit Creatomate generieren
        const modifications = creatomateService.createTopicModifications(topic, imageUrl);
        const videoUrl = await creatomateService.generateVideo({ modifications });

        // Reel auf Instagram hochladen
        const creationId = await instagramReelsService.initializeUpload(videoUrl);
        const result = await instagramReelsService.publishReel(creationId);

        activityLogger.logActivity("reel_created", `Reel zum Thema "${topic}" erstellt`);
        res.json(result);
    } catch (error) {
        console.error("Fehler beim Generieren des Reels:", error);
        activityLogger.logActivity("error", `Fehler bei Reel-Generierung: ${error.message}`);
        res.status(500).json({ error: "Fehler beim Generieren des Reels" });
    }
});

// API-Endpunkt zum Prüfen des Status eines Reels
app.get("/api/reel-status/:creationId", async (req, res) => {
    try {
        const { creationId } = req.params;
        const status = await instagramReelsService.checkUploadStatus(creationId);
        res.json({ status });
    } catch (error) {
        console.error("Fehler beim Prüfen des Reel-Status:", error);
        res.status(500).json({ error: "Fehler beim Prüfen des Status" });
    }
});

// API-Endpunkt zum Löschen eines Reels
app.delete("/api/reels/:postId", async (req, res) => {
    try {
        const { postId } = req.params;
        await instagramReelsService.deleteReel(postId);
        activityLogger.logActivity("reel_deleted", `Reel ${postId} gelöscht`);
        res.json({ success: true });
    } catch (error) {
        console.error("Fehler beim Löschen des Reels:", error);
        res.status(500).json({ error: "Fehler beim Löschen des Reels" });
    }
});

// API-Endpunkt zum Abrufen der Reels-Liste
app.get("/api/reels", async (req, res) => {
    try {
        const reelsPath = path.join(DATA_DIR, "reels.json");
        let reels = [];
        
        if (fs.existsSync(reelsPath)) {
            reels = JSON.parse(fs.readFileSync(reelsPath, "utf8"));
        }
        
        res.json(reels);
    } catch (error) {
        console.error("Fehler beim Abrufen der Reels:", error);
        res.status(500).json({ error: "Fehler beim Abrufen der Reels" });
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

