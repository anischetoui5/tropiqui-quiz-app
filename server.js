// Require packages
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const port = process.env.PORT || 3000; // ← CHANGE THIS LINE
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Socket.IO setup
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Add CORS for mobile app ← ADD THESE LINES
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static('public'));
app.use(express.static(__dirname));

// Database connection with retry logic - REPLACE LINES 36-45
let db;
let isDatabaseConnected = false;

function connectToDatabase() {
    db = mysql.createConnection(process.env.MYSQL_URL || {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'quiz_app'
    });

    db.connect((err) => {
        if (err) {
            console.error('❌ Database connection failed, retrying in 5 seconds:', err.message);
            // Don't crash - just retry later
            setTimeout(connectToDatabase, 5000);
            isDatabaseConnected = false;
        } else {
            console.log('✅ Connected to MySQL database!');
            isDatabaseConnected = true;
        }
    });

    db.on('error', (err) => {
        console.error('Database error, reconnecting...:', err);
        isDatabaseConnected = false;
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            connectToDatabase();
        }
    });
}

// Start the database connection
connectToDatabase();

// Add database check middleware
app.use((req, res, next) => {
    if (!isDatabaseConnected && !req.path.startsWith('/test-connection')) {
        return res.status(503).json({ error: 'Database temporarily unavailable, retrying...' });
    }
    next();
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);
    
    socket.on('join-user-room', (userId) => {
        socket.join(userId.toString());
        console.log(`👤 User ${userId} joined their notification room`);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
    });
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token' });
    }
}

// Static routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/profile', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/quiz/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'quiz.html'));
});

// Auth routes
app.get('/auth/status', (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.json({ authenticated: false });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        res.json({ authenticated: true, user: verified });
    } catch (error) {
        res.json({ authenticated: false });
    }
});

app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Email already exists.' });
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ error: 'Error creating account' });
            }

            db.query(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, hashedPassword],
                (err, result) => {
                    if (err) {
                        console.error('Signup error:', err);
                        return res.status(500).json({ error: 'Error creating account' });
                    }

                    const token = jwt.sign(
                        { 
                            user_id: result.insertId, 
                            name: name,
                            email: email 
                        },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    res.cookie('token', token, {
                        httpOnly: true,
                        secure: false,
                        maxAge: 24 * 60 * 60 * 1000
                    });

                    res.json({ 
                        message: 'Account created successfully!',
                        user: {
                            user_id: result.insertId,
                            name: name,
                            email: email
                        }
                    });
                }
            );
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Server error during login' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Email not found' });
        }

        const user = results[0];
        
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                return res.status(500).json({ error: 'Server error during login' });
            }

            if (!match) {
                return res.status(400).json({ error: 'Incorrect password' });
            }

            const token = jwt.sign(
                { 
                    user_id: user.user_id, 
                    name: user.name,
                    email: user.email 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
                maxAge: 24 * 60 * 60 * 1000
            });

            res.json({ 
                message: `Welcome back, ${user.name}!`, 
                user: { 
                    user_id: user.user_id, 
                    name: user.name,
                    email: user.email
                } 
            });
        });
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// User routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.query('SELECT user_id, name, email, profile_picture FROM users WHERE user_id = ?', 
        [req.user.user_id], 
        (err, results) => {
            if (err) {
                console.error('Error fetching user profile:', err);
                return res.status(500).json({ error: 'Error fetching profile' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json(results[0]);
        }
    );
});

app.post('/api/users/profile-picture', authenticateToken, (req, res) => {
    const { profile_picture } = req.body;
    const user_id = req.user.user_id;

    if (!profile_picture) {
        return res.status(400).json({ error: 'No image data provided' });
    }

    db.query(
        'UPDATE users SET profile_picture = ? WHERE user_id = ?',
        [profile_picture, user_id],
        (err, result) => {
            if (err) {
                console.error('Error updating profile picture:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({ 
                success: true, 
                message: 'Profile picture updated successfully' 
            });
        }
    );
});

app.delete('/api/users/profile-picture/:userId', authenticateToken, (req, res) => {
    const userId = req.params.userId;
    
    if (req.user.user_id != userId) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    db.query(
        'UPDATE users SET profile_picture = NULL WHERE user_id = ?',
        [userId],
        (err, result) => {
            if (err) {
                console.error('Error deleting profile picture:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({ 
                success: true, 
                message: 'Profile picture deleted successfully' 
            });
        }
    );
});

// Quiz routes
app.get('/api/my-quizzes', authenticateToken, (req, res) => {
    const sql = `
        SELECT quiz_id, title, description, created_at, category, is_public, image_data, quiz_code
        FROM quizzes 
        WHERE created_by = ? 
        ORDER BY created_at DESC;
    `;
    
    db.query(sql, [req.user.user_id], (err, results) => {
        if (err) {
            console.error('Error fetching quizzes:', err);
            return res.status(500).json({ error: 'Error fetching quizzes' });
        }
        res.json(results);
    });
});

app.get('/api/public-quizzes', (req, res) => {
    const sql = `
        SELECT q.quiz_id, q.title, q.category, q.description, q.is_public, q.image_data, 
               u.name as creator_name, q.created_at 
        FROM quizzes q 
        JOIN users u ON q.created_by = u.user_id 
        WHERE q.is_public = true 
        ORDER BY q.created_at DESC 
        LIMIT 20
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching public quizzes:', err);
            return res.status(500).json({ error: 'Error fetching quizzes' });
        }
        res.json(results);
    });
});

app.get('/api/quizzes/:id', authenticateToken, (req, res) => {
    const quizId = req.params.id;
    
    db.query('SELECT * FROM quizzes WHERE quiz_id = ?', [quizId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        
        res.json(results[0]);
    });
});

app.get('/api/quizzes/:id/questions', authenticateToken, (req, res) => {
    const quizId = req.params.id;
    
    db.query('SELECT * FROM questions WHERE quiz_id = ?', [quizId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});


app.post('/api/questions', authenticateToken, (req, res) => {
    const { quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points } = req.body;

    db.query('SELECT created_by FROM quizzes WHERE quiz_id = ?', [quiz_id], (err, verifyResults) => {
        if (err) {
            console.error('Verification error:', err);
            return res.status(500).json({ error: 'Server error' });
        }

        if (verifyResults.length === 0 || verifyResults[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const sql = `
            INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(sql, [quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points || 1], (err) => {
            if (err) {
                console.error('Error adding question:', err);
                return res.status(500).json({ error: 'Error adding question' });
            }

            db.query('UPDATE quizzes SET question_count = question_count + 1 WHERE quiz_id = ?', [quiz_id], (err) => {
                if (err) {
                    console.error('Error updating question count:', err);
                }
                
                res.json({ message: 'Question added successfully!' });
            });
        });
    });
});

app.put('/api/quizzes/:id', authenticateToken, (req, res) => {
    const quiz_id = req.params.id;
    const { title, category, description } = req.body;

    db.query('SELECT created_by FROM quizzes WHERE quiz_id = ?', [quiz_id], (err, verifyResults) => {
        if (err) {
            console.error('Verification error:', err);
            return res.status(500).json({ error: 'Server error' });
        }

        if (verifyResults.length === 0 || verifyResults[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.query('UPDATE quizzes SET title = ?, category = ?, description = ? WHERE quiz_id = ?', 
            [title, category, description, quiz_id], 
            (err) => {
                if (err) {
                    console.error('Error updating quiz:', err);
                    return res.status(500).json({ error: 'Error updating quiz' });
                }
                
                res.json({ message: 'Quiz updated successfully!' });
            }
        );
    });
});

app.put('/api/quizzes/:id/visibility', authenticateToken, (req, res) => {
    const quizId = req.params.id;
    const { is_public } = req.body;
    
    db.query('SELECT created_by FROM quizzes WHERE quiz_id = ?', [quizId], (err, verifyResults) => {
        if (err) {
            console.error('Verification error:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        
        if (verifyResults.length === 0 || verifyResults[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        db.query('UPDATE quizzes SET is_public = ? WHERE quiz_id = ?', 
            [is_public, quizId], 
            (err) => {
                if (err) {
                    console.error('Error updating quiz visibility:', err);
                    return res.status(500).json({ error: 'Error updating quiz visibility' });
                }
                
                res.json({ message: 'Quiz visibility updated successfully!' });
            }
        );
    });
});
// Generate a unique quiz code
function generateQuizCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Update quiz creation to include quiz code
app.post('/api/quizzes', authenticateToken, (req, res) => {
    const { title, category, description, image_data, is_public } = req.body;
    const created_by = req.user.user_id;
    const quiz_code = generateQuizCode();

    const sql = `
        INSERT INTO quizzes (title, category, description, created_by, image_data, is_public, quiz_code) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [title, category, description, created_by, image_data, is_public || false, quiz_code], (err, result) => {
        if (err) {
            console.error('Error creating quiz:', err);
            return res.status(500).json({ error: 'Error creating quiz' });
        }
        
        res.json({ 
            message: 'Quiz created successfully!', 
            quiz_id: result.insertId,
            quiz_code: quiz_code
        });
    });
});

// Get quiz by code
app.get('/api/quizzes/code/:code', authenticateToken, (req, res) => {
    const quizCode = req.params.code.toUpperCase();
    
    const sql = `
        SELECT q.*, u.name as creator_name 
        FROM quizzes q 
        JOIN users u ON q.created_by = u.user_id 
        WHERE q.quiz_code = ?
    `;
    
    db.query(sql, [quizCode], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Quiz not found with this code' });
        }
        
        const quiz = results[0];
        
        // Check if quiz is public or user is the creator
        if (!quiz.is_public && quiz.created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'This quiz is private' });
        }
        
        res.json(quiz);
    });
});

// Join quiz by code
app.post('/api/quizzes/join', authenticateToken, (req, res) => {
    const { quiz_code } = req.body;
    
    if (!quiz_code) {
        return res.status(400).json({ error: 'Quiz code is required' });
    }
    
    const sql = `
        SELECT q.*, u.name as creator_name 
        FROM quizzes q 
        JOIN users u ON q.created_by = u.user_id 
        WHERE q.quiz_code = ?
    `;
    
    db.query(sql, [quiz_code.toUpperCase()], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Invalid quiz code' });
        }
        
        const quiz = results[0];
        
        // Check if quiz is public or user is the creator
        if (!quiz.is_public && quiz.created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'This quiz is private. Only the creator can access it.' });
        }
        
        // Record quiz participation
        db.query(
            'INSERT INTO quiz_participations (quiz_id, user_id) VALUES (?, ?)',
            [quiz.quiz_id, req.user.user_id],
            (err) => {
                if (err) {
                    console.error('Error recording participation:', err);
                    // Continue even if participation recording fails
                }
                
                res.json({ 
                    success: true, 
                    message: 'Quiz joined successfully!',
                    quiz: quiz,
                    redirect_url: `/quiz/${quiz.quiz_id}`
                });
            }
        );
    });
});

// Get quiz code for a specific quiz (for creators)
app.get('/api/quizzes/:id/code', authenticateToken, (req, res) => {
    const quizId = req.params.id;
    
    db.query(
        'SELECT quiz_code FROM quizzes WHERE quiz_id = ? AND created_by = ?',
        [quizId, req.user.user_id],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'Quiz not found or not authorized' });
            }
            
            res.json({ quiz_code: results[0].quiz_code });
        }
    );
});

app.delete('/api/quizzes/:id', authenticateToken, (req, res) => {
    const quiz_id = req.params.id;

    db.query('SELECT created_by FROM quizzes WHERE quiz_id = ?', [quiz_id], (err, verifyResults) => {
        if (err) {
            console.error('Verification error:', err);
            return res.status(500).json({ error: 'Server error' });
        }

        if (verifyResults.length === 0 || verifyResults[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.query('DELETE FROM quizzes WHERE quiz_id = ?', [quiz_id], (err) => {
            if (err) {
                console.error('Error deleting quiz:', err);
                return res.status(500).json({ error: 'Error deleting quiz' });
            }
            
            res.json({ message: 'Quiz deleted successfully!' });
        });
    });
});

// Get available questions count for a quiz
app.get('/api/quizzes/:id/questions', authenticateToken, (req, res) => {
    const quizId = req.params.id;
    const { random, limit } = req.query;
    
    let query = 'SELECT * FROM questions WHERE quiz_id = ?';
    const params = [quizId];
    
    // If random selection is requested
    if (random === 'true' && limit && !isNaN(limit)) {
        query += ' ORDER BY RAND() LIMIT ?';
        params.push(parseInt(limit));
    } else {
        query += ' ORDER BY created_at ASC';
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Get questions for a quiz (with optional random selection)
app.get('/api/quizzes/:id/questions-random', authenticateToken, (req, res) => {
    const quizId = req.params.id;
    const { limit } = req.query;
    
    let query = 'SELECT * FROM questions WHERE quiz_id = ?';
    const params = [quizId];
    
    // If limit is provided, get random questions
    if (limit && !isNaN(limit)) {
        query += ' ORDER BY RAND() LIMIT ?';
        params.push(parseInt(limit));
    } else {
        query += ' ORDER BY created_at ASC';
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching questions:', err);
            return res.status(500).json({ error: 'Failed to fetch questions' });
        }
        res.json(results);
    });
});

// Save quiz configuration
app.post('/api/quiz-configurations', authenticateToken, (req, res) => {
    const { quiz_id, question_count, time_per_question } = req.body;
    const user_id = req.user.user_id;

    // Validate input
    if (!quiz_id || !question_count || !time_per_question) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const validQuestionCounts = [10, 20, 30, 60];
    const validTimes = [10, 20, 30, 60];
    
    if (!validQuestionCounts.includes(question_count)) {
        return res.status(400).json({ error: 'Invalid question count' });
    }
    
    if (!validTimes.includes(time_per_question)) {
        return res.status(400).json({ error: 'Invalid time per question' });
    }

    // Check if configuration already exists
    db.query(
        'SELECT id FROM quiz_configurations WHERE quiz_id = ? AND user_id = ?',
        [quiz_id, user_id],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (results.length > 0) {
                // Update existing configuration
                db.query(
                    `UPDATE quiz_configurations 
                     SET question_count = ?, time_per_question = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE quiz_id = ? AND user_id = ?`,
                    [question_count, time_per_question, quiz_id, user_id],
                    (err) => {
                        if (err) {
                            console.error('Error updating quiz configuration:', err);
                            return res.status(500).json({ error: 'Failed to update quiz configuration' });
                        }
                        
                        res.json({ 
                            success: true, 
                            message: 'Quiz configuration updated successfully' 
                        });
                    }
                );
            } else {
                // Insert new configuration
                db.query(
                    `INSERT INTO quiz_configurations (quiz_id, user_id, question_count, time_per_question) 
                     VALUES (?, ?, ?, ?)`,
                    [quiz_id, user_id, question_count, time_per_question],
                    (err) => {
                        if (err) {
                            console.error('Error saving quiz configuration:', err);
                            return res.status(500).json({ error: 'Failed to save quiz configuration' });
                        }
                        
                        res.json({ 
                            success: true, 
                            message: 'Quiz configuration saved successfully' 
                        });
                    }
                );
            }
        }
    );
});

// Get saved quiz configuration for a user
app.get('/api/quiz-configurations/:quizId', authenticateToken, (req, res) => {
    const quizId = req.params.quizId;
    const userId = req.user.user_id;
    
    db.query(
        `SELECT question_count, time_per_question 
         FROM quiz_configurations 
         WHERE quiz_id = ? AND user_id = ?`,
        [quizId, userId],
        (err, results) => {
            if (err) {
                console.error('Error fetching quiz configuration:', err);
                return res.status(500).json({ error: 'Failed to fetch quiz configuration' });
            }
            
            if (results.length > 0) {
                res.json(results[0]);
            } else {
                res.json({ 
                    question_count: 10, // Default values
                    time_per_question: 20 
                });
            }
        }
    );
});

// Question requests
app.post('/api/question-requests', authenticateToken, (req, res) => {
    const { quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation } = req.body;

    if (!quiz_id || !question_text || !option_a || !option_b || !correct_answer) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.query(
        'SELECT created_by, title FROM quizzes WHERE quiz_id = ?',
        [quiz_id],
        (err, quizResults) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (quizResults.length === 0) {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            const quizCreatorId = quizResults[0].created_by;
            const quizTitle = quizResults[0].title;

            db.query(
                `INSERT INTO question_requests 
                 (quiz_id, user_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [quiz_id, req.user.user_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation],
                (err, result) => {
                    if (err) {
                        console.error('Error inserting question request:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    const requestId = result.insertId;

                    db.query('SELECT name FROM users WHERE user_id = ?', [req.user.user_id], (err, userResults) => {
                        if (err) {
                            console.error('Error fetching user name:', err);
                            return res.json({ 
                                message: 'Question request submitted successfully',
                                request_id: requestId
                            });
                        }

                        const userName = userResults[0]?.name || 'A user';

                        db.query(
                            `INSERT INTO notifications 
                            (user_id, title, message, type, related_id, quiz_id) 
                            VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                quizCreatorId,
                                'New Question Request',
                                `${userName} submitted a question request for your quiz "${quizTitle}"`,
                                'question_request',
                                requestId,
                                quiz_id
                            ],
                            (err) => {
                                if (err) {
                                    console.error('Error creating notification:', err);
                                } else {
                                    console.log('📢 Notification created for quiz creator');
                                    
                                    // Send real-time notification
                                    io.to(quizCreatorId.toString()).emit('new-notification', {
                                        title: 'New Question Request',
                                        message: `${userName} submitted a question request for your quiz "${quizTitle}"`,
                                        type: 'question_request',
                                        request_id: requestId,
                                        quiz_id: quiz_id,
                                        created_at: new Date()
                                    });
                                }

                                res.json({ 
                                    message: 'Question request submitted successfully',
                                    request_id: requestId
                                });
                            }
                        );
                    });
                }
            );
        }
    );
});

// Notifications API - CORRECTED VERSION
app.get('/api/notifications', authenticateToken, (req, res) => {
    const userId = req.user.user_id;
    
    console.log('🔔 Fetching notifications for user:', userId);
    
    const sql = `
        SELECT n.*, q.title as quiz_title, u.name as sender_name,
               qr.question_text, qr.option_a, qr.option_b, qr.option_c, qr.option_d, 
               qr.correct_answer, qr.explanation, qr.request_id, qr.status as request_status
        FROM notifications n 
        LEFT JOIN quizzes q ON n.quiz_id = q.quiz_id 
        LEFT JOIN users u ON n.sender_id = u.user_id 
        LEFT JOIN question_requests qr ON n.related_id = qr.request_id 
        WHERE n.user_id = ? 
        ORDER BY n.created_at DESC 
        LIMIT 20
    `;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error fetching notifications:', err);
            return res.status(500).json({ error: 'Error fetching notifications' });
        }
        
        console.log(`📋 Found ${results.length} notifications for user ${userId}`);
        
        const notifications = results.map(notification => {
            const baseNotification = {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                read: notification.is_read,
                created_at: notification.created_at,
                type: notification.type,
                quiz_id: notification.quiz_id,
                related_id: notification.related_id,
                request_status: notification.request_status // Add status to track accepted/rejected
            };
            
            // Add question data for question requests
            if (notification.type === 'question_request') {
                baseNotification.question_data = {
                    question_text: notification.question_text,
                    option_a: notification.option_a,
                    option_b: notification.option_b,
                    option_c: notification.option_c,
                    option_d: notification.option_d,
                    correct_answer: notification.correct_answer,
                    explanation: notification.explanation,
                    request_id: notification.request_id,
                    status: notification.request_status
                };
                
                // Only show actions if the request hasn't been processed yet
                if (!notification.request_status || notification.request_status === 'pending') {
                    baseNotification.actions = [
                        { type: 'accept', label: 'Accept' },
                        { type: 'reject', label: 'Reject' }
                    ];
                } else {
                    // Update message based on status
                    if (notification.request_status === 'approved') {
                        baseNotification.message = `✅ You accepted this question request`;
                    } else if (notification.request_status === 'rejected') {
                        baseNotification.message = `❌ You rejected this question request`;
                    }
                }
            }
            
            return baseNotification;
        });
        
        res.json(notifications);
    });
});

app.post('/api/notifications/:id/action', authenticateToken, (req, res) => {
    const notificationId = req.params.id;
    const { action } = req.body;
    const userId = req.user.user_id;
    
    console.log(`🎯 Action request received: notification=${notificationId}, action=${action}, user=${userId}`);
    
    // First get the notification with quiz title
    db.query(`
        SELECT n.*, q.title as quiz_title 
        FROM notifications n 
        LEFT JOIN quizzes q ON n.quiz_id = q.quiz_id 
        WHERE n.id = ? AND n.user_id = ?`,
        [notificationId, userId], 
        (err, results) => {
        if (err) {
            console.error('❌ Database error in notification verification:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        const notification = results[0];
        
        if (action === 'accept' && notification.type === 'question_request') {
            // Get the question request data
            db.query('SELECT * FROM question_requests WHERE request_id = ?', [notification.related_id], (err, requestResults) => {
                if (err) {
                    console.error('❌ Error fetching question request:', err);
                    return res.status(500).json({ error: 'Server error' });
                }
                
                if (requestResults.length === 0) {
                    return res.status(404).json({ error: 'Question request not found' });
                }
                
                const questionRequest = requestResults[0];
                
                // Add the question to the quiz
                db.query(
                    `INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [questionRequest.quiz_id, questionRequest.question_text, questionRequest.option_a, 
                     questionRequest.option_b, questionRequest.option_c, questionRequest.option_d, 
                     questionRequest.correct_answer, 10],
                    (err, insertResult) => {
                        if (err) {
                            console.error('❌ Error adding question to quiz:', err);
                            return res.status(500).json({ error: 'Error adding question' });
                        }
                        
                        // Update question request status
                        db.query('UPDATE question_requests SET status = "approved" WHERE request_id = ?', [notification.related_id]);
                        
                        // Update notification message to show acceptance
                        db.query('UPDATE notifications SET message = ? WHERE id = ?', 
                            [`✅ You accepted this question request on ${new Date().toLocaleDateString()}`, notificationId]);
                        
                        // Update question count
                        db.query('UPDATE quizzes SET question_count = COALESCE(question_count, 0) + 1 WHERE quiz_id = ?', [questionRequest.quiz_id]);
                        
                        // Mark notification as read
                        db.query('UPDATE notifications SET is_read = true WHERE id = ?', [notificationId]);
                        
                        // Send notification to the requester
                        db.query(
                            `INSERT INTO notifications (user_id, title, message, type, quiz_id) 
                             VALUES (?, ?, ?, ?, ?)`,
                            [questionRequest.user_id, 'Question Approved', 
                             `Your question for "${notification.quiz_title}" has been approved!`, 
                             'question_approved', questionRequest.quiz_id]
                        );
                        
                        res.json({ success: true, message: 'Question approved and added to quiz!' });
                    }
                );
            });
            
        } else if (action === 'reject' && notification.type === 'question_request') {
            // Update question request status to rejected
            db.query('UPDATE question_requests SET status = "rejected" WHERE request_id = ?', [notification.related_id], (err) => {
                if (err) {
                    console.error('❌ Error rejecting question:', err);
                    return res.status(500).json({ error: 'Error rejecting question' });
                }
                
                // Update notification message to show rejection
                db.query('UPDATE notifications SET message = ? WHERE id = ?', 
                    [`❌ You rejected this question request on ${new Date().toLocaleDateString()}`, notificationId]);
                
                // Mark notification as read
                db.query('UPDATE notifications SET is_read = true WHERE id = ?', [notificationId]);
                
                // Send notification to the requester
                db.query('SELECT * FROM question_requests WHERE request_id = ?', [notification.related_id], (err, requestResults) => {
                    if (!err && requestResults.length > 0) {
                        const questionRequest = requestResults[0];
                        db.query(
                            `INSERT INTO notifications (user_id, title, message, type, quiz_id) 
                             VALUES (?, ?, ?, ?, ?)`,
                            [questionRequest.user_id, 'Question Rejected', 
                             `Your question for "${notification.quiz_title}" was not approved.`, 
                             'question_rejected', questionRequest.quiz_id]
                        );
                    }
                });
                
                res.json({ success: true, message: 'Question rejected' });
            });
            
        } else {
            // Mark as read for other notification types
            db.query('UPDATE notifications SET is_read = true WHERE id = ?', [notificationId], (err) => {
                if (err) {
                    console.error('❌ Error updating notification:', err);
                    return res.status(500).json({ error: 'Server error' });
                }
                
                res.json({ success: true, message: 'Notification marked as read' });
            });
        }
    });
});

// Mark all notifications as read - FIXED
app.post('/api/notifications/mark-all-read', authenticateToken, (req, res) => {
    const userId = req.user.user_id;
    
    db.query('UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false', [userId], (err, result) => {
        if (err) {
            console.error('Error marking all notifications as read:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`✅ Marked all notifications as read for user ${userId}. ${result.affectedRows} notifications updated.`);
        res.json({ 
            success: true, 
            message: `Marked ${result.affectedRows} notifications as read`,
            updated_count: result.affectedRows
        });
    });
});

// Get available questions count for a quiz
app.get('/api/quizzes/:id/questions-count', async (req, res) => {
    try {
        const quizId = req.params.id;
        
        const result = await pool.query(
            'SELECT COUNT(*) as question_count FROM questions WHERE quiz_id = $1',
            [quizId]
        );
        
        res.json({
            total_questions: parseInt(result.rows[0].question_count)
        });
    } catch (error) {
        console.error('Error getting questions count:', error);
        res.status(500).json({ error: 'Failed to get questions count' });
    }
});


// Test route
app.get('/test-connection', (req, res) => {
    db.query('SELECT 1 + 1 AS result', (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, result: results });
    });
});

// Error handling
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});