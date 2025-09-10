// 数学公式修复器 - 专门解决LaTeX语法错误

class MathFixer {
    constructor() {
        console.log('🔧 数学公式修复器已初始化');
    }

    /**
     * 修复文本中的所有数学公式
     * @param {string} text - 包含数学公式的文本
     * @returns {string} 修复后的文本
     */
    fixAllMathInText(text) {
        if (!text) return text;

        // 修复$...$格式的行内公式
        text = text.replace(/\$([^$]+)\$/g, (match, formula) => {
            const fixed = this.fixLatexFormula(formula);
            return `$${fixed}$`;
        });

        // 修复$$...$$格式的块级公式
        text = text.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
            const fixed = this.fixLatexFormula(formula);
            return `$$${fixed}$$`;
        });

        // 修复\\(...\\)格式的行内公式
        text = text.replace(/\\\(([^)]+)\\\)/g, (match, formula) => {
            const fixed = this.fixLatexFormula(formula);
            return `\\(${fixed}\\)`;
        });

        // 修复\\[...\\]格式的块级公式
        text = text.replace(/\\\[([^\]]+)\\\]/g, (match, formula) => {
            const fixed = this.fixLatexFormula(formula);
            return `\\[${fixed}\\]`;
        });

        return text;
    }

    /**
     * 修复LaTeX公式语法
     * @param {string} formula - 原始公式
     * @returns {string} 修复后的公式
     */
    fixLatexFormula(formula) {
        let fixed = formula.trim();

        try {
            // 1. 修复上下标缺少大括号的问题（这是主要问题）
            fixed = this.fixSubscriptSuperscript(fixed);

            // 2. 修复分数格式
            fixed = this.fixFractions(fixed);

            // 3. 修复根号格式
            fixed = this.fixSquareRoots(fixed);

            // 4. 修复括号匹配
            fixed = this.fixBrackets(fixed);

            // 5. 修复常见符号
            fixed = this.fixCommonSymbols(fixed);

            // 6. 清理多余空格
            fixed = fixed.replace(/\s+/g, ' ').trim();

            return fixed;

        } catch (error) {
            console.error('公式修复失败:', error, '原始公式:', formula);
            return formula; // 返回原始公式
        }
    }

    /**
     * 修复上下标语法 - 解决"Missing open brace for subscript"错误
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

        // 修复嵌套的上下标
        fixed = fixed.replace(/([_^])\{([^{}]*([_^])[^{}]*)\}/g, (match, op, content) => {
            const innerFixed = this.fixSubscriptSuperscript(content);
            return `${op}{${innerFixed}}`;
        });

        return fixed;
    }

    /**
     * 修复分数格式
     * @param {string} formula - 公式
     * @returns {string} 修复后的公式
     */
    fixFractions(formula) {
        let fixed = formula;

        // 简单分数：a/b -> \frac{a}{b}
        fixed = fixed.replace(/([a-zA-Z0-9\(\)]+)\/([a-zA-Z0-9\(\)]+)/g, '\\frac{$1}{$2}');

        // 修复\frac后缺少大括号的情况
        fixed = fixed.replace(/\\frac\s*([^{])/g, '\\frac{$1}');

        return fixed;
    }

    /**
     * 修复根号格式
     * @param {string} formula - 公式
     * @returns {string} 修复后的公式
     */
    fixSquareRoots(formula) {
        let fixed = formula;

        // 修复\sqrt后使用圆括号的情况
        fixed = fixed.replace(/\\sqrt\(([^)]+)\)/g, '\\sqrt{$1}');

        // 修复\sqrt后缺少大括号的情况
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

        // 计算并修复大括号
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
                    console.warn('忽略多余的闭括号');
                }
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
     * 修复常见符号
     * @param {string} formula - 公式
     * @returns {string} 修复后的公式
     */
    fixCommonSymbols(formula) {
        let fixed = formula;

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

        for (const [symbol, latex] of Object.entries(symbolMap)) {
            fixed = fixed.replace(new RegExp(symbol, 'g'), latex);
        }

        // 修复连续的符号
        fixed = fixed.replace(/\*\*/g, '^');
        fixed = fixed.replace(/\^\^/g, '^');
        fixed = fixed.replace(/__/g, '_');

        return fixed;
    }

    /**
     * 验证LaTeX语法
     * @param {string} formula - 公式
     * @returns {boolean} 是否有效
     */
    validateLatex(formula) {
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

            return stack.length === 0;

        } catch (error) {
            return false;
        }
    }

    /**
     * 为HTML元素修复数学公式
     * @param {HTMLElement} element - HTML元素
     */
    fixMathInElement(element) {
        if (!element) return;

        // 处理文本节点
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
            const fixedText = this.fixAllMathInText(originalText);
            
            if (fixedText !== originalText) {
                textNode.textContent = fixedText;
            }
        });

        // 处理已标记的数学公式元素
        const mathElements = element.querySelectorAll('.math-formula, .math-inline, .math-block');
        mathElements.forEach(mathEl => {
            const originalContent = mathEl.textContent;
            const fixedContent = this.fixLatexFormula(originalContent);
            
            if (fixedContent !== originalContent) {
                mathEl.textContent = fixedContent;
            }
        });
    }
}

// 创建全局实例
window.mathFixer = new MathFixer();