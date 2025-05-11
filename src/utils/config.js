/**
 * Erforderliche Umgebungsvariablen:
 * 
 * Creatomate API:
 * - CREATOMATE_API_KEY: API-Schlüssel für Creatomate
 * - CREATOMATE_TEMPLATE_ID: ID der zu verwendenden Video-Vorlage
 * 
 * Instagram Graph API:
 * - INSTAGRAM_ACCESS_TOKEN: Zugriffstoken für die Instagram Graph API
 * - FACEBOOK_PAGE_ID: ID der Facebook-Seite
 * - INSTAGRAM_ACCOUNT_ID: ID des Instagram-Kontos
 * 
 * OpenAI API:
 * - OPENAI_API_KEY: API-Schlüssel für OpenAI
 * 
 * Server:
 * - PORT: Port für den Server (Standard: 3000)
 */

const config = {
    // Posting-Frequenz-Einstellungen
    postingFrequency: {
        postsPerDay: 0.5, // Standard: 2-3 Posts pro Woche (0.5 Posts pro Tag)
        minTimeBetweenPosts: 48, // Mindestzeit zwischen Posts in Stunden (2 Tage)
        activeHours: {
            weekdays: [8, 12, 17, 19, 21], // Aktive Stunden an Wochentagen
            weekends: [10, 13, 15, 20, 22] // Aktive Stunden am Wochenende
        }
    },
    
    // Engagement-Einstellungen
    engagement: {
        autoLike: false, // Automatisches Liken deaktiviert
        autoComment: false, // Automatisches Kommentieren deaktiviert
        maxLikesPerDay: 50, // Maximale Anzahl an Likes pro Tag
        maxCommentsPerDay: 20, // Maximale Anzahl an Kommentaren pro Tag
        targetHashtags: [], // Ziel-Hashtags für Engagement
        targetAccounts: [] // Ziel-Accounts für Engagement
    }
};

module.exports = config; 