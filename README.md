# Riona-AI für Studibuch.de (Version 1.1.0)

Dieses Paket enthält eine Implementierung von Riona-AI für die Automatisierung von Instagram-Posts für Studibuch.de. Es kombiniert die Generierung von Posts basierend auf **Magazinartikeln** mit der Möglichkeit, Posts zu **beliebigen Themen** zu erstellen.

**Wichtige Änderungen in v1.1.0:**
- **Magazin-Scraper überarbeitet:** Puppeteer wurde durch `axios` und `cheerio` ersetzt, um die Kompatibilität mit Hosting-Plattformen wie Render.com (Free Tier) zu verbessern und Deployment-Probleme zu beheben.
- **Themenbasierte Posts:** Neue Funktion hinzugefügt, um Instagram-Posts basierend auf einem vom Benutzer eingegebenen Thema zu generieren.
- **API-Erweiterungen:** Neue Endpunkte zum Generieren von Themen-Posts und zum manuellen Auslösen des Update-Prozesses.

## Funktionen

- **Magazinartikel-Scraper (axios/cheerio)**: Automatisches Sammeln von Artikeln aus dem Studibuch.de-Magazin (Titel, URL, Inhalt, Bild, Kategorien, Tags).
- **Artikelbasierte Content-Generierung**: Erstellen von Instagram-Posts (Bildunterschrift, Hashtags, Bild) basierend auf gescrapten Magazinartikeln.
- **Themenbasierte Content-Generierung**: Erstellen von Instagram-Posts (Bildunterschrift, Hashtags, Bild) basierend auf einem vom Benutzer eingegebenen Thema.
- **Bildgenerierung**: Automatische Verwendung vorhandener Bilder oder Generierung neuer Bilder (via OpenAI DALL-E, falls API-Key vorhanden, sonst Fallback auf Unsplash/Platzhalter).
- **Admin-Bereich**: Übersichtliche Verwaltung aller Posts mit Instagram-Vorschau (Anpassungen für neue Funktionen ggf. erforderlich).
- **Aktivitäts-Tracking**: Überwachung von Systemaktivitäten.
- **Statistiken**: Visualisierung der Performance (Platzhalter).
- **Multi-Plattform-Vorbereitung**: Grundlage für zukünftige Erweiterungen.

## Voraussetzungen

- Node.js (**Version 18.x oder höher** empfohlen)
- npm (Version 6 oder höher)
- Optional: OpenAI API Key (für DALL-E Bildgenerierung)
- Optional: Instagram-Konto für Studibuch.de (für tatsächliches Posting - *Hinweis: Die Posting-Logik selbst ist noch nicht implementiert*)

## Installation

### Lokale Installation

1.  Klonen Sie dieses Repository oder entpacken Sie das ZIP-Archiv.
2.  Navigieren Sie in das Projektverzeichnis.
3.  Installieren Sie die Abhängigkeiten:
    ```bash
    npm install
    ```
4.  Erstellen Sie eine `.env`-Datei im Hauptverzeichnis (kopieren Sie `.env.example`) mit folgenden Inhalten:
    ```dotenv
    PORT=3000
    # OPENAI_API_KEY=ihr_openai_api_key (optional für Bildgenerierung)
    # INSTAGRAM_USERNAME=ihr_instagram_username (für zukünftige Posting-Funktion)
    # INSTAGRAM_PASSWORD=ihr_instagram_passwort (für zukünftige Posting-Funktion)
    ```
5.  Starten Sie die Anwendung:
    ```bash
    npm start
    ```
6.  Öffnen Sie den Admin-Bereich im Browser:
    ```
    http://localhost:3000
    ```

### Deployment auf Render.com (oder ähnliche Plattformen)

1.  Erstellen Sie einen Account auf [Render.com](https://render.com/) (kostenloser Tier verfügbar).
2.  Verbinden Sie Ihr GitHub-Repository (stellen Sie sicher, dass der Code dort hochgeladen ist).
3.  Erstellen Sie einen neuen "Web Service".
4.  Konfigurieren Sie den Web Service:
    -   Name: z.B. `riona-studibuch`
    -   Environment: Node
    -   Region: Wählen Sie eine passende Region (z.B. Frankfurt)
    -   Branch: `main` (oder Ihr Hauptbranch)
    -   Build Command: `npm install`
    -   Start Command: `npm start`
    -   **Node Version**: Stellen Sie sicher, dass Node.js 18 oder höher ausgewählt ist (kann in den Einstellungen angepasst werden).
5.  Fügen Sie unter "Environment Variables" folgende Variablen hinzu:
    -   `PORT`: `10000` (Render.com verwendet diesen Port standardmäßig)
    -   `NODE_ENV`: `production`
    -   `OPENAI_API_KEY`: (Optional) Ihr OpenAI API-Key.
    -   `INSTAGRAM_USERNAME`, `INSTAGRAM_PASSWORD`: (Optional, für zukünftige Nutzung)
6.  Klicken Sie auf "Create Web Service". Das Deployment sollte nun ohne Puppeteer-Probleme durchlaufen.

## Verwendung

### Admin-Bereich

Der Admin-Bereich (`http://localhost:3000` oder Ihre Render.com-URL) bietet eine Übersicht über:

1.  **Content-Plan**: Geplante Posts (Artikel- und Themen-basiert).
2.  **Post-Vorschau**: Vorschau der Instagram-Posts.
3.  **Magazinartikel**: Liste der zuletzt gescrapten Artikel.
4.  **KI-Aktivitäten**: Protokoll der Systemaktivitäten.
5.  **Bilder**: Übersicht der generierten/heruntergeladenen Bilder.
6.  **Statistiken**: Platzhalter für Performance-Daten.
7.  **Plattformen**: Platzhalter für plattformspezifische Einstellungen.

*Hinweis: Das Frontend wurde möglicherweise noch nicht vollständig an die neuen Funktionen (Themen-Posts) angepasst.* 

### Automatisierungsprozess

1.  **Artikel-Posts**: Die Anwendung scrapt beim Start und danach alle 24 Stunden automatisch Artikel aus dem Studibuch.de-Magazin. Neue Artikel werden analysiert und entsprechende Posts zum Content-Plan hinzugefügt.
2.  **Themen-Posts**: Können manuell über die API oder eine (zukünftige) Funktion im Admin-Bereich ausgelöst werden.
3.  **Planung**: Alle Posts werden mit einem optimalen Veröffentlichungsdatum versehen und im Content-Plan gespeichert (`data/content/content_plan.json`).

### API-Endpunkte

-   `GET /api/content-plan`: Ruft den aktuellen Content-Plan ab.
-   `GET /api/articles`: Ruft die zuletzt gescrapten Artikel ab.
-   `GET /api/images`: Listet verfügbare Bilder auf.
-   `GET /api/activities`: Ruft das Aktivitätsprotokoll ab.
-   `POST /api/update-content-plan`: Speichert einen manuell bearbeiteten Content-Plan (erwartet Array von Posts im Body).
-   **NEU**: `POST /api/generate-topic-post`: Generiert einen Post für ein Thema (erwartet `{ "topic": "Ihr Thema" }` im Body) und fügt ihn zum Plan hinzu.
-   **NEU**: `POST /api/trigger-update`: Löst manuell das Scrapen von Artikeln und die Aktualisierung des Content-Plans aus.

## Anpassung

-   **Scraping (`src/utils/magazineScraper.js`)**: Passen Sie CSS-Selektoren an, falls sich die Struktur von studibuch.de/magazin ändert.
-   **Content-Generierung (`src/utils/contentGenerator.js`)**: Ändern Sie Logik für Bildunterschriften, Hashtags oder Bildgenerierung.
-   **Hauptlogik (`src/index.js`)**: Passen Sie Intervalle, API-Logik oder den Workflow an.
-   **Admin-Oberfläche (`src/public/index.html`)**: Erweitern Sie das Frontend, um z.B. Themen-Posts zu erstellen oder den Content-Plan zu bearbeiten.

## Fehlerbehebung

-   **Keine Artikel gefunden**: Überprüfen Sie die Selektoren in `magazineScraper.js` und die Erreichbarkeit von studibuch.de/magazin.
-   **Deployment-Fehler**: Stellen Sie sicher, dass die Node.js-Version auf dem Server >= 18 ist und alle Umgebungsvariablen korrekt gesetzt sind.

## Lizenz

Dieses Projekt ist urheberrechtlich geschützt und nur für die Verwendung durch Studibuch.de bestimmt.

## Support

Bei Fragen oder Problemen wenden Sie sich bitte an den Support.
