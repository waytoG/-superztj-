const ollamaService = require('./ollamaService');
const MathFormulaHandler = require('../utils/mathFormulaHandler');

class DeepSeekQuestionGenerator {
    constructor() {
        this.model = 'deepseek-r1:7b';
        this.maxRetries = 3;
        this.mathHandler = new MathFormulaHandler();
        this.questionTemplates = {
            'multiple-choice': {
                prompt: '基于文档内容生成选择题',
                format: 'multiple_choice'
            },
            'fill-blank': {
                prompt: '基于文档内容生成填空题',
                format: 'fill_blank'
            },
            'essay': {
                prompt: '基于文档内容生成问答题',
                format: 'essay'
            },
            'conceptual': {
                prompt: '基于文档内容生成概念理解题',
                format: 'conceptual'
            }
        };
    }

    /**
     * 使用DeepSeek生成高质量题目
     * @param {Object} processedDoc - 处理后的文档
     * @param {Object} options - 生成选项
     * @returns {Array} 生成的题目列表
     */
    async generateIntelligentQuestions(processedDoc, options = {}) {
        try {
            const {
                questionCount = 10,
                questionTypes = ['multiple-choice', 'fill-blank', 'essay'],
                difficulty = 'medium',
                focusOnConcepts = true
            } = options;

            console.log(`🤖 使用DeepSeek生成${questionCount}道智能题目`);

            // 检查DeepSeek服务状态
            const serviceStatus = await ollamaService.checkService();
            if (!serviceStatus.available) {
                throw new Error('DeepSeek服务不可用');
            }

            // 确保使用DeepSeek模型
            if (!serviceStatus.models.some(model => model.includes('deepseek'))) {
                console.warn('DeepSeek模型不可用，尝试使用其他可用模型');
                if (serviceStatus.models.length > 0) {
                    this.model = serviceStatus.models.find(m => m.includes('qwen')) || serviceStatus.models[0];
                }
            }

            // 提取文档核心信息
            const documentSummary = this.extractDocumentSummary(processedDoc);
            
            // 生成不同类型的题目
            const allQuestions = [];
            const typeDistribution = this.calculateTypeDistribution(questionCount, questionTypes);

            for (const [type, count] of Object.entries(typeDistribution)) {
                if (count > 0) {
                    console.log(`📝 生成${count}道${type}题目`);
                    const typeQuestions = await this.generateQuestionsByType(
                        type, count, documentSummary, difficulty, processedDoc
                    );
                    allQuestions.push(...typeQuestions);
                }
            }

            // 质量检查和优化
            const optimizedQuestions = this.optimizeQuestions(allQuestions, processedDoc);
            
            // 处理数学公式
            console.log('🔧 处理题目中的数学公式...');
            const processedQuestions = this.mathHandler.processQuestionsMath(optimizedQuestions, {
                renderMode: 'html', // 使用HTML模式避免$符号显示
                autoWrap: false,
                preserveOriginal: true
            });
            
            console.log(`✅ DeepSeek生成完成: ${processedQuestions.length}道高质量题目（已处理数学公式）`);
            return processedQuestions;

        } catch (error) {
            console.error('DeepSeek题目生成失败:', error);
            throw error;
        }
    }

    /**
     * 提取文档摘要信息
     * @param {Object} processedDoc - 处理后的文档
     * @returns {Object} 文档摘要
     */
    extractDocumentSummary(processedDoc) {
        const { chunks, concepts, globalMetadata, importantSections } = processedDoc;

        // 提取关键概念
        const keyConcepts = concepts?.slice(0, 10) || [];
        
        // 提取重要内容段落
        const keyContent = importantSections?.slice(0, 3).map(section => 
            section.content.length > 200 ? section.content.substring(0, 200) + '...' : section.content
        ).join('\n\n') || '';

        // 提取高频关键词
        const keyTerms = globalMetadata?.topKeyTerms?.slice(0, 15) || [];

        return {
            concepts: keyConcepts,
            keyContent: keyContent,
            keyTerms: keyTerms,
            totalChunks: chunks?.length || 0,
            complexity: processedDoc.complexity || 'medium',
            documentLength: processedDoc.originalLength || 0
        };
    }

    /**
     * 按类型生成题目
     * @param {string} type - 题目类型
     * @param {number} count - 数量
     * @param {Object} summary - 文档摘要
     * @param {string} difficulty - 难度
     * @param {Object} processedDoc - 完整文档数据
     * @returns {Array} 题目列表
     */
    async generateQuestionsByType(type, count, summary, difficulty, processedDoc) {
        const questions = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const question = await this.generateSingleQuestion(type, summary, difficulty, i, processedDoc);
                if (question) {
                    questions.push(question);
                }
            } catch (error) {
                console.warn(`生成第${i+1}道${type}题目失败:`, error.message);
                // 生成备用题目
                const fallbackQuestion = this.generateFallbackQuestion(type, summary, i);
                if (fallbackQuestion) {
                    questions.push(fallbackQuestion);
                }
            }
        }

        return questions;
    }

    /**
     * 生成单个题目
     * @param {string} type - 题目类型
     * @param {Object} summary - 文档摘要
     * @param {string} difficulty - 难度
     * @param {number} index - 题目索引
     * @param {Object} processedDoc - 完整文档数据
     * @returns {Object} 题目对象
     */
    async generateSingleQuestion(type, summary, difficulty, index, processedDoc) {
        const prompt = this.buildIntelligentPrompt(type, summary, difficulty, index);
        
        const response = await this.callDeepSeekWithRetry({
            model: this.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 1000,
                num_predict: 500
            }
        });

        if (response && response.data && response.data.response) {
            return this.parseQuestionResponse(response.data.response, type, index);
        }

        return null;
    }

    /**
     * 构建智能提示词
     * @param {string} type - 题目类型
     * @param {Object} summary - 文档摘要
     * @param {string} difficulty - 难度
     * @param {number} index - 题目索引
     * @returns {string} 提示词
     */
    buildIntelligentPrompt(type, summary, difficulty, index) {
        const conceptsText = summary.concepts.map(c => `${c.term}: ${c.definition}`).join('\n');
        const keyTermsText = summary.keyTerms.map(t => t.term).join(', ');

        let basePrompt = `你是一位专业的教育专家，请基于以下学习材料生成一道高质量的${this.getTypeDescription(type)}。

学习材料核心内容：
${summary.keyContent}

重要概念：
${conceptsText}

关键词汇：${keyTermsText}

要求：
1. 题目必须紧密结合材料内容，考查学生对核心概念的理解
2. 难度等级：${difficulty}
3. 题目要有一定的思辨性，避免简单的记忆性问题
4. 确保答案准确且有充分的解释说明
`;

        switch (type) {
            case 'multiple-choice':
                basePrompt += `
5. 提供4个选项，其中1个正确答案，3个有一定迷惑性的错误选项
6. 选项要基于材料内容，避免明显错误的选项

请按以下JSON格式输出：
{
  "question": "题目内容",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "correctAnswer": 0,
  "explanation": "详细解释为什么这个答案正确，其他选项为什么错误",
  "knowledgePoints": ["相关知识点1", "相关知识点2"]
}`;
                break;

            case 'fill-blank':
                basePrompt += `
5. 用______表示需要填空的部分
6. 空白处应该是关键概念或重要信息

请按以下JSON格式输出：
{
  "question": "题目内容（用______表示空白）",
  "correctAnswer": "标准答案",
  "explanation": "详细解释答案及相关概念",
  "knowledgePoints": ["相关知识点1", "相关知识点2"]
}`;
                break;

            case 'essay':
                basePrompt += `
5. 问题要能引导学生深入思考和分析
6. 提供参考答案要点和评分标准

请按以下JSON格式输出：
{
  "question": "题目内容",
  "sampleAnswer": "参考答案要点",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "explanation": "题目考查的核心能力和知识点",
  "knowledgePoints": ["相关知识点1", "相关知识点2"]
}`;
                break;

            case 'conceptual':
                basePrompt += `
5. 重点考查概念理解、概念间关系、概念应用
6. 避免纯记忆性问题，注重理解和分析

请按以下JSON格式输出：
{
  "question": "概念理解题目",
  "expectedAnswer": "期望的回答要点",
  "evaluationCriteria": ["评价标准1", "评价标准2"],
  "explanation": "题目设计意图和考查重点",
  "knowledgePoints": ["相关知识点1", "相关知识点2"]
}`;
                break;
        }

        basePrompt += '\n\n只输出JSON格式，不要包含其他文字：';
        return basePrompt;
    }

    /**
     * 获取题目类型描述
     * @param {string} type - 题目类型
     * @returns {string} 类型描述
     */
    getTypeDescription(type) {
        const descriptions = {
            'multiple-choice': '单项选择题',
            'fill-blank': '填空题',
            'essay': '问答题',
            'conceptual': '概念理解题'
        };
        return descriptions[type] || '题目';
    }

    /**
     * 带重试的DeepSeek调用
     * @param {Object} requestData - 请求数据
     * @returns {Object} 响应数据
     */
    async callDeepSeekWithRetry(requestData) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🔄 第${attempt}次调用DeepSeek API`);
                const response = await ollamaService.callOllamaWithRetry(requestData, 1);
                return response;
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ 第${attempt}次尝试失败:`, error.message);
                
                if (attempt < this.maxRetries) {
                    const delay = attempt * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * 解析题目响应
     * @param {string} response - AI响应
     * @param {string} type - 题目类型
     * @param {number} index - 题目索引
     * @returns {Object} 解析后的题目
     */
    parseQuestionResponse(response, type, index) {
        try {
            // 提取JSON部分
            let jsonText = response.trim();
            
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonText);
            
            // 添加基础信息
            return {
                id: `deepseek_${type}_${index + 1}`,
                type: type,
                source: 'deepseek',
                enhanced: true,
                qualityScore: this.calculateQuestionQuality(parsed, type),
                generatedAt: new Date().toISOString(),
                ...parsed
            };

        } catch (error) {
            console.error('解析DeepSeek响应失败:', error.message);
            console.log('原始响应:', response);
            return null;
        }
    }

    /**
     * 计算题目质量分数
     * @param {Object} question - 题目对象
     * @param {string} type - 题目类型
     * @returns {number} 质量分数 (0-1)
     */
    calculateQuestionQuality(question, type) {
        let score = 0.5; // 基础分数

        // 检查必要字段
        if (question.question && question.question.length > 10) score += 0.2;
        if (question.explanation && question.explanation.length > 20) score += 0.2;
        if (question.knowledgePoints && question.knowledgePoints.length > 0) score += 0.1;

        // 根据类型检查特定字段
        switch (type) {
            case 'multiple-choice':
                if (question.options && question.options.length === 4) score += 0.1;
                if (question.correctAnswer !== undefined && question.correctAnswer >= 0 && question.correctAnswer < 4) score += 0.1;
                break;
            case 'fill-blank':
                if (question.correctAnswer && question.correctAnswer.length > 1) score += 0.2;
                break;
            case 'essay':
                if (question.sampleAnswer && question.sampleAnswer.length > 20) score += 0.1;
                if (question.keyPoints && question.keyPoints.length > 0) score += 0.1;
                break;
            case 'conceptual':
                if (question.expectedAnswer && question.expectedAnswer.length > 20) score += 0.1;
                if (question.evaluationCriteria && question.evaluationCriteria.length > 0) score += 0.1;
                break;
        }

        return Math.min(1.0, score);
    }

    /**
     * 计算题目类型分布
     * @param {number} totalCount - 总题目数
     * @param {Array} types - 题目类型列表
     * @returns {Object} 类型分布
     */
    calculateTypeDistribution(totalCount, types) {
        const distribution = {};
        
        if (types.length === 1) {
            distribution[types[0]] = totalCount;
        } else {
            let remaining = totalCount;
            types.forEach((type, index) => {
                if (index === types.length - 1) {
                    distribution[type] = remaining;
                } else {
                    const count = Math.floor(totalCount / types.length);
                    distribution[type] = count;
                    remaining -= count;
                }
            });
        }

        return distribution;
    }

    /**
     * 优化题目质量
     * @param {Array} questions - 题目列表
     * @param {Object} processedDoc - 处理后的文档
     * @returns {Array} 优化后的题目
     */
    optimizeQuestions(questions, processedDoc) {
        return questions
            .filter(q => q && q.question) // 过滤无效题目
            .map(question => {
                // 添加文档相关性分数
                question.relevanceScore = this.calculateRelevanceScore(question, processedDoc);
                
                // 添加难度评估
                question.estimatedDifficulty = this.estimateQuestionDifficulty(question);
                
                return question;
            })
            .sort((a, b) => (b.qualityScore + b.relevanceScore) - (a.qualityScore + a.relevanceScore)); // 按质量排序
    }

    /**
     * 计算题目与文档的相关性
     * @param {Object} question - 题目对象
     * @param {Object} processedDoc - 处理后的文档
     * @returns {number} 相关性分数 (0-1)
     */
    calculateRelevanceScore(question, processedDoc) {
        let relevance = 0.5;

        const questionText = (question.question + ' ' + (question.explanation || '')).toLowerCase();
        const documentKeywords = processedDoc.globalMetadata?.topKeyTerms?.map(t => t.term.toLowerCase()) || [];

        // 检查关键词匹配
        const matchedKeywords = documentKeywords.filter(keyword => 
            questionText.includes(keyword)
        );
        
        if (matchedKeywords.length > 0) {
            relevance += Math.min(0.3, matchedKeywords.length * 0.1);
        }

        // 检查概念匹配
        const documentConcepts = processedDoc.concepts?.map(c => c.term.toLowerCase()) || [];
        const matchedConcepts = documentConcepts.filter(concept => 
            questionText.includes(concept)
        );
        
        if (matchedConcepts.length > 0) {
            relevance += Math.min(0.2, matchedConcepts.length * 0.1);
        }

        return Math.min(1.0, relevance);
    }

    /**
     * 估算题目难度
     * @param {Object} question - 题目对象
     * @returns {string} 难度等级
     */
    estimateQuestionDifficulty(question) {
        let difficultyScore = 1; // 基础难度

        const questionText = question.question || '';
        
        // 基于问题长度
        if (questionText.length > 100) difficultyScore += 0.5;
        
        // 基于复杂词汇
        const complexWords = (questionText.match(/[A-Z]{2,}|技术|理论|原理|分析|评价|综合/g) || []).length;
        difficultyScore += complexWords * 0.2;
        
        // 基于题目类型
        if (question.type === 'essay' || question.type === 'conceptual') {
            difficultyScore += 0.5;
        }

        if (difficultyScore <= 1.5) return 'easy';
        if (difficultyScore <= 2.5) return 'medium';
        return 'hard';
    }

    /**
     * 生成备用题目
     * @param {string} type - 题目类型
     * @param {Object} summary - 文档摘要
     * @param {number} index - 题目索引
     * @returns {Object} 备用题目
     */
    generateFallbackQuestion(type, summary, index) {
        const concept = summary.concepts[index % summary.concepts.length];
        const keyTerm = summary.keyTerms[index % summary.keyTerms.length];
        
        if (!concept && !keyTerm) return null;

        const baseTerm = concept?.term || keyTerm?.term || '重要概念';
        const baseDefinition = concept?.definition || '相关内容';

        switch (type) {
            case 'multiple-choice':
                return {
                    id: `fallback_mc_${index + 1}`,
                    type: 'multiple-choice',
                    question: `关于"${baseTerm}"，以下说法正确的是？`,
                    options: [
                        baseDefinition,
                        '这是错误的选项A',
                        '这是错误的选项B',
                        '这是错误的选项C'
                    ],
                    correctAnswer: 0,
                    explanation: `根据文档内容，${baseTerm}${baseDefinition}`,
                    knowledgePoints: [baseTerm],
                    source: 'fallback',
                    qualityScore: 0.6
                };

            case 'fill-blank':
                return {
                    id: `fallback_fb_${index + 1}`,
                    type: 'fill-blank',
                    question: `${baseTerm}是指______。`,
                    correctAnswer: baseDefinition,
                    explanation: `根据文档定义，${baseTerm}是指${baseDefinition}。`,
                    knowledgePoints: [baseTerm],
                    source: 'fallback',
                    qualityScore: 0.6
                };

            case 'essay':
                return {
                    id: `fallback_essay_${index + 1}`,
                    type: 'essay',
                    question: `请详细说明"${baseTerm}"的含义和重要性。`,
                    sampleAnswer: `${baseTerm}是指${baseDefinition}。这个概念在相关领域中具有重要意义...`,
                    keyPoints: [
                        `${baseTerm}的定义`,
                        `${baseTerm}的特点`,
                        `${baseTerm}的应用`
                    ],
                    explanation: `这道题考查对${baseTerm}概念的理解和应用。`,
                    knowledgePoints: [baseTerm],
                    source: 'fallback',
                    qualityScore: 0.6
                };

            default:
                return null;
        }
    }
}

module.exports = DeepSeekQuestionGenerator;