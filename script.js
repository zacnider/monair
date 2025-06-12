// Game Configuration
const CONFIG = {
    canvas: {
        width: 1200,
        height: 800
    },
    balloons: {
        maxCount: 1, // Only one balloon at a time
        launchHeight: 650,
        flySpeed: 0.3, // Much slower balloon rise
        maxTxPerBalloon: 50,
        waitTime: 8000
    },
    people: {
        maxCount: 100000500, // Hundreds of Monanimals
        spawnRate: 0.3,
        walkSpeed: 2.5,
        returnSpeed: 2.0
    },
    environment: {
        windStrength: 0.5,
        gravity: 0.05
    },
    monad: {
        rpcUrl: 'https://testnet-rpc.monad.xyz',
        updateInterval: 5000 // 5 seconds
    },
    weather: {
        changeInterval: 30000, // 30 seconds
        effects: true
    }
};

// Game State
const gameState = {
    running: true,
    paused: false,
    debug: false,
    soundEnabled: true,
    balloons: [],
    people: [],
    fairyChimneys: [],
    clouds: [],
    particles: [],
    currentWeather: 'sunny',
    weatherParticles: [],
    networkData: {
        blockHeight: 0,
        tps: 0,
        gasPrice: 0,
        lastBlockTime: 0,
        txCount: 0
    },
    achievements: [],
    score: 0,
    slingshot: {
        charging: false,
        power: 0,
        angle: 0,
        startX: 0,
        startY: 0
    },
    balloonQueue: 0
};

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Weather Types
const WEATHER_TYPES = {
    sunny: { 
        icon: '☀️', 
        name: 'Sunny', 
        windForce: 0.2,
        particles: false,
        skyColor: ['#87CEEB', '#B0E0E6', '#F0F8FF']
    },
    cloudy: { 
        icon: '☁️', 
        name: 'Cloudy', 
        windForce: 0.4,
        particles: false,
        skyColor: ['#B0C4DE', '#D3D3D3', '#E6E6FA']
    },
    rainy: { 
        icon: '🌧️', 
        name: 'Rainy', 
        windForce: 0.7,
        particles: 'rain',
        skyColor: ['#708090', '#A9A9A9', '#C0C0C0']
    },
    snowy: { 
        icon: '❄️', 
        name: 'Snowy', 
        windForce: 0.5,
        particles: 'snow',
        skyColor: ['#C0C0C0', '#D3D3D3', '#F0F0F0']
    },
    windy: { 
        icon: '💨', 
        name: 'Windy', 
        windForce: 1.5,
        particles: false,
        skyColor: ['#4682B4', '#B0E0E6', '#F0F8FF']
    },
    stormy: { 
        icon: '⛈️', 
        name: 'Stormy', 
        windForce: 2.0,
        particles: 'rain',
        skyColor: ['#2F4F4F', '#708090', '#A9A9A9']
    }
};

// Monanimal Character Data
const MONANIMAL_DATA = {
    images: [
        'images/Butterfly2.png',
        'images/cfbde5.png',
        'images/Component_23_4.png',
        'images/IMG_7966.PNG.png',
        'images/monad_ikan.png'
    ],
    size: {
        width: 24,
        height: 24
    },
    animation: {
        bounceHeight: 4,
        bounceSpeed: 0.15
    }
};

// Preload monanimal images
const MONANIMAL_IMAGES = [];
MONANIMAL_DATA.images.forEach((src, index) => {
    MONANIMAL_IMAGES[index] = new Image();
    MONANIMAL_IMAGES[index].src = src;
});

// Monad API Integration
class MonadAPI {
    static async makeRPCCall(method, params = []) {
        try {
            const response = await fetch(CONFIG.monad.rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method,
                    params,
                    id: Math.floor(Math.random() * 10000)
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.result;
        } catch (error) {
            console.warn('RPC call failed:', error);
            return this.getMockData();
        }
    }

    static getMockData() {
        return {
            blockHeight: Math.floor(Date.now() / 10000),
            txCount: Math.floor(Math.random() * 25) + 10,
            gasPrice: Math.random() * 10 + 1,
            timestamp: Math.floor(Date.now() / 1000),
            blockHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')
        };
    }

    static async getNetworkData() {
        try {
            const [blockNumber, latestBlock, gasPrice] = await Promise.all([
                this.makeRPCCall('eth_blockNumber'),
                this.makeRPCCall('eth_getBlockByNumber', ['latest', true]),
                this.makeRPCCall('eth_gasPrice')
            ]);

            if (!latestBlock) return this.getMockData();

            const blockHeight = parseInt(blockNumber, 16);
            const txCount = latestBlock.transactions ? latestBlock.transactions.length : 0;
            const timestamp = parseInt(latestBlock.timestamp, 16);

            return {
                blockHeight,
                txCount,
                gasPrice: parseInt(gasPrice, 16) / 1e9,
                timestamp,
                blockHash: latestBlock.hash
            };
        } catch (error) {
            console.error('Failed to fetch network data:', error);
            return this.getMockData();
        }
    }
}

// Enhanced Balloon Class
class Balloon {
    constructor(x, y, blockData) {
        this.x = x;
        this.y = y;
        this.targetY = y;
        this.size = 45 + Math.random() * 20;
        this.color = this.randomColor();
        this.blockData = blockData;
        this.passengers = [];
        this.maxPassengers = blockData ? blockData.txCount * 2 : 20;
        this.state = 'loading';
        this.animation = 0;
        this.windOffset = Math.random() * Math.PI * 2;
        this.launchTime = Date.now() + CONFIG.balloons.waitTime;
        this.opacity = 1;
        this.confirmationTime = null;
        this.glowPhase = Math.random() * Math.PI * 2;
        this.verticalBands = this.generateBands();
    }

    randomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#7C4DFF'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    generateBands() {
        const bands = [];
        const bandCount = 6;
        for (let i = 0; i < bandCount; i++) {
            bands.push({
                color: this.getRandomBandColor(),
                start: (i / bandCount) * Math.PI * 2,
                width: (Math.PI * 2) / bandCount
            });
        }
        return bands;
    }

    getRandomBandColor() {
        const colors = ['#FF6B9D', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    addPassenger(person) {
        if (this.passengers.length < this.blockData.txCount && this.state === 'loading') {
            this.passengers.push(person);
            return true;
        }
        return false;
    }

    launch() {
        if (this.state === 'loading' && 
            (this.passengers.length >= this.blockData.txCount || Date.now() > this.launchTime)) {
            this.state = 'launching';
            this.targetY = -200;
            this.confirmationTime = Date.now();
            this.createLaunchParticles();
            if (gameState.soundEnabled) this.playLaunchSound();
            
            // Return passengers who couldn't board (excess over tx count)
            const returnedPassengers = this.passengers.slice(this.blockData.txCount);
            returnedPassengers.forEach(passenger => {
                passenger.returnToWaiting();
            });
            this.passengers = this.passengers.slice(0, this.blockData.txCount);
            
            // Set flag for new balloon creation
            gameState.balloonQueue++;
        }
    }

    createLaunchParticles() {
        for (let i = 0; i < 20; i++) {
            gameState.particles.push({
                x: this.x + Math.random() * 60 - 30,
                y: this.y + 50,
                vx: Math.random() * 8 - 4,
                vy: Math.random() * 4 + 3,
                life: 1.5,
                emoji: ['✨', '🎉', '💫', '⭐'][Math.floor(Math.random() * 4)]
            });
        }
    }

    playLaunchSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);
            
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    update() {
        this.animation += 0.03;
        this.glowPhase += 0.05;
        
        const weather = WEATHER_TYPES[gameState.currentWeather];
        const windEffect = Math.sin(this.animation + this.windOffset) * weather.windForce;
        
        if (this.state === 'launching' || this.state === 'flying') {
            this.y = lerp(this.y, this.targetY, CONFIG.balloons.flySpeed * 0.008); // Even slower
            this.x += windEffect;
            
            if (this.y < -300) {
                this.state = 'gone';
            }
        }

        if (this.state === 'gone') {
            this.opacity = Math.max(0, this.opacity - 0.02);
        }
    }

    drawMonadLogo(x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        
        const gradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
        gradient.addColorStop(0, '#7C4DFF');
        gradient.addColorStop(1, '#9C27B0');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-size/2, -size/2, size, size);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size/2 + 2, -size/2 + 2, size - 4, size - 4);
        
        ctx.restore();
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        const glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.2;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15 * glowIntensity;
        
        // Draw realistic hot air balloon with vertical bands
        for (let i = 0; i < this.verticalBands.length; i++) {
            const band = this.verticalBands[i];
            
            ctx.fillStyle = band.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size/2, band.start, band.start + band.width);
            ctx.lineTo(this.x, this.y);
            ctx.closePath();
            ctx.fill();
        }

        // Balloon highlight
        ctx.shadowBlur = 0;
        const balloonGradient = ctx.createRadialGradient(
            this.x - this.size/4, this.y - this.size/4, 0,
            this.x, this.y, this.size/2
        );
        balloonGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        balloonGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
        balloonGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        
        ctx.fillStyle = balloonGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
        ctx.fill();

        // Monad logo
        this.drawMonadLogo(this.x, this.y - this.size * 0.2, this.size * 0.4);

        // Enhanced basket
        const basketY = this.y + this.size/2 + 40;
        const basketWidth = 40;
        const basketHeight = 30;
        
        ctx.fillStyle = '#8B4513';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.fillRect(this.x - basketWidth/2, basketY, basketWidth, basketHeight);

        // Basket texture
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const lineY = basketY + (i * basketHeight/4);
            ctx.beginPath();
            ctx.moveTo(this.x - basketWidth/2, lineY);
            ctx.lineTo(this.x + basketWidth/2, lineY);
            ctx.stroke();
        }

        // Multiple ropes
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const ropeStartX = this.x + Math.cos(angle) * (this.size * 0.3);
            const ropeStartY = this.y + Math.sin(angle) * (this.size * 0.3) + this.size * 0.3;
            const ropeEndX = this.x + (i - 1.5) * 8;
            const ropeEndY = basketY;
            
            ctx.beginPath();
            ctx.moveTo(ropeStartX, ropeStartY);
            ctx.lineTo(ropeEndX, ropeEndY);
            ctx.stroke();
        }

        // Passenger count - show actual tx count requirement
        if (this.passengers.length > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(`${this.passengers.length}/${this.blockData.txCount}`, this.x, this.y + 5);
            ctx.fillText(`${this.passengers.length}/${this.blockData.txCount}`, this.x, this.y + 5);
        }

        // Block info
        if (this.blockData) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Block #${this.blockData.blockHeight}`, this.x, this.y - this.size/2 - 20);
        }

        // Progress bar - based on actual tx count
        if (this.passengers.length > 0 && this.passengers.length < this.blockData.txCount && this.state === 'loading') {
            const progress = this.passengers.length / this.blockData.txCount;
            const barWidth = this.size * 0.8;
            const barHeight = 6;
            const barX = this.x - barWidth/2;
            const barY = this.y + this.size/2 + 15;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#10B981';
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }

        ctx.restore();
    }

    isClicked(mouseX, mouseY) {
        const distance = Math.sqrt((mouseX - this.x) ** 2 + (mouseY - this.y) ** 2);
        return distance < this.size + 30;
    }
}

// Enhanced Monanimal Class
class MonanimalPerson {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.originalX = x;
        this.originalY = y;
        this.size = MONANIMAL_DATA.size.width;
        this.state = 'waiting';
        this.speed = CONFIG.people.walkSpeed + Math.random() * 1;
        this.animation = Math.random() * Math.PI * 2;
        this.targetBalloon = null;
        this.bouncePhase = Math.random() * Math.PI * 2;
        this.direction = 1;
        this.waitingSpot = { x: x, y: y };
        this.imageIndex = Math.floor(Math.random() * MONANIMAL_IMAGES.length);
        this.id = Math.random().toString(36).substr(2, 6);
    }

    findNearestBalloon() {
        let nearest = null;
        let minDistance = Infinity;

        for (const balloon of gameState.balloons) {
            if (balloon.state === 'loading' && balloon.passengers.length < balloon.blockData.txCount) {
                const distance = Math.sqrt((this.x - balloon.x) ** 2 + (this.y - balloon.y) ** 2);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = balloon;
                }
            }
        }

        return nearest;
    }

    returnToWaiting() {
        this.state = 'returning';
        this.targetBalloon = null;
        this.waitingSpot = {
            x: 50 + Math.random() * 200,
            y: CONFIG.canvas.height - 120 + Math.random() * 60
        };
        this.targetX = this.waitingSpot.x;
        this.targetY = this.waitingSpot.y;
    }

    update() {
        this.animation += 0.1;
        this.bouncePhase += MONANIMAL_DATA.animation.bounceSpeed;

        if (this.state === 'waiting') {
            const bounce = Math.sin(this.bouncePhase) * MONANIMAL_DATA.animation.bounceHeight;
            this.y = this.waitingSpot.y + bounce;

            // Actively look for balloons
            const balloon = this.findNearestBalloon();
            if (balloon) {
                this.targetBalloon = balloon;
                this.targetX = balloon.x;
                this.targetY = balloon.y + balloon.size/2 + 45;
                this.state = 'walking';
            }
        }

        if (this.state === 'walking') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            this.direction = dx > 0 ? 1 : -1;

            if (distance > 8) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            } else if (this.targetBalloon && this.targetBalloon.addPassenger(this)) {
                this.state = 'boarding';
            } else if (this.targetBalloon && this.targetBalloon.passengers.length >= this.targetBalloon.blockData.txCount) {
                this.returnToWaiting();
            }
        }

        if (this.state === 'returning') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            this.direction = dx > 0 ? 1 : -1;

            if (distance > 5) {
                this.x += (dx / distance) * CONFIG.people.returnSpeed;
                this.y += (dy / distance) * CONFIG.people.returnSpeed;
            } else {
                this.state = 'waiting';
                this.waitingSpot = { x: this.x, y: this.y };
            }
        }

        if (this.state === 'boarding' && this.targetBalloon) {
            if (this.targetBalloon.state === 'launching' || this.targetBalloon.state === 'flying') {
                this.state = 'flying';
                this.x = this.targetBalloon.x;
                this.y = this.targetBalloon.y;
            }
        }

        if (this.state === 'flying' && this.targetBalloon) {
            this.x = this.targetBalloon.x + Math.sin(this.animation) * 10;
            this.y = this.targetBalloon.y + Math.cos(this.animation) * 6;
        }
    }

    drawMonanimal() {
        ctx.save();
        
        // Apply direction and bouncing effects
        ctx.translate(this.x, this.y);
        ctx.scale(this.direction, 1);
        
        // For flying state, add a small rotation
        if (this.state === 'flying' || this.state === 'boarding') {
            ctx.rotate(Math.sin(this.animation * 2) * 0.2);
        }
        
        // Draw the monanimal image
        if (MONANIMAL_IMAGES[this.imageIndex] && MONANIMAL_IMAGES[this.imageIndex].complete) {
            const imgWidth = MONANIMAL_DATA.size.width;
            const imgHeight = MONANIMAL_DATA.size.height;
            ctx.drawImage(
                MONANIMAL_IMAGES[this.imageIndex],
                -imgWidth,
                -imgHeight,
                imgWidth * 2,
                imgHeight * 2
            );
        } else {
            // Fallback if image isn't loaded
            ctx.fillStyle = 'purple';
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    draw() {
        if (this.state === 'flying') return;

        let bounceOffset = 0;
        if (this.state === 'walking' || this.state === 'returning') {
            bounceOffset = Math.sin(this.animation * 8) * 3;
        } else if (this.state === 'waiting') {
            bounceOffset = Math.sin(this.bouncePhase) * MONANIMAL_DATA.animation.bounceHeight;
        }

        const originalY = this.y;
        this.y += bounceOffset;
        
        this.drawMonanimal();
        
        this.y = originalY;
    }
}

// Mountain Class - Replace FairyChimney
class Mountain {
    constructor(x, y, height, width) {
        this.x = x;
        this.y = y;
        this.height = height;
        this.width = width;
        this.color = this.generateColor();
        this.layers = 3 + Math.floor(Math.random() * 2);
    }

    generateColor() {
        const baseColors = ['#8B7355', '#A0522D', '#CD853F', '#D2B48C', '#BC8F8F'];
        return baseColors[Math.floor(Math.random() * baseColors.length)];
    }

    draw() {
        ctx.save();
        
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Draw mountain as triangle with layers
        for (let layer = 0; layer < this.layers; layer++) {
            const layerHeight = this.height * (1 - layer * 0.15);
            const layerWidth = this.width * (1 - layer * 0.1);
            const layerY = this.y - layerHeight;
            
            // Gradient for depth
            const gradient = ctx.createLinearGradient(
                this.x - layerWidth/2, layerY,
                this.x + layerWidth/2, this.y
            );
            gradient.addColorStop(0, this.lightenColor(this.color, 30 - layer * 10));
            gradient.addColorStop(0.5, this.color);
            gradient.addColorStop(1, this.darkenColor(this.color, 20 + layer * 10));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(this.x, layerY); // Peak
            ctx.lineTo(this.x - layerWidth/2, this.y); // Left base
            ctx.lineTo(this.x + layerWidth/2, this.y); // Right base
            ctx.closePath();
            ctx.fill();

            // Add snow cap for higher mountains
            if (layer === 0 && this.height > 150) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                const snowHeight = this.height * 0.2;
                ctx.beginPath();
                ctx.moveTo(this.x, layerY);
                ctx.lineTo(this.x - layerWidth * 0.15, layerY + snowHeight);
                ctx.lineTo(this.x + layerWidth * 0.15, layerY + snowHeight);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
}
// Utility Functions
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

// Weather System
function createWeatherParticles() {
    const weather = WEATHER_TYPES[gameState.currentWeather];
    const container = document.getElementById('weatherEffect');
    
    if (!weather.particles || !CONFIG.weather.effects) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '';
    
    const particleCount = weather.particles === 'rain' ? 60 : 40;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = weather.particles === 'rain' ? 'rain-drop' : 'snow-flake';
        
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 2 + 1) + 's';
        particle.style.animationDelay = Math.random() * 2 + 's';
        
        if (weather.particles === 'rain') {
            particle.style.height = (Math.random() * 10 + 15) + 'px';
        }
        
        container.appendChild(particle);
    }
}

function changeWeather() {
    const weatherTypes = Object.keys(WEATHER_TYPES);
    const currentWeather = gameState.currentWeather;
    let newWeather;
    
    do {
        newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    } while (newWeather === currentWeather);
    
    gameState.currentWeather = newWeather;
    createWeatherParticles();
    
    const weatherInfo = WEATHER_TYPES[newWeather];
    console.log(`🌤️ Weather changed to ${weatherInfo.name} (Wind: ${weatherInfo.windForce})`);
    
    // Update weather display
    const weatherElement = document.getElementById('weather');
    if (weatherElement) {
        weatherElement.textContent = `${weatherInfo.icon} ${weatherInfo.name}`;
    }
}

// Click-based shooting (removed slingshot)
function shootAtPosition(x, y) {
    let hitBalloon = null;
    
    gameState.balloons.forEach(balloon => {
        if (balloon.isClicked && balloon.isClicked(x, y) && balloon.state === 'loading') {
            hitBalloon = balloon;
        }
    });
    
    if (hitBalloon) {
        hitBalloon.opacity = 0;
        hitBalloon.state = 'gone';
        
        // Return passengers to waiting
        hitBalloon.passengers.forEach(passenger => {
            passenger.returnToWaiting();
        });
        
        createExplosion(hitBalloon.x, hitBalloon.y);
        showMPReward(hitBalloon.x, hitBalloon.y, hitBalloon.passengers.length * 10);
        
        console.log(`🎯 Balloon #${hitBalloon.blockData?.blockHeight} destroyed!`);
        
        // Create new balloon
        gameState.balloonQueue++;
        return true;
    }
    return false;
}

function createExplosion(x, y) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.style.left = (x - 25) + 'px';
    explosion.style.top = (y - 25) + 'px';
    
    document.body.appendChild(explosion);
    setTimeout(() => explosion.remove(), 600);
}

function showMPReward(x, y, amount) {
    const reward = document.createElement('div');
    reward.className = 'mp-reward';
    reward.textContent = `+${amount} MP`;
    reward.style.left = x + 'px';
    reward.style.top = y + 'px';
    
    document.body.appendChild(reward);
    setTimeout(() => reward.remove(), 2000);
}

// Enhanced Grass Drawing Function
function drawRealisticGrass() {
    const groundY = CONFIG.canvas.height - 100;
    
    // Draw grass blades individually for more realistic look
    for (let i = 0; i < CONFIG.canvas.width; i += 2) {
        const grassHeight = 8 + Math.random() * 15;
        const grassX = i + Math.random() * 2;
        const grassWidth = 1 + Math.random() * 2;
        
        // Gradient for each grass blade
        const grassGradient = ctx.createLinearGradient(
            grassX, groundY - grassHeight,
            grassX, groundY
        );
        grassGradient.addColorStop(0, '#90EE90');
        grassGradient.addColorStop(0.5, '#32CD32');
        grassGradient.addColorStop(1, '#228B22');
        
        ctx.fillStyle = grassGradient;
        
        // Draw grass blade with slight curve
        ctx.beginPath();
        ctx.moveTo(grassX, groundY);
        ctx.quadraticCurveTo(
            grassX + Math.sin(i * 0.1) * 2, 
            groundY - grassHeight * 0.6,
            grassX + Math.sin(i * 0.1) * 3, 
            groundY - grassHeight
        );
        ctx.lineWidth = grassWidth;
        ctx.lineCap = 'round';
        ctx.strokeStyle = grassGradient;
        ctx.stroke();
    }
    
    // Add some flower details
    for (let i = 0; i < 20; i++) {
        const flowerX = Math.random() * CONFIG.canvas.width;
        const flowerY = groundY - 5 - Math.random() * 10;
        
        // Small flowers
        ctx.fillStyle = ['#FFB6C1', '#87CEEB', '#DDA0DD', '#F0E68C'][Math.floor(Math.random() * 4)];
        ctx.beginPath();
        ctx.arc(flowerX, flowerY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Game Initialization
function initGame() {
    // Create mountains instead of fairy chimneys
    const mountainPositions = [
        { x: 150, height: 120, width: 80 },
        { x: 280, height: 180, width: 100 },
        { x: 420, height: 150, width: 90 },
        { x: 580, height: 200, width: 110 },
        { x: 720, height: 140, width: 85 },
        { x: 850, height: 170, width: 95 },
        { x: 980, height: 130, width: 75 },
        { x: 1100, height: 160, width: 88 }
    ];

    gameState.fairyChimneys = []; // Clear old chimneys
    gameState.mountains = [];
    
    mountainPositions.forEach(pos => {
        gameState.mountains.push(new Mountain(
            pos.x + Math.random() * 40 - 20,
            CONFIG.canvas.height - 50,
            pos.height + Math.random() * 50,
            pos.width + Math.random() * 30
        ));
    });

    // Create clouds
    for (let i = 0; i < 8; i++) {
        gameState.clouds.push({
            x: Math.random() * CONFIG.canvas.width,
            y: 30 + Math.random() * 150,
            size: 25 + Math.random() * 35,
            speed: 0.1 + Math.random() * 0.3,
            opacity: 0.2 + Math.random() * 0.3,
            layers: 3 + Math.floor(Math.random() * 3)
        });
    }

    // Create initial Monanimals
    for (let i = 0; i < 200; i++) {
        const monanimal = new MonanimalPerson(
            50 + Math.random() * 300,
            CONFIG.canvas.height - 150 + Math.random() * 60
        );
        gameState.people.push(monanimal);
    }

    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    
    // Start systems
    updateNetworkData();
    setInterval(updateNetworkData, CONFIG.monad.updateInterval);
    setInterval(changeWeather, CONFIG.weather.changeInterval);
    
    console.log('🎈 Cappadocia Blockchain Adventure initialized with Monanimals!');
}

// Network Data Updates
async function updateNetworkData() {
    const data = await MonadAPI.getNetworkData();
    if (data) {
        const prevBlockHeight = gameState.networkData.blockHeight;
        gameState.networkData = {
            ...data,
            tps: data.txCount / 2
        };

        // Create new balloon for new block (only if no balloon exists or queue > 0)
        if (data.blockHeight > prevBlockHeight && prevBlockHeight > 0) {
            if (gameState.balloons.length === 0 || gameState.balloonQueue > 0) {
                createNewBalloon(data);
                gameState.balloonQueue = 0;
            }
            checkAchievements();
        }

        updateHUD();
    }
}

function createNewBalloon(blockData) {
    const x = 250 + Math.random() * (CONFIG.canvas.width - 500);
    const y = CONFIG.balloons.launchHeight;
    
    const balloon = new Balloon(x, y, blockData);
    gameState.balloons.push(balloon);

    console.log(`🎈 New balloon created for block ${blockData.blockHeight} (capacity: ${blockData.txCount} monanimals)`);
}

function updateHUD() {
    document.getElementById('blockHeight').textContent = gameState.networkData.blockHeight.toLocaleString();
    document.getElementById('tps').textContent = gameState.networkData.tps.toFixed(1);
    document.getElementById('gasPrice').textContent = gameState.networkData.gasPrice.toFixed(4);
    document.getElementById('flyingBalloons').textContent = gameState.balloons.filter(b => 
        b.state === 'flying' || b.state === 'launching').length;
    document.getElementById('waitingPeople').textContent = gameState.people.filter(p => 
        p.state === 'waiting' || p.state === 'walking' || p.state === 'returning').length;
}

// Achievement System
function checkAchievements() {
    const blockCount = gameState.balloons.length;
    const totalMonanimals = gameState.people.length;
    
    if (blockCount === 1 && !gameState.achievements.includes('first_balloon')) {
        showAchievement('🎈 First Flight!', 'Witnessed your first Monad balloon launch');
        gameState.achievements.push('first_balloon');
    }
    
    if (blockCount === 5 && !gameState.achievements.includes('balloon_explorer')) {
        showAchievement('🌟 Balloon Explorer!', 'Watched 5 Monad blocks take flight');
        gameState.achievements.push('balloon_explorer');
    }
    
    if (totalMonanimals >= 100 && !gameState.achievements.includes('monanimal_army')) {
        showAchievement('🐠 Monanimal Army!', 'Attracted 100+ monanimals to the adventure');
        gameState.achievements.push('monanimal_army');
    }
}

function showAchievement(title, description) {
    const achievement = document.getElementById('achievement');
    document.getElementById('achievementText').innerHTML = `<strong>${title}</strong><br>${description}`;
    achievement.style.display = 'block';
    
    setTimeout(() => {
        achievement.style.display = 'none';
    }, 3000);

    // Create celebration particles
    for (let i = 0; i < 20; i++) {
        gameState.particles.push({
            x: CONFIG.canvas.width / 2 + Math.random() * 200 - 100,
            y: CONFIG.canvas.height / 2 + Math.random() * 100 - 50,
            vx: Math.random() * 8 - 4,
            vy: Math.random() * 6 + 2,
            life: 1.5,
            emoji: ['🎉', '🎊', '⭐', '✨'][Math.floor(Math.random() * 4)]
        });
    }
}

// Game Loop
function gameLoop() {
    if (!gameState.paused) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update balloons
    gameState.balloons.forEach(balloon => {
        balloon.update();
        
        // Auto-launch balloon when ready
        if (balloon.state === 'loading' && 
            (balloon.passengers.length >= balloon.blockData.txCount || 
             Date.now() > balloon.launchTime)) {
            balloon.launch();
        }
    });

    // Remove balloons that are gone
    gameState.balloons = gameState.balloons.filter(balloon => balloon.opacity > 0);

    // Update lilchogs
    gameState.people.forEach(person => person.update());
    
    // Remove lilchogs who are flying away
    gameState.people = gameState.people.filter(person => 
        person.state !== 'flying' || 
        (person.targetBalloon && person.targetBalloon.state !== 'gone')
    );

    // Spawn new monanimals continuously
    const shouldSpawn = Math.random() < CONFIG.people.spawnRate * (1 + gameState.networkData.tps / 20);
    const waitingMonanimals = gameState.people.filter(p =>
        p.state === 'waiting' || p.state === 'returning').length;
    
    if (shouldSpawn && waitingMonanimals < 100 && gameState.people.length < CONFIG.people.maxCount) {
        const monanimal = new MonanimalPerson(
            50 + Math.random() * 300,
            CONFIG.canvas.height - 150 + Math.random() * 60
        );
        gameState.people.push(monanimal);
    }

    // Update clouds
    gameState.clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > CONFIG.canvas.width + cloud.size * 2) {
            cloud.x = -cloud.size * 2;
            cloud.y = 30 + Math.random() * 150;
        }
    });

    // Update particles
    gameState.particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y -= particle.vy;
        particle.life -= 0.015;
        particle.vy *= 0.99;
    });

    gameState.particles = gameState.particles.filter(particle => particle.life > 0);
}

function draw() {
    // Clear canvas with enhanced gradient sky
    const weather = WEATHER_TYPES[gameState.currentWeather];
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvas.height);
    
    gradient.addColorStop(0, weather.skyColor[0]);
    gradient.addColorStop(0.6, weather.skyColor[1]);
    gradient.addColorStop(1, weather.skyColor[2]);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // Draw clouds
    gameState.clouds.forEach(cloud => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        
        for (let layer = 0; layer < cloud.layers; layer++) {
            const layerSize = cloud.size * (0.8 + layer * 0.1);
            const layerOffset = layer * 8;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - layer * 0.2})`;
            ctx.beginPath();
            ctx.arc(cloud.x - layerOffset, cloud.y + layer * 2, layerSize, 0, Math.PI * 2);
            ctx.arc(cloud.x + layerSize * 0.6 - layerOffset, cloud.y + layer * 2, layerSize * 0.8, 0, Math.PI * 2);
            ctx.arc(cloud.x - layerSize * 0.6 - layerOffset, cloud.y + layer * 2, layerSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });

    // Draw mountains (instead of fairy chimneys)
    if (gameState.mountains) {
        gameState.mountains.forEach(mountain => mountain.draw());
    }

    // Draw ground
    const groundGradient = ctx.createLinearGradient(0, CONFIG.canvas.height - 100, 0, CONFIG.canvas.height);
    groundGradient.addColorStop(0, '#8B7355');
    groundGradient.addColorStop(0.3, '#A0522D');
    groundGradient.addColorStop(0.7, '#CD853F');
    groundGradient.addColorStop(1, '#D2B48C');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, CONFIG.canvas.height - 100, CONFIG.canvas.width, 100);

    // Draw realistic grass
    drawRealisticGrass();

    // Draw lilchogs
    gameState.people.forEach(person => person.draw());

    // Draw balloons
    gameState.balloons.forEach(balloon => balloon.draw());

    // Draw particles
    gameState.particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.font = `${20 + particle.life * 10}px Arial`;
        ctx.textAlign = 'center';
        
        const rotation = (1 - particle.life) * Math.PI * 2;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(rotation);
        ctx.fillText(particle.emoji, 0, 0);
        
        ctx.restore();
    });

    // Draw debug info
    if (gameState.debug) {
        drawDebugInfo();
    }
}

function drawDebugInfo() {
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(10, CONFIG.canvas.height - 200, 300, 180);
    ctx.fillStyle = '#00FF00';
    ctx.font = '12px Courier New';
    
    const debugInfo = [
        `Balloons: ${gameState.balloons.length}`,
        `Monanimals: ${gameState.people.length}`,
        `Particles: ${gameState.particles.length}`,
        `Block Height: ${gameState.networkData.blockHeight}`,
        `TPS: ${gameState.networkData.tps.toFixed(2)}`,
        `Gas Price: ${gameState.networkData.gasPrice.toFixed(4)} GWei`,
        `Weather: ${gameState.currentWeather}`,
        `Waiting: ${gameState.people.filter(p => p.state === 'waiting').length}`,
        `Walking: ${gameState.people.filter(p => p.state === 'walking').length}`,
        `Flying: ${gameState.people.filter(p => p.state === 'flying').length}`
    ];
    
    debugInfo.forEach((info, i) => {
        ctx.fillText(info, 20, CONFIG.canvas.height - 180 + i * 15);
    });
}

// Event Handlers - Direct clicking to shoot
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Try to shoot balloon first
    if (!shootAtPosition(mouseX, mouseY)) {
        // If no balloon hit, show balloon details if clicking on one
        for (const balloon of gameState.balloons) {
            if (balloon.isClicked && balloon.isClicked(mouseX, mouseY)) {
                showBalloonDetail(balloon, event.clientX, event.clientY);
                break;
            }
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let isHovering = false;
    for (const balloon of gameState.balloons) {
        if (balloon.isClicked && balloon.isClicked(mouseX, mouseY)) {
            isHovering = true;
            break;
        }
    }
    canvas.style.cursor = isHovering ? 'pointer' : 'default';
});

function showBalloonDetail(balloon, x, y) {
    const detail = document.getElementById('balloonDetail');
    const info = document.getElementById('balloonInfo');
    
    const confirmationTime = balloon.confirmationTime ? 
        new Date(balloon.confirmationTime).toLocaleTimeString() : 'Pending';
    
    const statusEmoji = {
        'loading': '⏳',
        'launching': '🚀',
        'flying': '🎈',
        'gone': '✨'
    };
    
    info.innerHTML = `
        <strong>Block #${balloon.blockData ? balloon.blockData.blockHeight : 'Loading'}</strong><br><br>
        <strong>Status:</strong> ${statusEmoji[balloon.state] || '⭕'} ${balloon.state}<br>
        <strong>Monanimal Passengers:</strong> ${balloon.passengers.length}/${balloon.blockData ? balloon.blockData.txCount : 'Loading'}<br>
        <strong>Required TXs:</strong> ${balloon.blockData ? balloon.blockData.txCount : 'Loading'}<br>
        <strong>Confirmation Time:</strong> ${confirmationTime}<br>
        <strong>Current Gas Price:</strong> ${gameState.networkData.gasPrice.toFixed(4)} GWei<br>
        ${balloon.blockData ? `<strong>Block Hash:</strong> ${balloon.blockData.blockHash.slice(0, 16)}...<br>` : ''}
        <strong>Monad Network:</strong> Testnet 🟣<br>
        <br><em>🐠 Each monanimal represents a transaction waiting for block confirmation!<br>
        💡 Click balloon to destroy it and earn MP tokens!</em>
    `;
    
    detail.style.left = Math.min(x, window.innerWidth - 380) + 'px';
    detail.style.top = Math.min(y, window.innerHeight - 300) + 'px';
    detail.style.display = 'block';
}

function closeBalloonDetail() {
    document.getElementById('balloonDetail').style.display = 'none';
}

// Control Functions
function togglePause() {
    gameState.paused = !gameState.paused;
    const button = event.target;
    button.textContent = gameState.paused ? '▶️ Resume' : '⏸️ Pause';
}

function addRandomTx() {
    if (gameState.people.length < CONFIG.people.maxCount) {
        const monanimal = new MonanimalPerson(
            50 + Math.random() * 300,
            CONFIG.canvas.height - 150 + Math.random() * 60
        );
        gameState.people.push(monanimal);

        for (let i = 0; i < 8; i++) {
            gameState.particles.push({
                x: monanimal.x + Math.random() * 30 - 15,
                y: monanimal.y - 10,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 3 + 2,
                life: 1,
                emoji: ['✨', '⭐', '💫'][Math.floor(Math.random() * 3)]
            });
        }

        console.log('🐠 New monanimal spawned!');
    }
}

function toggleDebug() {
    gameState.debug = !gameState.debug;
    const button = event.target;
    button.textContent = gameState.debug ? '👁️ Debug ON' : '🔍 Debug';
}

function resetGame() {
    gameState.balloons = [];
    gameState.people = [];
    gameState.particles = [];
    gameState.achievements = [];
    gameState.balloonQueue = 0;
    
    // Create initial monanimals
    for (let i = 0; i < 200; i++) {
        const monanimal = new MonanimalPerson(
            50 + Math.random() * 300,
            CONFIG.canvas.height - 150 + Math.random() * 60
        );
        gameState.people.push(monanimal);
    }
    
    showAchievement('🔄 Fresh Start!', 'Adventure reset - new monanimals ready for balloon rides!');
}

function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    const button = document.getElementById('soundToggle');
    button.textContent = gameState.soundEnabled ? '🔊' : '🔇';
}

// Keyboard Controls
document.addEventListener('keydown', (event) => {
    switch(event.code) {
        case 'Space':
            event.preventDefault();
            togglePause();
            break;
        case 'KeyD':
            toggleDebug();
            break;
        case 'KeyR':
            resetGame();
            break;
        case 'KeyL':
            addRandomTx();
            break;
        case 'KeyS':
            toggleSound();
            break;
    }
});

// Resize handler
window.addEventListener('resize', () => {
    const maxWidth = Math.min(window.innerWidth - 40, 1200);
    const maxHeight = Math.min(window.innerHeight - 100, 800);
    
    if (maxWidth < 1200 || maxHeight < 800) {
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        CONFIG.canvas.width = maxWidth;
        CONFIG.canvas.height = maxHeight;
        
        if (gameState.mountains) {
            gameState.mountains.forEach(mountain => {
                mountain.y = CONFIG.canvas.height - 50;
            });
        }
        
        gameState.people.forEach(person => {
            if (person.y > CONFIG.canvas.height - 100) {
                person.y = CONFIG.canvas.height - 150 + Math.random() * 60;
                person.waitingSpot.y = person.y;
            }
        });
    }
});

// Initialize and start the game
window.addEventListener('load', () => {
    initGame();
    gameLoop();
    console.log('🎈 Welcome to Cappadocia Blockchain Adventure!');
    console.log('🐠 Watch monanimals (transactions) board Monad balloons (blocks)!');
    console.log('🎯 Click balloons to destroy them and earn MP tokens!');
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('Game error:', event.error);
});

console.log('✅ Enhanced Cappadocia Monad Game Script Loaded Successfully!');
