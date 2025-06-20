// Game Configuration
const CONFIG = {
    canvas: {
        width: 1200,
        height: 800
    },
    balloons: {
        maxCount: 6, // Allow multiple balloons for better TPS handling
        launchHeight: 650,
        flySpeed: 0.7, // Faster movement based on transaction type
        maxTxPerBalloon: 100, // Increased capacity for high TPS
        waitTime: 10000, // Reduced wait time for efficiency
        minPassengerWait: 3000, // Faster boarding
        type: 'balloon', // 'balloon' or 'zeppelin'
        speedMultiplier: {
            'transfer': 1.0,
            'approve': 0.8,
            'swap': 1.5,
            'stake': 0.9,
            'unstake': 1.1,
            'claim': 1.3,
            'contract': 0.7
        }
    },
    people: {
        maxCount: 10000, // Optimize for better performance
        spawnRate: 0.1, // Slower spawn rate for stability
        walkSpeed: 2.5, // More consistent walking speed
        returnSpeed: 2.0 // Consistent return speed
    },
    environment: {
        windStrength: 0.5,
        gravity: 0.05
    },
    monad: {
        rpcUrl: 'https://testnet-rpc.monad.xyz',
        chainId: 10143,
        symbol: 'MON',
        explorer: 'https://testnet.monadexplorer.com',
        updateInterval: 500, // 0,5 seconds - optimized for 10k TPS (every 1 blocks)
        blocksPerUpdate: 1 // Move balloons every 10 blocks for efficiency
    },
    weather: {
        changeInterval: 30000, // 30 seconds
        effects: true
    },
    performance: {
        objectPooling: true,        // Reuse objects instead of creating new ones
        cullOffscreen: true,        // Don't update/render objects outside view
        simplifyDistant: false,     // Keep full quality for better visuals
        maxVisibleMonanimals: 200,  // Increased for higher TPS
        maxParticles: 30,           // Increased particle limit
        optimizeRendering: true,    // Use optimized rendering techniques
        maxTotalMonanimals: 200,    // Increased for 10k TPS support
        cleanupInterval: 3000,      // More frequent cleanup for stability
        maxBalloons: 7,             // More balloons for high TPS
        errorRecovery: true,        // Enable automatic error recovery
        maxErrors: 3,               // Maximum errors before restart
        restartDelay: 2000          // Delay before auto-restart
    }
};

// Game State
const gameState = {
    running: true,
    paused: false,
    debug: false,
    soundEnabled: true,
    darkMode: false,
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
    balloonQueue: 0,
    errorCount: 0,
    lastErrorTime: 0,
    blocksSinceLastUpdate: 0
};

// Music System
const musicSystem = {
    currentTrackIndex: 0,
    isPlaying: false,
    isMuted: false,
    volume: 0.5,
    tracks: [],
    audio: null
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

// Transaction Types
const TX_TYPES = {
    transfer: { name: "Transfer", color: "#10B981", emoji: "💸" },
    approve: { name: "Approve", color: "#3B82F6", emoji: "✅" },
    swap: { name: "Swap", color: "#8B5CF6", emoji: "🔄" },
    stake: { name: "Stake", color: "#F59E0B", emoji: "📌" },
    unstake: { name: "Unstake", color: "#EF4444", emoji: "🔓" },
    claim: { name: "Claim", color: "#6366F1", emoji: "🎁" },
    contract: { name: "Contract", color: "#EC4899", emoji: "📜" }
};

// Explorer URL - Real Monad explorer address
const EXPLORER_BASE_URL = CONFIG.monad.explorer + "/tx/";
const EXPLORER_BLOCK_URL = CONFIG.monad.explorer + "/block/";
const EXPLORER_ADDRESS_URL = CONFIG.monad.explorer + "/address/";

// Monanimal Character Data
const MONANIMAL_DATA = {
    images: [
        'images/Butterfly2.png',
        'images/cfbde5.png',
        'images/Component_23_4.png',
        'images/IMG_7966.PNG.png',
        'images/monad_ikan.png',
        'images/adacv.png',
        'images/Molandak.png'
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

// Preload monanimal images with better error handling
const MONANIMAL_IMAGES = [];
let imagesLoaded = 0;
let totalImages = MONANIMAL_DATA.images.length;

// Load purple logo for balloons
const PURPLE_LOGO = new Image();
PURPLE_LOGO.onload = () => {
    console.log('✅ Purple logo loaded successfully');
};
PURPLE_LOGO.onerror = () => {
    console.error('❌ Failed to load purple logo');
};
PURPLE_LOGO.src = 'images/purple_logo.png';

MONANIMAL_DATA.images.forEach((src, index) => {
    MONANIMAL_IMAGES[index] = new Image();
    
    MONANIMAL_IMAGES[index].onload = () => {
        imagesLoaded++;
        console.log(`✅ Monanimal image loaded: ${src} (${imagesLoaded}/${totalImages})`);
        
        if (imagesLoaded === totalImages) {
            console.log('🎉 All Monanimal images loaded successfully!');
        }
    };
    
    MONANIMAL_IMAGES[index].onerror = (error) => {
        console.error(`❌ Failed to load Monanimal image: ${src}`, error);
        // Create fallback image on error
        MONANIMAL_IMAGES[index] = createFallbackImage(index);
        imagesLoaded++;
    };
    
    // Start loading image
    MONANIMAL_IMAGES[index].src = src;
});

// Fallback image creation function
function createFallbackImage(index) {
    const canvas = document.createElement('canvas');
    canvas.width = MONANIMAL_DATA.size.width * 2;
    canvas.height = MONANIMAL_DATA.size.height * 2;
    const ctx = canvas.getContext('2d');
    
    // Draw colored circle
    const colors = ['#7C4DFF', '#9C27B0', '#FF6B35', '#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
    const color = colors[index % colors.length];
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, Math.min(canvas.width, canvas.height)/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw Monad logo-like square
    ctx.fillStyle = 'white';
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(Math.PI/4);
    const size = Math.min(canvas.width, canvas.height) * 0.3;
    ctx.fillRect(-size/2, -size/2, size, size);
    ctx.restore();
    
    // Convert canvas to Image object
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

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
            console.error('Monad RPC call failed:', error);
            // Always try to get real data, don't use fallback for transactions
            throw error;
        }
    }
    
    static getFallbackData(method, params) {
        const currentTime = Math.floor(Date.now() / 1000);
        const baseBlockHeight = 2847392; // Real Monad testnet block height
        
        switch (method) {
            case 'eth_blockNumber':
                return '0x' + (baseBlockHeight + Math.floor((Date.now() - 1640995200000) / 2000)).toString(16);
            case 'eth_getBlockByNumber':
                const blockHeight = baseBlockHeight + Math.floor((Date.now() - 1640995200000) / 2000);
                return {
                    number: '0x' + blockHeight.toString(16),
                    hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                    timestamp: '0x' + currentTime.toString(16),
                    transactions: this.generateRealisticTransactions(15 + Math.floor(Math.random() * 35))
                };
            case 'eth_gasPrice':
                return '0x' + Math.floor(1000000000 + Math.random() * 5000000000).toString(16); // 1-6 Gwei
            default:
                return null;
        }
    }
    
    static generateRealisticTransactions(count) {
        const transactions = [];
        const methodSignatures = {
            '0xa9059cbb': 'transfer',
            '0x095ea7b3': 'approve',
            '0x38ed1739': 'swap',
            '0xa694fc3a': 'stake',
            '0x2e1a7d4d': 'unstake',
            '0x4e71d92d': 'claim',
            '0x': 'transfer'
        };
        
        for (let i = 0; i < count; i++) {
            const methods = Object.keys(methodSignatures);
            const method = methods[Math.floor(Math.random() * methods.length)];
            
            transactions.push({
                hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                from: '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                to: '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                value: '0x' + Math.floor(Math.random() * 1000000000000000000).toString(16),
                gas: '0x' + (21000 + Math.floor(Math.random() * 200000)).toString(16),
                input: method + (method !== '0x' ? Array.from({length: 128}, () => Math.floor(Math.random() * 16).toString(16)).join('') : ''),
                blockNumber: '0x' + (baseBlockHeight + Math.floor((Date.now() - 1640995200000) / 2000)).toString(16)
            });
        }
        
        return transactions;
    }
    
    // Fetch explorer data - Simulate real Monad testnet data
    static async getExplorerData() {
        try {
            // Try real Monad testnet explorer API
            const response = await fetch(`${CONFIG.monad.explorer}/api/stats`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log("Real Monad explorer data received:", data);
                return {
                    totalTxn: data.totalTransactions || data.total_transactions || 0,
                    totalContracts: data.totalContracts || data.total_contracts || 0,
                    totalValidators: data.totalValidators || data.validator_count || 0,
                    dailyActiveAccounts: data.dailyActiveAccounts || data.daily_active_accounts || 0,
                    dailyTxn: data.dailyTransactions || data.daily_transactions || 0
                };
            }
        } catch (error) {
            console.log('Cannot access real explorer API, using realistic test data');
        }
        
        // Realistic, dynamic test data - changes over time
        const baseTime = Date.now();
        const daysSinceEpoch = Math.floor(baseTime / (1000 * 60 * 60 * 24));
        const hoursSinceEpoch = Math.floor(baseTime / (1000 * 60 * 60));
        
        return {
            totalTxn: 8547392 + (daysSinceEpoch * 1247) + Math.floor(Math.random() * 500),
            totalContracts: 34567 + (daysSinceEpoch * 23) + Math.floor(Math.random() * 10),
            totalValidators: 156 + Math.floor(Math.random() * 8),
            dailyActiveAccounts: 12847 + Math.floor(Math.random() * 2000) + (hoursSinceEpoch % 24) * 50,
            dailyTxn: 89234 + Math.floor(Math.random() * 15000) + (hoursSinceEpoch % 24) * 200
        };
    }

    static async getNetworkData() {
        try {
            const [blockNumber, latestBlock, gasPrice] = await Promise.all([
                this.makeRPCCall('eth_blockNumber'),
                this.makeRPCCall('eth_getBlockByNumber', ['latest', true]),
                this.makeRPCCall('eth_gasPrice')
            ]);

            if (!latestBlock) {
                throw new Error('Block data could not be retrieved!');
            }

            // Get actual transactions from block
            const transactions = latestBlock.transactions || [];
            const blockHeight = parseInt(blockNumber, 16);
            const txCount = transactions.length || (15 + Math.floor(Math.random() * 35)); // Realistic tx count
            const timestamp = parseInt(latestBlock.timestamp, 16);
            
            // Save block data in cache with assigned tx types
            this.currentBlockData = {
                blockHeight,
                txCount,
                gasPrice: parseInt(gasPrice, 16) / 1e9,
                timestamp,
                blockHash: latestBlock.hash,
                confirmed: true // This block is confirmed
            };
            
            // Process and classify transactions
            if (transactions.length > 0) {
                this.processBlockTransactions(transactions, timestamp, blockHeight);
            } else {
                // Create deterministic transactions if none in block
                this.createDeterministicTransactions(txCount, blockHeight, timestamp);
            }

            console.log(`📦 New block processed: #${blockHeight} (${txCount} transactions)`);
            return this.currentBlockData;
        } catch (error) {
            console.error('Network data could not be retrieved:', error);
            // Return realistic test data as fallback
            return this.generateFallbackBlockData();
        }
    }
    
    static generateFallbackBlockData() {
        const baseBlockHeight = 2847392;
        const currentBlockHeight = baseBlockHeight + Math.floor((Date.now() - 1640995200000) / 2000);
        const txCount = 15 + Math.floor(Math.random() * 35);
        const timestamp = Math.floor(Date.now() / 1000);
        
        this.currentBlockData = {
            blockHeight: currentBlockHeight,
            txCount,
            gasPrice: 1.5 + Math.random() * 3.5, // 1.5-5 Gwei
            timestamp,
            blockHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            confirmed: true
        };
        
        this.createDeterministicTransactions(txCount, currentBlockHeight, timestamp);
        return this.currentBlockData;
    }
    
    // Process and classify real transactions with improved detection
    static processBlockTransactions(transactions, timestamp, blockHeight) {
        const txTypes = Object.keys(TX_TYPES);
        
        // Process each transaction and categorize
        this.blockTransactions = transactions.map((tx, index) => {
            // Assign tx type based on transaction data
            let txType = 'transfer'; // Default type
            
            // Method signature detection (first 4 bytes of input after 0x)
            const methodSig = tx.input && tx.input.length >= 10 ? tx.input.slice(0, 10) : '';
            
            // Comprehensive method signature detection
            // Transfer - ERC20 Transfer (0xa9059cbb) and regular ETH transfers (empty input)
            if (methodSig === '0xa9059cbb' || tx.input === '0x' || tx.input === '') {
                txType = 'transfer';
            }
            // Approve - ERC20 Approve (0x095ea7b3)
            else if (methodSig === '0x095ea7b3') {
                txType = 'approve';
            }
            // Swap - Various DEX methods
            else if (['0x38ed1739', '0x8803dbee', '0x7ff36ab5', '0xfb3bdb41', '0x18cbafe5'].includes(methodSig)) {
                txType = 'swap';
            }
            // Stake - Common staking signatures
            else if (['0xa694fc3a', '0xbc4bafe4', '0xe2bbb158'].includes(methodSig)) {
                txType = 'stake';
            }
            // Unstake - Common unstaking signatures
            else if (['0x2e1a7d4d', '0xdb006a75', '0x853828b6'].includes(methodSig)) {
                txType = 'unstake';
            }
            // Claim - Common claim signatures
            else if (['0x4e71d92d', '0x6a761202', '0x2f6c493c'].includes(methodSig)) {
                txType = 'claim';
            }
            // Contract - Any other contract interaction
            else if (tx.input && tx.input.length > 10) {
                txType = 'contract';
            }
            
            // If there is a value transfer and it's greater than 0, it's probably a transfer transaction
            if (tx.value && parseInt(tx.value, 16) > 0 && txType === 'contract') {
                txType = 'transfer';
            }
            
            const valueInMON = parseInt(tx.value || '0x0', 16) / 1e18;
            
            return {
                hash: tx.hash,
                txType: txType,
                txDetails: {
                    from: tx.from,
                    to: tx.to || 'Contract Creation',
                    value: valueInMON.toFixed(6) + ' ' + CONFIG.monad.symbol,
                    gas: parseInt(tx.gas || '0x0', 16),
                    timestamp: timestamp * 1000,
                    blockHeight: blockHeight,
                    confirmed: true, // This is a confirmed transaction in this block
                    status: 'success', // Transactions in blocks are successful
                    methodSig: methodSig,
                    gasUsed: parseInt(tx.gasUsed || tx.gas || '0x0', 16),
                    transactionIndex: index
                }
            };
        });
        
        // Ensure all tx types are represented
        this.ensureAllTxTypesPresent();
        
        console.log(`✅ ${this.blockTransactions.length} transactions classified`);
    }
    
    // Create deterministic transactions when real ones aren't available
    static createDeterministicTransactions(count, blockHeight, timestamp) {
        this.blockTransactions = [];
        const txTypes = Object.keys(TX_TYPES);
        
        for (let i = 0; i < count; i++) {
            // Cycle through all tx types for variety
            const txType = txTypes[i % txTypes.length];
            
            // Create realistic values
            const valueInMON = (Math.random() * 10 + 0.001); // 0.001-10 MON range
            const gasUsed = 21000 + Math.floor(Math.random() * 200000); // 21k-221k gas
            
            this.blockTransactions.push({
                hash: '0x' + Array.from({length: 64}, (_, j) => ((j * 13 + i * 7 + blockHeight) % 16).toString(16)).join(''),
                txType: txType,
                txDetails: {
                    from: '0x' + Array.from({length: 40}, (_, j) => ((j * 11 + i * 5 + blockHeight) % 16).toString(16)).join(''),
                    to: '0x' + Array.from({length: 40}, (_, j) => ((j * 7 + i * 11 + blockHeight) % 16).toString(16)).join(''),
                    value: valueInMON.toFixed(6) + ' ' + CONFIG.monad.symbol,
                    gas: gasUsed + Math.floor(Math.random() * 50000), // Maximum gas
                    gasUsed: gasUsed,
                    timestamp: (timestamp || Math.floor(Date.now() / 1000)) * 1000,
                    blockHeight: blockHeight,
                    confirmed: true,
                    status: 'success',
                    transactionIndex: i,
                    methodSig: this.getMethodSigForTxType(txType)
                }
            });
        }
        
        // Ensure all tx types are represented
        this.ensureAllTxTypesPresent();
        
        console.log(`🔧 ${count} deterministic transactions created (Block #${blockHeight})`);
    }
    
    // Get method signature for transaction type
    static getMethodSigForTxType(txType) {
        const methodSigs = {
            'transfer': '0xa9059cbb',
            'approve': '0x095ea7b3',
            'swap': '0x38ed1739',
            'stake': '0xa694fc3a',
            'unstake': '0x2e1a7d4d',
            'claim': '0x4e71d92d',
            'contract': '0x' + Array.from({length: 8}, () => Math.floor(Math.random() * 16).toString(16)).join('')
        };
        return methodSigs[txType] || '0x';
    }
    
    // Ensure all transaction types are represented
    static ensureAllTxTypesPresent() {
        const txTypes = Object.keys(TX_TYPES);
        const currentTypes = new Set(this.blockTransactions.map(tx => tx.txType));
        
        // Add missing tx types
        txTypes.forEach((type, index) => {
            if (!currentTypes.has(type) && this.blockTransactions.length > 0) {
                // Replace a transaction with the missing type
                this.blockTransactions[index % this.blockTransactions.length].txType = type;
            }
        });
    }
    
    // Get transaction by index - create deterministic data if no real data available
    static getTransaction(index) {
        if (this.blockTransactions && this.blockTransactions.length > 0) {
            // Use modulo to cycle through available transactions
            const tx = this.blockTransactions[index % this.blockTransactions.length];
            
            // Return with confirmation status and block height
            if (!tx.txDetails.confirmed) {
                tx.txDetails.confirmed = true;
            }
            
            return tx;
        }
        
        // Create deterministic data if no real data available
        // Use debug log instead of console.log - to avoid too much repetition
        if (index % 50 === 0) console.log("Real transaction data not yet loaded, creating temporary data");
        
        // Create deterministic data
        const txTypes = Object.keys(TX_TYPES);
        const txType = txTypes[index % txTypes.length];
        
        return {
            hash: '0x' + Array.from({length: 64}, (_, j) => ((j * 13 + index * 7) % 16).toString(16)).join(''),
            txType: txType,
            txDetails: {
                from: '0x' + Array.from({length: 40}, (_, j) => ((j * 11 + index * 5) % 16).toString(16)).join(''),
                to: '0x' + Array.from({length: 40}, (_, j) => ((j * 7 + index * 11) % 16).toString(16)).join(''),
                value: ((index % 10) + 0.1).toFixed(4) + ' ' + CONFIG.monad.symbol,
                gas: 21000 + (index * 1000) % 100000,
                timestamp: Date.now() - (index * 60000),
                confirmed: false
            }
        };
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
        this.creationTime = Date.now();
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
            // Store the transaction info with the passenger
            this.passengers.push({
                person: person,
                txType: person.txType,
                txHash: person.txHash,
                txDetails: person.txDetails
            });
            return true;
        }
        return false;
    }
    
    getTransactions() {
        return this.passengers.map(passenger => ({
            person: passenger.person,
            txType: passenger.txType,
            txHash: passenger.txHash,
            txDetails: passenger.txDetails
        }));
    }

    launch() {
        // Only launch when balloon is full - wait for all passengers
        const hasAllPassengers = this.passengers.length >= this.blockData.txCount;
        
        if (this.state === 'loading' && hasAllPassengers) {
            this.state = 'launching';
            
            if (CONFIG.balloons.type === 'zeppelin') {
                // Zeppelin flies horizontally to the right
                this.targetY = this.y; // Keep same height
            } else {
                // Balloon flies upward
                this.targetY = -200;
            }
            
            this.confirmationTime = Date.now();
            this.createLaunchParticles();
            if (gameState.soundEnabled) this.playLaunchSound();
            
            // Return passengers who couldn't board (excess over tx count)
            const returnedPassengers = this.passengers.slice(this.blockData.txCount);
            returnedPassengers.forEach(passenger => {
                passenger.person.returnToWaiting();
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
        
        // Balonun oyun alanının altında kalmasını önle
        if (this.y > CONFIG.canvas.height - 120) {
            this.y = CONFIG.canvas.height - 120;
        }
        
        // Calculate speed based on dominant transaction type
        let speedMultiplier = 1.0;
        if (this.passengers.length > 0) {
            const txTypes = this.passengers.map(p => p.txType);
            const dominantType = txTypes.reduce((a, b, i, arr) =>
                arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
            );
            speedMultiplier = CONFIG.balloons.speedMultiplier[dominantType] || 1.0;
        }
        
        const adjustedSpeed = CONFIG.balloons.flySpeed * speedMultiplier;
        
        if (this.state === 'launching' || this.state === 'flying') {
            try {
                if (CONFIG.balloons.type === 'zeppelin') {
                    // Zeppelin flight: first up to center, then right
                    const centerY = CONFIG.canvas.height / 2;
                    
                    if (this.y > centerY) {
                        // Phase 1: Rise to center of screen
                        this.y -= adjustedSpeed * 1.5;
                        this.x += windEffect * 0.3; // Small horizontal drift from wind
                    } else {
                        // Phase 2: Fly horizontally to the right
                        this.x += adjustedSpeed * 4.0;
                        this.y += windEffect * 1.0; // Small vertical movement from wind
                    }
                    
                    // Zeppelin disappears when it goes off the right side
                    if (this.x > CONFIG.canvas.width + 200) {
                        this.state = 'gone';
                    }
                } else {
                    // Balloon flies upward with transaction-based speed
                    this.y = lerp(this.y, this.targetY, adjustedSpeed * 0.008);
                    this.x += windEffect;
                    
                    if (this.y < -300) {
                        this.state = 'gone';
                    }
                }
            } catch (error) {
                console.error('Balloon update error:', error);
                this.handleError();
            }
        }

        if (this.state === 'gone') {
            this.opacity = Math.max(0, this.opacity - 0.02);
        }
    }
    
    handleError() {
        console.log('🔧 Balloon error detected, marking for cleanup');
        this.state = 'gone';
        this.opacity = 0;
        
        // Return passengers to waiting
        this.passengers.forEach(passenger => {
            if (passenger.person && passenger.person.returnToWaiting) {
                passenger.person.returnToWaiting();
            }
        });
        
        gameState.errorCount++;
    }

    drawMonadLogo(x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        
        // Try to draw the purple logo image
        if (PURPLE_LOGO && PURPLE_LOGO.complete && PURPLE_LOGO.naturalWidth > 0) {
            ctx.drawImage(PURPLE_LOGO, -size/2, -size/2, size, size);
        } else {
            // Fallback to original logo
            ctx.rotate(Math.PI / 4);
            
            const gradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
            gradient.addColorStop(0, '#7C4DFF');
            gradient.addColorStop(1, '#9C27B0');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-size/2, -size/2, size, size);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-size/2 + 2, -size/2 + 2, size - 4, size - 4);
        }
        
        ctx.restore();
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        const glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.2;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15 * glowIntensity;

        if (CONFIG.balloons.type === 'zeppelin') {
            this.drawZeppelin();
        } else {
            this.drawBalloon();
        }

        ctx.restore();
    }

    drawBalloon() {
        // Draw realistic hot air balloon envelope (more rounded)
        const balloonWidth = this.size * 0.9;
        const balloonHeight = this.size * 1.1;
        
        // Main balloon envelope with better proportions
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, balloonWidth/2, balloonHeight/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw vertical bands for realistic hot air balloon look
        for (let i = 0; i < this.verticalBands.length; i++) {
            const band = this.verticalBands[i];
            
            ctx.fillStyle = band.color;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, balloonWidth/2, balloonHeight/2, 0, band.start, band.start + band.width);
            ctx.lineTo(this.x, this.y);
            ctx.closePath();
            ctx.fill();
        }

        // Balloon highlight for 3D effect
        ctx.shadowBlur = 0;
        const balloonGradient = ctx.createRadialGradient(
            this.x - balloonWidth/4, this.y - balloonHeight/4, 0,
            this.x, this.y, balloonWidth/2
        );
        balloonGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        balloonGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
        balloonGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        
        ctx.fillStyle = balloonGradient;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, balloonWidth/2, balloonHeight/2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Enhanced wicker basket with better proportions
        const basketY = this.y + balloonHeight/2 + 35;
        const basketWidth = this.size * 0.6;
        const basketHeight = this.size * 0.4;
        
        // Basket shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(this.x - basketWidth/2 + 2, basketY + 2, basketWidth, basketHeight);
        
        // Main basket
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x - basketWidth/2, basketY, basketWidth, basketHeight);

        // Basket weave pattern
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        // Horizontal lines
        for (let i = 0; i <= 6; i++) {
            const lineY = basketY + (i * basketHeight/6);
            ctx.beginPath();
            ctx.moveTo(this.x - basketWidth/2, lineY);
            ctx.lineTo(this.x + basketWidth/2, lineY);
            ctx.stroke();
        }
        // Vertical lines
        for (let i = 0; i <= 8; i++) {
            const lineX = this.x - basketWidth/2 + (i * basketWidth/8);
            ctx.beginPath();
            ctx.moveTo(lineX, basketY);
            ctx.lineTo(lineX, basketY + basketHeight);
            ctx.stroke();
        }

        // Basket rim
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x - basketWidth/2, basketY);
        ctx.lineTo(this.x + basketWidth/2, basketY);
        ctx.stroke();

        // Realistic ropes connecting balloon to basket
        ctx.strokeStyle = '#8D6E63';
        ctx.lineWidth = 2;
        const ropePoints = [
            {x: -basketWidth/3, y: 0},
            {x: basketWidth/3, y: 0},
            {x: -basketWidth/4, y: 0},
            {x: basketWidth/4, y: 0}
        ];
        
        ropePoints.forEach(point => {
            const ropeStartX = this.x + Math.cos(Math.atan2(point.y, point.x)) * (balloonWidth * 0.4);
            const ropeStartY = this.y + balloonHeight/2 - 5;
            const ropeEndX = this.x + point.x;
            const ropeEndY = basketY;
            
            ctx.beginPath();
            ctx.moveTo(ropeStartX, ropeStartY);
            ctx.quadraticCurveTo(
                this.x + point.x * 0.5,
                basketY - 15,
                ropeEndX,
                ropeEndY
            );
            ctx.stroke();
        });

        // Enhanced Monad logo on basket - larger and more visible
        this.drawMonadLogo(this.x, basketY + basketHeight/2, this.size * 0.4);

        this.drawPassengerInfo();
    }

    drawZeppelin() {
        // Draw realistic zeppelin body with proper proportions
        const zeppelinWidth = this.size * 2.2; // Much longer for realistic proportions
        const zeppelinHeight = this.size * 0.5; // Thinner height
        
        // Main zeppelin body gradient (more realistic metallic look)
        const bodyGradient = ctx.createRadialGradient(
            this.x, this.y - zeppelinHeight/3, 0,
            this.x, this.y, zeppelinHeight/2
        );
        bodyGradient.addColorStop(0, this.lightenColor(this.color, 40));
        bodyGradient.addColorStop(0.3, this.lightenColor(this.color, 20));
        bodyGradient.addColorStop(0.7, this.color);
        bodyGradient.addColorStop(1, this.darkenColor(this.color, 30));

        ctx.fillStyle = bodyGradient;
        
        // Draw zeppelin main body (realistic cigar shape)
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, zeppelinWidth/2, zeppelinHeight/2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Add realistic zeppelin nose cone (pointed front)
        ctx.fillStyle = this.darkenColor(this.color, 15);
        ctx.beginPath();
        ctx.ellipse(this.x + zeppelinWidth/2 - 15, this.y, 15, zeppelinHeight/3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Add tail fins (vertical stabilizer)
        ctx.fillStyle = this.darkenColor(this.color, 25);
        const tailX = this.x - zeppelinWidth/2;
        const finHeight = zeppelinHeight * 0.8;
        
        // Vertical fin
        ctx.beginPath();
        ctx.moveTo(tailX, this.y);
        ctx.lineTo(tailX - 20, this.y - finHeight/2);
        ctx.lineTo(tailX - 15, this.y - finHeight/2);
        ctx.lineTo(tailX - 5, this.y);
        ctx.lineTo(tailX - 15, this.y + finHeight/2);
        ctx.lineTo(tailX - 20, this.y + finHeight/2);
        ctx.closePath();
        ctx.fill();
        
        // Horizontal fins
        ctx.beginPath();
        ctx.moveTo(tailX, this.y);
        ctx.lineTo(tailX - 15, this.y - finHeight/3);
        ctx.lineTo(tailX - 10, this.y - finHeight/3);
        ctx.lineTo(tailX - 5, this.y);
        ctx.lineTo(tailX - 10, this.y + finHeight/3);
        ctx.lineTo(tailX - 15, this.y + finHeight/3);
        ctx.closePath();
        ctx.fill();

        // Add realistic zeppelin panels/segments
        ctx.strokeStyle = this.darkenColor(this.color, 20);
        ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
            const segmentX = this.x - zeppelinWidth/2 + (i * zeppelinWidth/6);
            ctx.beginPath();
            ctx.ellipse(segmentX, this.y, 2, zeppelinHeight/2 - 5, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Add zeppelin highlight (more realistic)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(this.x + zeppelinWidth/6, this.y - zeppelinHeight/4,
                   zeppelinWidth/8, zeppelinHeight/12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw realistic gondola (passenger cabin)
        const gondolaY = this.y + zeppelinHeight/2 + 20;
        const gondolaWidth = this.size * 1.0;
        const gondolaHeight = this.size * 0.35;
        
        // Gondola shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(this.x - gondolaWidth/2 + 3, gondolaY + 3, gondolaWidth, gondolaHeight);
        
        // Main gondola with rounded edges
        ctx.fillStyle = '#2C1810'; // Darker brown for realism
        ctx.beginPath();
        ctx.roundRect(this.x - gondolaWidth/2, gondolaY, gondolaWidth, gondolaHeight, 8);
        ctx.fill();
        
        // Gondola frame
        ctx.strokeStyle = '#1A0F08';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(this.x - gondolaWidth/2, gondolaY, gondolaWidth, gondolaHeight, 8);
        ctx.stroke();
        
        // Realistic gondola windows with frames
        ctx.fillStyle = '#87CEEB'; // Sky blue windows
        ctx.strokeStyle = '#1A0F08';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 6; i++) {
            const windowX = this.x - gondolaWidth/2 + 8 + (i * (gondolaWidth-16)/5);
            const windowWidth = (gondolaWidth-16)/5 - 4;
            const windowHeight = gondolaHeight - 12;
            
            // Window glass
            ctx.fillRect(windowX, gondolaY + 6, windowWidth, windowHeight);
            // Window frame
            ctx.strokeRect(windowX, gondolaY + 6, windowWidth, windowHeight);
            
            // Window reflection
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(windowX, gondolaY + 6, windowWidth/3, windowHeight/2);
            ctx.fillStyle = '#87CEEB';
        }

        // Draw realistic suspension cables
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        
        // Multiple suspension points for realism
        const suspensionPoints = [
            {x: -zeppelinWidth/3, gondolaX: -gondolaWidth/3},
            {x: -zeppelinWidth/6, gondolaX: -gondolaWidth/6},
            {x: 0, gondolaX: 0},
            {x: zeppelinWidth/6, gondolaX: gondolaWidth/6},
            {x: zeppelinWidth/3, gondolaX: gondolaWidth/3}
        ];
        
        suspensionPoints.forEach(point => {
            ctx.beginPath();
            ctx.moveTo(this.x + point.x, this.y + zeppelinHeight/2);
            ctx.lineTo(this.x + point.gondolaX, gondolaY);
            ctx.stroke();
        });

        // Add propeller at the back
        ctx.fillStyle = '#444';
        const propX = this.x - zeppelinWidth/2 - 25;
        ctx.beginPath();
        ctx.arc(propX, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Propeller blades
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(propX - 12, this.y);
        ctx.lineTo(propX + 12, this.y);
        ctx.moveTo(propX, this.y - 12);
        ctx.lineTo(propX, this.y + 12);
        ctx.stroke();

        // Enhanced Monad logo on gondola - larger and more visible
        this.drawMonadLogo(this.x, gondolaY + gondolaHeight/2, this.size * 0.4);

        this.drawPassengerInfo();
    }

    drawPassengerInfo() {
        // Passenger count
        if (this.passengers.length > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText(`${this.passengers.length}/${this.blockData.txCount}`, this.x, this.y + 5);
            ctx.fillText(`${this.passengers.length}/${this.blockData.txCount}`, this.x, this.y + 5);
        }

        // Block info
        if (this.blockData) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            const infoY = CONFIG.balloons.type === 'zeppelin' ? this.y - this.size * 0.4 - 15 : this.y - this.size * 0.55 - 15;
            ctx.fillText(`Block #${this.blockData.blockHeight}`, this.x, infoY);
        }

        // Progress bar
        if (this.passengers.length > 0 && this.passengers.length < this.blockData.txCount && this.state === 'loading') {
            const progress = this.passengers.length / this.blockData.txCount;
            const barWidth = this.size * 0.7;
            const barHeight = 4;
            const barX = this.x - barWidth/2;
            const barY = CONFIG.balloons.type === 'zeppelin' ? this.y + this.size * 0.4 + 10 : this.y + this.size * 0.55 + 10;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    isClicked(mouseX, mouseY) {
        const distance = Math.sqrt((mouseX - this.x) ** 2 + (mouseY - this.y) ** 2);
        return distance < this.size + 30;
    }
}

// Enhanced Monanimal Class
class MonanimalPerson {
    constructor(x, y, txData = null) {
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
        
        if (txData) {
            // Use provided transaction data
            this.txType = txData.txType;
            this.txHash = txData.hash;
            this.txDetails = txData.txDetails;
        } else {
            // Get a transaction (real or deterministic) from MonadAPI
            // Using index based on object id to ensure variety
            const idNum = parseInt(this.id.substring(0, 4), 36);
            const generatedTxData = MonadAPI.getTransaction(idNum);
            
            // Add transaction type and hash
            this.txType = generatedTxData.txType;
            this.txHash = generatedTxData.hash;
            
            // Add transaction details
            this.txDetails = generatedTxData.txDetails;
        }
    }

    findNearestBalloon() {
        let nearest = null;
        let minDistance = Infinity;

        for (const balloon of gameState.balloons) {
            // Find only loading balloons that are not at capacity and
            // match this monanimal's block height
            if (balloon.state === 'loading' &&
                balloon.passengers.length < balloon.blockData.txCount &&
                // If this monanimal has a specific block height, only target balloons for that block
                (!this.txDetails.blockHeight ||
                 this.txDetails.blockHeight === balloon.blockData.blockHeight)) {
                
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
        try {
            // Pozisyon sınırlarını kontrol et ve düzelt
            if (this.x < -100) this.x = -100;
            if (this.x > CONFIG.canvas.width + 100) this.x = CONFIG.canvas.width + 100;
            if (this.y < 0) this.y = CONFIG.canvas.height - 150;
            if (this.y > CONFIG.canvas.height) this.y = CONFIG.canvas.height - 150;
            
            // Check if transaction is confirmed but missed its block - remove immediately
            if (this.txDetails && this.txDetails.confirmed && this.txDetails.blockHeight) {
                const currentBlockHeight = gameState.networkData.blockHeight;
                if (this.txDetails.blockHeight < currentBlockHeight - 1) {
                    // This monanimal's transaction was confirmed in an old block, remove it
                    const index = gameState.people.indexOf(this);
                    if (index > -1) {
                        gameState.people.splice(index, 1);
                    }
                    return;
                }
            }
            
            this.animation += 0.1;
            this.bouncePhase += MONANIMAL_DATA.animation.bounceSpeed;

            if (this.state === 'waiting') {
                const bounce = Math.sin(this.bouncePhase) * MONANIMAL_DATA.animation.bounceHeight;
                this.y = this.waitingSpot.y + bounce;
                
                // Waiting spot pozisyonunu kontrol et
                if (this.waitingSpot.y > CONFIG.canvas.height - 100) {
                    this.waitingSpot.y = CONFIG.canvas.height - 150;
                }

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
                    // Waiting spot pozisyonunu güvenli alanda tut
                    if (this.waitingSpot.y > CONFIG.canvas.height - 100) {
                        this.waitingSpot.y = CONFIG.canvas.height - 150;
                    }
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
        } catch (error) {
            console.warn('Monanimal update hatası:', error);
            // Hata durumunda güvenli pozisyona taşı
            this.x = 100 + Math.random() * 200;
            this.y = CONFIG.canvas.height - 150;
            this.state = 'waiting';
            this.waitingSpot = { x: this.x, y: this.y };
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
        
        try {
            // Check if image is loaded
            const image = MONANIMAL_IMAGES[this.imageIndex];
            const imageReady = image &&
                              (image.complete || image.readyState === 4) &&
                              image.naturalWidth !== 0 &&
                              image.naturalHeight !== 0;
            
            if (imageReady) {
                // Draw the image
                const imgWidth = MONANIMAL_DATA.size.width;
                const imgHeight = MONANIMAL_DATA.size.height;
                
                // Add shadow effect
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                ctx.drawImage(
                    image,
                    -imgWidth,
                    -imgHeight,
                    imgWidth * 2,
                    imgHeight * 2
                );
                
                ctx.shadowBlur = 0; // Reset shadow
            } else {
                // Fallback - Draw colored Monanimal
                this.drawFallbackMonanimal();
            }
        } catch (e) {
            console.warn('Monanimal drawing error:', e);
            // Draw fallback
            this.drawFallbackMonanimal();
        }
        
        ctx.restore();
    }
    
    drawFallbackMonanimal() {
        // Select color based on transaction type
        const txColors = {
            'transfer': '#10B981',
            'approve': '#3B82F6',
            'swap': '#8B5CF6',
            'stake': '#F59E0B',
            'unstake': '#EF4444',
            'claim': '#6366F1',
            'contract': '#EC4899'
        };
        
        const color = txColors[this.txType] || '#7C4DFF';
        
        // Main body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight effect
        const gradient = ctx.createRadialGradient(-this.size/3, -this.size/3, 0, 0, 0, this.size);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Monad logo-like square
        ctx.fillStyle = 'white';
        ctx.save();
        ctx.rotate(Math.PI/4);
        const logoSize = this.size * 0.6;
        ctx.fillRect(-logoSize/2, -logoSize/2, logoSize, logoSize);
        ctx.restore();
        
        // Transaction type emoji
        const txEmojis = {
            'transfer': '💸',
            'approve': '✅',
            'swap': '🔄',
            'stake': '📌',
            'unstake': '🔓',
            'claim': '🎁',
            'contract': '📜'
        };
        
        const emoji = txEmojis[this.txType] || '🐠';
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
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
    
    // Check if monanimal is clicked - büyütülmüş tıklama alanı
    isClicked(mouseX, mouseY) {
        const distance = Math.sqrt((mouseX - this.x) ** 2 + (mouseY - this.y) ** 2);
        // Tıklama alanını büyüttük - daha kolay tıklanabilir
        return distance < this.size * 3;
    }
}

// Enhanced Mountain Class with realistic features
class Mountain {
    constructor(x, y, height, width) {
        this.x = x;
        this.y = y;
        this.height = height;
        this.width = width;
        this.color = this.generateColor();
        this.layers = 4 + Math.floor(Math.random() * 3);
        this.peaks = this.generatePeaks();
        this.ridges = this.generateRidges();
    }

    generateColor() {
        const baseColors = ['#8B7355', '#A0522D', '#CD853F', '#D2B48C', '#BC8F8F', '#696969', '#778899'];
        return baseColors[Math.floor(Math.random() * baseColors.length)];
    }

    generatePeaks() {
        const peaks = [];
        const peakCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < peakCount; i++) {
            peaks.push({
                offset: (i - peakCount/2) * (this.width * 0.3),
                height: 0.7 + Math.random() * 0.3
            });
        }
        return peaks;
    }

    generateRidges() {
        const ridges = [];
        for (let i = 0; i < 5; i++) {
            ridges.push({
                x: this.x + (Math.random() - 0.5) * this.width * 0.8,
                y: this.y - this.height * (0.3 + Math.random() * 0.4),
                width: 20 + Math.random() * 40,
                height: 10 + Math.random() * 20
            });
        }
        return ridges;
    }

    draw() {
        ctx.save();
        
        // Enhanced shadow for depth
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 10;

        // Create organic mountain gradient
        const gradient = ctx.createLinearGradient(
            this.x - this.width/2, this.y - this.height,
            this.x + this.width/2, this.y
        );
        gradient.addColorStop(0, this.lightenColor(this.color, 40));
        gradient.addColorStop(0.3, this.lightenColor(this.color, 20));
        gradient.addColorStop(0.6, this.color);
        gradient.addColorStop(1, this.darkenColor(this.color, 30));

        ctx.fillStyle = gradient;
        
        // Draw organic mountain shape with natural curves
        ctx.beginPath();
        ctx.moveTo(this.x - this.width/2, this.y); // Bottom left
        
        // Create organic left slope with multiple control points
        const leftMidX = this.x - this.width * 0.25;
        const leftMidY = this.y - this.height * 0.6;
        const leftUpperX = this.x - this.width * 0.1;
        const leftUpperY = this.y - this.height * 0.85;
        
        ctx.quadraticCurveTo(leftMidX, leftMidY, leftUpperX, leftUpperY);
        ctx.quadraticCurveTo(this.x - this.width * 0.05, this.y - this.height * 0.95, this.x, this.y - this.height);
        
        // Create organic right slope
        const rightUpperX = this.x + this.width * 0.1;
        const rightUpperY = this.y - this.height * 0.85;
        const rightMidX = this.x + this.width * 0.25;
        const rightMidY = this.y - this.height * 0.6;
        
        ctx.quadraticCurveTo(this.x + this.width * 0.05, this.y - this.height * 0.95, rightUpperX, rightUpperY);
        ctx.quadraticCurveTo(rightMidX, rightMidY, this.x + this.width/2, this.y);
        
        ctx.closePath();
        ctx.fill();

        // Add realistic snow caps for high mountains
        if (this.height > 200) {
            ctx.shadowBlur = 0;
            
            // Main snow cap
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            const snowHeight = this.height * 0.25;
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.height); // Peak
            
            // Organic snow line following mountain contours
            ctx.quadraticCurveTo(
                this.x - this.width * 0.08, this.y - this.height + snowHeight * 0.7,
                this.x - this.width * 0.12, this.y - this.height + snowHeight
            );
            ctx.quadraticCurveTo(
                this.x, this.y - this.height + snowHeight * 1.2,
                this.x + this.width * 0.12, this.y - this.height + snowHeight
            );
            ctx.quadraticCurveTo(
                this.x + this.width * 0.08, this.y - this.height + snowHeight * 0.7,
                this.x, this.y - this.height
            );
            ctx.fill();
            
            // Add snow texture and details
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let i = 0; i < 8; i++) {
                const snowX = this.x + (Math.sin(i) * this.width * 0.08);
                const snowY = this.y - this.height + (i * snowHeight * 0.15);
                const snowSize = 1 + i * 0.5;
                ctx.beginPath();
                ctx.arc(snowX, snowY, snowSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Add snow highlights
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.ellipse(this.x - this.width * 0.03, this.y - this.height + snowHeight * 0.3,
                       this.width * 0.04, snowHeight * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add organic rock formations and ridges
        ctx.shadowBlur = 3;
        ctx.fillStyle = this.darkenColor(this.color, 35);
        
        // Left side rock formation
        ctx.beginPath();
        ctx.moveTo(this.x - this.width * 0.3, this.y - this.height * 0.3);
        ctx.quadraticCurveTo(
            this.x - this.width * 0.25, this.y - this.height * 0.4,
            this.x - this.width * 0.2, this.y - this.height * 0.25
        );
        ctx.quadraticCurveTo(
            this.x - this.width * 0.22, this.y - this.height * 0.2,
            this.x - this.width * 0.28, this.y - this.height * 0.2
        );
        ctx.closePath();
        ctx.fill();
        
        // Right side rock formation
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.25, this.y - this.height * 0.4);
        ctx.quadraticCurveTo(
            this.x + this.width * 0.3, this.y - this.height * 0.5,
            this.x + this.width * 0.35, this.y - this.height * 0.35
        );
        ctx.quadraticCurveTo(
            this.x + this.width * 0.32, this.y - this.height * 0.25,
            this.x + this.width * 0.27, this.y - this.height * 0.3
        );
        ctx.closePath();
        ctx.fill();

        // Add natural erosion lines
        ctx.strokeStyle = this.darkenColor(this.color, 50);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width * 0.1, this.y - this.height * 0.7);
        ctx.quadraticCurveTo(
            this.x - this.width * 0.05, this.y - this.height * 0.5,
            this.x, this.y - this.height * 0.3
        );
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.08, this.y - this.height * 0.8);
        ctx.quadraticCurveTo(
            this.x + this.width * 0.12, this.y - this.height * 0.6,
            this.x + this.width * 0.15, this.y - this.height * 0.4
        );
        ctx.stroke();

        ctx.restore();
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
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

// Static Realistic Grass Drawing Function
function drawRealisticGrass() {
    const groundY = CONFIG.canvas.height - 100;
    const weather = WEATHER_TYPES[gameState.currentWeather];
    
    // Draw snow layer if snowy weather
    if (gameState.currentWeather === 'snowy') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, groundY - 5, CONFIG.canvas.width, 5);
        
        // Add snow texture
        for (let i = 0; i < CONFIG.canvas.width; i += 10) {
            const snowHeight = 2 + (i % 3); // Static snow height based on position
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(i, groundY - snowHeight, 8 + (i % 4), snowHeight);
        }
    }
    
    // Draw static realistic grass blades
    for (let i = 0; i < CONFIG.canvas.width; i += 2) {
        const grassHeight = 12 + (i % 20); // Static height based on position
        const grassX = i + (i % 3); // Static X offset
        const grassWidth = 0.8 + (i % 2) * 0.7; // Static width variation
        
        // More realistic grass colors
        let grassColors = ['#4A7C59', '#228B22', '#006400', '#2E7D32']; // Deeper greens
        if (gameState.currentWeather === 'snowy') {
            grassColors = ['#8FBC8F', '#90C090', '#708070', '#556B2F']; // Faded grass under snow
        } else if (gameState.currentWeather === 'rainy') {
            grassColors = ['#2E7D32', '#1B5E20', '#0D4F0C', '#004D40']; // Darker, wet grass
        }
        
        // Static natural variation in grass blade shape
        const bendFactor = 0.3 + (i % 5) * 0.1; // Static bend based on position
        const tipCurve = (i % 3) * 0.2; // Static curve at tip
        
        // Gradient for each grass blade
        const grassGradient = ctx.createLinearGradient(
            grassX, groundY - grassHeight,
            grassX, groundY
        );
        const colorIndex = i % grassColors.length;
        grassGradient.addColorStop(0, grassColors[colorIndex]);
        grassGradient.addColorStop(0.3, grassColors[(colorIndex + 1) % grassColors.length]);
        grassGradient.addColorStop(0.7, grassColors[(colorIndex + 2) % grassColors.length]);
        grassGradient.addColorStop(1, grassColors[(colorIndex + 3) % grassColors.length]);
        
        ctx.strokeStyle = grassGradient;
        ctx.lineWidth = grassWidth;
        ctx.lineCap = 'round';
        
        // Draw static natural grass blade shape
        ctx.beginPath();
        ctx.moveTo(grassX, groundY);
        
        // Create a static natural S-curve for grass blade
        const midX = grassX + Math.sin(i * 0.1) * 1.5;
        const midY = groundY - grassHeight * 0.5;
        const tipX = grassX + Math.sin(i * 0.1) * 2.5 + tipCurve;
        const tipY = groundY - grassHeight;
        
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();
        
        // Add some static grass blade details
        if (i % 10 === 0) { // Every 10th blade gets detail
            ctx.lineWidth = grassWidth * 0.5;
            ctx.strokeStyle = grassColors[(i + 2) % grassColors.length];
            ctx.beginPath();
            ctx.moveTo(grassX + 1, groundY);
            ctx.quadraticCurveTo(midX + 1, midY, tipX + 1, tipY);
            ctx.stroke();
        }
    }
    
    // Add static small grass clusters
    for (let i = 0; i < CONFIG.canvas.width; i += 8) {
        if (i % 24 === 0) { // Static pattern for clusters
            const clusterX = i + (i % 6);
            const clusterSize = 2 + (i % 3);
            
            for (let j = 0; j < clusterSize; j++) {
                const bladeX = clusterX + (j - clusterSize/2) * 2;
                const bladeHeight = 6 + (i + j) % 10;
                
                ctx.strokeStyle = `rgba(34, 139, 34, ${0.6 + (i % 4) * 0.1})`;
                ctx.lineWidth = 0.5 + (j % 2) * 0.3;
                ctx.beginPath();
                ctx.moveTo(bladeX, groundY);
                ctx.lineTo(bladeX + (j % 3) - 1, groundY - bladeHeight);
                ctx.stroke();
            }
        }
    }
    
    // Add static flowers
    const flowerCount = gameState.currentWeather === 'snowy' || gameState.currentWeather === 'stormy' ? 3 : 15;
    for (let i = 0; i < flowerCount; i++) {
        const flowerX = (i * 80 + 40) % CONFIG.canvas.width; // Static flower positions
        const flowerY = groundY - 3 - (i % 8);
        
        // Static flower colors
        const flowerColors = gameState.currentWeather === 'snowy' ?
            ['#E0E0E0', '#D0D0D0', '#C0C0C0'] :
            ['#FF69B4', '#FFB6C1', '#87CEEB', '#DDA0DD', '#F0E68C', '#FF6347', '#98FB98'];
        
        const flowerColor = flowerColors[i % flowerColors.length];
        
        // Draw static flower with petals
        ctx.fillStyle = flowerColor;
        const petalCount = 4 + (i % 4);
        const petalSize = 1.5 + (i % 3) * 0.5;
        
        for (let p = 0; p < petalCount; p++) {
            const angle = (p / petalCount) * Math.PI * 2;
            const petalX = flowerX + Math.cos(angle) * petalSize;
            const petalY = flowerY + Math.sin(angle) * petalSize;
            
            ctx.beginPath();
            ctx.arc(petalX, petalY, petalSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Static flower center
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(flowerX, flowerY, petalSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Music System Functions
function initMusicSystem() {
    // Audio klasöründeki müzik dosyalarını tanımla
    musicSystem.tracks = [
        { name: 'main1.mp3', file: 'audio/main1.mp3' },
        { name: 'main2.webm', file: 'audio/main2.webm' },
        { name: 'main3.mp3', file: 'audio/main3.mp3' },
        { name: 'squid2.mp4', file: 'audio/squid2.mp4' }
    ];
    
    // Audio elementini al
    musicSystem.audio = document.getElementById('backgroundMusic');
    
    if (musicSystem.audio) {
        // İlk müziği yükle (main1.mp3)
        loadTrack(0);
        
        // Event listener'ları ekle
        musicSystem.audio.addEventListener('ended', () => {
            // main1.mp3 bittiğinde tekrar başa dön (loop)
            if (musicSystem.currentTrackIndex === 0) {
                loadTrack(0);
                if (gameState.soundEnabled) {
                    setTimeout(() => playMusic(), 100);
                }
            }
        });
        musicSystem.audio.addEventListener('error', handleMusicError);
        musicSystem.audio.addEventListener('canplay', () => {
            console.log('🎵 Müzik yüklendi:', musicSystem.tracks[musicSystem.currentTrackIndex].name);
            // Müzik yüklendiğinde otomatik başlatma - kullanıcı etkileşimi bekle
            // playMusic() sadece kullanıcı ses butonuna bastığında çağrılacak
        });
        
        // Ses seviyesini ayarla
        musicSystem.audio.volume = musicSystem.volume;
        
        // Müzik hazır, kullanıcı etkileşimi bekleniyor
        console.log('🎵 Müzik sistemi hazır - kullanıcı etkileşimi bekleniyor');
    }
}

function loadTrack(index) {
    if (index >= 0 && index < musicSystem.tracks.length) {
        musicSystem.currentTrackIndex = index;
        const track = musicSystem.tracks[index];
        
        if (musicSystem.audio) {
            musicSystem.audio.src = track.file;
            musicSystem.audio.load();
        }
    }
}

function playMusic() {
    if (musicSystem.audio && !musicSystem.isMuted && gameState.soundEnabled) {
        musicSystem.audio.play().then(() => {
            musicSystem.isPlaying = true;
            console.log('🎵 Müzik çalıyor:', musicSystem.tracks[musicSystem.currentTrackIndex].name);
        }).catch(error => {
            console.log('🎵 Müzik otomatik çalınamadı (tarayıcı kısıtlaması):', error);
            // Kullanıcı etkileşimi gerekiyor
            musicSystem.isPlaying = false;
        });
    }
}

function pauseMusic() {
    if (musicSystem.audio) {
        musicSystem.audio.pause();
        musicSystem.isPlaying = false;
    }
}

function nextTrack() {
    // Kullanıcı manuel olarak değiştirdiğinde sıradaki müziğe geç
    const nextIndex = (musicSystem.currentTrackIndex + 1) % musicSystem.tracks.length;
    loadTrack(nextIndex);
    // Ses açıksa otomatik olarak yeni parçayı çal
    if (gameState.soundEnabled) {
        setTimeout(() => playMusic(), 100);
    }
    console.log('🎵 Kullanıcı müziği değiştirdi:', musicSystem.tracks[nextIndex].name);
}


function changeVolume() {
    const volumeSlider = document.getElementById('volumeSlider');
    musicSystem.volume = volumeSlider.value / 100;
    
    if (musicSystem.audio) {
        musicSystem.audio.volume = musicSystem.volume;
    }
}

function handleMusicError(error) {
    console.error('🎵 Müzik hatası:', error);
    // Bir sonraki parçaya geç
    nextTrack();
}

// Dark Mode Functions
function toggleDarkMode() {
    gameState.darkMode = !gameState.darkMode;
    const body = document.body;
    const button = document.getElementById('darkModeToggle');
    
    if (gameState.darkMode) {
        body.classList.add('dark-mode');
        button.textContent = '☀️ Light';
        createStars();
    } else {
        body.classList.remove('dark-mode');
        button.textContent = '🌙 Dark';
        removeStars();
    }
    
    console.log('🌙 Dark mode:', gameState.darkMode ? 'Açık' : 'Kapalı');
}

function createStars() {
    const starsContainer = document.getElementById('stars');
    starsContainer.innerHTML = '';
    
    // 50 yıldız oluştur
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Rastgele pozisyon
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 60 + '%'; // Sadece gökyüzü kısmında
        
        // Rastgele boyut
        const size = Math.random() * 3 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        
        // Rastgele animasyon gecikmesi
        star.style.animationDelay = Math.random() * 2 + 's';
        
        starsContainer.appendChild(star);
    }
}

function removeStars() {
    const starsContainer = document.getElementById('stars');
    starsContainer.innerHTML = '';
}

// Game Initialization
function initGame() {
    // Create bigger triangular mountains
    const mountainPositions = [
        { x: 200, height: 250, width: 180 },
        { x: 450, height: 300, width: 200 },
        { x: 750, height: 280, width: 190 },
        { x: 1000, height: 260, width: 170 }
    ];

    gameState.fairyChimneys = []; // Clear old chimneys
    gameState.mountains = [];
    
    mountainPositions.forEach(pos => {
        gameState.mountains.push(new Mountain(
            pos.x,
            CONFIG.canvas.height - 50,
            pos.height,
            pos.width
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
    for (let i = 0; i < 20; i++) {
        const monanimal = new MonanimalPerson(
            50 + Math.random() * 300,
            CONFIG.canvas.height - 150 + Math.random() * 60
        );
        gameState.people.push(monanimal);
    }

    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    
    // Initialize music system
    initMusicSystem();
    
    // Start systems
    updateNetworkData();
    setInterval(updateNetworkData, CONFIG.monad.updateInterval);
    setInterval(changeWeather, CONFIG.weather.changeInterval);
    setInterval(performCleanup, CONFIG.performance.cleanupInterval);
    
    console.log('🎈 Cappadocia Blockchain Adventure initialized with Monanimals!');
    console.log('🎵 Müzik sistemi başlatıldı!');
}

// Performance cleanup function
function performCleanup() {
    // Remove old balloons that are gone
    gameState.balloons = gameState.balloons.filter(balloon => balloon.opacity > 0);
    
    // Limit total balloons
    if (gameState.balloons.length > CONFIG.performance.maxBalloons) {
        const oldBalloons = gameState.balloons.slice(0, gameState.balloons.length - CONFIG.performance.maxBalloons);
        oldBalloons.forEach(balloon => {
            balloon.state = 'gone';
            balloon.opacity = 0;
        });
    }
    
    // Remove excess monanimals
    if (gameState.people.length > CONFIG.performance.maxTotalMonanimals) {
        const excessCount = gameState.people.length - CONFIG.performance.maxTotalMonanimals;
        const waitingPeople = gameState.people.filter(p => p.state === 'waiting' || p.state === 'returning');
        
        // Remove oldest waiting monanimals
        for (let i = 0; i < Math.min(excessCount, waitingPeople.length); i++) {
            const index = gameState.people.indexOf(waitingPeople[i]);
            if (index > -1) {
                gameState.people.splice(index, 1);
            }
        }
    }
    
    // Clear old particles
    gameState.particles = gameState.particles.filter(particle => particle.life > 0);
    
    console.log(`🧹 Cleanup performed: ${gameState.balloons.length} balloons, ${gameState.people.length} monanimals, ${gameState.particles.length} particles`);
}

// Network Data Updates
async function updateNetworkData() {
    try {
        const blockData = await MonadAPI.getNetworkData();
        
        if (blockData) {
            const prevBlockHeight = gameState.networkData.blockHeight;
            gameState.networkData = {
                ...blockData,
                tps: blockData.txCount / 2
            };

            // Track blocks since last update for optimization
            gameState.blocksSinceLastUpdate++;
            
            // Create new balloon based on optimized interval
            if (blockData.blockHeight > prevBlockHeight && prevBlockHeight > 0) {
                // For high TPS, create balloons every 10 blocks or when queue exists
                const shouldCreateBalloon = gameState.blocksSinceLastUpdate >= CONFIG.monad.blocksPerUpdate ||
                                          gameState.balloonQueue > 0 ||
                                          gameState.balloons.length === 0;
                
                if (shouldCreateBalloon) {
                    createNewBalloon(blockData);
                    gameState.balloonQueue = 0;
                    gameState.blocksSinceLastUpdate = 0;
                }
                checkAchievements();
            }

            updateHUD();
            
            // Reset error count on successful update
            if (gameState.errorCount > 0) {
                gameState.errorCount = Math.max(0, gameState.errorCount - 1);
            }
        }
    } catch (error) {
        console.error('Network data update failed:', error);
        handleNetworkError(error);
    }
}

// Enhanced error handling function
function handleNetworkError(error) {
    gameState.errorCount++;
    gameState.lastErrorTime = Date.now();
    
    console.log(`🚨 Network error #${gameState.errorCount}: ${error.message}`);
    
    // Auto-recovery mechanism
    if (gameState.errorCount >= CONFIG.performance.maxErrors) {
        console.log('🔄 Maximum errors reached, initiating auto-recovery...');
        setTimeout(() => {
            autoRecover();
        }, CONFIG.performance.restartDelay);
    }
}

// Auto-recovery function
function autoRecover() {
    try {
        console.log('🔧 Auto-recovery initiated...');
        
        // Clean up problematic balloons
        gameState.balloons.forEach(balloon => {
            if (balloon.state === 'loading' && balloon.passengers.length === 0) {
                balloon.handleError();
            }
        });
        
        // Reset error state
        gameState.errorCount = 0;
        gameState.lastErrorTime = 0;
        
        // Perform cleanup
        performCleanup();
        
        // Show recovery notification
        showAchievement('🔧 Auto-Recovery!', 'System automatically recovered from errors');
        
        console.log('✅ Auto-recovery completed successfully');
        
    } catch (recoveryError) {
        console.error('❌ Auto-recovery failed:', recoveryError);
        // Force page reload as last resort
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

function createNewBalloon(blockData) {
    const x = 250 + Math.random() * (CONFIG.canvas.width - 500);
    // Balonların oyun alanının altında kalmasını önlemek için y pozisyonunu sınırla
    const y = Math.min(CONFIG.balloons.launchHeight, CONFIG.canvas.height - 150);
    
    const balloon = new Balloon(x, y, blockData);
    gameState.balloons.push(balloon);
    
    // Get real transactions from MonadAPI's blockTransactions
    const transactions = MonadAPI.blockTransactions || [];
    
    // Create monanimals only for confirmed transactions in this block
    if (transactions.length > 0) {
        // Filter only confirmed transactions
        const confirmedTransactions = transactions.filter(tx =>
            tx.txDetails && tx.txDetails.confirmed === true
        );
        
        console.log(`Creating ${Math.min(confirmedTransactions.length, blockData.txCount)} monanimals for confirmed transactions in block ${blockData.blockHeight}`);
        
        // Use actual number of confirmed transactions, limited by block's txCount
        const txCount = Math.min(confirmedTransactions.length, blockData.txCount);
        
        for (let i = 0; i < txCount; i++) {
            const tx = confirmedTransactions[i];
            
            // Ensure transaction data includes block height
            if (!tx.txDetails) {
                tx.txDetails = {};
            }
            
            // Confirm this transaction is confirmed and set the block height
            tx.txDetails.blockHeight = blockData.blockHeight;
            tx.txDetails.confirmed = true;
            
            // Create a new monanimal with the confirmed transaction data
            const monanimal = new MonanimalPerson(
                50 + Math.random() * 300,
                CONFIG.canvas.height - 150 + Math.random() * 60,
                tx // Pass the confirmed transaction data directly
            );
            
            // Add to game state
            gameState.people.push(monanimal);
            
            // Immediately target this balloon
            monanimal.targetBalloon = balloon;
            monanimal.targetX = balloon.x;
            monanimal.targetY = balloon.y + balloon.size/2 + 45;
            monanimal.state = 'walking';
        }
    }

    console.log(`🎈 New balloon created for block ${blockData.blockHeight} (capacity: ${blockData.txCount} monanimals)`);
}

function updateHUD() {
    // Update basic network stats
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
    try {
        // Update balloons with enhanced error handling
        gameState.balloons.forEach((balloon, index) => {
            try {
                // Skip updating balloons that are far offscreen if configured
                if (CONFIG.performance.cullOffscreen &&
                    (balloon.x < -200 || balloon.x > CONFIG.canvas.width + 200 ||
                     balloon.y < -400 || balloon.y > CONFIG.canvas.height + 200)) {
                    return;
                }
                
                balloon.update();
                
                // Auto-launch balloon when ready
                if (balloon.state === 'loading' &&
                    (balloon.passengers.length >= balloon.blockData.txCount ||
                     Date.now() > balloon.launchTime)) {
                    balloon.launch();
                }
                
                // Mark balloons that are completely off-screen for removal
                if (balloon.y < -500 || balloon.x < -300 || balloon.x > CONFIG.canvas.width + 300) {
                    balloon.state = 'gone';
                    balloon.opacity = 0;
                }
                
                // Check for stuck balloons (error prevention)
                if (balloon.state === 'loading' && Date.now() - balloon.creationTime > 60000) {
                    console.log(`🔧 Detected stuck balloon #${index}, forcing cleanup`);
                    balloon.handleError();
                }
                
            } catch (balloonError) {
                console.error(`Balloon #${index} update error:`, balloonError);
                if (balloon.handleError) {
                    balloon.handleError();
                } else {
                    balloon.state = 'gone';
                    balloon.opacity = 0;
                }
                gameState.errorCount++;
            }
        });

        // Remove balloons that are gone or have zero opacity
        gameState.balloons = gameState.balloons.filter(balloon =>
            balloon.opacity > 0 && balloon.state !== 'gone'
        );

        // Update monanimals with optimizations
        const visibleMonanimals = CONFIG.performance.optimizeRendering
            ? getVisibleMonanimals()
            : gameState.people;
            
        visibleMonanimals.forEach(person => person.update());
    
    // Remove monanimals who are flying away
    gameState.people = gameState.people.filter(person => {
        // Keep flying monanimals whose balloons are not gone
        if (person.state === 'flying' &&
            (!person.targetBalloon || person.targetBalloon.state === 'gone')) {
            return false;
        }
        
        // Remove monanimals with confirmed transactions that couldn't board their balloon
        if (person.txDetails && person.txDetails.blockHeight && person.txDetails.confirmed) {
            // Check if the balloon for this monanimal's block exists
            const hasMatchingBalloon = gameState.balloons.some(balloon =>
                balloon.blockData && balloon.blockData.blockHeight === person.txDetails.blockHeight);
            
            // If the balloon for its block doesn't exist and it's waiting/walking, remove it
            if (!hasMatchingBalloon && (person.state === 'waiting' || person.state === 'walking' || person.state === 'returning')) {
                return false;
            }
        }
        
        return true;
    });

    // Spawn new monanimals continuously - limited by performance settings
    const shouldSpawn = Math.random() < CONFIG.people.spawnRate * (1 + gameState.networkData.tps / 20);
    const waitingMonanimals = gameState.people.filter(p =>
        p.state === 'waiting' || p.state === 'returning').length;
    
    // Limit total monanimals to performance settings
    if (shouldSpawn && waitingMonanimals < 20 && gameState.people.length < CONFIG.performance.maxTotalMonanimals) {
        const monanimal = new MonanimalPerson(
            50 + Math.random() * 300,
            CONFIG.canvas.height - 150 + Math.random() * 60
        );
        gameState.people.push(monanimal);
    }

    // Update clouds with optimizations
    gameState.clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > CONFIG.canvas.width + cloud.size * 2) {
            cloud.x = -cloud.size * 2;
            cloud.y = 30 + Math.random() * 150;
        }
    });

    // Update particles with particle limit
    gameState.particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y -= particle.vy;
        particle.life -= 0.015;
        particle.vy *= 0.99;
    });

        // Limit particles for performance
        gameState.particles = gameState.particles
            .filter(particle => particle.life > 0)
            .slice(0, CONFIG.performance.maxParticles);
            
    } catch (updateError) {
        console.error('Game update error:', updateError);
        gameState.errorCount++;
        
        // Auto-recovery if too many errors
        if (gameState.errorCount >= CONFIG.performance.maxErrors) {
            setTimeout(() => {
                autoRecover();
            }, CONFIG.performance.restartDelay);
        }
    }
}

// Helper function to get only the visible monanimals for optimization
function getVisibleMonanimals() {
    // First, prioritize monanimals that are waiting or walking
    const activeMonanimals = gameState.people.filter(
        p => p.state === 'walking' || p.state === 'boarding'
    );
    
    // Then add visible waiting monanimals up to the limit
    const waitingMonanimals = gameState.people.filter(p => p.state === 'waiting' || p.state === 'returning');
    
    // Sort by importance - those closer to center view are more important
    waitingMonanimals.sort((a, b) => {
        const centerX = CONFIG.canvas.width / 2;
        const centerY = CONFIG.canvas.height / 2;
        const distA = Math.abs(a.x - centerX) + Math.abs(a.y - centerY);
        const distB = Math.abs(b.x - centerX) + Math.abs(b.y - centerY);
        return distA - distB;
    });
    
    // Combine active monanimals with visible waiting ones, up to the limit
    return [...activeMonanimals,
           ...waitingMonanimals.slice(0, CONFIG.performance.maxVisibleMonanimals - activeMonanimals.length)];
}

function draw() {
    // Clear canvas with enhanced gradient sky
    const weather = WEATHER_TYPES[gameState.currentWeather];
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvas.height);
    
    // Dark mode için farklı gökyüzü renkleri
    if (gameState.darkMode) {
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.6, '#16213e');
        gradient.addColorStop(1, '#0f3460');
    } else {
        gradient.addColorStop(0, weather.skyColor[0]);
        gradient.addColorStop(0.6, weather.skyColor[1]);
        gradient.addColorStop(1, weather.skyColor[2]);
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // Güneş çizimi (kar yağdığında kaybolacak, bulutların arkasında kalacak)
    if (gameState.currentWeather !== 'snowy' && !gameState.darkMode) {
        drawSun();
    }

    // Ay çizimi (gece modunda, bulutların arkasında kalacak)
    if (gameState.darkMode) {
        drawMoon();
    }

    // Gökkuşağı çizimi (yağmurlu havada güneş varken)
    if (gameState.currentWeather === 'rainy' && !gameState.darkMode) {
        drawRainbow();
    }

    // Draw clouds with optimization
    const visibleClouds = CONFIG.performance.cullOffscreen
        ? gameState.clouds.filter(cloud =>
            cloud.x + cloud.size * 2 > 0 &&
            cloud.x - cloud.size * 2 < CONFIG.canvas.width)
        : gameState.clouds;
    
    visibleClouds.forEach(cloud => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        
        // Simplify cloud rendering for distant clouds
        const distanceFromCenter = Math.abs(cloud.x - CONFIG.canvas.width/2);
        const simplified = CONFIG.performance.simplifyDistant && distanceFromCenter > CONFIG.canvas.width/3;
        const layerCount = simplified ? Math.min(2, cloud.layers) : cloud.layers;
        
        for (let layer = 0; layer < layerCount; layer++) {
            const layerSize = cloud.size * (0.8 + layer * 0.1);
            const layerOffset = layer * 8;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - layer * 0.2})`;
            ctx.beginPath();
            ctx.arc(cloud.x - layerOffset, cloud.y + layer * 2, layerSize, 0, Math.PI * 2);
            
            // Skip detailed cloud shapes for distant clouds
            if (!simplified) {
                ctx.arc(cloud.x + layerSize * 0.6 - layerOffset, cloud.y + layer * 2, layerSize * 0.8, 0, Math.PI * 2);
                ctx.arc(cloud.x - layerSize * 0.6 - layerOffset, cloud.y + layer * 2, layerSize * 0.7, 0, Math.PI * 2);
            }
            ctx.fill();
        }
        
        ctx.restore();
    });

    // Draw mountains with culling
    if (gameState.mountains) {
        gameState.mountains.forEach(mountain => {
            // Skip mountains outside the viewport for performance
            if (!CONFIG.performance.cullOffscreen ||
                (mountain.x + mountain.width/2 > 0 &&
                 mountain.x - mountain.width/2 < CONFIG.canvas.width)) {
                mountain.draw();
            }
        });
    }

    // Draw ground
    const groundGradient = ctx.createLinearGradient(0, CONFIG.canvas.height - 100, 0, CONFIG.canvas.height);
    groundGradient.addColorStop(0, '#8B7355');
    groundGradient.addColorStop(0.3, '#A0522D');
    groundGradient.addColorStop(0.7, '#CD853F');
    groundGradient.addColorStop(1, '#D2B48C');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, CONFIG.canvas.height - 100, CONFIG.canvas.width, 100);

    // Optimize grass drawing based on performance settings
    if (CONFIG.performance.simplifyDistant) {
        drawOptimizedGrass();
    } else {
        drawRealisticGrass();
    }

    // Draw monanimals with optimization - only draw visible ones
    const visibleMonanimals = CONFIG.performance.optimizeRendering
        ? getVisibleMonanimals()
        : gameState.people;
    
    // Monanimals görüntülenme sorunu düzeltmesi
    visibleMonanimals.forEach((person, index) => {
        try {
            // Monanimal pozisyonunu kontrol et ve sınırlar içinde tut
            if (person.x < -50) person.x = -50;
            if (person.x > CONFIG.canvas.width + 50) person.x = CONFIG.canvas.width + 50;
            if (person.y < 0) person.y = CONFIG.canvas.height - 150;
            if (person.y > CONFIG.canvas.height) person.y = CONFIG.canvas.height - 150;
            
            person.draw();
        } catch (error) {
            console.warn(`Monanimal ${index} çizim hatası:`, error);
            // Hatalı monanimal'ı güvenli pozisyona taşı
            person.x = 100 + Math.random() * 200;
            person.y = CONFIG.canvas.height - 150 + Math.random() * 50;
        }
    });

    // Draw balloons with optimization
    gameState.balloons.forEach((balloon, index) => {
        try {
            // Balon pozisyonunu kontrol et ve oyun alanı içinde tut
            if (balloon.y > CONFIG.canvas.height - 100) {
                balloon.y = CONFIG.canvas.height - 150;
            }
            
            // Skip drawing balloons that are far offscreen
            if (CONFIG.performance.cullOffscreen &&
                (balloon.x < -200 || balloon.x > CONFIG.canvas.width + 200 ||
                 balloon.y < -400 || balloon.y > CONFIG.canvas.height + 200)) {
                return;
            }
            balloon.draw();
        } catch (error) {
            console.warn(`Balon ${index} çizim hatası:`, error);
            // Hatalı balonu güvenli pozisyona taşı
            balloon.x = CONFIG.canvas.width / 2;
            balloon.y = CONFIG.canvas.height - 200;
        }
    });

    // Draw particles with optimization
    gameState.particles.slice(0, CONFIG.performance.maxParticles).forEach(particle => {
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

// Optimized grass drawing for better performance
function drawOptimizedGrass() {
    const groundY = CONFIG.canvas.height - 100;
    
    // Draw fewer grass blades, spaced out more
    for (let i = 0; i < CONFIG.canvas.width; i += 5) {
        const grassHeight = 8 + Math.random() * 12;
        const grassX = i + Math.random() * 2;
        const grassWidth = 2 + Math.random() * 2;
        
        // Simplified gradient
        ctx.fillStyle = '#32CD32';
        
        // Simpler grass blade drawing
        ctx.beginPath();
        ctx.moveTo(grassX, groundY);
        ctx.lineTo(grassX, groundY - grassHeight);
        ctx.lineWidth = grassWidth;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#32CD32';
        ctx.stroke();
    }
    
    // Add just a few flower details
    for (let i = 0; i < 10; i++) {
        const flowerX = Math.random() * CONFIG.canvas.width;
        const flowerY = groundY - 5 - Math.random() * 10;
        
        ctx.fillStyle = ['#FFB6C1', '#87CEEB', '#DDA0DD', '#F0E68C'][Math.floor(Math.random() * 4)];
        ctx.beginPath();
        ctx.arc(flowerX, flowerY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Güneş çizim fonksiyonu (bulutların arkasında kalacak)
function drawSun() {
    const sunX = CONFIG.canvas.width - 80;
    const sunY = 60;
    const sunRadius = 30;
    
    // Güneş ışınları
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const startX = sunX + Math.cos(angle) * (sunRadius + 10);
        const startY = sunY + Math.sin(angle) * (sunRadius + 10);
        const endX = sunX + Math.cos(angle) * (sunRadius + 25);
        const endY = sunY + Math.sin(angle) * (sunRadius + 25);
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    // Güneş gövdesi
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGradient.addColorStop(0, '#FFD700');
    sunGradient.addColorStop(0.7, '#FFA500');
    sunGradient.addColorStop(1, '#FF8C00');
    
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Güneş parlaması
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(sunX - 8, sunY - 8, sunRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

// Ay çizim fonksiyonu (bulutların arkasında kalacak)
function drawMoon() {
    const moonX = CONFIG.canvas.width - 80;
    const moonY = 60;
    const moonRadius = 25;
    
    // Ay gövdesi
    const moonGradient = ctx.createRadialGradient(moonX - 5, moonY - 5, 0, moonX, moonY, moonRadius);
    moonGradient.addColorStop(0, '#F5F5DC');
    moonGradient.addColorStop(0.7, '#E6E6FA');
    moonGradient.addColorStop(1, '#D3D3D3');
    
    ctx.fillStyle = moonGradient;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Ay kraterleri
    ctx.fillStyle = 'rgba(169, 169, 169, 0.3)';
    ctx.beginPath();
    ctx.arc(moonX - 8, moonY - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(moonX + 6, moonY + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(moonX + 2, moonY - 12, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Ay parlaması
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(moonX - 6, moonY - 6, moonRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

// Gökkuşağı çizim fonksiyonu (yağmurlu havada güneş varken)
function drawRainbow() {
    const centerX = CONFIG.canvas.width * 0.7;
    const centerY = CONFIG.canvas.height - 50;
    const rainbowColors = [
        'rgba(255, 0, 0, 0.6)',     // Kırmızı
        'rgba(255, 165, 0, 0.6)',   // Turuncu
        'rgba(255, 255, 0, 0.6)',   // Sarı
        'rgba(0, 255, 0, 0.6)',     // Yeşil
        'rgba(0, 0, 255, 0.6)',     // Mavi
        'rgba(75, 0, 130, 0.6)',    // Çivit mavisi
        'rgba(238, 130, 238, 0.6)'  // Mor
    ];
    
    ctx.lineWidth = 8;
    
    for (let i = 0; i < rainbowColors.length; i++) {
        const radius = 120 + (i * 12);
        ctx.strokeStyle = rainbowColors[i];
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
        ctx.stroke();
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
    
    // Debug: Monanimal tıklama alanlarını göster
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    gameState.people.forEach(monanimal => {
        if (monanimal.state !== 'flying') {
            ctx.beginPath();
            ctx.arc(monanimal.x, monanimal.y, monanimal.size * 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

// Event Handlers - Direct clicking to shoot
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let balloonClicked = false;
    let monanimalsClicked = [];
    
    // Önce tüm tıklanabilir monanimal'ları bul
    for (const monanimal of gameState.people) {
        if (monanimal.state !== 'flying' && monanimal.isClicked(mouseX, mouseY)) {
            monanimalsClicked.push({
                monanimal: monanimal,
                distance: Math.sqrt((mouseX - monanimal.x) ** 2 + (mouseY - monanimal.y) ** 2)
            });
        }
    }
    
    // Check if balloon clicked - only show details, no shooting/explosion
    for (const balloon of gameState.balloons) {
        if (balloon.isClicked && balloon.isClicked(mouseX, mouseY)) {
            showBalloonDetail(balloon);
            balloonClicked = true;
            break;
        }
    }
    
    // If no balloon clicked, check if monanimal clicked
    if (!balloonClicked && monanimalsClicked.length > 0) {
        // En yakın monanimal'ı seç
        monanimalsClicked.sort((a, b) => a.distance - b.distance);
        const closestMonanimal = monanimalsClicked[0].monanimal;
        showMonanimalTxInfo(closestMonanimal);
        console.log(`🐠 Monanimal tıklandı: ${closestMonanimal.txType} (${closestMonanimal.state})`);
    } else if (!balloonClicked) {
        // Debug: Tıklama pozisyonunu ve yakındaki monanimal'ları logla
        console.log(`🖱️ Tıklama pozisyonu: (${mouseX}, ${mouseY})`);
        const nearbyMonanimals = gameState.people.filter(m => {
            const dist = Math.sqrt((mouseX - m.x) ** 2 + (mouseY - m.y) ** 2);
            return dist < 100 && m.state !== 'flying';
        });
        console.log(`🐠 Yakındaki monanimal'lar: ${nearbyMonanimals.length}`);
        nearbyMonanimals.forEach(m => {
            const dist = Math.sqrt((mouseX - m.x) ** 2 + (mouseY - m.y) ** 2);
            console.log(`  - ${m.txType} at (${m.x.toFixed(1)}, ${m.y.toFixed(1)}) distance: ${dist.toFixed(1)}`);
        });
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let isHovering = false;
    
    // Check if hovering over a balloon
    for (const balloon of gameState.balloons) {
        if (balloon.isClicked && balloon.isClicked(mouseX, mouseY)) {
            isHovering = true;
            break;
        }
    }
    
    // If not hovering over a balloon, check if hovering over a monanimal
    if (!isHovering) {
        for (const monanimal of gameState.people) {
            if (monanimal.state !== 'flying' && monanimal.isClicked(mouseX, mouseY)) {
                isHovering = true;
                break;
            }
        }
    }
    
    canvas.style.cursor = isHovering ? 'pointer' : 'default';
});

function showBalloonDetail(balloon) {
    // Close transaction info panel if open
    closeTxInfoPanel();
    
    // Show balloon details
    const detail = document.getElementById('balloonDetail');
    const info = document.getElementById('balloonInfo');
    
    const confirmationTime = balloon.confirmationTime ?
        new Date(balloon.confirmationTime).toLocaleString('en-US') : 'Pending';
    
    const statusEmoji = {
        'loading': '⏳',
        'launching': '🚀',
        'flying': '🎈',
        'gone': '✨'
    };
    
    const statusText = {
        'loading': 'Loading',
        'launching': 'Launching',
        'flying': 'Flying',
        'gone': 'Gone'
    };
    
    const blockTime = balloon.blockData && balloon.blockData.timestamp ?
        new Date(balloon.blockData.timestamp * 1000).toLocaleString('en-US') : 'Unknown';
    
    info.innerHTML = `
        <strong>Block #${balloon.blockData ? balloon.blockData.blockHeight.toLocaleString() : 'Loading'}</strong><br><br>
        <strong>Status:</strong> ${statusEmoji[balloon.state] || '⭕'} ${statusText[balloon.state] || balloon.state}<br>
        <strong>Monanimal Passengers:</strong> ${balloon.passengers.length}/${balloon.blockData ? balloon.blockData.txCount : 'Loading'}<br>
        <strong>Required Transactions:</strong> ${balloon.blockData ? balloon.blockData.txCount : 'Loading'}<br>
        <strong>Block Time:</strong> ${blockTime}<br>
        <strong>Confirmation Time:</strong> ${confirmationTime}<br>
        <strong>Current Gas Price:</strong> ${gameState.networkData.gasPrice.toFixed(4)} GWei<br>
        ${balloon.blockData && balloon.blockData.blockHash ? `<strong>Block Hash:</strong> ${balloon.blockData.blockHash.slice(0, 16)}...<br>` : ''}
        <strong>Network:</strong> Monad Testnet 🟣<br>
        <br>
        <button class="explorer-link" onclick="showBlockTxPanel(${balloon.blockData ? balloon.blockData.blockHeight : 0})">
            📋 View Block Transactions
        </button>
        <br>
        <a href="${EXPLORER_BLOCK_URL}${balloon.blockData ? balloon.blockData.blockHeight : ''}" target="_blank" class="explorer-link" style="margin-top: 5px;">
            🔍 View Block in Explorer
        </a>
        <br><br><em>🐠 Each monanimal represents a transaction awaiting block confirmation!</em>
    `;
    
    // Position panel on the right side of the screen, outside game area
    detail.style.left = (CONFIG.canvas.width + 20) + 'px';
    detail.style.top = '20px';
    detail.style.display = 'block';
    
    // Close block tx panel if open
    closeBlockTxPanel();
}

// Show Transaction Info Panel for Monanimal
function showMonanimalTxInfo(monanimal) {
    // Close balloon detail if open
    closeBalloonDetail();
    // Close block tx panel if open
    closeBlockTxPanel();
    
    const panel = document.getElementById('txInfoPanel');
    const content = document.getElementById('txInfoContent');
    const txInfo = TX_TYPES[monanimal.txType];
    
    document.getElementById('txInfoTitle').innerHTML = `${txInfo.emoji} ${txInfo.name} Transaction`;
    
    // Format from/to addresses
    const fromAddr = monanimal.txDetails.from.slice(0, 6) + '...' + monanimal.txDetails.from.slice(-4);
    const toAddr = monanimal.txDetails.to.slice(0, 6) + '...' + monanimal.txDetails.to.slice(-4);
    
    // Determine transaction status
    const isConfirmed = monanimal.txDetails.confirmed && monanimal.txDetails.blockHeight;
    const statusText = isConfirmed ? '✅ Confirmed' : '⏳ Pending';
    const statusColor = isConfirmed ? '#10B981' : '#F59E0B';
    
    // Time format
    const txTime = new Date(monanimal.txDetails.timestamp).toLocaleString('en-US');
    
    content.innerHTML = `
        <div class="tx-item">
            <span class="tx-type tx-type-${monanimal.txType}">${txInfo.name}</span>
            <span style="float: right; color: ${statusColor}; font-weight: bold;">${statusText}</span>
            <br><br>
            <strong>Hash:</strong> ${monanimal.txHash.slice(0, 10)}...${monanimal.txHash.slice(-8)}<br>
            <strong>From:</strong> ${fromAddr}<br>
            <strong>To:</strong> ${toAddr}<br>
            <strong>Value:</strong> ${monanimal.txDetails.value}<br>
            <strong>Gas Limit:</strong> ${monanimal.txDetails.gas.toLocaleString()}<br>
            ${monanimal.txDetails.gasUsed ? `<strong>Gas Used:</strong> ${monanimal.txDetails.gasUsed.toLocaleString()}<br>` : ''}
            ${isConfirmed ? `<strong>Block:</strong> #${monanimal.txDetails.blockHeight}<br>` : ''}
            <strong>Time:</strong> ${txTime}<br>
            ${monanimal.txDetails.methodSig ? `<strong>Method:</strong> ${monanimal.txDetails.methodSig}<br>` : ''}
            <br>
            <a href="${EXPLORER_BASE_URL}${monanimal.txHash}" target="_blank" class="explorer-link">
                🔍 View in Explorer
            </a>
            ${isConfirmed ? `<br><a href="${EXPLORER_BLOCK_URL}${monanimal.txDetails.blockHeight}" target="_blank" class="explorer-link" style="margin-top: 5px;">
                📦 View Block
            </a>` : ''}
        </div>
    `;
    
    panel.style.display = 'block';
}

// Close Transaction Info Panel
function closeTxInfoPanel() {
    document.getElementById('txInfoPanel').style.display = 'none';
}

// Show Block Transactions Panel
function showBlockTxPanel(blockHeight) {
    // Find the balloon with this block height
    const balloon = gameState.balloons.find(b =>
        b.blockData && b.blockData.blockHeight === blockHeight
    );
    
    if (!balloon) {
        console.warn(`Balloon not found for block #${blockHeight}`);
        return;
    }
    
    // Close other panels
    closeBalloonDetail();
    closeTxInfoPanel();
    
    const panel = document.getElementById('blockTxPanel');
    const content = document.getElementById('blockTxContent');
    
    document.getElementById('blockTxTitle').innerHTML = `Block #${blockHeight.toLocaleString()} Transactions`;
    
    let txListHTML = '';
    
    // Get all transactions in this balloon
    const transactions = balloon.getTransactions();
    
    // Sort by transaction type
    transactions.sort((a, b) => a.txType.localeCompare(b.txType));
    
    // Group transaction types
    const txGroups = {};
    transactions.forEach(tx => {
        if (!txGroups[tx.txType]) {
            txGroups[tx.txType] = [];
        }
        txGroups[tx.txType].push(tx);
    });
    
    // Create HTML for each group
    Object.keys(txGroups).forEach(txType => {
        const txInfo = TX_TYPES[txType];
        const groupTxs = txGroups[txType];
        
        txListHTML += `
            <div style="margin-bottom: 15px;">
                <h4 style="color: ${txInfo.color}; margin: 10px 0 5px 0;">
                    ${txInfo.emoji} ${txInfo.name} (${groupTxs.length})
                </h4>
        `;
        
        groupTxs.forEach(tx => {
            const shortHash = tx.txHash.slice(0, 8) + '...' + tx.txHash.slice(-6);
            const fromAddr = tx.txDetails.from.slice(0, 6) + '...' + tx.txDetails.from.slice(-4);
            const toAddr = tx.txDetails.to.slice(0, 6) + '...' + tx.txDetails.to.slice(-4);
            
            txListHTML += `
                <div class="tx-item" style="margin-left: 10px; font-size: 12px;">
                    <span class="tx-type tx-type-${tx.txType}">${txInfo.name}</span>
                    <strong>${shortHash}</strong>
                    <br>
                    <small>${fromAddr} → ${toAddr}</small>
                    <small style="float: right; color: #666;">${tx.txDetails.value}</small>
                    <div style="margin-top: 5px;">
                        <a href="${EXPLORER_BASE_URL}${tx.txHash}" target="_blank" class="explorer-link" style="font-size: 11px; padding: 3px 8px;">
                            🔍 View
                        </a>
                    </div>
                </div>
            `;
        });
        
        txListHTML += '</div>';
    });
    
    if (transactions.length === 0) {
        txListHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <p>No transactions found in this block yet.</p>
                <p>Monanimals are waiting to board balloons... 🐠</p>
            </div>
        `;
    } else {
        // Add summary information
        const totalValue = transactions.reduce((sum, tx) => {
            const value = parseFloat(tx.txDetails.value.split(' ')[0]);
            return sum + (isNaN(value) ? 0 : value);
        }, 0);
        
        txListHTML = `
            <div style="background: #f0f0f0; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                <strong>Block Summary:</strong><br>
                <small>Total Transactions: ${transactions.length}</small><br>
                <small>Total Value: ${totalValue.toFixed(6)} MON</small><br>
                <small>Block Time: ${new Date(balloon.blockData.timestamp * 1000).toLocaleString('en-US')}</small>
            </div>
        ` + txListHTML;
    }
    
    content.innerHTML = txListHTML;
    panel.style.display = 'block';
}

// Close Block Transactions Panel
function closeBlockTxPanel() {
    document.getElementById('blockTxPanel').style.display = 'none';
}

function closeBalloonDetail() {
    document.getElementById('balloonDetail').style.display = 'none';
}

// Control Functions

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
    for (let i = 0; i < 20; i++) {
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
    
    // Müzik kontrolü
    if (gameState.soundEnabled) {
        // Ses açıldığında müziği başlat - kullanıcı etkileşimi var
        console.log('🎵 Kullanıcı sesi açtı, müziği başlatıyor...');
        playMusic();
    } else {
        // Ses kapatıldığında müziği durdur
        console.log('🎵 Kullanıcı sesi kapattı, müziği durduruyor...');
        pauseMusic();
    }
}

function toggleBalloonType() {
    CONFIG.balloons.type = CONFIG.balloons.type === 'balloon' ? 'zeppelin' : 'balloon';
    const button = document.getElementById('balloonTypeToggle');
    button.textContent = CONFIG.balloons.type === 'balloon' ? '🎈 Balloon' : '🚁 Zeppelin';
    
    console.log(`🎈 Balloon type changed to: ${CONFIG.balloons.type}`);
    
    // Show achievement for first type change
    if (!gameState.achievements.includes('balloon_type_explorer')) {
        showAchievement('🔄 Type Explorer!', `Switched to ${CONFIG.balloons.type} mode!`);
        gameState.achievements.push('balloon_type_explorer');
    }
}

// Keyboard Controls
document.addEventListener('keydown', (event) => {
    switch(event.code) {
        case 'Space':
            event.preventDefault();
            resetGame();
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
    
    // Kullanıcı etkileşimi ile müziği başlat - sadece ses açıksa
    const startMusic = () => {
        if (gameState.soundEnabled && !musicSystem.isPlaying && musicSystem.audio) {
            console.log('🎵 İlk kullanıcı etkileşimi - müziği başlatıyor...');
            playMusic();
        }
        // Event listener'ı kaldır
        document.removeEventListener('click', startMusic);
        document.removeEventListener('keydown', startMusic);
        document.removeEventListener('touchstart', startMusic);
    };
    
    // İlk kullanıcı etkileşiminde müziği başlat
    document.addEventListener('click', startMusic);
    document.addEventListener('keydown', startMusic);
    document.addEventListener('touchstart', startMusic);
});

// Auto-reset when page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page is visible again, reset the game to avoid issues
        resetGame();
        console.log('🔄 Game reset due to visibility change');
    }
});

// Enhanced Error handling with auto-restart
window.addEventListener('error', (event) => {
    console.error('Game error detected:', event.error);
    gameState.errorCount++;
    
    // Prevent infinite error loops
    if (gameState.errorCount > CONFIG.performance.maxErrors) {
        console.log('🔄 Maximum errors exceeded, forcing page reload...');
        window.location.reload();
        return;
    }
    
    console.log(`🔄 Auto-restarting game due to error... (${gameState.errorCount}/${CONFIG.performance.maxErrors})`);
    
    // Auto-restart after error with delay
    setTimeout(() => {
        try {
            autoRecover();
        } catch (e) {
            console.error('Failed to auto-restart:', e);
            // Force page reload as last resort
            window.location.reload();
        }
    }, CONFIG.performance.restartDelay);
});

// Additional error catching for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    gameState.errorCount++;
    
    // Prevent infinite error loops
    if (gameState.errorCount > CONFIG.performance.maxErrors) {
        console.log('🔄 Maximum errors exceeded, forcing page reload...');
        window.location.reload();
        return;
    }
    
    console.log(`🔄 Auto-restarting game due to promise rejection... (${gameState.errorCount}/${CONFIG.performance.maxErrors})`);
    
    setTimeout(() => {
        try {
            autoRecover();
        } catch (e) {
            console.error('Failed to auto-restart:', e);
            window.location.reload();
        }
    }, CONFIG.performance.restartDelay);
});

// Periodic health check to detect stuck states
setInterval(() => {
    try {
        // Check for stuck balloons
        const stuckBalloons = gameState.balloons.filter(balloon =>
            balloon.state === 'loading' &&
            Date.now() - balloon.creationTime > 120000 // 2 minutes
        );
        
        if (stuckBalloons.length > 0) {
            console.log(`🔧 Health check: Found ${stuckBalloons.length} stuck balloons, cleaning up...`);
            stuckBalloons.forEach(balloon => {
                if (balloon.handleError) {
                    balloon.handleError();
                }
            });
        }
        
        // Check for excessive monanimals
        if (gameState.people.length > CONFIG.performance.maxTotalMonanimals * 1.5) {
            console.log('🔧 Health check: Too many monanimals, performing cleanup...');
            performCleanup();
        }
        
        // Reset error count gradually if system is stable
        if (gameState.errorCount > 0 && Date.now() - gameState.lastErrorTime > 60000) {
            gameState.errorCount = Math.max(0, gameState.errorCount - 1);
            console.log(`🔧 Health check: Error count reduced to ${gameState.errorCount}`);
        }
        
    } catch (healthError) {
        console.error('Health check error:', healthError);
    }
}, 30000); // Every 30 seconds

console.log('✅ Enhanced Cappadocia Monad Game Script Loaded Successfully!');
