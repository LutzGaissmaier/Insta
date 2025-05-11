const reelsConfig = {
    // Creatomate Einstellungen
    creatomate: {
        templateId: process.env.CREATOMATE_TEMPLATE_ID || "867374af-946c-44b4-88a3-8d36e3e51d8e",
        videoSettings: {
            width: 1080,
            height: 1920, // 9:16 Format für Reels
            duration: 30, // Standard-Dauer in Sekunden
            fps: 30
        },
        defaultTextStyle: {
            fontFamily: 'Arial',
            fontSize: 48,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center'
        }
    },

    // Instagram Reels Einstellungen
    instagram: {
        maxDuration: 60, // Maximale Dauer in Sekunden
        minDuration: 15, // Minimale Dauer in Sekunden
        supportedFormats: ['mp4'],
        maxFileSize: 250 * 1024 * 1024, // 250MB in Bytes
        aspectRatio: '9:16'
    },

    // Standard-Übergänge und Effekte
    transitions: {
        defaultTransition: 'fade',
        availableTransitions: ['fade', 'slide', 'zoom', 'wipe']
    },

    // Standard-Musik und Soundeffekte
    audio: {
        defaultMusic: 'background-music-1',
        fadeInDuration: 1, // Sekunden
        fadeOutDuration: 1 // Sekunden
    },

    // Engagement-Einstellungen für Reels
    engagement: {
        autoLike: false,
        autoComment: false,
        maxLikesPerDay: 50,
        maxCommentsPerDay: 20
    }
};

module.exports = reelsConfig; 