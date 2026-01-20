/**
 * THEME MANAGER CLASS
 * 
 * Manages multiple visual themes for the game
 * Supports switching themes and storing preferences
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'modern';
        this.themes = this.initializeThemes();
        this.loadThemePreference();
    }
    
    initializeThemes() {
        return {
            modern: {
                name: 'Modern Minimalist',
                id: 'modern',
                colors: {
                    primary: '#4a9eff',
                    secondary: '#666',
                    accent: '#fff',
                    bg: '#1a1a2e',
                    bgSecondary: '#2a2a3e',
                    text: '#fff',
                    textSecondary: '#aaa',
                    success: '#0f0',
                    danger: '#f00',
                    warning: '#ffd700'
                },
                gradients: {
                    button: ['#4a9eff', '#357abd'],
                    buttonHover: ['#5ab0ff', '#4a9eff'],
                    background: ['#1a1a2e', '#0f1419'],
                    overlay: ['rgba(26, 26, 46, 0.95)', 'rgba(15, 20, 25, 0.95)']
                },
                effects: {
                    glowColor: '#4a9eff',
                    shadowColor: 'rgba(74, 158, 255, 0.3)',
                    particleColor: '#4a9eff'
                },
                buttonRadius: 15,
                buttonShadow: { blur: 10, offsetX: 0, offsetY: 4 }
            },
            cyberpunk: {
                name: 'Futuristic Cyberpunk',
                id: 'cyberpunk',
                colors: {
                    primary: '#00ffff',
                    secondary: '#666',
                    accent: '#fff',
                    bg: '#0a0a1a',
                    bgSecondary: '#1a1a2e',
                    text: '#00ffff',
                    textSecondary: '#888',
                    success: '#00ff00',
                    danger: '#ff0080',
                    warning: '#ffff00'
                },
                gradients: {
                    button: ['#00ffff', '#0080ff'],
                    buttonHover: ['#20ffff', '#00a0ff'],
                    background: ['#0a0a1a', '#000000'],
                    overlay: ['rgba(10, 10, 26, 0.95)', 'rgba(0, 0, 0, 0.95)']
                },
                effects: {
                    glowColor: '#00ffff',
                    shadowColor: 'rgba(0, 255, 255, 0.5)',
                    particleColor: '#00ffff'
                },
                buttonRadius: 15,
                buttonShadow: { blur: 15, offsetX: 0, offsetY: 5 }
            },
            retro: {
                name: 'Retro Arcade',
                id: 'retro',
                colors: {
                    primary: '#ff00ff',
                    secondary: '#666',
                    accent: '#fff',
                    bg: '#1a0033',
                    bgSecondary: '#330066',
                    text: '#ff00ff',
                    textSecondary: '#ff99ff',
                    success: '#00ff00',
                    danger: '#ff0000',
                    warning: '#ffff00'
                },
                gradients: {
                    button: ['#ff00ff', '#cc00cc'],
                    buttonHover: ['#ff33ff', '#ff00ff'],
                    background: ['#1a0033', '#000000'],
                    overlay: ['rgba(26, 0, 51, 0.95)', 'rgba(0, 0, 0, 0.95)']
                },
                effects: {
                    glowColor: '#ff00ff',
                    shadowColor: 'rgba(255, 0, 255, 0.4)',
                    particleColor: '#ff00ff'
                },
                buttonRadius: 5,
                buttonShadow: { blur: 8, offsetX: 2, offsetY: 2 }
            },
            darkElegant: {
                name: 'Dark Elegant',
                id: 'darkElegant',
                colors: {
                    primary: '#d4af37',
                    secondary: '#666',
                    accent: '#fff',
                    bg: '#0a0a0a',
                    bgSecondary: '#1a1a1a',
                    text: '#d4af37',
                    textSecondary: '#888',
                    success: '#4a9eff',
                    danger: '#c41e3a',
                    warning: '#ffd700'
                },
                gradients: {
                    button: ['#d4af37', '#b8941f'],
                    buttonHover: ['#e4bf47', '#d4af37'],
                    background: ['#0a0a0a', '#000000'],
                    overlay: ['rgba(10, 10, 10, 0.95)', 'rgba(0, 0, 0, 0.95)']
                },
                effects: {
                    glowColor: '#d4af37',
                    shadowColor: 'rgba(212, 175, 55, 0.3)',
                    particleColor: '#d4af37'
                },
                buttonRadius: 12,
                buttonShadow: { blur: 12, offsetX: 0, offsetY: 4 }
            },
            vibrantNeon: {
                name: 'Vibrant Neon',
                id: 'vibrantNeon',
                colors: {
                    primary: '#ff0080',
                    secondary: '#666',
                    accent: '#fff',
                    bg: '#1a0033',
                    bgSecondary: '#330033',
                    text: '#ff0080',
                    textSecondary: '#ff66cc',
                    success: '#00ff80',
                    danger: '#ff0040',
                    warning: '#ffff00'
                },
                gradients: {
                    button: ['#ff0080', '#cc0066'],
                    buttonHover: ['#ff20a0', '#ff0080'],
                    background: ['#1a0033', '#000033'],
                    overlay: ['rgba(26, 0, 51, 0.95)', 'rgba(0, 0, 51, 0.95)']
                },
                effects: {
                    glowColor: '#ff0080',
                    shadowColor: 'rgba(255, 0, 128, 0.5)',
                    particleColor: '#ff0080'
                },
                buttonRadius: 20,
                buttonShadow: { blur: 20, offsetX: 0, offsetY: 6 }
            }
        };
    }
    
    getTheme() {
        return this.themes[this.currentTheme] || this.themes['modern'];
    }
    
    setTheme(themeId) {
        if (this.themes[themeId]) {
            this.currentTheme = themeId;
            this.saveThemePreference();
            return true;
        }
        return false;
    }
    
    getAvailableThemes() {
        return Object.keys(this.themes).map(id => ({
            id: id,
            name: this.themes[id].name
        }));
    }
    
    loadThemePreference() {
        try {
            const saved = localStorage.getItem('spinEscapeTheme');
            if (saved && this.themes[saved]) {
                this.currentTheme = saved;
            }
        } catch (e) {
            console.error('Failed to load theme preference:', e);
        }
    }
    
    saveThemePreference() {
        try {
            localStorage.setItem('spinEscapeTheme', this.currentTheme);
        } catch (e) {
            console.error('Failed to save theme preference:', e);
        }
    }
    
    // Helper method to create gradient
    createGradient(ctx, x1, y1, x2, y2, colors) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });
        return gradient;
    }
    
    // Helper method to get button gradient
    getButtonGradient(ctx, bounds, isHovered = false) {
        const theme = this.getTheme();
        const colors = isHovered ? theme.gradients.buttonHover : theme.gradients.button;
        return this.createGradient(ctx, bounds.x, bounds.y, bounds.x, bounds.y + bounds.height, colors);
    }
    
    // Helper method to get background gradient
    getBackgroundGradient(ctx) {
        const theme = this.getTheme();
        return this.createGradient(ctx, 0, 0, 0, GAME_HEIGHT, theme.gradients.background);
    }
}
