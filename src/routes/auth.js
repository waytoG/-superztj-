const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('../database/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名、邮箱和密码都是必填项'
            });
        }

        // 检查用户是否已存在
        const existingUser = await Database.get(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名或邮箱已存在'
            });
        }

        // 加密密码
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 创建用户
        const result = await Database.insert(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        // 生成JWT令牌
        const token = jwt.sign(
            { userId: result.id, username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                token,
                user: {
                    id: result.id,
                    username,
                    email,
                    level: 1,
                    experience: 0
                }
            }
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '注册失败，请稍后重试'
        });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 验证输入
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: '邮箱和密码都是必填项'
            });
        }

        // 查找用户
        const user = await Database.get(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 生成JWT令牌
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 更新最后登录时间
        await Database.update(
            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        res.json({
            success: true,
            message: '登录成功',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    level: user.level,
                    experience: user.experience,
                    avatar: user.avatar,
                    studyGoal: user.study_goal,
                    dailyTarget: user.daily_target
                }
            }
        });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后重试'
        });
    }
});

// 获取用户信息
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await Database.get(
            'SELECT id, username, email, level, experience, avatar, study_goal, daily_target, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                level: user.level,
                experience: user.experience,
                avatar: user.avatar,
                studyGoal: user.study_goal,
                dailyTarget: user.daily_target,
                joinDate: user.created_at
            }
        });

    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败'
        });
    }
});

// 更新用户信息
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, studyGoal, dailyTarget } = req.body;
        const userId = req.user.userId;

        // 检查用户名和邮箱是否被其他用户使用
        if (username || email) {
            const existingUser = await Database.get(
                'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
                [username || '', email || '', userId]
            );

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: '用户名或邮箱已被使用'
                });
            }
        }

        // 构建更新SQL
        const updates = [];
        const params = [];

        if (username) {
            updates.push('username = ?');
            params.push(username);
        }
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (studyGoal) {
            updates.push('study_goal = ?');
            params.push(studyGoal);
        }
        if (dailyTarget) {
            updates.push('daily_target = ?');
            params.push(dailyTarget);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有要更新的字段'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);

        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await Database.update(sql, params);

        res.json({
            success: true,
            message: '用户信息更新成功'
        });

    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '更新用户信息失败'
        });
    }
});

// 修改密码
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '当前密码和新密码都是必填项'
            });
        }

        // 获取用户当前密码
        const user = await Database.get(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 验证当前密码
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '当前密码错误'
            });
        }

        // 加密新密码
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // 更新密码
        await Database.update(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPasswordHash, userId]
        );

        res.json({
            success: true,
            message: '密码修改成功'
        });

    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({
            success: false,
            message: '修改密码失败'
        });
    }
});

// JWT认证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: '访问令牌缺失'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: '访问令牌无效'
            });
        }
        req.user = user;
        next();
    });
}

module.exports = router;