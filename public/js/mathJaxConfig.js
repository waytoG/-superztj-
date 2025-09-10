// MathJax 配置 - 专门处理修复后的数学公式

// 配置MathJax以更好地处理修复后的LaTeX
window.MathJax = {
    tex: {
        // 内联数学分隔符
        inlineMath: [
            ['$', '$'],
            ['\\(', '\\)']
        ],
        // 显示数学分隔符
        displayMath: [
            ['$$', '$$'],
            ['\\[', '\\]']
        ],
        // 处理转义字符
        processEscapes: true,
        // 处理环境
        processEnvironments: true,
        // 处理引用
        processRefs: true,
        // 允许的HTML标签
        tags: 'ams',
        // 自动编号
        autoload: {
            color: [],
            colorV2: ['color']
        },
        // 包配置
        packages: {
            '[+]': ['noerrors', 'noundefined']
        },
        // 错误处理
        formatError: function (jax, err) {
            console.error('MathJax错误:', err);
            // 尝试修复常见错误
            if (err.message.includes('Missing open brace for subscript')) {
                const math = jax.math;
                if (math && math.inputJax && math.inputJax.originalText) {
                    let fixed = math.inputJax.originalText;
                    // 应用修复
                    fixed = fixed.replace(/([_^])([a-zA-Z0-9])(?![{])/g, '$1{$2}');
                    fixed = fixed.replace(/([_^])([a-zA-Z0-9]{2,})(?![}])/g, '$1{$2}');
                    
                    console.log('尝试修复数学公式:', math.inputJax.originalText, '->', fixed);
                    
                    // 重新编译
                    try {
                        return MathJax.tex2chtml(fixed);
                    } catch (e) {
                        console.error('修复失败:', e);
                    }
                }
            }
            return jax.formatError(err);
        }
    },
    // 输出配置
    chtml: {
        // 字体设置
        fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2',
        // 适应容器
        adaptiveCSS: true,
        // 缩放
        scale: 1,
        // 最小缩放
        minScale: 0.5,
        // 匹配字体高度
        matchFontHeight: true,
        // 显示菜单
        displayAlign: 'center',
        displayIndent: '0'
    },
    // SVG输出配置（备用）
    svg: {
        fontCache: 'local',
        scale: 1,
        minScale: 0.5,
        matchFontHeight: true
    },
    // 启动配置
    startup: {
        // 就绪回调
        ready: function () {
            console.log('✅ MathJax已就绪，支持增强的数学公式修复');
            
            // 扩展MathJax以支持自动修复
            const originalTypeset = MathJax.typesetPromise;
            MathJax.typesetPromise = function(elements) {
                // 在渲染前进行修复
                if (elements) {
                    elements.forEach(element => {
                        if (window.advancedMathFixer) {
                            window.advancedMathFixer.fixAllMathFormulas(element);
                        }
                    });
                }
                
                return originalTypeset.call(this, elements).catch(err => {
                    console.error('MathJax渲染错误:', err);
                    
                    // 尝试修复并重新渲染
                    if (elements && window.advancedMathFixer) {
                        elements.forEach(element => {
                            window.advancedMathFixer.fixMathJaxErrors(element);
                        });
                        
                        // 重新尝试渲染
                        return originalTypeset.call(this, elements);
                    }
                    
                    throw err;
                });
            };
            
            MathJax.startup.defaultReady();
        },
        
        // 页面就绪回调
        pageReady: function () {
            console.log('📐 MathJax页面渲染就绪');
            return MathJax.startup.defaultPageReady();
        }
    },
    
    // 选项配置
    options: {
        // 忽略HTML类
        ignoreHtmlClass: 'tex2jax_ignore',
        // 处理HTML类
        processHtmlClass: 'tex2jax_process|math-formula|math-inline|math-block',
        // 渲染动作
        renderActions: {
            // 添加自定义渲染动作
            fixMath: [150, function (doc) {
                // 在渲染过程中修复数学公式
                const mathElements = doc.querySelectorAll('.MathJax, [data-mathml], [data-tex]');
                mathElements.forEach(element => {
                    if (window.advancedMathFixer) {
                        window.advancedMathFixer.fixAllMathFormulas(element);
                    }
                });
            }, function (math, doc) {
                // 单个数学元素的修复
                if (window.advancedMathFixer) {
                    window.advancedMathFixer.fixAllMathFormulas(math.start.node.parentElement);
                }
            }]
        }
    },
    
    // 加载器配置
    loader: {
        // 加载路径
        paths: {
            mathjax: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5'
        },
        // 源配置
        source: {},
        // 依赖关系
        dependencies: {},
        // 提供的组件
        provides: {},
        // 加载钩子
        load: ['input/tex', 'output/chtml', 'ui/menu', '[tex]/noerrors', '[tex]/noundefined']
    }
};

// 添加全局错误处理
window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('MathJax')) {
        console.error('MathJax全局错误:', event.error);
        
        // 尝试重新初始化MathJax
        if (window.MathJax && window.MathJax.typesetPromise) {
            setTimeout(() => {
                console.log('🔄 尝试重新渲染数学公式...');
                const mathElements = document.querySelectorAll('.math-formula, .MathJax, [data-math]');
                if (mathElements.length > 0) {
                    window.MathJax.typesetPromise([document.body]).catch(err => {
                        console.error('重新渲染失败:', err);
                    });
                }
            }, 1000);
        }
    }
});

// 添加DOM变化监听，自动处理新添加的数学公式
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
        let hasNewMath = false;
        
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查是否包含数学公式
                        if (node.textContent && (
                            node.textContent.includes('$') || 
                            node.textContent.includes('\\(') || 
                            node.textContent.includes('\\[') ||
                            node.classList.contains('math-formula')
                        )) {
                            hasNewMath = true;
                        }
                    }
                });
            }
        });
        
        if (hasNewMath && window.MathJax && window.MathJax.typesetPromise) {
            // 延迟处理，避免频繁渲染
            clearTimeout(window.mathRenderTimeout);
            window.mathRenderTimeout = setTimeout(() => {
                console.log('🔄 检测到新的数学公式，自动渲染...');
                
                // 先修复，再渲染
                if (window.advancedMathFixer) {
                    window.advancedMathFixer.fixAllMathFormulas(document.body);
                }
                
                window.MathJax.typesetPromise([document.body]).catch(err => {
                    console.error('自动渲染失败:', err);
                });
            }, 500);
        }
    });
    
    // 开始观察
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

console.log('📐 MathJax配置已加载，支持高级数学公式修复');