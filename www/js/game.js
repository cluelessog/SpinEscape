/**
 * SPIN ESCAPE - Main Game File
 * 
 * Complete game structure with:
 * - Responsive canvas scaling for all Android devices
 * - Game loop using requestAnimationFrame (60fps target)
 * - Touch input system with swipe/tap detection
 * - Game state management (menu, playing, paused, gameOver)
 * - Performance monitoring (FPS counter, memory tracking)
 */

// ============================================================================
// GAME CONSTANTS
// ============================================================================

const GAME_WIDTH = 800;      // Internal resolution (portrait)
const GAME_HEIGHT = 1280;    // Aspect ratio: 5:8 (tall mobile)

// Game States
const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    LEVEL_UP: 'LEVEL_UP', // For future use
    SETTINGS: 'SETTINGS',
    HOW_TO_PLAY: 'HOW_TO_PLAY'
};

// ============================================================================
// CANVAS SETUP & RESPONSIVE SCALING
// ============================================================================

let canvas, ctx;

/**
 * Initialize canvas - must be called after DOM is ready
 */
function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return false;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context!');
        return false;
    }
    
    // Initial resize
    resizeCanvas();
    return true;
}

/**
 * Resize canvas to fit device screen while maintaining aspect ratio
 * Handles high-DPI displays with devicePixelRatio compensation
 */
function resizeCanvas() {
    if (!canvas || !ctx) {
        console.warn('Canvas not initialized, skipping resize');
        return;
    }
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    
    // Calculate scale to fit window while maintaining aspect ratio
    const windowRatio = windowWidth / windowHeight;
    const gameRatio = GAME_WIDTH / GAME_HEIGHT;
    
    let scale;
    if (windowRatio > gameRatio) {
        // Window is wider → scale by height
        scale = windowHeight / GAME_HEIGHT;
    } else {
        // Window is taller → scale by width
        scale = windowWidth / GAME_WIDTH;
    }
    
    // Apply scale to canvas display size
    canvas.style.width = (GAME_WIDTH * scale) + 'px';
    canvas.style.height = (GAME_HEIGHT * scale) + 'px';
    
    // Set drawing surface size to avoid blurriness on high-DPI screens
    // This resets the context, so we need to reset transform after
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    
    // Reset transform and scale drawing context to match dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr);
    
    console.log(`Canvas resized: ${windowWidth}x${windowHeight}, scale: ${scale.toFixed(2)}, dpr: ${dpr}`);
}

// ============================================================================
// INPUT MANAGER CLASS
// ============================================================================

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.activeTouches = new Map(); // Map of touchId → coordinates
        this.touchStartPos = null;
        this.touchStartTime = 0;
        this.swipeThreshold = 50; // pixels
        this.tapMaxDuration = 300; // milliseconds
        this.longPressDuration = 500; // milliseconds
        this.debounceTime = 20; // milliseconds - prevent accidental double-taps
        this.lastTapTime = 0;
        this.isTouching = false;
        this.wasJustPressed = false;
        this.isDragging = false;
        this.isLongPress = false;
        this.swipeVector = { x: 0, y: 0 };
        this.swipeVelocity = 0; // pixels per second
        this.longPressTimer = null;
        this.keys = {}; // Track keyboard keys
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });
        
        // Mouse events for testing in browser
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e), { passive: false });
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e), { passive: false });
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e), { passive: false });
        
        // Keyboard events for testing
        window.addEventListener('keydown', (e) => this.handleKeyDown(e), { passive: false });
        window.addEventListener('keyup', (e) => this.handleKeyUp(e), { passive: false });
        
        // Prevent default behaviors
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    /**
     * Convert touch/mouse coordinates to canvas space
     */
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        // Debouncing: prevent accidental double-taps
        const currentTime = Date.now();
        if (currentTime - this.lastTapTime < this.debounceTime) {
            console.log('Input debounced - too soon after previous tap');
            return; // Ignore this input
        }
        this.lastTapTime = currentTime;
        
        this.wasJustPressed = true;
        this.isTouching = true;
        this.isDragging = false;
        this.isLongPress = false;
        
        // Clear any existing long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            this.activeTouches.set(touch.identifier, coords);
            
            // Track first touch for swipe detection
            if (i === 0) {
                this.touchStartPos = coords;
                this.touchStartTime = Date.now();
                
                // Start long press timer
                this.longPressTimer = setTimeout(() => {
                    this.isLongPress = true;
                    console.log('Long press detected');
                }, this.longPressDuration);
            }
        }
        
        // Log input event for debugging
        console.log(`Touch start: ${e.touches.length} touch(es)`);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        this.wasJustPressed = false;
        
        // If touch moved, it's a drag (not a tap)
        if (this.touchStartPos && this.isTouching) {
            const touch = e.touches[0];
            const currentPos = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            const dx = currentPos.x - this.touchStartPos.x;
            const dy = currentPos.y - this.touchStartPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate swipe velocity (pixels per second)
            const duration = (Date.now() - this.touchStartTime) / 1000; // Convert to seconds
            if (duration > 0) {
                this.swipeVelocity = distance / duration;
            }
            
            if (distance > 10) { // 10 pixel threshold for drag
                this.isDragging = true;
                // Cancel long press if dragging
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
            }
        }
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            this.activeTouches.set(touch.identifier, coords);
        }
        
        // Log drag movement for debugging
        if (this.isDragging) {
            console.log(`Touch move: velocity=${this.swipeVelocity.toFixed(0)} px/s`);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        // Calculate swipe if touch ended quickly
        if (this.touchStartPos) {
            const touch = e.changedTouches[0];
            const endPos = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            const duration = Date.now() - this.touchStartTime;
            
            if (duration < this.tapMaxDuration && !this.isDragging) {
                const dx = endPos.x - this.touchStartPos.x;
                const dy = endPos.y - this.touchStartPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Calculate final swipe velocity
                if (duration > 0) {
                    this.swipeVelocity = (distance / duration) * 1000; // pixels per second
                }
                
                if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
                    this.swipeVector = { x: dx, y: dy };
                    console.log(`Swipe detected: direction=${this.getSwipeDirection()}, velocity=${this.swipeVelocity.toFixed(0)} px/s`);
                } else {
                    this.swipeVector = { x: 0, y: 0 };
                    this.swipeVelocity = 0;
                    console.log('Tap detected');
                }
            } else {
                // Reset velocity if not a swipe
                this.swipeVelocity = 0;
            }
            
            this.touchStartPos = null;
        }
        
        // Reset drag state
        this.isDragging = false;
        this.isLongPress = false;
        
        // Remove ended touches
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            this.activeTouches.delete(touch.identifier);
        }
        
        if (this.activeTouches.size === 0) {
            this.isTouching = false;
        }
    }
    
    handleTouchCancel(e) {
        e.preventDefault();
        this.activeTouches.clear();
        this.isTouching = false;
        this.isDragging = false;
        this.isLongPress = false;
        this.touchStartPos = null;
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
    
    // Mouse event handlers for browser testing
    handleMouseDown(e) {
        e.preventDefault();
        
        // Debouncing: prevent accidental double-taps
        const currentTime = Date.now();
        if (currentTime - this.lastTapTime < this.debounceTime) {
            console.log('Input debounced (mouse) - too soon after previous tap');
            return; // Ignore this input
        }
        this.lastTapTime = currentTime;
        
        this.wasJustPressed = true;
        this.isTouching = true;
        this.isDragging = false;
        this.isLongPress = false;
        
        // Clear any existing long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.activeTouches.set('mouse', coords);
        this.touchStartPos = coords;
        this.touchStartTime = Date.now();
        
        // Start long press timer
        this.longPressTimer = setTimeout(() => {
            this.isLongPress = true;
            console.log('Long press detected (mouse)');
        }, this.longPressDuration);
        
        console.log('Mouse down');
    }
    
    handleMouseMove(e) {
        if (this.isTouching) {
            e.preventDefault();
            this.wasJustPressed = false;
            const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
            this.activeTouches.set('mouse', coords);
            
            // Check for drag and calculate velocity
            if (this.touchStartPos) {
                const dx = coords.x - this.touchStartPos.x;
                const dy = coords.y - this.touchStartPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Calculate swipe velocity (pixels per second)
                const duration = (Date.now() - this.touchStartTime) / 1000; // Convert to seconds
                if (duration > 0) {
                    this.swipeVelocity = distance / duration;
                }
                
                if (distance > 10) { // 10 pixel threshold for drag
                    this.isDragging = true;
                    // Cancel long press if dragging
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;
                    }
                }
            }
        }
    }
    
    handleMouseUp(e) {
        e.preventDefault();
        
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        if (this.touchStartPos) {
            const endPos = this.getCanvasCoordinates(e.clientX, e.clientY);
            const duration = Date.now() - this.touchStartTime;
            const dx = endPos.x - this.touchStartPos.x;
            const dy = endPos.y - this.touchStartPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate final swipe velocity
            if (duration > 0) {
                this.swipeVelocity = (distance / duration) * 1000; // pixels per second
            }
            
            if (duration < this.tapMaxDuration && !this.isDragging) {
                if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
                    this.swipeVector = { x: dx, y: dy };
                    console.log(`Swipe detected (mouse): direction=${this.getSwipeDirection()}, velocity=${this.swipeVelocity.toFixed(0)} px/s`);
                } else {
                    this.swipeVector = { x: 0, y: 0 };
                    this.swipeVelocity = 0;
                    console.log('Tap detected (mouse)');
                }
            } else {
                this.swipeVelocity = 0;
            }
            this.touchStartPos = null;
        }
        this.activeTouches.delete('mouse');
        this.isTouching = false;
        this.isDragging = false;
        this.isLongPress = false;
    }
    
    // Keyboard event handlers
    handleKeyDown(e) {
        this.keys[e.code] = true;
        
        // Prevent default for game keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    }
    
    handleKeyUp(e) {
        this.keys[e.code] = false;
    }
    
    /**
     * Check if a key is currently pressed
     */
    isKeyPressed(keyCode) {
        return this.keys[keyCode] === true;
    }
    
    /**
     * Get arrow key direction
     */
    getArrowKeyDirection() {
        if (this.keys['ArrowUp']) return 'UP';
        if (this.keys['ArrowDown']) return 'DOWN';
        if (this.keys['ArrowLeft']) return 'LEFT';
        if (this.keys['ArrowRight']) return 'RIGHT';
        return null;
    }
    
    /**
     * Get primary touch coordinates (first active touch)
     */
    getPrimaryTouch() {
        if (this.activeTouches.size > 0) {
            return Array.from(this.activeTouches.values())[0];
        }
        return null;
    }
    
    /**
     * Get swipe direction
     */
    getSwipeDirection() {
        if (Math.abs(this.swipeVector.x) > Math.abs(this.swipeVector.y)) {
            return this.swipeVector.x > 0 ? 'RIGHT' : 'LEFT';
        } else if (Math.abs(this.swipeVector.y) > 0) {
            return this.swipeVector.y > 0 ? 'DOWN' : 'UP';
        }
        return null;
    }
    
    /**
     * Get swipe velocity in pixels per second
     */
    getSwipeVelocity() {
        return this.swipeVelocity;
    }
    
    /**
     * Detect pinch gesture (distance between two touches)
     * Returns null if less than 2 touches, otherwise returns pinch data
     * @returns {Object|null} { distance, center, touches } or null
     */
    detectPinch() {
        if (this.activeTouches.size < 2) {
            return null;
        }
        
        const touches = Array.from(this.activeTouches.values());
        // Safety check: ensure we have at least 2 touches
        if (touches.length < 2) {
            return null;
        }
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        // Additional safety check
        if (!touch1 || !touch2) {
            return null;
        }
        
        // Calculate distance between two touches
        const dx = touch2.x - touch1.x;
        const dy = touch2.y - touch1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate center point between touches
        const center = {
            x: (touch1.x + touch2.x) / 2,
            y: (touch1.y + touch2.y) / 2
        };
        
        // Calculate angle of line between touches (in radians)
        const angle = Math.atan2(dy, dx);
        
        return {
            distance: distance,
            center: center,
            touches: touches,
            angle: angle,
            // Normalized vector from touch1 to touch2
            vector: { x: dx / distance, y: dy / distance }
        };
    }
    
    /**
     * Get all active touch coordinates
     * @returns {Array} Array of { x, y } coordinate objects
     */
    getAllTouches() {
        return Array.from(this.activeTouches.values());
    }
    
    /**
     * Get touch count
     * @returns {number} Number of active touches
     */
    getTouchCount() {
        return this.activeTouches.size;
    }
    
    /**
     * Get touch coordinates (alias for getPrimaryTouch for compatibility)
     * @returns {Object|null} { x, y } or null
     */
    getTouchCoordinates() {
        return this.getPrimaryTouch();
    }
    
    /**
     * Reset input state (call at end of frame)
     */
    reset() {
        this.wasJustPressed = false;
        this.swipeVector = { x: 0, y: 0 };
        // Note: isLongPress and isDragging persist until touch ends
        // Note: swipeVelocity persists until next swipe
    }
}

// ============================================================================
// VIBRATION MANAGER CLASS
// ============================================================================

class VibrationManager {
    constructor() {
        this.enabled = true;
        this.supported = false;
        this.checkSupport();
        this.loadSettings();
    }
    
    checkSupport() {
        // Check for Vibration API support
        if (navigator.vibrate) {
            this.supported = true;
            console.log('Vibration API supported');
        } else if (navigator.cordova && navigator.notification && navigator.notification.vibrate) {
            // Cordova vibration plugin fallback
            this.supported = true;
            console.log('Cordova vibration plugin supported');
        } else {
            this.supported = false;
            console.log('Vibration not supported on this device');
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('spinEscapeVibration');
            if (saved !== null) {
                this.enabled = saved === 'true';
            }
        } catch (e) {
            console.error('Failed to load vibration settings:', e);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('spinEscapeVibration', this.enabled.toString());
        } catch (e) {
            console.error('Failed to save vibration settings:', e);
        }
    }
    
    vibrate(pattern) {
        if (!this.enabled || !this.supported) {
            return;
        }
        
        try {
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            } else if (navigator.cordova && navigator.notification && navigator.notification.vibrate) {
                // Cordova plugin uses milliseconds directly
                if (typeof pattern === 'number') {
                    navigator.notification.vibrate(pattern);
                } else if (Array.isArray(pattern)) {
                    // Convert pattern array to total duration for Cordova
                    const totalMs = pattern.reduce((sum, val, idx) => {
                        return sum + (idx % 2 === 0 ? val : 0); // Sum only vibration durations
                    }, 0);
                    navigator.notification.vibrate(totalMs);
                }
            }
        } catch (e) {
            console.error('Vibration failed:', e);
        }
    }
    
    vibrateTap() {
        // 50ms pulse for tap
        this.vibrate(50);
    }
    
    vibrateCollision() {
        // Pattern: 100ms on, 50ms off, 100ms on
        this.vibrate([100, 50, 100]);
    }
    
    vibrateGameOver() {
        // Stronger pattern for game over
        this.vibrate([200, 100, 200]);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        this.saveSettings();
        console.log(`Vibration ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    }
    
    isEnabled() {
        return this.enabled && this.supported;
    }
}

// ============================================================================
// PERFORMANCE MONITOR CLASS
// ============================================================================

class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.frameTime = 0;
        this.frameTimeHistory = [];
        this.maxHistorySize = 60;
        this.debugElement = document.getElementById('debugInfo');
        this.showDebug = false;
        this.warningThreshold = 16.6; // milliseconds (60fps = 16.6ms per frame)
        this.warningCount = 0;
        this.lastWarningTime = 0;
        this.warningCooldown = 1000; // Only warn once per second
        
        // Toggle debug with triple tap
        let tapCount = 0;
        let lastTapTime = 0;
        document.addEventListener('touchstart', () => {
            const now = Date.now();
            if (now - lastTapTime < 500) {
                tapCount++;
            } else {
                tapCount = 1;
            }
            lastTapTime = now;
            
            if (tapCount === 3) {
                this.toggleDebug();
                tapCount = 0;
            }
        });
    }
    
    toggleDebug() {
        this.showDebug = !this.showDebug;
        if (this.showDebug) {
            this.debugElement.classList.add('active');
        } else {
            this.debugElement.classList.remove('active');
        }
    }
    
    update(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.frameTime = deltaTime;
        this.frameCount++;
        
        // Warn if frame time exceeds threshold (performance issue)
        if (deltaTime > this.warningThreshold) {
            const now = Date.now();
            if (now - this.lastWarningTime > this.warningCooldown) {
                console.warn(`Performance warning: Frame took ${deltaTime.toFixed(2)}ms (target: ${this.warningThreshold}ms). FPS may drop below 60.`);
                this.warningCount++;
                this.lastWarningTime = now;
            }
        }
        
        // Calculate FPS every second
        if (deltaTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            // Log performance summary
            if (this.warningCount > 0) {
                console.log(`Performance: ${this.warningCount} slow frames in last second`);
                this.warningCount = 0;
            }
        }
        
        // Track frame time history
        this.frameTimeHistory.push(deltaTime);
        if (this.frameTimeHistory.length > this.maxHistorySize) {
            this.frameTimeHistory.shift();
        }
        
        // Update debug display
        if (this.showDebug) {
            const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
            const maxFrameTime = Math.max(...this.frameTimeHistory);
            const memoryUsage = performance.memory ? 
                (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB' : 
                'N/A';
            
            const frameTimeColor = deltaTime > this.warningThreshold ? '#f00' : '#0f0';
            
            // Safely access gameEngine (may not be initialized yet)
            const poolStats = (typeof gameEngine !== 'undefined' && gameEngine && gameEngine.projectilePool) ? 
                `Active: ${gameEngine.projectilePool.getActiveCount()}, Pool: ${gameEngine.projectilePool.getPoolSize()}` : 
                'N/A';
            
            const gameState = (typeof gameEngine !== 'undefined' && gameEngine) ? gameEngine.currentState : 'N/A';
            const vibrationState = (typeof gameEngine !== 'undefined' && gameEngine && gameEngine.vibrationManager) ? 
                (gameEngine.vibrationManager.isEnabled() ? 'ON' : 'OFF') : 'N/A';
            
            this.debugElement.innerHTML = `
                <div>FPS: <span style="color: ${this.fps >= 55 ? '#0f0' : '#f00'}">${this.fps}</span></div>
                <div>Frame Time: <span style="color: ${frameTimeColor}">${deltaTime.toFixed(2)}ms</span></div>
                <div>Avg Frame: ${avgFrameTime.toFixed(2)}ms</div>
                <div>Max Frame: ${maxFrameTime.toFixed(2)}ms</div>
                <div>Memory: ${memoryUsage}</div>
                <div>Projectiles: ${poolStats}</div>
                <div>State: ${gameState}</div>
                <div>Vibration: ${vibrationState}</div>
            `;
        }
    }
    
    getAverageFrameTime() {
        if (this.frameTimeHistory.length === 0) return 0;
        return this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    }
}

// ============================================================================
// PLAYER CLASS
// ============================================================================

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 30;
        this.angle = 0; // Rotation angle in radians
        this.rotationSpeed = 0; // Radians per second
        this.maxRotationSpeed = 5; // Maximum rotation speed
        this.rotationAcceleration = 15; // How fast rotation changes
        this.color = '#4a9eff';
        this.hitFlash = 0; // Flash effect timer
        
        // Gap system: Define gap sectors (angles where projectiles can pass through)
        // Each gap is defined as [startAngle, endAngle] in radians (relative to rotation)
        // The circle has 4 gaps, each 45 degrees (PI/4 radians) wide
        // Solid sectors are between gaps
        this.gapCount = 4; // Number of gaps
        this.gapSize = Math.PI / 4; // Each gap is 45 degrees (PI/4 radians)
        this.solidSize = (Math.PI * 2 - (this.gapCount * this.gapSize)) / this.gapCount; // Size of solid sectors
        
        // Calculate gap positions (relative to angle 0)
        this.gaps = [];
        for (let i = 0; i < this.gapCount; i++) {
            const gapStart = (Math.PI * 2 / this.gapCount) * i;
            const gapEnd = gapStart + this.gapSize;
            this.gaps.push([gapStart, gapEnd]);
        }
    }
    
    /**
     * Check if an angle (in world coordinates) hits a solid part or passes through a gap
     * @param {number} worldAngle - Angle from center to projectile in world coordinates (radians)
     * @returns {boolean} True if angle hits solid part, false if it's in a gap
     */
    isSolidAtAngle(worldAngle) {
        // Convert world angle to angle relative to player's rotation
        let relativeAngle = worldAngle - this.angle;
        
        // Normalize to [0, 2PI]
        while (relativeAngle < 0) relativeAngle += Math.PI * 2;
        while (relativeAngle >= Math.PI * 2) relativeAngle -= Math.PI * 2;
        
        // Check if this angle is in any gap
        for (const [gapStart, gapEnd] of this.gaps) {
            // Handle wrap-around case
            if (gapEnd > Math.PI * 2) {
                if (relativeAngle >= gapStart || relativeAngle <= (gapEnd - Math.PI * 2)) {
                    return false; // In gap
                }
            } else {
                if (relativeAngle >= gapStart && relativeAngle < gapEnd) {
                    return false; // In gap
                }
            }
        }
        
        return true; // Solid part
    }
    
    update(deltaTime, inputManager) {
        // Handle rotation input
        const touch = inputManager.getPrimaryTouch();
        if (touch) {
            // Calculate angle from center to touch point
            const dx = touch.x - this.x;
            const dy = touch.y - this.y;
            const targetAngle = Math.atan2(dy, dx);
            
            // Calculate shortest rotation direction
            let angleDiff = targetAngle - this.angle;
            
            // Normalize angle difference to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Rotate towards target angle
            const rotationDirection = angleDiff > 0 ? 1 : -1;
            this.rotationSpeed = Math.min(
                Math.abs(angleDiff) * this.rotationAcceleration,
                this.maxRotationSpeed
            ) * rotationDirection;
        } else {
            // Decelerate when not touching
            this.rotationSpeed *= 0.9; // Friction
            if (Math.abs(this.rotationSpeed) < 0.1) {
                this.rotationSpeed = 0;
            }
        }
        
        // Update rotation
        this.angle += this.rotationSpeed * deltaTime;
        
        // Normalize angle to [0, 2PI]
        while (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
        while (this.angle < 0) this.angle += Math.PI * 2;
        
        // Update hit flash
        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime;
        }
    }
    
    render(ctx) {
        // Draw player circle with gaps
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Flash effect on hit
        const fillColor = this.hitFlash > 0 ? '#ff4444' : this.color;
        
        // Draw solid sectors (arcs between gaps)
        ctx.fillStyle = fillColor;
        
        // Draw each solid sector as a filled arc
        for (let i = 0; i < this.gapCount; i++) {
            const gapEnd = this.gaps[i][1];
            const nextGapStart = i < this.gaps.length - 1 ? this.gaps[i + 1][0] : this.gaps[0][0] + Math.PI * 2;
            
            // Calculate solid sector angles
            let solidStart = gapEnd;
            let solidEnd = nextGapStart;
            
            // Handle wrap-around
            if (solidEnd < solidStart) {
                solidEnd += Math.PI * 2;
            }
            
            // Draw arc for this solid sector
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, this.radius, solidStart, solidEnd);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw indicator line showing rotation (points to 0 angle, which is a gap edge)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.radius, 0);
        ctx.stroke();
        
        ctx.restore();
    }
    
    triggerHitFlash() {
        this.hitFlash = 0.2; // 200ms flash
    }
}

// ============================================================================
// PROJECTILE CLASS
// ============================================================================

class Projectile {
    constructor() {
        // Initialize with default values (will be reset when reused)
        this.reset(0, 0, 0, 0, 0);
    }
    
    reset(x, y, targetX, targetY, speed) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.radius = 12;
        this.speed = speed;
        this.active = true;
        this.dodged = false; // Track if projectile was dodged
        this.spawnTime = performance.now(); // Track when projectile was spawned (for collision grace period)
        
        // Calculate direction vector
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.vx = distance > 0 ? (dx / distance) * speed : 0;
        this.vy = distance > 0 ? (dy / distance) * speed : 0;
        
        // Color based on speed (faster = redder)
        const speedRatio = Math.min(speed / 400, 1);
        this.color = `rgb(${255}, ${255 - Math.floor(speedRatio * 200)}, ${255 - Math.floor(speedRatio * 255)})`;
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Velocity-based movement is now handled by Physics class in GameEngine
        // This method handles game-specific logic (dodged detection)
        
        // NOTE: Dodged detection is now handled in GameEngine.checkCollisions()
        // We don't mark projectiles as dodged here anymore - let collision detection handle it
        
        // Deactivate if off screen
        if (this.x < -50 || this.x > GAME_WIDTH + 50 ||
            this.y < -50 || this.y > GAME_HEIGHT + 50) {
            this.active = false;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================================================
// PARTICLE SYSTEM CLASS
// ============================================================================

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 50;
    }
    
    spawnExplosion(x, y, count = 12, baseColor = '#ff4444') {
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 100 + Math.random() * 150;
            // Use provided color or generate random colors for default explosions
            let particleColor = baseColor;
            if (baseColor === '#ff4444') {
                // Default: yellow to orange for explosions
                particleColor = `hsl(${Math.random() * 60}, 100%, 60%)`;
            }
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5, // 500ms lifetime
                maxLife: 0.5,
                size: 3 + Math.random() * 4,
                color: particleColor
            });
        }
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vx *= 0.95; // Friction
            p.vy *= 0.95;
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
}

// ============================================================================
// PROJECTILE POOL CLASS
// ============================================================================

class ProjectilePool {
    constructor(initialSize = 50) {
        this.pool = [];
        this.active = [];
        this.initialSize = initialSize;
        this.initialize();
    }
    
    initialize() {
        // Pre-create projectile objects
        for (let i = 0; i < this.initialSize; i++) {
            this.pool.push(new Projectile());
        }
    }
    
    acquire(x, y, targetX, targetY, speed) {
        let projectile;
        
        if (this.pool.length > 0) {
            // Reuse existing projectile from pool
            projectile = this.pool.pop();
        } else {
            // Create new projectile if pool is empty
            projectile = new Projectile();
        }
        
        // Reset and configure projectile
        projectile.reset(x, y, targetX, targetY, speed);
        this.active.push(projectile);
        
        return projectile;
    }
    
    release(projectile) {
        const index = this.active.indexOf(projectile);
        if (index !== -1) {
            this.active.splice(index, 1);
            projectile.active = false;
            // Return to pool for reuse
            this.pool.push(projectile);
        }
    }
    
    update(deltaTime) {
        // Update all active projectiles
        for (let i = this.active.length - 1; i >= 0; i--) {
            const projectile = this.active[i];
            projectile.update(deltaTime);
            
            // Release inactive projectiles back to pool
            if (!projectile.active) {
                this.release(projectile);
            }
        }
    }
    
    render(ctx) {
        // Render all active projectiles
        for (const projectile of this.active) {
            projectile.render(ctx);
        }
    }
    
    clear() {
        // Return all active projectiles to pool
        while (this.active.length > 0) {
            this.release(this.active[0]);
        }
    }
    
    getActiveCount() {
        return this.active.length;
    }
    
    getPoolSize() {
        return this.pool.length;
    }
}

// ============================================================================
// DATA MANAGER CLASS
// ============================================================================

class DataManager {
    constructor() {
        this.storagePrefix = 'spinEscape';
    }
    
    /**
     * Save a score to the leaderboard
     * Maintains top 10 scores
     * @param {number} score - Score to save
     * @returns {boolean} Success status
     */
    saveScore(score) {
        try {
            // Validate score
            if (!this.validateScore(score)) {
                console.warn(`Invalid score: ${score}`);
                return false;
            }
            
            // Load existing scores
            const scores = this.loadHighScores();
            
            // Add new score with timestamp
            scores.push({
                score: score,
                timestamp: Math.floor(Date.now() / 1000)
            });
            
            // Sort by score (descending)
            scores.sort((a, b) => b.score - a.score);
            
            // Keep only top 10
            const topScores = scores.slice(0, 10);
            
            // Save back
            localStorage.setItem(`${this.storagePrefix}HighScores`, JSON.stringify(topScores));
            
            return true;
        } catch (e) {
            console.error('Failed to save score:', e);
            return false;
        }
    }
    
    /**
     * Load top 10 high scores
     * @returns {Array} Array of score objects with score and timestamp
     */
    loadHighScores() {
        try {
            const saved = localStorage.getItem(`${this.storagePrefix}HighScores`);
            if (saved) {
                const scores = JSON.parse(saved);
                // Validate structure
                if (Array.isArray(scores)) {
                    return scores.filter(s => s && typeof s.score === 'number' && s.score >= 0);
                }
            }
            return [];
        } catch (e) {
            console.error('Failed to load high scores:', e);
            return [];
        }
    }
    
    /**
     * Save settings
     * @param {Object} settings - Settings object
     * @returns {boolean} Success status
     */
    saveSettings(settings) {
        try {
            // Add last played timestamp
            const settingsWithTimestamp = {
                ...settings,
                lastPlayed: Math.floor(Date.now() / 1000)
            };
            
            localStorage.setItem(`${this.storagePrefix}Settings`, JSON.stringify(settingsWithTimestamp));
            return true;
        } catch (e) {
            console.error('Failed to save settings:', e);
            return false;
        }
    }
    
    /**
     * Load settings
     * @returns {Object} Settings object
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem(`${this.storagePrefix}Settings`);
            if (saved) {
                return JSON.parse(saved);
            }
            return {
                soundEnabled: true,
                vibrationEnabled: true,
                difficulty: 'medium',
                lastPlayed: 0
            };
        } catch (e) {
            console.error('Failed to load settings:', e);
            return {
                soundEnabled: true,
                vibrationEnabled: true,
                difficulty: 'medium',
                lastPlayed: 0
            };
        }
    }
    
    /**
     * Reset all game data
     * @returns {boolean} Success status
     */
    resetData() {
        try {
            localStorage.removeItem(`${this.storagePrefix}HighScores`);
            localStorage.removeItem(`${this.storagePrefix}Settings`);
            localStorage.removeItem(`${this.storagePrefix}Vibration`);
            localStorage.removeItem(`${this.storagePrefix}Achievements`);
            localStorage.removeItem(`${this.storagePrefix}Stats`);
            localStorage.removeItem(`${this.storagePrefix}HighScore`); // Old format
            return true;
        } catch (e) {
            console.error('Failed to reset data:', e);
            return false;
        }
    }
    
    /**
     * Get player statistics
     * @returns {Object} Player stats object
     */
    getPlayerStats() {
        try {
            const saved = localStorage.getItem(`${this.storagePrefix}Stats`);
            if (saved) {
                return JSON.parse(saved);
            }
            return {
                totalGamesPlayed: 0,
                totalProjectilesDodged: 0,
                bestCombo: 0,
                totalScore: 0,
                averageScore: 0,
                totalPlaytime: 0, // in seconds
                bestScore: 0
            };
        } catch (e) {
            console.error('Failed to load player stats:', e);
            return {
                totalGamesPlayed: 0,
                totalProjectilesDodged: 0,
                bestCombo: 0,
                totalScore: 0,
                averageScore: 0,
                totalPlaytime: 0,
                bestScore: 0
            };
        }
    }
    
    /**
     * Save player statistics
     * @param {Object} stats - Stats object
     * @returns {boolean} Success status
     */
    savePlayerStats(stats) {
        try {
            localStorage.setItem(`${this.storagePrefix}Stats`, JSON.stringify(stats));
            return true;
        } catch (e) {
            console.error('Failed to save player stats:', e);
            return false;
        }
    }
    
    /**
     * Update player stats with game results
     * @param {Object} gameResults - { score, combo, projectilesDodged, playtime }
     */
    updatePlayerStats(gameResults) {
        const stats = this.getPlayerStats();
        
        stats.totalGamesPlayed++;
        stats.totalProjectilesDodged += (gameResults.projectilesDodged || 0);
        stats.bestCombo = Math.max(stats.bestCombo, gameResults.combo || 0);
        stats.totalScore += (gameResults.score || 0);
        stats.averageScore = stats.totalGamesPlayed > 0 ? 
            Math.floor(stats.totalScore / stats.totalGamesPlayed) : 0;
        stats.totalPlaytime += (gameResults.playtime || 0);
        stats.bestScore = Math.max(stats.bestScore, gameResults.score || 0);
        
        this.savePlayerStats(stats);
    }
    
    /**
     * Validate score is reasonable
     * @param {number} score - Score to validate
     * @returns {boolean} True if valid
     */
    validateScore(score) {
        if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) {
            return false;
        }
        if (score < 0) {
            return false;
        }
        if (score > 1000000) { // Reasonable maximum
            console.warn(`Suspicious score detected: ${score}`);
            return false;
        }
        return true;
    }
    
    /**
     * Get all game data in one structure
     * @returns {Object} { scores[], settings, playerStats }
     */
    getAllData() {
        return {
            scores: this.loadHighScores(),
            settings: this.loadSettings(),
            playerStats: this.getPlayerStats()
        };
    }
}

// ============================================================================
// PHYSICS CLASS
// ============================================================================

class Physics {
    constructor() {
        // Gravity constant (pixels per second squared)
        this.gravity = 0; // Default: no gravity (can be set per object)
        
        // Collision grid for spatial optimization
        this.gridSize = 200; // Grid cell size in pixels
        this.grid = new Map();
        
        // Collision callbacks
        this.collisionCallbacks = [];
    }
    
    /**
     * Apply gravity to an object
     * @param {Object} object - Object with { x, y, vy, gravity } properties
     * @param {number} deltaTime - Time since last frame in seconds
     */
    applyGravity(object, deltaTime) {
        if (!object.gravity) return;
        
        // Apply gravity to vertical velocity
        if (object.vy === undefined) object.vy = 0;
        object.vy += object.gravity * deltaTime;
    }
    
    /**
     * Update velocity-based movement
     * @param {Object} object - Object with { x, y, vx, vy, friction } properties
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateVelocity(object, deltaTime) {
        // Apply friction if present
        if (object.friction !== undefined) {
            object.vx *= (1 - object.friction * deltaTime);
            object.vy *= (1 - object.friction * deltaTime);
            
            // Stop if velocity is very small
            if (Math.abs(object.vx) < 0.1) object.vx = 0;
            if (Math.abs(object.vy) < 0.1) object.vy = 0;
        }
        
        // Update position based on velocity
        if (object.vx !== undefined) {
            object.x += object.vx * deltaTime;
        }
        if (object.vy !== undefined) {
            object.y += object.vy * deltaTime;
        }
    }
    
    /**
     * Get distance between two points
     * @param {Object} point1 - { x, y }
     * @param {Object} point2 - { x, y }
     * @returns {number} Distance in pixels
     */
    getDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Check collision between two objects
     * Supports: circle-to-circle, rectangle-to-rectangle, circle-to-rectangle
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {boolean} True if colliding
     */
    checkCollision(obj1, obj2) {
        // Determine collision type based on object shapes
        const type1 = obj1.shape || (obj1.radius ? 'circle' : 'rectangle');
        const type2 = obj2.shape || (obj2.radius ? 'circle' : 'rectangle');
        
        // Bounding box pre-check for performance
        if (!this.boundingBoxCheck(obj1, obj2)) {
            return false;
        }
        
        // Circle-to-circle collision
        if (type1 === 'circle' && type2 === 'circle') {
            return this.checkCircleCircle(obj1, obj2);
        }
        
        // Rectangle-to-rectangle collision (AABB)
        if (type1 === 'rectangle' && type2 === 'rectangle') {
            return this.checkRectangleRectangle(obj1, obj2);
        }
        
        // Circle-to-rectangle collision
        if ((type1 === 'circle' && type2 === 'rectangle') ||
            (type1 === 'rectangle' && type2 === 'circle')) {
            const circle = type1 === 'circle' ? obj1 : obj2;
            const rect = type1 === 'rectangle' ? obj1 : obj2;
            return this.checkCircleRectangle(circle, rect);
        }
        
        return false;
    }
    
    /**
     * Bounding box pre-check for performance optimization
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {boolean} True if bounding boxes overlap
     */
    boundingBoxCheck(obj1, obj2) {
        // Get bounding boxes
        const box1 = this.getBoundingBox(obj1);
        const box2 = this.getBoundingBox(obj2);
        
        // AABB collision check
        return !(box1.right < box2.left || 
                 box1.left > box2.right || 
                 box1.bottom < box2.top || 
                 box1.top > box2.bottom);
    }
    
    /**
     * Get bounding box for an object
     * @param {Object} obj - Object (circle or rectangle)
     * @returns {Object} { left, right, top, bottom }
     */
    getBoundingBox(obj) {
        if (obj.radius !== undefined) {
            // Circle bounding box
            return {
                left: obj.x - obj.radius,
                right: obj.x + obj.radius,
                top: obj.y - obj.radius,
                bottom: obj.y + obj.radius
            };
        } else {
            // Rectangle bounding box
            const width = obj.width || 0;
            const height = obj.height || 0;
            const x = obj.x - (obj.anchorX || 0) * width;
            const y = obj.y - (obj.anchorY || 0) * height;
            
            return {
                left: x,
                right: x + width,
                top: y,
                bottom: y + height
            };
        }
    }
    
    /**
     * Check circle-to-circle collision
     * @param {Object} circle1 - { x, y, radius }
     * @param {Object} circle2 - { x, y, radius }
     * @returns {boolean} True if colliding
     */
    checkCircleCircle(circle1, circle2) {
        const distance = this.getDistance(circle1, circle2);
        const minDistance = circle1.radius + circle2.radius;
        // Use <= instead of < to be more lenient (allow touching without collision)
        // This prevents edge cases where floating point precision causes false collisions
        return distance <= minDistance;
    }
    
    /**
     * Check rectangle-to-rectangle collision (AABB)
     * @param {Object} rect1 - { x, y, width, height, anchorX?, anchorY? }
     * @param {Object} rect2 - { x, y, width, height, anchorX?, anchorY? }
     * @returns {boolean} True if colliding
     */
    checkRectangleRectangle(rect1, rect2) {
        const box1 = this.getBoundingBox(rect1);
        const box2 = this.getBoundingBox(rect2);
        
        return !(box1.right < box2.left || 
                 box1.left > box2.right || 
                 box1.bottom < box2.top || 
                 box1.top > box2.bottom);
    }
    
    /**
     * Check circle-to-rectangle collision
     * @param {Object} circle - { x, y, radius }
     * @param {Object} rect - { x, y, width, height, anchorX?, anchorY? }
     * @returns {boolean} True if colliding
     */
    checkCircleRectangle(circle, rect) {
        const box = this.getBoundingBox(rect);
        
        // Find closest point on rectangle to circle center
        const closestX = Math.max(box.left, Math.min(circle.x, box.right));
        const closestY = Math.max(box.top, Math.min(circle.y, box.bottom));
        
        // Calculate distance from circle center to closest point
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < circle.radius;
    }
    
    /**
     * Resolve collision between two objects
     * Handles overlap resolution and bounce physics
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @param {Object} options - { elasticity?, resolveOverlap? }
     */
    resolveCollision(obj1, obj2, options = {}) {
        const elasticity = options.elasticity !== undefined ? options.elasticity : 0.5;
        const resolveOverlap = options.resolveOverlap !== undefined ? options.resolveOverlap : true;
        
        const type1 = obj1.shape || (obj1.radius ? 'circle' : 'rectangle');
        const type2 = obj2.shape || (obj2.radius ? 'circle' : 'rectangle');
        
        // Circle-to-circle collision resolution
        if (type1 === 'circle' && type2 === 'circle') {
            this.resolveCircleCircle(obj1, obj2, elasticity, resolveOverlap);
        }
        
        // Rectangle-to-rectangle collision resolution
        if (type1 === 'rectangle' && type2 === 'rectangle') {
            this.resolveRectangleRectangle(obj1, obj2, elasticity, resolveOverlap);
        }
        
        // Circle-to-rectangle collision resolution
        if ((type1 === 'circle' && type2 === 'rectangle') ||
            (type1 === 'rectangle' && type2 === 'circle')) {
            const circle = type1 === 'circle' ? obj1 : obj2;
            const rect = type1 === 'rectangle' ? obj1 : obj2;
            this.resolveCircleRectangle(circle, rect, elasticity, resolveOverlap);
        }
        
        // Trigger collision callbacks
        this.triggerCollisionCallbacks(obj1, obj2);
    }
    
    /**
     * Resolve circle-to-circle collision
     */
    resolveCircleCircle(circle1, circle2, elasticity, resolveOverlap) {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = circle1.radius + circle2.radius;
        
        if (distance === 0) return; // Avoid division by zero
        
        // Calculate overlap
        const overlap = minDistance - distance;
        
        // Resolve overlap
        if (resolveOverlap && overlap > 0) {
            const separationX = (dx / distance) * overlap * 0.5;
            const separationY = (dy / distance) * overlap * 0.5;
            
            circle1.x -= separationX;
            circle1.y -= separationY;
            circle2.x += separationX;
            circle2.y += separationY;
        }
        
        // Bounce physics (if objects have velocity)
        if (elasticity > 0 && circle1.vx !== undefined && circle2.vx !== undefined) {
            const normalX = dx / distance;
            const normalY = dy / distance;
            
            // Relative velocity
            const relativeVx = circle2.vx - circle1.vx;
            const relativeVy = circle2.vy - circle1.vy;
            
            // Velocity along normal
            const velocityAlongNormal = relativeVx * normalX + relativeVy * normalY;
            
            // Don't resolve if velocities are separating
            if (velocityAlongNormal > 0) return;
            
            // Calculate impulse
            const impulse = -(1 + elasticity) * velocityAlongNormal;
            
            // Apply impulse (assuming equal mass for simplicity)
            const impulseX = impulse * normalX * 0.5;
            const impulseY = impulse * normalY * 0.5;
            
            circle1.vx -= impulseX;
            circle1.vy -= impulseY;
            circle2.vx += impulseX;
            circle2.vy += impulseY;
        }
    }
    
    /**
     * Resolve rectangle-to-rectangle collision
     */
    resolveRectangleRectangle(rect1, rect2, elasticity, resolveOverlap) {
        const box1 = this.getBoundingBox(rect1);
        const box2 = this.getBoundingBox(rect2);
        
        // Calculate overlap
        const overlapX = Math.min(box1.right - box2.left, box2.right - box1.left);
        const overlapY = Math.min(box1.bottom - box2.top, box2.bottom - box1.top);
        
        // Resolve overlap (push objects apart)
        if (resolveOverlap) {
            if (overlapX < overlapY) {
                // Resolve horizontally
                const separation = overlapX * 0.5;
                if (box1.left < box2.left) {
                    rect1.x -= separation;
                    rect2.x += separation;
                } else {
                    rect1.x += separation;
                    rect2.x -= separation;
                }
            } else {
                // Resolve vertically
                const separation = overlapY * 0.5;
                if (box1.top < box2.top) {
                    rect1.y -= separation;
                    rect2.y += separation;
                } else {
                    rect1.y += separation;
                    rect2.y -= separation;
                }
            }
        }
        
        // Bounce physics (if objects have velocity)
        if (elasticity > 0 && rect1.vx !== undefined && rect2.vx !== undefined) {
            // Determine collision normal
            const center1X = (box1.left + box1.right) / 2;
            const center1Y = (box1.top + box1.bottom) / 2;
            const center2X = (box2.left + box2.right) / 2;
            const center2Y = (box2.top + box2.bottom) / 2;
            
            const dx = center2X - center1X;
            const dy = center2Y - center1Y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) return;
            
            const normalX = dx / distance;
            const normalY = dy / distance;
            
            // Relative velocity
            const relativeVx = rect2.vx - rect1.vx;
            const relativeVy = rect2.vy - rect1.vy;
            
            // Velocity along normal
            const velocityAlongNormal = relativeVx * normalX + relativeVy * normalY;
            
            if (velocityAlongNormal > 0) return;
            
            // Calculate impulse
            const impulse = -(1 + elasticity) * velocityAlongNormal;
            const impulseX = impulse * normalX * 0.5;
            const impulseY = impulse * normalY * 0.5;
            
            rect1.vx -= impulseX;
            rect1.vy -= impulseY;
            rect2.vx += impulseX;
            rect2.vy += impulseY;
        }
    }
    
    /**
     * Resolve circle-to-rectangle collision
     */
    resolveCircleRectangle(circle, rect, elasticity, resolveOverlap) {
        const box = this.getBoundingBox(rect);
        
        // Find closest point on rectangle
        const closestX = Math.max(box.left, Math.min(circle.x, box.right));
        const closestY = Math.max(box.top, Math.min(circle.y, box.bottom));
        
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const overlap = circle.radius - distance;
        
        // Resolve overlap
        if (resolveOverlap && overlap > 0) {
            if (distance === 0) {
                // Circle center is inside rectangle, push out
                const centerX = (box.left + box.right) / 2;
                const centerY = (box.top + box.bottom) / 2;
                const pushX = circle.x - centerX;
                const pushY = circle.y - centerY;
                const pushDistance = Math.sqrt(pushX * pushX + pushY * pushY);
                
                if (pushDistance > 0) {
                    circle.x += (pushX / pushDistance) * overlap;
                    circle.y += (pushY / pushDistance) * overlap;
                }
            } else {
                // Push circle away from closest point
                circle.x += (dx / distance) * overlap;
                circle.y += (dy / distance) * overlap;
            }
        }
        
        // Bounce physics
        if (elasticity > 0 && circle.vx !== undefined) {
            if (distance === 0) return;
            
            const normalX = dx / distance;
            const normalY = dy / distance;
            
            // Reflect velocity
            const dot = circle.vx * normalX + circle.vy * normalY;
            circle.vx -= 2 * dot * normalX * elasticity;
            circle.vy -= 2 * dot * normalY * elasticity;
        }
    }
    
    /**
     * Keep object within screen boundaries
     * @param {Object} object - Object with { x, y, radius? or width?, height? }
     * @param {number} minX - Left boundary
     * @param {number} minY - Top boundary
     * @param {number} maxX - Right boundary
     * @param {number} maxY - Bottom boundary
     * @param {Object} options - { bounce?, wrap? }
     */
    keepInBounds(object, minX, minY, maxX, maxY, options = {}) {
        const bounce = options.bounce !== undefined ? options.bounce : false;
        const wrap = options.wrap !== undefined ? options.wrap : false;
        
        // Get object bounds
        const bounds = this.getBoundingBox(object);
        const width = bounds.right - bounds.left;
        const height = bounds.bottom - bounds.top;
        
        // Check and handle boundaries
        if (bounds.left < minX) {
            if (wrap) {
                object.x = maxX - width / 2;
            } else {
                object.x = minX + width / 2;
                if (bounce && object.vx !== undefined) {
                    object.vx = -object.vx * 0.8; // Bounce with damping
                }
            }
        }
        
        if (bounds.right > maxX) {
            if (wrap) {
                object.x = minX + width / 2;
            } else {
                object.x = maxX - width / 2;
                if (bounce && object.vx !== undefined) {
                    object.vx = -object.vx * 0.8;
                }
            }
        }
        
        if (bounds.top < minY) {
            if (wrap) {
                object.y = maxY - height / 2;
            } else {
                object.y = minY + height / 2;
                if (bounce && object.vy !== undefined) {
                    object.vy = -object.vy * 0.8;
                }
            }
        }
        
        if (bounds.bottom > maxY) {
            if (wrap) {
                object.y = minY + height / 2;
            } else {
                object.y = maxY - height / 2;
                if (bounce && object.vy !== undefined) {
                    object.vy = -object.vy * 0.8;
                }
            }
        }
    }
    
    /**
     * Add collision callback
     * @param {Function} callback - Function(obj1, obj2) called on collision
     */
    addCollisionCallback(callback) {
        this.collisionCallbacks.push(callback);
    }
    
    /**
     * Remove collision callback
     */
    removeCollisionCallback(callback) {
        const index = this.collisionCallbacks.indexOf(callback);
        if (index > -1) {
            this.collisionCallbacks.splice(index, 1);
        }
    }
    
    /**
     * Trigger collision callbacks
     */
    triggerCollisionCallbacks(obj1, obj2) {
        for (const callback of this.collisionCallbacks) {
            try {
                callback(obj1, obj2);
            } catch (e) {
                console.error('Error in collision callback:', e);
            }
        }
    }
    
    /**
     * Spatial optimization: Build collision grid
     * @param {Array} objects - Array of objects to add to grid
     * @param {number} gridSize - Size of grid cells
     */
    buildCollisionGrid(objects, gridSize = this.gridSize) {
        this.grid.clear();
        this.gridSize = gridSize;
        
        for (const obj of objects) {
            if (!obj.active) continue;
            
            const bounds = this.getBoundingBox(obj);
            const minCellX = Math.floor(bounds.left / gridSize);
            const maxCellX = Math.floor(bounds.right / gridSize);
            const minCellY = Math.floor(bounds.top / gridSize);
            const maxCellY = Math.floor(bounds.bottom / gridSize);
            
            // Add object to all cells it overlaps
            for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
                for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                    const key = `${cellX},${cellY}`;
                    if (!this.grid.has(key)) {
                        this.grid.set(key, []);
                    }
                    this.grid.get(key).push(obj);
                }
            }
        }
    }
    
    /**
     * Get objects in same grid cell (for spatial optimization)
     * @param {Object} object - Object to check
     * @returns {Array} Array of nearby objects
     */
    getNearbyObjects(object) {
        const bounds = this.getBoundingBox(object);
        const minCellX = Math.floor(bounds.left / this.gridSize);
        const maxCellX = Math.floor(bounds.right / this.gridSize);
        const minCellY = Math.floor(bounds.top / this.gridSize);
        const maxCellY = Math.floor(bounds.bottom / this.gridSize);
        
        const nearby = [];
        const seen = new Set();
        
        // Check all cells object overlaps
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                const key = `${cellX},${cellY}`;
                const cellObjects = this.grid.get(key) || [];
                
                for (const obj of cellObjects) {
                    if (obj !== object && !seen.has(obj)) {
                        seen.add(obj);
                        nearby.push(obj);
                    }
                }
            }
        }
        
        return nearby;
    }
}

// ============================================================================
// REMOVED: AssetManager and UIManager classes (theme system removed)
// ============================================================================
// Using direct canvas rendering instead of theme-based asset system

// ============================================================================
// GAME ENGINE CLASS
// ============================================================================

class GameEngine {
    constructor(canvasElement, context) {
        if (!canvasElement || !context) {
            throw new Error('GameEngine requires canvas and context');
        }
        this.canvas = canvasElement;
        this.ctx = context;
        this.currentState = GameState.MENU;
        this.lastTime = performance.now();
        this.deltaTime = 0;
        this.frameCount = 0;
        
        // Initialize systems
        this.inputManager = new InputManager(this.canvas);
        this.performanceMonitor = new PerformanceMonitor();
        this.particleSystem = new ParticleSystem();
        this.vibrationManager = new VibrationManager();
        this.projectilePool = new ProjectilePool(50); // Pre-create 50 projectiles
        this.dataManager = new DataManager(); // Data persistence manager
        this.physics = new Physics(); // Physics and collision system
        
        // Theme and visual systems
        this.themeManager = new ThemeManager();
        this.assetLoader = new AssetLoader();
        this.animationManager = new AnimationManager();
        
        // Menu-specific visual state
        this.menuParticles = [];
        this.menuParticleTimer = 0;
        this.menuBackgroundImage = null;
        this.menuTitleAlpha = 0;
        this.menuTitlePulse = 1.0;
        this.menuInitialized = false;
        
        // Initialize menu visuals
        this.initMenuVisuals();
        
        // Game objects
        this.player = null;
        this.score = 0;
        this.combo = 0;
        this.comboMultiplier = 1;
        this.bestComboThisGame = 0;
        this.projectilesDodgedThisGame = 0;
        this.gameStartTime = 0;
        this.gamePlaytime = 0;
        
        // Load data using DataManager
        const allData = this.dataManager.getAllData();
        this.highScoreData = this.loadHighScore(); // Keep for backward compatibility
        this.highScore = Math.max(
            this.highScoreData.highScore || 0,
            allData.playerStats.bestScore || 0
        );
        this.gameCount = allData.playerStats.totalGamesPlayed || 0;
        this.sessionBest = 0;
        this.topScores = allData.scores || [];
        
        // Player stats (with safety check)
        this.playerStats = allData.playerStats || {
            totalGamesPlayed: 0,
            totalProjectilesDodged: 0,
            bestCombo: 0,
            totalScore: 0,
            averageScore: 0,
            totalPlaytime: 0,
            bestScore: 0
        };
        
        // Floating score pop-ups
        this.floatingScores = [];
        
        // Achievements
        this.achievements = this.loadAchievements();
        
        // Spawning system
        this.spawnTimer = 0;
        this.baseSpawnRate = 1.5; // Seconds between spawns
        this.currentSpawnRate = this.baseSpawnRate;
        this.baseProjectileSpeed = 200; // Pixels per second
        this.currentProjectileSpeed = this.baseProjectileSpeed;
        
        // Visual effects
        this.screenShake = 0;
        this.screenShakeIntensity = 0;
        this.flashEffect = 0;
        
        // Settings
        this.soundEnabled = true;
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard', 'extreme'
        this.loadGameSettings();
        
        // UI button tracking
        this.hoveredButton = null;
        
        // Start game loop
        this.start();
    }
    
    start() {
        console.log('Game Engine Started');
        this.gameLoop(performance.now());
    }
    
    gameLoop(currentTime) {
        // Calculate deltaTime (frame-rate independent)
        this.deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        // Cap deltaTime to prevent large jumps (e.g., when tab loses focus)
        this.deltaTime = Math.min(this.deltaTime, 0.033); // Max 33ms = 30fps minimum
        
        // Update performance monitor
        this.performanceMonitor.update(currentTime);
        
        // Update game based on current state
        this.update(this.deltaTime);
        
        // Render game
        this.render();
        
        // Reset input state
        this.inputManager.reset();
        
        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    initMenuVisuals() {
        // Load background image for current theme
        const themeId = this.themeManager.currentTheme;
        this.assetLoader.loadThemeBackground(themeId, 'main-menu').then(img => {
            this.menuBackgroundImage = img;
        }).catch(() => {
            this.menuBackgroundImage = null;
        });
        
        // Animate title fade-in
        this.menuTitleAlpha = 0;
        this.animationManager.fadeIn(0.8, (progress, value) => {
            this.menuTitleAlpha = value;
        });
        
        // Start title pulse animation
        this.animationManager.pulse(0.95, 1.05, 2.0, (progress, value) => {
            this.menuTitlePulse = value;
        });
        
        // Initialize menu particles
        this.menuParticles = [];
        this.menuParticleTimer = 0;
    }
    
    updateMenuParticles(deltaTime) {
        const theme = this.themeManager.getTheme();
        const particleColor = theme.effects.particleColor || theme.colors.primary;
        
        // Spawn new particles
        this.menuParticleTimer += deltaTime;
        if (this.menuParticleTimer >= 0.3) { // Spawn every 0.3 seconds
            this.menuParticleTimer = 0;
            
            // Spawn 1-2 particles
            const count = Math.random() < 0.5 ? 1 : 2;
            for (let i = 0; i < count; i++) {
                this.menuParticles.push({
                    x: Math.random() * GAME_WIDTH,
                    y: GAME_HEIGHT + 10,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -50 - Math.random() * 100,
                    size: 2 + Math.random() * 3,
                    life: 1.0,
                    maxLife: 1.0,
                    color: particleColor
                });
            }
        }
        
        // Update particles
        for (let i = this.menuParticles.length - 1; i >= 0; i--) {
            const p = this.menuParticles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            
            // Remove dead particles
            if (p.life <= 0 || p.y < -10) {
                this.menuParticles.splice(i, 1);
            }
        }
    }
    
    update(deltaTime) {
        switch (this.currentState) {
            case GameState.MENU:
                this.updateMenu(deltaTime);
                this.updateMenuParticles(deltaTime);
                break;
            case GameState.PLAYING:
                this.updatePlaying(deltaTime);
                break;
            case GameState.PAUSED:
                this.updatePaused(deltaTime);
                break;
            case GameState.GAME_OVER:
                this.updateGameOver(deltaTime);
                break;
            case GameState.LEVEL_UP:
                this.updateLevelUp(deltaTime);
                break;
            case GameState.SETTINGS:
                this.updateSettings(deltaTime);
                break;
            case GameState.HOW_TO_PLAY:
                this.updateHowToPlay(deltaTime);
                break;
        }
        
        this.frameCount++;
    }
    
    updateMenu(deltaTime) {
        // Reinitialize menu visuals if not already done
        if (!this.menuInitialized) {
            this.initMenuVisuals();
            this.menuInitialized = true;
        }
        
        // Check button clicks
        const touch = this.inputManager.getPrimaryTouch();
        if (this.inputManager.wasJustPressed && touch) {
            // Check if Settings button was clicked
            const settingsButton = this.getSettingsButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, settingsButton)) {
                this.vibrationManager.vibrateTap();
                this.currentState = GameState.SETTINGS;
                return;
            }
            
            // Check if How to Play button was clicked
            const howToPlayButton = this.getHowToPlayButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, howToPlayButton)) {
                this.vibrationManager.vibrateTap();
                this.currentState = GameState.HOW_TO_PLAY;
                return;
            }
            
            // Check if Play button was clicked (center area)
            const playButton = this.getPlayButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, playButton)) {
                this.vibrationManager.vibrateTap();
                this.startGame();
                return;
            }
        }
        
        // Fallback: tap anywhere else or space key to start
        if (this.inputManager.wasJustPressed || this.inputManager.isKeyPressed('Space')) {
            this.vibrationManager.vibrateTap();
            this.startGame();
        }
    }
    
    updatePlaying(deltaTime) {
        // Handle pause input (back button or tap) - disabled for now, use back button
        // if (this.inputManager.wasJustPressed) {
        //     this.currentState = GameState.PAUSED;
        // }
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime, this.inputManager);
        }
        
        // Update projectiles (using object pool)
        this.updateProjectiles(deltaTime);
        
        // Spawn new projectiles
        this.updateSpawning(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Update particle system
        this.particleSystem.update(deltaTime);
        
        // Update floating scores
        this.updateFloatingScores(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update difficulty based on score
        this.updateDifficulty();
    }
    
    updateProjectiles(deltaTime) {
        // Update all projectiles using pool
        const activeProjectiles = this.projectilePool.active;
        
        // Update velocity-based movement using Physics class
        for (const projectile of activeProjectiles) {
            if (!projectile.active) continue;
            
            // Update velocity-based movement using Physics class
            this.physics.updateVelocity(projectile, deltaTime);
            
            // Apply gravity if needed (currently not used, but available)
            // this.physics.applyGravity(projectile, deltaTime);
            
            // Update projectile (handles dodged logic)
            projectile.update(deltaTime);
            
            // Keep projectiles in bounds (optional - currently deactivate off-screen)
            // this.physics.keepInBounds(projectile, 0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            // Deactivate if off screen
            if (projectile.x < -50 || projectile.x > GAME_WIDTH + 50 ||
                projectile.y < -50 || projectile.y > GAME_HEIGHT + 50) {
                this.projectilePool.release(projectile);
            }
        }
        
        // Dodged projectiles are now handled in checkCollisions() via handleDodge()
        // This section is kept for any cleanup if needed
    }
    
    updateSpawning(deltaTime) {
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.currentSpawnRate) {
            this.spawnProjectile();
            this.spawnTimer = 0;
        }
    }
    
    spawnProjectile() {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;
        
        // Minimum safe distance from player center (player radius + projectile radius + buffer)
        const minSafeDistance = 30 + 12 + 50; // 92 pixels minimum
        
        // Randomly choose edge to spawn from
        const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let spawnX, spawnY;
        
        // Try to spawn at a safe distance from center
        let attempts = 0;
        let distanceFromCenter = 0;
        
        do {
            switch (edge) {
                case 0: // Top
                    spawnX = Math.random() * GAME_WIDTH;
                    spawnY = -20;
                    break;
                case 1: // Right
                    spawnX = GAME_WIDTH + 20;
                    spawnY = Math.random() * GAME_HEIGHT;
                    break;
                case 2: // Bottom
                    spawnX = Math.random() * GAME_WIDTH;
                    spawnY = GAME_HEIGHT + 20;
                    break;
                case 3: // Left
                    spawnX = -20;
                    spawnY = Math.random() * GAME_HEIGHT;
                    break;
            }
            
            // Calculate distance from center
            const dx = spawnX - centerX;
            const dy = spawnY - centerY;
            distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            attempts++;
            
            // If too close and we've tried a few times, move spawn point further out
            if (distanceFromCenter < minSafeDistance && attempts < 5) {
                // Move spawn point further from center
                const angle = Math.atan2(dy, dx);
                const newDistance = minSafeDistance + 50;
                spawnX = centerX + Math.cos(angle) * newDistance;
                spawnY = centerY + Math.sin(angle) * newDistance;
                distanceFromCenter = newDistance;
            }
        } while (distanceFromCenter < minSafeDistance && attempts < 10);
        
        // Ensure spawn is outside screen bounds
        if (spawnX < -20) spawnX = -20;
        if (spawnX > GAME_WIDTH + 20) spawnX = GAME_WIDTH + 20;
        if (spawnY < -20) spawnY = -20;
        if (spawnY > GAME_HEIGHT + 20) spawnY = GAME_HEIGHT + 20;
        
        // Acquire projectile from pool (reuses existing objects)
        const projectile = this.projectilePool.acquire(
            spawnX,
            spawnY,
            centerX,
            centerY,
            this.currentProjectileSpeed
        );
        
        // Projectile spawned successfully
    }
    
    checkCollisions() {
        if (!this.player) return;
        
        // Build collision grid for spatial optimization (if many objects)
        const activeProjectiles = this.projectilePool.active.filter(p => p.active);
        const projectilesToCheck = activeProjectiles.length > 10 
            ? this.physics.getNearbyObjects(this.player).filter(p => p !== this.player && p.active)
            : activeProjectiles;
        
        for (const projectile of projectilesToCheck) {
            if (!projectile.active) continue;
            
            // Grace period: Don't check collision for projectiles that just spawned (200ms)
            const timeSinceSpawn = performance.now() - (projectile.spawnTime || 0);
            if (timeSinceSpawn < 200) continue;
            
            // Calculate distance from player center
            const dx = projectile.x - this.player.x;
            const dy = projectile.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if projectile has reached the circle radius
            const circleRadius = this.player.radius;
            const projectileRadius = projectile.radius;
            const collisionRadius = circleRadius + projectileRadius;
            
            // Projectile reaches circle when distance <= circleRadius + projectileRadius
            if (distance <= collisionRadius) {
                // Calculate angle from center to projectile (world coordinates)
                const projectileAngle = Math.atan2(dy, dx);
                
                // Check if projectile hits solid part or passes through gap
                const isSolid = this.player.isSolidAtAngle(projectileAngle);
                
                if (isSolid) {
                    // Hit solid part - collision!
                    this.handleCollision(projectile);
                    break; // Only handle one collision per frame
                } else {
                    // Passed through gap - dodged!
                    this.handleDodge(projectile);
                    // Don't break here - allow multiple dodges in same frame
                }
            }
        }
    }
    
    handleDodge(projectile) {
        // Check if already dodged to prevent double-processing
        if (projectile.dodged) {
            return;
        }
        
        // Mark as dodged immediately to prevent double-processing
        projectile.dodged = true;
        projectile.active = false;
        
        // Increment combo BEFORE calculating score (so multiplier applies correctly)
        this.combo++;
        this.updateComboMultiplier();
        this.projectilesDodgedThisGame++;
        
        // Award points (addScore will apply combo multiplier and difficulty bonus)
        const basePoints = 10;
        this.addScore(basePoints);
        
        // Visual feedback: floating score (calculate final points for display)
        const difficultyBonuses = {
            'easy': 1.0,
            'medium': 1.1,
            'hard': 1.2,
            'extreme': 1.3
        };
        const difficultyBonus = difficultyBonuses[this.difficulty] || 1.0;
        const finalPoints = Math.floor(basePoints * this.comboMultiplier * difficultyBonus);
        this.spawnFloatingScore(finalPoints, projectile.x, projectile.y);
        
        // Particle effect for successful dodge
        this.particleSystem.spawnExplosion(projectile.x, projectile.y, 8, '#0f0');
        
        // Release projectile back to pool
        this.projectilePool.release(projectile);
    }
    
    handleCollision(projectile) {
        // Trigger visual effects
        this.particleSystem.spawnExplosion(projectile.x, projectile.y, 12);
        this.player.triggerHitFlash();
        this.screenShake = 0.3; // 300ms shake
        this.screenShakeIntensity = 10;
        this.flashEffect = 0.1; // 100ms flash
        
        // Vibrate on collision (pattern: 100ms on, 50ms off, 100ms on)
        this.vibrationManager.vibrateCollision();
        
        // Reset combo
        this.combo = 0;
        this.comboMultiplier = 1;
        
        // Release projectile back to pool
        this.projectilePool.release(projectile);
        
        // Game over
        this.gameOver();
    }
    
    updateVisualEffects(deltaTime) {
        // Screen shake
        if (this.screenShake > 0) {
            this.screenShake -= deltaTime;
            if (this.screenShake < 0) {
                this.screenShake = 0;
                this.screenShakeIntensity = 0;
            }
        }
        
        // Flash effect
        if (this.flashEffect > 0) {
            this.flashEffect -= deltaTime;
            if (this.flashEffect < 0) {
                this.flashEffect = 0;
            }
        }
    }
    
    updateDifficulty() {
        // Increase spawn rate every 500 points (10% faster)
        const difficultyLevel = Math.floor(this.score / 500);
        this.currentSpawnRate = this.baseSpawnRate * Math.pow(0.9, difficultyLevel);
        this.currentSpawnRate = Math.max(this.currentSpawnRate, 0.3); // Cap at 0.3s minimum
        
        // Increase projectile speed slightly
        this.currentProjectileSpeed = this.baseProjectileSpeed + (difficultyLevel * 20);
        this.currentProjectileSpeed = Math.min(this.currentProjectileSpeed, 500); // Cap at 500
    }
    
    /**
     * Add score with multiplier and difficulty bonus
     * 
     * SCORING ALGORITHM:
     * - Base points: 10 per dodged projectile
     * - Combo multiplier: Increases every 10 dodges (1x, 2x, 3x, 4x, 5x max)
     * - Difficulty bonus: 
     *   - Easy: 1.0x (no bonus)
     *   - Medium: 1.1x (+10%)
     *   - Hard: 1.2x (+20%)
     *   - Extreme: 1.3x (+30%)
     * - Final score = basePoints × comboMultiplier × difficultyBonus
     * 
     * @param {number} points - Base points to add
     */
    addScore(basePoints) {
        // Calculate difficulty bonus
        const difficultyBonuses = {
            'easy': 1.0,
            'medium': 1.1,
            'hard': 1.2,
            'extreme': 1.3
        };
        const difficultyBonus = difficultyBonuses[this.difficulty] || 1.0;
        
        // Apply combo multiplier and difficulty bonus
        const points = Math.floor(basePoints);
        const finalPoints = Math.floor(points * this.comboMultiplier * difficultyBonus);
        
        // Add to score
        const oldScore = this.score;
        this.score += finalPoints;
        
        // Debug logging
        console.log(`Score updated: ${oldScore} + ${finalPoints} = ${this.score} (combo: ${this.combo}, multiplier: ${this.comboMultiplier}x, difficulty: ${this.difficulty})`);
        
        // Update session best
        if (this.score > this.sessionBest) {
            this.sessionBest = this.score;
        }
        
        // Update best combo for this game
        if (this.combo > this.bestComboThisGame) {
            this.bestComboThisGame = this.combo;
        }
        
        // Check achievements
        this.checkAchievements();
    }
    
    spawnFloatingScore(points, x, y) {
        this.floatingScores.push({
            x: x,
            y: y,
            text: `+${points}`,
            life: 1.0, // 1 second
            maxLife: 1.0,
            velocityY: -100, // Move upward
            alpha: 1.0
        });
    }
    
    updateFloatingScores(deltaTime) {
        for (let i = this.floatingScores.length - 1; i >= 0; i--) {
            const floating = this.floatingScores[i];
            floating.life -= deltaTime;
            floating.y += floating.velocityY * deltaTime;
            floating.alpha = floating.life / floating.maxLife;
            
            if (floating.life <= 0) {
                this.floatingScores.splice(i, 1);
            }
        }
    }
    
    renderFloatingScores() {
        for (const floating of this.floatingScores) {
            this.ctx.save();
            this.ctx.globalAlpha = floating.alpha;
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(floating.text, floating.x, floating.y);
            this.ctx.restore();
        }
    }
    
    updateComboMultiplier() {
        // Increase multiplier every 10 dodges
        this.comboMultiplier = 1 + Math.floor(this.combo / 10);
        this.comboMultiplier = Math.min(this.comboMultiplier, 5); // Cap at 5x
    }
    
    updatePaused(deltaTime) {
        const touch = this.inputManager.getPrimaryTouch();
        
        if (this.inputManager.wasJustPressed && touch) {
            // Check RESUME button
            const resumeButton = this.getResumeButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, resumeButton)) {
                this.vibrationManager.vibrateTap();
                this.currentState = GameState.PLAYING;
                return;
            }
            
            // Check SETTINGS button
            const settingsButton = this.getPauseSettingsButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, settingsButton)) {
                this.vibrationManager.vibrateTap();
                this.currentState = GameState.SETTINGS;
                return;
            }
            
            // Check QUIT button
            const quitButton = this.getQuitButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, quitButton)) {
                this.vibrationManager.vibrateTap();
                this.currentState = GameState.MENU;
                return;
            }
        }
        
        // Fallback: space key to resume
        if (this.inputManager.isKeyPressed('Space')) {
            this.currentState = GameState.PLAYING;
        }
        
        // Handle back button (Android)
        if (this.inputManager.isKeyPressed('Escape') || this.inputManager.isKeyPressed('Backspace')) {
            this.currentState = GameState.PLAYING;
        }
    }
    
    updateGameOver(deltaTime) {
        const touch = this.inputManager.getPrimaryTouch();
        
        if (this.inputManager.wasJustPressed && touch) {
            // Check RETRY button
            const retryButton = this.getRetryButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, retryButton)) {
                this.vibrationManager.vibrateTap();
                this.startGame();
                return;
            }
            
            // Check MAIN MENU button
            const menuButton = this.getMainMenuButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, menuButton)) {
                this.vibrationManager.vibrateTap();
                // Reset visual effects when leaving game over screen
                this.resetVisualEffects();
                this.currentState = GameState.MENU;
                return;
            }
            
            // Check SHARE button (if available)
            if (navigator.share) {
                const shareButton = this.getShareButtonBounds();
                if (this.isPointInButton(touch.x, touch.y, shareButton)) {
                    this.vibrationManager.vibrateTap();
                    this.shareScore();
                    return;
                }
            }
        }
    }
    
    shareScore() {
        if (navigator.share) {
            const shareText = `I scored ${this.score.toLocaleString()} points in Spin Escape! Can you beat it?`;
            navigator.share({
                title: 'Spin Escape Score',
                text: shareText,
                url: window.location.href
            }).catch(err => {
                console.log('Error sharing:', err);
            });
        }
    }
    
    getShareButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT / 2 + 300,
            width: 300,
            height: 70
        };
    }
    
    updateLevelUp(deltaTime) {
        // Handle level up screen (for future use)
        if (this.inputManager.wasJustPressed || this.inputManager.isKeyPressed('Space')) {
            this.currentState = GameState.PLAYING;
        }
    }
    
    updateSettings(deltaTime) {
        const touch = this.inputManager.getPrimaryTouch();
        
        if (this.inputManager.wasJustPressed && touch) {
            // Check Back button
            const backButton = this.getBackButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, backButton)) {
                this.vibrationManager.vibrateTap();
                this.currentState = GameState.MENU;
                return;
            }
            
            // Check Sound toggle
            const soundButton = this.getSoundButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, soundButton)) {
                this.vibrationManager.vibrateTap();
                this.soundEnabled = !this.soundEnabled;
                this.saveGameSettings();
                return;
            }
            
            // Check Vibration toggle
            const vibrationButton = this.getVibrationButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, vibrationButton)) {
                this.vibrationManager.vibrateTap();
                this.vibrationManager.toggle();
                return;
            }
            
            // Check Difficulty buttons
            const difficulties = ['easy', 'medium', 'hard', 'extreme'];
            for (const diff of difficulties) {
                const diffButton = this.getDifficultyButtonBounds(diff);
                if (this.isPointInButton(touch.x, touch.y, diffButton)) {
                    this.vibrationManager.vibrateTap();
                    this.difficulty = diff;
                    this.saveGameSettings();
                    return;
                }
            }
            
            // Check Reset All Data button
            const resetButton = this.getResetDataButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, resetButton)) {
                if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                    this.vibrationManager.vibrateTap();
                    this.resetAllData();
                    // Reload settings after reset
                    this.loadGameSettings();
                    this.vibrationManager.loadSettings();
                }
                return;
            }
        }
        
        // Handle back button (Android)
        if (this.inputManager.isKeyPressed('Escape') || this.inputManager.isKeyPressed('Backspace')) {
            this.currentState = GameState.MENU;
        }
    }
    
    render() {
        // Safety check: ensure canvas context exists
        if (!this.ctx) {
            console.error('Canvas context not available');
            return;
        }
        
        try {
            // Apply screen shake offset (only during PLAYING or GAME_OVER states)
            let offsetX = 0;
            let offsetY = 0;
            if (this.screenShake > 0 && 
                (this.currentState === GameState.PLAYING || this.currentState === GameState.GAME_OVER)) {
                offsetX = (Math.random() - 0.5) * this.screenShakeIntensity;
                offsetY = (Math.random() - 0.5) * this.screenShakeIntensity;
            }
            
            // Clear canvas with solid background color
            this.ctx.fillStyle = '#1a1a2e';
            this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            // Flash effect overlay (only during PLAYING state)
            if (this.flashEffect > 0 && this.currentState === GameState.PLAYING) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashEffect * 10})`;
                this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            }
            
            // Apply screen shake transform
            this.ctx.save();
            this.ctx.translate(offsetX, offsetY);
            
            // Render based on current state
            try {
                switch (this.currentState) {
                    case GameState.MENU:
                        this.renderMenu();
                        break;
                    case GameState.PLAYING:
                        this.renderPlaying();
                        break;
                    case GameState.PAUSED:
                        this.renderPlaying();
                        this.renderPaused();
                        break;
                    case GameState.GAME_OVER:
                        this.renderGameOver();
                        break;
                    case GameState.LEVEL_UP:
                        this.renderLevelUp();
                        break;
                    case GameState.SETTINGS:
                        this.renderSettings();
                        break;
                    case GameState.HOW_TO_PLAY:
                        this.renderHowToPlay();
                        break;
                    default:
                        // Fallback for unknown state
                        this.ctx.fillStyle = '#fff';
                        this.ctx.font = '48px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText(`Unknown State: ${this.currentState}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
                        break;
                }
            } catch (renderError) {
                console.error('Error in render method for state:', this.currentState, renderError);
                // Fallback rendering on error
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '48px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Rendering Error', GAME_WIDTH / 2, GAME_HEIGHT / 2);
            }
            
            this.ctx.restore();
        } catch (e) {
            console.error('Critical error in render():', e);
            // Emergency fallback - clear canvas and show error
            if (this.ctx) {
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
                this.ctx.fillStyle = '#f00';
                this.ctx.font = '24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Rendering Error - Check Console', GAME_WIDTH / 2, GAME_HEIGHT / 2);
            }
        }
    }
    
    renderMenu() {
        const theme = this.themeManager.getTheme();
        
        // Background - try to use image first, fallback to gradient
        if (this.menuBackgroundImage) {
            this.ctx.drawImage(this.menuBackgroundImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
            // Apply overlay for readability
            const overlayGradient = this.themeManager.createGradient(
                this.ctx, 0, 0, 0, GAME_HEIGHT,
                ['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.6)']
            );
            this.ctx.fillStyle = overlayGradient;
            this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        } else {
            // Fallback to gradient background
            const bgGradient = this.themeManager.getBackgroundGradient(this.ctx);
            this.ctx.fillStyle = bgGradient;
            this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
        
        // Render menu particles
        this.renderMenuParticles();
        
        // Title with animation and glow effect
        this.ctx.save();
        const titleY = 150;
        const titleScale = this.menuTitlePulse;
        const titleAlpha = this.menuTitleAlpha;
        
        // Title glow/shadow
        this.ctx.shadowColor = theme.effects.glowColor || theme.colors.primary;
        this.ctx.shadowBlur = 30;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Title text
        this.ctx.globalAlpha = titleAlpha;
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = `bold ${Math.floor(120 * titleScale)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SPIN ESCAPE', GAME_WIDTH / 2, titleY);
        this.ctx.restore();
        
        // Best Score with enhanced styling
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 2;
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        const formattedScore = this.highScore.toLocaleString();
        this.ctx.fillText(`BEST SCORE: ${formattedScore}`, GAME_WIDTH / 2, 250);
        this.ctx.restore();
        
        // Games played
        this.ctx.save();
        this.ctx.fillStyle = theme.colors.textSecondary || '#aaa';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Games Played: ${this.gameCount}`, GAME_WIDTH / 2, 290);
        this.ctx.restore();
        
        // Play button (centered, large, primary)
        const playButton = this.getPlayButtonBounds();
        const playHovered = this.isButtonHovered(playButton);
        this.drawButton(playButton, 'PLAY', theme.colors.primary, playHovered, true);
        
        // How to Play button
        const howToPlayButton = this.getHowToPlayButtonBounds();
        const howToPlayHovered = this.isButtonHovered(howToPlayButton);
        this.drawButton(howToPlayButton, 'HOW TO PLAY', theme.colors.secondary, howToPlayHovered);
        
        // Settings button (small, at bottom)
        const settingsButton = this.getSettingsButtonBounds();
        const settingsHovered = this.isButtonHovered(settingsButton);
        this.drawButton(settingsButton, 'SETTINGS', theme.colors.secondary, settingsHovered);
    }
    
    renderMenuParticles() {
        if (this.menuParticles.length === 0) return;
        
        const theme = this.themeManager.getTheme();
        
        for (const p of this.menuParticles) {
            const alpha = p.life / p.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha * 0.6;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 5;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    
    renderPlaying() {
        // Background grid (subtle visual reference)
        this.ctx.strokeStyle = '#2a2a3e';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < GAME_WIDTH; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, GAME_HEIGHT);
            this.ctx.stroke();
        }
        for (let y = 0; y < GAME_HEIGHT; y += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(GAME_WIDTH, y);
            this.ctx.stroke();
        }
        
        // Render projectiles (using object pool)
        this.projectilePool.render(this.ctx);
        
        // Render player
        if (this.player) {
            this.player.render(this.ctx);
        }
        
        // Render particles
        this.particleSystem.render(this.ctx);
        
        // Render floating scores
        this.renderFloatingScores();
        
        // Visual feedback: touch points show as small circles while pressed
        const allTouches = this.inputManager.getAllTouches();
        for (let i = 0; i < allTouches.length; i++) {
            const touch = allTouches[i];
            // Primary touch (first) is brighter
            const alpha = i === 0 ? 0.7 : 0.4;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(touch.x, touch.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Show touch number for multi-touch debugging
            if (allTouches.length > 1) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText((i + 1).toString(), touch.x, touch.y);
            }
        }
        
        // Visual feedback: show pinch gesture if detected
        const pinch = this.inputManager.detectPinch();
        if (pinch && pinch.touches && pinch.touches.length >= 2 && pinch.center) {
            // Draw line between two touches
            const touches = pinch.touches;
            // Safety check: ensure touches exist
            if (touches[0] && touches[1]) {
                this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(touches[0].x, touches[0].y);
                this.ctx.lineTo(touches[1].x, touches[1].y);
                this.ctx.stroke();
                
                // Draw center point
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(pinch.center.x, pinch.center.y, 8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Show distance (for debugging)
                this.ctx.fillStyle = '#ff0';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${Math.floor(pinch.distance)}px`, pinch.center.x, pinch.center.y - 15);
            }
        }
        
        // Draw gameplay HUD background with theme
        const theme = this.themeManager.getTheme();
        const hudGradient = this.themeManager.createGradient(
            this.ctx, 0, 0, 0, 200,
            ['rgba(26, 26, 46, 0.95)', 'rgba(26, 26, 46, 0.85)']
        );
        this.ctx.fillStyle = hudGradient;
        this.ctx.fillRect(0, 0, GAME_WIDTH, 200);
        
        // HUD - Score (60px font as per requirements) with glow
        this.ctx.save();
        this.ctx.shadowColor = theme.effects.glowColor || theme.colors.primary;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Score: ${this.score}`, GAME_WIDTH / 2, 80);
        this.ctx.restore();
        
        // Combo multiplier display with enhanced styling
        if (this.comboMultiplier > 1) {
            this.ctx.save();
            this.ctx.shadowColor = theme.colors.warning || '#ffd700';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = theme.colors.warning || '#ffd700';
            this.ctx.font = 'bold 32px Arial';
            this.ctx.fillText(`${this.comboMultiplier}x COMBO!`, GAME_WIDTH / 2, 130);
            this.ctx.restore();
            
            this.ctx.save();
            this.ctx.fillStyle = theme.colors.text || '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Dodges: ${this.combo}`, GAME_WIDTH / 2, 160);
            this.ctx.restore();
        }
        
        // Level/Difficulty indicator (top-left) with theme colors
        const difficultyLevel = Math.floor(this.score / 500);
        this.ctx.save();
        this.ctx.fillStyle = theme.colors.textSecondary || '#aaa';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Level: ${difficultyLevel + 1}`, 20, 30);
        this.ctx.fillText(`Difficulty: ${this.difficulty.toUpperCase()}`, 20, 55);
        this.ctx.restore();
    }
    
    renderPaused() {
        const theme = this.themeManager.getTheme();
        
        // Draw pause overlay with theme
        const overlayGradient = this.themeManager.createGradient(
            this.ctx, 0, 0, 0, GAME_HEIGHT,
            ['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.85)']
        );
        this.ctx.fillStyle = overlayGradient;
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Paused text with glow
        this.ctx.save();
        this.ctx.shadowColor = theme.effects.glowColor || theme.colors.primary;
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', GAME_WIDTH / 2, 200);
        this.ctx.restore();
        
        // Buttons: RESUME, SETTINGS, QUIT with theme
        const resumeButton = this.getResumeButtonBounds();
        const resumeHovered = this.isButtonHovered(resumeButton);
        this.drawButton(resumeButton, 'RESUME', theme.colors.primary, resumeHovered, true);
        
        const settingsButton = this.getPauseSettingsButtonBounds();
        const settingsHovered = this.isButtonHovered(settingsButton);
        this.drawButton(settingsButton, 'SETTINGS', theme.colors.secondary, settingsHovered);
        
        const quitButton = this.getQuitButtonBounds();
        const quitHovered = this.isButtonHovered(quitButton);
        this.drawButton(quitButton, 'QUIT', theme.colors.secondary, quitHovered);
    }
    
    renderGameOver() {
        const theme = this.themeManager.getTheme();
        
        // Draw game over background with theme
        const overlayGradient = this.themeManager.createGradient(
            this.ctx, 0, 0, 0, GAME_HEIGHT,
            ['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.95)']
        );
        this.ctx.fillStyle = overlayGradient;
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Game Over text (large) with dramatic glow
        this.ctx.save();
        this.ctx.shadowColor = theme.colors.danger || '#f00';
        this.ctx.shadowBlur = 30;
        this.ctx.fillStyle = theme.colors.danger || '#f00';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', GAME_WIDTH / 2, 200);
        this.ctx.restore();
        
        // Final score (large) with glow
        this.ctx.save();
        this.ctx.shadowColor = theme.effects.glowColor || theme.colors.primary;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = 'bold 48px Arial';
        const formattedScore = this.score.toLocaleString();
        this.ctx.fillText(`Score: ${formattedScore}`, GAME_WIDTH / 2, 280);
        this.ctx.restore();
        
        // Best score comparison (formatted as "BEST: 15,200")
        this.ctx.save();
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = '32px Arial';
        const formattedHighScore = this.highScore.toLocaleString();
        this.ctx.fillText(`BEST: ${formattedHighScore}`, GAME_WIDTH / 2, 330);
        this.ctx.restore();
        
        // Session best
        if (this.sessionBest > 0 && this.sessionBest !== this.score) {
            this.ctx.save();
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = theme.colors.textSecondary || '#aaa';
            const formattedSessionBest = this.sessionBest.toLocaleString();
            this.ctx.fillText(`Session Best: ${formattedSessionBest}`, GAME_WIDTH / 2, 360);
            this.ctx.restore();
        }
        
        // Best combo
        if (this.bestComboThisGame > 0) {
            this.ctx.save();
            this.ctx.fillStyle = theme.colors.text || '#fff';
            this.ctx.font = '28px Arial';
            this.ctx.fillText(`Best Combo: ${this.bestComboThisGame}`, GAME_WIDTH / 2, 390);
            this.ctx.restore();
        }
        
        // Top 3 Scores with enhanced styling
        if (this.topScores && this.topScores.length > 0) {
            this.ctx.save();
            this.ctx.fillStyle = theme.colors.text || '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Top Scores:', GAME_WIDTH / 2, 450);
            this.ctx.restore();
            
            let y = 485;
            const maxDisplay = Math.min(this.topScores.length, 3);
            for (let i = 0; i < maxDisplay; i++) {
                const scoreData = this.topScores[i];
                // Safety check: ensure scoreData exists and has score property
                if (!scoreData || typeof scoreData.score !== 'number') {
                    continue;
                }
                const rank = i + 1;
                const scoreText = `${rank}. ${scoreData.score.toLocaleString()}`;
                this.ctx.save();
                this.ctx.fillStyle = rank === 1 ? (theme.colors.warning || '#ffd700') : (theme.colors.textSecondary || '#aaa');
                if (rank === 1) {
                    this.ctx.shadowColor = theme.colors.warning || '#ffd700';
                    this.ctx.shadowBlur = 10;
                }
                this.ctx.font = '20px Arial';
                this.ctx.fillText(scoreText, GAME_WIDTH / 2, y);
                this.ctx.restore();
                y += 30;
            }
        }
        
        // RETRY button (success color, large, primary)
        const retryButton = this.getRetryButtonBounds();
        const retryHovered = this.isButtonHovered(retryButton);
        this.drawButton(retryButton, 'RETRY', theme.colors.success || '#0f0', retryHovered, true);
        
        // MAIN MENU button (secondary)
        const menuButton = this.getMainMenuButtonBounds();
        const menuHovered = this.isButtonHovered(menuButton);
        this.drawButton(menuButton, 'MAIN MENU', theme.colors.secondary, menuHovered);
        
        // Share button (optional, for web version)
        if (navigator.share) {
            const shareButton = this.getShareButtonBounds();
            const shareHovered = this.isButtonHovered(shareButton);
            this.drawButton(shareButton, 'SHARE', theme.colors.primary, shareHovered);
        }
    }
    
    renderLevelUp() {
        const theme = this.themeManager.getTheme();
        
        // Background with theme
        const overlayGradient = this.themeManager.createGradient(
            this.ctx, 0, 0, 0, GAME_HEIGHT,
            ['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.95)']
        );
        this.ctx.fillStyle = overlayGradient;
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Level Up text with dramatic glow
        this.ctx.save();
        this.ctx.shadowColor = theme.colors.success || '#0f0';
        this.ctx.shadowBlur = 30;
        this.ctx.fillStyle = theme.colors.success || '#0f0';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LEVEL UP!', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.ctx.restore();
        
        // Continue text with theme
        this.ctx.save();
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Tap or Press Space to Continue', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);
        this.ctx.restore();
    }
    
    startGame() {
        // Reset menu initialization flag
        this.menuInitialized = false;
        
        this.currentState = GameState.PLAYING;
        this.score = 0;
        this.combo = 0;
        this.comboMultiplier = 1;
        this.bestComboThisGame = 0;
        this.projectilesDodgedThisGame = 0;
        this.spawnTimer = 0;
        this.currentSpawnRate = this.baseSpawnRate;
        this.currentProjectileSpeed = this.baseProjectileSpeed;
        this.gameStartTime = performance.now();
        this.gamePlaytime = 0;
        
        // Clear floating scores
        this.floatingScores = [];
        
        // Clear projectile pool (return all to pool)
        this.projectilePool.clear();
        
        // Initialize player at center
        this.player = new Player(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        
        // Clear particles
        this.particleSystem.particles = [];
        
        // Reset visual effects
        this.resetVisualEffects();
        
        console.log('Game Started');
    }
    
    resetVisualEffects() {
        this.screenShake = 0;
        this.screenShakeIntensity = 0;
        this.flashEffect = 0;
    }
    
    gameOver() {
        this.currentState = GameState.GAME_OVER;
        
        // Calculate playtime for this game
        if (this.gameStartTime > 0) {
            this.gamePlaytime = Math.floor((performance.now() - this.gameStartTime) / 1000);
        }
        
        // Increment game count
        this.gameCount++;
        
        // Vibrate on game over
        this.vibrationManager.vibrateGameOver();
        
        // Validate and save score using DataManager
        if (this.validateScore(this.score)) {
            // Save to top 10 leaderboard
            this.dataManager.saveScore(this.score);
            
            // Update high score if beaten
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.saveHighScore({
                    highScore: this.score,
                    timestamp: Math.floor(Date.now() / 1000),
                    gameCount: this.gameCount
                });
            }
            
            // Update player stats
            this.dataManager.updatePlayerStats({
                score: this.score,
                combo: this.bestComboThisGame,
                projectilesDodged: this.projectilesDodgedThisGame,
                playtime: this.gamePlaytime
            });
            
            // Reload stats
            this.playerStats = this.dataManager.getPlayerStats();
            this.topScores = this.dataManager.loadHighScores();
        } else {
            console.warn(`Suspicious score detected: ${this.score}. Score not saved.`);
        }
        
        // Update high score data
        this.highScoreData = {
            highScore: this.highScore,
            timestamp: Math.floor(Date.now() / 1000),
            gameCount: this.gameCount
        };
        this.saveHighScore(this.highScoreData);
        
        // Check for "First Play" achievement
        if (this.gameCount === 1) {
            this.unlockAchievement('firstPlay');
        }
    }
    
    validateScore(score) {
        // Reasonable maximum: 1,000,000 points
        // (assuming very skilled player, 100 points per second for ~2.7 hours)
        const maxReasonableScore = 1000000;
        
        if (score > maxReasonableScore) {
            console.warn(`Score ${score} exceeds reasonable maximum ${maxReasonableScore}`);
            return false;
        }
        
        // Score should be non-negative
        if (score < 0) {
            console.warn(`Negative score detected: ${score}`);
            return false;
        }
        
        // Score should be a number
        if (isNaN(score) || !isFinite(score)) {
            console.warn(`Invalid score: ${score}`);
            return false;
        }
        
        return true;
    }
    
    checkAchievements() {
        // Check "Score 1000" achievement
        if (this.score >= 1000 && !this.hasAchievement('score1000')) {
            this.unlockAchievement('score1000');
        }
        
        // Check "50 Combo" achievement
        if (this.combo >= 50 && !this.hasAchievement('combo50')) {
            this.unlockAchievement('combo50');
        }
    }
    
    hasAchievement(id) {
        return this.achievements.includes(id);
    }
    
    unlockAchievement(id) {
        if (!this.hasAchievement(id)) {
            this.achievements.push(id);
            this.saveAchievements();
            console.log(`Achievement unlocked: ${id}`);
            
            // Visual feedback for achievement
            this.particleSystem.spawnExplosion(GAME_WIDTH / 2, GAME_HEIGHT / 2, 20);
        }
    }
    
    loadAchievements() {
        try {
            const saved = localStorage.getItem('spinEscapeAchievements');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load achievements:', e);
            return [];
        }
    }
    
    saveAchievements() {
        try {
            localStorage.setItem('spinEscapeAchievements', JSON.stringify(this.achievements));
        } catch (e) {
            console.error('Failed to save achievements:', e);
        }
    }
    
    // Data persistence
    loadHighScore() {
        try {
            const saved = localStorage.getItem('spinEscapeHighScore');
            if (saved) {
                // Try to parse as new format (object)
                try {
                    const data = JSON.parse(saved);
                    if (data && typeof data === 'object' && 'highScore' in data) {
                        return data;
                    }
                } catch (e) {
                    // Fallback: old format (just number)
                    const score = parseInt(saved, 10);
                    if (!isNaN(score)) {
                        return {
                            highScore: score,
                            timestamp: Math.floor(Date.now() / 1000),
                            gameCount: 0
                        };
                    }
                }
            }
            return { highScore: 0, timestamp: 0, gameCount: 0 };
        } catch (e) {
            console.error('Failed to load high score:', e);
            return { highScore: 0, timestamp: 0, gameCount: 0 };
        }
    }
    
    saveHighScore(data) {
        try {
            // Validate data structure
            if (data && typeof data === 'object' && 'highScore' in data) {
                localStorage.setItem('spinEscapeHighScore', JSON.stringify(data));
            } else {
                console.error('Invalid high score data format');
            }
        } catch (e) {
            console.error('Failed to save high score:', e);
        }
    }
    
    resetAllData() {
        try {
            // Use DataManager to reset
            this.dataManager.resetData();
            
            // Reset in-memory data
            this.highScore = 0;
            this.highScoreData = { highScore: 0, timestamp: 0, gameCount: 0 };
            this.gameCount = 0;
            this.sessionBest = 0;
            this.topScores = [];
            this.achievements = [];
            this.soundEnabled = true;
            this.difficulty = 'medium';
            this.vibrationManager.enabled = true;
            this.playerStats = {
                totalGamesPlayed: 0,
                totalProjectilesDodged: 0,
                bestCombo: 0,
                totalScore: 0,
                averageScore: 0,
                totalPlaytime: 0,
                bestScore: 0
            };
            
            console.log('All game data reset');
        } catch (e) {
            console.error('Failed to reset data:', e);
        }
    }
    
    loadGameSettings() {
        try {
            const saved = localStorage.getItem('spinEscapeSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
                this.difficulty = settings.difficulty || 'medium';
                if (settings.vibrationEnabled !== undefined) {
                    this.vibrationManager.enabled = settings.vibrationEnabled;
                }
            }
        } catch (e) {
            console.error('Failed to load game settings:', e);
            // Use defaults on error
            this.soundEnabled = true;
            this.difficulty = 'medium';
        }
    }
    
    saveGameSettings() {
        try {
            const settings = {
                soundEnabled: this.soundEnabled,
                vibrationEnabled: this.vibrationManager.isEnabled(),
                difficulty: this.difficulty,
                lastPlayed: Math.floor(Date.now() / 1000)
            };
            
            // Save using DataManager
            this.dataManager.saveSettings(settings);
            
            // Also save to old location for backward compatibility
            localStorage.setItem('spinEscapeSettings', JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save game settings:', e);
        }
    }
    
    renderSettings() {
        const theme = this.themeManager.getTheme();
        
        // Background with theme
        const overlayGradient = this.themeManager.createGradient(
            this.ctx, 0, 0, 0, GAME_HEIGHT,
            theme.gradients.overlay || ['rgba(0, 0, 0, 0.95)', 'rgba(0, 0, 0, 0.95)']
        );
        this.ctx.fillStyle = overlayGradient;
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Title with glow
        this.ctx.save();
        this.ctx.shadowColor = theme.effects.glowColor || theme.colors.primary;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SETTINGS', GAME_WIDTH / 2, 100);
        this.ctx.restore();
        
        // Sound toggle with theme
        const soundButton = this.getSoundButtonBounds();
        const soundText = `Sound: ${this.soundEnabled ? 'ON' : 'OFF'}`;
        const soundHovered = this.isButtonHovered(soundButton);
        this.drawButton(soundButton, soundText, this.soundEnabled ? theme.colors.primary : theme.colors.secondary, soundHovered);
        
        // Vibration toggle with theme
        const vibrationButton = this.getVibrationButtonBounds();
        const vibrationText = `Vibration: ${this.vibrationManager.isEnabled() ? 'ON' : 'OFF'}`;
        const vibrationHovered = this.isButtonHovered(vibrationButton);
        this.drawButton(vibrationButton, vibrationText, this.vibrationManager.isEnabled() ? theme.colors.primary : theme.colors.secondary, vibrationHovered);
        
        // Difficulty label with theme
        this.ctx.save();
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Difficulty:', GAME_WIDTH / 2, 500);
        this.ctx.restore();
        
        // Difficulty buttons with theme
        const difficulties = ['easy', 'medium', 'hard', 'extreme'];
        const buttonWidth = 150;
        const buttonHeight = 60;
        const spacing = 20;
        const totalWidth = (buttonWidth * 4) + (spacing * 3);
        const startX = (GAME_WIDTH - totalWidth) / 2;
        
        for (let i = 0; i < difficulties.length; i++) {
            const diff = difficulties[i];
            const x = startX + (buttonWidth + spacing) * i;
            const y = 550;
            const bounds = { x, y, width: buttonWidth, height: buttonHeight };
            
            const isSelected = this.difficulty === diff;
            const color = isSelected ? theme.colors.primary : theme.colors.secondary;
            const text = diff.toUpperCase();
            
            this.drawButton(bounds, text, color, false, isSelected);
        }
        
        // Back button with theme
        const backButton = this.getBackButtonBounds();
        const backHovered = this.isButtonHovered(backButton);
        this.drawButton(backButton, 'BACK', theme.colors.secondary, backHovered);
        
        // Reset All Data button with theme
        const resetButton = this.getResetDataButtonBounds();
        const resetHovered = this.isButtonHovered(resetButton);
        this.drawButton(resetButton, 'RESET ALL DATA', theme.colors.danger || '#f00', resetHovered);
        
        // Achievements display with theme
        if (this.achievements.length > 0) {
            this.ctx.save();
            this.ctx.fillStyle = theme.colors.text || '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Achievements:', GAME_WIDTH / 2, 1000);
            this.ctx.restore();
            
            const achievementNames = {
                'firstPlay': 'First Play',
                'score1000': 'Score 1000',
                'combo50': '50 Combo'
            };
            
            let y = 1035;
            for (const achievementId of this.achievements) {
                const name = achievementNames[achievementId] || achievementId;
                this.ctx.save();
                this.ctx.shadowColor = theme.colors.warning || '#ffd700';
                this.ctx.shadowBlur = 8;
                this.ctx.fillStyle = theme.colors.warning || '#ffd700';
                this.ctx.font = '20px Arial';
                this.ctx.fillText(`✓ ${name}`, GAME_WIDTH / 2, y);
                this.ctx.restore();
                y += 30;
            }
        }
    }
    
    // renderThemePreview() and drawImageOrFallback() methods removed - theme system not used
    
    // Button helper methods
    getPlayButtonBounds() {
        // Large button, centered (minimum 100x50px as per requirements)
        return {
            x: GAME_WIDTH / 2 - 150,
            y: 480,
            width: 300,
            height: 80
        };
    }
    
    getSettingsButtonBounds() {
        // Small button at bottom of menu
        return {
            x: GAME_WIDTH / 2 - 100,
            y: GAME_HEIGHT - 100,
            width: 200,
            height: 60
        };
    }
    
    getHowToPlayButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: 560,
            width: 300,
            height: 70
        };
    }
    
    updateHowToPlay(deltaTime) {
        const touch = this.inputManager.getPrimaryTouch();
        
        if (this.inputManager.wasJustPressed && touch) {
            // Check Back button
            const backButton = this.getBackButtonBounds();
            if (this.isPointInButton(touch.x, touch.y, backButton)) {
                this.vibrationManager.vibrateTap();
                this.currentState = GameState.MENU;
                return;
            }
        }
        
        // Handle back button (Android)
        if (this.inputManager.isKeyPressed('Escape') || this.inputManager.isKeyPressed('Backspace')) {
            this.currentState = GameState.MENU;
        }
    }
    
    renderHowToPlay() {
        const theme = this.themeManager.getTheme();
        
        // Background with theme
        const overlayGradient = this.themeManager.createGradient(
            this.ctx, 0, 0, 0, GAME_HEIGHT,
            theme.gradients.overlay || ['rgba(0, 0, 0, 0.95)', 'rgba(0, 0, 0, 0.95)']
        );
        this.ctx.fillStyle = overlayGradient;
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Title with glow
        this.ctx.save();
        this.ctx.shadowColor = theme.effects.glowColor || theme.colors.primary;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('HOW TO PLAY', GAME_WIDTH / 2, 100);
        this.ctx.restore();
        
        // Instructions with theme
        this.ctx.save();
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.textAlign = 'center';
        let y = 200;
        const instructions = [
            'Rotate the circle to dodge',
            'incoming projectiles!',
            '',
            'Tap anywhere on screen to',
            'rotate the circle toward',
            'that direction.',
            '',
            'Dodge projectiles to earn',
            'points and build combos.',
            '',
            'Higher combos = more points!',
            '',
            'Difficulty increases every',
            '500 points.'
        ];
        
        for (const line of instructions) {
            if (line) {
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 4;
                this.ctx.shadowOffsetY = 2;
            }
            this.ctx.fillText(line, GAME_WIDTH / 2, y);
            y += 35;
        }
        this.ctx.restore();
        
        // Back button with theme
        const backButton = this.getBackButtonBounds();
        const backHovered = this.isButtonHovered(backButton);
        this.drawButton(backButton, 'BACK', theme.colors.secondary, backHovered);
    }
    
    getRetryButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT / 2 + 100,
            width: 300,
            height: 80
        };
    }
    
    getMainMenuButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT / 2 + 200,
            width: 300,
            height: 70
        };
    }
    
    getResumeButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT / 2 - 50,
            width: 300,
            height: 80
        };
    }
    
    getPauseSettingsButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT / 2 + 50,
            width: 300,
            height: 70
        };
    }
    
    getQuitButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT / 2 + 150,
            width: 300,
            height: 70
        };
    }
    
    getBackButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT - 220,
            width: 300,
            height: 70
        };
    }
    
    getResetDataButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT - 130,
            width: 300,
            height: 60
        };
    }
    
    getSoundButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 200,
            y: 200,
            width: 400,
            height: 70
        };
    }
    
    getVibrationButtonBounds() {
        return {
            x: GAME_WIDTH / 2 - 200,
            y: 300,
            width: 400,
            height: 70
        };
    }
    
    getDifficultyButtonBounds(difficulty) {
        const difficulties = ['easy', 'medium', 'hard', 'extreme'];
        const buttonWidth = 150;
        const buttonHeight = 60;
        const spacing = 20;
        const totalWidth = (buttonWidth * 4) + (spacing * 3);
        const startX = (GAME_WIDTH - totalWidth) / 2;
        const index = difficulties.indexOf(difficulty);
        
        return {
            x: startX + (buttonWidth + spacing) * index,
            y: 550,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    drawButton(bounds, text, color, isHovered = false, isPrimary = false) {
        // Use enhanced button if theme system is available
        if (this.themeManager) {
            this.drawEnhancedButton(bounds, text, color, isHovered, isPrimary);
        } else {
            // Fallback to original button rendering
            this.drawButtonLegacy(bounds, text, color, isHovered);
        }
    }
    
    drawButtonLegacy(bounds, text, color, isHovered = false) {
        const { x, y, width, height } = bounds;
        
        // Hover state: slightly brighter and larger
        const hoverScale = isHovered ? 1.05 : 1.0;
        const hoverBrightness = isHovered ? 1.2 : 1.0;
        
        // Adjust color brightness for hover
        const baseColor = color;
        let hoverColor = color;
        if (isHovered && color !== '#fff' && color !== '#000') {
            // Lighten the color for hover effect
            hoverColor = this.lightenColor(color, 0.2);
        }
        
        // Button background
        this.ctx.fillStyle = hoverColor;
        this.ctx.fillRect(x, y, width, height);
        
        // Button border (thicker when hovered)
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = isHovered ? 3 : 2;
        this.ctx.strokeRect(x, y, width, height);
        
        // Button text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${Math.floor(28 * hoverScale)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x + width / 2, y + height / 2);
    }
    
    drawEnhancedButton(bounds, text, color, isHovered = false, isPrimary = false) {
        const { x, y, width, height } = bounds;
        const theme = this.themeManager.getTheme();
        const radius = theme.buttonRadius || 15;
        
        // Hover scale effect
        const hoverScale = isHovered ? 1.05 : 1.0;
        const scaleX = x + width / 2;
        const scaleY = y + height / 2;
        const scaledWidth = width * hoverScale;
        const scaledHeight = height * hoverScale;
        const scaledX = scaleX - scaledWidth / 2;
        const scaledY = scaleY - scaledHeight / 2;
        
        // Save context
        this.ctx.save();
        
        // Shadow
        const shadow = theme.buttonShadow || { blur: 10, offsetX: 0, offsetY: 4 };
        this.ctx.shadowColor = theme.effects.shadowColor || 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = shadow.blur;
        this.ctx.shadowOffsetX = shadow.offsetX;
        this.ctx.shadowOffsetY = shadow.offsetY;
        
        // Create gradient
        const gradient = this.themeManager.getButtonGradient(this.ctx, {
            x: scaledX,
            y: scaledY,
            width: scaledWidth,
            height: scaledHeight
        }, isHovered);
        
        // Draw rounded rectangle (with polyfill for older browsers)
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(scaledX, scaledY, scaledWidth, scaledHeight, radius);
        } else {
            // Polyfill for browsers without roundRect
            const x = scaledX;
            const y = scaledY;
            const w = scaledWidth;
            const h = scaledHeight;
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + w - radius, y);
            this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
            this.ctx.lineTo(x + w, y + h - radius);
            this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            this.ctx.lineTo(x + radius, y + h);
            this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();
        }
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Border
        this.ctx.strokeStyle = theme.colors.accent || '#fff';
        this.ctx.lineWidth = isHovered ? 3 : 2;
        if (!this.ctx.roundRect) {
            // Recreate path for stroke if using polyfill
            this.ctx.beginPath();
            const x = scaledX;
            const y = scaledY;
            const w = scaledWidth;
            const h = scaledHeight;
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + w - radius, y);
            this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
            this.ctx.lineTo(x + w, y + h - radius);
            this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            this.ctx.lineTo(x + radius, y + h);
            this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();
        }
        this.ctx.stroke();
        
        // Glow effect for hover/primary
        if (isHovered || isPrimary) {
            this.ctx.strokeStyle = theme.effects.glowColor || theme.colors.primary;
            this.ctx.shadowColor = theme.effects.glowColor || theme.colors.primary;
            this.ctx.shadowBlur = isPrimary ? 20 : 10;
            this.ctx.lineWidth = 2;
            if (!this.ctx.roundRect) {
                // Recreate path for glow stroke if using polyfill
                this.ctx.beginPath();
                const x = scaledX;
                const y = scaledY;
                const w = scaledWidth;
                const h = scaledHeight;
                this.ctx.moveTo(x + radius, y);
                this.ctx.lineTo(x + w - radius, y);
                this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
                this.ctx.lineTo(x + w, y + h - radius);
                this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
                this.ctx.lineTo(x + radius, y + h);
                this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                this.ctx.lineTo(x, y + radius);
                this.ctx.quadraticCurveTo(x, y, x + radius, y);
                this.ctx.closePath();
            }
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
        
        // Button text with shadow
        this.ctx.fillStyle = theme.colors.text || '#fff';
        this.ctx.font = `bold ${Math.floor(28 * hoverScale)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Text shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillText(text, scaleX, scaleY);
        
        // Restore context
        this.ctx.restore();
    }
    
    lightenColor(color, amount) {
        // Simple color lightening (works for hex colors)
        if (color.startsWith('#')) {
            const num = parseInt(color.replace('#', ''), 16);
            const r = Math.min(255, ((num >> 16) & 0xFF) + Math.floor(255 * amount));
            const g = Math.min(255, ((num >> 8) & 0xFF) + Math.floor(255 * amount));
            const b = Math.min(255, (num & 0xFF) + Math.floor(255 * amount));
            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    }
    
    isButtonHovered(button) {
        // Check if touch/mouse is over button
        const touch = this.inputManager.getPrimaryTouch();
        if (touch) {
            return this.isPointInButton(touch.x, touch.y, button);
        }
        return false;
    }
    
    drawText(text, x, y, fontSize, color, alignment = 'center') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = alignment;
        this.ctx.fillText(text, x, y);
    }
    
    drawScore(score, x, y) {
        const formattedScore = score.toLocaleString();
        this.drawText(formattedScore, x, y, 60, '#fff', 'center');
    }
    
    isPointInButton(x, y, button) {
        return x >= button.x && 
               x <= button.x + button.width &&
               y >= button.y && 
               y <= button.y + button.height;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let gameEngine;

// Wait for Cordova deviceready event or start immediately in browser
function initGame() {
    console.log('Initializing Spin Escape...');
    
    // Initialize canvas first
    if (!initCanvas()) {
        console.error('Failed to initialize canvas!');
        return;
    }
    
    // Create game engine with canvas and context
    gameEngine = new GameEngine(canvas, ctx);
    console.log('Game initialized successfully');
}

// Start game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Handle orientation and resize events
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        resizeCanvas();
        if (gameEngine && gameEngine.ctx) {
            // Update game engine context if needed
            gameEngine.ctx = ctx;
        }
    }, 100);
});
window.addEventListener('resize', () => {
    resizeCanvas();
    if (gameEngine && gameEngine.ctx) {
        // Update game engine context if needed
        gameEngine.ctx = ctx;
    }
});

// Handle Cordova deviceready event
document.addEventListener('deviceready', () => {
    console.log('Cordova device ready');
    // Game already initialized, but can add device-specific setup here
}, false);

// Handle app lifecycle (Android)
document.addEventListener('pause', () => {
    console.log('App paused');
    if (gameEngine && gameEngine.currentState === GameState.PLAYING) {
        gameEngine.currentState = GameState.PAUSED;
    }
}, false);

document.addEventListener('resume', () => {
    console.log('App resumed');
    // Resume logic if needed
}, false);

// Handle Android back button
document.addEventListener('backbutton', () => {
    if (gameEngine) {
        if (gameEngine.currentState === GameState.PLAYING) {
            gameEngine.currentState = GameState.PAUSED;
        } else if (gameEngine.currentState === GameState.PAUSED) {
            gameEngine.currentState = GameState.PLAYING;
        } else {
            navigator.app.exitApp();
        }
    }
}, false);
