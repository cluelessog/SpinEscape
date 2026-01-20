# Spin Escape

A hyper-casual Android game built with HTML5 Canvas and Apache Cordova. Rotate a circle to dodge incoming projectiles and achieve the highest score!

## 🎮 Game Description

Spin Escape is a fast-paced arcade-style game where players control a rotating circle at the center of the screen. Projectiles spawn from the edges and move toward the center. The goal is to rotate the circle to dodge projectiles and survive as long as possible.

### Core Mechanics
- **Player Control**: Tap anywhere on screen to rotate the circle toward that direction
- **Scoring**: Earn 10 points for each projectile dodged
- **Combo System**: Build consecutive dodges to increase your multiplier (up to 5x)
- **Difficulty Scaling**: Spawn rate and projectile speed increase every 500 points
- **Visual Feedback**: Screen shake, particle effects, and hit flashes

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Apache Cordova CLI
- Android SDK (API 28+)
- Java JDK 8+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SpinEscape
```

2. Install dependencies:
```bash
npm install
```

3. Add Android platform (if not already added):
```bash
cordova platform add android
```

4. Build the project:
```bash
cordova build android
```

5. Run on device/emulator:
```bash
cordova run android
```

## 📱 Platform Support

- **Android**: API 28+ (Android 9.0+)
- **Target SDK**: Android 14 (API 35)

## 🎯 Features

### Game States
- Main Menu
- Playing
- Paused
- Game Over
- Settings
- How to Play

### Input System
- Touch input (swipe, tap, multi-touch)
- Mouse support (for browser testing)
- Keyboard support (arrow keys, space, escape)
- Pinch gesture detection

### Game Systems
- **Physics Engine**: Velocity-based movement, collision detection
- **Object Pooling**: Optimized projectile management
- **Performance Monitoring**: FPS counter, frame time tracking
- **Data Persistence**: High scores, settings, achievements saved to localStorage
- **Vibration Feedback**: Haptic feedback for taps and collisions

### UI Features
- Responsive canvas scaling for all Android screen sizes
- High-DPI display support
- Visual touch feedback
- Floating score pop-ups
- Achievement system

## 📁 Project Structure

```
SpinEscape/
├── config.xml              # Cordova configuration
├── package.json            # Node.js dependencies
├── www/                    # Web assets
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── index.css      # Styles
│   ├── js/
│   │   └── game.js        # Main game logic (3622 lines)
│   └── img/               # Images and assets
├── platforms/              # Cordova platform files (gitignored)
└── node_modules/          # Dependencies (gitignored)
```

## 🎮 Controls

- **Touch/Tap**: Rotate circle toward touch position
- **Space**: Start game / Resume / Retry
- **Escape/Back**: Pause / Return to menu
- **Arrow Keys**: Rotate circle (for testing)

## 🏆 Scoring System

- **Base Score**: 10 points per dodged projectile
- **Combo Multiplier**: Increases with consecutive dodges
  - 10 dodges = 2x multiplier
  - 20 dodges = 3x multiplier
  - 30 dodges = 4x multiplier
  - 40+ dodges = 5x multiplier (max)
- **Difficulty**: Increases every 500 points
  - Spawn rate decreases by 10%
  - Projectile speed increases by 20 px/s

## 🎨 Technical Details

### Canvas Resolution
- Internal: 800x1280 (5:8 aspect ratio)
- Automatically scales to fit device screen
- Supports high-DPI displays with devicePixelRatio compensation

### Performance
- Target: 60 FPS
- Frame-rate independent updates using deltaTime
- Object pooling for projectiles
- Spatial optimization for collision detection

### Browser Testing
The game can be tested in a browser by opening `www/index.html`. Note that some features (vibration, Cordova APIs) will only work on a device.

## 📝 Development

### Key Classes
- `GameEngine`: Main game loop and state management
- `InputManager`: Touch, mouse, and keyboard input handling
- `Physics`: Collision detection and physics calculations
- `ProjectilePool`: Object pooling for projectiles
- `DataManager`: Data persistence and storage
- `PerformanceMonitor`: FPS and performance tracking
- `VibrationManager`: Haptic feedback

### Game Loop
Uses `requestAnimationFrame` for smooth 60fps rendering with frame-rate independent updates.

## 📄 License

See [LICENSE](LICENSE) file for details.

## 👤 Author

PS Studio

## 🙏 Acknowledgments

Built with:
- Apache Cordova
- HTML5 Canvas API
- JavaScript ES6+

---

**Version**: 1.0.0  
**Last Updated**: 2024
