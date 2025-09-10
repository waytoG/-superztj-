// 数学公式处理器 - 解决数学公式显示问题
const he = require('he');

class MathFormulaHandler {
    constructor() {
        console.log('🔧 数学公式处理器初始化');
        
        // 数学符号映射表
        this.mathSymbols = {
            // 基本运算符号
            '×': '\\times',
            '÷': '\\div',
            '±': '\\pm',
            '∓': '\\mp',
            
            // 比较符号
            '≠': '\\neq',
            '≤': '\\leq',
            '≥': '\\geq',
            '≈': '\\approx',
            '≡': '\\equiv',
            
            // 希腊字母
            'α': '\\alpha',
            'β': '\\beta',
            'γ': '\\gamma',
            'δ': '\\delta',
            'ε': '\\varepsilon',
            'ζ': '\\zeta',
            'η': '\\eta',
            'θ': '\\theta',
            'ι': '\\iota',
            'κ': '\\kappa',
            'λ': '\\lambda',
            'μ': '\\mu',
            'ν': '\\nu',
            'ξ': '\\xi',
            'π': '\\pi',
            'ρ': '\\rho',
            'σ': '\\sigma',
            'τ': '\\tau',
            'υ': '\\upsilon',
            'φ': '\\phi',
            'χ': '\\chi',
            'ψ': '\\psi',
            'ω': '\\omega',
            
            // 大写希腊字母
            'Α': '\\Alpha',
            'Β': '\\Beta',
            'Γ': '\\Gamma',
            'Δ': '\\Delta',
            'Ε': '\\Epsilon',
            'Ζ': '\\Zeta',
            'Η': '\\Eta',
            'Θ': '\\Theta',
            'Ι': '\\Iota',
            'Κ': '\\Kappa',
            'Λ': '\\Lambda',
            'Μ': '\\Mu',
            'Ν': '\\Nu',
            'Ξ': '\\Xi',
            'Π': '\\Pi',
            'Ρ': '\\Rho',
            'Σ': '\\Sigma',
            'Τ': '\\Tau',
            'Υ': '\\Upsilon',
            'Φ': '\\Phi',
            'Χ': '\\Chi',
            'Ψ': '\\Psi',
            'Ω': '\\Omega',
            
            // 特殊符号
            '∞': '\\infty',
            '∂': '\\partial',
            '∇': '\\nabla',
            '∫': '\\int',
            '∮': '\\oint',
            '∑': '\\sum',
            '∏': '\\prod',
            '√': '\\sqrt',
            '∛': '\\sqrt[3]',
            '∜': '\\sqrt[4]',
            
            // 集合符号
            '∈': '\\in',
            '∉': '\\notin',
            '⊂': '\\subset',
            '⊃': '\\supset',
            '⊆': '\\subseteq',
            '⊇': '\\supseteq',
            '∪': '\\cup',
            '∩': '\\cap',
            '∅': '\\emptyset',
            
            // 逻辑符号
            '∧': '\\land',
            '∨': '\\lor',
            '¬': '\\neg',
            '→': '\\rightarrow',
            '←': '\\leftarrow',
            '↔': '\\leftrightarrow',
            '⇒': '\\Rightarrow',
            '⇐': '\\Leftarrow',
            '⇔': '\\Leftrightarrow',
            '∀': '\\forall',
            '∃': '\\exists',
            '∴': '\\therefore',
            '∵': '\\because',
            
            // 几何符号
            '⊥': '\\perp',
            '∥': '\\parallel',
            '°': '^\\circ',
            '′': '^\\prime',
            '″': '^{\\prime\\prime}',
            
            // 上标数字
            '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
            '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
            
            // 下标数字
            '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
            '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9'
        };
        
        // 编码修复映射
        this.encodingFixes = {
            'â€™': "'",
            'â€œ': '"',
            'â€\u009d': '"',
            'â€"': '—',
            'â€¢': '•',
            'Â°': '°',
            'Â±': '±',
            'Â²': '²',
            'Â³': '³',
            'Â¼': '¼',
            'Â½': '½',
            'Â¾': '¾',
            'Ã—': '×',
            'Ã·': '÷',
            'âˆš': '√',
            'âˆž': '∞',
            'Î±': 'α',
            'Î²': 'β',
            'Î³': 'γ',
            'Î´': 'δ',
            'Îµ': 'ε',
            'Î¸': 'θ',
            'Î»': 'λ',
            'Î¼': 'μ',
            'Ï€': 'π',
            'Ïƒ': 'σ',
            'Ï†': 'φ',
            'Ï‰': 'ω'
        };
        
        // 数学函数名
        this.mathFunctions = [
            'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
            'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
            'log', 'ln', 'lg', 'exp', 'lim', 'max', 'min',
            'sup', 'inf', 'det', 'dim', 'ker', 'gcd', 'lcm'
        ];
    }
    
    /**
     * 处理文本中的数学公式 - 主入口函数
     * @param {string} text - 包含数学公式的文本
     * @param {Object} options - 处理选项
     * @returns {string} 处理后的文本
     */
    processMathFormulas(text, options = {}) {
        if (!text || typeof text !== 'string') {
            return text;
        }
        
        const {
            renderMode = 'html',     // 'latex', 'unicode', 'html'
            autoWrap = false,       // 是否自动包装数学公式
            preserveOriginal = true // 是否保留原始格式
        } = options;
        
        try {
            console.log('🔧 开始处理数学公式:', text.substring(0, 100) + '...');
            
            // 1. HTML解码
            let processedText = he.decode(text);
            
            // 2. 修复编码问题
            processedText = this.fixEncoding(processedText);
            
            // 3. 根据渲染模式处理
            switch (renderMode) {
                case 'latex':
                    if (autoWrap) {
                        processedText = this.detectAndWrapFormulas(processedText);
                        processedText = this.convertMathSymbols(processedText);
                        processedText = this.fixCommonFormulaIssues(processedText);
                        processedText = this.cleanupFormulas(processedText);
                    } else {
                        // 只处理已有的LaTeX公式
                        processedText = this.processExistingLatex(processedText);
                    }
                    break;
                    
                case 'unicode':
                    processedText = this.convertToUnicode(processedText);
                    break;
                    
                case 'html':
                    processedText = this.convertToHtml(processedText);
                    break;
                    
                default:
                    // 保持原样，只做基本清理
                    processedText = this.basicCleanup(processedText);
            }
            
            console.log('✅ 数学公式处理完成');
            return processedText;
            
        } catch (error) {
            console.error('❌ 数学公式处理失败:', error);
            return text; // 返回原文本
        }
    }
    
    /**
     * 修复编码问题
     * @param {string} text - 文本
     * @returns {string} 修复后的文本
     */
    fixEncoding(text) {
        let fixed = text;
        
        // 修复常见编码问题
        Object.entries(this.encodingFixes).forEach(([wrong, correct]) => {
            fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
        });
        
        // 修复UTF-8编码问题
        try {
            // 尝试修复双重编码
            if (fixed.includes('Ã') || fixed.includes('â')) {
                fixed = decodeURIComponent(escape(fixed));
            }
        } catch (e) {
            // 如果解码失败，保持原文本
        }
        
        return fixed;
    }
    
    /**
     * 处理已有的LaTeX公式（不自动添加$符号）
     * @param {string} text - 文本
     * @returns {string} 处理后的文本
     */
    processExistingLatex(text) {
        let processed = text;
        
        // 只处理已经用$包围的公式
        processed = processed.replace(/\$([^$]+)\$/g, (match, formula) => {
            let processedFormula = this.convertMathSymbols(formula);
            processedFormula = this.fixCommonFormulaIssues(processedFormula);
            return `$${processedFormula}$`;
        });
        
        return processed;
    }
    
    /**
     * 转换为Unicode数学符号
     * @param {string} text - 文本
     * @returns {string} 转换后的文本
     */
    convertToUnicode(text) {
        let converted = text;
        
        // 移除LaTeX标记，保留Unicode符号
        converted = converted.replace(/\$([^$]+)\$/g, (match, formula) => {
            // 将LaTeX符号转换回Unicode
            let unicodeFormula = formula;
            Object.entries(this.mathSymbols).forEach(([unicode, latex]) => {
                const escapedLatex = latex.replace(/\\/g, '\\\\');
                unicodeFormula = unicodeFormula.replace(new RegExp(escapedLatex, 'g'), unicode);
            });
            return unicodeFormula;
        });
        
        return converted;
    }
    
    /**
     * 转换为HTML格式
     * @param {string} text - 文本
     * @returns {string} 转换后的文本
     */
    convertToHtml(text) {
        let converted = text;
        
        // 将数学公式转换为HTML格式
        converted = converted.replace(/\$([^$]+)\$/g, (match, formula) => {
            // 处理上标
            let htmlFormula = formula.replace(/\^{([^}]+)}/g, '<sup>$1</sup>');
            htmlFormula = htmlFormula.replace(/\^([a-zA-Z0-9])/g, '<sup>$1</sup>');
            
            // 处理下标
            htmlFormula = htmlFormula.replace(/_{([^}]+)}/g, '<sub>$1</sub>');
            htmlFormula = htmlFormula.replace(/_([a-zA-Z0-9])/g, '<sub>$1</sub>');
            
            // 处理分数
            htmlFormula = htmlFormula.replace(/\\frac{([^}]+)}{([^}]+)}/g, 
                '<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>');
            
            // 处理根号
            htmlFormula = htmlFormula.replace(/\\sqrt{([^}]+)}/g, '√($1)');
            
            // 转换常用符号
            Object.entries(this.mathSymbols).forEach(([unicode, latex]) => {
                const escapedLatex = latex.replace(/\\/g, '\\\\');
                htmlFormula = htmlFormula.replace(new RegExp(escapedLatex, 'g'), unicode);
            });
            
            return `<span class="math-formula">${htmlFormula}</span>`;
        });
        
        // 处理单独的数学符号（不在$包围中的）
        const mathSymbolPattern = /[αβγδεθλμπσφω∞∂∇∫∑∏√±×÷≠≤≥≈∈∉⊂⊃∪∩∅∧∨¬→←↔⇒⇐⇔∀∃∴∵⊥∥°′″]/g;
        converted = converted.replace(mathSymbolPattern, (match) => {
            return `<span class="math-symbol">${match}</span>`;
        });
        
        return converted;
    }
    
    /**
     * 基本清理（保持原格式）
     * @param {string} text - 文本
     * @returns {string} 清理后的文本
     */
    basicCleanup(text) {
        let cleaned = text;
        
        // 只做基本的编码修复和清理
        cleaned = this.fixEncoding(cleaned);
        
        // 清理多余的空格和换行
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned;
    }
    
    /**
     * 检测并包装数学公式（仅在autoWrap=true时使用）
     * @param {string} text - 文本
     * @returns {string} 包装后的文本
     */
    detectAndWrapFormulas(text) {
        let processed = text;
        
        // 检测已有的数学公式标记，不重复处理
        if (processed.includes('$') || processed.includes('\\(') || processed.includes('\\[')) {
            return processed;
        }
        
        // 检测数学表达式模式
        const mathPatterns = [
            // 分数表达式: a/b, (a+b)/(c+d)
            {
                pattern: /(\([^)]+\)|[a-zA-Z0-9]+)\s*\/\s*(\([^)]+\)|[a-zA-Z0-9]+)/g,
                replacement: (match, numerator, denominator) => {
                    return `$\\frac{${numerator.replace(/[()]/g, '')}}{${denominator.replace(/[()]/g, '')}}$`;
                }
            },
            
            // 指数表达式: x^2, (x+y)^n
            {
                pattern: /([a-zA-Z0-9()]+)\^([a-zA-Z0-9()]+)/g,
                replacement: (match, base, exponent) => {
                    return `$${base}^{${exponent.replace(/[()]/g, '')}}$`;
                }
            },
            
            // 下标表达式: x_1, A_n
            {
                pattern: /([a-zA-Z]+)_([a-zA-Z0-9]+)/g,
                replacement: (match, base, subscript) => {
                    return `$${base}_{${subscript}}$`;
                }
            },
            
            // 根号表达式: √(x+y), sqrt(x)
            {
                pattern: /√\(([^)]+)\)|sqrt\(([^)]+)\)/g,
                replacement: (match, content1, content2) => {
                    const content = content1 || content2;
                    return `$\\sqrt{${content}}$`;
                }
            },
            
            // 积分表达式: ∫f(x)dx
            {
                pattern: /∫([^d]+)d([a-zA-Z])/g,
                replacement: (match, func, variable) => {
                    return `$\\int ${func.trim()} d${variable}$`;
                }
            },
            
            // 求和表达式: Σ
            {
                pattern: /∑/g,
                replacement: '$\\sum$'
            }
        ];
        
        // 应用数学表达式检测
        mathPatterns.forEach(({ pattern, replacement }) => {
            if (typeof replacement === 'function') {
                processed = processed.replace(pattern, replacement);
            } else {
                processed = processed.replace(pattern, replacement);
            }
        });
        
        return processed;
    }
    
    /**
     * 转换数学符号
     * @param {string} text - 文本
     * @returns {string} 转换后的文本
     */
    convertMathSymbols(text) {
        let converted = text;
        
        // 在数学公式内部转换符号
        converted = converted.replace(/\$([^$]+)\$/g, (match, formula) => {
            let convertedFormula = formula;
            
            // 转换数学符号
            Object.entries(this.mathSymbols).forEach(([symbol, latex]) => {
                convertedFormula = convertedFormula.replace(new RegExp(symbol, 'g'), latex);
            });
            
            // 修复函数名
            this.mathFunctions.forEach(func => {
                const regex = new RegExp(`\\b${func}\\b`, 'g');
                convertedFormula = convertedFormula.replace(regex, `\\${func}`);
            });
            
            return `$${convertedFormula}$`;
        });
        
        return converted;
    }
    
    /**
     * 修复常见公式问题
     * @param {string} text - 文本
     * @returns {string} 修复后的文本
     */
    fixCommonFormulaIssues(text) {
        let fixed = text;
        
        // 修复数学公式内的常见问题
        fixed = fixed.replace(/\$([^$]+)\$/g, (match, formula) => {
            let fixedFormula = formula;
            
            // 修复上下标缺少大括号的问题
            fixedFormula = this.fixSubscriptSuperscript(fixedFormula);
            
            // 修复分数格式
            fixedFormula = this.fixFractions(fixedFormula);
            
            // 修复根号格式
            fixedFormula = this.fixRoots(fixedFormula);
            
            // 修复括号匹配
            fixedFormula = this.fixBrackets(fixedFormula);
            
            return `$${fixedFormula}$`;
        });
        
        return fixed;
    }
    
    /**
     * 修复上下标语法
     * @param {string} formula - 公式
     * @returns {string} 修复后的公式
     */
    fixSubscriptSuperscript(formula) {
        let fixed = formula;
        
        // 修复单字符上下标缺少大括号
        fixed = fixed.replace(/([_^])([a-zA-Z0-9])(?![{])/g, '$1{$2}');
        
        // 修复多字符上下标缺少大括号
        fixed = fixed.replace(/([_^])([a-zA-Z0-9]{2,})(?![}])/g, '$1{$2}');
        
        // 修复连续的上下标
        fixed = fixed.replace(/([_^])\{([^}]*)\}([_^])\{([^}]*)\}/g, '$1{$2}$3{$4}');
        
        // 修复空的上下标
        fixed = fixed.replace(/([_^])\{\}/g, '');
        
        return fixed;
    }
    
    /**
     * 修复分数格式
     * @param {string} formula - 公式
     * @returns {string} 修复后的公式
     */
    fixFractions(formula) {
        let fixed = formula;
        
        // 确保\frac有两个参数
        fixed = fixed.replace(/\\frac\{([^}]*)\}\s*([^{])/g, '\\frac{$1}{$2}');
        
        // 修复\frac后缺少大括号
        fixed = fixed.replace(/\\frac\s*([^{])/g, '\\frac{$1}');
        
        return fixed;
    }
    
    /**
     * 修复根号格式
     * @param {string} formula - 公式
     * @returns {string} 修复后的公式
     */
    fixRoots(formula) {
        let fixed = formula;
        
        // 修复\sqrt后使用圆括号
        fixed = fixed.replace(/\\sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
        
        // 修复\sqrt后缺少大括号
        fixed = fixed.replace(/\\sqrt\s*([^{])/g, '\\sqrt{$1}');
        
        return fixed;
    }
    
    /**
     * 修复括号匹配
     * @param {string} formula - 公式
     * @returns {string} 修复后的公式
     */
    fixBrackets(formula) {
        let fixed = formula;
        let braceCount = 0;
        let result = '';
        
        for (let i = 0; i < fixed.length; i++) {
            const char = fixed[i];
            
            if (char === '{') {
                braceCount++;
                result += char;
            } else if (char === '}') {
                if (braceCount > 0) {
                    braceCount--;
                    result += char;
                }
                // 忽略多余的闭括号
            } else {
                result += char;
            }
        }
        
        // 添加缺失的闭括号
        while (braceCount > 0) {
            result += '}';
            braceCount--;
        }
        
        return result;
    }
    
    /**
     * 清理和优化公式
     * @param {string} text - 文本
     * @returns {string} 清理后的文本
     */
    cleanupFormulas(text) {
        let cleaned = text;
        
        // 移除空的数学公式
        cleaned = cleaned.replace(/\$\s*\$/g, '');
        
        // 合并相邻的数学公式
        cleaned = cleaned.replace(/\$([^$]+)\$\s*\$([^$]+)\$/g, '$$$1 $2$$');
        
        // 清理多余的空格
        cleaned = cleaned.replace(/\$\s+/g, '$');
        cleaned = cleaned.replace(/\s+\$/g, '$');
        
        // 修复连续的美元符号
        cleaned = cleaned.replace(/\$\$\$/g, '$$');
        
        return cleaned;
    }
    
    /**
     * 处理单个题目的数学公式
     * @param {Object} question - 题目对象
     * @param {Object} options - 处理选项
     * @returns {Object} 处理后的题目对象
     */
    processQuestionMath(question, options = {}) {
        if (!question) return question;
        
        const processedQuestion = { ...question };
        
        // 默认使用HTML模式，避免显示$符号
        const defaultOptions = {
            renderMode: 'html',
            autoWrap: false,
            preserveOriginal: true,
            ...options
        };
        
        try {
            // 处理题目文本
            if (processedQuestion.question) {
                processedQuestion.question = this.processMathFormulas(processedQuestion.question, defaultOptions);
            }
            
            // 处理选项
            if (processedQuestion.options && Array.isArray(processedQuestion.options)) {
                processedQuestion.options = processedQuestion.options.map(option => 
                    this.processMathFormulas(option, defaultOptions)
                );
            }
            
            // 处理答案
            if (processedQuestion.answer) {
                processedQuestion.answer = this.processMathFormulas(processedQuestion.answer, defaultOptions);
            }
            
            // 处理示例答案
            if (processedQuestion.sampleAnswer) {
                processedQuestion.sampleAnswer = this.processMathFormulas(processedQuestion.sampleAnswer, defaultOptions);
            }
            
            // 处理解释
            if (processedQuestion.explanation) {
                processedQuestion.explanation = this.processMathFormulas(processedQuestion.explanation, defaultOptions);
            }
            
        } catch (error) {
            console.error('❌ 处理题目数学公式失败:', error);
            return question; // 返回原题目
        }
        
        return processedQuestion;
    }
    
    /**
     * 批量处理题目数组的数学公式
     * @param {Array} questions - 题目数组
     * @param {Object} options - 处理选项
     * @returns {Array} 处理后的题目数组
     */
    processQuestionsMath(questions, options = {}) {
        if (!Array.isArray(questions)) {
            return questions;
        }
        
        console.log(`🔧 开始批量处理 ${questions.length} 道题目的数学公式`);
        
        const processedQuestions = questions.map((question, index) => {
            try {
                const processed = this.processQuestionMath(question, options);
                console.log(`✅ 题目 ${index + 1} 数学公式处理完成`);
                return processed;
            } catch (error) {
                console.error(`❌ 题目 ${index + 1} 数学公式处理失败:`, error);
                return question;
            }
        });
        
        console.log(`✅ 批量数学公式处理完成: ${processedQuestions.length} 道题目`);
        return processedQuestions;
    }
    
    /**
     * 生成全面的问题覆盖策略
     * @param {string} content - 文档内容
     * @param {Object} options - 生成选项
     * @returns {Object} 问题生成策略
     */
    generateComprehensiveQuestionStrategy(content, options = {}) {
        const {
            questionCount = 10,
            difficultyLevels = ['easy', 'medium', 'hard'],
            questionTypes = ['multiple_choice', 'short_answer', 'essay'],
            coverageMode = 'comprehensive' // 'comprehensive', 'focused', 'random'
        } = options;
        
        try {
            // 分析文档结构
            const documentAnalysis = this.analyzeDocumentStructure(content);
            
            // 生成问题分布策略
            const questionStrategy = {
                totalQuestions: questionCount,
                sections: documentAnalysis.sections,
                distribution: this.calculateQuestionDistribution(documentAnalysis, questionCount),
                difficultyDistribution: this.calculateDifficultyDistribution(difficultyLevels, questionCount),
                typeDistribution: this.calculateTypeDistribution(questionTypes, questionCount),
                coverageAreas: this.identifyCoverageAreas(documentAnalysis, coverageMode)
            };
            
            console.log('📊 问题生成策略:', questionStrategy);
            return questionStrategy;
            
        } catch (error) {
            console.error('❌ 生成问题策略失败:', error);
            return {
                totalQuestions: questionCount,
                sections: [],
                distribution: [],
                error: error.message
            };
        }
    }
    
    /**
     * 分析文档结构
     * @param {string} content - 文档内容
     * @returns {Object} 文档分析结果
     */
    analyzeDocumentStructure(content) {
        const analysis = {
            totalLength: content.length,
            sections: [],
            keyTopics: [],
            mathContent: [],
            complexity: 'medium'
        };
        
        // 按段落分割内容
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        // 识别章节标题的正则表达式
        const sectionHeaderRegex = /^(第[一二三四五六七八九十\d]+[章节]|Chapter\s+\d+|\d+\.|[A-Z][^.]*:)/i;
        
        // 识别章节标题
        const sectionHeaders = paragraphs.filter(p => {
            return sectionHeaderRegex.test(p.trim());
        });
        
        // 创建章节结构
        let currentSection = null;
        paragraphs.forEach((paragraph, index) => {
            const isHeader = sectionHeaders.includes(paragraph);
            
            if (isHeader) {
                if (currentSection) {
                    analysis.sections.push(currentSection);
                }
                currentSection = {
                    title: paragraph.trim(),
                    startIndex: index,
                    content: [paragraph],
                    length: paragraph.length,
                    hasMath: this.containsMathContent(paragraph)
                };
            } else if (currentSection) {
                currentSection.content.push(paragraph);
                currentSection.length += paragraph.length;
                if (this.containsMathContent(paragraph)) {
                    currentSection.hasMath = true;
                }
            } else {
                // 没有明确章节的内容
                if (!analysis.sections.find(s => s.title === '引言')) {
                    analysis.sections.push({
                        title: '引言',
                        startIndex: 0,
                        content: [paragraph],
                        length: paragraph.length,
                        hasMath: this.containsMathContent(paragraph)
                    });
                }
            }
        });
        
        // 添加最后一个章节
        if (currentSection) {
            analysis.sections.push(currentSection);
        }
        
        // 如果没有识别到章节，按长度分割
        if (analysis.sections.length === 0) {
            const chunkSize = Math.ceil(content.length / 5);
            for (let i = 0; i < content.length; i += chunkSize) {
                const chunk = content.substring(i, i + chunkSize);
                analysis.sections.push({
                    title: `第${Math.floor(i / chunkSize) + 1}部分`,
                    startIndex: i,
                    content: [chunk],
                    length: chunk.length,
                    hasMath: this.containsMathContent(chunk)
                });
            }
        }
        
        // 识别关键主题
        analysis.keyTopics = this.extractKeyTopics(content);
        
        // 识别数学内容
        analysis.mathContent = this.extractMathContent(content);
        
        // 评估复杂度
        analysis.complexity = this.assessComplexity(content);
        
        return analysis;
    }
    
    /**
     * 检查内容是否包含数学内容
     * @param {string} content - 内容
     * @returns {boolean} 是否包含数学内容
     */
    containsMathContent(content) {
        const mathIndicators = [
            /[αβγδεθλμπσφω∞∂∇∫∑∏√±×÷≠≤≥≈∈∉⊂⊃∪∩∅]/,
            /\$[^$]+\$/,
            /\\[a-zA-Z]+/,
            /\b(sin|cos|tan|log|ln|exp|lim|max|min)\b/,
            /\b\d+[²³⁴⁵⁶⁷⁸⁹]/,
            /[a-zA-Z]\^[0-9]/,
            /[a-zA-Z]_[0-9]/
        ];
        
        return mathIndicators.some(pattern => pattern.test(content));
    }
    
    /**
     * 提取关键主题
     * @param {string} content - 内容
     * @returns {Array} 关键主题列表
     */
    extractKeyTopics(content) {
        // 简单的关键词提取（实际项目中可以使用更复杂的NLP技术）
        const words = content.toLowerCase().match(/\b[a-zA-Z\u4e00-\u9fa5]{3,}\b/g) || [];
        const wordCount = {};
        
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }
    
    /**
     * 提取数学内容
     * @param {string} content - 内容
     * @returns {Array} 数学内容列表
     */
    extractMathContent(content) {
        const mathContent = [];
        
        // 提取LaTeX公式
        const latexMatches = content.match(/\$[^$]+\$/g) || [];
        mathContent.push(...latexMatches);
        
        // 提取数学符号
        const symbolMatches = content.match(/[αβγδεθλμπσφω∞∂∇∫∑∏√±×÷≠≤≥≈∈∉⊂⊃∪∩∅]/g) || [];
        mathContent.push(...symbolMatches);
        
        return [...new Set(mathContent)]; // 去重
    }
    
    /**
     * 评估内容复杂度
     * @param {string} content - 内容
     * @returns {string} 复杂度等级
     */
    assessComplexity(content) {
        let score = 0;
        
        // 基于长度
        if (content.length > 5000) score += 2;
        else if (content.length > 2000) score += 1;
        
        // 基于数学内容
        if (this.containsMathContent(content)) score += 2;
        
        // 基于专业术语
        const technicalTerms = content.match(/\b[A-Z][a-z]*[A-Z][a-z]*\b/g) || [];
        if (technicalTerms.length > 10) score += 1;
        
        if (score >= 4) return 'hard';
        if (score >= 2) return 'medium';
        return 'easy';
    }
    
    /**
     * 计算问题分布
     * @param {Object} analysis - 文档分析结果
     * @param {number} totalQuestions - 总问题数
     * @returns {Array} 问题分布
     */
    calculateQuestionDistribution(analysis, totalQuestions) {
        const distribution = [];
        const totalLength = analysis.sections.reduce((sum, section) => sum + section.length, 0);
        
        analysis.sections.forEach(section => {
            const ratio = section.length / totalLength;
            const questionCount = Math.max(1, Math.round(totalQuestions * ratio));
            
            distribution.push({
                section: section.title,
                questionCount: questionCount,
                ratio: ratio,
                hasMath: section.hasMath
            });
        });
        
        return distribution;
    }
    
    /**
     * 计算难度分布
     * @param {Array} levels - 难度等级
     * @param {number} totalQuestions - 总问题数
     * @returns {Object} 难度分布
     */
    calculateDifficultyDistribution(levels, totalQuestions) {
        const distribution = {};
        const baseCount = Math.floor(totalQuestions / levels.length);
        const remainder = totalQuestions % levels.length;
        
        levels.forEach((level, index) => {
            distribution[level] = baseCount + (index < remainder ? 1 : 0);
        });
        
        return distribution;
    }
    
    /**
     * 计算题型分布
     * @param {Array} types - 题型列表
     * @param {number} totalQuestions - 总问题数
     * @returns {Object} 题型分布
     */
    calculateTypeDistribution(types, totalQuestions) {
        const distribution = {};
        const baseCount = Math.floor(totalQuestions / types.length);
        const remainder = totalQuestions % types.length;
        
        types.forEach((type, index) => {
            distribution[type] = baseCount + (index < remainder ? 1 : 0);
        });
        
        return distribution;
    }
    
    /**
     * 识别覆盖区域
     * @param {Object} analysis - 文档分析结果
     * @param {string} mode - 覆盖模式
     * @returns {Array} 覆盖区域
     */
    identifyCoverageAreas(analysis, mode) {
        const areas = [];
        
        switch (mode) {
            case 'comprehensive':
                // 确保每个章节都有覆盖
                analysis.sections.forEach(section => {
                    areas.push({
                        type: 'section',
                        title: section.title,
                        priority: 'high',
                        content: section.content.join('\n')
                    });
                });
                
                // 添加关键主题覆盖
                analysis.keyTopics.forEach(topic => {
                    areas.push({
                        type: 'topic',
                        title: topic,
                        priority: 'medium',
                        content: topic
                    });
                });
                break;
                
            case 'focused':
                // 重点关注数学内容和关键章节
                analysis.sections
                    .filter(section => section.hasMath || section.length > 1000)
                    .forEach(section => {
                        areas.push({
                            type: 'section',
                            title: section.title,
                            priority: 'high',
                            content: section.content.join('\n')
                        });
                    });
                break;
                
            case 'random':
                // 随机选择覆盖区域
                const shuffled = [...analysis.sections].sort(() => 0.5 - Math.random());
                shuffled.slice(0, Math.ceil(analysis.sections.length / 2)).forEach(section => {
                    areas.push({
                        type: 'section',
                        title: section.title,
                        priority: 'medium',
                        content: section.content.join('\n')
                    });
                });
                break;
        }
        
        return areas;
    }
    
    /**
     * 验证数学公式语法
     * @param {string} formula - 公式
     * @returns {boolean} 是否有效
     */
    validateMathFormula(formula) {
        try {
            // 检查括号匹配
            const brackets = { '{': '}', '(': ')', '[': ']' };
            const stack = [];
            
            for (let char of formula) {
                if (brackets[char]) {
                    stack.push(char);
                } else if (Object.values(brackets).includes(char)) {
                    const last = stack.pop();
                    if (!last || brackets[last] !== char) {
                        return false;
                    }
                }
            }
            
            // 检查上下标语法
            const subscriptSuperscriptRegex = /[_^][^{]/;
            if (subscriptSuperscriptRegex.test(formula)) {
                return false;
            }
            
            return stack.length === 0;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 获取处理统计信息
     * @returns {Object} 统计信息
     */
    getProcessingStats() {
        return {
            symbolMappings: Object.keys(this.mathSymbols).length,
            encodingFixes: Object.keys(this.encodingFixes).length,
            mathFunctions: this.mathFunctions.length,
            version: '2.1.0'
        };
    }
}

module.exports = MathFormulaHandler;