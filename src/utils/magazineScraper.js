const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { URL } = require("url"); // Import URL for resolving relative paths

// Verzeichnis für heruntergeladene Bilder
const IMAGES_DIR = path.join(__dirname, "../data/images");
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Verzeichnis für Artikeldaten
const DATA_DIR = path.join(__dirname, "../data/articles");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Verzeichnis für Debug-Daten (optional, kann beibehalten werden)
const DEBUG_DIR = path.join(__dirname, "../data/debug");
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

// Hilfsfunktion zum Herunterladen von Bildern
async function downloadImage(imageUrl, baseFileName) {
  try {
    // Stelle sicher, dass die URL absolut ist
    const absoluteImageUrl = new URL(imageUrl, "https://studibuch.de").href;
    
    const response = await axios({
      url: absoluteImageUrl,
      responseType: "arraybuffer",
      timeout: 15000 // Timeout für Bild-Downloads
    });

    // Dateiendung aus URL oder Content-Type extrahieren (Fallback auf .jpg)
    let extension = ".jpg";
    const contentType = response.headers["content-type"];
    if (contentType && contentType.startsWith("image/")) {
      extension = "." + contentType.split("/")[1];
    }
    const urlPath = new URL(absoluteImageUrl).pathname;
    const urlExt = path.extname(urlPath);
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(urlExt.toLowerCase())) {
        extension = urlExt;
    }

    const imageFileName = `${baseFileName}${extension}`;
    const imagePath = path.join(IMAGES_DIR, imageFileName);

    fs.writeFileSync(imagePath, response.data);
    console.log(`Bild gespeichert: ${imageFileName}`);
    return imagePath;
  } catch (error) {
    console.error(`Fehler beim Herunterladen des Bildes ${imageUrl}:`, error.message);
    return null;
  }
}

// Funktion zum Scrapen von Magazinartikeln mit axios und cheerio
async function scrapeMagazineArticles() {
  console.log("Starte Scraping von Studibuch.de Magazinartikeln mit axios/cheerio...");
  const magazineUrl = "https://studibuch.de/magazin/";
  const articleContents = [];

  try {
    // 1. Magazin-Homepage laden
    console.log(`Lade Magazin-Homepage: ${magazineUrl}`);
    const response = await axios.get(magazineUrl, { timeout: 15000 });
    const $ = cheerio.load(response.data);

    // Debug: HTML speichern (optional)
    fs.writeFileSync(path.join(DEBUG_DIR, "magazine_homepage_axios.html"), response.data);

    // 2. Artikel-Links extrahieren
    const articleLinks = new Set(); // Verwende ein Set, um Duplikate zu vermeiden
    const selectors = [
      "article a",
      ".post a",
      ".entry a",
      ".blog-post a",
      ".article a",
      ".elementor-post__thumbnail__link", // Selektor für Elementor-basierte Seiten
      ".elementor-post__title a" // Alternativer Selektor für Elementor
    ];

    selectors.forEach(selector => {
      $(selector).each((i, element) => {
        const href = $(element).attr("href");
        // Filtere gültige Artikel-URLs (vermeide Kategorien, Tags, etc.)
        if (href && href.includes("studibuch.de") && !href.includes("/category/") && !href.includes("/tag/") && href.includes("/")) {
            // Stelle sicher, dass die URL absolut ist
            const absoluteUrl = new URL(href, magazineUrl).href;
            articleLinks.add(absoluteUrl);
        }
      });
    });

    console.log(`${articleLinks.size} eindeutige Artikel-Links gefunden`);

    // 3. Einzelne Artikel scrapen (Limit für Testzwecke)
    let count = 0;
    const articleLimit = 15; // Limit für die Anzahl der zu scrapenden Artikel

    for (const articleUrl of articleLinks) {
      if (count >= articleLimit) break;
      
      try {
        console.log(`Scrape Artikel (${count + 1}/${articleLinks.size}): ${articleUrl}`);
        const articleResponse = await axios.get(articleUrl, { timeout: 15000 });
        const $$ = cheerio.load(articleResponse.data);

        // Debug: Artikel-HTML speichern (optional)
        fs.writeFileSync(path.join(DEBUG_DIR, `article_${count}_axios.html`), articleResponse.data);

        // Titel extrahieren
        let title = $$("h1").first().text().trim();
        if (!title) title = $$(".entry-title").first().text().trim();
        if (!title) title = $$(".post-title").first().text().trim();
        if (!title) title = $$("title").first().text().split("|")[0].trim(); // Fallback auf <title>-Tag

        if (!title) {
          console.warn(`Kein Titel gefunden für ${articleUrl}, überspringe Artikel.`);
          continue;
        }

        // Inhalt extrahieren
        let content = "";
        const contentSelectors = [
          ".entry-content",
          ".post-content",
          ".article-content",
          ".content",
          "article .entry",
          ".post-body",
          ".elementor-widget-theme-post-content .elementor-widget-container" // Elementor-Inhalt
        ];
        for (const selector of contentSelectors) {
          const contentEl = $$(selector).first();
          if (contentEl.length > 0) {
            // Entferne unerwünschte Elemente wie Skripte, Styles, Share-Buttons etc.
            contentEl.find("script, style, .sharedaddy, .jp-relatedposts").remove();
            content = contentEl.text().replace(/\s\s+/g, " ").trim(); // Bereinigter Text
            break;
          }
        }
        if (!content) {
            console.warn(`Kein Inhalt gefunden für ${articleUrl}`);
            // Fallback: Gesamten Text extrahieren und bereinigen (weniger präzise)
            $$("script, style, header, footer, nav, aside").remove();
            content = $$("body").text().replace(/\s\s+/g, " ").trim();
        }

        // Bild-URL extrahieren
        let imageUrl = null;
        const imageSelectors = [
          "meta[property='og:image']", // OpenGraph-Bild ist oft das Beste
          ".wp-post-image", // Standard WordPress Beitragsbild
          ".featured-image img",
          ".post-thumbnail img",
          "article img", // Erstes Bild im Artikel
          ".elementor-widget-image img" // Elementor Bild-Widget
        ];
        for (const selector of imageSelectors) {
          const imgEl = $$(selector).first();
          if (imgEl.length > 0) {
            imageUrl = imgEl.attr("content") || imgEl.attr("src") || imgEl.attr("data-src");
            if (imageUrl) break;
          }
        }

        // Kategorien und Tags extrahieren
        const categories = [];
        $$(".cat-links a, .category a, .categories a, a[rel='category tag']").each((i, el) => {
          categories.push($$(el).text().trim());
        });

        const tags = [];
        $$(".tags-links a, .tag a, .tags a, a[rel='tag']").each((i, el) => {
          tags.push($$(el).text().trim());
        });

        // Datum extrahieren
        let date = null;
        const dateSelectors = [
            "meta[property='article:published_time']",
            ".posted-on time", 
            ".date", 
            ".entry-date", 
            ".published"
        ];
        for(const selector of dateSelectors) {
            const dateEl = $$(selector).first();
            if(dateEl.length > 0) {
                date = dateEl.attr("content") || dateEl.attr("datetime") || dateEl.text().trim();
                if(date) break;
            }
        }

        // Artikeldaten sammeln
        const articleData = {
          title: title,
          url: articleUrl,
          content: content.substring(0, 5000), // Inhalt kürzen, falls nötig
          imageUrl: imageUrl || null,
          localImagePath: null,
          categories: categories,
          tags: tags,
          date: date
        };

        // Bild herunterladen
        if (articleData.imageUrl && !articleData.imageUrl.startsWith("data:")) {
          const baseFileName = `article_${count}_${Date.now()}`;
          articleData.localImagePath = await downloadImage(articleData.imageUrl, baseFileName);
        }

        articleContents.push(articleData);
        count++;

      } catch (articleError) {
        console.error(`Fehler beim Scrapen von Artikel ${articleUrl}:`, articleError.message);
      }
    }

    // 4. Alle Artikeldaten speichern
    const articlesFilePath = path.join(DATA_DIR, "articles.json");
    fs.writeFileSync(articlesFilePath, JSON.stringify(articleContents, null, 2));
    console.log(`${articleContents.length} Artikel erfolgreich gescraped und Daten gespeichert in ${articlesFilePath}`);

    return articleContents;

  } catch (error) {
    console.error("Schwerwiegender Fehler beim Scrapen von Artikeln:", error);
    // Bei Fehlern leeres Array zurückgeben oder Fehler weiterwerfen
    return []; 
  }
}

// Exportiere die überarbeitete Funktion
module.exports = {
  scrapeMagazineArticles
};

