// AI服务模块 - 集成智能文档处理和问题生成
const ollamaService = require('./ollamaService');
const DocumentProcessor = require('./documentProcessor');
const IntelligentQuestionGenerator = require('./intelligentQuestionGenerator');
const EnhancedQuestionGenerator = require('./enhancedQuestionGenerator');
const DeepSeekQuestionGenerator = require('./deepseekQuestionGenerator');
const MathFormulaHandler = require('../utils/mathFormulaHandler');

class AIService {
    constructor() {
        this.isInitialized = false;
        this.useOllama = process.env.USE_OLLAMA === 'true' || true;
        this.documentProcessor = new DocumentProcessor();
        this.questionGenerator = new IntelligentQuestionGenerator();
        this.enhancedQuestionGenerator = new EnhancedQuestionGenerator();
        this.deepseekGenerator = new DeepSeekQuestionGenerator();
        this.mathHandler = new MathFormulaHandler();
        this.initializeService();
    }

    /**
     * 快速初始化服务
     */
    async initializeService() {
        try {
            if (this.useOllama) {
                const ollamaStatus = await ollamaService.checkService();
                if (ollamaStatus.available) {
                    console.log('✅ Ollama AI服务初始化完成');
                    console.log(`📋 可用模型: ${ollamaStatus.models.join(', ')}`);
                    console.log(`🎯 当前模型: ${ollamaStatus.currentModel}`);
                } else {
                    console.log('⚠️  Ollama服务不可用，使用智能内置模式');
                    console.log(`❌ 错误: ${ollamaStatus.error}`);
                }
            }
            
            console.log('🧠 智能文档处理器已就绪');
            console.log('🎯 智能问题生成器已就绪');
            console.log('🤖 DeepSeek问题生成器已就绪');
            this.isInitialized = true;
        } catch (error) {
            console.error('AI服务初始化失败:', error);
            this.isInitialized = false;
        }
    }

    /**
     * 检查AI服务状态
     */
    async checkServiceStatus() {
        const status = {
            aiService: this.isInitialized,
            documentProcessor: true,
            questionGenerator: true,
            ollama: false
        };

        if (this.useOllama) {
            const ollamaStatus = await ollamaService.checkService();
            status.ollama = ollamaStatus.available;
            if (ollamaStatus.available) {
                status.models = ollamaStatus.models;
                status.currentModel = ollamaStatus.currentModel;
            }
        }

        return {
            available: status.aiService,
            components: status,
            mode: status.ollama ? 'ollama+intelligent' : 'intelligent',
            capabilities: [
                '大文件智能处理',
                '文档分块与分析',
                '知识图谱构建',
                '智能问题生成',
                '多难度级别支持',
                '多种题型生成'
            ]
        };
    }

    /**
     * 智能生成题目 - 支持大文件处理和全面覆盖
     * @param {string} content - 文档内容
     * @param {string} questionType - 题目类型
     * @param {number} count - 题目数量
     * @param {number} difficulty - 难度等级
     * @param {Object} options - 额外选项
     * @returns {Array} 生成的题目列表
     */
    async generateQuestionsFromContent(content, questionType = 'mixed', count = 15, difficulty = 1, options = {}) {
        try {
            console.log(`🚀 开始智能题目生成: 类型=${questionType}, 数量=${count}, 难度=${difficulty}`);
            console.log(`📄 文档长度: ${content.length} 字符`);
            
            // 第一步：生成全面问题覆盖策略
            console.log('📊 生成全面问题覆盖策略...');
            const questionStrategy = this.mathHandler.generateComprehensiveQuestionStrategy(content, {
                questionCount: count,
                difficultyLevels: ['easy', 'medium', 'hard'],
                questionTypes: this.mapQuestionType(questionType),
                coverageMode: options.coverageMode || 'comprehensive'
            });
            
            console.log(`📋 策略生成完成: ${questionStrategy.sections.length}个章节, ${questionStrategy.coverageAreas.length}个覆盖区域`);
            
            // 第二步：智能文档处理（使用策略指导）
            console.log('📊 开始智能文档分析...');
            const processedDoc = await this.documentProcessor.processDocument(content, {
                maxChunkSize: options.maxChunkSize || 1000,
                overlapSize: options.overlapSize || 200,
                enableKnowledgeGraph: options.enableKnowledgeGraph !== false,
                analysisDepth: options.analysisDepth || 'comprehensive',
                questionStrategy: questionStrategy // 传递策略信息
            });

            console.log(`✅ 文档处理完成: ${processedDoc.chunks.length} 个块, ${processedDoc.concepts?.length || 0} 个概念`);

            // 第三步：使用策略指导的问题生成
            let questions = [];
            
            // 优先使用DeepSeek生成高质量题目
            if (this.useOllama && options.useDeepSeek !== false) {
                try {
                    console.log('🤖 使用DeepSeek生成高质量概念题目...');
                    const questionTypes = this.mapQuestionType(questionType);
                    const difficultyLevel = this.mapDifficulty(difficulty);
                    
                    const deepseekQuestions = await this.deepseekGenerator.generateIntelligentQuestions(processedDoc, {
                        questionCount: count,
                        questionTypes: questionTypes,
                        difficulty: difficultyLevel,
                        focusOnConcepts: true,
                        questionStrategy: questionStrategy // 传递策略
                    });
                    
                    if (deepseekQuestions && deepseekQuestions.length > 0) {
                        questions = deepseekQuestions;
                        console.log(`✨ DeepSeek生成完成: ${questions.length} 道高质量题目`);
                    }
                } catch (deepseekError) {
                    console.log('⚠️  DeepSeek生成失败，降级到智能生成:', deepseekError.message);
                }
            }

            // 如果DeepSeek失败，使用智能问题生成
            if (questions.length === 0) {
                const questionTypes = this.mapQuestionType(questionType);
                const difficultyLevel = this.mapDifficulty(difficulty);
                
                console.log('🧠 开始智能问题生成...');
                questions = await this.questionGenerator.generateIntelligentQuestions(processedDoc, {
                    questionCount: count,
                    questionTypes: questionTypes,
                    difficulty: difficultyLevel,
                    focusAreas: options.focusAreas || [],
                    questionStrategy: questionStrategy // 传递策略
                });
            }

            // 第四步：处理数学公式（关键修复）
            console.log('🔧 处理题目中的数学公式...');
            const processedQuestions = this.mathHandler.processQuestionsMath(questions, {
                renderMode: options.mathRenderMode || 'html', // 默认使用HTML模式避免$符号
                autoWrap: false,
                preserveOriginal: true
            });

            console.log(`✅ 智能生成完成: ${processedQuestions.length} 道题目（已处理数学公式）`);
            return processedQuestions;

        } catch (error) {
            console.error('智能题目生成失败:', error);
            
            // 降级到基础生成模式
            console.log('🔄 降级到基础生成模式...');
            return await this.generateBasicQuestions(content, questionType, count, difficulty);
        }
    }

    /**
     * 使用Ollama增强题目质量
     * @param {Array} questions - 基础题目
     * @param {Object} processedDoc - 处理后的文档
     * @returns {Array} 增强后的题目
     */
    async enhanceQuestionsWithOllama(questions, processedDoc) {
        try {
            const enhancedQuestions = [];
            const batchSize = 5; // 批量处理，避免超时

            for (let i = 0; i < questions.length; i += batchSize) {
                const batch = questions.slice(i, i + batchSize);
                const enhancedBatch = await Promise.all(
                    batch.map(async (question) => {
                        try {
                            return await this.enhanceSingleQuestionWithOllama(question, processedDoc);
                        } catch (error) {
                            console.warn(`题目${question.id}增强失败:`, error.message);
                            return question; // 返回原题目
                        }
                    })
                );
                enhancedQuestions.push(...enhancedBatch);
            }

            return enhancedQuestions;
        } catch (error) {
            console.error('Ollama批量增强失败:', error);
            return questions; // 返回原题目
        }
    }

    /**
     * 使用Ollama增强单个题目
     * @param {Object} question - 题目对象
     * @param {Object} processedDoc - 处理后的文档
     * @returns {Object} 增强后的题目
     */
    async enhanceSingleQuestionWithOllama(question, processedDoc) {
        const enhancePrompt = this.buildEnhancePrompt(question, processedDoc);
        
        const response = await ollamaService.generateResponse(enhancePrompt, {
            temperature: 0.3,
            max_tokens: 500
        });

        if (response && response.content) {
            return this.parseEnhancedQuestion(response.content, question);
        }
        
        return question;
    }

    /**
     * 构建增强提示词
     * @param {Object} question - 题目对象
     * @param {Object} processedDoc - 处理后的文档
     * @returns {string} 提示词
     */
    buildEnhancePrompt(question, processedDoc) {
        const relevantContext = this.getRelevantContext(question, processedDoc);
        
        return `请基于以下文档内容，优化这道题目的质量：

文档关键信息：
${relevantContext}

当前题目：
类型：${question.type}
问题：${question.question}
${question.options ? `选项：${question.options.join(', ')}` : ''}
${question.correctAnswer !== undefined ? `正确答案：${question.correctAnswer}` : ''}

请优化：
1. 使问题表述更清晰准确
2. 确保答案基于文档内容
3. 提供更好的解释
4. 保持原有格式

返回JSON格式：
{
  "question": "优化后的问题",
  "options": ["选项1", "选项2", "选项3", "选项4"],
  "correctAnswer": 正确答案索引或内容,
  "explanation": "详细解释"
}`;
    }

    /**
     * 获取相关上下文
     * @param {Object} question - 题目对象
     * @param {Object} processedDoc - 处理后的文档
     * @returns {string} 相关上下文
     */
    getRelevantContext(question, processedDoc) {
        const knowledgePoints = question.knowledgePoints || [];
        const relevantChunks = [];

        // 查找包含相关知识点的文档块
        processedDoc.chunks.forEach(chunk => {
            const hasRelevantContent = knowledgePoints.some(point => 
                chunk.content.toLowerCase().includes(point.toLowerCase())
            );
            if (hasRelevantContent) {
                relevantChunks.push(chunk.content.substring(0, 200));
            }
        });

        // 如果没有找到相关内容，使用重要段落
        if (relevantChunks.length === 0) {
            relevantChunks.push(...processedDoc.importantSections.slice(0, 2).map(s => s.content.substring(0, 200)));
        }

        return relevantChunks.join('\n\n').substring(0, 1000);
    }

    /**
     * 解析增强后的题目
     * @param {string} response - Ollama响应
     * @param {Object} originalQuestion - 原题目
     * @returns {Object} 解析后的题目
     */
    parseEnhancedQuestion(response, originalQuestion) {
        try {
            // 尝试解析JSON响应
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const enhanced = JSON.parse(jsonMatch[0]);
                return {
                    ...originalQuestion,
                    question: enhanced.question || originalQuestion.question,
                    options: enhanced.options || originalQuestion.options,
                    correctAnswer: enhanced.correctAnswer !== undefined ? enhanced.correctAnswer : originalQuestion.correctAnswer,
                    explanation: enhanced.explanation || originalQuestion.explanation,
                    enhanced: true
                };
            }
        } catch (error) {
            console.warn('解析增强题目失败:', error.message);
        }
        
        return originalQuestion;
    }

    /**
     * 基础题目生成（降级模式）
     * @param {string} content - 文档内容
     * @param {string} questionType - 题目类型
     * @param {number} count - 题目数量
     * @param {number} difficulty - 难度等级
     * @returns {Array} 基础题目列表
     */
    async generateBasicQuestions(content, questionType, count, difficulty) {
        console.log('🔧 使用基础算法生成题目...');
        
        try {
            // 简化的内容分析
            const keyInfo = this.extractKeyInformation(content);
            const questions = [];
            
            // 根据题目类型生成
            const questionTypes = this.mapQuestionType(questionType);
            const distribution = this.calculateBasicDistribution(count, questionTypes);
            
            for (const [type, typeCount] of Object.entries(distribution)) {
                if (typeCount > 0) {
                    const typeQuestions = this.generateBasicQuestionsByType(type, typeCount, keyInfo, difficulty);
                    questions.push(...typeQuestions);
                }
            }
            
            return questions.slice(0, count);
        } catch (error) {
            console.error('基础题目生成失败:', error);
            return this.generateFallbackQuestions(questionType, count);
        }
    }

    /**
     * 按类型生成基础题目
     * @param {string} type - 题目类型
     * @param {number} count - 数量
     * @param {Object} keyInfo - 关键信息
     * @param {number} difficulty - 难度
     * @returns {Array} 题目列表
     */
    generateBasicQuestionsByType(type, count, keyInfo, difficulty) {
        const questions = [];
        
        for (let i = 0; i < count; i++) {
            let question;
            switch (type) {
                case 'multiple-choice':
                    question = this.generateBasicMultipleChoice(keyInfo, difficulty, i);
                    break;
                case 'fill-blank':
                    question = this.generateBasicFillBlank(keyInfo, difficulty, i);
                    break;
                case 'essay':
                    question = this.generateBasicEssay(keyInfo, difficulty, i);
                    break;
            }
            
            if (question) {
                question.id = `basic_${type}_${i + 1}`;
                question.source = 'basic_generator';
                questions.push(question);
            }
        }
        
        return questions;
    }

    /**
     * 生成基础选择题
     */
    generateBasicMultipleChoice(keyInfo, difficulty, index) {
        const concepts = keyInfo.concepts || [];
        const keywords = keyInfo.keywords || [];
        
        if (concepts.length > index) {
            const concept = concepts[index];
            return {
                type: 'multiple-choice',
                question: `关于"${concept.term}"，以下说法正确的是？`,
                options: [
                    concept.definition,
                    '这是错误的选项A',
                    '这是错误的选项B', 
                    '这是错误的选项C'
                ],
                correctAnswer: 0,
                explanation: `根据文档内容，${concept.term}${concept.definition}`,
                difficulty: difficulty,
                knowledgePoints: [concept.term]
            };
        } else if (keywords.length > index) {
            const keyword = keywords[index];
            return {
                type: 'multiple-choice',
                question: `文档中提到的"${keyword}"主要涉及什么内容？`,
                options: [
                    `与${keyword}相关的重要概念`,
                    '无关内容A',
                    '无关内容B',
                    '无关内容C'
                ],
                correctAnswer: 0,
                explanation: `${keyword}是文档中的重要概念。`,
                difficulty: difficulty,
                knowledgePoints: [keyword]
            };
        }
        
        return null;
    }

    /**
     * 生成基础填空题
     */
    generateBasicFillBlank(keyInfo, difficulty, index) {
        const concepts = keyInfo.concepts || [];
        const keywords = keyInfo.keywords || [];
        
        if (concepts.length > index) {
            const concept = concepts[index];
            return {
                type: 'fill-blank',
                question: `${concept.term}是指______。`,
                correctAnswer: concept.definition,
                explanation: `根据文档定义，${concept.term}是指${concept.definition}。`,
                difficulty: difficulty,
                knowledgePoints: [concept.term]
            };
        } else if (keywords.length > index) {
            const keyword = keywords[index];
            return {
                type: 'fill-blank',
                question: `文档中重要的概念______涉及多个方面的内容。`,
                correctAnswer: keyword,
                explanation: `${keyword}是文档中的重要概念。`,
                difficulty: difficulty,
                knowledgePoints: [keyword]
            };
        }
        
        return null;
    }

    /**
     * 生成基础问答题
     */
    generateBasicEssay(keyInfo, difficulty, index) {
        const concepts = keyInfo.concepts || [];
        const keywords = keyInfo.keywords || [];
        
        if (concepts.length > index) {
            const concept = concepts[index];
            return {
                type: 'essay',
                question: `请详细说明"${concept.term}"的含义和重要性。`,
                sampleAnswer: `${concept.term}是指${concept.definition}。这个概念在相关领域中具有重要意义...`,
                keyPoints: [
                    `${concept.term}的定义`,
                    `${concept.term}的特点`,
                    `${concept.term}的应用`
                ],
                explanation: `这道题考查对${concept.term}概念的理解和应用。`,
                difficulty: difficulty,
                knowledgePoints: [concept.term]
            };
        } else if (keywords.length > index) {
            const keyword = keywords[index];
            return {
                type: 'essay',
                question: `请分析文档中"${keyword}"的重要作用。`,
                sampleAnswer: `${keyword}在文档中起到重要作用，主要体现在...`,
                keyPoints: [
                    `${keyword}的定义`,
                    `${keyword}的作用`,
                    `${keyword}的意义`
                ],
                explanation: `这道题考查对${keyword}重要性的理解。`,
                difficulty: difficulty,
                knowledgePoints: [keyword]
            };
        }
        
        return null;
    }

    /**
     * 计算基础分布
     */
    calculateBasicDistribution(totalCount, questionTypes) {
        const distribution = {};
        const typeCount = questionTypes.length;
        
        if (typeCount === 1) {
            distribution[questionTypes[0]] = totalCount;
        } else {
            let remaining = totalCount;
            questionTypes.forEach((type, index) => {
                if (index === questionTypes.length - 1) {
                    distribution[type] = remaining;
                } else {
                    const count = Math.floor(totalCount / typeCount);
                    distribution[type] = count;
                    remaining -= count;
                }
            });
        }
        
        return distribution;
    }

    /**
     * 映射题目类型
     */
    mapQuestionType(questionType) {
        const typeMap = {
            'mixed': ['multiple-choice', 'fill-blank', 'essay'],
            'multiple-choice': ['multiple-choice'],
            'fill-blank': ['fill-blank'],
            'essay': ['essay']
        };
        return typeMap[questionType] || ['multiple-choice', 'fill-blank', 'essay'];
    }

    /**
     * 映射难度等级
     */
    mapDifficulty(difficulty) {
        const difficultyMap = {
            1: 'easy',
            2: 'medium',
            3: 'hard'
        };
        return difficultyMap[difficulty] || 'medium';
    }

    /**
     * 简化的关键信息提取
     */
    extractKeyInformation(content) {
        if (!content || typeof content !== 'string') {
            content = '这是一个学习材料示例，包含各种知识点和概念。';
        }

        const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 5);
        const keywords = this.extractKeywords(content);
        const concepts = this.extractConcepts(content);

        return {
            sentences: sentences.slice(0, 10),
            keywords: keywords.slice(0, 15),
            concepts: concepts.slice(0, 8)
        };
    }

    /**
     * 简化的关键词提取
     */
    extractKeywords(text) {
        if (!text) return ['学习', '知识', '方法', '技能', '理解'];
        
        const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
        const words = cleanText.split(/\s+/).filter(word => word.length > 1);
        
        const wordCount = {};
        words.forEach(word => {
            const lowerWord = word.toLowerCase();
            wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1;
        });
        
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15)
            .map(([word]) => word);
    }

    /**
     * 简化的概念提取
     */
    extractConcepts(text) {
        if (!text) return [];
        
        const definitionPatterns = [
            /(.{1,20})是(.{1,50})/g,
            /(.{1,20})指(.{1,50})/g,
            /(.{1,20})称为(.{1,50})/g
        ];
        
        const concepts = [];
        definitionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null && concepts.length < 8) {
                if (match[1] && match[2]) {
                    concepts.push({
                        term: match[1].trim(),
                        definition: match[2].trim()
                    });
                }
            }
        });
        
        return concepts;
    }

    /**
     * 生成备用题目
     */
    generateFallbackQuestions(questionType, count) {
        console.log('🆘 使用备用题目模板...');
        
        const fallbackQuestions = [
            {
                type: 'multiple-choice',
                question: '有效学习的关键要素不包括以下哪项？',
                options: ['明确目标', '合理规划', '死记硬背', '及时复习'],
                correctAnswer: 2,
                explanation: '死记硬背不是有效学习的方法，理解和应用才是关键。',
                difficulty: 1,
                knowledgePoints: ['学习方法']
            },
            {
                type: 'fill-blank',
                question: '学习新知识时，建立与已有知识的______有助于理解和记忆。',
                correctAnswer: '联系',
                explanation: '建立知识间的联系是有效学习的重要策略。',
                difficulty: 1,
                knowledgePoints: ['学习策略']
            },
            {
                type: 'essay',
                question: '请简述制定学习计划的重要性和基本原则。',
                sampleAnswer: '制定学习计划的重要性：1.提高学习效率；2.合理分配时间；3.明确学习目标。基本原则：1.目标明确具体；2.时间安排合理；3.难易程度适中；4.留有调整空间。',
                explanation: '学习计划是有效学习的基础，需要结合个人情况制定。',
                difficulty: 2,
                knowledgePoints: ['学习规划']
            }
        ];

        let filteredQuestions = fallbackQuestions;
        if (questionType !== 'mixed') {
            filteredQuestions = fallbackQuestions.filter(q => q.type === questionType);
        }

        const selectedQuestions = [];
        for (let i = 0; i < count; i++) {
            const question = filteredQuestions[i % filteredQuestions.length];
            selectedQuestions.push({
                ...question,
                id: `fallback_${i + 1}`,
                source: 'fallback'
            });
        }

        return selectedQuestions;
    }

    /**
     * 分析文档复杂度
     * @param {string} content - 文档内容
     * @returns {Object} 复杂度分析结果
     */
    async analyzeDocumentComplexity(content) {
        try {
            const analysis = await this.documentProcessor.analyzeComplexity(content);
            return {
                length: content.length,
                complexity: analysis.averageComplexity,
                recommendedChunkSize: analysis.recommendedChunkSize,
                estimatedProcessingTime: Math.ceil(content.length / 1000) * 2, // 估算秒数
                supportsBigFile: content.length > 10000
            };
        } catch (error) {
            console.error('文档复杂度分析失败:', error);
            return {
                length: content.length,
                complexity: 'medium',
                recommendedChunkSize: 1000,
                estimatedProcessingTime: 30,
                supportsBigFile: false
            };
        }
    }

    /**
     * 获取处理进度
     * @param {string} taskId - 任务ID
     * @returns {Object} 进度信息
     */
    getProcessingProgress(taskId) {
        // 这里可以实现实际的进度跟踪
        return {
            taskId: taskId,
            status: 'processing',
            progress: 50,
            stage: 'document_analysis',
            estimatedTimeRemaining: 30
        };
    }

    /**
     * 生成增强智能题目 - 集成网络搜索和NLP分析
     * @param {string} content - 文档内容
     * @param {string} questionType - 题目类型
     * @param {number} count - 题目数量
     * @param {number} difficulty - 难度等级
     * @param {Object} options - 额外选项
     * @returns {Array} 生成的题目列表
     */
    async generateEnhancedQuestionsFromContent(content, questionType = 'mixed', count = 15, difficulty = 1, options = {}) {
        try {
            console.log(`🚀 开始增强智能题目生成: 类型=${questionType}, 数量=${count}, 难度=${difficulty}`);
            console.log(`📄 文档长度: ${content.length} 字符`);
            
            // 第一步：智能文档处理
            console.log('📊 开始智能文档分析...');
            const processedDoc = await this.documentProcessor.processDocument(content, {
                maxChunkSize: options.maxChunkSize || 1000,
                overlapSize: options.overlapSize || 200,
                enableKnowledgeGraph: options.enableKnowledgeGraph !== false,
                analysisDepth: options.analysisDepth || 'comprehensive'
            });
            
            if (!processedDoc || !processedDoc.chunks || processedDoc.chunks.length === 0) {
                throw new Error('文档处理失败或内容为空');
            }
            
            console.log(`✅ 文档处理完成: ${processedDoc.chunks.length} 个块, ${processedDoc.concepts?.length || 0} 个概念`);
            
            // 第二步：使用增强问题生成器
            const difficultyMap = { 1: 'easy', 2: 'medium', 3: 'hard' };
            const difficultyLevel = difficultyMap[difficulty] || 'medium';
            
            const questionTypes = this.mapQuestionType(questionType);
            
            const enhancedOptions = {
                count: count,
                difficulty: difficultyLevel,
                types: questionTypes,
                useWebSearch: options.useWebSearch !== false,
                enhanceWithNLP: options.enhanceWithNLP !== false,
                includeExplanations: options.includeExplanations !== false,
                ...options
            };
            
            console.log('🎯 开始增强题目生成...');
            const questions = await this.enhancedQuestionGenerator.generateEnhancedQuestions(
                processedDoc, 
                enhancedOptions
            );
            
            // 第三步：后处理和格式化
            const formattedQuestions = this.formatQuestionsForOutput(questions, questionType);
            
            console.log(`✅ 增强题目生成完成，共生成 ${formattedQuestions.length} 道高质量题目`);
            
            return {
                success: true,
                questions: formattedQuestions,
                metadata: {
                    totalGenerated: formattedQuestions.length,
                    enhancedCount: formattedQuestions.filter(q => q.enhanced).length,
                    averageQuality: this.calculateAverageQuality(formattedQuestions),
                    processingTime: Date.now(),
                    documentInfo: {
                        chunks: processedDoc.chunks.length,
                        concepts: processedDoc.concepts?.length || 0,
                        complexity: processedDoc.complexity || 'medium'
                    }
                }
            };
            
        } catch (error) {
            console.error('增强题目生成失败:', error);
            console.log('🔄 降级到基础题目生成...');
            
            // 降级到基础生成
            return this.generateQuestionsFromContent(content, questionType, count, difficulty, options);
        }
    }

    /**
     * 智能选择题目生成方式
     * @param {string} content - 文档内容
     * @param {string} questionType - 题目类型
     * @param {number} count - 题目数量
     * @param {number} difficulty - 难度等级
     * @param {Object} options - 额外选项
     * @returns {Array} 生成的题目列表
     */
    async generateSmartQuestionsFromContent(content, questionType = 'mixed', count = 15, difficulty = 1, options = {}) {
        const { 
            preferEnhanced = true,
            fallbackToBasic = true,
            autoDetectMode = true,
            ...otherOptions 
        } = options;

        try {
            // 自动检测是否适合使用增强生成
            let shouldUseEnhanced = preferEnhanced;
            
            if (autoDetectMode) {
                shouldUseEnhanced = this.shouldUseEnhancedGeneration(content, options);
            }
            
            if (shouldUseEnhanced) {
                console.log('🚀 使用增强题目生成模式...');
                return await this.generateEnhancedQuestionsFromContent(
                    content, questionType, count, difficulty, otherOptions
                );
            } else {
                console.log('🎯 使用基础题目生成模式...');
                return await this.generateQuestionsFromContent(
                    content, questionType, count, difficulty, otherOptions
                );
            }
            
        } catch (error) {
            console.error('智能题目生成失败:', error);
            
            if (fallbackToBasic) {
                console.log('🔄 降级到基础题目生成...');
                return await this.generateQuestionsFromContent(
                    content, questionType, count, difficulty, otherOptions
                );
            }
            
            throw error;
        }
    }

    /**
     * 判断是否应该使用增强生成
     * @param {string} content - 文档内容
     * @param {Object} options - 选项
     * @returns {boolean} 是否使用增强生成
     */
    shouldUseEnhancedGeneration(content, options) {
        // 检查内容长度
        if (content.length < 200) {
            console.log('📝 内容太短，使用基础生成');
            return false;
        }
        
        // 检查内容复杂度
        const complexityIndicators = [
            /[A-Za-z]{3,}/.test(content), // 包含英文术语
            /\d+/.test(content), // 包含数字
            content.split('。').length > 5, // 句子数量
            content.includes('定义') || content.includes('概念'), // 包含定义性内容
        ];
        
        const complexityScore = complexityIndicators.filter(Boolean).length;
        if (complexityScore < 2) {
            console.log('🔍 内容复杂度较低，使用基础生成');
            return false;
        }
        
        // 检查是否禁用网络搜索
        if (options.useWebSearch === false && options.enhanceWithNLP === false) {
            console.log('🚫 增强功能被禁用，使用基础生成');
            return false;
        }
        
        console.log('🌟 内容适合增强生成');
        return true;
    }

    /**
     * 计算平均质量分数
     * @param {Array} questions - 题目列表
     * @returns {number} 平均质量分数
     */
    calculateAverageQuality(questions) {
        if (!questions || questions.length === 0) return 0;
        
        const totalQuality = questions.reduce((sum, q) => sum + (q.qualityScore || 0), 0);
        return Math.round((totalQuality / questions.length) * 100) / 100;
    }

    /**
     * 批量生成题目 - 支持大文档
     * @param {string} content - 文档内容
     * @param {Object} batchOptions - 批量选项
     * @returns {Object} 批量生成结果
     */
    async generateQuestionsBatch(content, batchOptions = {}) {
        const {
            batches = [
                { type: 'multiple-choice', count: 5, difficulty: 1 },
                { type: 'fill-blank', count: 3, difficulty: 2 },
                { type: 'short-answer', count: 2, difficulty: 3 }
            ],
            useEnhanced = true,
            ...commonOptions
        } = batchOptions;

        console.log(`📦 开始批量生成题目: ${batches.length} 个批次`);
        
        const results = [];
        let totalQuestions = 0;
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🔄 处理批次 ${i + 1}/${batches.length}: ${batch.type} x ${batch.count}`);
            
            try {
                const batchResult = useEnhanced ? 
                    await this.generateEnhancedQuestionsFromContent(
                        content, batch.type, batch.count, batch.difficulty, 
                        { ...commonOptions, ...batch.options }
                    ) :
                    await this.generateQuestionsFromContent(
                        content, batch.type, batch.count, batch.difficulty, 
                        { ...commonOptions, ...batch.options }
                    );
                
                if (batchResult.success && batchResult.questions) {
                    results.push({
                        batchIndex: i,
                        type: batch.type,
                        questions: batchResult.questions,
                        metadata: batchResult.metadata
                    });
                    totalQuestions += batchResult.questions.length;
                }
                
            } catch (error) {
                console.error(`批次 ${i + 1} 生成失败:`, error);
                results.push({
                    batchIndex: i,
                    type: batch.type,
                    error: error.message,
                    questions: []
                });
            }
        }
        
        console.log(`✅ 批量生成完成: 总共 ${totalQuestions} 道题目`);
        
        return {
            success: true,
            totalQuestions: totalQuestions,
            batches: results,
            summary: {
                successfulBatches: results.filter(r => !r.error).length,
                failedBatches: results.filter(r => r.error).length,
                averageQuality: this.calculateBatchAverageQuality(results)
            }
        };
    }

    /**
     * 计算批次平均质量
     * @param {Array} batchResults - 批次结果
     * @returns {number} 平均质量分数
     */
    calculateBatchAverageQuality(batchResults) {
        const allQuestions = batchResults
            .filter(batch => batch.questions && batch.questions.length > 0)
            .flatMap(batch => batch.questions);
        
        return this.calculateAverageQuality(allQuestions);
    }

    /**
     * 获取增强生成器状态
     * @returns {Object} 状态信息
     */
    getEnhancedGeneratorStatus() {
        return {
            available: !!this.enhancedQuestionGenerator,
            status: this.enhancedQuestionGenerator?.getStatus() || {},
            capabilities: [
                '网络搜索增强',
                'NLP文本分析',
                '概念关系提取',
                '高质量题目生成',
                '智能解释生成',
                '质量评分系统'
            ]
        };
    }
}

module.exports = AIService;