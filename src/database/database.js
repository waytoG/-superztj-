const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../../data/study_helper.db');
    }

    // 初始化数据库
    init() {
        // 确保数据目录存在
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('数据库连接失败:', err.message);
            } else {
                console.log('✅ 数据库连接成功');
                this.createTables();
            }
        });
    }

    // 创建数据表
    createTables() {
        const tables = [
            // 用户表
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                avatar TEXT,
                level INTEGER DEFAULT 1,
                experience INTEGER DEFAULT 0,
                study_goal TEXT,
                daily_target INTEGER DEFAULT 60,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // 学习材料表
            `CREATE TABLE IF NOT EXISTS materials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                processed BOOLEAN DEFAULT FALSE,
                content_text TEXT,
                keywords TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // 题目表
            `CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                material_id INTEGER NOT NULL,
                question_type TEXT NOT NULL,
                question_text TEXT NOT NULL,
                options TEXT,
                correct_answer TEXT NOT NULL,
                explanation TEXT,
                difficulty INTEGER DEFAULT 1,
                knowledge_points TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (material_id) REFERENCES materials (id)
            )`,

            // 练习记录表
            `CREATE TABLE IF NOT EXISTS quiz_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                quiz_type TEXT NOT NULL,
                material_id INTEGER,
                total_questions INTEGER NOT NULL,
                correct_answers INTEGER NOT NULL,
                score INTEGER NOT NULL,
                time_spent INTEGER NOT NULL,
                started_at DATETIME NOT NULL,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (material_id) REFERENCES materials (id)
            )`,

            // 答题记录表
            `CREATE TABLE IF NOT EXISTS answer_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                user_answer TEXT,
                is_correct BOOLEAN NOT NULL,
                time_spent INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES quiz_sessions (id),
                FOREIGN KEY (question_id) REFERENCES questions (id)
            )`,

            // 错题本表
            `CREATE TABLE IF NOT EXISTS wrong_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                wrong_count INTEGER DEFAULT 1,
                last_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                mastered BOOLEAN DEFAULT FALSE,
                mastered_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (question_id) REFERENCES questions (id),
                UNIQUE(user_id, question_id)
            )`,

            // 学习统计表
            `CREATE TABLE IF NOT EXISTS study_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                study_time INTEGER DEFAULT 0,
                questions_answered INTEGER DEFAULT 0,
                correct_answers INTEGER DEFAULT 0,
                materials_studied INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, date)
            )`
        ];

        tables.forEach((sql, index) => {
            this.db.run(sql, (err) => {
                if (err) {
                    console.error(`创建表 ${index + 1} 失败:`, err.message);
                } else {
                    console.log(`✅ 表 ${index + 1} 创建成功`);
                }
            });
        });

        // 插入示例数据
        this.insertSampleData();
    }

    // 插入示例数据（仅创建默认用户，不插入示例材料）
    insertSampleData() {
        // 检查是否已有用户数据
        this.db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) {
                console.error('检查用户数据失败:', err.message);
                return;
            }

            if (row.count === 0) {
                // 插入默认用户（用于本地测试）
                const insertUser = `INSERT INTO users (username, email, password_hash, level, experience) 
                                   VALUES (?, ?, ?, ?, ?)`;
                
                this.db.run(insertUser, ['本地用户', 'local@demo.com', 'demo_password', 1, 0], function(err) {
                    if (err) {
                        console.error('插入默认用户失败:', err.message);
                    } else {
                        console.log('✅ 默认用户创建成功 (ID: 1)');
                        console.log('📝 数据库初始化完成，可以开始上传材料');
                    }
                });
            } else {
                console.log('✅ 用户数据已存在，跳过初始化');
            }
        });
    }

    // 获取数据库实例
    getDB() {
        return this.db;
    }

    // 关闭数据库连接
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('关闭数据库失败:', err.message);
                } else {
                    console.log('数据库连接已关闭');
                }
            });
        }
    }

    // 通用查询方法
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

    // 通用插入方法
    insert(sql, params = []) {
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

    // 通用更新方法
    update(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // 通用删除方法
    delete(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // 获取单条记录
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
}

// 创建单例实例
const database = new Database();

module.exports = database;