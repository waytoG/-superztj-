// 题目生成优化配置文件
// 解决题目数量少和生成速度慢的问题

module.exports = {
    // 默认题目数量配置 - 大幅增加
    defaultQuestionCounts: {
        quick: 20,        // 快速生成：20道题目
        standard: 25,     // 标准生成：25道题目  
        enhanced: 30,     // 增强生成：30道题目
        batch: 40,        // 批量生成：40道题目
        maximum: 50       // 最大数量：50道题目
    },

    // 题目类型分布配置
    questionTypeDistribution: {
        mixed: {
            'multiple-choice': 0.5,  // 选择题50%
            'fill-blank': 0.3,       // 填空题30%
            'essay': 0.2             // 问答题20%
        },
        exam: {
            'multiple-choice': 0.6,  // 考试模式：选择题更多
            'fill-blank': 0.25,
            'essay': 0.15
        },
        practice: {
            'multiple-choice': 0.4,  // 练习模式：更均衡
            'fill-blank': 0.35,
            'essay': 0.25
        }
    },

    // 批量生成配置 - 优化批次大小
    batchGeneration: {
        enabled: true,
        maxConcurrentBatches: 3,     // 最大并发批次数
        batchSize: 10,               // 每批次题目数量
        timeoutPerBatch: 30000,      // 每批次超时时间（毫秒）
        
        // 预设批次配置
        presets: {
            small: [
                { type: 'multiple-choice', count: 10, difficulty: 1 },
                { type: 'fill-blank', count: 6, difficulty: 2 },
                { type: 'essay', count: 4, difficulty: 2 }
            ],
            medium: [
                { type: 'multiple-choice', count: 15, difficulty: 1 },
                { type: 'fill-blank', count: 10, difficulty: 2 },
                { type: 'essay', count: 5, difficulty: 2 }
            ],
            large: [
                { type: 'multiple-choice', count: 20, difficulty: 1 },
                { type: 'fill-blank', count: 12, difficulty: 2 },
                { type: 'essay', count: 8, difficulty: 2 }
            ],
            xlarge: [
                { type: 'multiple-choice', count: 25, difficulty: 1 },
                { type: 'fill-blank', count: 15, difficulty: 2 },
                { type: 'essay', count: 10, difficulty: 3 }
            ]
        }
    },

    // 性能优化配置
    performance: {
        // 缓存配置
        cache: {
            enabled: true,
            maxSize: 100,              // 最大缓存条目数
            ttl: 3600000,             // 缓存生存时间（1小时）
            keyLength: 500            // 缓存键内容长度
        },

        // 超时配置 - 增加超时时间
        timeouts: {
            quick: 15000,             // 快速生成：15秒
            standard: 45000,          // 标准生成：45秒
            enhanced: 60000,          // 增强生成：60秒
            batch: 90000,             // 批量生成：90秒
            maximum: 120000           // 最大超时：2分钟
        },

        // 并发控制
        concurrency: {
            maxConcurrentRequests: 5,  // 最大并发请求数
            queueTimeout: 30000,       // 队列超时时间
            retryAttempts: 2,          // 重试次数
            retryDelay: 1000          // 重试延迟
        },

        // 快速模式配置
        fastMode: {
            enabled: true,
            useTemplates: true,        // 使用模板生成
            templateRatio: 0.7,        // 模板题目比例
            aiEnhancementRatio: 0.3,   // AI增强比例
            maxConceptsToExtract: 15,  // 最大提取概念数
            simplifiedProcessing: true  // 简化处理流程
        }
    },

    // 质量控制配置
    quality: {
        // 最低质量要求
        minimumQuality: {
            questionLength: 10,        // 题目最短长度
            optionLength: 2,          // 选项最短长度
            explanationLength: 20,     // 解释最短长度
            uniquenessThreshold: 0.8   // 唯一性阈值
        },

        // 质量检查
        qualityChecks: {
            duplicateDetection: true,  // 重复检测
            lengthValidation: true,    // 长度验证
            formatValidation: true,    // 格式验证
            contentRelevance: true     // 内容相关性检查
        },

        // 备用题目配置
        fallback: {
            enabled: true,
            minimumCount: 10,          // 最少备用题目数
            useBasicTemplates: true,   // 使用基础模板
            generateOnDemand: true     // 按需生成
        }
    },

    // 文档处理优化
    documentProcessing: {
        // 分块配置
        chunking: {
            maxChunkSize: 1000,        // 最大分块大小
            overlapSize: 200,          // 重叠大小
            minChunkSize: 100,         // 最小分块大小
            smartSplitting: true       // 智能分割
        },

        // 概念提取优化
        conceptExtraction: {
            maxConcepts: 20,           // 最大概念数
            minConceptLength: 2,       // 最小概念长度
            maxConceptLength: 15,      // 最大概念长度
            frequencyThreshold: 2,     // 频率阈值
            useNLP: false,            // 禁用复杂NLP处理以提高速度
            useSimplePatterns: true    // 使用简单模式匹配
        },

        // 预处理优化
        preprocessing: {
            removeStopWords: true,     // 移除停用词
            normalizeText: true,       // 文本标准化
            extractKeyPhrases: true,   // 提取关键短语
            limitProcessingTime: 5000  // 限制处理时间（5秒）
        }
    },

    // AI服务配置
    aiService: {
        // 服务选择策略
        serviceSelection: {
            preferredOrder: ['optimized', 'ollama', 'fallback'],
            fallbackEnabled: true,
            autoFallback: true,
            fallbackThreshold: 30000   // 30秒后自动降级
        },

        // 请求优化
        requestOptimization: {
            batchRequests: true,       // 批量请求
            compressPayload: false,    // 不压缩载荷（避免额外开销）
            streamResponse: false,     // 不使用流式响应
            simplifyPrompts: true      // 简化提示词
        },

        // 模型配置
        modelSettings: {
            temperature: 0.3,          // 降低随机性以提高一致性
            maxTokens: 500,           // 限制最大令牌数
            topP: 0.9,                // 核采样参数
            frequencyPenalty: 0.1     // 频率惩罚
        }
    },

    // 用户体验优化
    userExperience: {
        // 进度反馈
        progressFeedback: {
            enabled: true,
            showPercentage: true,      // 显示百分比
            showEstimatedTime: true,   // 显示预估时间
            updateInterval: 1000,      // 更新间隔（毫秒）
            showDetailedStatus: true   // 显示详细状态
        },

        // 预加载配置
        preloading: {
            enabled: true,
            preloadTemplates: true,    // 预加载模板
            preloadCommonQuestions: true, // 预加载常见题目
            cacheWarmup: true         // 缓存预热
        },

        // 响应式配置
        responsive: {
            adaptToDevicePerformance: true, // 根据设备性能调整
            reducedModeForSlowDevices: true, // 慢设备使用精简模式
            progressiveLoading: true   // 渐进式加载
        }
    },

    // 调试和监控
    debugging: {
        enabled: process.env.NODE_ENV === 'development',
        logLevel: 'info',             // 日志级别
        performanceMonitoring: true,   // 性能监控
        errorTracking: true,          // 错误跟踪
        metricsCollection: true       // 指标收集
    },

    // 实验性功能
    experimental: {
        parallelGeneration: true,      // 并行生成
        adaptiveTimeout: true,         // 自适应超时
        intelligentCaching: true,      // 智能缓存
        predictivePreloading: false,   // 预测性预加载
        dynamicBatching: true         // 动态批处理
    }
};

// 根据环境调整配置
if (process.env.NODE_ENV === 'production') {
    // 生产环境优化
    module.exports.performance.cache.maxSize = 200;
    module.exports.performance.concurrency.maxConcurrentRequests = 10;
    module.exports.debugging.enabled = false;
} else if (process.env.NODE_ENV === 'development') {
    // 开发环境优化
    module.exports.performance.timeouts.quick = 10000;
    module.exports.debugging.logLevel = 'debug';
}