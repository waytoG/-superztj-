// 高级数学公式修复器 - 专门解决"Missing open brace for subscript"错误

class AdvancedMathFixer {
    constructor() {
        console.log('🔧 高级数学公式修复器已初始化');
        this.debugMode = true; // 开启调试模式
    }

    /**
     * 修复所有数学公式 - 主入口函数
     * @param {HTMLElement} element - 要修复的元素
     */
    fixAllMathFormulas(element) {
        if (!element) return;

        // 1. 处理文本节点中的数学公式
        this.processTextNodes(element);

        // 2. 处理已标记的数学元素
        this.processMathElements(element);

        // 3. 处理MathJax错误元素
        this.fixMathJaxErrors(element);

        if (this.debugMode) {
            console.log('🔧 数学公式修复完成');
        }
    }

    /**
     * 处理文本节点
     * @param {HTMLElement} element - 元素
     */
    processTextNodes(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const originalText = textNode.textContent;
            const fixedText = this.fixMathInText(originalText);
            
            if (fixedText !== originalText) {
                textNode.textContent = fixedText;
                if (this.debugMode) {
                    console.log('🔧 修复文本:', originalText, '->', fixedText);
                }
            }
        });
    }

    /**
     * 处理数学元素
     * @param {HTMLElement} element - 元素
     */
    processMathElements(element) {
        const mathSelectors = [
            '.math-formula',
            '.math-inline', 
            '.math-block',
            '[data-math]',
            '.MathJax',
            '.mjx-math'
        ];

        mathSelectors.forEach(selector => {
            const mathElements = element.querySelectorAll(selector);
            mathElements.forEach(mathEl => {
                const originalContent = mathEl.textContent || mathEl.innerHTML;
                const fixedContent = this.deepFixLatex(originalContent);
                
                if (fixedContent !== originalContent) {
                    if (mathEl.textContent) {
                        mathEl.textContent = fixedContent;
                    } else {
                        mathEl.innerHTML = fixedContent;
                    }
                    
                    if (this.debugMode) {
                        console.log('🔧 修复数学元素:', originalContent, '->', fixedContent);
                    }
                }
            });
        });
    }

    /**
     * 修复文本中的数学公式
     * @param {string} text - 文本
     * @returns {string} 修复后的文本
     */
    fixMathInText(text) {
        if (!text) return text;

        let fixed = text;

        // 修复各种数学公式格式
        const patterns = [
            { regex: /\$([^$]+)\$/g, wrapper: '$' },           // $...$
            { regex: /\$\$([^$]+)\$\$/g, wrapper: '$$' },      // $$...$$
            { regex: /\\\(([^)]+)\\\)/g, wrapper: '\\(' },     // \(...\)
            { regex: /\\\[([^\]]+)\\\]/g, wrapper: '\\[' }     // \[...\]
        ];

        patterns.forEach(pattern => {
            fixed = fixed.replace(pattern.regex, (match, formula) => {
                const fixedFormula = this.deepFixLatex(formula);
                
                if (pattern.wrapper === '$') {
                    return `$${fixedFormula}$`;
                } else if (pattern.wrapper === '$$') {
                    return `$$${fixedFormula}$$`;
                } else if (pattern.wrapper === '\\(') {
                    return `\\(${fixedFormula}\\)`;
                } else if (pattern.wrapper === '\\[') {
                    return `\\[${fixedFormula}\\]`;
                }
                return match;
            });
        });

        return fixed;
    }

    /**
     * 深度修复LaTeX语法
     * @param {string} latex - LaTeX代码
     * @returns {string} 修复后的LaTeX
     */
    deepFixLatex(latex) {
        if (!latex) return latex;

        let fixed = latex.trim();

        try {
            // 1. 预处理 - 清理常见问题
            fixed = this.preprocess(fixed);

            // 2. 修复上下标 - 这是主要问题
            fixed = this.fixSubscriptsAndSuperscripts(fixed);

            // 3. 修复分数
            fixed = this.fixFractions(fixed);

            // 4. 修复根号
            fixed = this.fixRoots(fixed);

            // 5. 修复括号匹配
            fixed = this.fixBrackets(fixed);

            // 6. 修复函数名
            fixed = this.fixFunctionNames(fixed);

            // 7. 后处理 - 最终清理
            fixed = this.postprocess(fixed);

            return fixed;

        } catch (error) {
            console.error('LaTeX修复失败:', error, '原始:', latex);
            return latex;
        }
    }

    /**
     * 预处理
     * @param {string} latex - LaTeX代码
     * @returns {string} 预处理后的代码
     */
    preprocess(latex) {
        let fixed = latex;

        // 移除多余的空格
        fixed = fixed.replace(/\s+/g, ' ').trim();

        // 修复常见的符号替换
        const symbolMap = {
            '×': '\\times',
            '÷': '\\div',
            '±': '\\pm',
            '∓': '\\mp',
            '≠': '\\neq',
            '≤': '\\leq',
            '≥': '\\geq',
            '∞': '\\infty',
            'π': '\\pi',
            'α': '\\alpha',
            'β': '\\beta',
            'γ': '\\gamma',
            'δ': '\\delta',
            'θ': '\\theta',
            'λ': '\\lambda',
            'μ': '\\mu',
            'σ': '\\sigma',
            'φ': '\\phi',
            'ω': '\\omega'
        };

        for (const [symbol, latex_cmd] of Object.entries(symbolMap)) {
            fixed = fixed.replace(new RegExp(symbol, 'g'), latex_cmd);
        }

        // 修复连续符号
        fixed = fixed.replace(/\*\*/g, '^');
        fixed = fixed.replace(/\^\^/g, '^');
        fixed = fixed.replace(/__/g, '_');

        return fixed;
    }

    /**
     * 修复上下标 - 核心修复函数
     * @param {string} latex - LaTeX代码
     * @returns {string} 修复后的代码
     */
    fixSubscriptsAndSuperscripts(latex) {
        let fixed = latex;

        // 第一轮：修复明显缺少大括号的情况
        // 单字符上下标
        fixed = fixed.replace(/([_^])([a-zA-Z0-9])(?![{])/g, '$1{$2}');
        
        // 多字符上下标（2个或更多字符）
        fixed = fixed.replace(/([_^])([a-zA-Z0-9]{2,})(?![}])/g, '$1{$2}');

        // 第二轮：修复复杂情况
        // 处理带括号的上下标
        fixed = fixed.replace(/([_^])\(([^)]+)\)/g, '$1{$2}');
        
        // 处理带方括号的上下标
        fixed = fixed.replace(/([_^])\[([^\]]+)\]/g, '$1{$2}');

        // 第三轮：修复嵌套和连续上下标
        // 连续的上下标：x^2_1 -> x^{2}_{1}
        fixed = fixed.replace(/([_^])([^{}\s]+)([_^])([^{}\s]+)/g, (match, op1, val1, op2, val2) => {
            return `${op1}{${val1}}${op2}{${val2}}`;
        });

        // 第四轮：修复特殊情况
        // 空的上下标
        fixed = fixed.replace(/([_^])\{\}/g, '');
        
        // 修复已经有部分大括号但不完整的情况
        fixed = fixed.replace(/([_^])\{([^}]*[_^][^}]*)\}/g, (match, op, content) => {
            const innerFixed = this.fixSubscriptsAndSuperscripts(content);
            return `${op}{${innerFixed}}`;
        });

        // 第五轮：验证和最终修复
        // 确保所有上下标都有大括号
        let iterations = 0;
        const maxIterations = 5;
        
        while (iterations < maxIterations) {
            const beforeFix = fixed;
            
            // 再次检查是否还有未修复的上下标
            fixed = fixed.replace(/([_^])([^{}\s\\][^{}\s]*?)(?=\s|$|[^a-zA-Z0-9])/g, '$1{$2}');
            
            if (beforeFix === fixed) {
                break; // 没有更多变化，退出循环
            }
            iterations++;
        }

        if (this.debugMode && iterations > 0) {
            console.log(`🔧 上下标修复完成，迭代次数: ${iterations}`);
        }

        return fixed;
    }

    /**
     * 修复分数
     * @param {string} latex - LaTeX代码
     * @returns {string} 修复后的代码
     */
    fixFractions(latex) {
        let fixed = latex;

        // 简单分数：a/b -> \frac{a}{b}
        fixed = fixed.replace(/([a-zA-Z0-9\(\)]+)\/([a-zA-Z0-9\(\)]+)/g, '\\frac{$1}{$2}');

        // 修复\frac后缺少大括号
        fixed = fixed.replace(/\\frac\s*([^{])/g, '\\frac{$1}');
        
        // 确保\frac有两个参数
        fixed = fixed.replace(/\\frac\{([^}]*)\}\s*([^{])/g, '\\frac{$1}{$2}');

        return fixed;
    }

    /**
     * 修复根号
     * @param {string} latex - LaTeX代码
     * @returns {string} 修复后的代码
     */
    fixRoots(latex) {
        let fixed = latex;

        // 修复\sqrt后使用圆括号
        fixed = fixed.replace(/\\sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
        
        // 修复\sqrt后缺少大括号
        fixed = fixed.replace(/\\sqrt\s*([^{])/g, '\\sqrt{$1}');

        return fixed;
    }

    /**
     * 修复括号匹配
     * @param {string} latex - LaTeX代码
     * @returns {string} 修复后的代码
     */
    fixBrackets(latex) {
        let fixed = latex;
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
                } else {
                    // 忽略多余的闭括号
                    if (this.debugMode) {
                        console.warn('🔧 忽略多余的闭括号');
                    }
                }
            } else {
                result += char;
            }
        }

        // 添加缺失的闭括号
        while (braceCount > 0) {
            result += '}';
            braceCount--;
            if (this.debugMode) {
                console.log('🔧 添加缺失的闭括号');
            }
        }

        return result;
    }

    /**
     * 修复函数名
     * @param {string} latex - LaTeX代码
     * @returns {string} 修复后的代码
     */
    fixFunctionNames(latex) {
        let fixed = latex;

        // 修复函数名后缺少空格或括号
        const functions = ['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'max', 'min', 'sup', 'inf'];
        
        functions.forEach(func => {
            const regex = new RegExp(`(\\\\${func})([a-zA-Z0-9])`, 'g');
            fixed = fixed.replace(regex, `$1 $2`);
        });

        return fixed;
    }

    /**
     * 后处理
     * @param {string} latex - LaTeX代码
     * @returns {string} 后处理后的代码
     */
    postprocess(latex) {
        let fixed = latex;

        // 清理多余的空格
        fixed = fixed.replace(/\s+/g, ' ').trim();
        
        // 修复空的命令
        fixed = fixed.replace(/\\[a-zA-Z]+\{\}/g, '');

        return fixed;
    }

    /**
     * 修复MathJax错误元素
     * @param {HTMLElement} element - 元素
     */
    fixMathJaxErrors(element) {
        const errorSelectors = [
            '.MathJax_Error',
            '.mjx-error',
            '[data-mjx-error]'
        ];

        errorSelectors.forEach(selector => {
            const errorElements = element.querySelectorAll(selector);
            errorElements.forEach(errorEl => {
                const errorText = errorEl.textContent || errorEl.title || '';
                
                if (errorText.includes('Missing open brace for subscript') || 
                    errorText.includes('Missing') || 
                    errorText.includes('brace')) {
                    
                    // 尝试找到相关的数学内容并修复
                    const mathContent = this.findRelatedMathContent(errorEl);
                    if (mathContent) {
                        const fixed = this.deepFixLatex(mathContent);
                        this.replaceMathContent(errorEl, fixed);
                        
                        if (this.debugMode) {
                            console.log('🔧 修复MathJax错误:', mathContent, '->', fixed);
                        }
                    }
                }
            });
        });
    }

    /**
     * 查找相关的数学内容
     * @param {HTMLElement} errorEl - 错误元素
     * @returns {string|null} 数学内容
     */
    findRelatedMathContent(errorEl) {
        // 尝试从多个位置获取数学内容
        const sources = [
            errorEl.getAttribute('data-original'),
            errorEl.getAttribute('title'),
            errorEl.textContent,
            errorEl.previousElementSibling?.textContent,
            errorEl.nextElementSibling?.textContent,
            errorEl.parentElement?.getAttribute('data-math')
        ];

        for (const source of sources) {
            if (source && source.trim()) {
                return source.trim();
            }
        }

        return null;
    }

    /**
     * 替换数学内容
     * @param {HTMLElement} errorEl - 错误元素
     * @param {string} fixedContent - 修复后的内容
     */
    replaceMathContent(errorEl, fixedContent) {
        // 创建新的数学元素
        const newEl = document.createElement('span');
        newEl.className = 'math-formula';
        newEl.textContent = `$${fixedContent}$`;
        
        // 替换错误元素
        errorEl.parentNode?.replaceChild(newEl, errorEl);
    }

    /**
     * 验证LaTeX语法
     * @param {string} latex - LaTeX代码
     * @returns {boolean} 是否有效
     */
    validateLatex(latex) {
        try {
            // 检查括号匹配
            const brackets = { '{': '}', '(': ')', '[': ']' };
            const stack = [];

            for (let char of latex) {
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
            if (subscriptSuperscriptRegex.test(latex)) {
                return false;
            }

            return stack.length === 0;

        } catch (error) {
            return false;
        }
    }
}

// 创建全局实例
window.advancedMathFixer = new AdvancedMathFixer();