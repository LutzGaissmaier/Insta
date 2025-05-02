// Monitoring-Utilities für Riona-AI
const fs = require('fs');
const path = require('path');

// Verzeichnis für Aktivitätsdaten
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Klasse zum Loggen von Aktivitäten der Riona-AI
 */
class ActivityLogger {
  constructor() {
    this.activitiesPath = path.join(DATA_DIR, 'activities.json');
    this.activities = [];
    
    // Bestehende Aktivitäten laden, falls vorhanden
    if (fs.existsSync(this.activitiesPath)) {
      try {
        this.activities = JSON.parse(fs.readFileSync(this.activitiesPath, 'utf8'));
      } catch (error) {
        console.error('Fehler beim Laden der Aktivitäten:', error);
      }
    }
  }
  
  /**
   * Aktivität loggen
   * @param {string} type - Typ der Aktivität (z.B. 'like', 'comment', 'post')
   * @param {string} description - Beschreibung der Aktivität
   * @param {Object} details - Zusätzliche Details zur Aktivität
   */
  logActivity(type, description, details = {}) {
    const activity = {
      type,
      description,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.activities.push(activity);
    this.saveActivities();
    
    console.log(`Aktivität geloggt: ${type} - ${description}`);
    return activity;
  }
  
  /**
   * Aktivitäten speichern
   */
  saveActivities() {
    try {
      fs.writeFileSync(this.activitiesPath, JSON.stringify(this.activities, null, 2));
    } catch (error) {
      console.error('Fehler beim Speichern der Aktivitäten:', error);
    }
  }
  
  /**
   * Alle Aktivitäten abrufen
   * @returns {Array} - Liste aller Aktivitäten
   */
  getActivities() {
    return this.activities;
  }
  
  /**
   * Aktivitäten nach Typ filtern
   * @param {string} type - Typ der Aktivität
   * @returns {Array} - Gefilterte Liste von Aktivitäten
   */
  getActivitiesByType(type) {
    return this.activities.filter(activity => activity.type === type);
  }
  
  /**
   * Aktivitäten nach Zeitraum filtern
   * @param {Date} startDate - Startdatum
   * @param {Date} endDate - Enddatum
   * @returns {Array} - Gefilterte Liste von Aktivitäten
   */
  getActivitiesByTimeRange(startDate, endDate) {
    return this.activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= startDate && activityDate <= endDate;
    });
  }
}

/**
 * Klasse zum Tracken der Performance von Riona-AI
 */
class PerformanceTracker {
  constructor() {
    this.metricsPath = path.join(DATA_DIR, 'metrics.json');
    this.metrics = {};
    
    // Bestehende Metriken laden, falls vorhanden
    if (fs.existsSync(this.metricsPath)) {
      try {
        this.metrics = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8'));
      } catch (error) {
        console.error('Fehler beim Laden der Metriken:', error);
      }
    }
  }
  
  /**
   * Metrik tracken
   * @param {string} name - Name der Metrik
   * @param {number} value - Wert der Metrik
   */
  trackMetric(name, value) {
    if (!this.metrics[name]) {
      this.metrics[name] = {
        values: [],
        average: 0
      };
    }
    
    this.metrics[name].values.push({
      value,
      timestamp: new Date().toISOString()
    });
    
    // Durchschnitt berechnen
    const sum = this.metrics[name].values.reduce((acc, item) => acc + item.value, 0);
    this.metrics[name].average = sum / this.metrics[name].values.length;
    
    this.saveMetrics();
    
    console.log(`Metrik getrackt: ${name} = ${value}`);
    return this.metrics[name];
  }
  
  /**
   * Metriken speichern
   */
  saveMetrics() {
    try {
      fs.writeFileSync(this.metricsPath, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Fehler beim Speichern der Metriken:', error);
    }
  }
  
  /**
   * Alle Metriken abrufen
   * @returns {Object} - Alle Metriken
   */
  getMetrics() {
    return this.metrics;
  }
}

module.exports = {
  ActivityLogger,
  PerformanceTracker
};
