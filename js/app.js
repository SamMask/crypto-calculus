// 當文檔加載完成後執行
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// 初始化所有圖表
function initCharts() {
    // 初始化價格圖表
    window.chartManager.initPriceChart();
    
    // 初始化交易量圖表
    window.chartManager.initVolumeChart();
    
    // 初始化指標圖表
    window.chartManager.initIndicatorsChart();
    
    // 首次加載數據
    loadData();
}

// 初始化圖表同步控制
function initSyncControl() {
    const syncButton = document.getElementById('sync-charts-button');
    if (!syncButton) return;
    
    // 默認啟用圖表同步
    syncButton.classList.add('active');
    syncButton.textContent = '圖表同步：開';
    
    // 添加點擊事件
    syncButton.addEventListener('click', () => {
        // toggleChartSync函數現在會處理按鈕的UI更新
        window.chartManager.toggleChartSync();
    });
}

// 載入數據
async function loadData() {
    try {
        // 更新用戶界面狀態
        updateUIState('loading');
        
        // 初始化同步控制
        initSyncControl();
        
        // 暫時禁用圖表同步，避免初始加載觸發過多同步
        const wasSyncEnabled = window.chartManager.syncEnabled;
        if (wasSyncEnabled) {
            window.chartManager.toggleChartSync(false);
        }
        
        // 並行加載各類數據
        const [priceData, derivativesData, orderbookData] = await Promise.all([
            loadPriceData(),
            loadDerivativesData(),
            loadOrderbookData()
        ]);
        
        // 處理數據關係
        processDataRelationships(priceData, derivativesData, orderbookData);
        
        // 更新市場熵指標
        updateMarketEntropyIndicator(derivativesData);
        
        // 更新極限點預測
        updateExtremePredictions(derivativesData);
        
        // 恢復圖表同步狀態
        if (wasSyncEnabled) {
            // 延遲恢復同步，確保圖表已經渲染完成
            setTimeout(() => {
                window.chartManager.toggleChartSync(true);
                
                // 手動執行一次圖表同步，確保所有圖表的可視範圍一致
                if (window.chartManager.priceChart) {
                    const range = window.chartManager.priceChart.timeScale().getVisibleLogicalRange();
                    if (range) {
                        window.chartManager.performSync(range, 'init');
                    }
                }
            }, 300);
        }
        
        // 更新用戶界面狀態
        updateUIState('loaded');
        
        // 拉取持久性支撐/阻力位
        // 這裡添加延遲，避免與主數據載入同時進行
        setTimeout(async () => {
            try {
                // 嘗試拉取持續性支撐/阻力位數據
                const persistentLevelsEnabled = document.getElementById('persistent-levels-toggle')?.checked || false;
                if (persistentLevelsEnabled && window.chartManager) {
                    await window.chartManager.showPersistentLevels(true);
                }
            } catch (err) {
                console.warn('載入持續性支撐/阻力位失敗，但不影響主要功能', err);
            }
        }, 1000);
        
        return { priceData, derivativesData, orderbookData };
    } catch (error) {
        console.error('載入數據時出錯:', error);
        updateUIState('error', error.message);
        return null;
    }
}

// 載入價格數據
async function loadPriceData() {
    try {
        // 獲取當前選中的交易對和時間框架
        const symbol = getSelectedSymbol();
        const timeframe = getSelectedTimeframe();
        
        // 獲取API實例
        const api = new API(true); // 確保啟用模擬數據
        
        // 加載價格和交易量數據
        const priceData = await api.getPriceData(symbol, timeframe, 100);
        
        // 檢查數據是否有效
        if (!priceData || !Array.isArray(priceData) || priceData.length === 0) {
            console.warn('無效的價格數據，使用模擬數據替代');
            const mockApi = new API(true);
            const mockData = mockApi.getMockPriceData(symbol, timeframe, 100);
            
            // 更新圖表
            window.chartManager.updatePriceChart(mockData);
            window.chartManager.updateVolumeChart(mockData);
            return mockData;
        }
        
        // 更新圖表
        window.chartManager.updatePriceChart(priceData);
        window.chartManager.updateVolumeChart(priceData);
        
        return priceData;
    } catch (error) {
        console.error('載入價格數據失敗:', error);
        
        // 發生錯誤時使用模擬數據
        const mockApi = new API(true);
        const mockData = mockApi.getMockPriceData(getSelectedSymbol(), getSelectedTimeframe(), 100);
        
        // 更新圖表
        window.chartManager.updatePriceChart(mockData);
        window.chartManager.updateVolumeChart(mockData);
        
        return mockData;
    }
}

// 載入衍生數據
async function loadDerivativesData() {
    try {
        // 獲取當前選中的交易對和時間框架
        const symbol = getSelectedSymbol();
        const timeframe = getSelectedTimeframe();
        
        // 獲取API實例
        const api = new API(true); // 確保啟用模擬數據
        
        // 加載衍生指標數據
        const derivativesData = await api.getDerivativesData(symbol, timeframe, 100);
        
        // 檢查數據是否有效
        if (!derivativesData || !Array.isArray(derivativesData) || derivativesData.length === 0) {
            console.warn('無效的衍生數據，使用模擬數據替代');
            const mockApi = new API(true);
            const mockData = mockApi.getMockDerivativesData(symbol, timeframe, 100);
            
            // 更新圖表
            window.chartManager.updateIndicatorsChart(mockData);
            
            // 更新信號指標顯示
            updateSignals(mockData);
            
            // 更新高級指標面板
            window.chartManager.updateAdvancedIndicatorsPanel(mockData);
            
            // 更新極限點預測
            updateExtremePredictions(mockData);
            
            return mockData;
        }
        
        // 更新圖表
        window.chartManager.updateIndicatorsChart(derivativesData);
        
        // 更新信號指標顯示
        updateSignals(derivativesData);
        
        // 更新高級指標面板
        window.chartManager.updateAdvancedIndicatorsPanel(derivativesData);
        
        // 更新極限點預測
        updateExtremePredictions(derivativesData);
        
        return derivativesData;
    } catch (error) {
        console.error('載入衍生數據失敗:', error);
        
        // 發生錯誤時使用模擬數據
        const mockApi = new API(true);
        const mockData = mockApi.getMockDerivativesData(getSelectedSymbol(), getSelectedTimeframe(), 100);
        
        // 更新圖表
        window.chartManager.updateIndicatorsChart(mockData);
        
        // 更新信號指標顯示
        updateSignals(mockData);
        
        // 更新高級指標面板
        window.chartManager.updateAdvancedIndicatorsPanel(mockData);
        
        // 更新極限點預測
        updateExtremePredictions(mockData);
        
        return mockData;
    }
}

// 加載訂單簿數據
async function loadOrderbookData() {
    try {
        // 獲取當前選擇的交易對
        const symbol = getSelectedSymbol();
        
        // 獲取API實例
        const api = new API(true); // 確保啟用模擬數據
        
        // 獲取訂單簿數據
        const orderbookData = await api.getOrderbookData(symbol);
        
        // 檢查訂單簿數據是否有效
        if (!orderbookData || !orderbookData.bids || !orderbookData.asks) {
            console.warn('無效的訂單簿數據，使用模擬數據替代');
            const mockApi = new API(true);
            const mockOrderbookData = mockApi.getMockOrderbookData(symbol);
            
            // 更新訂單簿UI
            window.chartManager.updateOrderbook(mockOrderbookData);
            updateOrderbookUI(mockOrderbookData);
            
            // 使用模擬價格數據
            const mockPriceData = mockApi.getMockPriceData(symbol, '1m', 1);
            const mockLastPrice = mockPriceData.length > 0 ? mockPriceData[0].close : 0;
            
            // 使用模擬梯度數據
            const mockGradientData = mockApi.getMockGradientData(symbol);
            
            // 如果梯度視覺化器已初始化，更新數據
            if (window.orderbookGradientVisualizer && mockGradientData) {
                window.orderbookGradientVisualizer.updateData(mockGradientData, mockLastPrice);
                
                // 更新買賣壓力比率顯示
                updateGradientSummary(mockGradientData);
            }
            
            return {
                orderbook: mockOrderbookData,
                gradient: mockGradientData
            };
        }
        
        // 獲取最新價格 (使用小型請求以減少負載)
        let lastPrice = 0;
        try {
            const priceData = await api.getPriceData(symbol, '1m', 1);
            lastPrice = priceData && priceData.length > 0 ? priceData[0].close : 0;
        } catch (e) {
            console.warn('獲取最新價格失敗，使用模擬數據');
            const mockPriceData = api.getMockPriceData(symbol, '1m', 1);
            lastPrice = mockPriceData[0].close;
        }
        
        // 獲取訂單簿梯度數據
        let gradientData = null;
        try {
            gradientData = await api.getOrderbookGradientData(symbol);
            
            // 檢查梯度數據是否有效
            if (!gradientData || (!gradientData.gradients && !gradientData.bid_gradients)) {
                console.warn('無效的梯度數據，使用模擬數據替代');
                gradientData = api.getMockGradientData(symbol);
            }
        } catch (e) {
            console.warn('獲取梯度數據失敗，使用模擬數據');
            gradientData = api.getMockGradientData(symbol);
        }
        
        // 更新訂單簿UI
        window.chartManager.updateOrderbook(orderbookData);
        updateOrderbookUI(orderbookData);
        
        // 如果梯度視覺化器已初始化，更新數據
        if (window.orderbookGradientVisualizer && gradientData) {
            window.orderbookGradientVisualizer.updateData(gradientData, lastPrice);
            
            // 更新買賣壓力比率顯示
            updateGradientSummary(gradientData);
        }
        
        return {
            orderbook: orderbookData,
            gradient: gradientData
        };
    } catch (error) {
        console.error('載入訂單簿數據失敗:', error);
        
        // 發生錯誤時使用模擬數據
        const mockApi = new API(true);
        const mockOrderbookData = mockApi.getMockOrderbookData(getSelectedSymbol());
        const mockGradientData = mockApi.getMockGradientData(getSelectedSymbol());
        const mockLastPrice = 80000; // 假設的比特幣價格
        
        // 更新訂單簿UI
        window.chartManager.updateOrderbook(mockOrderbookData);
        updateOrderbookUI(mockOrderbookData);
        
        // 如果梯度視覺化器已初始化，更新數據
        if (window.orderbookGradientVisualizer && mockGradientData) {
            window.orderbookGradientVisualizer.updateData(mockGradientData, mockLastPrice);
            
            // 更新買賣壓力比率顯示
            updateGradientSummary(mockGradientData);
        }
        
        return {
            orderbook: mockOrderbookData,
            gradient: mockGradientData
        };
    }
}

// 更新極限點預測
function updateExtremePredictions(data) {
    // 檢查是否有最新數據
    if (!data || data.length === 0) return;
    
    // 查找最近的頂部預測
    let topPrediction = null;
    let topDistance = 0;
    
    // 查找最近的底部預測
    let bottomPrediction = null;
    let bottomDistance = 0;
    
    // 從最新數據向前查找
    for (let i = data.length - 1; i >= Math.max(0, data.length - 20); i--) {
        if (data[i].potential_top !== null && topPrediction === null) {
            topPrediction = data[i].potential_top;
            topDistance = data.length - 1 - i;
        }
        
        if (data[i].potential_bottom !== null && bottomPrediction === null) {
            bottomPrediction = data[i].potential_bottom;
            bottomDistance = data.length - 1 - i;
        }
        
        // 已找到頂部和底部預測，退出循環
        if (topPrediction !== null && bottomPrediction !== null) {
            break;
        }
    }
    
    // 如果沒有找到預測值，使用高級算法生成預測
    if (topPrediction === null || bottomPrediction === null) {
        const predictions = generateAdvancedExtremePredictions(data);
        
        if (topPrediction === null && predictions.top) {
            topPrediction = predictions.top.value;
            topDistance = predictions.top.distance;
        }
        
        if (bottomPrediction === null && predictions.bottom) {
            bottomPrediction = predictions.bottom.value;
            bottomDistance = predictions.bottom.distance;
        }
    }
    
    // 更新頂部預測UI
    const topElement = document.querySelector('.top-prediction');
    if (topElement && topPrediction !== null) {
        topElement.textContent = `$${topPrediction.toFixed(0)} (距今約${topDistance}根K線)`;
    } else if (topElement) {
        topElement.textContent = '無可用預測';
    }
    
    // 更新底部預測UI
    const bottomElement = document.querySelector('.bottom-prediction');
    if (bottomElement && bottomPrediction !== null) {
        bottomElement.textContent = `$${bottomPrediction.toFixed(0)} (距今約${bottomDistance}根K線)`;
    } else if (bottomElement) {
        bottomElement.textContent = '無可用預測';
    }
}

/**
 * 使用高級算法生成頂部和底部極限點預測
 * 結合波動率、市場熵、布林帶數據進行預測
 */
function generateAdvancedExtremePredictions(data) {
    if (!data || data.length < 20) return { top: null, bottom: null };
    
    const lastCandle = data[data.length - 1];
    const lastPrice = lastCandle.close;
    
    // 計算平均波動率
    let avgVolatility = 0;
    let volatilityCount = 0;
    
    // 計算平均市場熵
    let avgEntropy = 0;
    let entropyCount = 0;
    
    // 計算布林帶寬度趨勢
    let bandwidthTrend = 0;
    
    // 收集最近20個周期的數據
    for (let i = data.length - 1; i >= Math.max(0, data.length - 20); i--) {
        if (data[i].volatility !== null) {
            avgVolatility += data[i].volatility;
            volatilityCount++;
        }
        
        if (data[i].market_entropy !== null) {
            avgEntropy += data[i].market_entropy;
            entropyCount++;
        }
        
        if (i < data.length - 1 && data[i].bollinger_bandwidth !== null && data[i+1].bollinger_bandwidth !== null) {
            bandwidthTrend += data[i+1].bollinger_bandwidth - data[i].bollinger_bandwidth;
        }
    }
    
    // 計算平均值
    avgVolatility = volatilityCount > 0 ? avgVolatility / volatilityCount : 0;
    avgEntropy = entropyCount > 0 ? avgEntropy / entropyCount : 0;
    
    // 根據市場狀態調整預測幅度
    let volatilityFactor = Math.min(1.0, avgVolatility / 5.0); // 標準化波動率因子
    let entropyFactor = Math.min(1.0, avgEntropy / 0.7); // 標準化熵因子
    let bandwidthDirection = bandwidthTrend > 0 ? 1 : -1; // 布林帶寬度擴大或收縮
    
    // 結合因子計算預測
    let topMultiplier = 1.0 + (volatilityFactor * 0.05) + (entropyFactor * 0.03);
    let bottomMultiplier = 1.0 - (volatilityFactor * 0.05) - (entropyFactor * 0.03);
    
    // 布林帶寬度擴大時增加預測幅度
    if (bandwidthDirection > 0) {
        topMultiplier += 0.02;
        bottomMultiplier -= 0.02;
    }
    
    // 根據市場熵調整預測距離
    let distanceMultiplier = Math.max(1, Math.floor(entropyFactor * 10));
    
    // 生成預測
    const topPrediction = {
        value: lastPrice * topMultiplier,
        distance: 3 + distanceMultiplier
    };
    
    const bottomPrediction = {
        value: lastPrice * bottomMultiplier,
        distance: 2 + distanceMultiplier
    };
    
    return {
        top: topPrediction,
        bottom: bottomPrediction
    };
}

// 更新市場熵指標
function updateMarketEntropyIndicator(data) {
    if (!data || data.length === 0) return;
    
    const lastData = data[data.length - 1];
    if (!lastData.market_entropy) return;
    
    const entropyValue = lastData.market_entropy;
    const entropyElement = document.getElementById('entropy-value');
    
    if (!entropyElement) return;
    
    // 根據熵值確定市場狀態
    let status = '';
    let className = '';
    
    if (entropyValue > 0.7) {
        status = '高度混沌';
        className = 'signal-value negative';
    } else if (entropyValue > 0.4) {
        status = '中度無序';
        className = 'signal-value neutral';
    } else {
        status = '有序市場';
        className = 'signal-value positive';
    }
    
    // 更新UI
    entropyElement.textContent = `${entropyValue.toFixed(2)} (${status})`;
    entropyElement.className = className;
    
    // 分析市場熵變化趨勢
    analyzeEntropyTrend(data);
}

// 分析市場熵的變化趨勢
function analyzeEntropyTrend(data) {
    if (!data || data.length < 10) return;
    
    // 獲取最近10個周期的熵值
    const entropyValues = [];
    for (let i = data.length - 10; i < data.length; i++) {
        if (data[i].market_entropy) {
            entropyValues.push(data[i].market_entropy);
        }
    }
    
    if (entropyValues.length < 5) return; // 需要至少5個數據點
    
    // 計算熵值趨勢的線性回歸
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    
    for (let i = 0; i < entropyValues.length; i++) {
        sumX += i;
        sumY += entropyValues[i];
        sumXY += i * entropyValues[i];
        sumX2 += i * i;
    }
    
    const n = entropyValues.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // 根據斜率判斷趨勢
    let trendText = '';
    if (slope > 0.01) {
        trendText = '市場混沌度增加中';
    } else if (slope < -0.01) {
        trendText = '市場逐漸趨於有序';
    } else {
        trendText = '市場混沌度穩定';
    }
    
    // 更新UI中的趨勢描述
    const trendElement = document.querySelector('.entropy-trend');
    if (trendElement) {
        trendElement.textContent = trendText;
    }
}

// 開始定期更新數據
function startDataUpdates() {
    // 每30秒更新一次數據
    setInterval(() => loadData(), 30000);
}

// 處理交易對選擇變更
function handleSymbolChange() {
    console.log('交易對變更為：', this.value);
    loadData();
}

// 處理時間框架選擇變更
function handleTimeframeChange() {
    console.log('時間框架變更為：', this.value);
    loadData();
}

// 設置工具欄和其他UI元素的事件監聽
function setupEventListeners() {
    // 交易對選擇
    const symbolButtons = document.querySelectorAll('.toolbar-left .toolbar-button');
    symbolButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // 移除其他按鈕的活動狀態
            symbolButtons.forEach(btn => btn.classList.remove('active'));
            // 設置當前按鈕為活動狀態
            e.target.classList.add('active');
            // 重新加載數據
            loadData();
        });
    });
    
    // 時間框架選擇
    const timeframeButtons = document.querySelectorAll('.toolbar-right .toolbar-button');
    timeframeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // 移除其他按鈕的活動狀態
            timeframeButtons.forEach(btn => btn.classList.remove('active'));
            // 設置當前按鈕為活動狀態
            e.target.classList.add('active');
            // 重新加載數據
            loadData();
        });
    });
    
    // 設置圖表同步控制按鈕事件
    setupChartControlButtons();
    
    // 添加高級指標卡片的交互
    setupAdvancedIndicatorsInteraction();
}

// 設置圖表控制按鈕事件
function setupChartControlButtons() {
    // 圖表同步控制按鈕不需要再綁定事件，由ChartManager中的setupChartSync處理
    
    // 刷新數據按鈕
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        // 使用 debounce 避免連續點擊造成的多次請求
        let refreshTimeout = null;
        refreshButton.addEventListener('click', () => {
            // 防止連續點擊
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
                return;
            }
            
            try {
                // 顯示載入提示
                updateUIState('loading');
                
                // 添加視覺反饋
                refreshButton.classList.add('clicked');
                
                // 設置防抖標識
                refreshTimeout = setTimeout(() => {
                    refreshTimeout = null;
                }, 1000);
                
                // 調用數據加載函數
                loadData().then(() => {
                    // 載入完成後恢復UI狀態
                    updateUIState('loaded');
                    
                    // 移除點擊效果
                    setTimeout(() => {
                        refreshButton.classList.remove('clicked');
                    }, 200);
                }).catch(error => {
                    // 處理錯誤
                    console.error('刷新數據時出錯:', error);
                    updateUIState('error', '刷新數據時出錯');
                    
                    // 移除點擊效果
                    refreshButton.classList.remove('clicked');
                });
            } catch (error) {
                console.error('刷新數據時出錯:', error);
                updateUIState('error', '刷新數據時出錯');
                
                // 移除點擊效果
                refreshButton.classList.remove('clicked');
                
                // 清除防抖標識
                if (refreshTimeout) {
                    clearTimeout(refreshTimeout);
                    refreshTimeout = null;
                }
            }
        });
    }
    
    // 適配所有數據按鈕 (如果存在)
    const fitButton = document.getElementById('fit-charts-button');
    if (fitButton) {
        // 使用 debounce 避免連續點擊
        let fitTimeout = null;
        fitButton.addEventListener('click', () => {
            // 防止連續點擊
            if (fitTimeout) {
                clearTimeout(fitTimeout);
                return;
            }
            
            try {
                // 添加點擊動畫效果
                fitButton.classList.add('clicked');
                
                // 設置防抖標識
                fitTimeout = setTimeout(() => {
                    fitTimeout = null;
                }, 500);
                
                // 暫時禁用同步，避免fitContent觸發多次同步
                const wasSyncEnabled = window.chartManager.syncEnabled;
                if (wasSyncEnabled) {
                    window.chartManager.toggleChartSync(false);
                }
                
                // 在下一幀中執行數據適配
                requestAnimationFrame(() => {
                    window.chartManager.fitAllCharts();
                    
                    // 完成後恢復同步狀態
                    setTimeout(() => {
                        if (wasSyncEnabled) {
                            window.chartManager.toggleChartSync(true);
                        }
                        
                        // 移除點擊效果
                        fitButton.classList.remove('clicked');
                    }, 200);
                });
            } catch (error) {
                console.error('適配圖表內容時出錯:', error);
                
                // 移除點擊效果
                fitButton.classList.remove('clicked');
                
                // 清除防抖標識
                if (fitTimeout) {
                    clearTimeout(fitTimeout);
                    fitTimeout = null;
                }
            }
        });
    }
    
    // 設置持續性支撐/阻力位切換
    const persistentLevelsToggle = document.getElementById('persistent-levels-toggle');
    if (persistentLevelsToggle) {
        persistentLevelsToggle.addEventListener('change', function() {
            try {
                if (window.chartManager) {
                    // 禁用按鈕，避免連續點擊
                    this.disabled = true;
                    
                    // 顯示載入提示
                    if (this.checked) {
                        updateUIState('loading');
                    }
                    
                    // 執行操作
                    window.chartManager.showPersistentLevels(this.checked)
                        .then(() => {
                            // 載入完成後恢復UI狀態
                            if (this.checked) {
                                updateUIState('loaded');
                            }
                            // 重新啟用按鈕
                            this.disabled = false;
                        })
                        .catch(error => {
                            console.error('切換持續性支撐/阻力位時出錯:', error);
                            // 載入失敗時更新UI狀態
                            if (this.checked) {
                                updateUIState('error', '載入持續性支撐/阻力位失敗');
                            }
                            // 重新啟用按鈕
                            this.disabled = false;
                        });
                }
            } catch (error) {
                console.error('切換持續性支撐/阻力位時出錯:', error);
                // 重新啟用按鈕
                this.disabled = false;
            }
        });
    }
}

// 設置高級指標卡片的交互
function setupAdvancedIndicatorsInteraction() {
    const indicatorCards = document.querySelectorAll('.indicator-card');
    
    indicatorCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
            card.style.transition = 'all 0.3s ease';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        });
    });
}

// 獲取當前選中的交易對
function getSelectedSymbol() {
    const symbolSelect = document.getElementById('symbol-select');
    if (symbolSelect && symbolSelect.value) {
        return symbolSelect.value;
    }
    return 'BTCUSDT'; // 默認值
}

// 獲取當前選中的時間框架
function getSelectedTimeframe() {
    const timeframeSelect = document.getElementById('timeframe-select');
    if (timeframeSelect && timeframeSelect.value) {
        return timeframeSelect.value;
    }
    return '1h'; // 默認值
}

// 更新信號指標顯示
function updateSignals(data) {
    if (!data || data.length === 0) return;
    
    // 計算買入和賣出信號的數量
    let buySignals = 0;
    let sellSignals = 0;
    
    // 根據二階導數變化計算信號
    for (let i = 3; i < data.length - 3; i++) {
        const acceleration = data[i].price_acceleration || 0;
        const prevAcceleration = data[i-1].price_acceleration || 0;
        const velocity = data[i].price_velocity || 0;
        
        // 買入信號：二階導數從負轉正，且一階導數為正
        if (prevAcceleration < 0 && acceleration > 0 && velocity > 0) {
            buySignals++;
        }
        
        // 賣出信號：二階導數從正轉負，且一階導數為負
        if (prevAcceleration > 0 && acceleration < 0 && velocity < 0) {
            sellSignals++;
        }
    }
    
    // 更新UI顯示
    const buySignalElement = document.querySelector('.signal-item:nth-child(1) .signal-value:nth-child(2)');
    const sellSignalElement = document.querySelector('.signal-item:nth-child(1) .signal-value:nth-child(3)');
    
    if (buySignalElement) {
        buySignalElement.innerHTML = `<span class="buy-signal"></span> 買入信號: ${buySignals}個`;
    }
    
    if (sellSignalElement) {
        sellSignalElement.innerHTML = `<span class="sell-signal"></span> 賣出信號: ${sellSignals}個`;
    }
    
    // 更新價格速度指標
    const lastItem = data[data.length - 1];
    const velocity = lastItem.price_velocity || 0;
    const velocityElement = document.querySelector('.signal-item:nth-child(2) .signal-value');
    
    if (velocityElement) {
        let status = velocity > 0 ? 
            (velocity > 5 ? '上漲加速中' : '緩慢上漲') : 
            (velocity < -5 ? '下跌加速中' : '緩慢下跌');
        
        velocityElement.className = 'signal-value ' + (velocity >= 0 ? 'positive' : 'negative');
        velocityElement.textContent = `${velocity.toFixed(1)} (${status})`;
    }
    
    // 模擬買賣力量比更新
    const powerElement = document.querySelector('.signal-item:nth-child(3) .signal-value');
    
    if (powerElement) {
        // 這裡用加速度的值來模擬買賣力量比
        const power = 1 + lastItem.price_acceleration / 10;
        const powerRatio = Math.max(0.2, Math.min(2, power)).toFixed(2);
        const status = powerRatio > 1 ? '買方較強' : '賣方略強';
        
        powerElement.className = 'signal-value ' + (powerRatio >= 1 ? 'positive' : 'negative');
        powerElement.textContent = `${powerRatio} (${status})`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 初始化交易對選擇下拉選單
    const symbolDropdownBtn = document.getElementById('symbol-dropdown-btn');
    const symbolOptions = document.querySelectorAll('.dropdown-content a[data-symbol]');
    
    symbolOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const symbol = this.getAttribute('data-symbol');
            symbolDropdownBtn.innerHTML = symbol + ' <i class="fas fa-caret-down"></i>';
            document.querySelector('.chart-header h2').textContent = symbol.replace('USDT', '/USDT');
            window.cryptoCharts.changeSymbol(symbol);
        });
    });
    
    // 初始化時間框架選擇下拉選單
    const timeframeDropdownBtn = document.getElementById('timeframe-dropdown-btn');
    const timeframeOptions = document.querySelectorAll('.dropdown-content a[data-timeframe]');
    
    timeframeOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const timeframe = this.getAttribute('data-timeframe');
            let displayText;
            
            switch(timeframe) {
                case '15m': displayText = '15分鐘'; break;
                case '1h': displayText = '1小時'; break;
                case '4h': displayText = '4小時'; break;
                case '1d': displayText = '1天'; break;
                default: displayText = '1小時'; break;
            }
            
            timeframeDropdownBtn.innerHTML = displayText + ' <i class="fas fa-caret-down"></i>';
            window.cryptoCharts.changeTimeframe(timeframe);
        });
    });
    
    // 初始化標籤切換功能
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有標籤的活動狀態
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加當前標籤的活動狀態
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
            
            // 如果切換到訂單簿梯度標籤，更新圖表大小
            if (tabId === 'orderbook-tab' && window.cryptoCharts.gradientChart) {
                window.cryptoCharts.gradientChart.resize(
                    document.getElementById('gradient-chart').clientWidth,
                    document.getElementById('gradient-chart').clientHeight
                );
            }
        });
    });
    
    // 更新指標值顯示
    function updateIndicatorValues() {
        // 使用圖表中的最新數據更新側邊欄指標值
        const charts = window.cryptoCharts;
        if (!charts) return;
        
        // 獲取最新的衍生數據
        const velocityData = charts.velocitySeries.data();
        const accelerationData = charts.accelerationSeries.data();
        const elasticityData = charts.elasticitySeries.data();
        const curvatureData = charts.curvatureSeries.data();
        
        if (velocityData && velocityData.length > 0) {
            const latestVelocity = velocityData[velocityData.length - 1].value;
            document.getElementById('velocity-value').textContent = latestVelocity.toFixed(2);
            // 根據正負值設置顏色
            document.getElementById('velocity-value').style.backgroundColor = 
                latestVelocity >= 0 ? '#26a69a' : '#ef5350';
        }
        
        if (accelerationData && accelerationData.length > 0) {
            const latestAcceleration = accelerationData[accelerationData.length - 1].value;
            document.getElementById('acceleration-value').textContent = latestAcceleration.toFixed(2);
            // 根據正負值設置顏色
            document.getElementById('acceleration-value').style.backgroundColor = 
                latestAcceleration >= 0 ? '#26a69a' : '#ef5350';
        }
        
        if (elasticityData && elasticityData.length > 0) {
            const latestElasticity = elasticityData[elasticityData.length - 1].value;
            document.getElementById('elasticity-value').textContent = latestElasticity.toFixed(2);
            // 根據正負值設置顏色
            document.getElementById('elasticity-value').style.backgroundColor = 
                latestElasticity >= 0 ? '#26a69a' : '#ef5350';
        }
        
        if (curvatureData && curvatureData.length > 0) {
            const latestCurvature = curvatureData[curvatureData.length - 1].value;
            document.getElementById('curvature-value').textContent = latestCurvature.toFixed(2);
            // 根據絕對值大小設置顏色
            const absCurvature = Math.abs(latestCurvature);
            if (absCurvature > 0.5) {
                document.getElementById('curvature-value').style.backgroundColor = '#ef5350'; // 高曲率，可能為轉折點
            } else if (absCurvature > 0.1) {
                document.getElementById('curvature-value').style.backgroundColor = '#ff9800'; // 中等曲率
            } else {
                document.getElementById('curvature-value').style.backgroundColor = '#26a69a'; // 低曲率，穩定趨勢
            }
        }
        
        // 更新趨勢信號
        updateTrendSignals();
        
        // 更新訂單簿分析
        updateOrderbookAnalysis();
    }
    
    // 更新趨勢信號
    function updateTrendSignals() {
        // 使用價格導數數據來確定趨勢信號
        const charts = window.cryptoCharts;
        if (!charts) return;
        
        const velocityData = charts.velocitySeries.data();
        const accelerationData = charts.accelerationSeries.data();
        
        if (velocityData && velocityData.length > 0 && accelerationData && accelerationData.length > 0) {
            const latestVelocity = velocityData[velocityData.length - 1].value;
            const latestAcceleration = accelerationData[accelerationData.length - 1].value;
            
            // 轉折點預測
            let inflectionSignal;
            let inflectionColor;
            
            if (latestVelocity > 0 && latestAcceleration < 0) {
                inflectionSignal = "可能頂部";
                inflectionColor = "#ef5350"; // 紅色
            } else if (latestVelocity < 0 && latestAcceleration > 0) {
                inflectionSignal = "可能底部";
                inflectionColor = "#26a69a"; // 綠色
            } else if (latestVelocity > 0 && latestAcceleration > 0) {
                inflectionSignal = "加速上漲";
                inflectionColor = "#26a69a"; // 綠色
            } else if (latestVelocity < 0 && latestAcceleration < 0) {
                inflectionSignal = "加速下跌";
                inflectionColor = "#ef5350"; // 紅色
            } else {
                inflectionSignal = "觀望";
                inflectionColor = "#ffc107"; // 黃色
            }
            
            document.getElementById('inflection-signal').textContent = inflectionSignal;
            document.getElementById('inflection-signal').style.backgroundColor = inflectionColor;
            
            // 市場動能
            let momentumSignal;
            let momentumColor;
            
            if (Math.abs(latestVelocity) < 0.5) {
                momentumSignal = "橫盤";
                momentumColor = "#ffc107"; // 黃色
            } else if (latestVelocity > 0) {
                momentumSignal = "上升";
                momentumColor = "#26a69a"; // 綠色
            } else {
                momentumSignal = "下降";
                momentumColor = "#ef5350"; // 紅色
            }
            
            document.getElementById('momentum-signal').textContent = momentumSignal;
            document.getElementById('momentum-signal').style.backgroundColor = momentumColor;
        }
    }
    
    // 更新訂單簿分析
    function updateOrderbookAnalysis() {
        // 獲取最新的訂單簿梯度數據
        const charts = window.cryptoCharts;
        if (!charts) return;
        
        const bidGradients = charts.bidGradientSeries?.data();
        const askGradients = charts.askGradientSeries?.data();
        
        if (bidGradients && askGradients && bidGradients.length > 0 && askGradients.length > 0) {
            // 計算買賣壓力
            const totalBidGradient = bidGradients.reduce((sum, item) => sum + Math.abs(item.value), 0);
            const totalAskGradient = askGradients.reduce((sum, item) => sum + Math.abs(item.value), 0);
            
            // 標準化壓力值（0-100%）
            const maxPressure = Math.max(totalBidGradient, totalAskGradient);
            const buyPressurePercentage = (totalBidGradient / maxPressure) * 100;
            const sellPressurePercentage = (totalAskGradient / maxPressure) * 100;
            
            // 更新UI
            document.getElementById('buy-pressure').style.width = `${buyPressurePercentage}%`;
            document.getElementById('sell-pressure').style.width = `${sellPressurePercentage}%`;
            
            // 計算市場力量平衡點
            const totalPressure = totalBidGradient + totalAskGradient;
            const balancePoint = (totalBidGradient / totalPressure) * 100;
            document.getElementById('balance-marker').style.left = `${balancePoint}%`;
            
            // 更新流動性評估信號
            const liquidityRatio = Math.min(totalBidGradient, totalAskGradient) / Math.max(totalBidGradient, totalAskGradient);
            let liquiditySignal;
            let liquidityColor;
            
            if (liquidityRatio > 0.8) {
                liquiditySignal = "均衡";
                liquidityColor = "#26a69a"; // 綠色
            } else if (liquidityRatio > 0.5) {
                liquiditySignal = "中等";
                liquidityColor = "#ffc107"; // 黃色
            } else {
                liquiditySignal = "不均衡";
                liquidityColor = "#ef5350"; // 紅色
            }
            
            document.getElementById('liquidity-signal').textContent = liquiditySignal;
            document.getElementById('liquidity-signal').style.backgroundColor = liquidityColor;
        }
    }
    
    // 定期更新UI信息
    setInterval(updateIndicatorValues, 5000);
    
    // 初始更新一次
    setTimeout(updateIndicatorValues, 2000);
});

// 初始化訂單簿梯度視覺化
function initOrderbookGradientVisualizer() {
    // 檢查元素是否存在
    const container = document.getElementById('orderbook-gradient-container');
    if (!container) {
        console.error('訂單簿梯度容器未找到');
        return;
    }
    
    // 創建視覺化實例
    window.orderbookGradientVisualizer = new OrderbookGradientVisualizer('orderbook-gradient-container', {
        width: container.clientWidth,
        height: 350,
        maxGradientValue: 1.0
    });
}

// 更新訂單簿梯度摘要信息
function updateGradientSummary(gradientData) {
    if (!gradientData) {
        console.error('梯度數據無效');
        return;
    }
    
    const gradientValueElement = document.getElementById('gradient-value');
    if (!gradientValueElement) {
        console.warn('找不到梯度值顯示元素');
        return;
    }
    
    // 計算買方梯度總和
    let buyPressure = 0;
    // 計算賣方梯度總和
    let sellPressure = 0;
    
    // 梯度數據可能有不同的結構，進行適配
    const gradients = gradientData.gradients || gradientData.bid_gradients || [];
    const askGradients = gradientData.ask_gradients || [];
    
    // 處理買方梯度
    gradients.forEach(item => {
        if (item && typeof item.gradient === 'number') {
            buyPressure += Math.max(0, item.gradient);
        }
    });
    
    // 處理賣方梯度
    (askGradients.length > 0 ? askGradients : gradients).forEach(item => {
        if (item && typeof item.gradient === 'number') {
            sellPressure += Math.max(0, Math.abs(item.gradient));
        }
    });
    
    // 計算買方比例
    const totalPressure = buyPressure + sellPressure;
    const buyPercentage = totalPressure > 0 ? (buyPressure / totalPressure * 100).toFixed(1) : "50.0";
    
    // 計算買賣比率
    const ratio = sellPressure > 0 ? (buyPressure / sellPressure).toFixed(2) : "N/A";
    
    // 設置文本和顏色
    let statusText = "買賣平衡";
    let className = "neutral";
    
    if (buyPercentage > 60) {
        statusText = "買方強勢";
        className = "positive";
    } else if (buyPercentage < 40) {
        statusText = "賣方強勢";
        className = "negative";
    }
    
    // 更新UI
    gradientValueElement.textContent = `${buyPercentage}% (${statusText})`;
    gradientValueElement.className = `signal-value ${className}`;
}

// 初始化應用
function initApp() {
    try {
        // 檢查必要的DOM元素是否存在
        const requiredElements = [
            'price-chart',
            'volume-chart',
            'indicators-chart'
        ];
        
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                console.error(`初始化失敗: 找不到必要的DOM元素 #${elementId}`);
                alert(`應用初始化失敗: 找不到圖表容器元素 #${elementId}`);
                return;
            }
        }
        
        // 確保.chart-container元素存在
        ensureChartContainerExists();
        
        // 創建全局圖表管理器實例
        window.chartManager = new ChartManager();
        
        // 初始化圖表
        initCharts();
        
        // 初始化訂單簿梯度視覺化
        initOrderbookGradientVisualizer();
        
        // 設置全局窗口大小變化處理
        setupGlobalResizeHandler();
        
        // 設置定時刷新數據
        setInterval(() => loadData(), 30000); // 每30秒刷新一次數據
        
        // 添加交易對選擇和時間框架選擇處理
        document.getElementById('symbol-select')?.addEventListener('change', handleSymbolChange);
        document.getElementById('timeframe-select')?.addEventListener('change', handleTimeframeChange);
        
        // 設置工具欄按鈕事件監聽
        setupEventListeners();
        
        console.log('應用初始化完成');
    } catch (error) {
        console.error('初始化應用時出錯:', error);
    }
}

// 確保.chart-container元素存在
function ensureChartContainerExists() {
    // 檢查.chart-container是否存在，不存在則創建
    if (!document.querySelector('.chart-container')) {
        console.log('創建.chart-container元素');
        const chartsArea = document.querySelector('.charts');
        if (chartsArea) {
            // 如果有.charts元素，將其添加chart-container類
            chartsArea.classList.add('chart-container');
        } else {
            // 如果沒有.charts元素，創建一個新的容器
            const container = document.createElement('div');
            container.className = 'chart-container';
            
            // 獲取圖表元素
            const priceChart = document.getElementById('price-chart');
            const volumeChart = document.getElementById('volume-chart');
            const indicatorsChart = document.getElementById('indicators-chart');
            
            // 如果圖表元素已經有父元素，添加類
            if (priceChart && priceChart.parentElement) {
                priceChart.parentElement.classList.add('chart-container');
            } else if (priceChart) {
                // 否則，將圖表元素添加到新容器中
                container.appendChild(priceChart);
                if (volumeChart) container.appendChild(volumeChart);
                if (indicatorsChart) container.appendChild(indicatorsChart);
                
                // 將容器添加到頁面
                document.querySelector('.main-chart-area')?.appendChild(container) ||
                document.body.appendChild(container);
            }
        }
    }
}

// 獲取當前選擇的交易對
function getCurrentSymbol() {
    return getSelectedSymbol();
}

// 更新訂單簿UI
function updateOrderbookUI(orderbookData) {
    if (!orderbookData || !orderbookData.bids || !orderbookData.asks) {
        console.warn('訂單簿數據無效');
        return;
    }
    
    // 獲取DOM元素
    const bidsContainer = document.getElementById('orderbook-bids');
    const asksContainer = document.getElementById('orderbook-asks');
    
    if (!bidsContainer || !asksContainer) {
        console.warn('訂單簿容器元素未找到');
        return;
    }
    
    // 清空容器
    bidsContainer.innerHTML = '';
    asksContainer.innerHTML = '';
    
    // 更新買單
    orderbookData.bids.slice(0, 10).forEach(bid => {
        const price = parseFloat(bid[0]);
        const quantity = parseFloat(bid[1]);
        const total = price * quantity;
        
        const row = document.createElement('div');
        row.className = 'orderbook-row bid';
        row.innerHTML = `
            <span class="price">${price.toFixed(2)}</span>
            <span class="quantity">${quantity.toFixed(4)}</span>
            <span class="total">${total.toFixed(2)}</span>
        `;
        
        bidsContainer.appendChild(row);
    });
    
    // 更新賣單
    orderbookData.asks.slice(0, 10).reverse().forEach(ask => {
        const price = parseFloat(ask[0]);
        const quantity = parseFloat(ask[1]);
        const total = price * quantity;
        
        const row = document.createElement('div');
        row.className = 'orderbook-row ask';
        row.innerHTML = `
            <span class="price">${price.toFixed(2)}</span>
            <span class="quantity">${quantity.toFixed(4)}</span>
            <span class="total">${total.toFixed(2)}</span>
        `;
        
        asksContainer.appendChild(row);
    });
    
    // 更新價差
    if (orderbookData.asks.length > 0 && orderbookData.bids.length > 0) {
        const lowestAsk = parseFloat(orderbookData.asks[0][0]);
        const highestBid = parseFloat(orderbookData.bids[0][0]);
        const spread = lowestAsk - highestBid;
        const spreadPercent = (spread / lowestAsk) * 100;
        
        const spreadElement = document.querySelector('.spread-value');
        if (spreadElement) {
            spreadElement.textContent = `價差: $${spread.toFixed(2)} (${spreadPercent.toFixed(2)}%)`;
        }
    }
}

// 處理數據關係
function processDataRelationships(priceData, derivativesData, orderbookData) {
    // 如果數據不齊全則不處理
    if (!priceData || !derivativesData) return;
    
    // 在這裡可以添加額外的數據關係處理邏輯
    console.log('數據載入完成，處理數據關係');
}

// 更新UI狀態
function updateUIState(state, errorMessage) {
    // 獲取狀態指示元素
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorIndicator = document.getElementById('error-indicator');
    const chartContainer = document.querySelector('.chart-container');
    
    // 根據狀態更新UI
    switch (state) {
        case 'loading':
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (errorIndicator) errorIndicator.style.display = 'none';
            if (chartContainer) chartContainer.classList.add('loading');
            break;
            
        case 'loaded':
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (errorIndicator) errorIndicator.style.display = 'none';
            if (chartContainer) chartContainer.classList.remove('loading');
            break;
            
        case 'error':
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (errorIndicator) {
                errorIndicator.style.display = 'block';
                errorIndicator.textContent = errorMessage || '載入數據時出錯';
            }
            if (chartContainer) {
                chartContainer.classList.remove('loading');
                chartContainer.classList.add('error');
            }
            break;
    }
}

// 添加全局窗口大小變化處理
function setupGlobalResizeHandler() {
    window.addEventListener('resize', () => {
        if (window.chartManager) {
            // 延遲調整圖表大小，避免頻繁觸發
            if (window.resizeTimeout) {
                clearTimeout(window.resizeTimeout);
            }
            
            window.resizeTimeout = setTimeout(() => {
                // 如果圖表管理器存在，調用所有圖表的尺寸更新
                if (window.chartManager.priceChart) {
                    const priceElement = document.getElementById('price-chart');
                    if (priceElement) {
                        const width = priceElement.parentElement ? 
                            priceElement.parentElement.clientWidth : window.innerWidth * 0.7;
                        window.chartManager.priceChart.applyOptions({ width });
                    }
                }
                
                if (window.chartManager.volumeChart) {
                    const volumeElement = document.getElementById('volume-chart');
                    if (volumeElement) {
                        const width = volumeElement.parentElement ? 
                            volumeElement.parentElement.clientWidth : window.innerWidth * 0.7;
                        window.chartManager.volumeChart.applyOptions({ width });
                    }
                }
                
                if (window.chartManager.indicatorsChart) {
                    const indicatorsElement = document.getElementById('indicators-chart');
                    if (indicatorsElement) {
                        const width = indicatorsElement.parentElement ? 
                            indicatorsElement.parentElement.clientWidth : window.innerWidth * 0.7;
                        window.chartManager.indicatorsChart.applyOptions({ width });
                    }
                }
                
                console.log('圖表尺寸已更新以適應窗口變化');
            }, 300); // 延遲300毫秒，避免頻繁調整
        }
    });
} 