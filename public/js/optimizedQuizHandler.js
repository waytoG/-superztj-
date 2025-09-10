// 优化的题目生成处理器 - 解决数量少和速度慢的问题

class OptimizedQuizHandler {
    constructor() {
        this.defaultQuestionCount = 25; // 增加默认题目数量
        this.maxQuestionCount = 50; // 最大题目数量
        this.fastMode = true; // 默认启用快速模式
        this.useCache = true; // 默认启用缓存
        this.currentGenerationMode = 'optimized'; // 当前生成模式
        
        console.log('🚀 优化题目生成处理器已初始化');
    }

    /**
     * 优化的题目生成 - 主要方法
     * @param {string} materialId - 材料ID
     * @param {Object} options - 生成选项
     * @returns {Promise<Object>} 生成结果
     */
    async generateOptimizedQuiz(materialId, options = {}) {
        const {
            questionType = 'mixed',
            count = this.defaultQuestionCount,
            difficulty = 1,
            fastMode = this.fastMode,
            useCache = this.useCache,
            showProgress = true
        } = options;

        console.log(`🎯 开始优化生成: ${count}道题目 (快速模式: ${fastMode})`);

        if (showProgress) {
            this.showProgressIndicator('🚀 AI正在高速生成大量题目...');
        }

        try {
            const startTime = Date.now();

            const response = await fetch('/api/quiz-optimized/generate-optimized/' + materialId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionType,
                    count,
                    difficulty,
                    fastMode,
                    useCache
                }),
                // 增加超时时间
                signal: AbortSignal.timeout(60000) // 60秒超时
            });

            const result = await response.json();
            const endTime = Date.now();
            const duration = endTime - startTime;

            if (showProgress) {
                this.hideProgressIndicator();
            }

            if (result.success && result.data && result.data.questions) {
                const questions = result.data.questions;
                console.log(`✅ 优化生成成功: ${questions.length}道题目，耗时: ${duration}ms`);
                
                // 显示成功消息
                showToast('success', `🎉 高速生成完成！共生成${questions.length}道高质量题目，耗时${(duration/1000).toFixed(1)}秒`);
                
                return {
                    success: true,
                    questions: questions,
                    metadata: {
                        ...result.data.metadata,
                        actualDuration: duration
                    }
                };
            } else {
                throw new Error(result.message || '优化生成失败');
            }

        } catch (error) {
            if (showProgress) {
                this.hideProgressIndicator();
            }

            console.error('优化生成失败:', error);
            
            if (error.name === 'TimeoutError') {
                showToast('warning', '⏰ 生成超时，正在尝试快速生成...');
                return this.generateQuickQuiz(materialId, { count: Math.min(count, 15) });
            } else {
                showToast('error', '❌ 优化生成失败: ' + error.message);
                // 降级到快速生成
                return this.generateQuickQuiz(materialId, { count: Math.min(count, 20) });
            }
        }
    }

    /**
     * 批量生成题目
     * @param {string} materialId - 材料ID
     * @param {Array} batches - 批次配置
     * @returns {Promise<Object>} 生成结果
     */
    async generateBatchQuiz(materialId, batches = null) {
        const defaultBatches = [
            { type: 'multiple-choice', count: 15, difficulty: 1 },
            { type: 'fill-blank', count: 8, difficulty: 2 },
            { type: 'essay', count: 5, difficulty: 2 }
        ];

        const batchConfig = batches || defaultBatches;
        const totalQuestions = batchConfig.reduce((sum, batch) => sum + batch.count, 0);

        console.log(`📦 开始批量生成: ${batchConfig.length}个批次，共${totalQuestions}道题目`);

        this.showProgressIndicator(`📦 AI正在批量生成${totalQuestions}道题目...`);

        try {
            const startTime = Date.now();

            const response = await fetch('/api/quiz-optimized/generate-batch/' + materialId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    batches: batchConfig
                }),
                signal: AbortSignal.timeout(90000) // 90秒超时
            });

            const result = await response.json();
            const endTime = Date.now();
            const duration = endTime - startTime;

            this.hideProgressIndicator();

            if (result.success && result.data) {
                const questions = result.data.questions;
                const summary = result.data.summary;
                
                console.log(`✅ 批量生成成功: ${questions.length}道题目，成功批次: ${summary.successfulBatches}/${batchConfig.length}`);
                
                showToast('success', `📦 批量生成完成！共${questions.length}道题目，成功批次: ${summary.successfulBatches}/${batchConfig.length}`);
                
                return {
                    success: true,
                    questions: questions,
                    summary: summary,
                    duration: duration
                };
            } else {
                throw new Error(result.message || '批量生成失败');
            }

        } catch (error) {
            this.hideProgressIndicator();
            console.error('批量生成失败:', error);
            showToast('error', '❌ 批量生成失败: ' + error.message);
            
            // 降级到优化生成
            return this.generateOptimizedQuiz(materialId, { 
                count: totalQuestions, 
                fastMode: true 
            });
        }
    }

    /**
     * 快速生成题目 - 超快速模式
     * @param {string} materialId - 材料ID
     * @param {Object} options - 生成选项
     * @returns {Promise<Object>} 生成结果
     */
    async generateQuickQuiz(materialId, options = {}) {
        const { count = 20 } = options;

        console.log(`⚡ 开始快速生成: ${count}道题目`);

        this.showProgressIndicator('⚡ 超快速生成中...');

        try {
            const startTime = Date.now();

            const response = await fetch('/api/quiz-optimized/generate-quick/' + materialId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ count }),
                signal: AbortSignal.timeout(15000) // 15秒超时
            });

            const result = await response.json();
            const endTime = Date.now();
            const duration = endTime - startTime;

            this.hideProgressIndicator();

            if (result.success && result.data) {
                const questions = result.data.questions;
                console.log(`⚡ 快速生成成功: ${questions.length}道题目，耗时: ${duration}ms`);
                
                showToast('success', `⚡ 超快速生成完成！${questions.length}道题目，耗时${(duration/1000).toFixed(1)}秒`);
                
                return {
                    success: true,
                    questions: questions,
                    metadata: {
                        mode: 'quick',
                        duration: duration
                    }
                };
            } else {
                throw new Error(result.message || '快速生成失败');
            }

        } catch (error) {
            this.hideProgressIndicator();
            console.error('快速生成失败:', error);
            showToast('error', '❌ 快速生成失败: ' + error.message);
            
            // 最后的降级方案
            return this.generateFallbackQuiz(count);
        }
    }

    /**
     * 智能生成 - 自动选择最佳方式
     * @param {string} materialId - 材料ID
     * @param {Object} options - 生成选项
     * @returns {Promise<Object>} 生成结果
     */
    async generateSmartQuiz(materialId, options = {}) {
        const { count = this.defaultQuestionCount } = options;

        console.log(`🧠 开始智能生成: ${count}道题目`);

        try {
            // 根据题目数量选择生成方式
            if (count <= 15) {
                // 少量题目，使用快速生成
                return this.generateQuickQuiz(materialId, options);
            } else if (count <= 30) {
                // 中等数量，使用优化生成
                return this.generateOptimizedQuiz(materialId, { ...options, fastMode: true });
            } else {
                // 大量题目，使用批量生成
                const batches = this.calculateOptimalBatches(count);
                return this.generateBatchQuiz(materialId, batches);
            }

        } catch (error) {
            console.error('智能生成失败:', error);
            showToast('error', '❌ 智能生成失败，使用备用方案');
            return this.generateFallbackQuiz(count);
        }
    }

    /**
     * 计算最优批次配置
     * @param {number} totalCount - 总题目数量
     * @returns {Array} 批次配置
     */
    calculateOptimalBatches(totalCount) {
        const batches = [];
        
        // 选择题占50%
        const multipleChoiceCount = Math.ceil(totalCount * 0.5);
        batches.push({ type: 'multiple-choice', count: multipleChoiceCount, difficulty: 1 });
        
        // 填空题占30%
        const fillBlankCount = Math.ceil(totalCount * 0.3);
        batches.push({ type: 'fill-blank', count: fillBlankCount, difficulty: 2 });
        
        // 问答题占20%
        const essayCount = totalCount - multipleChoiceCount - fillBlankCount;
        if (essayCount > 0) {
            batches.push({ type: 'essay', count: essayCount, difficulty: 2 });
        }

        return batches;
    }

    /**
     * 生成降级题目
     * @param {number} count - 题目数量
     * @returns {Object} 生成结果
     */
    generateFallbackQuiz(count = 20) {
        console.log(`🔄 生成降级题目: ${count}道`);

        const fallbackQuestions = [];
        
        // 基础题目模板
        const templates = [
            {
                type: 'multiple-choice',
                question: '根据学习材料，以下哪个说法是正确的？',
                options: ['选项A', '选项B', '选项C', '选项D'],
                correctAnswer: 0,
                explanation: '这是基于学习材料的基础理解题。'
            },
            {
                type: 'fill-blank',
                question: '学习材料中提到的重要概念是______。',
                answer: '重要概念',
                correctAnswer: '重要概念',
                explanation: '这是对材料中关键概念的考查。'
            },
            {
                type: 'essay',
                question: '请简述学习材料的主要内容。',
                sampleAnswer: '学习材料主要讨论了相关理论和实践应用。',
                explanation: '这是对材料整体内容的综合理解题。'
            }
        ];

        for (let i = 0; i < count; i++) {
            const template = templates[i % templates.length];
            fallbackQuestions.push({
                ...template,
                id: `fallback_${i}_${Date.now()}`,
                difficulty: 1,
                generated: 'fallback'
            });
        }

        showToast('info', `🔄 已生成${fallbackQuestions.length}道备用题目`);

        return {
            success: true,
            questions: fallbackQuestions,
            metadata: {
                mode: 'fallback',
                totalQuestions: fallbackQuestions.length
            }
        };
    }

    /**
     * 显示进度指示器
     * @param {string} message - 进度消息
     */
    showProgressIndicator(message) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = loadingOverlay?.querySelector('p');
        
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }

        // 添加进度动画
        this.startProgressAnimation();
    }

    /**
     * 隐藏进度指示器
     */
    hideProgressIndicator() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        this.stopProgressAnimation();
    }

    /**
     * 开始进度动画
     */
    startProgressAnimation() {
        const spinner = document.querySelector('.loading-spinner i');
        if (spinner) {
            spinner.style.animation = 'spin 1s linear infinite';
        }
    }

    /**
     * 停止进度动画
     */
    stopProgressAnimation() {
        const spinner = document.querySelector('.loading-spinner i');
        if (spinner) {
            spinner.style.animation = '';
        }
    }

    /**
     * 清理缓存
     */
    async clearCache() {
        try {
            const response = await fetch('/api/quiz-optimized/cache/clear', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('success', '🧹 缓存已清理');
            } else {
                showToast('error', '❌ 清理缓存失败');
            }
        } catch (error) {
            console.error('清理缓存失败:', error);
            showToast('error', '❌ 清理缓存失败: ' + error.message);
        }
    }

    /**
     * 获取缓存统计
     */
    async getCacheStats() {
        try {
            const response = await fetch('/api/quiz-optimized/cache/stats');
            const result = await response.json();
            
            if (result.success) {
                console.log('📊 缓存统计:', result.data);
                return result.data;
            }
        } catch (error) {
            console.error('获取缓存统计失败:', error);
        }
        
        return null;
    }

    /**
     * 设置生成模式
     * @param {string} mode - 生成模式 ('optimized', 'batch', 'quick', 'smart')
     */
    setGenerationMode(mode) {
        this.currentGenerationMode = mode;
        console.log(`🔧 生成模式已设置为: ${mode}`);
    }

    /**
     * 获取推荐的题目数量
     * @param {string} materialLength - 材料长度
     * @returns {number} 推荐题目数量
     */
    getRecommendedQuestionCount(materialLength) {
        if (materialLength < 1000) {
            return 15; // 短材料
        } else if (materialLength < 5000) {
            return 25; // 中等材料
        } else if (materialLength < 10000) {
            return 35; // 长材料
        } else {
            return 50; // 超长材料
        }
    }
}

// 创建全局实例
const optimizedQuizHandler = new OptimizedQuizHandler();

// 导出到全局作用域
window.optimizedQuizHandler = optimizedQuizHandler;

// 兼容性函数 - 更新现有的生成函数
window.generateOptimizedQuiz = function(materialId, options = {}) {
    return optimizedQuizHandler.generateOptimizedQuiz(materialId, options);
};

window.generateBatchQuiz = function(materialId, batches = null) {
    return optimizedQuizHandler.generateBatchQuiz(materialId, batches);
};

window.generateQuickQuiz = function(materialId, options = {}) {
    return optimizedQuizHandler.generateQuickQuiz(materialId, options);
};

window.generateSmartQuiz = function(materialId, options = {}) {
    return optimizedQuizHandler.generateSmartQuiz(materialId, options);
};

console.log('🚀 优化题目生成处理器已加载完成');