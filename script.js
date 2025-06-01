// Battery Charging Detector App
// This application monitors battery level and provides voice alerts

class BatteryMonitor {
    constructor() {
        // DOM elements
        this.batteryLevel = document.getElementById('batteryLevel');
        this.batteryPercentage = document.getElementById('batteryPercentage');
        this.chargingStatus = document.getElementById('chargingStatus');
        this.chargingTime = document.getElementById('chargingTime');
        this.dischargingTime = document.getElementById('dischargingTime');
        this.chargingIndicator = document.getElementById('chargingIndicator');
        this.statusMessage = document.getElementById('statusMessage');
        this.alertContainer = document.getElementById('alertContainer');
        this.warningAlert = document.getElementById('warningAlert');
        this.dismissBtn = document.getElementById('dismissBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.testAlertBtn = document.getElementById('testAlertBtn');
        this.toggleSoundBtn = document.getElementById('toggleSoundBtn');
        this.soundIcon = document.getElementById('soundIcon');
        this.soundText = document.getElementById('soundText');
        this.troubleshootingPanel = document.getElementById('troubleshootingPanel');

        // Application state
        this.battery = null;
        this.isMonitoring = false;
        this.soundEnabled = true;
        this.lastAlertTime = 0;
        this.alertCooldown = 30000; // 30 seconds cooldown between alerts
        this.hasShownWarning = false;

        // Voice synthesis
        this.synth = window.speechSynthesis;
        this.voiceMessage = "Battery is over 90 percent. Please unplug the charger.";

        // Initialize the application
        this.init();
    }

    /**
     * Initialize the battery monitor application
     */
    async init() {
        this.updateStatusMessage('Initializing battery monitoring...', 'info');
        this.setupEventListeners();
        this.checkBrowserSupport();
        await this.initializeBatteryAPI();
    }

    /**
     * Set up event listeners for user interactions
     */
    setupEventListeners() {
        // Refresh button
        this.refreshBtn.addEventListener('click', () => {
            this.refreshBatteryStatus();
        });

        // Test alert button
        this.testAlertBtn.addEventListener('click', () => {
            this.testVoiceAlert();
        });

        // Toggle sound button
        this.toggleSoundBtn.addEventListener('click', () => {
            this.toggleSound();
        });

        // Dismiss alert button
        this.dismissBtn.addEventListener('click', () => {
            this.dismissAlert();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.refreshBatteryStatus();
            }
            if (e.key === 't' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.testVoiceAlert();
            }
        });
    }

    /**
     * Check browser support for required APIs
     */
    checkBrowserSupport() {
        const support = {
            battery: 'getBattery' in navigator || 'battery' in navigator,
            speech: 'speechSynthesis' in window,
            getUserMedia: 'getUserMedia' in navigator.mediaDevices
        };

        console.log('Browser Support:', support);

        if (!support.battery) {
            this.showTroubleshootingPanel();
            this.updateStatusMessage(
                'Battery Status API is not supported in this browser. Please try Chrome, Edge, or Opera.',
                'error'
            );
            return false;
        }

        if (!support.speech) {
            this.updateStatusMessage(
                'Web Speech API is not supported. Voice alerts will not work.',
                'warning'
            );
        }

        return true;
    }

    /**
     * Initialize the Battery Status API
     */
    async initializeBatteryAPI() {
        try {
            // Try the modern approach first
            if ('getBattery' in navigator) {
                this.battery = await navigator.getBattery();
            } 
            // Fallback for older implementations
            else if ('battery' in navigator) {
                this.battery = navigator.battery;
            }
            // Last resort for webkit-based browsers
            else if ('webkitBattery' in navigator) {
                this.battery = navigator.webkitBattery;
            }

            if (this.battery) {
                this.setupBatteryEventListeners();
                this.updateBatteryDisplay();
                this.startMonitoring();
                this.updateStatusMessage('Battery monitoring active', 'success');
            } else {
                throw new Error('Battery API not available');
            }

        } catch (error) {
            console.error('Failed to initialize battery API:', error);
            this.handleBatteryAPIError(error);
        }
    }

    /**
     * Set up event listeners for battery status changes
     */
    setupBatteryEventListeners() {
        if (!this.battery) return;

        // Listen for battery level changes
        this.battery.addEventListener('levelchange', () => {
            this.updateBatteryDisplay();
            this.checkBatteryLevel();
        });

        // Listen for charging status changes
        this.battery.addEventListener('chargingchange', () => {
            this.updateBatteryDisplay();
            this.checkBatteryLevel();
        });

        // Listen for charging time changes
        this.battery.addEventListener('chargingtimechange', () => {
            this.updateBatteryDisplay();
        });

        // Listen for discharging time changes
        this.battery.addEventListener('dischargingtimechange', () => {
            this.updateBatteryDisplay();
        });
    }

    /**
     * Update the battery display with current information
     */
    updateBatteryDisplay() {
        if (!this.battery) return;

        try {
            const level = Math.round(this.battery.level * 100);
            const isCharging = this.battery.charging;
            const chargingTime = this.battery.chargingTime;
            const dischargingTime = this.battery.dischargingTime;

            // Update battery level visual
            this.batteryLevel.style.width = `${level}%`;
            
            // Update battery level color based on percentage
            if (level <= 20) {
                this.batteryLevel.style.background = `hsl(var(--danger))`;
            } else if (level <= 50) {
                this.batteryLevel.style.background = `hsl(var(--warning))`;
            } else {
                this.batteryLevel.style.background = `hsl(var(--success))`;
            }

            // Update percentage display
            this.batteryPercentage.textContent = `${level}%`;
            this.batteryPercentage.className = `value ${this.getBatteryLevelClass(level)}`;

            // Update charging status
            this.chargingStatus.textContent = isCharging ? 'Charging' : 'Not Charging';
            this.chargingStatus.className = `value ${isCharging ? 'text-success' : 'text-warning'}`;

            // Update charging indicator
            if (isCharging) {
                this.chargingIndicator.classList.add('active');
            } else {
                this.chargingIndicator.classList.remove('active');
            }

            // Update charging time
            if (isCharging && isFinite(chargingTime)) {
                this.chargingTime.textContent = this.formatTime(chargingTime);
            } else {
                this.chargingTime.textContent = isCharging ? 'Calculating...' : '--';
            }

            // Update discharging time
            if (!isCharging && isFinite(dischargingTime)) {
                this.dischargingTime.textContent = this.formatTime(dischargingTime);
            } else {
                this.dischargingTime.textContent = !isCharging ? 'Calculating...' : '--';
            }

            // Update page title with battery level
            document.title = `Battery Monitor (${level}% ${isCharging ? '⚡' : '🔋'})`;

        } catch (error) {
            console.error('Error updating battery display:', error);
            this.updateStatusMessage('Error reading battery information', 'error');
        }
    }

    /**
     * Check battery level and trigger alerts if necessary
     */
    checkBatteryLevel() {
        if (!this.battery) return;

        const level = Math.round(this.battery.level * 100);
        const isCharging = this.battery.charging;
        const currentTime = Date.now();

        // Check if battery is at 90% or higher while charging
        if (level >= 90 && isCharging) {
            // Only show alert if enough time has passed since last alert
            if (currentTime - this.lastAlertTime > this.alertCooldown) {
                this.showBatteryWarning();
                this.playVoiceAlert();
                this.lastAlertTime = currentTime;
            }
        } else {
            // Reset warning state when conditions are no longer met
            this.hasShownWarning = false;
            this.hideAlert();
        }
    }

    /**
     * Show battery warning alert
     */
    showBatteryWarning() {
        this.alertContainer.classList.add('show');
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideAlert();
        }, 10000);
    }

    /**
     * Hide the alert
     */
    hideAlert() {
        this.alertContainer.classList.remove('show');
    }

    /**
     * Dismiss alert manually
     */
    dismissAlert() {
        this.hideAlert();
    }

    /**
     * Play voice alert using Web Speech API
     */
    playVoiceAlert() {
        if (!this.soundEnabled || !this.synth) return;

        try {
            // Cancel any ongoing speech
            this.synth.cancel();

            const utterance = new SpeechSynthesisUtterance(this.voiceMessage);
            
            // Configure voice settings
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            // Use a female voice if available
            const voices = this.synth.getVoices();
            const femaleVoice = voices.find(voice => 
                voice.name.toLowerCase().includes('female') || 
                voice.name.toLowerCase().includes('woman') ||
                voice.name.toLowerCase().includes('zira') ||
                voice.name.toLowerCase().includes('hazel')
            );
            
            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }

            // Add event listeners
            utterance.onstart = () => {
                console.log('Voice alert started');
                this.updateStatusMessage('Playing voice alert...', 'info');
            };

            utterance.onend = () => {
                console.log('Voice alert completed');
                this.updateStatusMessage('Battery monitoring active', 'success');
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event.error);
                this.updateStatusMessage('Voice alert failed to play', 'error');
            };

            // Speak the message
            this.synth.speak(utterance);

        } catch (error) {
            console.error('Error playing voice alert:', error);
            this.updateStatusMessage('Voice alert not available', 'error');
        }
    }

    /**
     * Test voice alert functionality
     */
    testVoiceAlert() {
        if (!this.synth) {
            this.updateStatusMessage('Speech synthesis not supported', 'error');
            return;
        }

        this.updateStatusMessage('Testing voice alert...', 'info');
        this.playVoiceAlert();
    }

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        if (this.soundEnabled) {
            this.soundIcon.className = 'fas fa-volume-up';
            this.soundText.textContent = 'Sound On';
            this.updateStatusMessage('Voice alerts enabled', 'success');
        } else {
            this.soundIcon.className = 'fas fa-volume-mute';
            this.soundText.textContent = 'Sound Off';
            this.updateStatusMessage('Voice alerts disabled', 'warning');
        }

        // Save preference to localStorage
        localStorage.setItem('batteryMonitorSound', this.soundEnabled);
    }

    /**
     * Refresh battery status manually
     */
    async refreshBatteryStatus() {
        this.updateStatusMessage('Refreshing battery status...', 'info');
        this.refreshBtn.disabled = true;
        
        try {
            // Add a small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (this.battery) {
                this.updateBatteryDisplay();
                this.checkBatteryLevel();
                this.updateStatusMessage('Battery status updated', 'success');
            } else {
                await this.initializeBatteryAPI();
            }
        } catch (error) {
            console.error('Error refreshing battery status:', error);
            this.updateStatusMessage('Failed to refresh battery status', 'error');
        } finally {
            this.refreshBtn.disabled = false;
        }
    }

    /**
     * Start monitoring battery status
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        
        // Update display every 5 seconds
        this.monitoringInterval = setInterval(() => {
            if (this.battery) {
                this.updateBatteryDisplay();
                this.checkBatteryLevel();
            }
        }, 5000);

        console.log('Battery monitoring started');
    }

    /**
     * Stop monitoring battery status
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('Battery monitoring stopped');
    }

    /**
     * Handle Battery API errors
     */
    handleBatteryAPIError(error) {
        console.error('Battery API Error:', error);
        
        let message = 'Battery API is not available. ';
        
        if (error.name === 'NotSupportedError') {
            message += 'This feature is not supported in your browser.';
        } else if (error.name === 'SecurityError') {
            message += 'Access to battery information is blocked for security reasons.';
        } else {
            message += 'Please try refreshing the page or using a different browser.';
        }

        this.updateStatusMessage(message, 'error');
        this.showTroubleshootingPanel();
    }

    /**
     * Show troubleshooting panel
     */
    showTroubleshootingPanel() {
        this.troubleshootingPanel.style.display = 'block';
        this.troubleshootingPanel.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Update status message
     */
    updateStatusMessage(message, type = 'info') {
        const icon = this.getStatusIcon(type);
        const iconElem = document.createElement('i');
        iconElem.className = icon;

        const messageElem = document.createElement('span');
        messageElem.textContent = message;

        this.statusMessage.innerHTML = '';
        this.statusMessage.appendChild(iconElem);
        this.statusMessage.appendChild(messageElem);

        this.statusMessage.className = `status-message ${type}`;
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Get appropriate icon for status type
     */
    getStatusIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'error': return 'fas fa-times-circle';
            default: return 'fas fa-info-circle';
        }
    }

    /**
     * Get CSS class for battery level
     */
    getBatteryLevelClass(level) {
        if (level <= 20) return 'text-danger';
        if (level <= 50) return 'text-warning';
        return 'text-success';
    }

    /**
     * Format time in seconds to human-readable format
     */
    formatTime(seconds) {
        if (!isFinite(seconds) || seconds <= 0) {
            return '--';
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return '<1m';
        }
    }

    /**
     * Load user preferences from localStorage
     */
    loadPreferences() {
        const savedSoundSetting = localStorage.getItem('batteryMonitorSound');
        if (savedSoundSetting !== null) {
            this.soundEnabled = savedSoundSetting === 'true';
            this.toggleSoundBtn.click(); // Update UI to match saved setting
        }
    }

    /**
     * Clean up resources when the app is destroyed
     */
    destroy() {
        this.stopMonitoring();
        
        if (this.synth) {
            this.synth.cancel();
        }
        
        console.log('Battery monitor destroyed');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.batteryMonitor = new BatteryMonitor();

    // Load user preferences
    window.batteryMonitor.loadPreferences();

    // Handle page visibility changes to optimize performance
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden - continuing background monitoring');
        } else {
            console.log('Page visible - refreshing battery status');
            window.batteryMonitor.refreshBatteryStatus();
        }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (window.batteryMonitor) {
            window.batteryMonitor.destroy();
        }
    });

    // Add keyboard shortcuts info to console
    console.log('Keyboard shortcuts:');
    console.log('Ctrl+R / Cmd+R: Refresh battery status');
    console.log('Ctrl+T / Cmd+T: Test voice alert');
});

// Error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    if (window.batteryMonitor) {
        window.batteryMonitor.updateStatusMessage(
            'An unexpected error occurred. Please refresh the page.',
            'error'
        );
    }
});

// Handle promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.batteryMonitor) {
        window.batteryMonitor.updateStatusMessage(
            'An error occurred while processing the request.',
            'error'
        );
    }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatteryMonitor;
}
