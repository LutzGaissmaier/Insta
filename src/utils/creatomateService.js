const axios = require('axios');
const reelsConfig = require('./reelsConfig');

class CreatomateService {
    constructor() {
        this.apiKey = process.env.CREATOMATE_API_KEY;
        this.baseUrl = 'https://api.creatomate.com/v1';
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Generiert ein Video basierend auf einer Vorlage und Modifikationen
     * @param {Object} options - Optionen für die Video-Generierung
     * @returns {Promise<string>} - URL des generierten Videos
     */
    async generateVideo(options) {
        try {
            const {
                templateId = reelsConfig.creatomate.templateId,
                modifications = {},
                duration = reelsConfig.creatomate.videoSettings.duration
            } = options;

            const response = await this.client.post('/renders', {
                template_id: templateId,
                modifications: modifications,
                duration: duration,
                width: reelsConfig.creatomate.videoSettings.width,
                height: reelsConfig.creatomate.videoSettings.height,
                fps: reelsConfig.creatomate.videoSettings.fps
            });

            if (response.data && response.data.id) {
                return await this.waitForRender(response.data.id);
            }

            throw new Error('Keine Render-ID in der Antwort erhalten');
        } catch (error) {
            console.error('Fehler bei der Video-Generierung:', error);
            throw error;
        }
    }

    /**
     * Wartet auf den Abschluss eines Render-Jobs
     * @param {string} renderId - ID des Render-Jobs
     * @returns {Promise<string>} - URL des fertigen Videos
     */
    async waitForRender(renderId) {
        const maxAttempts = 30; // 5 Minuten bei 10 Sekunden Intervall
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const response = await this.client.get(`/renders/${renderId}`);
                const status = response.data.status;

                if (status === 'completed') {
                    return response.data.url;
                } else if (status === 'failed') {
                    throw new Error(`Render fehlgeschlagen: ${response.data.error}`);
                }

                // Warte 10 Sekunden vor dem nächsten Versuch
                await new Promise(resolve => setTimeout(resolve, 10000));
                attempts++;
            } catch (error) {
                console.error('Fehler beim Prüfen des Render-Status:', error);
                throw error;
            }
        }

        throw new Error('Timeout beim Warten auf Video-Generierung');
    }

    /**
     * Erstellt Modifikationen für einen Artikel-basierten Reel
     * @param {Object} article - Artikel-Objekt
     * @returns {Object} - Modifikationen für Creatomate
     */
    createArticleModifications(article) {
        return {
            'Title': article.title,
            'Content': article.content.substring(0, 200) + '...',
            'Image': article.imageUrl,
            'Background Music': reelsConfig.audio.defaultMusic,
            'Transition': reelsConfig.transitions.defaultTransition
        };
    }

    /**
     * Erstellt Modifikationen für einen Themen-basierten Reel
     * @param {string} topic - Das Thema
     * @param {string} imageUrl - URL des Themas-Bildes
     * @returns {Object} - Modifikationen für Creatomate
     */
    createTopicModifications(topic, imageUrl) {
        return {
            'Title': topic,
            'Content': `Heute sprechen wir über: ${topic}`,
            'Image': imageUrl,
            'Background Music': reelsConfig.audio.defaultMusic,
            'Transition': reelsConfig.transitions.defaultTransition
        };
    }
}

module.exports = new CreatomateService(); 