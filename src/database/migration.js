// 数据库迁移脚本 - 添加大文件处理支持
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseMigration {
    constructor() {
        this.dbPath = path.join(__dirname, '../../data/study_helper.db');
        this.db = null;
    }

    /**
     * 连接数据库
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ 数据库连接成功');
                    resolve();
                }
            });
        });
    }

    /**
     * 关闭数据库连接
     */
    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('关闭数据库失败:', err.message);
                    } else {
                        console.log('数据库连接已关闭');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * 执行SQL语句
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * 查询数据
     */
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * 检查列是否存在
     */
    async columnExists(tableName, columnName) {
        try {
            const result = await this.query(`PRAGMA table_info(${tableName})`);
            return result.some(column => column.name === columnName);
        } catch (error) {
            console.error(`检查列 ${tableName}.${columnName} 失败:`, error);
            return false;
        }
    }

    /**
     * 检查表是否存在
     */
    async tableExists(tableName) {
        try {
            const result = await this.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                [tableName]
            );
            return result.length > 0;
        } catch (error) {
            console.error(`检查表 ${tableName} 失败:`, error);
            return false;
        }
    }

    /**
     * 执行完整迁移
     */
    async migrate() {
        try {
            await this.connect();
            console.log('🚀 开始数据库迁移...');

            // 迁移1: 为materials表添加大文件处理字段
            await this.migrateMaterialsTable();

            // 迁移2: 创建material_content表
            await this.createMaterialContentTable();

            // 迁移3: 更新questions表结构
            await this.migrateQuestionsTable();

            // 迁移4: 创建processing_tasks表
            await this.createProcessingTasksTable();

            // 迁移5: 创建knowledge_graph表
            await this.createKnowledgeGraphTable();

            console.log('✅ 数据库迁移完成');
        } catch (error) {
            console.error('❌ 数据库迁移失败:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * 迁移materials表
     */
    async migrateMaterialsTable() {
        console.log('📋 迁移materials表...');

        const newColumns = [
            { name: 'requires_chunking', type: 'BOOLEAN DEFAULT 0' },
            { name: 'chunk_size', type: 'INTEGER DEFAULT 1000' },
            { name: 'processing_status', type: 'TEXT DEFAULT "pending"' },
            { name: 'task_id', type: 'TEXT' },
            { name: 'analysis_data', type: 'TEXT' },
            { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
        ];

        for (const column of newColumns) {
            const exists = await this.columnExists('materials', column.name);
            if (!exists) {
                try {
                    await this.run(`ALTER TABLE materials ADD COLUMN ${column.name} ${column.type}`);
                    console.log(`✅ 添加列 materials.${column.name}`);
                } catch (error) {
                    console.error(`❌ 添加列 materials.${column.name} 失败:`, error.message);
                }
            } else {
                console.log(`⏭️ 列 materials.${column.name} 已存在`);
            }
        }

        // 创建索引
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_materials_task_id ON materials(task_id)',
            'CREATE INDEX IF NOT EXISTS idx_materials_processing_status ON materials(processing_status)',
            'CREATE INDEX IF NOT EXISTS idx_materials_user_created ON materials(user_id, created_at DESC)'
        ];

        for (const indexSql of indexes) {
            try {
                await this.run(indexSql);
                console.log('✅ 创建索引成功');
            } catch (error) {
                console.error('❌ 创建索引失败:', error.message);
            }
        }
    }

    /**
     * 创建material_content表
     */
    async createMaterialContentTable() {
        console.log('📋 创建material_content表...');

        const exists = await this.tableExists('material_content');
        if (!exists) {
            const sql = `
                CREATE TABLE material_content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    material_id INTEGER NOT NULL,
                    content_preview TEXT,
                    chunk_count INTEGER DEFAULT 0,
                    key_terms TEXT,
                    processed_data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE CASCADE
                )
            `;

            try {
                await this.run(sql);
                console.log('✅ material_content表创建成功');

                // 创建索引
                await this.run('CREATE INDEX IF NOT EXISTS idx_material_content_material_id ON material_content(material_id)');
                console.log('✅ material_content索引创建成功');
            } catch (error) {
                console.error('❌ 创建material_content表失败:', error.message);
            }
        } else {
            console.log('⏭️ material_content表已存在');
        }
    }

    /**
     * 迁移questions表
     */
    async migrateQuestionsTable() {
        console.log('📋 迁移questions表...');

        const newColumns = [
            { name: 'question_id', type: 'TEXT' },
            { name: 'source', type: 'TEXT DEFAULT "basic"' },
            { name: 'enhanced', type: 'BOOLEAN DEFAULT 0' },
            { name: 'related_concepts', type: 'TEXT' },
            { name: 'sample_answer', type: 'TEXT' },
            { name: 'key_points', type: 'TEXT' },
            { name: 'scoring_criteria', type: 'TEXT' },
            { name: 'acceptable_answers', type: 'TEXT' },
            { name: 'quality_score', type: 'REAL DEFAULT 0' }
        ];

        for (const column of newColumns) {
            const exists = await this.columnExists('questions', column.name);
            if (!exists) {
                try {
                    await this.run(`ALTER TABLE questions ADD COLUMN ${column.name} ${column.type}`);
                    console.log(`✅ 添加列 questions.${column.name}`);
                } catch (error) {
                    console.error(`❌ 添加列 questions.${column.name} 失败:`, error.message);
                }
            } else {
                console.log(`⏭️ 列 questions.${column.name} 已存在`);
            }
        }

        // 创建索引
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_questions_question_id ON questions(question_id)',
            'CREATE INDEX IF NOT EXISTS idx_questions_source ON questions(source)',
            'CREATE INDEX IF NOT EXISTS idx_questions_quality_score ON questions(quality_score DESC)'
        ];

        for (const indexSql of indexes) {
            try {
                await this.run(indexSql);
                console.log('✅ 创建questions索引成功');
            } catch (error) {
                console.error('❌ 创建questions索引失败:', error.message);
            }
        }
    }

    /**
     * 创建processing_tasks表
     */
    async createProcessingTasksTable() {
        console.log('📋 创建processing_tasks表...');

        const exists = await this.tableExists('processing_tasks');
        if (!exists) {
            const sql = `
                CREATE TABLE processing_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT UNIQUE NOT NULL,
                    material_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    progress INTEGER DEFAULT 0,
                    stage TEXT DEFAULT 'queued',
                    error_message TEXT,
                    result_data TEXT,
                    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    completed_at DATETIME,
                    processing_time INTEGER DEFAULT 0,
                    FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE CASCADE
                )
            `;

            try {
                await this.run(sql);
                console.log('✅ processing_tasks表创建成功');

                // 创建索引
                const indexes = [
                    'CREATE INDEX IF NOT EXISTS idx_processing_tasks_task_id ON processing_tasks(task_id)',
                    'CREATE INDEX IF NOT EXISTS idx_processing_tasks_status ON processing_tasks(status)',
                    'CREATE INDEX IF NOT EXISTS idx_processing_tasks_material_id ON processing_tasks(material_id)'
                ];

                for (const indexSql of indexes) {
                    await this.run(indexSql);
                }
                console.log('✅ processing_tasks索引创建成功');
            } catch (error) {
                console.error('❌ 创建processing_tasks表失败:', error.message);
            }
        } else {
            console.log('⏭️ processing_tasks表已存在');
        }
    }

    /**
     * 创建knowledge_graph表
     */
    async createKnowledgeGraphTable() {
        console.log('📋 创建knowledge_graph表...');

        const exists = await this.tableExists('knowledge_graph');
        if (!exists) {
            const sql = `
                CREATE TABLE knowledge_graph (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    material_id INTEGER NOT NULL,
                    node_id TEXT NOT NULL,
                    node_type TEXT DEFAULT 'concept',
                    node_data TEXT,
                    importance REAL DEFAULT 0,
                    frequency INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE CASCADE,
                    UNIQUE(material_id, node_id)
                )
            `;

            try {
                await this.run(sql);
                console.log('✅ knowledge_graph表创建成功');

                // 创建关系表
                const relationSql = `
                    CREATE TABLE knowledge_graph_edges (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        material_id INTEGER NOT NULL,
                        source_node TEXT NOT NULL,
                        target_node TEXT NOT NULL,
                        edge_type TEXT DEFAULT 'related',
                        weight REAL DEFAULT 1.0,
                        chunk_index INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE CASCADE
                    )
                `;

                await this.run(relationSql);
                console.log('✅ knowledge_graph_edges表创建成功');

                // 创建索引
                const indexes = [
                    'CREATE INDEX IF NOT EXISTS idx_knowledge_graph_material_id ON knowledge_graph(material_id)',
                    'CREATE INDEX IF NOT EXISTS idx_knowledge_graph_node_id ON knowledge_graph(node_id)',
                    'CREATE INDEX IF NOT EXISTS idx_knowledge_graph_importance ON knowledge_graph(importance DESC)',
                    'CREATE INDEX IF NOT EXISTS idx_knowledge_graph_edges_material_id ON knowledge_graph_edges(material_id)',
                    'CREATE INDEX IF NOT EXISTS idx_knowledge_graph_edges_source ON knowledge_graph_edges(source_node)',
                    'CREATE INDEX IF NOT EXISTS idx_knowledge_graph_edges_target ON knowledge_graph_edges(target_node)'
                ];

                for (const indexSql of indexes) {
                    await this.run(indexSql);
                }
                console.log('✅ knowledge_graph索引创建成功');
            } catch (error) {
                console.error('❌ 创建knowledge_graph表失败:', error.message);
            }
        } else {
            console.log('⏭️ knowledge_graph表已存在');
        }
    }

    /**
     * 回滚迁移（用于测试）
     */
    async rollback() {
        try {
            await this.connect();
            console.log('🔄 开始回滚迁移...');

            // 删除新创建的表
            const tablesToDrop = [
                'knowledge_graph_edges',
                'knowledge_graph',
                'processing_tasks',
                'material_content'
            ];

            for (const table of tablesToDrop) {
                try {
                    await this.run(`DROP TABLE IF EXISTS ${table}`);
                    console.log(`✅ 删除表 ${table}`);
                } catch (error) {
                    console.error(`❌ 删除表 ${table} 失败:`, error.message);
                }
            }

            console.log('✅ 迁移回滚完成');
        } catch (error) {
            console.error('❌ 迁移回滚失败:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * 检查迁移状态
     */
    async checkMigrationStatus() {
        try {
            await this.connect();
            console.log('🔍 检查迁移状态...');

            const tables = ['material_content', 'processing_tasks', 'knowledge_graph', 'knowledge_graph_edges'];
            const columns = [
                { table: 'materials', column: 'requires_chunking' },
                { table: 'materials', column: 'processing_status' },
                { table: 'materials', column: 'task_id' },
                { table: 'questions', column: 'source' },
                { table: 'questions', column: 'enhanced' }
            ];

            console.log('\n📋 表状态:');
            for (const table of tables) {
                const exists = await this.tableExists(table);
                console.log(`  ${table}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
            }

            console.log('\n📋 列状态:');
            for (const { table, column } of columns) {
                const exists = await this.columnExists(table, column);
                console.log(`  ${table}.${column}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
            }

            console.log('\n✅ 迁移状态检查完成');
        } catch (error) {
            console.error('❌ 检查迁移状态失败:', error);
            throw error;
        } finally {
            await this.close();
        }
    }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
    const migration = new DatabaseMigration();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'migrate':
            migration.migrate().catch(console.error);
            break;
        case 'rollback':
            migration.rollback().catch(console.error);
            break;
        case 'status':
            migration.checkMigrationStatus().catch(console.error);
            break;
        default:
            console.log('用法:');
            console.log('  node migration.js migrate   - 执行迁移');
            console.log('  node migration.js rollback  - 回滚迁移');
            console.log('  node migration.js status    - 检查状态');
    }
}

module.exports = DatabaseMigration;