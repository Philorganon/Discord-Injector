/**
 * @fileoverview Event emitter for decoupled communication
 * @module core/events
 */

/**
 * Custom event emitter with async support and priority handling
 */
class EventEmitter {
    constructor() {
        /** @type {Map<string, Array<{handler: Function, priority: number, once: boolean}>>} */
        this.listeners = new Map();

        /** @type {Map<string, Array<Function>>} */
        this.interceptors = new Map();

        /** @type {boolean} */
        this.debug = false;
    }

    /**
     * Enable debug mode
     * @param {boolean} enabled 
     */
    setDebug(enabled) {
        this.debug = enabled;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} [options] - Subscription options
     * @param {number} [options.priority=10] - Handler priority (lower = earlier)
     * @param {boolean} [options.once=false] - Remove after first call
     * @returns {Function} Unsubscribe function
     */
    on(event, handler, options = {}) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        const { priority = 10, once = false } = options;

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listeners = this.listeners.get(event);
        const listener = { handler, priority, once };

        listeners.push(listener);

        // Sort by priority
        listeners.sort((a, b) => a.priority - b.priority);

        if (this.debug) {
            console.log(`[Events] Registered listener for "${event}" (priority: ${priority})`);
        }

        // Return unsubscribe function
        return () => this.off(event, handler);
    }

    /**
     * Subscribe to event once
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {number} [priority=10] - Handler priority
     * @returns {Function} Unsubscribe function
     */
    once(event, handler, priority = 10) {
        return this.on(event, handler, { priority, once: true });
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} [handler] - Specific handler to remove (all if omitted)
     */
    off(event, handler) {
        if (!this.listeners.has(event)) return;

        if (!handler) {
            this.listeners.delete(event);
            if (this.debug) {
                console.log(`[Events] Removed all listeners for "${event}"`);
            }
            return;
        }

        const listeners = this.listeners.get(event);
        const index = listeners.findIndex(l => l.handler === handler);

        if (index !== -1) {
            listeners.splice(index, 1);
            if (this.debug) {
                console.log(`[Events] Removed listener for "${event}"`);
            }
        }
    }

    /**
     * Emit an event synchronously
     * @param {string} event - Event name
     * @param {...*} args - Event arguments
     * @returns {boolean} True if any handler was called
     */
    emit(event, ...args) {
        const listeners = this.listeners.get(event);

        if (!listeners || listeners.length === 0) {
            if (this.debug) {
                console.log(`[Events] No listeners for "${event}"`);
            }
            return false;
        }

        if (this.debug) {
            console.log(`[Events] Emitting "${event}" to ${listeners.length} listeners`);
        }

        const toRemove = [];

        for (const listener of listeners) {
            try {
                listener.handler(...args);

                if (listener.once) {
                    toRemove.push(listener);
                }
            } catch (error) {
                console.error(`[Events] Error in handler for "${event}":`, error);
            }
        }

        // Remove once listeners
        for (const listener of toRemove) {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }

        return true;
    }

    /**
     * Emit an event asynchronously
     * @param {string} event - Event name
     * @param {...*} args - Event arguments
     * @returns {Promise<Array>} Results from all handlers
     */
    async emitAsync(event, ...args) {
        const listeners = this.listeners.get(event);

        if (!listeners || listeners.length === 0) {
            return [];
        }

        if (this.debug) {
            console.log(`[Events] Emitting async "${event}" to ${listeners.length} listeners`);
        }

        const results = [];
        const toRemove = [];

        for (const listener of listeners) {
            try {
                const result = await listener.handler(...args);
                results.push({ success: true, result });

                if (listener.once) {
                    toRemove.push(listener);
                }
            } catch (error) {
                results.push({ success: false, error });
                console.error(`[Events] Async error in handler for "${event}":`, error);
            }
        }

        // Remove once listeners
        for (const listener of toRemove) {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }

        return results;
    }

    /**
     * Emit event with data transformation (pipeline pattern)
     * Each handler receives the result of the previous handler
     * @param {string} event - Event name
     * @param {*} data - Initial data
     * @returns {Promise<*>} Transformed data
     */
    async pipe(event, data) {
        const listeners = this.listeners.get(event);

        if (!listeners || listeners.length === 0) {
            return data;
        }

        let result = data;

        for (const listener of listeners) {
            try {
                result = await listener.handler(result);
            } catch (error) {
                console.error(`[Events] Pipe error in handler for "${event}":`, error);
                throw error;
            }
        }

        return result;
    }

    /**
     * Add an interceptor that can prevent event propagation
     * @param {string} event - Event name
     * @param {Function} interceptor - Returns false to stop propagation
     * @returns {Function} Remove interceptor function
     */
    intercept(event, interceptor) {
        if (!this.interceptors.has(event)) {
            this.interceptors.set(event, []);
        }

        this.interceptors.get(event).push(interceptor);

        return () => {
            const ints = this.interceptors.get(event);
            const index = ints.indexOf(interceptor);
            if (index !== -1) {
                ints.splice(index, 1);
            }
        };
    }

    /**
     * Check if event should be intercepted
     * @param {string} event - Event name
     * @param {...*} args - Event arguments
     * @returns {Promise<boolean>} False if intercepted
     */
    async shouldEmit(event, ...args) {
        const interceptors = this.interceptors.get(event);

        if (!interceptors || interceptors.length === 0) {
            return true;
        }

        for (const interceptor of interceptors) {
            const result = await interceptor(...args);
            if (result === false) {
                if (this.debug) {
                    console.log(`[Events] Event "${event}" intercepted`);
                }
                return false;
            }
        }

        return true;
    }

    /**
     * Get list of registered events
     * @returns {string[]}
     */
    eventNames() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    listenerCount(event) {
        return this.listeners.get(event)?.length || 0;
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.listeners.clear();
        this.interceptors.clear();

        if (this.debug) {
            console.log('[Events] Removed all listeners');
        }
    }
}

/**
 * Global event bus singleton
 */
export const eventBus = new EventEmitter();

/**
 * Event names constants
 */
export const Events = Object.freeze({
    // Injection lifecycle
    BEFORE_INJECT: 'injection:before',
    AFTER_INJECT: 'injection:after',
    INJECT_ERROR: 'injection:error',

    // Restore lifecycle
    BEFORE_RESTORE: 'restore:before',
    AFTER_RESTORE: 'restore:after',
    RESTORE_ERROR: 'restore:error',

    // CSS lifecycle
    CSS_CHANGE: 'css:change',
    CSS_SAVE: 'css:save',
    CSS_ERROR: 'css:error',

    // Theme lifecycle
    THEME_CHANGE: 'theme:change',
    THEME_LOAD: 'theme:load',
    THEME_ERROR: 'theme:error',

    // Discord lifecycle
    DISCORD_FOUND: 'discord:found',
    DISCORD_START: 'discord:start',
    DISCORD_CLOSE: 'discord:close',
    DISCORD_ERROR: 'discord:error',

    // Plugin lifecycle
    PLUGIN_LOAD: 'plugin:load',
    PLUGIN_UNLOAD: 'plugin:unload',
    PLUGIN_ERROR: 'plugin:error',
    PLUGIN_CONFIG_CHANGE: 'plugin:config:change',

    // Editor lifecycle
    EDITOR_START: 'editor:start',
    EDITOR_STOP: 'editor:stop',
    EDITOR_CONNECT: 'editor:connect',
    EDITOR_DISCONNECT: 'editor:disconnect',

    // System
    CONFIG_CHANGE: 'config:change',
    LOG: 'log',
    ERROR: 'error',
    SHUTDOWN: 'shutdown'
});

export { EventEmitter };
