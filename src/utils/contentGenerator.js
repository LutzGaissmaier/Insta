// Content-Generator für Riona-AI
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
const axios = require("axios");
const config = require('./config');

// Verzeichnisse für Content-Daten
const DATA_DIR = path.join(__dirname, "../data");
const CONTENT_DIR = path.join(DATA_DIR, "content");
const IMAGES_DIR = path.join(DATA_DIR, "images");

// Sicherstellen, dass die Verzeichnisse existieren
[DATA_DIR, CONTENT_DIR, IMAGES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// --- Hilfsfunktionen (unverändert) ---

/**
 * Funktion zur Generierung einer Bildunterschrift für einen Artikel
 * @param {Object} article - Artikel-Objekt
 * @returns {string} - Generierte Bildunterschrift
 */
function generateCaption(article) {
  const captions = [
    `📚 ${article.title} - Neuer Artikel in unserem Magazin! Schau vorbei auf studibuch.de`,
    `Wusstest du schon? ${article.title} - Alle Details in unserem Magazin! Link in Bio.`,
    `${article.title} - Lies den vollständigen Artikel in unserem Magazin und entdecke mehr!`,
    `Neuer Artikel: ${article.title} - Jetzt auf unserem Blog verfügbar! Klick den Link in der Bio.`,
    `Spannende Einblicke: ${article.title} - Mehr dazu in unserem Magazin auf studibuch.de`
  ];
  
  return captions[Math.floor(Math.random() * captions.length)];
}

/**
 * Funktion zur Generierung von Hashtags für einen Artikel
 * @param {Object} article - Artikel-Objekt
 * @returns {Array} - Liste von Hashtags
 */
function generateHashtags(article) {
  const commonHashtags = [
    "#studibuch", 
    "#studentenleben", 
    "#studium", 
    "#bücher", 
    "#nachhaltigkeit", 
    "#gebrauchtbücher", 
    "#sparen", 
    "#studieren"
  ];
  
  const specificHashtags = [];
  
  // Aus Titel
  const titleWords = article.title.toLowerCase()
    .replace(/[^\wäöüß]/g, " ")
    .split(" ")
    .filter(word => word.length > 3); // Kürzere Wörter zulassen
  
  for (const word of titleWords) {
    if (!specificHashtags.includes(`#${word}`)) {
      specificHashtags.push(`#${word}`);
    }
  }
  
  // Aus Kategorien und Tags
  if (article.categories) {
    for (const category of article.categories) {
      const categoryTag = `#${category.toLowerCase().replace(/\s+/g, "")}`;
      if (!specificHashtags.includes(categoryTag)) {
        specificHashtags.push(categoryTag);
      }
    }
  }
  
  if (article.tags) {
    for (const tag of article.tags) {
      const hashTag = `#${tag.toLowerCase().replace(/\s+/g, "")}`;
      if (!specificHashtags.includes(hashTag)) {
        specificHashtags.push(hashTag);
      }
    }
  }
  
  const allHashtags = [...commonHashtags];
  
  // Füge spezifische Hashtags hinzu (maximal 7)
  for (const tag of specificHashtags.slice(0, 7)) {
    if (!allHashtags.includes(tag)) {
      allHashtags.push(tag);
    }
  }
  
  // Maximal 15 Hashtags zurückgeben
  return allHashtags.slice(0, 15);
}

/**
 * Funktion zur Generierung eines Bildes für einen Artikel oder ein Thema
 * @param {Object} item - Artikel-Objekt oder Objekt mit { title: string }
 * @returns {string} - Pfad zum generierten Bild
 */
async function generateImage(item) {
  const title = item.title || "Studibuch Thema";
  console.log(`Generiere Bild für: ${title}`);
  
  try {
    // Wenn OpenAI API-Key vorhanden ist, verwende DALL-E
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const response = await openai.images.generate({
        prompt: `Ein ansprechendes Bild zum Thema "${title}" im Kontext von Studium, Büchern und Nachhaltigkeit. Stil: modern, ansprechend für Instagram.`,
        n: 1,
        size: "1024x1024"
      });
      
      const imageUrl = response.data[0].url;
      
      // Bild herunterladen
      const imageResponse = await axios({
        url: imageUrl,
        responseType: "arraybuffer"
      });
      
      const imageFileName = `generated_${Date.now()}.jpg`;
      const imagePath = path.join(IMAGES_DIR, imageFileName);
      
      fs.writeFileSync(imagePath, imageResponse.data);
      console.log(`Generiertes Bild gespeichert: ${imageFileName}`);
      
      return imagePath;
    } else {
      // Fallback: Verwende ein Platzhalterbild von Unsplash
      console.log("Kein OpenAI API-Key gefunden, verwende Unsplash-Platzhalterbild");
      
      const placeholderUrl = `https://source.unsplash.com/random/1080x1080/?books,study,${encodeURIComponent(title)}`;
      
      const imageResponse = await axios({
        url: placeholderUrl,
        responseType: "arraybuffer"
      });
      
      const imageFileName = `placeholder_${Date.now()}.jpg`;
      const imagePath = path.join(IMAGES_DIR, imageFileName);
      
      fs.writeFileSync(imagePath, imageResponse.data);
      console.log(`Platzhalterbild gespeichert: ${imageFileName}`);
      
      return imagePath;
    }
  } catch (error) {
    console.error("Fehler bei der Bildgenerierung:", error);
    
    // Fallback: Verwende ein Standard-Platzhalterbild
    const placeholderPath = path.join(IMAGES_DIR, "default_placeholder.jpg");
    
    if (!fs.existsSync(placeholderPath)) {
      try {
        const placeholderUrl = "https://via.placeholder.com/1080x1080/007bff/ffffff?text=Studibuch.de";
        const imageResponse = await axios({ url: placeholderUrl, responseType: "arraybuffer" });
        fs.writeFileSync(placeholderPath, imageResponse.data);
        console.log("Standard-Platzhalterbild erstellt");
      } catch (placeholderError) {
        console.error("Fehler beim Erstellen des Standard-Platzhalterbildes:", placeholderError);
      }
    }
    return placeholderPath;
  }
}

/**
 * Funktion zur Generierung von Kommentaren für Interaktionen (unverändert)
 */
function generateComments(count = 20) {
  const comments = [
    "Super Beitrag! 👍",
    "Danke für die Infos! 🙏",
    "Das ist wirklich hilfreich für Studierende!",
    "Toller Tipp, werde ich ausprobieren!",
    "Genau was ich gesucht habe!",
    "Sehr interessant, danke fürs Teilen!",
    "Das hätte ich früher im Studium gebraucht 😄",
    "Kann ich nur empfehlen!",
    "Macht weiter so mit den guten Inhalten!",
    "Studibuch.de ist einfach super für Studierende!",
    "Spare immer viel Geld dank euch!",
    "Nachhaltig und günstig - perfekte Kombination!",
    "Tolle Plattform für Studierende!",
    "Danke für die wertvollen Tipps!",
    "Werde ich meinen Kommilitonen empfehlen!",
    "Endlich eine gute Lösung für gebrauchte Fachbücher!",
    "Hat mir im letzten Semester sehr geholfen!",
    "Klasse Artikel, mehr davon bitte! 📚",
    "Studibuch ist meine erste Anlaufstelle für Bücher geworden",
    "Super Preis-Leistungs-Verhältnis bei euch!",
    "Schneller Versand und top Qualität wie immer!",
    "Bin schon gespannt auf den nächsten Artikel!",
    "Hilft mir sehr bei der Prüfungsvorbereitung!",
    "Einfach und unkompliziert - so muss es sein!",
    "Mein Bücherregal dankt euch 😊",
    "Perfekt für den kleinen Geldbeutel!",
    "Umweltfreundlich und praktisch zugleich",
    "Weiter so! 👏",
    "Tolles Konzept!",
    "Bin begeistert von eurem Service!"
  ];
  
  const selectedComments = [];
  const availableComments = [...comments];
  
  for (let i = 0; i < Math.min(count, availableComments.length); i++) {
    const randomIndex = Math.floor(Math.random() * availableComments.length);
    selectedComments.push(availableComments[randomIndex]);
    availableComments.splice(randomIndex, 1);
  }
  
  return selectedComments;
}

/**
 * Funktion zur Bestimmung einer optimalen Posting-Zeit
 * @param {Date} [manualDate] - Optional: Manuell festgelegtes Datum
 * @returns {string} - ISO-String des Datums
 */
function getOptimalPostingTime(manualDate = null) {
    if (manualDate) {
        return new Date(manualDate).toISOString();
    }

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + Math.floor(Math.random() * 14) + 1);
    
    const isWeekend = futureDate.getDay() === 0 || futureDate.getDay() === 6;
    const hours = isWeekend ? config.postingFrequency.activeHours.weekends : config.postingFrequency.activeHours.weekdays;
    
    futureDate.setHours(
        hours[Math.floor(Math.random() * hours.length)],
        Math.floor(Math.random() * 60),
        0, 0
    );
    
    return futureDate.toISOString();
}

// --- Neue Funktionen für Themen-Posts ---

/**
 * Generiert eine einfache Bildunterschrift basierend auf einem Thema.
 * @param {string} topic - Das Thema für den Post.
 * @returns {string} - Generierte Bildunterschrift.
 */
function generateCaptionFromTopic(topic) {
  const templates = [
    `🤔 Was denkt ihr über "${topic}"? Teilt eure Gedanken! #studibuch #diskussion`, 
    `Heute im Fokus: ${topic}. Ein wichtiges Thema für Studierende! #studium #{topic_hashtag}`, 
    `Lasst uns über ${topic} sprechen! Eure Meinung ist gefragt. #studentenleben`, 
    `💡 Zum Nachdenken: ${topic}. #inspiration #studibuch`, 
    `"${topic}" - relevant für uns alle. Mehr dazu bald? #wissen #studieren`
  ];
  let caption = templates[Math.floor(Math.random() * templates.length)];
  // Ersetze Platzhalter für Hashtag
  const topicHashtag = topic.toLowerCase().replace(/[^a-z0-9äöüß]/g, "").substring(0, 20);
  caption = caption.replace("#{topic_hashtag}", `#${topicHashtag}`);
  return caption;
}

/**
 * Generiert Hashtags basierend auf einem Thema.
 * @param {string} topic - Das Thema für den Post.
 * @returns {Array<string>} - Liste von Hashtags.
 */
function generateHashtagsFromTopic(topic) {
  const commonHashtags = [
    "#studibuch", 
    "#studentenleben", 
    "#studium", 
    "#bildung", 
    "#diskussion", 
    "#wissen"
  ];
  const topicWords = topic.toLowerCase().replace(/[^\wäöüß]/g, " ").split(" ").filter(w => w.length > 3);
  const topicHashtags = topicWords.map(w => `#${w}`).slice(0, 5); // Max 5 Hashtags aus dem Thema
  
  const allHashtags = [...commonHashtags, ...topicHashtags];
  // Entferne Duplikate und beschränke auf 15
  return [...new Set(allHashtags)].slice(0, 15);
}

/**
 * Erstellt einen einzelnen Post basierend auf einem Thema.
 * @param {string} topic - Das Thema für den Post
 * @param {Date} [scheduledDate] - Optional: Manuell festgelegtes Datum
 * @returns {Promise<Object>} - Das generierte Post-Objekt
 */
async function generatePostFromTopic(topic, scheduledDate = null) {
    console.log(`Generiere Post für Thema: ${topic}`);
    
    const caption = generateCaptionFromTopic(topic);
    const hashtags = generateHashtagsFromTopic(topic);
    const imagePath = await generateImage({ title: topic });

    const post = {
        type: "topic",
        title: topic,
        imageUrl: null,
        localImagePath: imagePath,
        caption: caption,
        hashtags: hashtags,
        fullCaption: `${caption}\n\n${hashtags.join(" ")}`,
        url: null,
        scheduledDate: getOptimalPostingTime(scheduledDate),
        status: "scheduled",
        engagement: {
            shouldLike: false,
            shouldComment: false
        }
    };

    console.log(`Post für Thema "${topic}" erstellt.`);
    return post;
}

// --- Hauptfunktionen (angepasst) ---

/**
 * Funktion zur Erstellung eines Content-Plans basierend auf Magazinartikeln.
 * @param {Array} articles - Liste der Magazinartikel
 * @returns {Promise<Object>} - Content-Plan und Kommentare
 */
async function createContentPlanFromArticles(articles) {
  console.log(`Erstelle Content-Plan aus ${articles.length} Artikeln`);
  const contentPlan = [];
  
  for (const article of articles) {
    const caption = generateCaption(article);
    const hashtags = generateHashtags(article);
    let imagePath = article.localImagePath;
    if (!imagePath) {
      imagePath = await generateImage(article);
    }
    
    contentPlan.push({
      type: "article",
      title: article.title,
      imageUrl: article.imageUrl,
      localImagePath: imagePath,
      caption: caption,
      hashtags: hashtags,
      fullCaption: `${caption}\n\n${hashtags.join(" ")}`,
      url: article.url,
      scheduledDate: getOptimalPostingTime(),
      status: "scheduled"
    });
  }
  
  // Content-Plan nach Datum sortieren
  contentPlan.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  
  // Content-Plan speichern (oder zurückgeben zum Zusammenführen)
  // const contentPlanPath = path.join(CONTENT_DIR, 'content_plan.json');
  // fs.writeFileSync(contentPlanPath, JSON.stringify(contentPlan, null, 2));
  
  console.log(`Content-Plan mit ${contentPlan.length} Artikel-Posts erstellt.`);
  return contentPlan;
}

/**
 * Lädt den aktuellen Content-Plan aus der Datei.
 * @returns {Array} - Der aktuelle Content-Plan.
 */
function loadContentPlan() {
  const contentPlanPath = path.join(CONTENT_DIR, "content_plan.json");
  if (fs.existsSync(contentPlanPath)) {
    try {
      return JSON.parse(fs.readFileSync(contentPlanPath, "utf8"));
    } catch (error) {
      console.error("Fehler beim Laden des Content-Plans:", error);
      return [];
    }
  } else {
    return [];
  }
}

/**
 * Speichert den Content-Plan in der Datei.
 * @param {Array} contentPlan - Der zu speichernde Content-Plan.
 */
function saveContentPlan(contentPlan) {
  const contentPlanPath = path.join(CONTENT_DIR, "content_plan.json");
  try {
    // Nach Datum sortieren vor dem Speichern
    contentPlan.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    fs.writeFileSync(contentPlanPath, JSON.stringify(contentPlan, null, 2));
    console.log(`Content-Plan mit ${contentPlan.length} Posts gespeichert.`);
  } catch (error) {
    console.error("Fehler beim Speichern des Content-Plans:", error);
  }
}


module.exports = {
  createContentPlanFromArticles,
  generatePostFromTopic,
  loadContentPlan,
  saveContentPlan,
  generateComments,
  getOptimalPostingTime
};

