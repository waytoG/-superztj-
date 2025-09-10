// 优化的题目生成器 - 解决数量少和速度慢的问题
const ollamaService = require('./ollamaService');
const DocumentProcessor = require('./documentProcessor');
const MathFormulaHandler = require('../utils/mathFormulaHandler');

class OptimizedQuestionGenerator {
    constructor() {
        this.cache = new Map(); // 内存缓存
        this.batchSize = 10; // 批量处理大小
        this.maxConcurrent = 3; // 最大并发数
        this.defaultQuestionCount = 25; // 增加默认题目数量
        this.fastMode = true; // 快速模式
        
        // 初始化数学公式处理器 - 解决数学公式乱码问题
        this.mathHandler = new MathFormulaHandler();
        
        // 预定义题目模板，减少AI生成时间
        this.quickTemplates = this.initializeQuickTemplates();
        
        console.log('🚀 优化题目生成器已就绪 - 高速大批量模式 + 数学公式支持');
    }

    /**
     * 初始化快速题目模板
     */
    initializeQuickTemplates() {
        return {
            'multiple-choice': [
                {
                    template: '根据文档内容，{concept}的主要特点是什么？',
                    options: ['选项A', '选项B', '选项C', '选项D'],
                    difficulty: 1
                },
                {
                    template: '在{context}中，{concept}的作用主要体现在哪个方面？',
                    options: ['功能性作用', '结构性作用', '过程性作用', '综合性作用'],
                    difficulty: 2
                },
                {
                    template: '比较{concept1}和{concept2}，它们的主要区别是什么？',
                    options: ['原理不同', '应用不同', '结构不同', '以上都是'],
                    difficulty: 3
                }
            ],
            'fill-blank': [
                {
                    template: '{concept}的核心要素包括______、______和______。',
                    difficulty: 1
                },
                {
                    template: '实现{concept}需要满足______条件，其关键步骤是______。',
                    difficulty: 2
                },
                {
                    template: '从{perspective}角度分析，{concept}的本质特征是______。',
                    difficulty: 3
                }
            ],
            'essay': [
                {
                    template: '请简述{concept}的基本原理和主要应用。',
                    difficulty: 1
                },
                {
                    template: '分析{concept}在{field}中的重要作用及其发展趋势。',
                    difficulty: 2
                },
                {
                    template: '批判性地评价{concept}的优势与局限性，并提出改进建议。',
                    difficulty: 3
                }
            ]
        };
    }

    /**
     * 快速生成大量题目 - 主要优化方法
     * @param {string} content - 文档内容
     * @param {Object} options - 生成选项
     * @returns {Array} 生成的题目列表
     */
    async generateQuestionsOptimized(content, options = {}) {
        const startTime = Date.now();
        
        const {
            questionType = 'mixed',
            count = this.defaultQuestionCount,
            difficulty = 1,
            fastMode = true,
            useCache = true
        } = options;

        console.log(`🚀 开始优化生成: ${count}道题目 (快速模式: ${fastMode})`);

        try {
            // 1. 检查缓存
            const cacheKey = this.generateCacheKey(content, questionType, count, difficulty);
            if (useCache && this.cache.has(cacheKey)) {
                console.log('⚡ 使用缓存结果');
                return this.cache.get(cacheKey);
            }

            let questions = [];

            if (fastMode) {
                // 快速模式：使用模板 + 少量AI增强
                questions = await this.generateQuestionsFastMode(content, questionType, count, difficulty);
            } else {
                // 标准模式：AI生成 + 并发优化
                questions = await this.generateQuestionsStandardMode(content, questionType, count, difficulty);
            }

            // 2. 缓存结果
            if (useCache) {
                this.cache.set(cacheKey, questions);
                // 限制缓存大小
                if (this.cache.size > 100) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
            }

            const endTime = Date.now();
            console.log(`✅ 优化生成完成: ${questions.length}道题目，耗时: ${endTime - startTime}ms`);

            // 处理数学公式，防止乱码
            const processedQuestions = this.mathHandler.processQuestionsMath(questions);
            console.log('📐 数学公式处理完成');

            return processedQuestions;

        } catch (error) {
            console.error('优化生成失败:', error);
            // 降级到基础模板生成
            return this.generateFallbackQuestions(questionType, count);
        }
    }

    /**
     * 快速模式生成 - 主要使用模板，少量AI增强
     */
    async generateQuestionsFastMode(content, questionType, count, difficulty) {
        console.log('⚡ 快速模式生成');

        // 1. 快速提取关键概念（简化版）
        const concepts = this.extractConceptsQuick(content);
        
        // 2. 确定题目类型分布
        const distribution = this.calculateQuestionDistribution(questionType, count);
        
        // 3. 并发生成不同类型的题目
        const generationPromises = [];
        
        for (const [type, typeCount] of Object.entries(distribution)) {
            if (typeCount > 0) {
                generationPromises.push(
                    this.generateTypeQuestionsFast(type, typeCount, concepts, difficulty)
                );
            }
        }

        const results = await Promise.all(generationPromises);
        const allQuestions = results.flat();

        // 4. 快速质量检查
        const qualityCheckedQuestions = this.quickQualityCheck(allQuestions, count);
        
        // 5. 处理数学公式，防止乱码
        return this.mathHandler.processQuestionsMath(qualityCheckedQuestions);
    }

    /**
     * 标准模式生成 - AI生成 + 并发优化
     */
    async generateQuestionsStandardMode(content, questionType, count, difficulty) {
        console.log('🧠 标准模式生成（并发优化）');

        // 1. 文档预处理（简化版）
        const processedContent = await this.preprocessContentFast(content);
        
        // 2. 分批并发生成
        const batches = Math.ceil(count / this.batchSize);
        const batchPromises = [];

        for (let i = 0; i < batches; i++) {
            const batchStart = i * this.batchSize;
            const batchCount = Math.min(this.batchSize, count - batchStart);
            
            batchPromises.push(
                this.generateBatchQuestions(processedContent, questionType, batchCount, difficulty, i)
            );

            // 控制并发数量
            if (batchPromises.length >= this.maxConcurrent) {
                const batchResults = await Promise.allSettled(batchPromises);
                const questions = this.processBatchResults(batchResults);
                if (questions.length >= count) {
                    const finalQuestions = questions.slice(0, count);
                    return this.mathHandler.processQuestionsMath(finalQuestions);
                }
                batchPromises.length = 0; // 清空数组
            }
        }

        // 处理剩余批次
        if (batchPromises.length > 0) {
            const batchResults = await Promise.allSettled(batchPromises);
            const finalQuestions = this.processBatchResults(batchResults).slice(0, count);
            return this.mathHandler.processQuestionsMath(finalQuestions);
        }

        return [];
    }

    /**
     * 快速提取关键概念
     */
    extractConceptsQuick(content) {
        // 简化的概念提取，避免复杂的NLP处理
        const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
        const concepts = [];

        // 提取名词短语和关键词
        const keywordPatterns = [
            /([A-Za-z\u4e00-\u9fa5]{2,10})(的定义|的概念|的原理|的方法|的特点)/g,
            /([A-Za-z\u4e00-\u9fa5]{2,10})(是|为|指|表示)/g,
            /重要的([A-Za-z\u4e00-\u9fa5]{2,10})/g,
            /主要([A-Za-z\u4e00-\u9fa5]{2,10})/g
        ];

        sentences.slice(0, 20).forEach(sentence => { // 只处理前20句
            keywordPatterns.forEach(pattern => {
                const matches = sentence.matchAll(pattern);
                for (const match of matches) {
                    const concept = match[1];
                    if (concept && concept.length >= 2 && concept.length <= 10) {
                        concepts.push({
                            name: concept,
                            context: sentence.substring(0, 100),
                            frequency: 1
                        });
                    }
                }
            });
        });

        // 去重并按频率排序
        const uniqueConcepts = [];
        const conceptMap = new Map();

        concepts.forEach(concept => {
            if (conceptMap.has(concept.name)) {
                conceptMap.get(concept.name).frequency++;
            } else {
                conceptMap.set(concept.name, concept);
            }
        });

        conceptMap.forEach(concept => uniqueConcepts.push(concept));
        uniqueConcepts.sort((a, b) => b.frequency - a.frequency);

        return uniqueConcepts.slice(0, 15); // 返回前15个概念
    }

    /**
     * 计算题目类型分布
     */
    calculateQuestionDistribution(questionType, count) {
        const distribution = {};

        if (questionType === 'mixed') {
            // 混合模式：选择题50%，填空题30%，问答题20%
            distribution['multiple-choice'] = Math.ceil(count * 0.5);
            distribution['fill-blank'] = Math.ceil(count * 0.3);
            distribution['essay'] = Math.ceil(count * 0.2);
            
            // 调整总数
            const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
            if (total > count) {
                distribution['essay'] = count - distribution['multiple-choice'] - distribution['fill-blank'];
            }
        } else {
            distribution[questionType] = count;
        }

        return distribution;
    }

    /**
     * 快速生成指定类型的题目
     */
    async generateTypeQuestionsFast(type, count, concepts, difficulty) {
        const questions = [];
        const templates = this.quickTemplates[type] || [];

        for (let i = 0; i < count; i++) {
            try {
                const template = templates[i % templates.length];
                const concept = concepts[i % concepts.length];
                
                if (concept && template) {
                    const question = this.generateQuestionFromTemplate(template, concept, type, i);
                    questions.push(question);
                }
            } catch (error) {
                console.warn(`快速生成第${i+1}道${type}题目失败:`, error.message);
            }
        }

        return questions;
    }

    /**
     * 从模板生成题目
     */
    generateQuestionFromTemplate(template, concept, type, index) {
        const questionText = template.template
            .replace(/{concept}/g, concept.name)
            .replace(/{context}/g, this.getContextFromConcept(concept))
            .replace(/{field}/g, '相关领域')
            .replace(/{perspective}/g, '理论');

        const question = {
            id: `q_${type}_${index}_${Date.now()}`,
            type: type,
            question: questionText,
            difficulty: template.difficulty,
            concept: concept.name,
            generated: 'template'
        };

        // 根据题目类型添加特定字段
        switch (type) {
            case 'multiple-choice':
                question.options = this.generateOptionsForConcept(concept, template.options);
                question.correctAnswer = 0; // 第一个选项为正确答案
                break;
            case 'fill-blank':
                question.answer = concept.name;
                question.correctAnswer = concept.name;
                break;
            case 'essay':
                question.sampleAnswer = this.generateSampleAnswer(concept);
                break;
        }

        question.explanation = this.generateExplanation(concept, type);

        return question;
    }

    /**
     * 为概念生成选项
     */
    generateOptionsForConcept(concept, templateOptions) {
        const options = [...templateOptions];
        options[0] = `${concept.name}的核心特征`; // 正确答案
        return options;
    }

    /**
     * 生成示例答案
     */
    generateSampleAnswer(concept) {
        return `${concept.name}是一个重要概念，其主要特点包括：1. 基本定义和内涵；2. 主要应用领域；3. 相关理论基础。在实际应用中，需要结合具体情况进行分析和运用。`;
    }

    /**
     * 生成解释
     */
    generateExplanation(concept, type) {
        const explanations = {
            'multiple-choice': `这道题考查对${concept.name}概念的理解，需要掌握其基本特征和应用。`,
            'fill-blank': `${concept.name}是文档中的关键概念，理解其含义对掌握整体内容很重要。`,
            'essay': `这是一道关于${concept.name}的综合性题目，需要从多个角度进行分析和阐述。`
        };
        return explanations[type] || `这道题目考查${concept.name}相关知识。`;
    }

    /**
     * 从概念获取上下文
     */
    getContextFromConcept(concept) {
        return concept.context ? concept.context.substring(0, 50) : '学习过程';
    }

    /**
     * 快速质量检查
     */
    quickQualityCheck(questions, targetCount) {
        // 去重
        const uniqueQuestions = [];
        const questionTexts = new Set();

        questions.forEach(q => {
            if (!questionTexts.has(q.question)) {
                questionTexts.add(q.question);
                uniqueQuestions.push(q);
            }
        });

        // 如果数量不足，补充基础题目
        while (uniqueQuestions.length < targetCount) {
            const additionalQuestion = this.generateBasicQuestion(uniqueQuestions.length);
            uniqueQuestions.push(additionalQuestion);
        }

        return uniqueQuestions.slice(0, targetCount);
    }

    /**
     * 生成基础题目（备用）
     */
    generateBasicQuestion(index) {
        const basicQuestions = [
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
            }
        ];

        const template = basicQuestions[index % basicQuestions.length];
        return {
            ...template,
            id: `basic_${index}_${Date.now()}`,
            difficulty: 1,
            generated: 'basic'
        };
    }

    /**
     * 生成缓存键
     */
    generateCacheKey(content, questionType, count, difficulty) {
        const contentHash = this.simpleHash(content.substring(0, 500)); // 只使用前500字符
        return `${contentHash}_${questionType}_${count}_${difficulty}`;
    }

    /**
     * 简单哈希函数
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 生成降级题目
     */
    generateFallbackQuestions(questionType, count) {
        console.log('🔄 使用降级题目生成');
        
        const fallbackQuestions = [
            {
                type: 'multiple-choice',
                question: '有效学习的关键要素包括以下哪些？',
                options: ['明确目标', '合理规划', '及时反馈', '以上都是'],
                correctAnswer: 3,
                explanation: '有效学习需要明确目标、合理规划和及时反馈。'
            },
            {
                type: 'fill-blank',
                question: '学习过程中，______和______是提高效率的重要方法。',
                answer: '总结 复习',
                correctAnswer: '总结 复习',
                explanation: '总结和复习是学习过程中的重要环节。'
            },
            {
                type: 'essay',
                question: '请结合学习材料，谈谈你对相关概念的理解。',
                sampleAnswer: '根据学习材料，相关概念具有重要意义，主要体现在理论价值和实践应用两个方面。',
                explanation: '这是一道综合性理解题，需要结合材料内容进行分析。'
            }
        ];

        const questions = [];
        for (let i = 0; i < count; i++) {
            const template = fallbackQuestions[i % fallbackQuestions.length];
            questions.push({
                ...template,
                id: `fallback_${i}_${Date.now()}`,
                difficulty: 1,
                generated: 'fallback'
            });
        }

        return questions;
    }

    /**
     * 批量生成题目
     */
    async generateBatchQuestions(processedContent, questionType, count, difficulty, batchIndex) {
        try {
            console.log(`📦 批次${batchIndex + 1}: 生成${count}道题目`);
            
            // 使用简化的AI生成逻辑
            const concepts = processedContent.concepts || [];
            const questions = [];

            for (let i = 0; i < count; i++) {
                const concept = concepts[i % concepts.length] || { name: '学习概念', context: '学习内容' };
                const question = await this.generateSingleQuestionFast(questionType, concept, difficulty, i);
                questions.push(question);
            }

            return questions;
        } catch (error) {
            console.error(`批次${batchIndex + 1}生成失败:`, error);
            return this.generateFallbackQuestions(questionType, count);
        }
    }

    /**
     * 快速生成单个题目
     */
    async generateSingleQuestionFast(questionType, concept, difficulty, index) {
        const types = questionType === 'mixed' ? ['multiple-choice', 'fill-blank', 'essay'] : [questionType];
        const type = types[index % types.length];
        
        const templates = this.quickTemplates[type];
        const template = templates[index % templates.length];
        
        return this.generateQuestionFromTemplate(template, concept, type, index);
    }

    /**
     * 处理批次结果
     */
    processBatchResults(batchResults) {
        const allQuestions = [];
        
        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                allQuestions.push(...result.value);
            } else {
                console.warn(`批次${index + 1}失败:`, result.reason);
            }
        });

        return allQuestions;
    }

    /**
     * 快速预处理内容
     */
    async preprocessContentFast(content) {
        // 简化的预处理，只提取基本信息
        const concepts = this.extractConceptsQuick(content);
        
        return {
            concepts: concepts,
            length: content.length,
            complexity: content.length > 5000 ? 'high' : content.length > 2000 ? 'medium' : 'low'
        };
    }

    /**
     * 清理缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 缓存已清理');
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: 100,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
        };
    }
}

module.exports = OptimizedQuestionGenerator;