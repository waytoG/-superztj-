// 增强智能问题生成器 - 集成网络搜索和NLP分析
const DocumentProcessor = require('./documentProcessor');
const WebSearchService = require('./webSearchService');
const NLPService = require('./nlpService');

class EnhancedQuestionGenerator {
    constructor() {
        this.documentProcessor = new DocumentProcessor();
        this.webSearchService = new WebSearchService();
        this.nlpService = new NLPService();
        
        this.questionTemplates = this.initializeQuestionTemplates();
        this.difficultyWeights = {
            easy: { basic: 0.7, application: 0.2, analysis: 0.1 },
            medium: { basic: 0.4, application: 0.4, analysis: 0.2 },
            hard: { basic: 0.2, application: 0.3, analysis: 0.5 }
        };
        
        // 增强配置
        this.enhancedMode = true;
        this.useWebSearch = true;
        this.maxSearchConcepts = 10;
        this.qualityThreshold = 0.7;
        this.maxRetries = 3;
        
        console.log('🚀 增强智能问题生成器已就绪');
    }

    /**
     * 增强题目生成 - 主入口方法
     * @param {Object} analysisResult - 文档分析结果
     * @param {Object} options - 生成选项
     * @returns {Array} 生成的题目列表
     */
    async generateEnhancedQuestions(analysisResult, options = {}) {
        const {
            count = 10,
            difficulty = 'medium',
            types = ['multiple-choice', 'fill-blank', 'short-answer'],
            useWebSearch = this.useWebSearch,
            enhanceWithNLP = true,
            includeExplanations = true,
            maxRetries = this.maxRetries
        } = options;

        console.log(`🚀 开始增强题目生成: ${count}题, 难度: ${difficulty}`);

        try {
            // 1. NLP增强分析
            let enhancedAnalysis = analysisResult;
            if (enhanceWithNLP) {
                console.log('🧠 执行NLP增强分析...');
                enhancedAnalysis = await this.enhanceAnalysisWithNLP(analysisResult);
            }

            // 2. 网络搜索增强概念
            let enrichedConcepts = enhancedAnalysis.concepts || [];
            if (useWebSearch && enrichedConcepts.length > 0) {
                console.log('🔍 执行网络搜索增强...');
                enrichedConcepts = await this.enrichConceptsWithWebSearch(enrichedConcepts);
            }

            // 3. 生成高质量题目
            console.log('📝 生成高质量题目...');
            const questions = await this.generateHighQualityQuestions(
                enhancedAnalysis, 
                enrichedConcepts, 
                { count, difficulty, types, includeExplanations }
            );

            // 4. 质量评估和筛选
            console.log('🎯 执行质量评估...');
            const qualityQuestions = this.filterQuestionsByQuality(questions);

            // 5. 如果质量题目不足，进行补充生成
            if (qualityQuestions.length < count * 0.7) {
                console.log('🔄 质量题目不足，执行补充生成...');
                const additionalQuestions = await this.generateAdditionalQuestions(
                    enhancedAnalysis, 
                    enrichedConcepts, 
                    count - qualityQuestions.length,
                    { difficulty, types, includeExplanations }
                );
                qualityQuestions.push(...additionalQuestions);
            }

            console.log(`✅ 增强题目生成完成: 生成${questions.length}题, 最终输出${qualityQuestions.length}题`);
            
            return qualityQuestions.slice(0, count);
            
        } catch (error) {
            console.error('增强题目生成失败:', error);
            // 降级到基础生成
            return this.generateBasicQuestions(analysisResult, options);
        }
    }

    /**
     * 使用NLP增强分析结果
     * @param {Object} analysisResult - 原始分析结果
     * @returns {Object} 增强的分析结果
     */
    async enhanceAnalysisWithNLP(analysisResult) {
        const enhancedAnalysis = { ...analysisResult };
        
        try {
            // 对文档内容进行NLP分析
            const content = this.extractContentFromAnalysis(analysisResult);
            if (!content || content.length < 10) {
                console.warn('内容太短，跳过NLP分析');
                return enhancedAnalysis;
            }

            const nlpResult = await this.nlpService.analyzeText(content, {
                extractEntities: true,
                extractConcepts: true,
                extractRelationships: true,
                extractKeyPhrases: true,
                minConceptLength: 2,
                maxConceptLength: 20
            });
            
            // 合并NLP分析结果
            enhancedAnalysis.nlpAnalysis = nlpResult;
            enhancedAnalysis.entities = this.mergeEntities(enhancedAnalysis.entities || [], nlpResult.entities || []);
            enhancedAnalysis.relationships = nlpResult.relationships || [];
            enhancedAnalysis.keyPhrases = nlpResult.keyPhrases || [];
            enhancedAnalysis.concepts = this.enhanceConceptsWithNLP(
                enhancedAnalysis.concepts || [], 
                nlpResult.concepts || []
            );
            
            console.log(`🎯 NLP增强完成: 发现${nlpResult.entities?.length || 0}个实体, ${nlpResult.concepts?.length || 0}个概念`);
            
        } catch (error) {
            console.error('NLP增强失败:', error);
        }
        
        return enhancedAnalysis;
    }

    /**
     * 使用网络搜索丰富概念信息
     * @param {Array} concepts - 概念列表
     * @returns {Array} 丰富的概念列表
     */
    async enrichConceptsWithWebSearch(concepts) {
        if (!concepts || concepts.length === 0) {
            console.warn('没有概念需要搜索');
            return concepts;
        }

        console.log(`🔍 网络搜索增强 ${Math.min(concepts.length, this.maxSearchConcepts)} 个概念...`);
        
        try {
            // 选择最重要的概念进行搜索
            const topConcepts = concepts
                .filter(c => c && (c.text || c.name))
                .sort((a, b) => (b.importance || b.frequency || 0) - (a.importance || a.frequency || 0))
                .slice(0, this.maxSearchConcepts)
                .map(c => c.text || c.name);
            
            if (topConcepts.length === 0) {
                console.warn('没有有效的概念文本');
                return concepts;
            }
            
            // 批量搜索概念
            const searchResults = await this.webSearchService.batchSearchConcepts(topConcepts, {
                includeDefinition: true,
                includeExamples: true,
                includeRelated: true
            });
            
            // 将搜索结果合并到概念中
            const enrichedConcepts = concepts.map(concept => {
                const conceptText = concept.text || concept.name;
                const searchInfo = searchResults[conceptText];
                
                if (searchInfo && searchInfo.confidence > 0.3) {
                    return {
                        ...concept,
                        webInfo: searchInfo,
                        definition: searchInfo.definition,
                        examples: searchInfo.examples || [],
                        relatedConcepts: searchInfo.relatedConcepts || [],
                        applications: searchInfo.applications || [],
                        enhanced: true,
                        confidence: searchInfo.confidence
                    };
                }
                
                return concept;
            });
            
            const enhancedCount = enrichedConcepts.filter(c => c.enhanced).length;
            console.log(`✅ 网络搜索完成: ${enhancedCount}个概念获得增强信息`);
            
            return enrichedConcepts;
            
        } catch (error) {
            console.error('网络搜索增强失败:', error);
            return concepts;
        }
    }

    /**
     * 生成高质量题目
     * @param {Object} analysis - 分析结果
     * @param {Array} concepts - 概念列表
     * @param {Object} options - 选项
     * @returns {Array} 题目列表
     */
    async generateHighQualityQuestions(analysis, concepts, options) {
        const { count, difficulty, types, includeExplanations } = options;
        const questions = [];
        
        if (!concepts || concepts.length === 0) {
            console.warn('没有概念可用于生成题目');
            return [];
        }
        
        // 按类型分配题目数量
        const typeDistribution = this.distributeQuestionTypes(count, types);
        
        for (const [type, typeCount] of Object.entries(typeDistribution)) {
            if (typeCount > 0) {
                const typeQuestions = await this.generateQuestionsByType(
                    type, 
                    typeCount, 
                    analysis, 
                    concepts, 
                    difficulty,
                    includeExplanations
                );
                questions.push(...typeQuestions);
            }
        }
        
        return questions;
    }

    /**
     * 按类型生成题目
     * @param {string} type - 题目类型
     * @param {number} count - 数量
     * @param {Object} analysis - 分析结果
     * @param {Array} concepts - 概念列表
     * @param {string} difficulty - 难度
     * @param {boolean} includeExplanations - 是否包含解释
     * @returns {Array} 题目列表
     */
    async generateQuestionsByType(type, count, analysis, concepts, difficulty, includeExplanations) {
        const questions = [];
        const templates = this.questionTemplates[type] || {};
        
        for (let i = 0; i < count && i < concepts.length; i++) {
            try {
                // 选择概念
                const concept = concepts[i % concepts.length];
                if (!concept) continue;
                
                // 选择难度级别
                const level = this.selectDifficultyLevel(difficulty);
                
                // 选择模板
                const template = this.selectTemplate(templates[level] || templates.basic || []);
                if (!template) continue;
                
                // 生成题目
                const question = await this.generateQuestionFromTemplate(
                    template, 
                    concept, 
                    analysis, 
                    type, 
                    level,
                    includeExplanations
                );
                
                if (question && this.validateQuestion(question)) {
                    questions.push(question);
                }
                
            } catch (error) {
                console.error(`生成${type}题目失败:`, error);
            }
        }
        
        return questions;
    }

    /**
     * 从模板生成题目
     * @param {string} template - 题目模板
     * @param {Object} concept - 概念
     * @param {Object} analysis - 分析结果
     * @param {string} type - 题目类型
     * @param {string} level - 难度级别
     * @param {boolean} includeExplanations - 是否包含解释
     * @returns {Object} 题目对象
     */
    async generateQuestionFromTemplate(template, concept, analysis, type, level, includeExplanations) {
        const conceptText = concept.text || concept.name || '概念';
        const conceptInfo = concept.webInfo || {};
        
        // 替换模板变量
        let questionText = template
            .replace(/{concept}/g, conceptText)
            .replace(/{concept1}/g, conceptText)
            .replace(/{concept2}/g, this.getRelatedConcept(concept, analysis))
            .replace(/{context}/g, this.getContextForConcept(concept))
            .replace(/{scenario}/g, this.getScenarioForConcept(concept))
            .replace(/{perspective}/g, this.getPerspectiveForConcept(concept))
            .replace(/{condition}/g, this.getConditionForConcept(concept))
            .replace(/{field}/g, this.getFieldForConcept(concept));
        
        // 生成选项（如果是选择题）
        let options = [];
        if (type === 'multiple-choice') {
            options = await this.generateOptionsForQuestion(questionText, concept, analysis);
        }
        
        // 生成答案
        const answer = await this.generateAnswerForQuestion(questionText, concept, type, options);
        
        // 生成解释
        let explanation = '';
        if (includeExplanations) {
            explanation = await this.generateExplanation(questionText, answer, concept, conceptInfo);
        }
        
        // 计算质量分数
        const qualityScore = this.calculateQuestionQuality(questionText, concept, answer, explanation);
        
        return {
            id: this.generateQuestionId(),
            type: type,
            difficulty: level,
            question: questionText,
            options: options,
            answer: answer,
            explanation: explanation,
            concept: conceptText,
            conceptInfo: conceptInfo,
            qualityScore: qualityScore,
            source: 'enhanced_generator',
            enhanced: concept.enhanced || false,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 生成题目选项
     * @param {string} questionText - 题目文本
     * @param {Object} concept - 概念
     * @param {Object} analysis - 分析结果
     * @returns {Array} 选项列表
     */
    async generateOptionsForQuestion(questionText, concept, analysis) {
        const options = [];
        
        try {
            // 正确答案
            const correctAnswer = this.generateCorrectAnswer(questionText, concept);
            if (correctAnswer) {
                options.push({ text: correctAnswer, correct: true });
            }
            
            // 错误选项
            const wrongOptions = this.generateWrongOptions(questionText, concept, analysis, 3);
            wrongOptions.forEach(option => {
                if (option) {
                    options.push({ text: option, correct: false });
                }
            });
            
            // 确保至少有4个选项
            while (options.length < 4) {
                options.push({ 
                    text: `关于${concept.text || concept.name}的其他描述`, 
                    correct: false 
                });
            }
            
            // 打乱选项顺序
            return this.shuffleArray(options);
            
        } catch (error) {
            console.error('生成选项失败:', error);
            return [
                { text: '选项A', correct: true },
                { text: '选项B', correct: false },
                { text: '选项C', correct: false },
                { text: '选项D', correct: false }
            ];
        }
    }

    /**
     * 生成正确答案
     * @param {string} questionText - 题目文本
     * @param {Object} concept - 概念
     * @returns {string} 正确答案
     */
    generateCorrectAnswer(questionText, concept) {
        const conceptText = concept.text || concept.name || '概念';
        const conceptInfo = concept.webInfo || {};
        
        // 基于问题类型生成答案
        if (questionText.includes('定义')) {
            return conceptInfo.definition || `${conceptText}是一个重要的概念`;
        } else if (questionText.includes('特点') || questionText.includes('特征')) {
            return conceptInfo.examples?.[0] || `${conceptText}具有独特的特征`;
        } else if (questionText.includes('应用')) {
            return conceptInfo.applications?.[0] || `${conceptText}在实际中有重要应用`;
        } else if (questionText.includes('作用')) {
            return `${conceptText}发挥重要作用`;
        }
        
        return conceptInfo.summary || `${conceptText}的正确描述`;
    }

    /**
     * 生成错误选项
     * @param {string} questionText - 题目文本
     * @param {Object} concept - 概念
     * @param {Object} analysis - 分析结果
     * @param {number} count - 选项数量
     * @returns {Array} 错误选项列表
     */
    generateWrongOptions(questionText, concept, analysis, count) {
        const options = [];
        const conceptText = concept.text || concept.name || '概念';
        
        // 使用相关概念作为干扰项
        if (concept.relatedConcepts && concept.relatedConcepts.length > 0) {
            concept.relatedConcepts.slice(0, Math.min(count, concept.relatedConcepts.length)).forEach(related => {
                options.push(`与${related}相关的描述`);
            });
        }
        
        // 生成通用干扰项
        const genericOptions = [
            `${conceptText}的错误理解`,
            `与${conceptText}相似但不同的概念`,
            `${conceptText}的过时定义`,
            `${conceptText}的不完整描述`
        ];
        
        // 填充剩余选项
        while (options.length < count) {
            const remaining = count - options.length;
            const toAdd = Math.min(remaining, genericOptions.length);
            options.push(...genericOptions.slice(0, toAdd));
            if (options.length < count) {
                options.push(`其他关于${conceptText}的错误说法`);
            }
        }
        
        return options.slice(0, count);
    }

    /**
     * 生成答案
     * @param {string} questionText - 题目文本
     * @param {Object} concept - 概念
     * @param {string} type - 题目类型
     * @param {Array} options - 选项（选择题）
     * @returns {string} 答案
     */
    async generateAnswerForQuestion(questionText, concept, type, options) {
        const conceptText = concept.text || concept.name || '概念';
        const conceptInfo = concept.webInfo || {};
        
        if (type === 'multiple-choice' && options.length > 0) {
            const correctOption = options.find(opt => opt.correct);
            return correctOption ? correctOption.text : options[0].text;
        } else if (type === 'fill-blank') {
            return conceptInfo.definition || conceptText;
        } else if (type === 'short-answer') {
            return conceptInfo.summary || `${conceptText}是一个重要概念，需要深入理解其含义和应用。`;
        }
        
        return conceptText;
    }

    /**
     * 生成题目解释
     * @param {string} questionText - 题目文本
     * @param {string} answer - 答案
     * @param {Object} concept - 概念
     * @param {Object} conceptInfo - 概念信息
     * @returns {string} 解释文本
     */
    async generateExplanation(questionText, answer, concept, conceptInfo) {
        const conceptText = concept.text || concept.name || '概念';
        
        let explanation = `关于${conceptText}的详细解释：\n\n`;
        
        // 添加定义
        if (conceptInfo.definition) {
            explanation += `📖 定义：${conceptInfo.definition}\n\n`;
        }
        
        // 添加关键示例
        if (conceptInfo.examples && conceptInfo.examples.length > 0) {
            explanation += `💡 关键示例：${conceptInfo.examples.slice(0, 2).join('、')}\n\n`;
        }
        
        // 添加应用场景
        if (conceptInfo.applications && conceptInfo.applications.length > 0) {
            explanation += `🎯 应用场景：${conceptInfo.applications.slice(0, 2).join('、')}\n\n`;
        }
        
        // 添加相关概念
        if (conceptInfo.relatedConcepts && conceptInfo.relatedConcepts.length > 0) {
            explanation += `🔗 相关概念：${conceptInfo.relatedConcepts.slice(0, 3).join('、')}\n\n`;
        }
        
        // 添加答案解析
        explanation += `✅ 答案解析：${answer}是正确的，因为它准确反映了${conceptText}的核心特征和本质。`;
        
        // 如果有网络搜索来源，添加参考信息
        if (conceptInfo.sources && conceptInfo.sources.length > 0) {
            explanation += `\n\n📚 参考来源：${conceptInfo.sources.map(s => s.source).join('、')}`;
        }
        
        return explanation;
    }

    /**
     * 计算题目质量分数
     * @param {string} questionText - 题目文本
     * @param {Object} concept - 概念
     * @param {string} answer - 答案
     * @param {string} explanation - 解释
     * @returns {number} 质量分数 (0-1)
     */
    calculateQuestionQuality(questionText, concept, answer, explanation) {
        let score = 0;
        
        // 题目长度合理性 (0.15)
        const questionLength = questionText.length;
        if (questionLength >= 15 && questionLength <= 150) {
            score += 0.15;
        } else if (questionLength >= 10) {
            score += 0.1;
        }
        
        // 概念增强程度 (0.25)
        if (concept.enhanced && concept.webInfo && concept.webInfo.confidence > 0.7) {
            score += 0.25;
        } else if (concept.enhanced && concept.webInfo) {
            score += 0.15;
        } else if (concept.webInfo) {
            score += 0.1;
        }
        
        // 答案质量 (0.2)
        if (answer && answer.length > 10 && answer.length < 200) {
            score += 0.2;
        } else if (answer && answer.length > 5) {
            score += 0.1;
        }
        
        // 解释完整性 (0.2)
        if (explanation && explanation.length > 100) {
            score += 0.2;
        } else if (explanation && explanation.length > 50) {
            score += 0.15;
        } else if (explanation) {
            score += 0.1;
        }
        
        // 题目清晰度 (0.1)
        if (questionText.includes('？') || questionText.includes('?')) {
            score += 0.05;
        }
        if (!questionText.includes('undefined') && !questionText.includes('null')) {
            score += 0.05;
        }
        
        // 概念相关性 (0.1)
        const conceptText = concept.text || concept.name || '';
        if (conceptText && questionText.includes(conceptText)) {
            score += 0.1;
        }
        
        return Math.min(score, 1);
    }

    /**
     * 按质量筛选题目
     * @param {Array} questions - 题目列表
     * @returns {Array} 筛选后的题目列表
     */
    filterQuestionsByQuality(questions) {
        return questions
            .filter(q => q && q.qualityScore >= this.qualityThreshold)
            .sort((a, b) => b.qualityScore - a.qualityScore);
    }

    /**
     * 生成补充题目
     * @param {Object} analysis - 分析结果
     * @param {Array} concepts - 概念列表
     * @param {number} count - 需要的数量
     * @param {Object} options - 选项
     * @returns {Array} 补充题目列表
     */
    async generateAdditionalQuestions(analysis, concepts, count, options) {
        console.log(`🔄 生成${count}个补充题目...`);
        
        // 降低质量阈值
        const originalThreshold = this.qualityThreshold;
        this.qualityThreshold = Math.max(0.4, originalThreshold - 0.2);
        
        try {
            const additionalQuestions = await this.generateHighQualityQuestions(
                analysis, 
                concepts, 
                { ...options, count: count * 2 } // 生成更多然后筛选
            );
            
            return additionalQuestions.slice(0, count);
        } finally {
            // 恢复原始阈值
            this.qualityThreshold = originalThreshold;
        }
    }

    /**
     * 基础题目生成（降级方案）
     * @param {Object} analysisResult - 分析结果
     * @param {Object} options - 选项
     * @returns {Array} 基础题目列表
     */
    async generateBasicQuestions(analysisResult, options) {
        console.log('🔄 使用基础题目生成...');
        
        const { count = 5, difficulty = 'medium' } = options;
        const questions = [];
        
        // 提取基本概念
        const concepts = this.extractBasicConcepts(analysisResult);
        
        for (let i = 0; i < Math.min(count, concepts.length); i++) {
            const concept = concepts[i];
            const question = {
                id: this.generateQuestionId(),
                type: 'multiple-choice',
                difficulty: 'basic',
                question: `关于${concept}，以下说法正确的是？`,
                options: [
                    { text: `${concept}是一个重要概念`, correct: true },
                    { text: `${concept}不重要`, correct: false },
                    { text: `${concept}已过时`, correct: false },
                    { text: `${concept}无法理解`, correct: false }
                ],
                answer: `${concept}是一个重要概念`,
                explanation: `${concept}在相关领域中具有重要意义，需要深入理解。`,
                concept: concept,
                qualityScore: 0.5,
                source: 'basic_generator',
                timestamp: new Date().toISOString()
            };
            
            questions.push(question);
        }
        
        return questions;
    }

    // 辅助方法
    initializeQuestionTemplates() {
        return {
            'multiple-choice': {
                basic: [
                    '根据文中内容，{concept}的定义是什么？',
                    '文中提到的{concept}具有以下哪个特点？',
                    '关于{concept}，以下说法正确的是？',
                    '{concept}属于以下哪个类别？',
                    '文中{concept}的主要作用是什么？'
                ],
                application: [
                    '在实际应用中，{concept}可以用来解决什么问题？',
                    '如果要实现{concept}，首先需要考虑什么？',
                    '在{context}情况下，应该如何运用{concept}？',
                    '将{concept}应用到{scenario}中，最可能的结果是？',
                    '要判断{concept}是否有效，主要看哪个指标？'
                ],
                analysis: [
                    '比较{concept1}和{concept2}的主要区别是什么？',
                    '分析{concept}产生的根本原因是什么？',
                    '从{perspective}角度看，{concept}的优缺点是什么？',
                    '如果{condition}发生变化，{concept}会如何受到影响？',
                    '评价{concept}在{field}中的重要性如何？'
                ]
            },
            'fill-blank': {
                basic: [
                    '{concept}的核心要素包括______。',
                    '实现{concept}的基本步骤是______。',
                    '根据定义，{concept}是指______的过程。'
                ],
                application: [
                    '在{context}中应用{concept}时，关键是要______。',
                    '要成功实施{concept}，必须确保______。'
                ],
                analysis: [
                    '{concept}与{concept2}的本质区别在于______。',
                    '从{perspective}角度分析，{concept}的核心价值是______。'
                ]
            },
            'short-answer': {
                basic: [
                    '请简述{concept}的基本含义。',
                    '解释{concept}的主要特征。',
                    '描述{concept}的基本原理。'
                ],
                application: [
                    '举例说明{concept}在实际中的应用。',
                    '分析如何在{context}中有效运用{concept}。',
                    '讨论{concept}解决实际问题的方法。'
                ],
                analysis: [
                    '比较分析{concept1}和{concept2}的异同。',
                    '评价{concept}在{field}中的作用和意义。',
                    '从多个角度分析{concept}的影响因素。'
                ]
            }
        };
    }

    extractContentFromAnalysis(analysisResult) {
        if (analysisResult.content) {
            return analysisResult.content;
        }
        
        if (analysisResult.chunks && analysisResult.chunks.length > 0) {
            return analysisResult.chunks.map(chunk => chunk.content || '').join('\n');
        }
        
        if (analysisResult.text) {
            return analysisResult.text;
        }
        
        return '';
    }

    extractBasicConcepts(analysisResult) {
        const concepts = [];
        
        if (analysisResult.concepts) {
            concepts.push(...analysisResult.concepts.map(c => c.text || c.name || c));
        }
        
        if (analysisResult.keyPhrases) {
            concepts.push(...analysisResult.keyPhrases);
        }
        
        if (concepts.length === 0) {
            concepts.push('重要概念', '核心内容', '关键知识点');
        }
        
        return [...new Set(concepts)].slice(0, 10);
    }

    mergeEntities(original, nlpEntities) {
        const merged = [...original];
        const existingTexts = new Set(original.map(e => e.text || e.value));
        
        nlpEntities.forEach(entity => {
            const text = entity.text || entity.value;
            if (text && !existingTexts.has(text)) {
                merged.push(entity);
                existingTexts.add(text);
            }
        });
        
        return merged;
    }

    enhanceConceptsWithNLP(originalConcepts, nlpConcepts) {
        const enhanced = [...originalConcepts];
        const existingTexts = new Set(originalConcepts.map(c => c.text || c.name));
        
        nlpConcepts.forEach(nlpConcept => {
            const text = nlpConcept.text;
            if (text && !existingTexts.has(text)) {
                enhanced.push({
                    text: text,
                    name: text,
                    frequency: nlpConcept.frequency || 1,
                    type: nlpConcept.type || 'nlp_extracted',
                    importance: nlpConcept.frequency || 1
                });
                existingTexts.add(text);
            }
        });
        
        return enhanced;
    }

    selectDifficultyLevel(difficulty) {
        const weights = this.difficultyWeights[difficulty] || this.difficultyWeights.medium;
        const levels = Object.keys(weights);
        const random = Math.random();
        
        let cumulative = 0;
        for (const level of levels) {
            cumulative += weights[level];
            if (random <= cumulative) {
                return level;
            }
        }
        
        return levels[0];
    }

    selectTemplate(templates) {
        if (!templates || templates.length === 0) return null;
        return templates[Math.floor(Math.random() * templates.length)];
    }

    getRelatedConcept(concept, analysis) {
        if (concept.relatedConcepts && concept.relatedConcepts.length > 0) {
            return concept.relatedConcepts[0];
        }
        
        const allConcepts = analysis.concepts || [];
        const otherConcepts = allConcepts.filter(c => 
            (c.text || c.name) !== (concept.text || concept.name)
        );
        
        return otherConcepts.length > 0 ? 
            (otherConcepts[0].text || otherConcepts[0].name) : 
            '相关概念';
    }

    getContextForConcept(concept) {
        if (concept.webInfo && concept.webInfo.applications && concept.webInfo.applications.length > 0) {
            return concept.webInfo.applications[0];
        }
        return '实际应用中';
    }

    getScenarioForConcept(concept) {
        const conceptText = concept.text || concept.name || '概念';
        return `${conceptText}相关的实际场景`;
    }

    getPerspectiveForConcept(concept) {
        return '理论和实践';
    }

    getConditionForConcept(concept) {
        return '外部环境';
    }

    getFieldForConcept(concept) {
        if (concept.webInfo && concept.webInfo.applications && concept.webInfo.applications.length > 0) {
            return concept.webInfo.applications[0];
        }
        return '相关领域';
    }

    distributeQuestionTypes(totalCount, types) {
        const distribution = {};
        const typeCount = types.length;
        const baseCount = Math.floor(totalCount / typeCount);
        const remainder = totalCount % typeCount;
        
        types.forEach((type, index) => {
            distribution[type] = baseCount + (index < remainder ? 1 : 0);
        });
        
        return distribution;
    }

    generateQuestionId() {
        return 'eq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    validateQuestion(question) {
        return question && 
               question.question && 
               question.question.length > 5 && 
               !question.question.includes('undefined') &&
               !question.question.includes('null') &&
               question.answer && 
               question.qualityScore > 0;
    }

    /**
     * 获取服务状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            enhancedMode: this.enhancedMode,
            useWebSearch: this.useWebSearch,
            qualityThreshold: this.qualityThreshold,
            maxSearchConcepts: this.maxSearchConcepts,
            templateCount: Object.keys(this.questionTemplates).length,
            version: '2.0.0'
        };
    }
}

module.exports = EnhancedQuestionGenerator;