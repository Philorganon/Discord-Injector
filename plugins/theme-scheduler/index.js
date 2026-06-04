/**
 * @fileoverview Theme Scheduler Plugin
 * @description Automatically switches themes based on time of day
 */

export default class ThemeScheduler {
    constructor(api) {
        this.api = api;
        this.log = api.log;
        this.config = {};
        this.checkInterval = null;
        this.currentTheme = null;
    }

    /**
     * Initialize plugin
     */
    async init(config) {
        this.config = config;
        this.log.info('Theme Scheduler plugin initialized');

        if (config.enabled) {
            this._startScheduler();
            await this._checkAndApplyTheme();
        }
    }

    /**
     * Destroy plugin
     */
    destroy() {
        this._stopScheduler();
        this.log.info('Theme Scheduler plugin destroyed');
    }

    /**
     * Hook: Called when Discord starts
     */
    async onDiscordStart() {
        if (!this.config.enabled) return;
        await this._checkAndApplyTheme();
    }

    /**
     * Called when config changes
     */
    onConfigChange(config) {
        this.config = config;

        if (config.enabled) {
            this._startScheduler();
            this._checkAndApplyTheme();
        } else {
            this._stopScheduler();
        }
    }

    /**
     * Check current time and apply appropriate theme
     */
    async _checkAndApplyTheme() {
        const schedule = this._getCurrentSchedule();

        if (!schedule) {
            this.log.debug('No matching schedule found');
            return;
        }

        if (schedule.theme !== this.currentTheme) {
            this.log.info(`Switching theme to: ${schedule.theme}`);

            try {
                // Use API to change theme
                if (this.api.applyTheme) {
                    await this.api.applyTheme(schedule.theme);
                    this.currentTheme = schedule.theme;
                    this.log.success(`Theme changed to: ${schedule.theme}`);
                }
            } catch (err) {
                this.log.error('Failed to apply scheduled theme', { error: err.message });
            }
        }
    }

    /**
     * Get the schedule that matches current time
     * @returns {Object|null}
     */
    _getCurrentSchedule() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        for (const schedule of this.config.schedules || []) {
            if (this._isTimeInRange(currentTime, schedule.startTime, schedule.endTime)) {
                return schedule;
            }
        }

        return null;
    }

    /**
     * Check if time is within range (handles overnight ranges)
     */
    _isTimeInRange(current, start, end) {
        // Convert to minutes for easier comparison
        const toMinutes = (time) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const currentMins = toMinutes(current);
        const startMins = toMinutes(start);
        const endMins = toMinutes(end);

        // Handle overnight range (e.g., 18:00 - 06:00)
        if (startMins > endMins) {
            return currentMins >= startMins || currentMins < endMins;
        }

        return currentMins >= startMins && currentMins < endMins;
    }

    /**
     * Start the scheduler
     */
    _startScheduler() {
        this._stopScheduler();

        // Check every minute
        this.checkInterval = setInterval(() => {
            this._checkAndApplyTheme();
        }, 60000);
    }

    /**
     * Stop the scheduler
     */
    _stopScheduler() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}
