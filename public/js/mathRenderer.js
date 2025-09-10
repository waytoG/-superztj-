// 前端数学公式渲染器 - 解决数学公式乱码问题

class MathRenderer {
    constructor() {
        this.isMathjaxReady = false;
        this.renderQueue = [];
        
        // 等待MathJax加载完成
        this.waitForMathJax();
        
        console.log('📐 前端数学公式渲染器已初始化');
    }

    /**
     * 等待MathJax加载完成
     */
    async waitForMathJax() {
        const maxWaitTime = 10000; // 最大等待10秒
        const startTime = Date.now();

        const checkMathJax = () => {
            if (window.MathJax && window.MathJax.typesetPromise) {
                this.isMathjaxReady = true;
                console.log('✅ MathJax已就绪');
                this.processRenderQueue();
                return true;
            }
            
            if (Date.now() - startTime > maxWaitTime) {
                console.warn('⚠️ MathJax加载超时，使用备用渲染方案');
                this.isMathjaxReady = false;
                return false;
            }
            
            return false;
        };

        // 立即检查一次
        if (checkMathJax()) return;

        // 定期检查
        const interval = setInterval(() => {
            if (checkMathJax()) {
                clearInterval(interval);
            }
        }, 100);
    }

    /**
     * 处理渲染队列
     */
    processRenderQueue() {
        while (this.renderQueue.length > 0) {
            const { element, callback } = this.renderQueue.shift();
            this.renderMathInElement(element, callback);
        }
    }

    /**
     * 渲染元素中的数学公式
     * @param {HTMLElement} element - 要渲染的元素
     * @param {Function} callback - 渲染完成回调
     */
    renderMathInElement(element, callback = null) {
        if (!element) {
            if (callback) callback();
            return;
        }

        if (!this.isMathjaxReady) {
            // 加入队列等待MathJax就绪
            this.renderQueue.push({ element, callback });
            return;
        }

        try {
            // 预处理数学公式
            this.preprocessMathInElement(element);

            // 使用MathJax渲染
            window.MathJax.typesetPromise([element]).then(() => {
                console.log('📐 数学公式渲染完成');
                if (callback) callback();
            }).catch((error) => {
                console.error('MathJax渲染失败:', error);
                // 使用备用渲染方案
                this.fallbackRender(element);
                if (callback) callback();
            });

        } catch (error) {
            console.error('数学公式渲染失败:', error);
            this.fallbackRender(element);
            if (callback) callback();
        }
    }

    /**
     * 预处理元素中的数学公式
     * @param {HTMLElement} element - 要处理的元素
     */
    preprocessMathInElement(element) {
        if (!element) return;

        // 处理所有文本节点
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const originalText = textNode.textContent;
            const processedText = this.preprocessMathText(originalText);
            
            if (processedText !== originalText) {
                textNode.textContent = processedText;
            }
        });
    }

    /**
     * 预处理数学文本
     * @param {string} text - 原始文本
     * @returns {string} 处理后的文本
     */
    preprocessMathText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        let processedText = text;

        // 修复常见的编码问题
        const encodingFixes = {
            'â€™': "'",
            'â€œ': '"',
            'â€\u009d': '"',
            'â€"': '—',
            'â€¢': '•',
            'Â°': '°',
            'Â±': '±',
            'Â²': '²',
            'Â³': '³'
        };

        Object.entries(encodingFixes).forEach(([wrong, correct]) => {
            processedText = processedText.replace(new RegExp(wrong, 'g'), correct);
        });

        // 确保数学公式被正确包装
        processedText = this.ensureMathDelimiters(processedText);

        return processedText;
    }

    /**
     * 确保数学公式有正确的分隔符
     * @param {string} text - 输入文本
     * @returns {string} 处理后的文本
     */
    ensureMathDelimiters(text) {
        // 如果已经有分隔符，直接返回
        if (text.includes('$') || text.includes('\\(') || text.includes('\\[')) {
            return text;
        }

        // 检测可能的数学表达式并添加分隔符
        const mathPatterns = [
            // 分数：a/b
            /\b(\w+)\/(\w+)\b/g,
            // 指数：x^2
            /(\w+)\^(\w+)/g,
            // 下标：x_1
            /(\w+)_(\w+)/g,
            // 包含数学符号的表达式
            /[×÷±∓≠≤≥≈∞αβγδεθλμπσφωΔΣΠΩ∫∂∇∈∉⊂⊃∪∩∅∧∨¬→←↔⇒⇐⇔∀∃∴∵⊥∥°]/
        ];

        let hasMatch = false;
        mathPatterns.forEach(pattern => {
            if (pattern.test(text)) {
                hasMatch = true;
            }
        });

        if (hasMatch) {
            // 简单包装为内联数学公式
            return `$${text}$`;
        }

        return text;
    }

    /**
     * 备用渲染方案（当MathJax不可用时）
     * @param {HTMLElement} element - 要渲染的元素
     */
    fallbackRender(element) {
        if (!element) return;

        console.log('📐 使用备用数学公式渲染方案');

        // 简单的符号替换
        const symbolReplacements = {
            '×': '×',
            '÷': '÷',
            '±': '±',
            '≠': '≠',
            '≤': '≤',
            '≥': '≥',
            '≈': '≈',
            '∞': '∞',
            'π': 'π',
            '²': '²',
            '³': '³',
            '√': '√'
        };

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let text = textNode.textContent;
            
            Object.entries(symbolReplacements).forEach(([symbol, replacement]) => {
                text = text.replace(new RegExp(symbol, 'g'), replacement);
            });

            if (text !== textNode.textContent) {
                textNode.textContent = text;
            }
        });

        // 添加数学公式样式
        element.classList.add('math-fallback');
    }

    /**
     * 渲染题目中的数学公式
     * @param {Object} question - 题目对象
     * @param {HTMLElement} container - 容器元素
     */
    renderQuestionMath(question, container) {
        if (!question || !container) return;

        // 渲染题目文本
        const questionElement = container.querySelector('.question-text');
        if (questionElement) {
            this.renderMathInElement(questionElement);
        }

        // 渲染选项
        const optionElements = container.querySelectorAll('.option-text');
        optionElements.forEach(optionElement => {
            this.renderMathInElement(optionElement);
        });

        // 渲染解释
        const explanationElement = container.querySelector('.explanation-text');
        if (explanationElement) {
            this.renderMathInElement(explanationElement);
        }

        // 渲染答案
        const answerElement = container.querySelector('.answer-text');
        if (answerElement) {
            this.renderMathInElement(answerElement);
        }
    }

    /**
     * 批量渲染多个元素的数学公式
     * @param {Array<HTMLElement>} elements - 元素数组
     * @param {Function} callback - 完成回调
     */
    renderMathInElements(elements, callback = null) {
        if (!Array.isArray(elements) || elements.length === 0) {
            if (callback) callback();
            return;
        }

        let completedCount = 0;
        const totalCount = elements.length;

        const onElementComplete = () => {
            completedCount++;
            if (completedCount === totalCount && callback) {
                callback();
            }
        };

        elements.forEach(element => {
            this.renderMathInElement(element, onElementComplete);
        });
    }

    /**
     * 重新渲染页面中的所有数学公式
     */
    rerenderAllMath() {
        if (!this.isMathjaxReady) {
            console.warn('⚠️ MathJax未就绪，无法重新渲染');
            return;
        }

        try {
            window.MathJax.typesetPromise().then(() => {
                console.log('📐 页面数学公式重新渲染完成');
            }).catch((error) => {
                console.error('重新渲染失败:', error);
            });
        } catch (error) {
            console.error('重新渲染失败:', error);
        }
    }

    /**
     * 清理数学公式渲染
     * @param {HTMLElement} element - 要清理的元素
     */
    clearMathRender(element) {
        if (!element) return;

        try {
            // 移除MathJax生成的元素
            const mathElements = element.querySelectorAll('.MathJax, .MathJax_Display');
            mathElements.forEach(mathEl => mathEl.remove());

            // 移除备用渲染的样式
            element.classList.remove('math-fallback');

        } catch (error) {
            console.error('清理数学公式渲染失败:', error);
        }
    }

    /**
     * 检查MathJax是否可用
     * @returns {boolean} MathJax是否可用
     */
    isMathJaxAvailable() {
        return this.isMathjaxReady && window.MathJax && window.MathJax.typesetPromise;
    }

    /**
     * 获取渲染统计信息
     * @returns {Object} 统计信息
     */
    getRenderStats() {
        return {
            isMathjaxReady: this.isMathjaxReady,
            queueLength: this.renderQueue.length,
            mathJaxAvailable: this.isMathJaxAvailable()
        };
    }
}

// 创建全局实例
const mathRenderer = new MathRenderer();

// 导出到全局作用域
window.mathRenderer = mathRenderer;

// 兼容性函数
window.renderMathInElement = function(element, callback) {
    return mathRenderer.renderMathInElement(element, callback);
};

window.renderQuestionMath = function(question, container) {
    return mathRenderer.renderQuestionMath(question, container);
};

window.rerenderAllMath = function() {
    return mathRenderer.rerenderAllMath();
};

console.log('📐 前端数学公式渲染器已加载完成');