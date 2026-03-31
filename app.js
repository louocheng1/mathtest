// 全域變數管理
let currentUser = null;
let userProgress = {};
let currentNode = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // 暫存本次練習的答案狀況

// DOM 元素
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const practicePage = document.getElementById('practice-page');

const studentInput = document.getElementById('student-number');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

// 初始化
function init() {
    setupEventListeners();
    checkAutoLogin();
}

function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    studentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('back-btn').addEventListener('click', showDashboard);
    document.getElementById('prev-btn').addEventListener('click', prevQuestion);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
    document.getElementById('finish-btn').addEventListener('click', finishPractice);
}

// 登入處理
function handleLogin() {
    const num = studentInput.value.trim();
    if (!num) {
        showError('請輸入號碼');
        return;
    }

    if (STUDENT_MAPPING[num]) {
        currentUser = { ...STUDENT_MAPPING[num], id: num };
        localStorage.setItem('quiz_user_id', num);
        loadUserProgress(num);
        showDashboard();
    } else {
        showError('找不到該號碼，請重新輸入 (試試 2, 4, 9)');
    }
}

function checkAutoLogin() {
    const savedId = localStorage.getItem('quiz_user_id');
    if (savedId && STUDENT_MAPPING[savedId]) {
        currentUser = { ...STUDENT_MAPPING[savedId], id: savedId };
        loadUserProgress(savedId);
        showDashboard();
    }
}

function handleLogout() {
    localStorage.removeItem('quiz_user_id');
    currentUser = null;
    hideAllPages();
    loginPage.classList.add('active');
}

// 進度管理
function loadUserProgress(userId) {
    const savedProgress = localStorage.getItem(`quiz_progress_${userId}`);
    userProgress = savedProgress ? JSON.parse(savedProgress) : {};
}

function saveProgress() {
    if (currentUser) {
        localStorage.setItem(`quiz_progress_${currentUser.id}`, JSON.stringify(userProgress));
    }
}

// 導航
function hideAllPages() {
    [loginPage, dashboardPage, practicePage].forEach(p => p.classList.remove('active'));
}

function showDashboard() {
    hideAllPages();
    dashboardPage.classList.add('active');
    document.getElementById('user-name').textContent = `${currentUser.name} 同學`;
    renderNodes();
}

function renderNodes() {
    const grid = document.getElementById('nodes-grid');
    grid.innerHTML = '';

    currentUser.weakNodes.forEach(nodeCode => {
        const isCompleted = userProgress[nodeCode] === true;
        const description = NODES_DESCRIPTIONS[nodeCode] || "數學知識點";
        
        const card = document.createElement('div');
        card.className = 'node-card';
        card.innerHTML = `
            <div>
                <span class="node-code">${nodeCode}</span>
                <h3 class="node-name">${description}</h3>
                <span class="status-badge ${isCompleted ? 'completed' : ''}">
                    ${isCompleted ? '✓ 練習完成' : '未練習'}
                </span>
            </div>
            <button class="btn-outline" style="margin-top: 20px" onclick="startPractice('${nodeCode}')">
                ${isCompleted ? '再次挑戰' : '開始練習'}
            </button>
        `;
        grid.appendChild(card);
    });
}

// 練習邏輯
window.startPractice = function(nodeCode) {
    currentNode = nodeCode;
    currentQuestions = QUESTION_BANK[nodeCode] || [];
    currentQuestionIndex = 0;
    userAnswers = {}; // 重置作答
    
    if (currentQuestions.length === 0) {
        alert("目前該章節尚無題目。");
        return;
    }

    hideAllPages();
    practicePage.classList.add('active');
    document.getElementById('current-node-title').textContent = nodeCode;
    updateQuestionUI();
};

function updateQuestionUI() {
    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('question-number').textContent = `第 ${currentQuestionIndex + 1} / ${currentQuestions.length} 題`;
    document.getElementById('question-text').textContent = q.q;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    const feedbackArea = document.getElementById('feedback-area');
    feedbackArea.classList.add('hidden');

    const previousAnswer = userAnswers[currentQuestionIndex];

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<strong>${String.fromCharCode(65 + idx)}.</strong> ${opt}`;
        
        btn.addEventListener('click', () => handleOptionSelect(idx));
        
        // 如果已經作答過
        if (previousAnswer !== undefined) {
            btn.disabled = true;
            if (idx === q.correct) btn.classList.add('correct');
            if (idx === previousAnswer && idx !== q.correct) btn.classList.add('wrong');
        }

        optionsContainer.appendChild(btn);
    });

    if (previousAnswer !== undefined) showFeedback(previousAnswer === q.correct);

    // 按鈕控制
    document.getElementById('prev-btn').style.visibility = (currentQuestionIndex > 0) ? 'visible' : 'hidden';
    
    const isLast = currentQuestionIndex === currentQuestions.length - 1;
    document.getElementById('next-btn').classList.toggle('hidden', isLast);
    document.getElementById('finish-btn').classList.toggle('hidden', !isLast);
    
    // 進度條
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
}

function handleOptionSelect(index) {
    const q = currentQuestions[currentQuestionIndex];
    userAnswers[currentQuestionIndex] = index;
    
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correct) btn.classList.add('correct');
        if (idx === index && idx !== q.correct) btn.classList.add('wrong');
    });

    showFeedback(index === q.correct);
}

function showFeedback(isCorrect) {
    const q = currentQuestions[currentQuestionIndex];
    const feedbackArea = document.getElementById('feedback-area');
    const banner = document.getElementById('result-banner');
    
    feedbackArea.classList.remove('hidden');
    banner.textContent = isCorrect ? '✨ 太棒了！答對了！' : '📌 加油！正確答案如上標示。';
    banner.className = `result-banner ${isCorrect ? 'success' : 'error'}`;
    
    document.getElementById('explanation-text').textContent = q.exp;
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        updateQuestionUI();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateQuestionUI();
    }
}

function finishPractice() {
    // 檢查是否全部作答完畢
    if (Object.keys(userAnswers).length < currentQuestions.length) {
        alert("請完成所有題目後再完成練習。");
        return;
    }
    
    userProgress[currentNode] = true;
    saveProgress();
    alert("恭喜完成這項弱點的練習！");
    showDashboard();
}

function showError(msg) {
    loginError.textContent = msg;
    setTimeout(() => { loginError.textContent = ''; }, 3000);
}

// 啟動應用
init();
