/**
 * ANIMATION MANAGER CLASS
 * 
 * Handles animations and transitions for UI elements
 * Provides easing functions and animation utilities
 */

class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.animationId = 0;
    }
    
    /**
     * Easing functions
     */
    static easing = {
        linear: t => t,
        easeIn: t => t * t,
        easeOut: t => t * (2 - t),
        easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        bounce: t => {
            if (t < 1 / 2.75) {
                return 7.5625 * t * t;
            } else if (t < 2 / 2.75) {
                return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            } else if (t < 2.5 / 2.75) {
                return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            } else {
                return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
            }
        },
        elastic: t => {
            return t === 0 || t === 1 ? t : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
        }
    };
    
    /**
     * Create a fade-in animation
     * @param {number} duration - Duration in seconds
     * @param {Function} callback - Callback function(progress, value)
     * @returns {number} Animation ID
     */
    fadeIn(duration = 0.5, callback) {
        return this.animate(0, 1, duration, AnimationManager.easing.easeOut, callback);
    }
    
    /**
     * Create a fade-out animation
     * @param {number} duration - Duration in seconds
     * @param {Function} callback - Callback function(progress, value)
     * @returns {number} Animation ID
     */
    fadeOut(duration = 0.5, callback) {
        return this.animate(1, 0, duration, AnimationManager.easing.easeIn, callback);
    }
    
    /**
     * Create a scale animation
     * @param {number} from - Start scale
     * @param {number} to - End scale
     * @param {number} duration - Duration in seconds
     * @param {Function} callback - Callback function(progress, value)
     * @returns {number} Animation ID
     */
    scale(from, to, duration = 0.3, callback) {
        return this.animate(from, to, duration, AnimationManager.easing.easeOut, callback);
    }
    
    /**
     * Create a pulse animation (repeating)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} duration - Duration per pulse in seconds
     * @param {Function} callback - Callback function(progress, value)
     * @returns {number} Animation ID
     */
    pulse(min, max, duration = 1.0, callback) {
        const id = this.animationId++;
        let startTime = null;
        let isRunning = true;
        
        const animate = (currentTime) => {
            if (!isRunning) return;
            
            if (startTime === null) {
                startTime = currentTime;
            }
            
            const elapsed = (currentTime - startTime) / 1000;
            const progress = (elapsed % duration) / duration;
            const value = min + (max - min) * (0.5 + 0.5 * Math.sin(progress * Math.PI * 2));
            
            if (callback) {
                callback(progress, value);
            }
            
            if (isRunning) {
                requestAnimationFrame(animate);
            }
        };
        
        this.animations.set(id, { stop: () => { isRunning = false; } });
        requestAnimationFrame(animate);
        
        return id;
    }
    
    /**
     * Generic animate function
     * @param {number} from - Start value
     * @param {number} to - End value
     * @param {number} duration - Duration in seconds
     * @param {Function} easing - Easing function
     * @param {Function} callback - Callback function(progress, value)
     * @returns {number} Animation ID
     */
    animate(from, to, duration, easing, callback) {
        const id = this.animationId++;
        let startTime = null;
        let isRunning = true;
        
        const animate = (currentTime) => {
            if (!isRunning) return;
            
            if (startTime === null) {
                startTime = currentTime;
            }
            
            const elapsed = (currentTime - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easing(progress);
            const value = from + (to - from) * eased;
            
            if (callback) {
                callback(progress, value);
            }
            
            if (progress < 1 && isRunning) {
                requestAnimationFrame(animate);
            } else {
                this.animations.delete(id);
            }
        };
        
        this.animations.set(id, { stop: () => { isRunning = false; } });
        requestAnimationFrame(animate);
        
        return id;
    }
    
    /**
     * Stop an animation
     * @param {number} id - Animation ID
     */
    stop(id) {
        const animation = this.animations.get(id);
        if (animation) {
            animation.stop();
            this.animations.delete(id);
        }
    }
    
    /**
     * Stop all animations
     */
    stopAll() {
        this.animations.forEach(animation => animation.stop());
        this.animations.clear();
    }
}
