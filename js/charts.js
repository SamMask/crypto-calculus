class ChartManager {
    constructor() {
        this.symbol = 'BTCUSDT';
        this.timeframe = '1h';
        this.api = new API();
        this.priceChart = null;
        this.volumeChart = null;
        this.indicatorsChart = null;
        this.advancedIndicatorsChart = null;
        this.gradientChart = null;
        this.priceSeries = null;
        this.volumeSeries = null;
        this.velocitySeries = null;
        this.accelerationSeries = null;
        this.inflectionMarkers = null;
        this.extremePointMarkers = null; // 添加極限點預測標記
        this.bidGradientSeries = null;
        this.askGradientSeries = null;
        this.buyGradientSeries = null;
        this.sellGradientSeries = null;
        this.elasticitySeries = null;
        this.curvatureSeries = null;
        this.currentPriceLine = null;
        this.isSyncing = false;
        this.keyLevelsContainer = null;
        this.persistentLevelsShown = false;
        this.persistentLevelsData = null;
        this.persistentSupportMarkers = [];
        this.persistentResistanceMarkers = [];
        this.syncEnabled = false;
        this.lastSyncTime = 0;
        this.syncThrottleTime = 120; // 增加到120毫秒以降低更新頻率
        this.pendingSync = null; // 追蹤待處理的同步操作
        this.syncScheduled = false; // 是否已排程同步
        this.syncCount = 0; // 同步次數計數器
        this.syncMonitorEnabled = false; // 性能監控開關
    }

    // 初始化價格圖表
    initPriceChart() {
        const chartElement = document.getElementById('price-chart');
        if (!chartElement) {
            console.error('找不到價格圖表容器元素 #price-chart');
            return;
        }
        
        // 設定合適的高度和寬度
        const parentWidth = chartElement.parentElement ? chartElement.parentElement.clientWidth : window.innerWidth * 0.7;
        const chartHeight = 400; // 固定高度或使用父容器高度的比例
        
        this.priceChart = LightweightCharts.createChart(chartElement, {
            width: parentWidth,
            height: chartHeight,
            layout: {
                background: { type: 'solid', color: '#1E1E1E' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
            },
            timeScale: {
                borderColor: '#2B2B43',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        this.candleSeries = this.priceChart.addCandlestickSeries({
            upColor: '#4caf50',
            downColor: '#ff4d4d',
            borderDownColor: '#ff4d4d',
            borderUpColor: '#4caf50',
            wickDownColor: '#ff4d4d',
            wickUpColor: '#4caf50',
        });

        // 添加趨勢拐點標記系列
        this.inflectionMarkers = this.priceChart.addLineSeries({
            lastPriceAnimation: 0,
        });
        
        // 添加極限點預測區域

        // 添加極限點預測線條
        this.extremePointMarkers = null; // 不使用 markers
        this.topPredictionSeries = this.priceChart.addLineSeries({
            color: 'rgba(255, 82, 82, 0.7)',
            lineWidth: 1,
            lineStyle: 2, // 虛線
            lastValueVisible: false,
            priceLineVisible: false,
        });

        this.bottomPredictionSeries = this.priceChart.addLineSeries({
            color: 'rgba(76, 175, 80, 0.7)',
            lineWidth: 1,
            lineStyle: 2, // 虛線
            lastValueVisible: false,
            priceLineVisible: false,
        });

        // 讓圖表響應容器大小變化
        window.addEventListener('resize', () => {
            if (this.priceChart) {
                this.priceChart.applyOptions({
                    width: chartElement.clientWidth,
                    height: chartElement.clientHeight,
                });
            }
        });

        // 讓圖表響應容器大小變化
        window.addEventListener('resize', () => {
            if (this.priceChart && chartElement) {
                const parentWidth = chartElement.parentElement ? chartElement.parentElement.clientWidth : window.innerWidth * 0.7;
                this.priceChart.applyOptions({
                    width: parentWidth,
                    height: chartHeight
                });
            }
        });
    }

    // 初始化交易量圖表
    initVolumeChart() {
        const chartElement = document.getElementById('volume-chart');
        if (!chartElement) {
            console.error('找不到交易量圖表容器元素 #volume-chart');
            return;
        }
        
        // 設定合適的高度和寬度
        const parentWidth = chartElement.parentElement ? chartElement.parentElement.clientWidth : window.innerWidth * 0.7;
        const chartHeight = 100; // 交易量圖表較小
        
        this.volumeChart = LightweightCharts.createChart(chartElement, {
            width: parentWidth,
            height: chartHeight,
            layout: {
                background: { type: 'solid', color: '#1E1E1E' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
            },
            timeScale: {
                borderColor: '#2B2B43',
                visible: false,
                secondsVisible: false,
            },
            handleScale: false,  // 禁止在該圖表上縮放，統一由主圖表控制
            handleScroll: false, // 禁止在該圖表上滾動，統一由主圖表控制
        });

        this.volumeSeries = this.volumeChart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
        });

        // 讓圖表響應容器大小變化
        window.addEventListener('resize', () => {
            if (this.volumeChart) {
                this.volumeChart.applyOptions({
                    width: chartElement.clientWidth,
                    height: chartElement.clientHeight,
                });
            }
        });

        // 讓圖表響應容器大小變化
        window.addEventListener('resize', () => {
            if (this.volumeChart && chartElement) {
                const parentWidth = chartElement.parentElement ? chartElement.parentElement.clientWidth : window.innerWidth * 0.7;
                this.volumeChart.applyOptions({
                    width: parentWidth,
                    height: chartHeight
                });
            }
        });
    }

    // 初始化指標圖表
    initIndicatorsChart() {
        // 創建指標圖表容器
        const indicatorsElement = document.getElementById('indicators-chart');
        if (!indicatorsElement) {
            console.warn('找不到指標圖表容器元素 #indicators-chart');
            return;
        }

        // 獲取父容器尺寸以設定圖表大小
        const parentWidth = indicatorsElement.parentElement ? indicatorsElement.parentElement.clientWidth : window.innerWidth * 0.7;
        const chartHeight = 150; // 指標圖表高度
        
        this.indicatorsChart = LightweightCharts.createChart(indicatorsElement, {
            width: parentWidth,
            height: chartHeight,
            timeScale: {
                borderColor: '#333',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: '#333',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            grid: {
                vertLines: {
                    color: 'rgba(42, 46, 57, 0)',
                },
                horzLines: {
                    color: 'rgba(42, 46, 57, 0.4)',
                },
            },
            layout: {
                backgroundColor: '#13151a',
                textColor: '#d1d4dc',
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    color: '#505050',
                },
                horzLine: {
                    color: '#505050',
                },
            },
        });
        
        // 創建價格速度序列 (第一導數)
        this.velocitySeries = this.indicatorsChart.addLineSeries({
            color: '#4caf50',
            lineWidth: 2,
            title: '速度',
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });
        
        // 創建價格加速度序列 (第二導數)
        this.accelerationSeries = this.indicatorsChart.addLineSeries({
            color: '#e91e63',
            lineWidth: 2,
            title: '加速度',
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });
        
        // 創建價格曲率序列
        this.curvatureSeries = this.indicatorsChart.addLineSeries({
            color: '#FFB74D',
            lineWidth: 2,
            title: '曲率',
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: {
                type: 'price',
                precision: 4,
                minMove: 0.0001,
            },
        });
        
        // 創建價格彈性序列
        this.elasticitySeries = this.indicatorsChart.addLineSeries({
            color: '#64B5F6',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            title: '彈性',
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });
        
        // 創建布林帶寬度序列
        this.bandwidthSeries = this.indicatorsChart.addLineSeries({
            color: '#9C27B0', // 紫色
            lineWidth: 2,
            title: '布林帶寬度',
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });
        
        // 創建波動率序列
        this.volatilitySeries = this.indicatorsChart.addLineSeries({
            color: '#FF9800', // 橙色
            lineWidth: 2,
            title: '波動率',
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });
        
        // 添加訂閱以便與其他圖表同步
        this.indicatorsChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (this.shouldSyncCharts) {
                this.syncCharts(this.indicatorsChart);
            }
        });
        
        // 可能的懸停工具提示設置
        try {
            if (window.CustomTooltip) {
                this.indicatorsTooltip = new CustomTooltip({
                    container: document.getElementById('indicators-chart'),
                    chart: this.indicatorsChart
                });
            }
        } catch (error) {
            console.warn('無法初始化指標圖表工具提示:', error);
        }
        
        // 調整圖表大小響應窗口變化
        window.addEventListener('resize', () => {
            const chartElement = document.getElementById('indicators-chart');
            if (chartElement && this.indicatorsChart) {
                this.indicatorsChart.applyOptions({
                    width: chartElement.clientWidth,
                });
            }
        });

        // 讓圖表響應容器大小變化
        window.addEventListener('resize', () => {
            if (this.indicatorsChart && indicatorsElement) {
                const parentWidth = indicatorsElement.parentElement ? indicatorsElement.parentElement.clientWidth : window.innerWidth * 0.7;
                this.indicatorsChart.applyOptions({
                    width: parentWidth,
                    height: chartHeight
                });
            }
        });
    }
    
    // 初始化高級指標面板
    initAdvancedIndicatorsPanel() {
        const chartElement = document.getElementById('advanced-indicators');
        if (!chartElement) return;
        
        this.advancedIndicatorsChart = LightweightCharts.createChart(chartElement, {
            layout: {
                background: { type: 'solid', color: '#1E1E1E' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
            },
            timeScale: {
                borderColor: '#2B2B43',
                visible: true,
                timeVisible: true,
                secondsVisible: false,
            },
            handleScale: true,  // 允許縮放
            handleScroll: true, // 允許滾動
        });
        
        // 訂單簿梯度指標 - 買方壓力
        this.buyGradientSeries = this.advancedIndicatorsChart.addHistogramSeries({
            color: 'rgba(76, 175, 80, 0.5)',
            priceFormat: {
                type: 'price',
                precision: 2,
            },
            priceScaleId: 'right',
            title: '買方壓力',
        });
        
        // 訂單簿梯度指標 - 賣方壓力
        this.sellGradientSeries = this.advancedIndicatorsChart.addHistogramSeries({
            color: 'rgba(255, 82, 82, 0.5)',
            priceFormat: {
                type: 'price',
                precision: 2,
            },
            priceScaleId: 'right',
            title: '賣方壓力',
        });
        
        // 價格彈性指標
        this.elasticitySeries = this.advancedIndicatorsChart.addLineSeries({
            color: '#29B6F6',
            lineWidth: 2,
            title: '價格彈性',
            priceScaleId: 'left',
        });
        
        // 讓圖表響應容器大小變化
        window.addEventListener('resize', () => {
            if (this.advancedIndicatorsChart) {
                this.advancedIndicatorsChart.applyOptions({
                    width: chartElement.clientWidth,
                    height: chartElement.clientHeight,
                });
            }
        });
    }
    
    // 設置圖表同步功能
    setupChartSync() {
        this.syncEnabled = true;
        this.isSyncing = false;
        this.lastSyncTime = 0;
        this.syncThrottleTime = 120; // 增加到120毫秒以降低更新頻率
        this.pendingSync = null; // 追蹤待處理的同步操作
        this.syncScheduled = false; // 是否已排程同步
        this.syncCount = 0; // 同步次數計數器
        this.syncMonitorEnabled = false; // 性能監控開關
        
        console.log('圖表同步設置初始化完成');
        
        // 為主價格圖表添加事件監聽器
        if (this.priceChart) {
            this.priceChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
                if (!range || !this.syncEnabled) return;
                
                // 記錄來源圖表，防止循環觸發
                this.scheduleSync(range, 'price');
            });
        }
        
        // 為其他圖表添加事件監聽器，但設置不同的來源標識
        if (this.volumeChart) {
            this.volumeChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
                if (!range || !this.syncEnabled || this.isSyncing) return;
                this.scheduleSync(range, 'volume');
            });
        }
        
        if (this.indicatorsChart) {
            this.indicatorsChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
                if (!range || !this.syncEnabled || this.isSyncing) return;
                this.scheduleSync(range, 'indicators');
            });
        }
        
        if (this.advancedIndicatorsChart) {
            this.advancedIndicatorsChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
                if (!range || !this.syncEnabled || this.isSyncing) return;
                this.scheduleSync(range, 'advanced');
            });
        }
        
        // 添加同步控制按鈕
        const syncButton = document.getElementById('sync-charts-button');
        if (syncButton) {
            syncButton.addEventListener('click', () => {
                this.toggleChartSync();
            });
        }
    }

    // 智能排程同步操作，使用更高效的策略
    scheduleSync(range, source) {
        // 取消之前排程的同步
        if (this.pendingSync) {
            cancelAnimationFrame(this.pendingSync);
            this.pendingSync = null;
        }
        
        // 檢查節流條件
        const now = performance.now();
        if (now - this.lastSyncTime < this.syncThrottleTime) {
            // 如果同步請求過於頻繁，延遲到下一幀執行
            if (!this.syncScheduled) {
                this.syncScheduled = true;
                this.pendingSync = requestAnimationFrame(() => {
                    this.lastSyncTime = performance.now();
                    this.performSync(range, source);
                    this.syncScheduled = false;
                    this.pendingSync = null;
                });
            }
            return;
        }
        
        // 直接在下一幀執行同步
        this.lastSyncTime = now;
        this.pendingSync = requestAnimationFrame(() => {
            this.performSync(range, source);
            this.pendingSync = null;
        });
    }

    // 執行同步操作
    performSync(range, source) {
        // 如果已經在同步或同步被禁用，不執行
        if (!this.syncEnabled || this.isSyncing) return;
        
        // 開始同步操作
        if (this.syncMonitorEnabled) {
            console.time('chart-sync');
            this.syncCount++;
        }
        
        this.syncVisibleRange(range, source);
        
        if (this.syncMonitorEnabled && this.syncCount % 10 === 0) {
            console.log(`已執行 ${this.syncCount} 次圖表同步`);
        }
    }

    // 切換圖表同步狀態
    toggleChartSync(enabled) {
        const wasEnabled = this.syncEnabled;
        this.syncEnabled = enabled !== undefined ? enabled : !this.syncEnabled;
        
        // 更新UI
        const syncButton = document.getElementById('sync-charts-button');
        if (syncButton) {
            syncButton.classList.toggle('active', this.syncEnabled);
            syncButton.textContent = this.syncEnabled ? '圖表同步：開' : '圖表同步：關';
        }
        
        // 如果切換到啟用狀態，且之前是禁用狀態，立即同步一次
        if (this.syncEnabled && !wasEnabled && this.priceChart) {
            try {
                const range = this.priceChart.timeScale().getVisibleLogicalRange();
                if (range) {
                    // 使用較長的延遲確保UI先更新
                    setTimeout(() => {
                        if (this.syncEnabled) {
                            this.performSync(range, 'toggle');
                        }
                    }, 200);
                }
            } catch (error) {
                console.error('圖表同步切換時出錯:', error);
            }
        }
        
        return this.syncEnabled;
    }

    // 同步所有圖表的可視範圍
    syncVisibleRange(range, source) {
        // 再次檢查同步條件
        if (!this.syncEnabled || this.isSyncing) return;
        
        // 設置同步標誌以防止循環調用
        this.isSyncing = true;
        
        try {
            // 如果未提供範圍，嘗試從價格圖表獲取當前範圍
            if (!range && this.priceChart) {
                range = this.priceChart.timeScale().getVisibleLogicalRange();
            }
            
            if (!range) {
                this.isSyncing = false;
                return;
            }
            
            // 保存範圍的深拷貝以避免引用問題
            const rangeToSync = {
                from: range.from,
                to: range.to
            };
            
            // 使用微任務來優化同步過程
            queueMicrotask(() => {
                // 創建要同步的圖表清單，排除來源圖表以避免無謂的更新
                const chartsToSync = [];
                
                if (this.priceChart && source !== 'price') {
                    chartsToSync.push({
                        chart: this.priceChart,
                        name: 'price'
                    });
                }
                
                if (this.volumeChart && source !== 'volume') {
                    chartsToSync.push({
                        chart: this.volumeChart,
                        name: 'volume'
                    });
                }
                
                if (this.indicatorsChart && source !== 'indicators') {
                    chartsToSync.push({
                        chart: this.indicatorsChart,
                        name: 'indicators'
                    });
                }
                
                if (this.advancedIndicatorsChart && source !== 'advanced') {
                    chartsToSync.push({
                        chart: this.advancedIndicatorsChart,
                        name: 'advanced'
                    });
                }
                
                if (this.gradientChart && source !== 'gradient') {
                    chartsToSync.push({
                        chart: this.gradientChart,
                        name: 'gradient'
                    });
                }
                
                // 如果沒有圖表需要同步，直接結束
                if (chartsToSync.length === 0) {
                    this.isSyncing = false;
                    return;
                }
                
                // 使用分時執行的方式同步圖表，每個圖表在單獨的幀中更新
                let index = 0;
                
                const syncNextChart = () => {
                    if (index < chartsToSync.length) {
                        const { chart, name } = chartsToSync[index];
                        
                        try {
                            if (this.syncMonitorEnabled) {
                                console.time(`sync-${name}-chart`);
                            }
                            
                            chart.timeScale().setVisibleLogicalRange(rangeToSync);
                            
                            if (this.syncMonitorEnabled) {
                                console.timeEnd(`sync-${name}-chart`);
                            }
                        } catch (err) {
                            console.warn(`同步 ${name} 圖表時出錯:`, err);
                        }
                        
                        index++;
                        // 使用 setTimeout 確保瀏覽器有時間進行渲染
                        setTimeout(syncNextChart, 0);
                    } else {
                        // 所有圖表同步完成，重置同步標誌
                        setTimeout(() => {
                            if (this.syncMonitorEnabled) {
                                console.timeEnd('chart-sync');
                            }
                            this.isSyncing = false;
                        }, 50);
                    }
                };
                
                // 開始同步第一個圖表
                syncNextChart();
            });
        } catch (error) {
            console.error('同步圖表時發生錯誤:', error);
            this.isSyncing = false;
        }
    }

    // 啟用/禁用性能監控
    toggleSyncMonitor(enabled) {
        this.syncMonitorEnabled = enabled !== undefined ? enabled : !this.syncMonitorEnabled;
        console.log(`圖表同步性能監控: ${this.syncMonitorEnabled ? '開啟' : '關閉'}`);
        
        if (this.syncMonitorEnabled) {
            this.syncCount = 0;
        }
        
        return this.syncMonitorEnabled;
    }

    // 更新價格圖表
    updatePriceChart(data) {
        if (!this.candleSeries) return;

        const formattedData = data.map(item => ({
            time: Math.floor(new Date(item.timestamp).getTime() / 1000),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));

        this.candleSeries.setData(formattedData);
        
        // 更新趨勢拐點標記
        this.updateInflectionMarkers(data);
        
        // 更新最新價格顯示
        if (formattedData.length > 0) {
            const lastPrice = formattedData[formattedData.length - 1].close;
            document.getElementById('last-price').textContent = `$ ${lastPrice.toFixed(2)}`;
        }
        
        // 數據更新後同步可視範圍
        this.syncVisibleRange();
    }

    // 更新趨勢拐點標記
    updateInflectionMarkers(data) {
        if (!this.inflectionMarkers) return;

        // 根據二階導數計算趨勢拐點
        const markers = [];
        for (let i = 3; i < data.length - 3; i++) {
            const acceleration = data[i].price_acceleration || 0;
            const prevAcceleration = data[i-1].price_acceleration || 0;
            const velocity = data[i].price_velocity || 0;
            
            // 當二階導數從負轉正，且一階導數為正，標記為上漲拐點
            if (prevAcceleration < 0 && acceleration > 0 && velocity > 0) {
                markers.push({
                    time: Math.floor(new Date(data[i].timestamp).getTime() / 1000),
                    position: 'belowBar',
                    color: '#4CAF50',
                    shape: 'arrowUp',
                    text: '買入信號'
                });
            }
            
            // 當二階導數從正轉負，且一階導數為負，標記為下跌拐點
            if (prevAcceleration > 0 && acceleration < 0 && velocity < 0) {
                markers.push({
                    time: Math.floor(new Date(data[i].timestamp).getTime() / 1000),
                    position: 'aboveBar',
                    color: '#FF5252',
                    shape: 'arrowDown',
                    text: '賣出信號'
                });
            }
        }

        this.inflectionMarkers.setMarkers(markers);
    }
    
    // 更新極限點預測標記
    // 不再使用標記方式，而是使用線條圖表顯示極限點預測
    updateExtremePointPredictions(data) {
        // 不再使用 extremePointMarkers，改用線條系列顯示預測
        if (!this.topPredictionSeries || !this.bottomPredictionSeries || !data || data.length === 0) return;
        
        // 存儲預測點
        const topPredictions = [];
        const bottomPredictions = [];
        
        // 尋找潛在的頂部和底部
        for (let i = 5; i < data.length; i++) {
            if (data[i].potential_top !== null) {
                topPredictions.push({
                    time: Math.floor(new Date(data[i].timestamp).getTime() / 1000),
                    value: data[i].potential_top
                });
            }
            
            if (data[i].potential_bottom !== null) {
                bottomPredictions.push({
                    time: Math.floor(new Date(data[i].timestamp).getTime() / 1000),
                    value: data[i].potential_bottom
                });
            }
        }
        
        // 更新線條序列
        this.topPredictionSeries.setData(topPredictions);
        this.bottomPredictionSeries.setData(bottomPredictions);
        
        // 更新 UI 中的預測顯示
        if (topPredictions.length > 0) {
            const lastTopPrediction = topPredictions[topPredictions.length - 1];
            const topElement = document.querySelector('.top-prediction');
            if (topElement) {
                const distanceInBars = 7; // 以模擬數據距離替代
                topElement.textContent = `$${lastTopPrediction.value.toFixed(0)} (距今約${distanceInBars}根K線)`;
            }
        }
        
        if (bottomPredictions.length > 0) {
            const lastBottomPrediction = bottomPredictions[bottomPredictions.length - 1];
            const bottomElement = document.querySelector('.bottom-prediction');
            if (bottomElement) {
                const distanceInBars = 5; // 以模擬數據距離替代
                bottomElement.textContent = `$${lastBottomPrediction.value.toFixed(0)} (距今約${distanceInBars}根K線)`;
            }
        }
    }
    
    // 添加預測區域
    addPredictionArea(dataPoint, isTop) {
        // 這裡僅通過標記顯示，實際項目中可以使用更複雜的形狀來表示預測區域
        // 如矩形、橢圓等來表示潛在的頂部/底部區域
    }

    // 更新交易量圖表
    updateVolumeChart(data) {
        if (!this.volumeSeries) return;

        const formattedData = data.map(item => ({
            time: Math.floor(new Date(item.timestamp).getTime() / 1000),
            value: item.volume,
            color: item.close > item.open ? '#4caf50' : '#ff4d4d'
        }));

        this.volumeSeries.setData(formattedData);
    }

    // 更新指標圖表
    updateIndicatorsChart(data) {
        if (!data || data.length === 0) {
            console.warn('沒有可用的指標數據');
            return;
        }
        
        try {
            // 轉換價格速度數據
            const velocityData = data.map(item => ({
                time: new Date(item.timestamp).getTime() / 1000,
                value: item.price_velocity || 0
            }));
            this.velocitySeries.setData(velocityData);
            
            // 轉換價格加速度數據
            const accelerationData = data.map(item => ({
                time: new Date(item.timestamp).getTime() / 1000,
                value: item.price_acceleration || 0
            }));
            this.accelerationSeries.setData(accelerationData);
            
            // 轉換價格曲率數據
            const curvatureData = data.map(item => ({
                time: new Date(item.timestamp).getTime() / 1000,
                value: item.curvature || 0
            }));
            this.curvatureSeries.setData(curvatureData);
            
            // 轉換價格彈性數據
            const elasticityData = data.map(item => ({
                time: new Date(item.timestamp).getTime() / 1000,
                value: item.price_elasticity || 0
            }));
            this.elasticitySeries.setData(elasticityData);
            
            // 轉換布林帶寬度數據
            const bandwidthData = data.map(item => ({
                time: new Date(item.timestamp).getTime() / 1000,
                value: item.bollinger_bandwidth || 0
            })).filter(item => item.value !== 0);
            this.bandwidthSeries.setData(bandwidthData);
            
            // 轉換波動率數據
            const volatilityData = data.map(item => ({
                time: new Date(item.timestamp).getTime() / 1000,
                value: item.volatility || 0
            })).filter(item => item.value !== 0);
            this.volatilitySeries.setData(volatilityData);
            
            // 更新圖表渲染
            this.indicatorsChart.applyOptions({
                watermark: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    visible: true,
                    text: '衍生指標圖表',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 24,
                }
            });
        } catch (error) {
            console.error('更新指標圖表時出錯:', error);
        }
    }
    
    // 更新高級指標面板
    updateAdvancedIndicatorsPanel(data) {
        // 檢查是否有最新數據
        if (!data || data.length === 0) return;
        
        const lastData = data[data.length - 1];
        
        // 更新曲率值顯示
        this.updateIndicatorValue('curvature-value', lastData.curvature, value => {
            let status = '';
            if (value > 0.1) status = '急劇轉折';
            else if (value > 0.05) status = '中度轉折';
            else status = '平穩趨勢';
            
            // 更新顏色
            const element = document.getElementById('curvature-value');
            if (element) {
                if (value > 0.1) element.className = 'signal-value negative';
                else if (value > 0.05) element.className = 'signal-value neutral';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(4)} (${status})`;
        });
        
        // 更新價格彈性值顯示
        this.updateIndicatorValue('elasticity-value', lastData.price_elasticity, value => {
            let status = '';
            if (value > 0.5) status = '高彈性-流動性差';
            else if (value > 0) status = '正常彈性';
            else if (value > -0.5) status = '低彈性-流動性好';
            else status = '極低彈性';
            
            // 更新顏色
            const element = document.getElementById('elasticity-value');
            if (element) {
                if (Math.abs(value) > 0.5) element.className = 'signal-value negative';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(2)} (${status})`;
        });
        
        // 更新市場熵值顯示
        this.updateIndicatorValue('entropy-value', lastData.market_entropy, value => {
            let status = '';
            if (value > 0.7) status = '高度混沌';
            else if (value > 0.4) status = '中度無序';
            else status = '有序市場';
            
            // 更新顏色
            const element = document.getElementById('entropy-value');
            if (element) {
                if (value > 0.7) element.className = 'signal-value negative';
                else if (value > 0.4) element.className = 'signal-value neutral';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(2)} (${status})`;
        });
        
        // 更新布林帶寬度顯示
        this.updateIndicatorValue('bandwidth-value', lastData.bollinger_bandwidth, value => {
            let status = '';
            if (value > 4) status = '高度波動';
            else if (value > 2) status = '中度波動';
            else status = '低波動期';
            
            // 更新顏色
            const element = document.getElementById('bandwidth-value');
            if (element) {
                if (value > 4) element.className = 'signal-value negative';
                else if (value > 2) element.className = 'signal-value neutral';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(2)} (${status})`;
        });
        
        // 更新波動率值顯示
        this.updateIndicatorValue('volatility-value', lastData.volatility, value => {
            let status = '';
            if (value > 2.5) status = '高波動';
            else if (value > 1.5) status = '中度波動';
            else status = '正常波動';
            
            // 更新顏色
            const element = document.getElementById('volatility-value');
            if (element) {
                if (value > 2.5) element.className = 'signal-value negative';
                else if (value > 1.5) element.className = 'signal-value neutral';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(2)}% (${status})`;
        });
        
        // 更新布林帶狀態
        this.updateBollingerState(data);
        
        // 更新訂單簿梯度顯示
        if (lastData.orderbook_gradient) {
            const buyPressure = lastData.orderbook_gradient.buyGradient;
            const sellPressure = lastData.orderbook_gradient.sellGradient;
            
            this.updateIndicatorValue('gradient-value', {buy: buyPressure, sell: sellPressure}, value => {
                let status = '';
                if (value.buy > value.sell + 0.2) status = '買方壓力大';
                else if (value.sell > value.buy + 0.2) status = '賣方壓力大';
                else status = '買賣平衡';
                
                // 更新顏色
                const element = document.getElementById('gradient-value');
                if (element) {
                    if (value.buy > value.sell + 0.2) element.className = 'signal-value positive';
                    else if (value.sell > value.buy + 0.2) element.className = 'signal-value negative';
                    else element.className = 'signal-value neutral';
                }
                
                return `${(value.buy / (value.buy + value.sell) * 100).toFixed(1)}% (${status})`;
            });
        }
    }

    // 更新布林帶狀態指示器
    updateBollingerState(data) {
        if (!data || data.length < 30) return;
        
        // 獲取最近幾個周期的布林帶寬度數據
        const recentData = data.slice(-20);
        const bandwidthValues = recentData.map(item => item.bollinger_bandwidth).filter(val => val != null);
        
        if (bandwidthValues.length < 5) return;
        
        // 檢查是否處於壓縮(擠壓)狀態
        const current = bandwidthValues[bandwidthValues.length - 1];
        const max = Math.max(...bandwidthValues.slice(0, -1));
        const min = Math.min(...bandwidthValues.slice(0, -1));
        const average = bandwidthValues.reduce((a, b) => a + b, 0) / bandwidthValues.length;
        
        // 判斷布林帶狀態
        const stateElement = document.getElementById('bollinger-state');
        if (!stateElement) return;
        
        // 檢查趨勢方向
        const trend = this.getBollingerTrend(bandwidthValues);
        
        if (current < average * 0.7) {
            // 壓縮狀態
            stateElement.textContent = "擠壓狀態 (突破預警)";
            stateElement.className = "signal-value neutral";
        } else if (current > max * 1.2) {
            // 膨脹狀態
            stateElement.textContent = "膨脹狀態 (高波動)";
            stateElement.className = "signal-value negative";
        } else if (trend === 'increasing') {
            // 擴張趨勢
            stateElement.textContent = "寬度擴張 (波動增加中)";
            stateElement.className = "signal-value neutral";
        } else if (trend === 'decreasing') {
            // 收縮趨勢
            stateElement.textContent = "寬度收縮 (趨於穩定)";
            stateElement.className = "signal-value positive";
        } else {
            // 中性狀態
            stateElement.textContent = "正常波動 (中性)";
            stateElement.className = "signal-value neutral";
        }
    }

    // 獲取布林帶趨勢方向
    getBollingerTrend(values) {
        if (values.length < 5) return 'neutral';
        
        // 使用簡單線性回歸分析趨勢
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        
        for (let i = 0; i < values.length; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumXX += i * i;
        }
        
        const n = values.length;
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        // 根據斜率判斷趨勢
        if (slope > 0.05) return 'increasing';
        else if (slope < -0.05) return 'decreasing';
        else return 'neutral';
    }

    // 新增方法：更新買賣壓力比例指示器
    updateGradientRatio(gradientData) {
        if (!gradientData || !gradientData.ratio) return;
        
        const ratio = gradientData.ratio;
        const gradientRatioEl = document.getElementById('gradient-ratio');
        if (!gradientRatioEl) return;
        
        // 設置比例值
        gradientRatioEl.textContent = ratio.toFixed(2);
        
        // 根據比例設置顏色
        if (ratio > 1.2) {
            // 買方壓力更大
            gradientRatioEl.className = 'signal-value positive';
        } else if (ratio < 0.8) {
            // 賣方壓力更大
            gradientRatioEl.className = 'signal-value negative';
        } else {
            // 買賣平衡
            gradientRatioEl.className = 'signal-value neutral';
        }
    }

    // 更新訂單簿
    updateOrderbook(data) {
        if (!data || !data.asks || !data.bids) {
            console.warn('訂單簿數據無效或不完整');
            return;
        }
        
        const asksContainer = document.getElementById('orderbook-asks');
        const bidsContainer = document.getElementById('orderbook-bids');
        
        if (!asksContainer || !bidsContainer) {
            console.warn('找不到訂單簿容器元素');
            return;
        }
        
        // 清空現有內容
        asksContainer.innerHTML = '';
        bidsContainer.innerHTML = '';
        
        // 格式化數據
        const asks = data.asks.map(item => {
            if (!Array.isArray(item) || item.length < 2) {
                return null;
            }
            return {
                price: parseFloat(item[0]),
                quantity: parseFloat(item[1])
            };
        }).filter(item => item !== null);
        
        const bids = data.bids.map(item => {
            if (!Array.isArray(item) || item.length < 2) {
                return null;
            }
            return {
                price: parseFloat(item[0]),
                quantity: parseFloat(item[1])
            };
        }).filter(item => item !== null);
        
        // 如果沒有有效的數據，返回
        if (asks.length === 0 && bids.length === 0) {
            console.warn('沒有有效的訂單簿數據');
            return;
        }
        
        // 顯示賣單（倒序，最低價在底部）
        asks.reverse().forEach(ask => {
            if (!ask || typeof ask.price !== 'number' || typeof ask.quantity !== 'number' || isNaN(ask.price) || isNaN(ask.quantity)) {
                return;
            }
            
            const row = document.createElement('div');
            row.className = 'orderbook-row ask-row';
            row.innerHTML = `
                <span>${ask.price.toFixed(2)}</span>
                <span>${ask.quantity.toFixed(4)}</span>
                <span>${(ask.price * ask.quantity).toFixed(2)}</span>
            `;
            asksContainer.appendChild(row);
        });
        
        // 顯示買單
        bids.forEach(bid => {
            if (!bid || typeof bid.price !== 'number' || typeof bid.quantity !== 'number' || isNaN(bid.price) || isNaN(bid.quantity)) {
                return;
            }
            
            const row = document.createElement('div');
            row.className = 'orderbook-row bid-row';
            row.innerHTML = `
                <span>${bid.price.toFixed(2)}</span>
                <span>${bid.quantity.toFixed(4)}</span>
                <span>${(bid.price * bid.quantity).toFixed(2)}</span>
            `;
            bidsContainer.appendChild(row);
        });
    }
    
    // 更新高級指標數據顯示
    updateAdvancedIndicatorsPanel(data) {
        // 檢查是否有最新數據
        if (!data || data.length === 0) return;
        
        const lastData = data[data.length - 1];
        
        // 更新曲率值顯示
        this.updateIndicatorValue('curvature-value', lastData.curvature, value => {
            let status = '';
            if (value > 0.1) status = '急劇轉折';
            else if (value > 0.05) status = '中度轉折';
            else status = '平穩趨勢';
            
            // 更新顏色
            const element = document.getElementById('curvature-value');
            if (element) {
                if (value > 0.1) element.className = 'signal-value negative';
                else if (value > 0.05) element.className = 'signal-value neutral';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(4)} (${status})`;
        });
        
        // 更新價格彈性值顯示
        this.updateIndicatorValue('elasticity-value', lastData.price_elasticity, value => {
            let status = '';
            if (value > 0.5) status = '高彈性-流動性差';
            else if (value > 0) status = '正常彈性';
            else if (value > -0.5) status = '低彈性-流動性好';
            else status = '極低彈性';
            
            // 更新顏色
            const element = document.getElementById('elasticity-value');
            if (element) {
                if (Math.abs(value) > 0.5) element.className = 'signal-value negative';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(2)} (${status})`;
        });
        
        // 更新市場熵值顯示
        this.updateIndicatorValue('entropy-value', lastData.market_entropy, value => {
            let status = '';
            if (value > 0.7) status = '高度混沌';
            else if (value > 0.4) status = '中度無序';
            else status = '有序市場';
            
            // 更新顏色
            const element = document.getElementById('entropy-value');
            if (element) {
                if (value > 0.7) element.className = 'signal-value negative';
                else if (value > 0.4) element.className = 'signal-value neutral';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(2)} (${status})`;
        });
        
        // 更新布林帶寬度顯示
        this.updateIndicatorValue('bandwidth-value', lastData.bollinger_bandwidth, value => {
            let status = '';
            if (value > 4) status = '高度波動';
            else if (value > 2) status = '中度波動';
            else status = '低波動期';
            
            // 更新顏色
            const element = document.getElementById('bandwidth-value');
            if (element) {
                if (value > 4) element.className = 'signal-value negative';
                else if (value > 2) element.className = 'signal-value neutral';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(2)} (${status})`;
        });
        
        // 更新波動率值顯示
        this.updateIndicatorValue('volatility-value', lastData.volatility, value => {
            let status = '';
            if (value > 2.5) status = '高波動';
            else if (value > 1.5) status = '中度波動';
            else status = '正常波動';
            
            // 更新顏色
            const element = document.getElementById('volatility-value');
            if (element) {
                if (value > 2.5) element.className = 'signal-value negative';
                else if (value > 1.5) element.className = 'signal-value neutral';
                else element.className = 'signal-value positive';
            }
            
            return `${value.toFixed(2)}% (${status})`;
        });
        
        // 更新布林帶狀態
        this.updateBollingerState(data);
        
        // 更新訂單簿梯度顯示
        if (lastData.orderbook_gradient) {
            const buyPressure = lastData.orderbook_gradient.buyGradient;
            const sellPressure = lastData.orderbook_gradient.sellGradient;
            
            this.updateIndicatorValue('gradient-value', {buy: buyPressure, sell: sellPressure}, value => {
                let status = '';
                if (value.buy > value.sell + 0.2) status = '買方壓力大';
                else if (value.sell > value.buy + 0.2) status = '賣方壓力大';
                else status = '買賣平衡';
                
                // 更新顏色
                const element = document.getElementById('gradient-value');
                if (element) {
                    if (value.buy > value.sell + 0.2) element.className = 'signal-value positive';
                    else if (value.sell > value.buy + 0.2) element.className = 'signal-value negative';
                    else element.className = 'signal-value neutral';
                }
                
                return `${(value.buy / (value.buy + value.sell) * 100).toFixed(1)}% (${status})`;
            });
        }
    }
    
    // 更新指標值
    updateIndicatorValue(elementId, value, formatter) {
        const element = document.getElementById(elementId);
        if (element && value !== undefined && value !== null) {
            element.textContent = formatter(value);
        }
    }

    // 設置圖表自動適配容器大小
    fitAllCharts() {
        // 如果正在進行同步，不執行適配操作
        if (this.isSyncing) return;
        
        // 暫時禁用同步功能，避免適配過程中觸發同步
        const wasSyncEnabled = this.syncEnabled;
        this.syncEnabled = false;
        
        try {
            console.log('開始適配所有圖表數據...');
            
            // 主圖表適配
            if (this.priceChart) {
                this.priceChart.timeScale().fitContent();
            }
            
            // 適配其他圖表
            setTimeout(() => {
                if (this.volumeChart) {
                    this.volumeChart.timeScale().fitContent();
                }
                
                setTimeout(() => {
                    if (this.indicatorsChart) {
                        this.indicatorsChart.timeScale().fitContent();
                    }
                    
                    setTimeout(() => {
                        if (this.advancedIndicatorsChart) {
                            this.advancedIndicatorsChart.timeScale().fitContent();
                        }
                        
                        // 所有圖表適配完成，恢復同步功能
                        setTimeout(() => {
                            console.log('圖表適配完成');
                            
                            // 恢復先前的同步狀態
                            this.syncEnabled = wasSyncEnabled;
                            
                            // 如果之前啟用了同步，則執行一次同步操作
                            if (wasSyncEnabled && this.priceChart) {
                                const range = this.priceChart.timeScale().getVisibleLogicalRange();
                                if (range) {
                                    this.performSync(range, 'fit');
                                }
                            }
                        }, 50);
                    }, 30);
                }, 30);
            }, 30);
        } catch (error) {
            console.error('適配圖表時出錯:', error);
            // 發生錯誤時仍然恢復同步狀態
            this.syncEnabled = wasSyncEnabled;
        }
    }

    // 更新圖表數據
    updateChartData(data) {
        if (!data) return;
        
        // 更新K線數據
        if (data.price_data && this.candleSeries) {
            const formattedCandles = data.price_data.map(candle => ({
                time: new Date(candle.timestamp).getTime() / 1000,
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close)
            }));
            this.candleSeries.setData(formattedCandles);
        }
        
        // 更新交易量數據
        if (data.price_data && this.volumeSeries) {
            const formattedVolumes = data.price_data.map(candle => {
                const isGreen = parseFloat(candle.close) >= parseFloat(candle.open);
                return {
                    time: new Date(candle.timestamp).getTime() / 1000,
                    value: parseFloat(candle.volume),
                    color: isGreen ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)'
                };
            });
            this.volumeSeries.setData(formattedVolumes);
        }
        
        // 更新價格導數數據（一階和二階）
        if (data.derivatives) {
            // 一階導數（價格變化率）
            if (data.derivatives.price_velocity && this.velocitySeries) {
                const velocityData = data.derivatives.price_velocity.map(point => ({
                    time: new Date(point.time).getTime() / 1000,
                    value: parseFloat(point.value)
                }));
                this.velocitySeries.setData(velocityData);
            }
            
            // 二階導數（價格加速度）
            if (data.derivatives.price_acceleration && this.accelerationSeries) {
                const accelerationData = data.derivatives.price_acceleration.map(point => ({
                    time: new Date(point.time).getTime() / 1000,
                    value: parseFloat(point.value)
                }));
                this.accelerationSeries.setData(accelerationData);
            }
            
            // 價格彈性
            if (data.derivatives.price_elasticity && this.elasticitySeries) {
                const elasticityData = data.derivatives.price_elasticity.map(point => {
                    return {
                        time: new Date(point.time).getTime() / 1000,
                        value: parseFloat(point.value)
                    };
                });
                this.elasticitySeries.setData(elasticityData);
            }
            
            // 價格曲率
            if (data.derivatives.price_curvature && this.curvatureSeries) {
                const curvatureData = data.derivatives.price_curvature.map(point => {
                    const value = parseFloat(point.value);
                    let color;
                    
                    // 根據曲率值選擇顏色，從綠色（低曲率）到紅色（高曲率）
                    if (value > 0.1) {
                        color = '#FF5252'; // 高曲率 - 紅色
                    } else if (value > 0.05) {
                        color = '#FF9800'; // 中等曲率 - 橙色
                    } else if (value > 0.02) {
                        color = '#FFC107'; // 低曲率 - 黃色
                    } else {
                        color = '#8BC34A'; // 極低曲率 - 綠色
                    }
                    
                    return {
                        time: new Date(point.time).getTime() / 1000,
                        value: value,
                        color: color
                    };
                });
                this.curvatureSeries.setData(curvatureData);
            }
        }
        
        // 更新拐點標記
        if (data.inflection_points && this.inflectionMarkers) {
            const markers = data.inflection_points.map(point => {
                const time = new Date(point.timestamp).getTime() / 1000;
                const price = parseFloat(point.price);
                const isBuy = point.signal === 'buy';
                
                return {
                    time,
                    position: isBuy ? 'belowBar' : 'aboveBar',
                    color: isBuy ? '#4CAF50' : '#FF5252',
                    shape: isBuy ? 'arrowUp' : 'arrowDown',
                    text: isBuy ? '買入信號' : '賣出信號'
                };
            });
            
            this.inflectionMarkers.setMarkers(markers);
        }
        
        // 所有數據更新完成後進行同步
        if (this.syncEnabled) {
            // 延遲執行同步，確保圖表已經更新完成
            setTimeout(() => {
                this.fitAllCharts();
            }, 100);
        }
    }

    // 初始化訂單簿梯度圖表
    initGradientChart() {
        this.gradientChart = LightweightCharts.createChart(document.getElementById('gradient-chart'), {
            width: document.getElementById('gradient-chart').clientWidth,
            height: 250,
            layout: {
                backgroundColor: '#141823',
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: {
                    color: 'rgba(42, 46, 57, 0.5)',
                },
                horzLines: {
                    color: 'rgba(42, 46, 57, 0.5)',
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                autoScale: true,
                invertScale: false,
            },
            timeScale: {
                visible: true,  // 使時間軸可見
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(197, 203, 206, 0.8)',
            },
            handleScale: true,  // 允許縮放
            handleScroll: true, // 允許滾動
        });

        // 添加買方梯度系列
        this.bidGradientSeries = this.gradientChart.addHistogramSeries({
            color: 'rgba(38, 166, 154, 0.5)',
            priceFormat: {
                type: 'volume',
            },
            title: '買方梯度',
            priceScaleId: 'right',
        });

        // 添加賣方梯度系列
        this.askGradientSeries = this.gradientChart.addHistogramSeries({
            color: 'rgba(239, 83, 80, 0.5)',
            priceFormat: {
                type: 'volume',
            },
            title: '賣方梯度',
            priceScaleId: 'right',
        });

        // 添加當前價格線
        this.currentPriceLine = this.gradientChart.addLineSeries({
            color: '#FFEB3B',
            lineWidth: 2,
            title: '當前價格',
            lastValueVisible: false,
            priceLineVisible: false,
        });
        
        // 讓圖表響應容器大小變化
        window.addEventListener('resize', () => {
            if (this.gradientChart) {
                this.gradientChart.applyOptions({
                    width: document.getElementById('gradient-chart').clientWidth,
                    height: document.getElementById('gradient-chart').clientHeight || 250,
                });
            }
        });
        
        // 將梯度圖表也加入同步系統
        if (this.priceChart && this.syncEnabled) {
            this.gradientChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                if (!this.syncEnabled || !range || this.isSyncing) return;
                
                try {
                    this.isSyncing = true;
                    this.priceChart.timeScale().setVisibleLogicalRange(range);
                    
                    // 短延遲後重置同步狀態
                    setTimeout(() => {
                        this.isSyncing = false;
                    }, 100);
                } catch (error) {
                    console.error('從梯度圖表同步失敗:', error);
                    this.isSyncing = false;
                }
            });
        }
    }

    // 更新訂單簿梯度圖表
    updateGradientChart(data) {
        if (!data || !data.bid_gradients || !data.ask_gradients) return;

        // 取得當前時間戳，用於時間戳生成
        const now = Math.floor(Date.now() / 1000);
        
        // 處理買方梯度數據
        const bidGradientData = data.bid_gradients.map((item, index) => {
            // 計算顏色強度，基於梯度值的大小
            const normalizedValue = Math.min(1, item.gradient / 20);  // 假設最大梯度值為20
            
            // 檢查是否為關鍵支撐位
            const isKeyLevel = item.is_key_level || false;
            
            // 為關鍵支撐位使用特殊顏色
            let color;
            if (isKeyLevel) {
                // 綠色 + 藍色 = 藍綠色，用於支撐位
                color = `rgba(0, 180, 180, ${0.7 + normalizedValue * 0.3})`;
            } else {
                // 一般買單梯度使用綠色
                color = `rgba(38, 166, 154, ${0.3 + normalizedValue * 0.7})`;
            }
            
            // 使用當前時間戳加上索引，這樣每個價格點都有唯一的時間戳
            const time = now - (data.bid_gradients.length - index);
            
            return {
                time: time,
                value: -1 * item.gradient, // 向下顯示，因此使用負值
                color: color,
                price: item.price,
                isKeyLevel: isKeyLevel
            };
        });

        // 處理賣方梯度數據
        const askGradientData = data.ask_gradients.map((item, index) => {
            // 計算顏色強度，基於梯度值的大小
            const normalizedValue = Math.min(1, item.gradient / 20);
            
            // 檢查是否為關鍵阻力位
            const isKeyLevel = item.is_key_level || false;
            
            // 為關鍵阻力位使用特殊顏色
            let color;
            if (isKeyLevel) {
                // 紅色 + 紫色 = 品紅色，用於阻力位
                color = `rgba(220, 80, 160, ${0.7 + normalizedValue * 0.3})`;
            } else {
                // 一般賣單梯度使用紅色
                color = `rgba(239, 83, 80, ${0.3 + normalizedValue * 0.7})`;
            }
            
            // 使用當前時間戳加上索引，與買方梯度使用相同的時間軸
            const time = now - (data.ask_gradients.length - index);
            
            return {
                time: time,
                value: item.gradient, // 向上顯示，使用正值
                color: color,
                price: item.price,
                isKeyLevel: isKeyLevel
            };
        });

        // 更新圖表
        this.bidGradientSeries.setData(bidGradientData);
        this.askGradientSeries.setData(askGradientData);

        // 獲取當前價格（用買賣訂單的中間價格作為估計）
        if (data.bid_gradients.length > 0 && data.ask_gradients.length > 0) {
            const highestBid = Math.max(...data.bid_gradients.map(item => item.price));
            const lowestAsk = Math.min(...data.ask_gradients.map(item => item.price));
            const midPrice = (highestBid + lowestAsk) / 2;
            
            // 顯示當前價格線，使用相同的時間軸
            const priceLineData = [];
            for (let i = 0; i < Math.max(bidGradientData.length, askGradientData.length); i++) {
                const time = now - i;
                priceLineData.push({
                    time: time,
                    value: midPrice
                });
            }
            
            this.currentPriceLine.setData(priceLineData);
            
            // 更新梯度熱力圖顯示
            this.updateGradientHeatmap(data.bid_gradients, data.ask_gradients, midPrice);
            
            // 提取關鍵支撐位和阻力位
            const keySupports = data.bid_gradients.filter(item => item.is_key_level).map(level => ({
                price: level.price,
                gradient: level.gradient,
                type: 'support'
            }));
            
            const keyResistances = data.ask_gradients.filter(item => item.is_key_level).map(level => ({
                price: level.price,
                gradient: level.gradient,
                type: 'resistance'
            }));
            
            // 更新關鍵水平顯示
            this.updateKeyLevelsDisplay(keySupports, keyResistances, midPrice);
        }

        // 調整價格軸以顯示所有梯度
        const allPrices = [
            ...data.bid_gradients.map(item => item.price),
            ...data.ask_gradients.map(item => item.price)
        ];
        
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const padding = (maxPrice - minPrice) * 0.1;

        this.gradientChart.priceScale('right').setVisibleRange({
            from: minPrice - padding,
            to: maxPrice + padding
        });
        
        // 自動適應時間範圍
        this.gradientChart.timeScale().fitContent();
        
        // 更新買賣壓力比例顯示
        if (data.ratio) {
            this.updateGradientRatio({ ratio: data.ratio });
        }
    }
    
    // 新增方法：更新梯度熱力圖
    updateGradientHeatmap(bidGradients, askGradients, currentPrice) {
        if (!this.gradientHeatmap) {
            const heatmapContainer = document.getElementById('gradient-heatmap');
            if (!heatmapContainer) return;
            
            // 清空容器
            heatmapContainer.innerHTML = '';
            
            // 創建熱力圖顯示
            this.gradientHeatmap = document.createElement('div');
            this.gradientHeatmap.className = 'gradient-heatmap-container';
            heatmapContainer.appendChild(this.gradientHeatmap);
        }
        
        // 清空現有熱力圖
        this.gradientHeatmap.innerHTML = '';
        
        // 計算價格範圍
        const allGradients = [...bidGradients, ...askGradients];
        const priceRange = {
            min: Math.min(...allGradients.map(g => g.price)),
            max: Math.max(...allGradients.map(g => g.price))
        };
        
        // 計算最大梯度值，用於顏色標準化
        const maxBidGradient = Math.max(...bidGradients.map(g => g.gradient));
        const maxAskGradient = Math.max(...askGradients.map(g => g.gradient));
        
        // 創建買方梯度熱力圖
        const bidHeatmap = document.createElement('div');
        bidHeatmap.className = 'gradient-heatmap bid-heatmap';
        
        // 創建賣方梯度熱力圖
        const askHeatmap = document.createElement('div');
        askHeatmap.className = 'gradient-heatmap ask-heatmap';
        
        // 為每個價格層級創建熱力圖方塊
        bidGradients.forEach(gradient => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            // 計算相對位置（相對於價格範圍）
            const position = (gradient.price - priceRange.min) / (priceRange.max - priceRange.min);
            cell.style.bottom = `${position * 100}%`;
            
            // 計算顏色強度
            const intensity = gradient.gradient / maxBidGradient;
            cell.style.backgroundColor = `rgba(38, 166, 154, ${Math.min(0.8, intensity)})`;
            cell.style.width = `${Math.max(20, intensity * 100)}%`;
            
            // 顯示價格和梯度值
            cell.title = `價格: ${gradient.price.toFixed(2)}, 梯度: ${gradient.gradient.toFixed(4)}`;
            
            bidHeatmap.appendChild(cell);
        });
        
        askGradients.forEach(gradient => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            // 計算相對位置
            const position = (gradient.price - priceRange.min) / (priceRange.max - priceRange.min);
            cell.style.bottom = `${position * 100}%`;
            
            // 計算顏色強度
            const intensity = gradient.gradient / maxAskGradient;
            cell.style.backgroundColor = `rgba(239, 83, 80, ${Math.min(0.8, intensity)})`;
            cell.style.width = `${Math.max(20, intensity * 100)}%`;
            
            // 顯示價格和梯度值
            cell.title = `價格: ${gradient.price.toFixed(2)}, 梯度: ${gradient.gradient.toFixed(4)}`;
            
            askHeatmap.appendChild(cell);
        });
        
        // 添加當前價格線
        const priceLine = document.createElement('div');
        priceLine.className = 'current-price-line';
        const pricePosition = (currentPrice - priceRange.min) / (priceRange.max - priceRange.min);
        priceLine.style.bottom = `${pricePosition * 100}%`;
        priceLine.title = `當前價格: ${currentPrice.toFixed(2)}`;
        
        // 將所有元素添加到熱力圖容器
        this.gradientHeatmap.appendChild(bidHeatmap);
        this.gradientHeatmap.appendChild(askHeatmap);
        this.gradientHeatmap.appendChild(priceLine);
    }

    // 更新關鍵價格水平顯示
    updateKeyLevelsDisplay(supports, resistances, currentPrice) {
        if (!this.keyLevelsContainer) {
            // 創建關鍵水平顯示容器
            this.keyLevelsContainer = document.getElementById('key-levels-container');
            if (!this.keyLevelsContainer) {
                // 如果容器不存在，創建一個
                this.keyLevelsContainer = document.createElement('div');
                this.keyLevelsContainer.id = 'key-levels-container';
                this.keyLevelsContainer.className = 'key-levels-container';
                
                // 添加到梯度圖表下方
                const gradientChart = document.getElementById('gradient-chart');
                if (gradientChart && gradientChart.parentNode) {
                    gradientChart.parentNode.insertBefore(this.keyLevelsContainer, gradientChart.nextSibling);
                }
            }
        }
        
        // 清空容器
        this.keyLevelsContainer.innerHTML = '';
        
        // 添加標題
        const title = document.createElement('div');
        title.className = 'key-levels-title';
        title.innerText = '關鍵價格水平';
        this.keyLevelsContainer.appendChild(title);
        
        // 創建支撐位列表
        if (supports && supports.length) {
            const supportTitle = document.createElement('div');
            supportTitle.className = 'level-category-title support';
            supportTitle.innerText = '支撐位';
            this.keyLevelsContainer.appendChild(supportTitle);
            
            const supportList = document.createElement('div');
            supportList.className = 'key-levels-list support';
            
            // 排序支撐位 (由高到低)
            supports.sort((a, b) => b.price - a.price);
            
            supports.forEach(level => {
                const item = document.createElement('div');
                item.className = 'key-level-item support';
                
                // 計算距離當前價格的百分比
                const distancePercent = ((currentPrice - level.price) / currentPrice * 100).toFixed(2);
                
                item.innerHTML = `
                    <span class="level-price">${level.price.toFixed(2)}</span>
                    <span class="level-strength">${level.gradient.toFixed(2)}</span>
                    <span class="level-distance ${distancePercent > 0 ? 'positive' : 'negative'}">
                        ${distancePercent}%
                    </span>
                `;
                supportList.appendChild(item);
            });
            
            this.keyLevelsContainer.appendChild(supportList);
        }
        
        // 創建阻力位列表
        if (resistances && resistances.length) {
            const resistanceTitle = document.createElement('div');
            resistanceTitle.className = 'level-category-title resistance';
            resistanceTitle.innerText = '阻力位';
            this.keyLevelsContainer.appendChild(resistanceTitle);
            
            const resistanceList = document.createElement('div');
            resistanceList.className = 'key-levels-list resistance';
            
            // 排序阻力位 (由低到高)
            resistances.sort((a, b) => a.price - b.price);
            
            resistances.forEach(level => {
                const item = document.createElement('div');
                item.className = 'key-level-item resistance';
                
                // 計算距離當前價格的百分比
                const distancePercent = ((level.price - currentPrice) / currentPrice * 100).toFixed(2);
                
                item.innerHTML = `
                    <span class="level-price">${level.price.toFixed(2)}</span>
                    <span class="level-strength">${level.gradient.toFixed(2)}</span>
                    <span class="level-distance ${distancePercent > 0 ? 'positive' : 'negative'}">
                        ${distancePercent}%
                    </span>
                `;
                resistanceList.appendChild(item);
            });
            
            this.keyLevelsContainer.appendChild(resistanceList);
        }
    }

    async showPersistentLevels(show = true) {
        this.persistentLevelsShown = show;
        
        // 如果要顯示持續性水平，而且還沒有加載數據
        if (show && !this.persistentLevelsData) {
            try {
                // 顯示加載指示器
                this.showLoadingIndicator('persistent-levels-loading', '加載持續性支撐/阻力位...');
                
                // 獲取持續性支撐阻力位數據
                this.persistentLevelsData = await this.api.getPersistentLevels(this.symbol, 24);
                
                // 隱藏加載指示器
                this.hideLoadingIndicator('persistent-levels-loading');
                
                // 更新視圖
                this.updatePersistentLevelsDisplay();
            } catch (error) {
                console.error('獲取持續性水平數據失敗:', error);
                this.hideLoadingIndicator('persistent-levels-loading');
                // 顯示錯誤信息
                this.showErrorMessage('persistent-levels-error', '無法加載持續性支撐/阻力位數據');
            }
        } else if (!show) {
            // 清除持續性水平標記
            this.clearPersistentLevelMarkers();
        } else {
            // 數據已加載，僅更新顯示
            this.updatePersistentLevelsDisplay();
        }
    }
    
    updatePersistentLevelsDisplay() {
        // 首先清除現有的持續性水平標記
        this.clearPersistentLevelMarkers();
        
        // 如果沒有數據或不顯示，則直接返回
        if (!this.persistentLevelsShown || !this.persistentLevelsData) {
            return;
        }
        
        const { persistent_supports, persistent_resistances } = this.persistentLevelsData;
        
        // 在價格圖表上添加持續性支撐位價格線
        if (persistent_supports && persistent_supports.length > 0) {
            persistent_supports.forEach(level => {
                const supportLine = this.priceChart.addPriceLine({
                    price: level.price,
                    color: this.getPersistentLevelColor('support', level.persistence_score),
                    lineWidth: this.getPersistentLevelWidth(level.persistence_score),
                    lineStyle: 0, // 實線
                    axisLabelVisible: true,
                    title: `持續支撐位 (${level.persistence_score.toFixed(0)})`,
                });
                
                this.persistentSupportMarkers.push(supportLine);
            });
        }
        
        // 在價格圖表上添加持續性阻力位價格線
        if (persistent_resistances && persistent_resistances.length > 0) {
            persistent_resistances.forEach(level => {
                const resistanceLine = this.priceChart.addPriceLine({
                    price: level.price,
                    color: this.getPersistentLevelColor('resistance', level.persistence_score),
                    lineWidth: this.getPersistentLevelWidth(level.persistence_score),
                    lineStyle: 0, // 實線
                    axisLabelVisible: true,
                    title: `持續阻力位 (${level.persistence_score.toFixed(0)})`,
                });
                
                this.persistentResistanceMarkers.push(resistanceLine);
            });
        }
        
        // 創建持續性水平詳情面板
        this.createPersistentLevelsPanel();
    }
    
    clearPersistentLevelMarkers() {
        // 清除支撐位標記
        if (this.persistentSupportMarkers.length > 0) {
            this.persistentSupportMarkers.forEach(marker => {
                this.priceChart.removePriceLine(marker);
            });
            this.persistentSupportMarkers = [];
        }
        
        // 清除阻力位標記
        if (this.persistentResistanceMarkers.length > 0) {
            this.persistentResistanceMarkers.forEach(marker => {
                this.priceChart.removePriceLine(marker);
            });
            this.persistentResistanceMarkers = [];
        }
        
        // 移除詳情面板
        const panelElement = document.getElementById('persistent-levels-panel');
        if (panelElement) {
            panelElement.remove();
        }
    }
    
    getPersistentLevelColor(type, score) {
        // 基於類型和得分生成顏色
        if (type === 'support') {
            // 支撐位顏色: 從淺綠到深藍綠，基於得分
            const intensity = Math.min(Math.max((score - 40) / 60, 0), 1);
            return `rgba(0, ${140 + intensity * 40}, ${160 + intensity * 20}, ${0.6 + intensity * 0.4})`;
        } else {
            // 阻力位顏色: 從淺紅到深品紅，基於得分
            const intensity = Math.min(Math.max((score - 40) / 60, 0), 1);
            return `rgba(${200 + intensity * 20}, ${80 - intensity * 30}, ${120 + intensity * 40}, ${0.6 + intensity * 0.4})`;
        }
    }
    
    getPersistentLevelWidth(score) {
        // 基於得分返回線寬 (1-3)
        return Math.max(1, Math.min(3, Math.round(score / 33)));
    }
    
    createPersistentLevelsPanel() {
        // 移除現有的面板（如果有）
        const existingPanel = document.getElementById('persistent-levels-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // 如果沒有數據，直接返回
        if (!this.persistentLevelsData) {
            return;
        }
        
        const { persistent_supports, persistent_resistances, analysis_timestamp, time_range_hours } = this.persistentLevelsData;
        
        // 創建面板容器
        const panel = document.createElement('div');
        panel.id = 'persistent-levels-panel';
        panel.className = 'persistent-levels-panel';
        
        // 添加標題
        const header = document.createElement('div');
        header.className = 'persistent-levels-header';
        
        const title = document.createElement('h2');
        title.textContent = '持續性支撐/阻力位分析';
        
        const subtitle = document.createElement('div');
        subtitle.className = 'persistent-levels-subtitle';
        const analysisTime = new Date(analysis_timestamp);
        subtitle.textContent = `分析時間: ${analysisTime.toLocaleString()} (基於最近 ${time_range_hours} 小時數據)`;
        
        header.appendChild(title);
        header.appendChild(subtitle);
        panel.appendChild(header);
        
        // 添加支撐位列表
        if (persistent_supports && persistent_supports.length > 0) {
            const supportsSection = document.createElement('div');
            supportsSection.className = 'persistent-level-section';
            
            const supportsTitle = document.createElement('h3');
            supportsTitle.className = 'level-section-title support';
            supportsTitle.textContent = '持續性支撐位';
            supportsSection.appendChild(supportsTitle);
            
            const supportsList = document.createElement('div');
            supportsList.className = 'persistent-levels-list';
            
            persistent_supports.forEach(level => {
                const item = document.createElement('div');
                item.className = 'persistent-level-item support';
                
                const colorBar = document.createElement('div');
                colorBar.className = 'level-color-bar';
                colorBar.style.backgroundColor = this.getPersistentLevelColor('support', level.persistence_score);
                
                const price = document.createElement('div');
                price.className = 'level-price';
                price.textContent = level.price.toFixed(2);
                
                const score = document.createElement('div');
                score.className = 'level-score';
                score.textContent = `得分: ${level.persistence_score.toFixed(0)}`;
                
                const occurrences = document.createElement('div');
                occurrences.className = 'level-occurrences';
                occurrences.textContent = `出現次數: ${level.occurrence_count}`;
                
                item.appendChild(colorBar);
                item.appendChild(price);
                item.appendChild(score);
                item.appendChild(occurrences);
                supportsList.appendChild(item);
            });
            
            supportsSection.appendChild(supportsList);
            panel.appendChild(supportsSection);
        }
        
        // 添加阻力位列表
        if (persistent_resistances && persistent_resistances.length > 0) {
            const resistancesSection = document.createElement('div');
            resistancesSection.className = 'persistent-level-section';
            
            const resistancesTitle = document.createElement('h3');
            resistancesTitle.className = 'level-section-title resistance';
            resistancesTitle.textContent = '持續性阻力位';
            resistancesSection.appendChild(resistancesTitle);
            
            const resistancesList = document.createElement('div');
            resistancesList.className = 'persistent-levels-list';
            
            persistent_resistances.forEach(level => {
                const item = document.createElement('div');
                item.className = 'persistent-level-item resistance';
                
                const colorBar = document.createElement('div');
                colorBar.className = 'level-color-bar';
                colorBar.style.backgroundColor = this.getPersistentLevelColor('resistance', level.persistence_score);
                
                const price = document.createElement('div');
                price.className = 'level-price';
                price.textContent = level.price.toFixed(2);
                
                const score = document.createElement('div');
                score.className = 'level-score';
                score.textContent = `得分: ${level.persistence_score.toFixed(0)}`;
                
                const occurrences = document.createElement('div');
                occurrences.className = 'level-occurrences';
                occurrences.textContent = `出現次數: ${level.occurrence_count}`;
                
                item.appendChild(colorBar);
                item.appendChild(price);
                item.appendChild(score);
                item.appendChild(occurrences);
                resistancesList.appendChild(item);
            });
            
            resistancesSection.appendChild(resistancesList);
            panel.appendChild(resistancesSection);
        }
        
        // 將面板添加到頁面
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.parentNode.insertBefore(panel, chartContainer.nextSibling);
        } else {
            document.body.appendChild(panel);
        }
    }
    
    showLoadingIndicator(id, message) {
        const existingLoader = document.getElementById(id);
        if (existingLoader) {
            existingLoader.textContent = message;
            existingLoader.style.display = 'block';
            return;
        }
        
        const loader = document.createElement('div');
        loader.id = id;
        loader.className = 'loading-indicator';
        loader.textContent = message;
        
        const container = document.querySelector('.toolbar') || document.body;
        container.appendChild(loader);
    }
    
    hideLoadingIndicator(id) {
        const loader = document.getElementById(id);
        if (loader) {
            loader.remove();
        }
    }
    
    showErrorMessage(id, message) {
        const existingError = document.getElementById(id);
        if (existingError) {
            existingError.textContent = message;
            existingError.style.display = 'block';
            return;
        }
        
        const error = document.createElement('div');
        error.id = id;
        error.className = 'error-message';
        error.textContent = message;
        
        const container = document.querySelector('.toolbar') || document.body;
        container.appendChild(error);
        
        // 5秒後自動隱藏
        setTimeout(() => {
            error.style.opacity = '0';
            setTimeout(() => error.remove(), 1000);
        }, 5000);
    }
}

// 創建全局圖表管理器實例
const chartManager = new ChartManager(); 
