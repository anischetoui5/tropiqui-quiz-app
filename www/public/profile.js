// Global variables
let currentUser = null;
let currentQuizId = null;

// Initialize the page
async function initializePage() {
    try {
        // Check authentication status
        await checkAuthStatus();
        
        // Load user info
        await loadUserInfo();
        
        // Load user's quizzes
        await loadMyQuizzes();
        
        // Initialize profile picture functionality
        initializeProfilePicture();
        
        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}
// Open quiz settings
// Open quiz settings - FIXED VERSION
async function openQuizSettings(quizId, isPublic) {
    currentQuizId = quizId;
    
    document.getElementById('settingsQuizId').value = quizId;
    document.getElementById('settingsIsPublic').checked = isPublic;
    
    // Fetch the actual quiz code from the server
    try {
        const response = await fetch(`/api/quizzes/${quizId}/code`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('quizCode').value = data.quiz_code;
        } else {
            console.error('Failed to fetch quiz code');
            document.getElementById('quizCode').value = 'Error loading code';
        }
    } catch (error) {
        console.error('Error fetching quiz code:', error);
        document.getElementById('quizCode').value = 'Error loading code';
    }
    
    document.getElementById('quizCodeContainer').style.display = isPublic ? 'block' : 'none';
    document.getElementById('quizSettingsModal').classList.add('active');
}

// Edit quiz function
function editQuiz() {
    const quizId = document.getElementById('settingsQuizId').value;
    
    // Close settings modal
    document.getElementById('quizSettingsModal').classList.remove('active');
    
    // Fetch quiz details and open edit modal
    fetchQuizDetails(quizId);
}

// Fetch quiz details for editing
async function fetchQuizDetails(quizId) {
    try {
        const res = await fetch(`/api/quizzes/${quizId}`, {
            credentials: 'include'
        });
        
        if (res.ok) {
            const quiz = await res.json();
            
            // Fill the edit form
            document.getElementById('editQuizId').value = quiz.quiz_id;
            document.getElementById('editQuizTitle').value = quiz.title;
            document.getElementById('editQuizDescription').value = quiz.description || '';
            document.getElementById('editQuizCategory').value = quiz.category || '';
            
            // Show current image if exists
            if (quiz.image_data) {
                document.getElementById('editQuizImage').value = quiz.image_data;
                document.getElementById('editPreviewImg').src = quiz.image_data;
                document.getElementById('editImagePreview').style.display = 'block';
            } else {
                document.getElementById('editImagePreview').style.display = 'none';
            }
            
            // Open edit modal
            document.getElementById('editQuizModal').classList.add('active');
            
        } else {
            alert('Error loading quiz details');
        }
    } catch (error) {
        console.error('Error fetching quiz details:', error);
        alert('Error loading quiz details');
    }
}

// Handle edit quiz form submission
function setupEditQuizForm() {
    const editQuizForm = document.getElementById('editQuizForm');
    if (editQuizForm) {
        editQuizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const quizData = {
                title: document.getElementById('editQuizTitle').value,
                category: document.getElementById('editQuizCategory').value,
                description: document.getElementById('editQuizDescription').value,
                image_data: document.getElementById('editQuizImage').value || null
            };
            
            const quizId = document.getElementById('editQuizId').value;
            
            try {
                const res = await fetch(`/api/quizzes/${quizId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(quizData)
                });
                
                if (res.ok) {
                    alert('Quiz updated successfully!');
                    document.getElementById('editQuizModal').classList.remove('active');
                    await loadMyQuizzes();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Error updating quiz');
                }
            } catch (error) {
                console.error('Error updating quiz:', error);
                alert('Error updating quiz');
            }
        });
    }
}

// Setup edit quiz image upload
function setupEditQuizImageUpload() {
    const editQuizImageUpload = document.getElementById('editQuizImageUpload');
    const editImagePreview = document.getElementById('editImagePreview');
    const editPreviewImg = document.getElementById('editPreviewImg');
    const editQuizImage = document.getElementById('editQuizImage');
    
    if (editQuizImageUpload) {
        editQuizImageUpload.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select a valid image file (JPEG, PNG, etc.)');
                    return;
                }
                
                // Validate file size (e.g., 5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image must be less than 5MB');
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Show preview
                    editPreviewImg.src = e.target.result;
                    editImagePreview.style.display = 'block';
                    
                    // Store base64 data in hidden input
                    editQuizImage.value = e.target.result;
                };
                
                reader.readAsDataURL(file);
            }
        });
    }
}

// Remove edit image
function removeEditImage() {
    document.getElementById('editQuizImage').value = '';
    document.getElementById('editImagePreview').style.display = 'none';
    document.getElementById('editQuizImageUpload').value = '';
}

// Set up event listeners
function setupEventListeners() {
    // Modal elements
    const createQuizModal = document.getElementById('createQuizModal');
    const addQuestionModal = document.getElementById('addQuestionModal');
    const quizSettingsModal = document.getElementById('quizSettingsModal');
    const createQuizBtn = document.getElementById('createQuizBtn');
    const closeCreateQuizModal = document.getElementById('closeCreateQuizModal');
    const closeQuestionModal = document.getElementById('closeQuestionModal');
    const logoutBtn = document.getElementById('logoutBtn');
    const copyQuizCodeBtn = document.getElementById('copyQuizCode');
    const manageQuestionsBtn = document.getElementById('manageQuestionsBtn');
    const deleteQuizBtn = document.getElementById('deleteQuizBtn');
    const quizImageUpload = document.getElementById('quizImageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const quizImage = document.getElementById('quizImage');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const closeEditQuizModal = document.getElementById('closeEditQuizModal');

    // Open create quiz modal
    if (createQuizBtn) {
        createQuizBtn.addEventListener('click', () => {
            createQuizModal.classList.add('active');
        });
    }
    if (quizImageUpload) {
    quizImageUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Show preview
                previewImg.src = e.target.result;
                imagePreview.style.display = 'block';
                
                // Store base64 data in hidden input
                quizImage.value = e.target.result;
            };
            
            reader.readAsDataURL(file);
        }
    });
        // Add this to setupEventListeners() function
    const settingsIsPublic = document.getElementById('settingsIsPublic');
    if (settingsIsPublic) {
        settingsIsPublic.addEventListener('change', async function(e) {
            const quizId = document.getElementById('settingsQuizId').value;
            const isPublic = e.target.checked;
            
            try {
                const res = await fetch(`/api/quizzes/${quizId}/visibility`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ is_public: isPublic })
                });
                
                if (res.ok) {
                    // Update the quiz code display
                    document.getElementById('quizCodeContainer').style.display = isPublic ? 'block' : 'none';
                    alert('Quiz visibility updated successfully!');
                    
                    // Refresh the quizzes display to show updated status
                    await loadMyQuizzes();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Error updating quiz visibility');
                    // Revert the toggle if update failed
                    e.target.checked = !isPublic;
                }
            } catch (error) {
                console.error('Error updating quiz visibility:', error);
                alert('Error updating quiz visibility');
                // Revert the toggle on error
                e.target.checked = !isPublic;
            }
        });
    }
}
// Function to remove selected quiz image
function removeQuizImage() {
    document.getElementById('quizImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('quizImageUpload').value = '';
}

    // Close modals
    if (closeCreateQuizModal) {
        closeCreateQuizModal.addEventListener('click', () => {
            createQuizModal.classList.remove('active');
        });
    }

    if (closeQuestionModal) {
        closeQuestionModal.addEventListener('click', () => {
            addQuestionModal.classList.remove('active');
        });
    }

    // Close settings modal
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => {
            document.getElementById('quizSettingsModal').classList.remove('active');
        });
    }
    // Close edit quiz modal
    if (closeEditQuizModal) {
        closeEditQuizModal.addEventListener('click', () => {
            document.getElementById('editQuizModal').classList.remove('active');
        });
    }
        // Setup edit quiz form
    setupEditQuizForm();

    // Setup edit quiz image upload
    setupEditQuizImageUpload();

// Create quiz form
const createQuizForm = document.getElementById('createQuizForm');
if (createQuizForm) {
    createQuizForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const quizData = {
            title: document.getElementById('quizTitle').value,
            category: document.getElementById('quizCategory').value,
            description: document.getElementById('quizDescription').value,
            image_data: document.getElementById('quizImage').value || null,
            is_public: document.getElementById('quizIsPublic').checked
        };

        try {
            const res = await fetch('/api/quizzes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(quizData)
            });

            const data = await res.json();  // ← READ ONCE
            
            if (res.ok) {
                alert('Quiz created successfully! Quiz Code: ' + data.quiz_code); // ← USE SAME DATA VARIABLE
                createQuizModal.classList.remove('active');
                document.getElementById('createQuizForm').reset();
                await loadMyQuizzes();
                
                // Open add questions modal
                currentQuizId = data.quiz_id;
                document.getElementById('currentQuizId').value = currentQuizId;
                addQuestionModal.classList.add('active');
            } else {
                console.error('Server response:', data);
                alert(data.error || 'Error creating quiz');
            }
        } catch (error) {
            console.error('Error creating quiz:', error);
            alert('Error creating quiz: ' + error.message);
        }
    });
}

    // Add question form
    const addQuestionForm = document.getElementById('addQuestionForm');
    if (addQuestionForm) {
        addQuestionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const questionData = {
                quiz_id: document.getElementById('currentQuizId').value,
                question_text: document.getElementById('questionText').value,
                option_a: document.getElementById('optionA').value,
                option_b: document.getElementById('optionB').value,
                option_c: document.getElementById('optionC').value,
                option_d: document.getElementById('optionD').value,
                correct_answer: document.getElementById('correctAnswer').value,
                points: document.getElementById('questionPoints').value
            };

            try {
                const res = await fetch('/api/questions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(questionData)
                });

                const data = await res.json();
                
                if (res.ok) {
                    alert('Question added successfully!');
                    document.getElementById('addQuestionForm').reset();
                } else {
                    alert(data.error || 'Error adding question');
                }
            } catch (error) {
                console.error('Error adding question:', error);
                alert('Error adding question');
            }
        });
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Copy quiz code button
    if (copyQuizCodeBtn) {
        copyQuizCodeBtn.addEventListener('click', () => {
            const quizCode = document.getElementById('quizCode');
            quizCode.select();
            document.execCommand('copy');
            alert('Quiz code copied to clipboard!');
        });
    }

    // Manage questions button
    if (manageQuestionsBtn) {
        manageQuestionsBtn.addEventListener('click', () => {
            quizSettingsModal.classList.remove('active');
            currentQuizId = document.getElementById('settingsQuizId').value;
            document.getElementById('currentQuizId').value = currentQuizId;
            addQuestionModal.classList.add('active');
        });
    }

    // Delete quiz button
    if (deleteQuizBtn) {
        deleteQuizBtn.addEventListener('click', async () => {
            const quizId = document.getElementById('settingsQuizId').value;
            
            if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
                try {
                    const res = await fetch(`/api/quizzes/${quizId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (res.ok) {
                        alert('Quiz deleted successfully!');
                        quizSettingsModal.classList.remove('active');
                        await loadMyQuizzes();
                    } else {
                        const data = await res.json();
                        alert(data.error || 'Error deleting quiz');
                    }
                } catch (error) {
                    console.error('Error deleting quiz:', error);
                    alert('Error deleting quiz');
                }
            }
        });
    }

    const changePictureBtn = document.getElementById('changePictureBtn');
    const deletePictureBtn = document.getElementById('deletePictureBtn');
    const profilePictureInput = document.getElementById('profilePictureInput');
    const profilePicture = document.getElementById('profilePicture');

    if (changePictureBtn && profilePictureInput) {
        changePictureBtn.addEventListener('click', () => {
            profilePictureInput.click();
        });
    }

    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = async function(e) {
                    const imageData = e.target.result;
                    const userId = getCurrentUserId();

                    try {
                        const res = await fetch('/api/users/profile-picture', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                profile_picture: imageData,
                                user_id: userId
                            })
                        });

                        const data = await res.json();
                        if (data.success) {
                            profilePicture.src = imageData;
                            alert('Profile picture updated successfully!');
                        } else {
                            alert('Failed to update profile picture.');
                        }
                    } catch (err) {
                        console.error('Upload error:', err);
                        alert('Error uploading profile picture.');
                    }
                };
                
                reader.readAsDataURL(file);
            }
        });
    }

    if (deletePictureBtn) {
        deletePictureBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete your profile picture?')) return;

            const userId = getCurrentUserId();
            try {
                const res = await fetch(`/api/users/profile-picture/${userId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                    profilePicture.src = 'https://via.placeholder.com/150';
                    alert('Profile picture deleted.');
                } else {
                    alert('Failed to delete profile picture.');
                }
            } catch (err) {
                console.error('Delete error:', err);
                alert('Error deleting profile picture.');
            }
        });
    }
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const res = await fetch('/auth/status', {
            credentials: 'include'
        });
        
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            return true;
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        window.location.href = '/login';
    }
}

// Load user info - UPDATED VERSION
async function loadUserInfo() {
    try {
        const res = await fetch('/api/user/profile', {
            credentials: 'include'
        });
        
        if (res.ok) {
            const userData = await res.json();
            
            // Update currentUser with fresh data including profile_picture
            if (currentUser) {
                currentUser.profile_picture = userData.profile_picture;
            }
            
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = userData.name || currentUser.name;
            }
            
            const profilePicture = document.getElementById('profilePicture');
            if (profilePicture) {
                // Use the profile_picture from the API response
                profilePicture.src = userData.profile_picture || 
                                   'https://via.placeholder.com/150';
            }
        } else {
            console.error('Error loading user info:', res.status);
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Load user's quizzes
async function loadMyQuizzes() {
    try {
        const res = await fetch('/api/my-quizzes', {
            credentials: 'include'
        });

        if (res.ok) {
            const quizzes = await res.json();
            displayQuizzes(quizzes);
        } else {
            console.error('Error loading quizzes');
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

// Display quizzes
// Display quizzes - FIXED VERSION
async function displayQuizzes(quizzes) {
    const container = document.getElementById('quizzesGrid');
    if (!container) return;
    
    if (quizzes.length === 0) {
        container.innerHTML = `
            <div class="empty-quizzes">
                <i class="fas fa-file-alt"></i>
                <p>You haven't created any quizzes yet.</p>
                <p>Click the "+" button to get started!</p>
            </div>
        `;
        return;
    }

    // Fetch quiz codes for all quizzes
    const quizzesWithCodes = await Promise.all(
        quizzes.map(async (quiz) => {
            try {
                const response = await fetch(`/api/quizzes/${quiz.quiz_id}/code`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    quiz.quiz_code = data.quiz_code;
                } else {
                    quiz.quiz_code = 'N/A';
                }
            } catch (error) {
                console.error('Error fetching quiz code:', error);
                quiz.quiz_code = 'Error';
            }
            return quiz;
        })
    );

    container.innerHTML = quizzesWithCodes.map(quiz => `
        <div class="quiz-item" data-quiz-id="${quiz.quiz_id}">
            ${quiz.image_data ? 
                `<img src="${quiz.image_data}" alt="${quiz.title}" class="quiz-image">` : 
                `<div class="quiz-image" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fas fa-file-alt fa-2x"></i>
                </div>`
            }
            <h3 class="quiz-item-title">${quiz.title}</h3>
            <p class="quiz-item-description">${quiz.description || 'No description'}</p>
            <div class="quiz-item-meta">
                <span><i class="fas fa-question-circle"></i> ${quiz.question_count || 0} questions</span>
                <span><i class="fas fa-${quiz.is_public ? 'globe' : 'lock'}"></i> ${quiz.is_public ? 'Public' : 'Private'}</span>
                ${quiz.quiz_code ? `<span><i class="fas fa-code"></i> ${quiz.quiz_code}</span>` : ''}
            </div>
            <div class="quiz-actions">
                <button class="quiz-action-btn btn-primary-small" onclick="openQuizSettings(${quiz.quiz_id}, ${quiz.is_public})">
                    <i class="fas fa-cog"></i> Settings
                </button>
                <button class="quiz-action-btn btn-outline-small" onclick="viewQuiz(${quiz.quiz_id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

// View quiz
function viewQuiz(quizId) {
    window.location.href = `/quiz/${quizId}`;
}

// Initialize profile picture functionality
function initializeProfilePicture() {
    const profilePic = document.getElementById('profilePicture');
    const profileUpload = document.getElementById('profilePictureInput');

    if (!profilePic || !profileUpload) {
        console.error('Profile picture or upload input not found in DOM');
        return;
    }

    profilePic.onclick = () => {
        profileUpload.click();
    };

    profilePic.oncontextmenu = (e) => {
        e.preventDefault();
        if (confirm('Remove profile picture?')) {
            removeProfilePicture();
        }
    };
}

// Change profile picture function
async function changeProfilePicture(file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        const imageData = e.target.result;
        const userId = getCurrentUserId();
        
        if (!userId) {
            alert('Not signed in. Could not save profile picture.');
            return;
        }

        try {
            const res = await fetch('/api/users/profile-picture', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: userId,
                    profile_picture: imageData
                })
            });

            const data = await res.json();
            
            if (data.success) {
                updateProfilePictureDisplay(imageData);
                alert('Profile picture updated successfully!');
            } else {
                alert('Failed to update profile picture.');
            }
        } catch (error) {
            console.error('Error saving profile picture:', error);
            alert('Error saving profile picture.');
        }
    };
    reader.readAsDataURL(file);
}

// Remove profile picture
async function removeProfilePicture() {
    const userId = getCurrentUserId();
    if (userId) {
        try {
            const res = await fetch(`/api/users/profile-picture/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await res.json();
            
            if (data.success) {
                updateProfilePictureDisplay(null);
                alert('Profile picture removed successfully!');
            } else {
                alert('Failed to remove profile picture.');
            }
        } catch (error) {
            console.error('Error removing profile picture:', error);
            alert('Error removing profile picture.');
        }
    }
}

// Utility functions
function resizeToDataURL(img, maxDim, mime, quality) {
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    if (w > h && w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
    } else if (h >= w && h > maxDim) {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL(mime, quality);
    return { dataUrl, width: w, height: h };
}

function getCurrentUserId() {
    try {
        if (currentUser && currentUser.user_id) {
            return currentUser.user_id;
        }
        
        const token = document.cookie.split('; ').find(row => row.startsWith('token='));
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.user_id;
        }
    } catch (error) {
        console.error('Error getting user ID:', error);
    }
    return null;
}

function updateProfilePictureDisplay(imageData) {
    const profilePic = document.getElementById('profilePicture');
    if (!profilePic) return;

    if (imageData) {
        profilePic.src = imageData;
    } else {
        profilePic.src = 'https://via.placeholder.com/150';
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
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Function to remove selected image
function removeImage() {
    document.getElementById('quizImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('quizImageUpload').value = '';
}


// Edit quiz function
function editQuiz() {
    const quizId = document.getElementById('settingsQuizId').value;
    
    // Close settings modal
    document.getElementById('quizSettingsModal').classList.remove('active');
    
    // Fetch quiz details and open edit modal
    fetchQuizDetails(quizId);
}

// Fetch quiz details for editing
async function fetchQuizDetails(quizId) {
    try {
        const res = await fetch(`/api/quizzes/${quizId}`, {
            credentials: 'include'
        });
        
        if (res.ok) {
            const quiz = await res.json();
            
            // Fill the edit form
            document.getElementById('editQuizId').value = quiz.quiz_id;
            document.getElementById('editQuizTitle').value = quiz.title;
            document.getElementById('editQuizDescription').value = quiz.description || '';
            document.getElementById('editQuizCategory').value = quiz.category || '';
            
            // Show current image if exists
            if (quiz.image_data) {
                document.getElementById('editQuizImage').value = quiz.image_data;
                document.getElementById('editPreviewImg').src = quiz.image_data;
                document.getElementById('editImagePreview').style.display = 'block';
            }
            
            // Open edit modal
            document.getElementById('editQuizModal').classList.add('active');
            
        } else {
            alert('Error loading quiz details');
        }
    } catch (error) {
        console.error('Error fetching quiz details:', error);
        alert('Error loading quiz details');
    }
}

// Handle edit quiz form submission
function setupEditQuizForm() {
    const editQuizForm = document.getElementById('editQuizForm');
    if (editQuizForm) {
        editQuizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const quizData = {
                title: document.getElementById('editQuizTitle').value,
                category: document.getElementById('editQuizCategory').value,
                description: document.getElementById('editQuizDescription').value,
                image_data: document.getElementById('editQuizImage').value || null
            };
            
            const quizId = document.getElementById('editQuizId').value;
            
            try {
                const res = await fetch(`/api/quizzes/${quizId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(quizData)
                });
                
                if (res.ok) {
                    alert('Quiz updated successfully!');
                    document.getElementById('editQuizModal').classList.remove('active');
                    await loadMyQuizzes();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Error updating quiz');
                }
            } catch (error) {
                console.error('Error updating quiz:', error);
                alert('Error updating quiz');
            }
        });
    }
}

// Remove edit image
function removeEditImage() {
    document.getElementById('editQuizImage').value = '';
    document.getElementById('editImagePreview').style.display = 'none';
    document.getElementById('editQuizImageUpload').value = '';
}

// Setup edit quiz image upload
function setupEditQuizImageUpload() {
    const editQuizImageUpload = document.getElementById('editQuizImageUpload');
    const editImagePreview = document.getElementById('editImagePreview');
    const editPreviewImg = document.getElementById('editPreviewImg');
    const editQuizImage = document.getElementById('editQuizImage');
    
    if (editQuizImageUpload) {
        editQuizImageUpload.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Show preview
                    editPreviewImg.src = e.target.result;
                    editImagePreview.style.display = 'block';
                    
                    // Store base64 data in hidden input
                    editQuizImage.value = e.target.result;
                };
                
                reader.readAsDataURL(file);
            }
        });
    }
}
// Add this function to your profile.js
async function loadMyQuizzesWithCodes() {
    try {
        const response = await fetch('/api/my-quizzes', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const quizzes = await response.json();
            const quizzesContainer = document.getElementById('myQuizzesContainer');
            
            if (quizzes.length === 0) {
                quizzesContainer.innerHTML = '<p class="no-quizzes">You haven\'t created any quizzes yet.</p>';
                return;
            }
            
            quizzesContainer.innerHTML = quizzes.map(quiz => `
                <div class="quiz-card" data-quiz-id="${quiz.quiz_id}">
                    ${quiz.image_data ? `<img src="${quiz.image_data}" alt="${quiz.title}" class="quiz-image">` : ''}
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3>
                        <p class="quiz-category">${quiz.category || 'General'}</p>
                        <p class="quiz-description">${quiz.description || 'No description'}</p>
                        <div class="quiz-meta">
                            <span class="quiz-code">
                                <strong>Code:</strong> 
                                <span class="code-value">${quiz.quiz_code || 'Loading...'}</span>
                                <button class="copy-code-btn" onclick="copyQuizCode('${quiz.quiz_code}')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </span>
                            <span class="quiz-visibility ${quiz.is_public ? 'public' : 'private'}">
                                <i class="fas ${quiz.is_public ? 'fa-globe' : 'fa-lock'}"></i>
                                ${quiz.is_public ? 'Public' : 'Private'}
                            </span>
                        </div>
                        <div class="quiz-actions">
                            <button class="btn-primary" onclick="window.location.href='/quiz/${quiz.quiz_id}'">
                                <i class="fas fa-play"></i> Play
                            </button>
                            <button class="btn-outline" onclick="editQuiz(${quiz.quiz_id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
        } else {
            console.error('Failed to load quizzes');
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

// Add copy function
function copyQuizCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Quiz code copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy code', 'error');
    });
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});