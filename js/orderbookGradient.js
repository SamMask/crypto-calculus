/**
 * 訂單簿梯度視覺化模組
 * 負責計算和展示訂單簿梯度指標，包括多窗口梯度計算和買賣壓力比率
 */
class OrderbookGradientVisualizer {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        // 配置選項
        this.options = {
            width: options.width || 250,
            height: options.height || 400,
            margin: options.margin || { top: 20, right: 30, bottom: 30, left: 40 },
            maxGradientValue: options.maxGradientValue || 1.0,
            buyColor: options.buyColor || d3.interpolateGreens,
            sellColor: options.sellColor || d3.interpolateReds,
            midColor: options.midColor || "#FFF7BD",
            priceLineColor: options.priceLineColor || "#FFD700"
        };
        
        // 內部狀態
        this.gradientData = null;
        this.currentPrice = null;
        this.buyPressure = 0;
        this.sellPressure = 0;
        
        // 初始化視圖
        this.initializeView();
    }
    
    /**
     * 初始化視圖和SVG元素
     */
    initializeView() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 創建標題和說明
        const header = document.createElement('div');
        header.className = 'gradient-header';
        header.innerHTML = `
            <h3>訂單簿梯度分析</h3>
            <div class="gradient-description">分析買賣訂單分佈密度，識別潛在支撐位/阻力位</div>
        `;
        this.container.appendChild(header);
        
        // 創建壓力比率指示器容器
        const pressureRatioContainer = document.createElement('div');
        pressureRatioContainer.className = 'pressure-ratio-container';
        pressureRatioContainer.innerHTML = `
            <div class="pressure-ratio-title">買賣壓力比率</div>
            <div class="pressure-ratio-bar-container">
                <div class="pressure-ratio-bar" id="pressureRatioBar"></div>
            </div>
            <div class="pressure-ratio-value" id="pressureRatioValue">-</div>
        `;
        this.container.appendChild(pressureRatioContainer);
        
        // 創建梯度熱力圖容器
        const gradientContainer = document.createElement('div');
        gradientContainer.className = 'gradient-container';
        this.container.appendChild(gradientContainer);
        
        // 設置D3 SVG
        this.svg = d3.select(gradientContainer)
            .append("svg")
            .attr("width", this.options.width)
            .attr("height", this.options.height);
            
        // 設置X軸和Y軸
        this.xScale = d3.scaleLinear()
            .domain([-this.options.maxGradientValue, this.options.maxGradientValue])
            .range([
                this.options.margin.left, 
                this.options.width - this.options.margin.right
            ]);
            
        this.yScale = d3.scaleLinear()
            .range([
                this.options.height - this.options.margin.bottom, 
                this.options.margin.top
            ]);
            
        // 添加X軸
        this.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.options.height - this.options.margin.bottom})`)
            .call(d3.axisBottom(this.xScale).ticks(5));
            
        // 添加Y軸
        this.yAxis = this.svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${this.options.margin.left},0)`);
            
        // 添加X軸標籤
        this.svg.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("x", this.options.width / 2)
            .attr("y", this.options.height - 5)
            .text("梯度值（賣←→買）");
            
        // 添加圖例
        this.createLegend();
        
        // 添加空狀態顯示
        this.svg.append("text")
            .attr("class", "no-data-text")
            .attr("text-anchor", "middle")
            .attr("x", this.options.width / 2)
            .attr("y", this.options.height / 2)
            .attr("opacity", 1)
            .text("等待數據載入...");
    }
    
    /**
     * 創建圖例
     */
    createLegend() {
        const legendContainer = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.options.margin.left + 10}, ${this.options.margin.top + 10})`);
            
        const legendItems = [
            { color: this.options.buyColor(0.8), text: "買方壓力" },
            { color: this.options.sellColor(0.8), text: "賣方壓力" },
            { color: this.options.priceLineColor, text: "當前價格" }
        ];
        
        legendItems.forEach((item, i) => {
            const g = legendContainer.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
                
            g.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", item.color);
                
            g.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .text(item.text)
                .style("font-size", "10px");
        });
    }
    
    /**
     * 更新梯度數據並重新繪製視圖
     * @param {Object} data 訂單簿梯度數據
     * @param {number} currentPrice 當前價格
     */
    updateData(data, currentPrice) {
        if (!data || !data.gradients) {
            console.warn("沒有有效的梯度數據");
            return;
        }
        
        this.gradientData = data.gradients;
        this.currentPrice = currentPrice;
        
        // 計算買賣壓力
        this.calculatePressureRatio();
        
        // 更新視圖
        this.render();
    }
    
    /**
     * 計算買賣壓力比率
     */
    calculatePressureRatio() {
        if (!this.gradientData) return;
        
        this.buyPressure = 0;
        this.sellPressure = 0;
        
        this.gradientData.forEach(entry => {
            if (entry.gradient > 0) {
                this.buyPressure += entry.gradient;
            } else if (entry.gradient < 0) {
                this.sellPressure += Math.abs(entry.gradient);
            }
        });
        
        // 更新壓力比率指示器
        this.updatePressureRatioIndicator();
    }
    
    /**
     * 更新買賣壓力比率指示器
     */
    updatePressureRatioIndicator() {
        const pressureRatioBar = document.getElementById('pressureRatioBar');
        const pressureRatioValue = document.getElementById('pressureRatioValue');
        
        if (!pressureRatioBar || !pressureRatioValue) return;
        
        let ratio = 0.5; // 默認中性值
        let ratioText = "-";
        let barColor = "#AAAAAA";
        
        if (this.buyPressure > 0 || this.sellPressure > 0) {
            const totalPressure = this.buyPressure + this.sellPressure;
            ratio = this.buyPressure / totalPressure;
            
            const numericRatio = this.buyPressure / 
                (this.sellPressure > 0 ? this.sellPressure : 0.001);
                
            ratioText = numericRatio.toFixed(2);
            
            // 設置顏色
            if (numericRatio > 1.2) {
                barColor = "#5cc15c"; // 強買壓
            } else if (numericRatio < 0.8) {
                barColor = "#e65c5c"; // 強賣壓
            } else {
                barColor = "#d1c75c"; // 中性
            }
        }
        
        // 設置進度條寬度和顏色
        pressureRatioBar.style.width = `${ratio * 100}%`;
        pressureRatioBar.style.backgroundColor = barColor;
        
        // 設置數值
        pressureRatioValue.textContent = ratioText;
        pressureRatioValue.style.color = barColor;
    }
    
    /**
     * 渲染梯度熱力圖
     */
    render() {
        if (!this.gradientData || this.gradientData.length === 0) {
            this.svg.select(".no-data-text")
                .attr("opacity", 1);
            return;
        }
        
        // 隱藏無數據文字
        this.svg.select(".no-data-text")
            .attr("opacity", 0);
            
        // 獲取價格範圍
        const prices = this.gradientData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const paddingPercent = 0.02;
        const pricePadding = (maxPrice - minPrice) * paddingPercent;
        
        // 更新Y軸比例尺
        this.yScale.domain([minPrice - pricePadding, maxPrice + pricePadding]);
        this.yAxis.call(d3.axisLeft(this.yScale).tickFormat(d => d.toFixed(2)));
        
        // 清除現有的梯度矩形
        this.svg.selectAll(".gradient-rect").remove();
        this.svg.selectAll(".price-line").remove();
        
        // 繪製梯度矩形
        this.svg.selectAll(".gradient-rect")
            .data(this.gradientData)
            .enter()
            .append("rect")
            .attr("class", "gradient-rect")
            .attr("x", d => {
                if (d.gradient >= 0) {
                    return this.xScale(0);
                } else {
                    return this.xScale(d.gradient);
                }
            })
            .attr("y", d => this.yScale(d.price + 0.0001))
            .attr("width", d => {
                if (d.gradient >= 0) {
                    return this.xScale(d.gradient) - this.xScale(0);
                } else {
                    return this.xScale(0) - this.xScale(d.gradient);
                }
            })
            .attr("height", d => {
                const barHeight = Math.max(
                    1, 
                    this.yScale(d.price - 0.0001) - this.yScale(d.price + 0.0001)
                );
                return barHeight;
            })
            .attr("fill", d => {
                if (d.gradient >= 0) {
                    // 買方梯度（綠色）
                    return this.options.buyColor(Math.min(1, d.gradient / this.options.maxGradientValue));
                } else {
                    // 賣方梯度（紅色）
                    return this.options.sellColor(Math.min(1, Math.abs(d.gradient) / this.options.maxGradientValue));
                }
            })
            .attr("opacity", 0.8);
            
        // 如果有當前價格，添加價格線
        if (this.currentPrice) {
            this.svg.append("line")
                .attr("class", "price-line")
                .attr("x1", this.options.margin.left)
                .attr("y1", this.yScale(this.currentPrice))
                .attr("x2", this.options.width - this.options.margin.right)
                .attr("y2", this.yScale(this.currentPrice))
                .attr("stroke", this.options.priceLineColor)
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4,4");
                
            this.svg.append("text")
                .attr("class", "price-line")
                .attr("x", this.options.width - this.options.margin.right + 3)
                .attr("y", this.yScale(this.currentPrice) + 4)
                .attr("text-anchor", "start")
                .attr("font-size", "10px")
                .attr("fill", this.options.priceLineColor)
                .text(this.currentPrice.toFixed(2));
        }
    }
}

// 將類添加到全局命名空間
window.OrderbookGradientVisualizer = OrderbookGradientVisualizer; 