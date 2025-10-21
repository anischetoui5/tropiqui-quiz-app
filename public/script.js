// Check if user is logged in
async function checkAuthStatus() {
    try {
        const res = await fetch('/auth/status', {
            credentials: 'include'
        });
        
        if (res.ok) {
            const data = await res.json();
            updateUIForLoggedInUser(data.user);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}


// Logout function
async function logout() {
    try {
        const res = await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (res.ok) {
            alert('Logged out successfully!');
            location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show profile - Navigate to profile page
function showProfile() {
    window.location.href = '/profile';
}

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status when page loads
    checkAuthStatus();

    const animatedElements = document.querySelectorAll('.animated');
    animatedElements.forEach(element => element.style.opacity = '0');
    setTimeout(() => {
        animatedElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.animation = 'fadeIn 0.6s ease forwards';
            }, index * 100);
        });
    }, 500);

    // Quiz card interaction
    const quizCards = document.querySelectorAll('.quiz-card');
    quizCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
                alert('Starting random quiz from ' + this.querySelector('.quiz-title').textContent + ' category!');
            }, 200);
        });
    });

    // Modal functionality
    const authModal = document.getElementById('authModal');
    const quizCodeModal = document.getElementById('quizCodeModal');
    const signupBtn = document.getElementById('signupBtn');
    const loginBtn = document.getElementById('loginBtn');
    const startQuizBtn = document.getElementById('startQuizBtn');
    const closeModal = document.getElementById('closeModal');
    const closeQuizModal = document.getElementById('closeQuizModal');
    const modalTitle = document.getElementById('modalTitle');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const switchToSignup = document.getElementById('switchToSignup');

    // Open modal for signup
    signupBtn.addEventListener('click', function() {
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        switchTab('signup');
    });

    // Open modal for login
    loginBtn.addEventListener('click', function() {
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        switchTab('login');
    });

    // Open modal for quiz code
    startQuizBtn.addEventListener('click', function() {
        quizCodeModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close auth modal
    closeModal.addEventListener('click', function() {
        authModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });

    // Close quiz code modal
    closeQuizModal.addEventListener('click', function() {
        quizCodeModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });

    // Close modal when clicking outside
    authModal.addEventListener('click', function(e) {
        if (e.target === authModal) {
            authModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    
    quizCodeModal.addEventListener('click', function(e) {
        if (e.target === quizCodeModal) {
            quizCodeModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });

// Handle quiz code form submission
document.getElementById('quizCodeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const quizCode = document.getElementById('quizCode').value.trim();
    
    if (!quizCode) {
        showNotification('Please enter a quiz code', 'error');
        return;
    }

    try {
        const response = await fetch('/api/quizzes/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ quiz_code: quizCode })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(data.message, 'success');
            quizCodeModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            
            // Redirect to the quiz page
            setTimeout(() => {
                window.location.href = data.redirect_url;
            }, 1000);
            
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error joining quiz:', error);
        showNotification('Network error. Please try again.', 'error');
    }
});

// Add this helper function if you don't have it
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        ${type === 'success' ? 'background: #4CAF50;' : ''}
        ${type === 'error' ? 'background: #f44336;' : ''}
        ${type === 'info' ? 'background: #2196F3;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

    // Switch between tabs
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Switch to signup from login form link
    switchToSignup.addEventListener('click', function(e) {
        e.preventDefault();
        switchTab('signup');
    });

    // Function to switch tabs
    function switchTab(tabName) {
        authTabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });
        authForms.forEach(form => {
            form.classList.toggle('active', form.id === tabName + 'Form');
        });
        modalTitle.textContent = (tabName === 'signup') ? 'Sign Up' : 'Log In';
    }

    // Login form handler
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await res.text();
                console.error('Non-JSON response:', textResponse);
                throw new Error('Server returned non-JSON response: ' + textResponse);
            }

            const data = await res.json();

            if (res.ok) {
                updateUIForLoggedInUser(data.user);
                
                const welcomeModal = document.getElementById('welcomeModal');
                const welcomeMessage = document.getElementById('welcomeMessage');
                welcomeMessage.textContent = data.message;
                welcomeModal.style.display = 'flex';

                document.getElementById('welcomeOkBtn').onclick = function() {
                    welcomeModal.style.display = 'none';
                    authModal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                };
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Server error. Please try again.');
        }
    });

    // Signup form handler
    document.getElementById('signupForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        document.querySelectorAll('.error-message').forEach(el => el.remove());

        try {
            const res = await fetch('/signup', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await res.text();
                console.error('Non-JJSON response:', textResponse);
                throw new Error('Server returned non-JSON response: ' + textResponse);
            }

            const data = await res.json();
            
            if (res.ok) {
                alert(data.message);
                switchTab('login');
                this.reset();
            } else {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.style.color = 'red';
                errorDiv.style.marginTop = '10px';
                errorDiv.textContent = data.error;
                this.appendChild(errorDiv);
            }
        } catch (err) {
            console.error('Signup error:', err);
            alert('Server error. Please try again. Check console for details.');
        }
    });

    // Discord button placeholder
    document.querySelector('.discord-btn').addEventListener('click', function() {
        alert('Discord authentication would be implemented here.');
    });

    // Google Sign-In functions
    function handleCredentialResponse(response) {
        console.log("JWT ID token:", response.credential);
        alert("Logged in with Google! Check console for token.");
    }

    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.renderButton(
            document.getElementById("googleBtn"),
            { theme: "outline", size: "large", text: "signin_with" }
        );
    }
});

// Welcome modal functionality
function hideWelcomeModal() {
    const welcomeModal = document.getElementById('welcomeModal');
    if (welcomeModal) {
        welcomeModal.style.display = 'none';
    }
}

// Test authentication function
async function testAuth() {
    try {
        const res = await fetch('/auth/status', {
            credentials: 'include'
        });
        
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Authenticated:', data);
            return data;
        } else {
            console.log('❌ Not authenticated');
            return null;
        }
    } catch (error) {
        console.error('Auth test error:', error);
        return null;
    }
}
// Load public quizzes from the server
async function loadPublicQuizzes() {
    try {
        const response = await fetch('/api/public-quizzes');
        
        if (response.ok) {
            const quizzes = await response.json();
            displayPublicQuizzes(quizzes);
        } else {
            console.error('Error loading public quizzes');
            document.getElementById('publicQuizzesGrid').innerHTML = `
                <div class="empty-quizzes">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load public quizzes. Please try again later.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading public quizzes:', error);
        document.getElementById('publicQuizzesGrid').innerHTML = `
            <div class="empty-quizzes">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Network error. Please check your connection.</p>
            </div>
        `;
    }
}

// Display public quizzes in the grid
function displayPublicQuizzes(quizzes) {
    const container = document.getElementById('publicQuizzesGrid');
    
    if (!container) return;
    
    if (quizzes.length === 0) {
        container.innerHTML = `
            <div class="empty-quizzes">
                <i class="fas fa-file-alt"></i>
                <p>No public quizzes available yet.</p>
                <p>Be the first to create one!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = quizzes.map(quiz => `
        <div class="public-quiz-card" data-quiz-id="${quiz.quiz_id}">
            <div class="quiz-image-container">
                ${quiz.image_data ? 
                    `<img src="${quiz.image_data}" alt="${quiz.title}" class="quiz-image">` : 
                    `<div class="quiz-image-placeholder">
                        <i class="fas fa-file-alt"></i>
                    </div>`
                }
            </div>
            
            <div class="quiz-content">
                <h3 class="quiz-title">${quiz.title}</h3>
                <p class="quiz-description">${quiz.description || 'No description available'}</p>
                
                <div class="quiz-meta">
                    <div class="quiz-creator">
                        <div class="creator-avatar">
                            ${quiz.creator_name ? quiz.creator_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span>${quiz.creator_name || 'Unknown'}</span>
                    </div>
                    
                    <div class="quiz-stats">
                        <div class="quiz-stat">
                            <i class="fas fa-question-circle"></i>
                            <span>${quiz.question_count || 0}</span>
                        </div>
                        <div class="quiz-stat">
                            <i class="fas fa-play-circle"></i>
                            <span>${Math.floor(Math.random() * 1000) + 100}</span>
                        </div>
                    </div>
                </div>
                
                <button class="play-btn" onclick="playQuiz(${quiz.quiz_id})">
                    <i class="fas fa-play"></i> Play Quiz
                </button>
            </div>
        </div>
    `).join('');
}

// Function to handle quiz playing
async function playQuiz(quizId) {
    try {
        // Check if user is actually authenticated
        const res = await fetch('/auth/status', {
            credentials: 'include'
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data.authenticated) {
                // User is logged in, redirect to quiz page
                window.location.href = `/quiz/${quizId}`;
            } else {
                // User is not logged in, show login modal
                document.getElementById('authModal').classList.add('active');
                switchTab('login');
                alert('Please log in to play quizzes!');
            }
        } else {
            // Authentication check failed, show login modal
            document.getElementById('authModal').classList.add('active');
            switchTab('login');
            alert('Please log in to play quizzes!');
        }
    } catch (error) {
        console.error('Auth check error:', error);
        document.getElementById('authModal').classList.add('active');
        switchTab('login');
        alert('Please log in to play quizzes!');
    }
}

// Load public quizzes when page loads
document.addEventListener('DOMContentLoaded', function() {
    // ... your existing code ...
    
    // Load public quizzes
    loadPublicQuizzes();
});
// Make quiz cards clickable
document.addEventListener('click', function(e) {
    const quizCard = e.target.closest('.public-quiz-card');
    if (quizCard) {
        const quizId = quizCard.getAttribute('data-quiz-id');
        playQuiz(quizId);
    }
});

// Update UI when user is logged in
function updateUIForLoggedInUser(user) {
    const authButtons = document.querySelector('.auth-buttons');
    authButtons.innerHTML = `
        <span style="margin-right: 15px; font-weight: 500;">Welcome, ${user.name}</span>
        <button class="btn btn-outline" onclick="window.location.href='/profile'">
            <i class="fas fa-user"></i> Profile
        </button>
        <button class="btn btn-primary" id="logoutBtn">
            <i class="fas fa-sign-out-alt"></i> Log Out
        </button>
    `;
    
    // Add logout functionality
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Show welcome modal
    showWelcomeModal(user.name);
}

// Show welcome modal function
function showWelcomeModal(userName) {
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const welcomeOkBtn = document.getElementById('welcomeOkBtn');
    const closeWelcomeModal = document.getElementById('closeWelcomeModal');
    
    // Set welcome message
    welcomeMessage.textContent = `Welcome back, ${userName}! Ready to create and play some awesome quizzes?`;
    
    // Show modal
    welcomeModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Close modal functions
    const closeModal = () => {
        welcomeModal.classList.remove('active');
        document.body.style.overflow = 'auto'; // Re-enable scrolling
        
        // Remove event listeners to prevent memory leaks
        welcomeOkBtn.removeEventListener('click', closeModal);
        closeWelcomeModal.removeEventListener('click', closeModal);
    };
    
    // Add event listeners
    welcomeOkBtn.addEventListener('click', closeModal);
    closeWelcomeModal.addEventListener('click', closeModal);
    
    // Auto-close after 5 seconds
    setTimeout(closeModal, 5000);
    
    // Close when clicking outside modal
    welcomeModal.addEventListener('click', (e) => {
        if (e.target === welcomeModal) {
            closeModal();
        }
    });
}
// Enhanced show welcome modal function with countdown
function showWelcomeModal(userName) {
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const welcomeOkBtn = document.getElementById('welcomeOkBtn');
    const closeWelcomeModal = document.getElementById('closeWelcomeModal');
    
    // Set welcome message
    welcomeMessage.textContent = `Welcome back, ${userName}! Ready to create and play some awesome quizzes?`;
    
    // Show modal
    welcomeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Add countdown to button
    let countdown = 5;
    const originalText = welcomeOkBtn.textContent;
    
    const updateButtonText = () => {
        welcomeOkBtn.textContent = `Let's Go! (${countdown})`;
        countdown--;
        
        if (countdown >= 0) {
            setTimeout(updateButtonText, 1000);
        } else {
            welcomeOkBtn.textContent = originalText;
        }
    };
    
    updateButtonText();
    
    // Close modal functions
    const closeModal = () => {
        welcomeModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Clean up event listeners
        welcomeOkBtn.removeEventListener('click', closeModal);
        closeWelcomeModal.removeEventListener('click', closeModal);
        welcomeModal.removeEventListener('click', outsideClickHandler);
    };
    
    // Outside click handler
    const outsideClickHandler = (e) => {
        if (e.target === welcomeModal) {
            closeModal();
        }
    };
    
    // Add event listeners
    welcomeOkBtn.addEventListener('click', closeModal);
    closeWelcomeModal.addEventListener('click', closeModal);
    welcomeModal.addEventListener('click', outsideClickHandler);
    
    // Auto-close after 5 seconds
    setTimeout(closeModal, 5000);
}
// Login form handling
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };
    
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Close modal and update UI
            document.getElementById('authModal').classList.remove('active');
            updateUIForLoggedInUser(data.user);
            showWelcomeMessage(`Welcome back, ${data.user.name}!`);
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login error: ' + error.message);
    }
});

// Logout function
async function logout() {
    try {
        const res = await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (res.ok) {
            window.location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Welcome message function
function showWelcomeMessage(message) {
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    welcomeMessage.textContent = message;
    welcomeModal.style.display = 'flex';
    
    document.getElementById('welcomeOkBtn').onclick = function() {
        welcomeModal.style.display = 'none';
    };
}

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});
// Notification system - CORRECTED VERSION
class NotificationSystem {
    constructor() {
        this.notificationBell = document.getElementById('notificationBell');
        this.notificationDropdown = document.getElementById('notificationDropdown');
        this.notificationCount = document.getElementById('notificationCount');
        this.notificationList = document.getElementById('notificationList');
        this.markAllReadBtn = document.getElementById('markAllRead');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        this.notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        document.addEventListener('click', (e) => this.handleClickOutside(e));
        
        // Add click event to Mark All as Read button
        if (this.markAllReadBtn) {
            this.markAllReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAllAsRead();
            });
        }
        
        // Load notifications
        this.loadNotifications();
        
        // Set up polling for new notifications
        setInterval(() => this.loadNotifications(), 30000);
    }
    
    toggleDropdown() {
        this.isOpen = !this.isOpen;
        this.notificationDropdown.classList.toggle('active', this.isOpen);
        
        // DON'T auto-mark as read when opening - let user click the button manually
        if (this.isOpen) {
            // Just reload to get latest notifications
            this.loadNotifications();
        }
    }
    
    handleClickOutside(e) {
        if (!this.notificationBell.contains(e.target) && 
            !this.notificationDropdown.contains(e.target)) {
            this.isOpen = false;
            this.notificationDropdown.classList.remove('active');
        }
    }
    
    async loadNotifications() {
        try {
            const res = await fetch('/api/notifications', {
                credentials: 'include'
            });
            
            if (res.ok) {
                const notifications = await res.json();
                this.renderNotifications(notifications);
            } else {
                console.error('Failed to load notifications:', res.status);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    renderNotifications(notifications) {
        const unreadCount = notifications.filter(n => !n.read).length;
        this.notificationCount.textContent = unreadCount;
        this.notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
        
        if (notifications.length === 0) {
            this.notificationList.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }
        
        this.notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
                <div class="notification-item-content">
                    <div class="notification-text">
                        <strong>${notification.title}</strong>
                        <p>${notification.message}</p>
                        
                        ${notification.question_data ? `
                            <div class="question-preview">
                                <div class="question-text">${notification.question_data.question_text}</div>
                                <div class="question-options">
                                    <div>A) ${notification.question_data.option_a}</div>
                                    <div>B) ${notification.question_data.option_b}</div>
                                    ${notification.question_data.option_c ? `<div>C) ${notification.question_data.option_c}</div>` : ''}
                                    ${notification.question_data.option_d ? `<div>D) ${notification.question_data.option_d}</div>` : ''}
                                    <div class="correct-answer">Correct: ${notification.question_data.correct_answer}</div>
                                    ${notification.question_data.explanation ? `<div><em>Explanation: ${notification.question_data.explanation}</em></div>` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="notification-time">${this.formatTime(notification.created_at)}</div>
                        
                        ${notification.actions && notification.actions.length > 0 ? `
                            <div class="notification-actions">
                                ${notification.actions.map(action => `
                                    <button class="notification-action-btn btn-${action.type}" 
                                            onclick="notificationSystem.handleAction(${notification.id}, '${action.type}')">
                                        <i class="fas fa-${action.type === 'accept' ? 'check' : 'times'}"></i>
                                        ${action.label}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async handleAction(notificationId, actionType) {
        console.log(`🔄 Handling ${actionType} for notification ${notificationId}`);
        
        try {
            const response = await fetch(`/api/notifications/${notificationId}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ action: actionType })
            });

            const result = await response.json();

            if (response.ok) {
                // Show success message
                alert(`✅ ${result.message}`);
                // Reload notifications to update the UI
                this.loadNotifications();
            } else {
                alert(`❌ Error: ${result.error || 'Something went wrong'}`);
            }
        } catch (error) {
            console.error('❌ Network error:', error);
            alert('❌ Network error: ' + error.message);
        }
    }
    
    async markAllAsRead() {
        try {
            console.log('🔄 Marking all notifications as read...');
            
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok) {
                // Update notification count to zero
                this.notificationCount.textContent = '0';
                this.notificationCount.style.display = 'none';
                
                // Reload notifications to update the UI visually
                this.loadNotifications();
                
                console.log('✅ Successfully marked all notifications as read');
                
                // Show success message
                if (result.updated_count > 0) {
                    alert(`✅ Marked ${result.updated_count} notifications as read`);
                }
            } else {
                console.error('❌ Failed to mark all as read:', result.error);
                alert('Error: ' + (result.error || 'Failed to mark all notifications as read'));
            }
        } catch (error) {
            console.error('❌ Network error marking all as read:', error);
            alert('Network error: ' + error.message);
        }
    }
    
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }
}

// Initialize notification system
const notificationSystem = new NotificationSystem();