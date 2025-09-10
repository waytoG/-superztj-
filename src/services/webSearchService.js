// 网络搜索服务 - 增强题目生成的知识来源
const axios = require('axios');

class WebSearchService {
    constructor() {
        this.searchEngines = {
            // 百度搜索API（需要申请密钥）
            baidu: {
                enabled: false,
                apiKey: process.env.BAIDU_SEARCH_API_KEY,
                baseUrl: 'https://aip.baidubce.com/rest/2.0/knowledge/v1/search'
            },
            // 必应搜索API
            bing: {
                enabled: !!process.env.BING_SEARCH_API_KEY,
                apiKey: process.env.BING_SEARCH_API_KEY,
                baseUrl: 'https://api.bing.microsoft.com/v7.0/search'
            },
            // 谷歌自定义搜索API
            google: {
                enabled: !!process.env.GOOGLE_SEARCH_API_KEY,
                apiKey: process.env.GOOGLE_SEARCH_API_KEY,
                cseId: process.env.GOOGLE_CSE_ID,
                baseUrl: 'https://www.googleapis.com/customsearch/v1'
            },
            // 维基百科API（免费）
            wikipedia: {
                enabled: true,
                baseUrl: 'https://zh.wikipedia.org/api/rest_v1'
            },
            // 百度百科API（免费但有限制）
            baiduBaike: {
                enabled: true,
                baseUrl: 'https://baike.baidu.com/api/openapi'
            }
        };
        
        this.cache = new Map(); // 搜索结果缓存
        this.maxCacheSize = 1000;
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24小时
        
        console.log('🔍 网络搜索服务初始化完成');
        this.logAvailableEngines();
    }

    /**
     * 记录可用的搜索引擎
     */
    logAvailableEngines() {
        const available = Object.entries(this.searchEngines)
            .filter(([, config]) => config.enabled)
            .map(([name]) => name);
        
        console.log(`📡 可用搜索引擎: ${available.join(', ')}`);
    }

    /**
     * 搜索概念相关信息
     * @param {string} concept - 概念名称
     * @param {Object} options - 搜索选项
     * @returns {Object} 搜索结果
     */
    async searchConcept(concept, options = {}) {
        const {
            maxResults = 5,
            includeDefinition = true,
            includeExamples = true,
            includeRelated = true,
            language = 'zh'
        } = options;

        console.log(`🔍 搜索概念: ${concept}`);

        // 检查缓存
        const cacheKey = `${concept}_${JSON.stringify(options)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`📋 使用缓存结果: ${concept}`);
            return cached;
        }

        try {
            const searchResults = await this.performMultiEngineSearch(concept, options);
            const enrichedInfo = await this.enrichConceptInfo(concept, searchResults);
            
            // 缓存结果
            this.setCache(cacheKey, enrichedInfo);
            
            return enrichedInfo;
        } catch (error) {
            console.error(`搜索概念 ${concept} 失败:`, error.message);
            return this.getFallbackInfo(concept);
        }
    }

    /**
     * 执行多引擎搜索
     * @param {string} concept - 概念
     * @param {Object} options - 选项
     * @returns {Array} 搜索结果
     */
    async performMultiEngineSearch(concept, options) {
        const searchPromises = [];
        
        // 维基百科搜索
        if (this.searchEngines.wikipedia.enabled) {
            searchPromises.push(this.searchWikipedia(concept));
        }
        
        // 百度百科搜索
        if (this.searchEngines.baiduBaike.enabled) {
            searchPromises.push(this.searchBaiduBaike(concept));
        }
        
        // 必应搜索
        if (this.searchEngines.bing.enabled) {
            searchPromises.push(this.searchBing(concept, options));
        }
        
        // 谷歌搜索
        if (this.searchEngines.google.enabled) {
            searchPromises.push(this.searchGoogle(concept, options));
        }

        const results = await Promise.allSettled(searchPromises);
        
        return results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value)
            .flat();
    }

    /**
     * 搜索维基百科
     * @param {string} concept - 概念
     * @returns {Array} 搜索结果
     */
    async searchWikipedia(concept) {
        try {
            // 搜索页面
            const searchResponse = await axios.get(`${this.searchEngines.wikipedia.baseUrl}/page/summary/${encodeURIComponent(concept)}`, {
                timeout: 5000
            });

            if (searchResponse.data && searchResponse.data.extract) {
                return [{
                    source: 'wikipedia',
                    title: searchResponse.data.title,
                    summary: searchResponse.data.extract,
                    url: searchResponse.data.content_urls?.desktop?.page,
                    confidence: 0.9
                }];
            }
        } catch (error) {
            console.warn(`维基百科搜索 ${concept} 失败:`, error.message);
        }
        
        return [];
    }

    /**
     * 搜索百度百科
     * @param {string} concept - 概念
     * @returns {Array} 搜索结果
     */
    async searchBaiduBaike(concept) {
        try {
            // 使用百度百科的开放API（如果可用）
            // 注意：这是一个示例实现，实际可能需要不同的API
            const searchUrl = `https://baike.baidu.com/api/openapi/BaikeLemmaCardApi?scope=103&format=json&appid=379020&bk_key=${encodeURIComponent(concept)}&bk_length=600`;
            
            const response = await axios.get(searchUrl, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.data && response.data.abstract) {
                return [{
                    source: 'baidu_baike',
                    title: response.data.subject || concept,
                    summary: response.data.abstract,
                    url: response.data.url,
                    confidence: 0.8
                }];
            }
        } catch (error) {
            console.warn(`百度百科搜索 ${concept} 失败:`, error.message);
        }
        
        return [];
    }

    /**
     * 搜索必应
     * @param {string} concept - 概念
     * @param {Object} options - 选项
     * @returns {Array} 搜索结果
     */
    async searchBing(concept, options) {
        if (!this.searchEngines.bing.enabled) return [];
        
        try {
            const query = `${concept} 定义 概念 解释`;
            const response = await axios.get(this.searchEngines.bing.baseUrl, {
                params: {
                    q: query,
                    count: 3,
                    mkt: 'zh-CN'
                },
                headers: {
                    'Ocp-Apim-Subscription-Key': this.searchEngines.bing.apiKey
                },
                timeout: 5000
            });

            if (response.data && response.data.webPages) {
                return response.data.webPages.value.map(item => ({
                    source: 'bing',
                    title: item.name,
                    summary: item.snippet,
                    url: item.url,
                    confidence: 0.7
                }));
            }
        } catch (error) {
            console.warn(`必应搜索 ${concept} 失败:`, error.message);
        }
        
        return [];
    }

    /**
     * 搜索谷歌
     * @param {string} concept - 概念
     * @param {Object} options - 选项
     * @returns {Array} 搜索结果
     */
    async searchGoogle(concept, options) {
        if (!this.searchEngines.google.enabled) return [];
        
        try {
            const query = `${concept} 定义 概念`;
            const response = await axios.get(this.searchEngines.google.baseUrl, {
                params: {
                    key: this.searchEngines.google.apiKey,
                    cx: this.searchEngines.google.cseId,
                    q: query,
                    num: 3,
                    lr: 'lang_zh'
                },
                timeout: 5000
            });

            if (response.data && response.data.items) {
                return response.data.items.map(item => ({
                    source: 'google',
                    title: item.title,
                    summary: item.snippet,
                    url: item.link,
                    confidence: 0.8
                }));
            }
        } catch (error) {
            console.warn(`谷歌搜索 ${concept} 失败:`, error.message);
        }
        
        return [];
    }

    /**
     * 丰富概念信息
     * @param {string} concept - 概念
     * @param {Array} searchResults - 搜索结果
     * @returns {Object} 丰富的概念信息
     */
    async enrichConceptInfo(concept, searchResults) {
        const enrichedInfo = {
            concept: concept,
            definition: '',
            summary: '',
            examples: [],
            relatedConcepts: [],
            applications: [],
            sources: [],
            confidence: 0
        };

        if (searchResults.length === 0) {
            return this.getFallbackInfo(concept);
        }

        // 提取定义和摘要
        const bestResult = searchResults.sort((a, b) => b.confidence - a.confidence)[0];
        enrichedInfo.definition = this.extractDefinition(bestResult.summary);
        enrichedInfo.summary = bestResult.summary;
        enrichedInfo.confidence = bestResult.confidence;

        // 合并所有来源
        enrichedInfo.sources = searchResults.map(result => ({
            source: result.source,
            title: result.title,
            url: result.url
        }));

        // 提取相关概念
        enrichedInfo.relatedConcepts = this.extractRelatedConcepts(searchResults);

        // 提取应用场景
        enrichedInfo.applications = this.extractApplications(searchResults);

        // 提取示例
        enrichedInfo.examples = this.extractExamples(searchResults);

        return enrichedInfo;
    }

    /**
     * 提取定义
     * @param {string} text - 文本
     * @returns {string} 定义
     */
    extractDefinition(text) {
        if (!text) return '';
        
        // 查找定义模式
        const definitionPatterns = [
            /(.{0,100})是指(.{1,200})/,
            /(.{0,100})指的是(.{1,200})/,
            /(.{0,100})定义为(.{1,200})/,
            /(.{0,100})是(.{1,200})/
        ];

        for (const pattern of definitionPatterns) {
            const match = text.match(pattern);
            if (match && match[2]) {
                return match[2].trim().replace(/[。！？.!?].*$/, '');
            }
        }

        // 如果没有找到明确定义，返回前100字符
        return text.substring(0, 100).replace(/[。！？.!?].*$/, '');
    }

    /**
     * 提取相关概念
     * @param {Array} searchResults - 搜索结果
     * @returns {Array} 相关概念
     */
    extractRelatedConcepts(searchResults) {
        const concepts = new Set();
        const conceptPatterns = [
            /相关概念[：:](.{1,100})/g,
            /包括(.{1,100})/g,
            /涉及(.{1,100})/g,
            /与(.{1,50})相关/g
        ];

        searchResults.forEach(result => {
            const text = result.summary || '';
            conceptPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    if (match[1]) {
                        const extracted = match[1].split(/[，,、]/).map(s => s.trim());
                        extracted.forEach(concept => {
                            if (concept.length > 1 && concept.length < 20) {
                                concepts.add(concept);
                            }
                        });
                    }
                }
            });
        });

        return Array.from(concepts).slice(0, 10);
    }

    /**
     * 提取应用场景
     * @param {Array} searchResults - 搜索结果
     * @returns {Array} 应用场景
     */
    extractApplications(searchResults) {
        const applications = new Set();
        const applicationPatterns = [
            /应用于(.{1,50})/g,
            /用于(.{1,50})/g,
            /在(.{1,50})中使用/g,
            /适用于(.{1,50})/g
        ];

        searchResults.forEach(result => {
            const text = result.summary || '';
            applicationPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    if (match[1]) {
                        const app = match[1].trim().replace(/[。！？.!?].*$/, '');
                        if (app.length > 2 && app.length < 30) {
                            applications.add(app);
                        }
                    }
                }
            });
        });

        return Array.from(applications).slice(0, 5);
    }

    /**
     * 提取示例
     * @param {Array} searchResults - 搜索结果
     * @returns {Array} 示例
     */
    extractExamples(searchResults) {
        const examples = new Set();
        const examplePatterns = [
            /例如(.{1,100})/g,
            /比如(.{1,100})/g,
            /举例(.{1,100})/g,
            /如(.{1,100})/g
        ];

        searchResults.forEach(result => {
            const text = result.summary || '';
            examplePatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    if (match[1]) {
                        const example = match[1].trim().replace(/[。！？.!?].*$/, '');
                        if (example.length > 3 && example.length < 50) {
                            examples.add(example);
                        }
                    }
                }
            });
        });

        return Array.from(examples).slice(0, 3);
    }

    /**
     * 获取备用信息
     * @param {string} concept - 概念
     * @returns {Object} 备用信息
     */
    getFallbackInfo(concept) {
        return {
            concept: concept,
            definition: `${concept}是一个重要的概念，需要进一步学习和理解。`,
            summary: `关于${concept}的详细信息，建议查阅相关资料进行深入学习。`,
            examples: [`${concept}的实际应用示例`],
            relatedConcepts: [],
            applications: ['学术研究', '实际应用'],
            sources: [],
            confidence: 0.1
        };
    }

    /**
     * 批量搜索概念
     * @param {Array} concepts - 概念列表
     * @param {Object} options - 选项
     * @returns {Object} 批量搜索结果
     */
    async batchSearchConcepts(concepts, options = {}) {
        console.log(`🔍 批量搜索 ${concepts.length} 个概念`);
        
        const results = {};
        const concurrency = 3; // 限制并发数
        
        for (let i = 0; i < concepts.length; i += concurrency) {
            const batch = concepts.slice(i, i + concurrency);
            const batchPromises = batch.map(concept => 
                this.searchConcept(concept, options).catch(error => {
                    console.error(`搜索概念 ${concept} 失败:`, error.message);
                    return this.getFallbackInfo(concept);
                })
            );
            
            const batchResults = await Promise.all(batchPromises);
            batch.forEach((concept, index) => {
                results[concept] = batchResults[index];
            });
            
            // 避免请求过于频繁
            if (i + concurrency < concepts.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }

    /**
     * 缓存管理
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        if (this.cache.size >= this.maxCacheSize) {
            // 删除最旧的缓存项
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * 清理缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ 搜索缓存已清理');
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
        };
    }
}

module.exports = WebSearchService;