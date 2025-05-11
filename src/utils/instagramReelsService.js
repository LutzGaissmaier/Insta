const axios = require('axios');
const fs = require('fs');
const path = require('path');
const reelsConfig = require('./reelsConfig');

class InstagramReelsService {
    constructor() {
        this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        this.pageId = process.env.FACEBOOK_PAGE_ID;
        this.instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
        this.baseUrl = 'https://graph.facebook.com/v18.0';
        this.client = axios.create({
            baseURL: this.baseUrl,
            params: {
                access_token: this.accessToken
            }
        });
    }

    /**
     * Initialisiert eine Upload-Session für ein Reel
     * @param {string} videoUrl - URL des Videos
     * @returns {Promise<string>} - Upload-URL
     */
    async initializeUpload(videoUrl) {
        try {
            // Video herunterladen
            const videoResponse = await axios({
                url: videoUrl,
                responseType: 'arraybuffer'
            });

            const videoBuffer = Buffer.from(videoResponse.data);
            const videoSize = videoBuffer.length;

            // Upload-Session initialisieren
            const response = await this.client.post(`/${this.instagramAccountId}/media`, {
                media_type: 'REELS',
                video_url: videoUrl,
                caption: 'Neuer Reel von Studibuch.de',
                share_to_feed: true
            });

            if (response.data && response.data.id) {
                return response.data.id;
            }

            throw new Error('Keine Upload-Session-ID erhalten');
        } catch (error) {
            console.error('Fehler beim Initialisieren des Uploads:', error);
            throw error;
        }
    }

    /**
     * Veröffentlicht ein Reel
     * @param {string} creationId - ID der erstellten Media
     * @returns {Promise<Object>} - Veröffentlichungs-Ergebnis
     */
    async publishReel(creationId) {
        try {
            const response = await this.client.post(`/${this.instagramAccountId}/media_publish`, {
                creation_id: creationId
            });

            if (response.data && response.data.id) {
                return {
                    success: true,
                    postId: response.data.id,
                    permalink: `https://www.instagram.com/p/${response.data.id}/`
                };
            }

            throw new Error('Fehler beim Veröffentlichen des Reels');
        } catch (error) {
            console.error('Fehler beim Veröffentlichen des Reels:', error);
            throw error;
        }
    }

    /**
     * Prüft den Status eines Reel-Uploads
     * @param {string} creationId - ID der erstellten Media
     * @returns {Promise<string>} - Status des Uploads
     */
    async checkUploadStatus(creationId) {
        try {
            const response = await this.client.get(`/${creationId}`);
            return response.data.status;
        } catch (error) {
            console.error('Fehler beim Prüfen des Upload-Status:', error);
            throw error;
        }
    }

    /**
     * Löscht ein Reel
     * @param {string} postId - ID des Posts
     * @returns {Promise<boolean>} - Erfolg der Löschung
     */
    async deleteReel(postId) {
        try {
            await this.client.delete(`/${postId}`);
            return true;
        } catch (error) {
            console.error('Fehler beim Löschen des Reels:', error);
            throw error;
        }
    }
}

module.exports = new InstagramReelsService(); 