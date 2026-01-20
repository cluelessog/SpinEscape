/**
 * ASSET LOADER CLASS
 * 
 * Handles loading and caching of theme images
 * Provides fallback mechanisms if images fail to load
 */

class AssetLoader {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
    }
    
    /**
     * Load an image asynchronously
     * @param {string} path - Path to the image
     * @returns {Promise<HTMLImageElement>} Promise that resolves to the image
     */
    loadImage(path) {
        // Return cached image if available
        if (this.cache.has(path)) {
            return Promise.resolve(this.cache.get(path));
        }
        
        // Return existing loading promise if already loading
        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path);
        }
        
        // Create new loading promise
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.cache.set(path, img);
                this.loadingPromises.delete(path);
                resolve(img);
            };
            
            img.onerror = () => {
                this.loadingPromises.delete(path);
                console.warn(`Failed to load image: ${path}`);
                reject(new Error(`Failed to load image: ${path}`));
            };
            
            img.src = path;
        });
        
        this.loadingPromises.set(path, promise);
        return promise;
    }
    
    /**
     * Load theme background image with fallback
     * @param {string} themeId - Theme identifier
     * @param {string} screenName - Screen name (e.g., 'main-menu')
     * @returns {Promise<HTMLImageElement|null>} Promise that resolves to image or null if failed
     */
    async loadThemeBackground(themeId, screenName) {
        const path = `img/ui-themes/${themeId}/${screenName}-bg.png`;
        
        try {
            const img = await this.loadImage(path);
            return img;
        } catch (e) {
            console.warn(`Theme background not found: ${path}, using fallback`);
            return null;
        }
    }
    
    /**
     * Preload all theme backgrounds for a screen
     * @param {string} screenName - Screen name
     * @param {Array<string>} themeIds - Array of theme IDs to preload
     */
    async preloadScreenBackgrounds(screenName, themeIds) {
        const promises = themeIds.map(themeId => 
            this.loadThemeBackground(themeId, screenName).catch(() => null)
        );
        await Promise.all(promises);
    }
    
    /**
     * Clear cache (useful for development/testing)
     */
    clearCache() {
        this.cache.clear();
        this.loadingPromises.clear();
    }
    
    /**
     * Check if an image is cached
     * @param {string} path - Path to the image
     * @returns {boolean} True if cached
     */
    isCached(path) {
        return this.cache.has(path);
    }
}
