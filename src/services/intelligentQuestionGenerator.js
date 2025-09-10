// 智能问题生成器 - 基于文档分析生成高质量题目
const DocumentProcessor = require('./documentProcessor');
const WebSearchService = require('./webSearchService');
const NLPService = require('./nlpService');
const MathFormulaHandler = require('../utils/mathFormulaHandler');

class IntelligentQuestionGenerator {
    constructor() {
        this.documentProcessor = new DocumentProcessor();
        this.webSearchService = new WebSearchService();
        this.nlpService = new NLPService();
        this.mathHandler = new MathFormulaHandler();
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
        
        console.log('🎯 智能问题生成器已就绪 (增强模式)');
    }

    /**
     * 初始化问题模板
     * @returns {Object} 问题模板集合
     */
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
                    '{concept}的核心要素包括______、______和______。',
                    '实现{concept}的基本步骤是：首先______，然后______。',
                    '根据定义，{concept}是指______的过程。',
                    '{concept}与______密切相关，两者的关系是______。',
                    '在{field}领域中，{concept}通常表现为______。'
                ],
                application: [
                    '要解决{problem}问题，可以采用______方法，其关键在于______。',
                    '在{scenario}情况下，运用{concept}需要注意______和______。',
                    '实践中，{concept}的效果主要取决于______因素。',
                    '当面临{challenge}时，{concept}的应对策略是______。',
                    '为了提高{concept}的效率，应该重点关注______环节。'
                ],
                analysis: [
                    '从{angle}分析，{concept}的深层机制是______。',
                    '造成{phenomenon}的根本原因在于______，其影响因素包括______。',
                    '比较不同方法，{concept}的独特优势体现在______方面。',
                    '综合考虑各种因素，{concept}的发展趋势是______。',
                    '批判性地看，{concept}存在的主要局限性是______。'
                ]
            },
            'essay': {
                basic: [
                    '请解释{concept}的基本含义和主要特征。',
                    '简述{concept}的发展历程和重要意义。',
                    '描述{concept}的基本原理和工作机制。',
                    '概括{concept}在{field}中的基本应用。',
                    '说明{concept}与相关概念的联系和区别。'
                ],
                application: [
                    '结合具体案例，分析{concept}的实际应用价值。',
                    '设计一个方案，说明如何在{scenario}中运用{concept}。',
                    '针对{problem}问题，提出基于{concept}的解决思路。',
                    '评估{concept}在不同环境下的适用性和局限性。',
                    '论述{concept}对{field}发展的推动作用。'
                ],
                analysis: [
                    '深入分析{concept}的理论基础和实践意义。',
                    '批判性地评价{concept}的优势与不足。',
                    '从多个角度论述{concept}对{field}的影响。',
                    '比较分析不同{concept}的特点和适用条件。',
                    '探讨{concept}未来发展的机遇与挑战。'
                ]
            }
        };
    }

    /**
     * 基于处理后的文档生成智能题目
     * @param {Object} processedDoc - 处理后的文档数据
     * @param {Object} options - 生成选项
     * @returns {Array} 生成的题目列表
     */
    async generateIntelligentQuestions(processedDoc, options = {}) {
        const {
            questionCount = 20,
            questionTypes = ['multiple-choice', 'fill-blank', 'essay'],
            difficulty = 'medium',
            focusAreas = []
        } = options;

        console.log(`🧠 开始智能生成 ${questionCount} 道题目`);

        try {
            // 分析文档内容，提取关键信息
            const contentAnalysis = this.analyzeDocumentContent(processedDoc);
            
            // 确定题目分布
            const questionDistribution = this.calculateQuestionDistribution(
                questionCount, questionTypes, difficulty
            );

            // 生成题目
            const questions = [];
            
            for (const [type, typeCount] of Object.entries(questionDistribution)) {
                if (typeCount > 0) {
                    const typeQuestions = await this.generateQuestionsByType(
                        type, typeCount, contentAnalysis, difficulty, focusAreas
                    );
                    questions.push(...typeQuestions);
                }
            }

            // 质量检查和优化
            const optimizedQuestions = this.optimizeQuestions(questions, contentAnalysis);
            
            // 确保题目覆盖重要知识点
            const finalQuestions = this.ensureKnowledgeCoverage(
                optimizedQuestions, contentAnalysis, questionCount
            );

            // 处理数学公式
            console.log('🔧 处理题目中的数学公式...');
            const processedQuestions = this.mathHandler.processQuestionsMath(finalQuestions, {
                renderMode: options.mathRenderMode || 'html', // 使用HTML模式避免$符号显示
                autoWrap: false,
                preserveOriginal: true
            });

            console.log(`✅ 智能生成完成，共 ${processedQuestions.length} 道高质量题目（已处理数学公式）`);
            return processedQuestions;

        } catch (error) {
            console.error('智能题目生成失败:', error);
            throw new Error(`智能题目生成失败: ${error.message}`);
        }
    }

    /**
     * 分析文档内容
     * @param {Object} processedDoc - 处理后的文档
     * @returns {Object} 内容分析结果
     */
    analyzeDocumentContent(processedDoc) {
        const { chunks, globalMetadata, knowledgeGraph, importantSections } = processedDoc;

        // 提取核心概念
        const coreConcepts = this.extractCoreConcepts(globalMetadata, knowledgeGraph);
        
        // 识别知识层次
        const knowledgeLevels = this.identifyKnowledgeLevels(chunks);
        
        // 分析概念关系
        const conceptRelations = this.analyzeConceptRelations(knowledgeGraph);
        
        // 识别应用场景
        const applicationScenarios = this.identifyApplicationScenarios(chunks);
        
        // 提取关键事实
        const keyFacts = this.extractKeyFacts(importantSections);

        return {
            coreConcepts,
            knowledgeLevels,
            conceptRelations,
            applicationScenarios,
            keyFacts,
            documentStructure: globalMetadata.documentStructure,
            complexity: globalMetadata.averageComplexity
        };
    }

    /**
     * 提取核心概念
     * @param {Object} globalMetadata - 全局元数据
     * @param {Object} knowledgeGraph - 知识图谱
     * @returns {Array} 核心概念列表
     */
    extractCoreConcepts(globalMetadata, knowledgeGraph) {
        const concepts = [];
        
        // 从高频关键词中提取
        globalMetadata.topKeyTerms.slice(0, 15).forEach(({ term, frequency }) => {
            concepts.push({
                name: term,
                frequency: frequency,
                importance: Math.log(frequency + 1),
                type: 'keyword',
                contexts: []
            });
        });

        // 从知识图谱节点中提取
        knowledgeGraph.nodes.slice(0, 10).forEach(node => {
            const existing = concepts.find(c => c.name === node.id);
            if (existing) {
                existing.importance += node.importance;
                existing.type = 'core';
            } else {
                concepts.push({
                    name: node.id,
                    frequency: node.frequency,
                    importance: node.importance,
                    type: 'graph',
                    contexts: []
                });
            }
        });

        // 从文档结构中提取
        if (globalMetadata.documentStructure.definitions) {
            globalMetadata.documentStructure.definitions.forEach(def => {
                const conceptName = def.split(/是|指|称为|定义为/)[0].trim();
                if (conceptName.length > 1 && conceptName.length < 20) {
                    concepts.push({
                        name: conceptName,
                        definition: def,
                        importance: 3,
                        type: 'definition',
                        contexts: []
                    });
                }
            });
        }

        return concepts
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 25);
    }

    /**
     * 识别知识层次
     * @param {Array} chunks - 文档块
     * @returns {Object} 知识层次分析
     */
    identifyKnowledgeLevels(chunks) {
        const levels = {
            factual: [], // 事实性知识
            conceptual: [], // 概念性知识
            procedural: [], // 程序性知识
            metacognitive: [] // 元认知知识
        };

        chunks.forEach(chunk => {
            const content = chunk.content.toLowerCase();
            
            // 识别事实性知识（定义、数据、事实）
            if (content.includes('定义') || content.includes('是') || 
                content.match(/\d+%|\d+年|\d+个/)) {
                levels.factual.push({
                    chunkIndex: chunk.index,
                    content: chunk.content.substring(0, 100) + '...',
                    confidence: 0.8
                });
            }
            
            // 识别概念性知识（分类、原理、理论）
            if (content.includes('原理') || content.includes('理论') || 
                content.includes('分类') || content.includes('关系')) {
                levels.conceptual.push({
                    chunkIndex: chunk.index,
                    content: chunk.content.substring(0, 100) + '...',
                    confidence: 0.7
                });
            }
            
            // 识别程序性知识（方法、步骤、技能）
            if (content.includes('方法') || content.includes('步骤') || 
                content.includes('如何') || content.includes('技巧')) {
                levels.procedural.push({
                    chunkIndex: chunk.index,
                    content: chunk.content.substring(0, 100) + '...',
                    confidence: 0.6
                });
            }
            
            // 识别元认知知识（策略、反思、评价）
            if (content.includes('策略') || content.includes('评价') || 
                content.includes('反思') || content.includes('监控')) {
                levels.metacognitive.push({
                    chunkIndex: chunk.index,
                    content: chunk.content.substring(0, 100) + '...',
                    confidence: 0.5
                });
            }
        });

        return levels;
    }

    /**
     * 分析概念关系
     * @param {Object} knowledgeGraph - 知识图谱
     * @returns {Array} 概念关系列表
     */
    analyzeConceptRelations(knowledgeGraph) {
        const relations = [];
        
        knowledgeGraph.edges.forEach(edge => {
            relations.push({
                source: edge.source,
                target: edge.target,
                type: 'cooccurrence',
                strength: edge.weight,
                context: `在第${edge.chunkIndex + 1}段中共同出现`
            });
        });

        // 按关系强度排序
        return relations
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 20);
    }

    /**
     * 识别应用场景
     * @param {Array} chunks - 文档块
     * @returns {Array} 应用场景列表
     */
    identifyApplicationScenarios(chunks) {
        const scenarios = [];
        const scenarioPatterns = [
            /在(.{1,20})中应用/g,
            /用于(.{1,20})的/g,
            /适用于(.{1,20})情况/g,
            /可以解决(.{1,20})问题/g,
            /在(.{1,20})领域/g
        ];

        chunks.forEach(chunk => {
            scenarioPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(chunk.content)) !== null) {
                    const scenario = match[1].trim();
                    if (scenario.length > 2 && scenario.length < 30) {
                        scenarios.push({
                            scenario: scenario,
                            chunkIndex: chunk.index,
                            context: match[0]
                        });
                    }
                }
            });
        });

        return scenarios.slice(0, 15);
    }

    /**
     * 提取关键事实
     * @param {Array} importantSections - 重要段落
     * @returns {Array} 关键事实列表
     */
    extractKeyFacts(importantSections) {
        const facts = [];
        
        importantSections.forEach(section => {
            // 提取数字事实
            const numberFacts = section.content.match(/\d+(?:\.\d+)?[%年个月日]/g) || [];
            numberFacts.forEach(fact => {
                facts.push({
                    type: 'numeric',
                    content: fact,
                    context: section.content.substring(0, 50) + '...',
                    importance: section.importance
                });
            });

            // 提取定义事实
            const definitionFacts = section.content.match(/.{1,30}(?:是|指|称为).{1,50}/g) || [];
            definitionFacts.forEach(fact => {
                facts.push({
                    type: 'definition',
                    content: fact.trim(),
                    context: section.content.substring(0, 50) + '...',
                    importance: section.importance
                });
            });
        });

        return facts
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 20);
    }

    /**
     * 计算题目分布
     * @param {number} totalCount - 总题目数
     * @param {Array} questionTypes - 题目类型
     * @param {string} difficulty - 难度等级
     * @returns {Object} 题目分布
     */
    calculateQuestionDistribution(totalCount, questionTypes, difficulty) {
        const distribution = {};
        const typeCount = questionTypes.length;
        
        if (typeCount === 1) {
            distribution[questionTypes[0]] = totalCount;
        } else {
            // 根据难度调整分布
            const weights = {
                'multiple-choice': difficulty === 'easy' ? 0.5 : difficulty === 'medium' ? 0.4 : 0.3,
                'fill-blank': difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.3 : 0.3,
                'essay': difficulty === 'easy' ? 0.2 : difficulty === 'medium' ? 0.3 : 0.4
            };

            let remaining = totalCount;
            questionTypes.forEach((type, index) => {
                if (index === questionTypes.length - 1) {
                    distribution[type] = remaining;
                } else {
                    const count = Math.round(totalCount * (weights[type] || 1/typeCount));
                    distribution[type] = count;
                    remaining -= count;
                }
            });
        }

        return distribution;
    }

    /**
     * 按类型生成题目
     * @param {string} type - 题目类型
     * @param {number} count - 题目数量
     * @param {Object} contentAnalysis - 内容分析
     * @param {string} difficulty - 难度等级
     * @param {Array} focusAreas - 重点领域
     * @returns {Array} 生成的题目
     */
    async generateQuestionsByType(type, count, contentAnalysis, difficulty, focusAreas) {
        const questions = [];
        const templates = this.questionTemplates[type];
        const difficultyLevels = ['basic', 'application', 'analysis'];
        const weights = this.difficultyWeights[difficulty];

        // 根据难度权重分配题目
        const levelDistribution = {};
        let remaining = count;
        
        difficultyLevels.forEach((level, index) => {
            if (index === difficultyLevels.length - 1) {
                levelDistribution[level] = remaining;
            } else {
                const levelCount = Math.round(count * weights[level]);
                levelDistribution[level] = levelCount;
                remaining -= levelCount;
            }
        });

        // 为每个难度级别生成题目
        for (const [level, levelCount] of Object.entries(levelDistribution)) {
            if (levelCount > 0) {
                const levelQuestions = await this.generateQuestionsForLevel(
                    type, level, levelCount, contentAnalysis, templates[level]
                );
                questions.push(...levelQuestions);
            }
        }

        return questions;
    }

    /**
     * 为特定难度级别生成题目
     * @param {string} type - 题目类型
     * @param {string} level - 难度级别
     * @param {number} count - 题目数量
     * @param {Object} contentAnalysis - 内容分析
     * @param {Array} templates - 模板列表
     * @returns {Array} 生成的题目
     */
    async generateQuestionsForLevel(type, level, count, contentAnalysis, templates) {
        const questions = [];
        const { coreConcepts, conceptRelations, applicationScenarios, keyFacts } = contentAnalysis;

        for (let i = 0; i < count; i++) {
            try {
                const template = templates[i % templates.length];
                const concept = coreConcepts[i % coreConcepts.length];
                
                let question;
                switch (type) {
                    case 'multiple-choice':
                        question = await this.generateMultipleChoiceQuestion(
                            template, concept, contentAnalysis, level
                        );
                        break;
                    case 'fill-blank':
                        question = await this.generateFillBlankQuestion(
                            template, concept, contentAnalysis, level
                        );
                        break;
                    case 'essay':
                        question = await this.generateEssayQuestion(
                            template, concept, contentAnalysis, level
                        );
                        break;
                }

                if (question) {
                    question.id = `${type}_${level}_${i + 1}`;
                    question.difficulty = this.mapLevelToDifficulty(level);
                    question.knowledgeLevel = level;
                    question.source = 'intelligent_generator';
                    questions.push(question);
                }
            } catch (error) {
                console.warn(`生成第${i + 1}题失败:`, error.message);
            }
        }

        return questions;
    }

    /**
     * 生成选择题
     * @param {string} template - 题目模板
     * @param {Object} concept - 核心概念
     * @param {Object} contentAnalysis - 内容分析
     * @param {string} level - 难度级别
     * @returns {Object} 选择题
     */
    async generateMultipleChoiceQuestion(template, concept, contentAnalysis, level) {
        const questionText = this.fillTemplate(template, concept, contentAnalysis);
        
        // 生成选项
        const options = await this.generateOptions(concept, contentAnalysis, level);
        const correctIndex = Math.floor(Math.random() * 4);
        
        // 确保正确答案合理
        options[correctIndex] = this.generateCorrectAnswer(concept, contentAnalysis, level);
        
        return {
            type: 'multiple-choice',
            question: questionText,
            options: options,
            correctAnswer: correctIndex,
            explanation: this.generateExplanation(concept, options[correctIndex], level),
            knowledgePoints: [concept.name],
            relatedConcepts: this.getRelatedConcepts(concept, contentAnalysis)
        };
    }

    /**
     * 生成填空题
     * @param {string} template - 题目模板
     * @param {Object} concept - 核心概念
     * @param {Object} contentAnalysis - 内容分析
     * @param {string} level - 难度级别
     * @returns {Object} 填空题
     */
    async generateFillBlankQuestion(template, concept, contentAnalysis, level) {
        const questionText = this.fillTemplate(template, concept, contentAnalysis);
        const correctAnswer = this.generateFillBlankAnswer(concept, contentAnalysis, level);
        
        return {
            type: 'fill-blank',
            question: questionText,
            correctAnswer: correctAnswer,
            acceptableAnswers: this.generateAcceptableAnswers(correctAnswer),
            explanation: this.generateExplanation(concept, correctAnswer, level),
            knowledgePoints: [concept.name],
            relatedConcepts: this.getRelatedConcepts(concept, contentAnalysis)
        };
    }

    /**
     * 生成问答题
     * @param {string} template - 题目模板
     * @param {Object} concept - 核心概念
     * @param {Object} contentAnalysis - 内容分析
     * @param {string} level - 难度级别
     * @returns {Object} 问答题
     */
    async generateEssayQuestion(template, concept, contentAnalysis, level) {
        const questionText = this.fillTemplate(template, concept, contentAnalysis);
        const sampleAnswer = this.generateSampleAnswer(concept, contentAnalysis, level);
        
        return {
            type: 'essay',
            question: questionText,
            sampleAnswer: sampleAnswer,
            keyPoints: this.extractKeyPoints(concept, contentAnalysis),
            explanation: this.generateExplanation(concept, sampleAnswer, level),
            knowledgePoints: [concept.name],
            relatedConcepts: this.getRelatedConcepts(concept, contentAnalysis),
            scoringCriteria: this.generateScoringCriteria(level)
        };
    }

    /**
     * 填充模板
     * @param {string} template - 模板
     * @param {Object} concept - 概念
     * @param {Object} contentAnalysis - 内容分析
     * @returns {string} 填充后的文本
     */
    fillTemplate(template, concept, contentAnalysis) {
        let filled = template;
        
        // 替换概念
        filled = filled.replace(/\{concept\}/g, concept.name);
        
        // 替换上下文
        const scenarios = contentAnalysis.applicationScenarios;
        if (scenarios.length > 0) {
            const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            filled = filled.replace(/\{context\}/g, randomScenario.scenario);
            filled = filled.replace(/\{scenario\}/g, randomScenario.scenario);
        }
        
        // 替换相关概念
        const relatedConcepts = this.getRelatedConcepts(concept, contentAnalysis);
        if (relatedConcepts.length > 0) {
            filled = filled.replace(/\{concept1\}/g, concept.name);
            filled = filled.replace(/\{concept2\}/g, relatedConcepts[0]);
        }
        
        // 替换领域
        filled = filled.replace(/\{field\}/g, '相关领域');
        filled = filled.replace(/\{perspective\}/g, '理论');
        filled = filled.replace(/\{condition\}/g, '条件');
        filled = filled.replace(/\{problem\}/g, '问题');
        filled = filled.replace(/\{challenge\}/g, '挑战');
        filled = filled.replace(/\{angle\}/g, '角度');
        filled = filled.replace(/\{phenomenon\}/g, '现象');
        
        return filled;
    }

    /**
     * 生成选项
     * @param {Object} concept - 概念
     * @param {Object} contentAnalysis - 内容分析
     * @param {string} level - 难度级别
     * @returns {Array} 选项列表
     */
    async generateOptions(concept, contentAnalysis, level) {
        const options = [];
        const { coreConcepts } = contentAnalysis;
        
        // 生成干扰项
        const distractors = [
            '不正确的选项',
            '错误的答案',
            '无关的内容',
            '干扰性选项'
        ];
        
        // 使用相关概念作为干扰项
        const relatedConcepts = coreConcepts
            .filter(c => c.name !== concept.name)
            .slice(0, 3);
            
        relatedConcepts.forEach((c, index) => {
            if (index < 3) {
                options.push(c.name);
            }
        });
        
        // 填充剩余选项
        while (options.length < 4) {
            options.push(distractors[options.length % distractors.length]);
        }
        
        return options;
    }

    /**
     * 生成正确答案
     * @param {Object} concept - 概念
     * @param {Object} contentAnalysis - 内容分析
     * @param {string} level - 难度级别
     * @returns {string} 正确答案
     */
    generateCorrectAnswer(concept, contentAnalysis, level) {
        if (concept.definition) {
            return concept.definition.split(/是|指|称为/)[1]?.trim() || concept.name;
        }
        
        switch (level) {
            case 'basic':
                return `${concept.name}的基本特征`;
            case 'application':
                return `${concept.name}的实际应用`;
            case 'analysis':
                return `${concept.name}的深层含义`;
            default:
                return concept.name;
        }
    }

    /**
     * 生成填空答案
     * @param {Object} concept - 概念
     * @param {Object} contentAnalysis - 内容分析
     * @param {string} level - 难度级别
     * @returns {string} 填空答案
     */
    generateFillBlankAnswer(concept, contentAnalysis, level) {
        const relatedConcepts = this.getRelatedConcepts(concept, contentAnalysis);
        
        switch (level) {
            case 'basic':
                return concept.name;
            case 'application':
                return relatedConcepts.length > 0 ? relatedConcepts[0] : concept.name;
            case 'analysis':
                return `${concept.name}和${relatedConcepts[0] || '相关概念'}`;
            default:
                return concept.name;
        }
    }

    /**
     * 生成可接受答案
     * @param {string} correctAnswer - 正确答案
     * @returns {Array} 可接受答案列表
     */
    generateAcceptableAnswers(correctAnswer) {
        const acceptable = [correctAnswer];
        
        // 添加同义词或相近表达
        if (correctAnswer.includes('和')) {
            const parts = correctAnswer.split('和');
            acceptable.push(parts.reverse().join('和'));
        }
        
        return acceptable;
    }

    /**
     * 生成示例答案
     * @param {Object} concept - 概念
     * @param {Object} contentAnalysis - 内容分析
     * @param {string} level - 难度级别
     * @returns {string} 示例答案
     */
    generateSampleAnswer(concept, contentAnalysis, level) {
        const relatedConcepts = this.getRelatedConcepts(concept, contentAnalysis);
        
        switch (level) {
            case 'basic':
                return `${concept.name}是一个重要概念，其基本特征包括...（请结合学习内容详细说明）`;
            case 'application':
                return `${concept.name}在实际应用中具有重要价值，主要体现在...（请结合具体案例分析）`;
            case 'analysis':
                return `从理论角度分析，${concept.name}具有深层意义...（请进行批判性思考和深入论述）`;
            default:
                return `请结合学习内容，详细阐述${concept.name}的相关问题。`;
        }
    }

    /**
     * 提取关键点
     * @param {Object} concept - 概念
     * @param {Object} contentAnalysis - 内容分析
     * @returns {Array} 关键点列表
     */
    extractKeyPoints(concept, contentAnalysis) {
        const keyPoints = [
            `${concept.name}的定义和特征`,
            `${concept.name}的重要性和意义`,
            `${concept.name}的应用和实践`
        ];
        
        const relatedConcepts = this.getRelatedConcepts(concept, contentAnalysis);
        if (relatedConcepts.length > 0) {
            keyPoints.push(`${concept.name}与${relatedConcepts[0]}的关系`);
        }
        
        return keyPoints;
    }

    /**
     * 生成解释
     * @param {Object} concept - 概念
     * @param {string} answer - 答案
     * @param {string} level - 难度级别
     * @returns {string} 解释
     */
    generateExplanation(concept, answer, level) {
        switch (level) {
            case 'basic':
                return `这道题考查对${concept.name}基本概念的理解。正确答案体现了${concept.name}的核心特征。`;
            case 'application':
                return `这道题考查${concept.name}的实际应用能力。需要理解${concept.name}在具体情境中的运用。`;
            case 'analysis':
                return `这道题考查对${concept.name}的深层理解和分析能力。需要进行批判性思考。`;
            default:
                return `这道题考查对${concept.name}的掌握程度。`;
        }
    }

    /**
     * 获取相关概念
     * @param {Object} concept - 主概念
     * @param {Object} contentAnalysis - 内容分析
     * @returns {Array} 相关概念列表
     */
    getRelatedConcepts(concept, contentAnalysis) {
        const { conceptRelations, coreConcepts } = contentAnalysis;
        const related = [];
        
        // 从概念关系中查找
        conceptRelations.forEach(relation => {
            if (relation.source === concept.name) {
                related.push(relation.target);
            } else if (relation.target === concept.name) {
                related.push(relation.source);
            }
        });
        
        // 如果没有找到关系，使用其他核心概念
        if (related.length === 0) {
            coreConcepts
                .filter(c => c.name !== concept.name)
                .slice(0, 3)
                .forEach(c => related.push(c.name));
        }
        
        return related.slice(0, 3);
    }

    /**
     * 生成评分标准
     * @param {string} level - 难度级别
     * @returns {Array} 评分标准
     */
    generateScoringCriteria(level) {
        const baseCriteria = [
            '内容准确性（30分）',
            '逻辑清晰性（25分）',
            '完整性（25分）',
            '表达规范性（20分）'
        ];
        
        switch (level) {
            case 'basic':
                return baseCriteria;
            case 'application':
                return [
                    ...baseCriteria,
                    '实例恰当性（额外10分）'
                ];
            case 'analysis':
                return [
                    ...baseCriteria,
                    '分析深度（额外10分）',
                    '批判思维（额外10分）'
                ];
            default:
                return baseCriteria;
        }
    }

    /**
     * 映射级别到难度
     * @param {string} level - 级别
     * @returns {number} 难度值
     */
    mapLevelToDifficulty(level) {
        const mapping = {
            'basic': 1,
            'application': 2,
            'analysis': 3
        };
        return mapping[level] || 2;
    }

    /**
     * 优化题目质量
     * @param {Array} questions - 题目列表
     * @param {Object} contentAnalysis - 内容分析
     * @returns {Array} 优化后的题目
     */
    optimizeQuestions(questions, contentAnalysis) {
        // 去重
        const uniqueQuestions = this.removeDuplicateQuestions(questions);
        
        // 质量评分
        const scoredQuestions = uniqueQuestions.map(q => ({
            ...q,
            qualityScore: this.calculateQuestionQuality(q, contentAnalysis)
        }));
        
        // 按质量排序
        return scoredQuestions.sort((a, b) => b.qualityScore - a.qualityScore);
    }

    /**
     * 移除重复题目
     * @param {Array} questions - 题目列表
     * @returns {Array} 去重后的题目
     */
    removeDuplicateQuestions(questions) {
        const seen = new Set();
        return questions.filter(q => {
            const key = q.question.toLowerCase().replace(/\s+/g, '');
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * 计算题目质量分数
     * @param {Object} question - 题目
     * @param {Object} contentAnalysis - 内容分析
     * @returns {number} 质量分数
     */
    calculateQuestionQuality(question, contentAnalysis) {
        let score = 0;
        
        // 题目长度合理性
        const questionLength = question.question.length;
        if (questionLength >= 10 && questionLength <= 100) score += 20;
        
        // 知识点相关性
        if (question.knowledgePoints && question.knowledgePoints.length > 0) {
            const isRelevant = contentAnalysis.coreConcepts.some(
                concept => question.knowledgePoints.includes(concept.name)
            );
            if (isRelevant) score += 30;
        }
        
        // 选项质量（仅选择题）
        if (question.type === 'multiple-choice' && question.options) {
            const optionLengths = question.options.map(opt => opt.length);
            const avgLength = optionLengths.reduce((a, b) => a + b, 0) / optionLengths.length;
            if (avgLength >= 5 && avgLength <= 30) score += 20;
        }
        
        // 解释质量
        if (question.explanation && question.explanation.length >= 20) score += 20;
        
        // 难度合理性
        if (question.difficulty >= 1 && question.difficulty <= 3) score += 10;
        
        return score;
    }

    /**
     * 确保知识点覆盖
     * @param {Array} questions - 题目列表
     * @param {Object} contentAnalysis - 内容分析
     * @param {number} targetCount - 目标题目数
     * @returns {Array} 最终题目列表
     */
    ensureKnowledgeCoverage(questions, contentAnalysis, targetCount) {
        const { coreConcepts } = contentAnalysis;
        const coveredConcepts = new Set();
        const finalQuestions = [];
        
        // 首先选择覆盖不同知识点的题目
        questions.forEach(question => {
            if (finalQuestions.length < targetCount) {
                const questionConcepts = question.knowledgePoints || [];
                const hasNewConcept = questionConcepts.some(concept => !coveredConcepts.has(concept));
                
                if (hasNewConcept || finalQuestions.length < targetCount * 0.7) {
                    finalQuestions.push(question);
                    questionConcepts.forEach(concept => coveredConcepts.add(concept));
                }
            }
        });
        
        // 如果还需要更多题目，按质量分数选择
        if (finalQuestions.length < targetCount) {
            const remainingQuestions = questions.filter(q => !finalQuestions.includes(q));
            const needed = targetCount - finalQuestions.length;
            finalQuestions.push(...remainingQuestions.slice(0, needed));
        }
        
        return finalQuestions.slice(0, targetCount);
    }
}

module.exports = IntelligentQuestionGenerator;