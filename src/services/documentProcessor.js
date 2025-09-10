// 文档处理服务 - 大文件分块处理和智能内容分析
const fs = require('fs');
const path = require('path');

class DocumentProcessor {
    constructor() {
        this.maxChunkSize = 2000; // 每块最大字符数
        this.overlapSize = 200;   // 块间重叠字符数
        this.minChunkSize = 500;  // 最小块大小
    }

    /**
     * 智能分块处理大文档
     * @param {string} content - 文档内容
     * @param {Object} options - 分块选项
     * @returns {Array} 分块结果
     */
    smartChunking(content, options = {}) {
        const {
            maxChunkSize = this.maxChunkSize,
            overlapSize = this.overlapSize,
            preserveContext = true
        } = options;

        if (!content || content.length <= maxChunkSize) {
            return [{
                content: content,
                index: 0,
                startPos: 0,
                endPos: content.length,
                metadata: this.extractChunkMetadata(content)
            }];
        }

        const chunks = [];
        let currentPos = 0;
        let chunkIndex = 0;

        while (currentPos < content.length) {
            let chunkEnd = Math.min(currentPos + maxChunkSize, content.length);
            
            // 如果不是最后一块，尝试在句子边界处分割
            if (chunkEnd < content.length && preserveContext) {
                chunkEnd = this.findOptimalBreakPoint(content, currentPos, chunkEnd);
            }

            const chunkContent = content.substring(currentPos, chunkEnd);
            
            // 跳过过小的块
            if (chunkContent.trim().length >= this.minChunkSize || chunkIndex === 0) {
                chunks.push({
                    content: chunkContent,
                    index: chunkIndex,
                    startPos: currentPos,
                    endPos: chunkEnd,
                    metadata: this.extractChunkMetadata(chunkContent),
                    context: this.extractContext(content, currentPos, chunkEnd)
                });
                chunkIndex++;
            }

            // 计算下一块的起始位置（考虑重叠）
            currentPos = Math.max(chunkEnd - overlapSize, currentPos + 1);
        }

        return chunks;
    }

    /**
     * 寻找最佳分割点
     * @param {string} content - 内容
     * @param {number} start - 起始位置
     * @param {number} end - 结束位置
     * @returns {number} 最佳分割点
     */
    findOptimalBreakPoint(content, start, end) {
        const searchRange = Math.min(200, Math.floor((end - start) * 0.2));
        const searchStart = Math.max(start, end - searchRange);

        // 优先级：段落 > 句子 > 短语
        const breakPoints = [
            { pattern: /\n\s*\n/g, priority: 3 }, // 段落分隔
            { pattern: /[。！？.!?]\s*/g, priority: 2 }, // 句子结尾
            { pattern: /[，；,;]\s*/g, priority: 1 }  // 短语分隔
        ];

        let bestBreakPoint = end;
        let bestPriority = 0;

        for (const { pattern, priority } of breakPoints) {
            pattern.lastIndex = 0;
            let match;
            
            while ((match = pattern.exec(content.substring(searchStart, end))) !== null) {
                const breakPoint = searchStart + match.index + match[0].length;
                
                if (breakPoint > start + this.minChunkSize && priority > bestPriority) {
                    bestBreakPoint = breakPoint;
                    bestPriority = priority;
                }
            }
        }

        return bestBreakPoint;
    }

    /**
     * 提取块的元数据
     * @param {string} content - 块内容
     * @returns {Object} 元数据
     */
    extractChunkMetadata(content) {
        return {
            wordCount: this.countWords(content),
            sentenceCount: this.countSentences(content),
            keyTerms: this.extractKeyTerms(content),
            topics: this.identifyTopics(content),
            complexity: this.assessComplexity(content)
        };
    }

    /**
     * 提取上下文信息
     * @param {string} fullContent - 完整内容
     * @param {number} start - 块起始位置
     * @param {number} end - 块结束位置
     * @returns {Object} 上下文信息
     */
    extractContext(fullContent, start, end) {
        const contextSize = 100;
        const beforeContext = start > 0 ? 
            fullContent.substring(Math.max(0, start - contextSize), start) : '';
        const afterContext = end < fullContent.length ? 
            fullContent.substring(end, Math.min(fullContent.length, end + contextSize)) : '';

        return {
            before: beforeContext.trim(),
            after: afterContext.trim(),
            position: {
                start: start,
                end: end,
                total: fullContent.length,
                percentage: Math.round((end / fullContent.length) * 100)
            }
        };
    }

    /**
     * 统计词数
     * @param {string} text - 文本
     * @returns {number} 词数
     */
    countWords(text) {
        if (!text) return 0;
        // 中文按字符计算，英文按单词计算
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        return chineseChars + englishWords;
    }

    /**
     * 统计句子数
     * @param {string} text - 文本
     * @returns {number} 句子数
     */
    countSentences(text) {
        if (!text) return 0;
        return (text.match(/[。！？.!?]+/g) || []).length;
    }

    /**
     * 提取关键术语
     * @param {string} text - 文本
     * @returns {Array} 关键术语列表
     */
    extractKeyTerms(text) {
        if (!text) return [];

        // 移除标点符号并分词
        const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
        const words = cleanText.split(/\s+/).filter(word => word.length > 1);

        // 统计词频
        const wordCount = {};
        words.forEach(word => {
            const normalizedWord = word.toLowerCase();
            if (normalizedWord.length > 1) {
                wordCount[normalizedWord] = (wordCount[normalizedWord] || 0) + 1;
            }
        });

        // 返回高频词
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, count]) => ({ term: word, frequency: count }));
    }

    /**
     * 识别主题
     * @param {string} text - 文本
     * @returns {Array} 主题列表
     */
    identifyTopics(text) {
        if (!text) return [];

        const topicPatterns = [
            { pattern: /第[一二三四五六七八九十\d]+章|第[一二三四五六七八九十\d]+节/g, type: 'chapter' },
            { pattern: /\d+\.\d*|\d+、/g, type: 'section' },
            { pattern: /【.*?】|《.*?》/g, type: 'reference' },
            { pattern: /定义|概念|原理|方法|技术|理论/g, type: 'concept' }
        ];

        const topics = [];
        topicPatterns.forEach(({ pattern, type }) => {
            const matches = text.match(pattern) || [];
            matches.forEach(match => {
                topics.push({ text: match.trim(), type: type });
            });
        });

        return topics.slice(0, 5); // 限制主题数量
    }

    /**
     * 评估内容复杂度
     * @param {string} text - 文本
     * @returns {number} 复杂度分数 (1-5)
     */
    assessComplexity(text) {
        if (!text) return 1;

        let complexity = 1;
        const length = text.length;
        const sentences = this.countSentences(text);
        const avgSentenceLength = sentences > 0 ? length / sentences : 0;

        // 基于平均句长评估
        if (avgSentenceLength > 100) complexity += 2;
        else if (avgSentenceLength > 50) complexity += 1;

        // 基于专业术语密度评估
        const technicalTerms = (text.match(/[A-Z]{2,}|[\u4e00-\u9fa5]{4,}/g) || []).length;
        const termDensity = technicalTerms / Math.max(1, this.countWords(text));
        if (termDensity > 0.1) complexity += 1;
        if (termDensity > 0.2) complexity += 1;

        return Math.min(5, complexity);
    }

    /**
     * 处理大文件并生成结构化数据
     * @param {string} content - 文件内容
     * @param {Object} options - 处理选项
     * @returns {Object} 处理结果
     */
    async processLargeDocument(content, options = {}) {
        try {
            console.log(`📄 开始处理大文档，长度: ${content.length} 字符`);

            // 预处理：清理和标准化内容
            const cleanedContent = this.preprocessContent(content);

            // 智能分块
            const chunks = this.smartChunking(cleanedContent, options);
            console.log(`📊 文档已分为 ${chunks.length} 个块`);

            // 提取全局信息
            const globalMetadata = this.extractGlobalMetadata(cleanedContent, chunks);

            // 构建知识图谱
            const knowledgeGraph = this.buildKnowledgeGraph(chunks);

            // 识别重要段落
            const importantSections = this.identifyImportantSections(chunks);

            const result = {
                originalLength: content.length,
                processedLength: cleanedContent.length,
                chunkCount: chunks.length,
                chunks: chunks,
                globalMetadata: globalMetadata,
                knowledgeGraph: knowledgeGraph,
                importantSections: importantSections,
                processingTime: Date.now()
            };

            console.log(`✅ 文档处理完成，生成 ${chunks.length} 个块`);
            return result;

        } catch (error) {
            console.error('文档处理失败:', error);
            throw new Error(`文档处理失败: ${error.message}`);
        }
    }

    /**
     * 预处理内容
     * @param {string} content - 原始内容
     * @returns {string} 清理后的内容
     */
    preprocessContent(content) {
        if (!content) return '';

        return content
            // 统一换行符
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // 移除多余空白
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // 清理特殊字符
            .replace(/[\u200b-\u200d\ufeff]/g, '')
            .trim();
    }

    /**
     * 提取全局元数据
     * @param {string} content - 内容
     * @param {Array} chunks - 分块数据
     * @returns {Object} 全局元数据
     */
    extractGlobalMetadata(content, chunks) {
        const allKeyTerms = chunks.flatMap(chunk => chunk.metadata.keyTerms);
        const termFrequency = {};
        
        allKeyTerms.forEach(({ term, frequency }) => {
            termFrequency[term] = (termFrequency[term] || 0) + frequency;
        });

        const topTerms = Object.entries(termFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .map(([term, freq]) => ({ term, frequency: freq }));

        return {
            totalWords: this.countWords(content),
            totalSentences: this.countSentences(content),
            averageComplexity: chunks.reduce((sum, chunk) => sum + chunk.metadata.complexity, 0) / chunks.length,
            topKeyTerms: topTerms,
            documentStructure: this.analyzeDocumentStructure(content),
            readingTime: Math.ceil(this.countWords(content) / 200) // 假设每分钟200字
        };
    }

    /**
     * 分析文档结构
     * @param {string} content - 内容
     * @returns {Object} 文档结构
     */
    analyzeDocumentStructure(content) {
        const structure = {
            chapters: [],
            sections: [],
            lists: [],
            definitions: []
        };

        // 识别章节
        const chapterMatches = content.match(/第[一二三四五六七八九十\d]+章.*?(?=第[一二三四五六七八九十\d]+章|$)/gs) || [];
        structure.chapters = chapterMatches.map((chapter, index) => ({
            index: index + 1,
            title: chapter.split('\n')[0].trim(),
            length: chapter.length
        }));

        // 识别小节
        const sectionMatches = content.match(/\d+\.\d+.*?(?=\d+\.\d+|$)/gs) || [];
        structure.sections = sectionMatches.slice(0, 10).map((section, index) => ({
            index: index + 1,
            title: section.split('\n')[0].trim(),
            length: section.length
        }));

        // 识别列表
        const listMatches = content.match(/(?:^|\n)(?:\d+\.|[•·-])\s+.+/gm) || [];
        structure.lists = listMatches.slice(0, 20);

        // 识别定义
        const definitionMatches = content.match(/.{1,30}(?:是|指|称为|定义为).{1,100}/g) || [];
        structure.definitions = definitionMatches.slice(0, 10);

        return structure;
    }

    /**
     * 构建知识图谱
     * @param {Array} chunks - 分块数据
     * @returns {Object} 知识图谱
     */
    buildKnowledgeGraph(chunks) {
        const nodes = new Map();
        const edges = [];

        chunks.forEach((chunk, chunkIndex) => {
            chunk.metadata.keyTerms.forEach(({ term, frequency }) => {
                if (!nodes.has(term)) {
                    nodes.set(term, {
                        id: term,
                        label: term,
                        frequency: 0,
                        chunks: [],
                        importance: 0
                    });
                }
                
                const node = nodes.get(term);
                node.frequency += frequency;
                node.chunks.push(chunkIndex);
                node.importance = Math.log(node.frequency + 1);
            });
        });

        // 构建边（共现关系）
        chunks.forEach(chunk => {
            const terms = chunk.metadata.keyTerms.map(t => t.term);
            for (let i = 0; i < terms.length; i++) {
                for (let j = i + 1; j < terms.length; j++) {
                    edges.push({
                        source: terms[i],
                        target: terms[j],
                        weight: 1,
                        chunkIndex: chunk.index
                    });
                }
            }
        });

        return {
            nodes: Array.from(nodes.values()).sort((a, b) => b.importance - a.importance).slice(0, 50),
            edges: edges.slice(0, 100)
        };
    }

    /**
     * 识别重要段落
     * @param {Array} chunks - 分块数据
     * @returns {Array} 重要段落
     */
    identifyImportantSections(chunks) {
        return chunks
            .map(chunk => ({
                ...chunk,
                importance: this.calculateChunkImportance(chunk)
            }))
            .sort((a, b) => b.importance - a.importance)
            .slice(0, Math.min(5, Math.ceil(chunks.length * 0.3)))
            .map(chunk => ({
                index: chunk.index,
                content: chunk.content.substring(0, 200) + '...',
                importance: chunk.importance,
                keyTerms: chunk.metadata.keyTerms.slice(0, 5),
                complexity: chunk.metadata.complexity
            }));
    }

    /**
     * 计算块的重要性
     * @param {Object} chunk - 块数据
     * @returns {number} 重要性分数
     */
    calculateChunkImportance(chunk) {
        let importance = 0;
        
        // 基于关键词频率
        const totalFreq = chunk.metadata.keyTerms.reduce((sum, term) => sum + term.frequency, 0);
        importance += totalFreq * 0.3;
        
        // 基于复杂度
        importance += chunk.metadata.complexity * 0.2;
        
        // 基于长度（适中长度更重要）
        const idealLength = 1000;
        const lengthScore = 1 - Math.abs(chunk.content.length - idealLength) / idealLength;
        importance += Math.max(0, lengthScore) * 0.2;
        
        // 基于主题数量
        importance += chunk.metadata.topics.length * 0.3;
        
        return Math.round(importance * 100) / 100;
    }

    /**
     * 处理文档 - 主要入口方法
     * @param {string} content - 文档内容
     * @param {Object} options - 处理选项
     * @returns {Object} 处理结果
     */
    async processDocument(content, options = {}) {
        try {
            console.log(`📄 开始处理文档，长度: ${content.length} 字符`);

            // 预处理：清理和标准化内容
            const cleanedContent = this.preprocessContent(content);

            // 智能分块
            const chunks = this.smartChunking(cleanedContent, options);
            console.log(`📊 文档已分为 ${chunks.length} 个块`);

            // 提取全局信息
            const globalMetadata = this.extractGlobalMetadata(cleanedContent, chunks);

            // 构建知识图谱
            const knowledgeGraph = options.enableKnowledgeGraph !== false ? 
                this.buildKnowledgeGraph(chunks) : null;

            // 识别重要段落
            const importantSections = this.identifyImportantSections(chunks);

            // 提取概念和定义
            const concepts = this.extractConcepts(cleanedContent);

            const result = {
                originalLength: content.length,
                processedLength: cleanedContent.length,
                chunkCount: chunks.length,
                chunks: chunks,
                globalMetadata: globalMetadata,
                knowledgeGraph: knowledgeGraph,
                importantSections: importantSections,
                concepts: concepts,
                complexity: globalMetadata.averageComplexity,
                processingTime: Date.now()
            };

            console.log(`✅ 文档处理完成，生成 ${chunks.length} 个块，${concepts.length} 个概念`);
            return result;

        } catch (error) {
            console.error('文档处理失败:', error);
            throw new Error(`文档处理失败: ${error.message}`);
        }
    }

    /**
     * 提取概念和定义
     * @param {string} content - 文档内容
     * @returns {Array} 概念列表
     */
    extractConcepts(content) {
        if (!content) return [];

        const concepts = [];
        
        // 定义模式匹配
        const definitionPatterns = [
            /(.{1,30})是指(.{1,100})/g,
            /(.{1,30})是(.{1,100})/g,
            /(.{1,30})指的是(.{1,100})/g,
            /(.{1,30})称为(.{1,100})/g,
            /(.{1,30})定义为(.{1,100})/g,
            /(.{1,30})：(.{1,100})/g
        ];

        definitionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null && concepts.length < 20) {
                if (match[1] && match[2]) {
                    const term = match[1].trim().replace(/^[。，、；：！？\s]+|[。，、；：！？\s]+$/g, '');
                    const definition = match[2].trim().replace(/^[。，、；：！？\s]+|[。，、；：！？\s]+$/g, '');
                    
                    if (term.length > 1 && term.length < 30 && definition.length > 5) {
                        concepts.push({
                            term: term,
                            definition: definition,
                            type: 'definition',
                            confidence: this.calculateConceptConfidence(term, definition)
                        });
                    }
                }
            }
        });

        // 去重并按置信度排序
        const uniqueConcepts = concepts
            .filter((concept, index, self) => 
                index === self.findIndex(c => c.term === concept.term)
            )
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 15);

        return uniqueConcepts;
    }

    /**
     * 计算概念置信度
     * @param {string} term - 术语
     * @param {string} definition - 定义
     * @returns {number} 置信度分数
     */
    calculateConceptConfidence(term, definition) {
        let confidence = 0.5;

        // 术语长度适中
        if (term.length >= 2 && term.length <= 10) confidence += 0.2;
        
        // 定义长度适中
        if (definition.length >= 10 && definition.length <= 80) confidence += 0.2;
        
        // 包含专业词汇
        if (/[A-Z]{2,}|技术|方法|理论|原理|概念|系统|模型/.test(term + definition)) {
            confidence += 0.1;
        }

        return Math.min(1.0, confidence);
    }

    /**
     * 分析复杂度
     * @param {string} content - 内容
     * @returns {Object} 复杂度分析结果
     */
    async analyzeComplexity(content) {
        const complexity = this.assessComplexity(content);
        const wordCount = this.countWords(content);
        
        let recommendedChunkSize = 1000;
        if (complexity >= 4) recommendedChunkSize = 800;
        else if (complexity <= 2) recommendedChunkSize = 1200;

        return {
            averageComplexity: complexity,
            recommendedChunkSize: recommendedChunkSize,
            estimatedProcessingTime: Math.ceil(wordCount / 500) * 2,
            supportsBigFile: wordCount > 5000
        };
    }
}

module.exports = DocumentProcessor;