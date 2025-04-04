class API {
    constructor(mockEnabled = true) {
        this.baseUrl = 'https://asia-east1-crypto-calculus.cloudfunctions.net/visualization_api';
        this.orderBookCollectUrl = 'https://asia-east1-crypto-calculus.cloudfunctions.net/collect_orderbook';
        this.mockEnabled = mockEnabled;
    }

    // 獲取價格數據
    async getPriceData(symbol = 'BTCUSDT', timeframe = '1m', limit = 100) {
        try {
            const url = `${this.baseUrl}/price-volume?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Error fetching price data:", error);
            
            if (this.mockEnabled) {
                console.log("Using mock price data instead");
                return this.getMockPriceData(symbol, timeframe, limit);
            }
            throw error;
        }
    }

    // 獲取訂單簿數據
    async getOrderbookData(symbol = 'BTCUSDT') {
        try {
            const url = `${this.baseUrl}/orderbook?symbol=${symbol}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Error fetching orderbook data:", error);
            
            if (this.mockEnabled) {
                console.log("Using mock orderbook data instead");
                return this.getMockOrderbookData(symbol);
            }
            throw error;
        }
    }

    // 獲取訂單簿梯度數據
    async getOrderbookGradientData(symbol) {
        try {
            const url = `${this.baseUrl}/orderbook-gradient?symbol=${symbol}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Error fetching orderbook gradient data:", error);
            
            if (this.mockEnabled) {
                console.log("Using mock orderbook gradient data instead");
                return this.getMockGradientData(symbol);
            }
            throw error;
        }
    }

    // 獲取衍生指標數據
    async getDerivativesData(symbol = 'BTCUSDT', timeframe = '1h', limit = 100) {
        try {
            const url = `${this.baseUrl}/derivatives?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Error fetching derivatives data:", error);
            
            if (this.mockEnabled) {
                console.log("Using mock derivatives data instead");
                return this.getMockDerivativesData(symbol, timeframe, limit);
            }
            throw error;
        }
    }
    
    // 生成模擬價格數據
    getMockPriceData(symbol = 'BTCUSDT', timeframe = '1h', limit = 100) {
        const now = new Date();
        const data = [];
        const basePrice = symbol.includes('BTC') ? 80000 : symbol.includes('ETH') ? 4000 : 300;
        const volatility = 0.005; // 波動率
        
        // 根據時間框架設置時間增量
        let timeIncrement;
        switch (timeframe) {
            case '1m': timeIncrement = 60 * 1000; break;
            case '5m': timeIncrement = 5 * 60 * 1000; break;
            case '15m': timeIncrement = 15 * 60 * 1000; break;
            case '1h': timeIncrement = 60 * 60 * 1000; break;
            case '4h': timeIncrement = 4 * 60 * 60 * 1000; break;
            case '1d': timeIncrement = 24 * 60 * 60 * 1000; break;
            default: timeIncrement = 60 * 60 * 1000; // 預設為1小時
        }
        
        let price = basePrice;
        for (let i = 0; i < limit; i++) {
            const time = new Date(now.getTime() - (limit - i) * timeIncrement);
            
            // 生成隨機波動
            const change = (Math.random() - 0.5) * volatility * price;
            const open = price;
            price = open + change;
            const high = Math.max(open, price) + Math.random() * Math.abs(change) * 0.5;
            const low = Math.min(open, price) - Math.random() * Math.abs(change) * 0.5;
            const close = price;
            const volume = Math.random() * 100 + 50;
            
            data.push({
                timestamp: time.toISOString(),
                open: open,
                high: high,
                low: low,
                close: close,
                volume: volume
            });
        }
        
        return data;
    }
    
    // 生成模擬訂單簿數據
    getMockOrderbookData(symbol = 'BTCUSDT') {
        const basePrice = symbol.includes('BTC') ? 80000 : symbol.includes('ETH') ? 4000 : 300;
        const bids = [];
        const asks = [];
        
        // 生成買單
        let bidPrice = basePrice * 0.999;
        for (let i = 0; i < 20; i++) {
            const quantity = Math.random() * 2 + 0.1;
            bids.push([bidPrice.toFixed(2), quantity.toFixed(4)]);
            bidPrice -= bidPrice * 0.001;
        }
        
        // 生成賣單
        let askPrice = basePrice * 1.001;
        for (let i = 0; i < 20; i++) {
            const quantity = Math.random() * 2 + 0.1;
            asks.push([askPrice.toFixed(2), quantity.toFixed(4)]);
            askPrice += askPrice * 0.001;
        }
        
        return {
            bids: bids,
            asks: asks
        };
    }
    
    // 生成模擬梯度數據
    getMockGradientData(symbol = 'BTCUSDT') {
        const basePrice = symbol.includes('BTC') ? 80000 : symbol.includes('ETH') ? 4000 : 300;
        const gradients = [];
        
        // 生成價格梯度
        for (let i = 0; i < 50; i++) {
            const price = basePrice * (0.9 + i * 0.004);
            let gradient;
            
            // 創建一些有用的模式
            if (price < basePrice * 0.98) {
                // 買方支撐
                gradient = Math.random() * 0.2 + 0.1;
            } else if (price > basePrice * 1.02) {
                // 賣方阻力
                gradient = -(Math.random() * 0.2 + 0.1);
            } else {
                // 當前價格附近波動
                gradient = Math.random() * 0.2 - 0.1;
            }
            
            gradients.push({
                price: price,
                gradient: gradient
            });
        }
        
        return {
            gradients: gradients,
            timestamp: new Date().toISOString()
        };
    }
    
    // 生成模擬衍生指標數據
    getMockDerivativesData(symbol = 'BTCUSDT', timeframe = '1h', limit = 100) {
        // 首先獲取模擬價格數據作為基礎
        const priceData = this.getMockPriceData(symbol, timeframe, limit);
        const result = [];
        
        // 計算一階導數(價格變化率)和二階導數(價格加速度)
        for (let i = 0; i < priceData.length; i++) {
            const item = { ...priceData[i] };
            
            // 計算一階導數(速度)
            if (i > 0) {
                const timeDiff = (new Date(item.timestamp) - new Date(priceData[i-1].timestamp)) / 3600000; // 時間差(小時)
                const priceDiff = item.close - priceData[i-1].close;
                item.price_velocity = priceDiff / timeDiff;
            } else {
                item.price_velocity = 0;
            }
            
            // 計算二階導數(加速度)
            if (i > 1) {
                const velocity1 = item.price_velocity;
                const velocity2 = result[i-1].price_velocity;
                const timeDiff = (new Date(item.timestamp) - new Date(priceData[i-1].timestamp)) / 3600000; // 時間差(小時)
                item.price_acceleration = (velocity1 - velocity2) / timeDiff;
            } else {
                item.price_acceleration = 0;
            }
            
            // 計算曲率
            if (i > 1) {
                const v = item.price_velocity;
                const a = item.price_acceleration;
                item.curvature = Math.abs(a) / Math.pow(1 + Math.pow(v, 2), 1.5);
            } else {
                item.curvature = 0;
            }
            
            // 添加市場熵(隨機值)
            item.market_entropy = Math.random() * 0.5 + 0.25;
            
            // 添加價格彈性
            item.price_elasticity = Math.random() * 0.6 - 0.3;
            
            // 隨機添加潛在頂部和底部
            if (Math.random() < 0.05) {
                item.potential_top = item.close * (1 + Math.random() * 0.05);
            } else {
                item.potential_top = null;
            }
            
            if (Math.random() < 0.05) {
                item.potential_bottom = item.close * (1 - Math.random() * 0.05);
            } else {
                item.potential_bottom = null;
            }
            
            // 添加布林帶寬度指標
            if (i >= 19) {
                // 計算過去20個周期的標準差
                let sum = 0;
                let sumOfSquares = 0;
                for (let j = i; j > i - 20; j--) {
                    sum += priceData[j].close;
                    sumOfSquares += Math.pow(priceData[j].close, 2);
                }
                const mean = sum / 20;
                const variance = sumOfSquares / 20 - Math.pow(mean, 2);
                const standardDeviation = Math.sqrt(variance);
                
                // 布林帶寬度 = (上軌 - 下軌) / 中軌 * 100
                item.bollinger_bandwidth = (2 * standardDeviation) / mean * 100;
            } else {
                item.bollinger_bandwidth = null;
            }
            
            // 添加波動率指標 (使用過去10個周期的價格變化率的標準差)
            if (i >= 9) {
                let priceChanges = [];
                for (let j = i; j > i - 10; j--) {
                    if (j > 0) {
                        const change = Math.abs((priceData[j].close - priceData[j-1].close) / priceData[j-1].close);
                        priceChanges.push(change);
                    }
                }
                
                // 計算波動率 (價格變化率的標準差)
                const changeSum = priceChanges.reduce((sum, value) => sum + value, 0);
                const changeMean = changeSum / priceChanges.length;
                const changeVariance = priceChanges.reduce((sum, value) => sum + Math.pow(value - changeMean, 2), 0) / priceChanges.length;
                item.volatility = Math.sqrt(changeVariance) * 100; // 轉換成百分比
            } else {
                item.volatility = null;
            }
            
            result.push(item);
        }
        
        return result;
    }

    // 獲取價格彈性數據
    async getPriceElasticity(symbol = 'BTCUSDT', timeframe = '1h', limit = 100) {
        if (this.mockEnabled) {
            const data = this.getMockDerivativesData(symbol, timeframe, limit);
            return data.map(item => ({
                timestamp: item.timestamp,
                value: item.price_elasticity || 0
            }));
        }
        
        try {
            const url = `${this.baseUrl}/api/price_elasticity?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '獲取價格彈性數據失敗');
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('獲取價格彈性數據錯誤:', error);
            throw error;
        }
    }
    
    // 獲取布林帶寬度數據
    async getBollingerBandwidth(symbol = 'BTCUSDT', timeframe = '1h', limit = 100) {
        if (this.mockEnabled) {
            const data = this.getMockDerivativesData(symbol, timeframe, limit);
            return data.map(item => ({
                timestamp: item.timestamp,
                value: item.bollinger_bandwidth || 0
            }));
        }
        
        try {
            const url = `${this.baseUrl}/api/bollinger_bandwidth?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '獲取布林帶寬度數據失敗');
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('獲取布林帶寬度數據錯誤:', error);
            throw error;
        }
    }

    // 獲取波動率數據
    async getVolatility(symbol = 'BTCUSDT', timeframe = '1h', limit = 100) {
        if (this.mockEnabled) {
            const data = this.getMockDerivativesData(symbol, timeframe, limit);
            return data.map(item => ({
                timestamp: item.timestamp,
                value: item.volatility || 0
            }));
        }
        
        try {
            const url = `${this.baseUrl}/api/volatility?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '獲取波動率數據失敗');
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('獲取波動率數據錯誤:', error);
            throw error;
        }
    }

    // 獲取價格曲率數據
    async getPriceCurvature(symbol = 'BTCUSDT', timeframe = '1h', limit = 100) {
        if (this.mockEnabled) {
            const data = this.getMockDerivativesData(symbol, timeframe, limit);
            return data.map(item => ({
                timestamp: item.timestamp,
                value: item.curvature || 0
            }));
        }
        
        try {
            const url = `${this.baseUrl}/api/price_curvature?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '獲取價格曲率數據失敗');
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('獲取價格曲率數據錯誤:', error);
            throw error;
        }
    }
    
    // 獲取所有數據
    async getAllData(symbol = 'BTCUSDT', timeframe = '1h', limit = 100) {
        try {
            // 並行獲取所有數據
            const [priceData, derivativesData] = await Promise.all([
                this.getPriceData(symbol, timeframe, limit),
                this.getDerivativesData(symbol, timeframe, limit)
            ]);
            
            return {
                price_data: priceData,
                derivatives: derivativesData
            };
        } catch (error) {
            console.error('獲取所有數據錯誤:', error);
            throw error;
        }
    }

    async collectOrderbookData(symbols = ['BTCUSDT']) {
        try {
            const response = await fetch(this.orderBookCollectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    symbols: symbols
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("Error collecting orderbook data:", error);
            throw error;
        }
    }
    
    async getPersistentLevels(symbol, timeRange = 24) {
        if (this.mockEnabled) {
            return this.getMockPersistentLevels(symbol);
        }
        
        try {
            const response = await fetch(this.orderBookCollectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    symbols: [symbol],
                    historical: true,
                    time_range: timeRange
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("Error fetching persistent levels:", error);
            throw error;
        }
    }
    
    // 生成模擬持續性支撐阻力位數據
    getMockPersistentLevels(symbol) {
        const basePrice = symbol.includes('BTC') ? 80000 : symbol.includes('ETH') ? 4000 : 300;
        const supportLevels = [];
        const resistanceLevels = [];
        
        // 生成支撐位
        for (let i = 0; i < 5; i++) {
            const price = basePrice * (0.85 + i * 0.03);
            supportLevels.push({
                price: price,
                strength: Math.random() * 0.8 + 0.2, // 0.2 到 1.0 的強度
                occurrences: Math.floor(Math.random() * 20) + 5, // 5 到 25 次出現
                first_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // 過去7天內
                last_seen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(), // 過去24小時內
                persistence_score: Math.random() * 0.8 + 0.2 // 0.2 到 1.0 的持續性得分
            });
        }
        
        // 生成阻力位
        for (let i = 0; i < 5; i++) {
            const price = basePrice * (1.0 + i * 0.03);
            resistanceLevels.push({
                price: price,
                strength: Math.random() * 0.8 + 0.2,
                occurrences: Math.floor(Math.random() * 20) + 5,
                first_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                last_seen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
                persistence_score: Math.random() * 0.8 + 0.2
            });
        }
        
        return {
            supports: supportLevels,
            resistances: resistanceLevels,
            timestamp: new Date().toISOString(),
            symbol: symbol
        };
    }
}

// 創建全局 API 實例
const api = new API(); 