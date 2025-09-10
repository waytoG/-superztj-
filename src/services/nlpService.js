// 自然语言处理服务 - 增强文本理解和分析能力
const { NlpManager } = require('node-nlp');

class NLPService {
    constructor() {
        this.manager = new NlpManager({ 
            languages: ['zh'], 
            forceNER: true,
            nlu: { useNoneFeature: true }
        });
        
        this.initialized = false;
        this.entityTypes = new Set();
        this.conceptPatterns = new Map();
        
        this.init();
    }

    /**
     * 初始化NLP管理器
     */
    async init() {
        try {
            // 添加实体识别规则
            this.addEntityRecognitionRules();
            
            // 添加概念识别模式
            this.addConceptPatterns();
            
            // 训练模型
            await this.manager.train();
            
            this.initialized = true;
            console.log('🧠 自然语言处理服务初始化完成');
        } catch (error) {
            console.error('NLP服务初始化失败:', error);
        }
    }

    /**
     * 添加实体识别规则
     */
    addEntityRecognitionRules() {
        // 学科领域实体
        const subjects = [
            '数学', '物理', '化学', '生物', '计算机科学', '经济学', '心理学', 
            '历史', '地理', '文学', '哲学', '法学', '医学', '工程学'
        ];
        subjects.forEach(subject => {
            this.manager.addNamedEntityText('subject', subject, ['zh'], [subject]);
        });

        // 概念类型实体
        const conceptTypes = [
            '定理', '公式', '原理', '法则', '理论', '模型', '方法', '算法',
            '概念', '定义', '性质', '特征', '规律', '现象'
        ];
        conceptTypes.forEach(type => {
            this.manager.addNamedEntityText('concept_type', type, ['zh'], [type]);
        });

        // 数学概念
        const mathConcepts = [
            '函数', '导数', '积分', '极限', '矩阵', '向量', '概率', '统计',
            '微分', '级数', '方程', '不等式', '几何', '代数'
        ];
        mathConcepts.forEach(concept => {
            this.manager.addNamedEntityText('math_concept', concept, ['zh'], [concept]);
        });

        // 物理概念
        const physicsConcepts = [
            '力', '能量', '动量', '电场', '磁场', '波', '粒子', '原子',
            '分子', '热力学', '量子', '相对论', '光学', '声学'
        ];
        physicsConcepts.forEach(concept => {
            this.manager.addNamedEntityText('physics_concept', concept, ['zh'], [concept]);
        });

        // 计算机概念
        const csConcepts = [
            '算法', '数据结构', '数据库', '网络', '操作系统', '编程',
            '软件工程', '人工智能', '机器学习', '深度学习'
        ];
        csConcepts.forEach(concept => {
            this.manager.addNamedEntityText('cs_concept', concept, ['zh'], [concept]);
        });
    }

    /**
     * 添加概念识别模式
     */
    addConceptPatterns() {
        // 定义模式
        this.conceptPatterns.set('definition', [
            /(.+)是指(.+)/g,
            /(.+)指的是(.+)/g,
            /(.+)定义为(.+)/g,
            /(.+)是一种(.+)/g,
            /(.+)是(.+)的(.+)/g
        ]);

        // 性质模式
        this.conceptPatterns.set('property', [
            /(.+)具有(.+)的性质/g,
            /(.+)的特点是(.+)/g,
            /(.+)的特征包括(.+)/g,
            /(.+)具备(.+)特性/g
        ]);

        // 关系模式
        this.conceptPatterns.set('relationship', [
            /(.+)与(.+)之间的关系/g,
            /(.+)和(.+)相关/g,
            /(.+)影响(.+)/g,
            /(.+)导致(.+)/g,
            /(.+)基于(.+)/g
        ]);

        // 应用模式
        this.conceptPatterns.set('application', [
            /(.+)应用于(.+)/g,
            /(.+)用于(.+)/g,
            /(.+)在(.+)中的应用/g,
            /(.+)可以用来(.+)/g
        ]);

        // 分类模式
        this.conceptPatterns.set('classification', [
            /(.+)分为(.+)/g,
            /(.+)包括(.+)/g,
            /(.+)的类型有(.+)/g,
            /(.+)可分为(.+)/g
        ]);
    }

    /**
     * 分析文本并提取概念
     * @param {string} text - 输入文本
     * @param {Object} options - 分析选项
     * @returns {Object} 分析结果
     */
    async analyzeText(text, options = {}) {
        const {
            extractEntities = true,
            extractConcepts = true,
            extractRelationships = true,
            extractKeyPhrases = true,
            minConceptLength = 2,
            maxConceptLength = 20
        } = options;

        console.log(`🔍 分析文本长度: ${text.length} 字符`);

        const result = {
            entities: [],
            concepts: [],
            relationships: [],
            keyPhrases: [],
            sentences: [],
            summary: '',
            complexity: 0,
            readability: 0
        };

        try {
            // 句子分割
            result.sentences = this.splitIntoSentences(text);
            
            // 实体识别
            if (extractEntities) {
                result.entities = await this.extractEntities(text);
            }

            // 概念提取
            if (extractConcepts) {
                result.concepts = this.extractConcepts(text, minConceptLength, maxConceptLength);
            }

            // 关系提取
            if (extractRelationships) {
                result.relationships = this.extractRelationships(text);
            }

            // 关键短语提取
            if (extractKeyPhrases) {
                result.keyPhrases = this.extractKeyPhrases(text);
            }

            // 计算复杂度
            result.complexity = this.calculateComplexity(text, result);

            // 计算可读性
            result.readability = this.calculateReadability(text);

            // 生成摘要
            result.summary = this.generateSummary(text, result);

            console.log(`✅ 文本分析完成: 发现 ${result.concepts.length} 个概念, ${result.entities.length} 个实体`);
            
            return result;
        } catch (error) {
            console.error('文本分析失败:', error);
            return result;
        }
    }

    /**
     * 句子分割
     * @param {string} text - 文本
     * @returns {Array} 句子数组
     */
    splitIntoSentences(text) {
        // 中文句子分割
        const sentences = text
            .split(/[。！？；\n]/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        return sentences.map((sentence, index) => ({
            index: index,
            text: sentence,
            length: sentence.length,
            complexity: this.calculateSentenceComplexity(sentence)
        }));
    }

    /**
     * 实体识别
     * @param {string} text - 文本
     * @returns {Array} 实体数组
     */
    async extractEntities(text) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            const response = await this.manager.process('zh', text);
            const entities = response.entities || [];
            
            return entities.map(entity => ({
                entity: entity.entity,
                type: entity.typeName,
                value: entity.sourceText,
                start: entity.start,
                end: entity.end,
                confidence: entity.accuracy || 0.5
            }));
        } catch (error) {
            console.error('实体识别失败:', error);
            return [];
        }
    }

    /**
     * 概念提取
     * @param {string} text - 文本
     * @param {number} minLength - 最小长度
     * @param {number} maxLength - 最大长度
     * @returns {Array} 概念数组
     */
    extractConcepts(text, minLength = 2, maxLength = 20) {
        const concepts = new Map();

        // 使用模式匹配提取概念
        for (const [patternType, patterns] of this.conceptPatterns) {
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    if (match[1] && match[1].length >= minLength && match[1].length <= maxLength) {
                        const concept = match[1].trim();
                        if (!concepts.has(concept)) {
                            concepts.set(concept, {
                                text: concept,
                                type: patternType,
                                context: match[0],
                                frequency: 1,
                                positions: [match.index]
                            });
                        } else {
                            concepts.get(concept).frequency++;
                            concepts.get(concept).positions.push(match.index);
                        }
                    }
                }
            }
        }

        // 使用词频统计提取高频词汇作为潜在概念
        const words = this.extractWords(text);
        const wordFreq = this.calculateWordFrequency(words);
        
        for (const [word, freq] of wordFreq) {
            if (word.length >= minLength && word.length <= maxLength && freq >= 2) {
                if (!concepts.has(word)) {
                    concepts.set(word, {
                        text: word,
                        type: 'high_frequency',
                        frequency: freq,
                        positions: this.findWordPositions(text, word)
                    });
                }
            }
        }

        // 转换为数组并排序
        return Array.from(concepts.values())
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 50); // 限制返回数量
    }

    /**
     * 关系提取
     * @param {string} text - 文本
     * @returns {Array} 关系数组
     */
    extractRelationships(text) {
        const relationships = [];
        
        // 定义关系模式
        const relationPatterns = [
            {
                pattern: /(.+)导致(.+)/g,
                type: 'cause_effect',
                relation: '导致'
            },
            {
                pattern: /(.+)影响(.+)/g,
                type: 'influence',
                relation: '影响'
            },
            {
                pattern: /(.+)包含(.+)/g,
                type: 'contain',
                relation: '包含'
            },
            {
                pattern: /(.+)属于(.+)/g,
                type: 'belong_to',
                relation: '属于'
            },
            {
                pattern: /(.+)基于(.+)/g,
                type: 'based_on',
                relation: '基于'
            },
            {
                pattern: /(.+)与(.+)相关/g,
                type: 'related_to',
                relation: '相关'
            }
        ];

        relationPatterns.forEach(({ pattern, type, relation }) => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1] && match[2]) {
                    relationships.push({
                        subject: match[1].trim(),
                        predicate: relation,
                        object: match[2].trim(),
                        type: type,
                        context: match[0],
                        position: match.index
                    });
                }
            }
        });

        return relationships;
    }

    /**
     * 关键短语提取
     * @param {string} text - 文本
     * @returns {Array} 关键短语数组
     */
    extractKeyPhrases(text) {
        const phrases = new Set();
        
        // 提取名词短语
        const nounPhrases = this.extractNounPhrases(text);
        nounPhrases.forEach(phrase => phrases.add(phrase));
        
        // 提取专业术语
        const terms = this.extractTechnicalTerms(text);
        terms.forEach(term => phrases.add(term));
        
        // 提取重要短语（基于标点和关键词）
        const importantPhrases = this.extractImportantPhrases(text);
        importantPhrases.forEach(phrase => phrases.add(phrase));
        
        return Array.from(phrases)
            .filter(phrase => phrase.length >= 2 && phrase.length <= 30)
            .slice(0, 20);
    }

    /**
     * 提取名词短语
     * @param {string} text - 文本
     * @returns {Array} 名词短语数组
     */
    extractNounPhrases(text) {
        const phrases = [];
        
        // 简单的名词短语模式
        const nounPhrasePatterns = [
            /[的]([^的，。！？；\s]{2,10})/g,
            /([^，。！？；\s]{2,10})[的]/g,
            /([A-Za-z]+[^，。！？；\s]*)/g
        ];
        
        nounPhrasePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1] && match[1].length >= 2) {
                    phrases.push(match[1].trim());
                }
            }
        });
        
        return phrases;
    }

    /**
     * 提取专业术语
     * @param {string} text - 文本
     * @returns {Array} 专业术语数组
     */
    extractTechnicalTerms(text) {
        const terms = [];
        
        // 专业术语模式
        const termPatterns = [
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, // 英文专业术语
            /([a-zA-Z]+(?:-[a-zA-Z]+)*)/g, // 连字符术语
            /([^\s，。！？；]{3,15})[理论|定理|公式|原理|法则|模型|算法|方法]/g
        ];
        
        termPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1]) {
                    terms.push(match[1].trim());
                }
            }
        });
        
        return terms;
    }

    /**
     * 提取重要短语
     * @param {string} text - 文本
     * @returns {Array} 重要短语数组
     */
    extractImportantPhrases(text) {
        const phrases = [];
        
        // 重要短语标识词
        const importantMarkers = [
            '重要的是', '关键在于', '核心是', '本质上', '主要', '首先', '其次', '最后',
            '总之', '因此', '所以', '由于', '基于', '根据'
        ];
        
        importantMarkers.forEach(marker => {
            const regex = new RegExp(`${marker}([^，。！？；]{5,30})`, 'g');
            let match;
            while ((match = regex.exec(text)) !== null) {
                if (match[1]) {
                    phrases.push(match[1].trim());
                }
            }
        });
        
        return phrases;
    }

    /**
     * 提取词汇
     * @param {string} text - 文本
     * @returns {Array} 词汇数组
     */
    extractWords(text) {
        // 简单的中文分词（实际项目中建议使用专业分词库）
        return text
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 2);
    }

    /**
     * 计算词频
     * @param {Array} words - 词汇数组
     * @returns {Map} 词频映射
     */
    calculateWordFrequency(words) {
        const freq = new Map();
        words.forEach(word => {
            freq.set(word, (freq.get(word) || 0) + 1);
        });
        return new Map([...freq.entries()].sort((a, b) => b[1] - a[1]));
    }

    /**
     * 查找词汇位置
     * @param {string} text - 文本
     * @param {string} word - 词汇
     * @returns {Array} 位置数组
     */
    findWordPositions(text, word) {
        const positions = [];
        let index = text.indexOf(word);
        while (index !== -1) {
            positions.push(index);
            index = text.indexOf(word, index + 1);
        }
        return positions;
    }

    /**
     * 计算文本复杂度
     * @param {string} text - 文本
     * @param {Object} analysis - 分析结果
     * @returns {number} 复杂度分数 (0-1)
     */
    calculateComplexity(text, analysis) {
        let complexity = 0;
        
        // 基于句子长度
        const avgSentenceLength = analysis.sentences.reduce((sum, s) => sum + s.length, 0) / analysis.sentences.length;
        complexity += Math.min(avgSentenceLength / 50, 1) * 0.3;
        
        // 基于概念密度
        const conceptDensity = analysis.concepts.length / text.length * 1000;
        complexity += Math.min(conceptDensity / 10, 1) * 0.3;
        
        // 基于专业术语数量
        const technicalTerms = analysis.entities.filter(e => 
            ['subject', 'concept_type', 'math_concept', 'physics_concept', 'cs_concept'].includes(e.type)
        ).length;
        complexity += Math.min(technicalTerms / 20, 1) * 0.4;
        
        return Math.min(complexity, 1);
    }

    /**
     * 计算句子复杂度
     * @param {string} sentence - 句子
     * @returns {number} 复杂度分数
     */
    calculateSentenceComplexity(sentence) {
        let complexity = 0;
        
        // 基于长度
        complexity += Math.min(sentence.length / 100, 1) * 0.4;
        
        // 基于标点符号数量
        const punctuationCount = (sentence.match(/[，；：]/g) || []).length;
        complexity += Math.min(punctuationCount / 5, 1) * 0.3;
        
        // 基于数字和英文
        const hasNumbers = /\d/.test(sentence);
        const hasEnglish = /[a-zA-Z]/.test(sentence);
        if (hasNumbers) complexity += 0.15;
        if (hasEnglish) complexity += 0.15;
        
        return Math.min(complexity, 1);
    }

    /**
     * 计算可读性
     * @param {string} text - 文本
     * @returns {number} 可读性分数 (0-1)
     */
    calculateReadability(text) {
        const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
        const words = this.extractWords(text);
        
        if (sentences.length === 0 || words.length === 0) return 0;
        
        const avgWordsPerSentence = words.length / sentences.length;
        const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        
        // 简化的可读性公式
        let readability = 1 - (avgWordsPerSentence / 20 + avgCharsPerWord / 10) / 2;
        return Math.max(0, Math.min(1, readability));
    }

    /**
     * 生成摘要
     * @param {string} text - 文本
     * @param {Object} analysis - 分析结果
     * @returns {string} 摘要
     */
    generateSummary(text, analysis) {
        if (text.length <= 200) return text;
        
        // 选择最重要的句子
        const importantSentences = analysis.sentences
            .filter(s => s.complexity > 0.3)
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, 3)
            .sort((a, b) => a.index - b.index)
            .map(s => s.text);
        
        if (importantSentences.length === 0) {
            return text.substring(0, 200) + '...';
        }
        
        return importantSentences.join('。') + '。';
    }

    /**
     * 获取服务状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            initialized: this.initialized,
            entityTypes: Array.from(this.entityTypes),
            patternCount: this.conceptPatterns.size,
            version: '1.0.0'
        };
    }
}

module.exports = NLPService;