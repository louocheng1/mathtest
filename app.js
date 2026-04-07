// 全域變數管理
let currentUser = null;
let userProgress = {};
let currentNode = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // 暫存本次練習的答案狀況
let currentLevel = 'beginner'; // 預設難度

// DOM 元素
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const practicePage = document.getElementById('practice-page');
const teacherPage = document.getElementById('teacher-page');

const studentInput = document.getElementById('student-number');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

// 新增追蹤變數
let practiceStartTime = null;
let customMapping = JSON.parse(localStorage.getItem('custom_student_mapping'));

// 獲取目前的學生清單（優先使用自定義）
function getMapping() {
    return customMapping || STUDENT_MAPPING;
}

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

    // 難度選擇
    document.querySelectorAll('.diff-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.diff-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentLevel = e.target.dataset.level;
            renderNodes(); // 重新渲染卡片狀態
        });
    });

    // 教師端監聽
    document.getElementById('teacher-back-btn').addEventListener('click', handleLogout);
    document.getElementById('refresh-btn').addEventListener('click', renderTeacherDashboard);
    document.getElementById('student-search').addEventListener('input', renderTeacherDashboard);
    document.getElementById('clear-records-btn').addEventListener('click', clearRecords);
    
    // ODS 上傳處理
    const odsInput = document.getElementById('ods-input');
    const dropZone = document.getElementById('drop-zone');

    odsInput.addEventListener('change', (e) => handleOdsUpload(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleOdsUpload(e.dataTransfer.files[0]);
    });
}

// 登入處理
function handleLogin() {
    const num = studentInput.value.trim();
    if (!num) {
        showError('請輸入號碼');
        return;
    }

    // 教師登入判斷
    if (num.toLowerCase() === 'admin' || num === 'teacher') {
        showTeacherPage();
        return;
    }

    const mapping = getMapping();
    if (mapping[num]) {
        currentUser = { ...mapping[num], id: num };
        localStorage.setItem('quiz_user_id', num);
        loadUserProgress(num);
        showDashboard();
    } else {
        showError('找不到該號碼，請重新輸入');
    }
}

function checkAutoLogin() {
    const savedId = localStorage.getItem('quiz_user_id');
    const mapping = getMapping();
    if (savedId && mapping[savedId]) {
        currentUser = { ...mapping[savedId], id: savedId };
        loadUserProgress(savedId);
        showDashboard();
    }
}

function handleLogout() {
    localStorage.removeItem('quiz_user_id');
    currentUser = null;
    userProgress = {}; // 清除進度暫存
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
    [loginPage, dashboardPage, practicePage, teacherPage].forEach(p => p.classList.remove('active'));
}

function showDashboard() {
    hideAllPages();
    dashboardPage.classList.add('active');
    document.getElementById('user-name').textContent = `${currentUser.name} 同學`;
    renderNodes();
}

function showTeacherPage() {
    hideAllPages();
    teacherPage.classList.add('active');
    renderTeacherDashboard();
    
    // 每 30 秒自動重新整理數據 (動態監控)
    if (window.teacherInterval) clearInterval(window.teacherInterval);
    window.teacherInterval = setInterval(() => {
        if (teacherPage.classList.contains('active')) {
            renderTeacherDashboard();
        } else {
            clearInterval(window.teacherInterval);
        }
    }, 30000);
}

function renderNodes() {
    const grid = document.getElementById('nodes-grid');
    grid.innerHTML = '';

    // 使用 Set 確保沒有重複的弱點卡片
    const uniqueWeakNodes = [...new Set(currentUser.weakNodes)];

    uniqueWeakNodes.forEach(nodeCode => {
        const isCompleted = userProgress[`${nodeCode}_${currentLevel}`] === true;
        const lastScore = userProgress[`${nodeCode}_${currentLevel}_score`];
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
                ${isCompleted && lastScore ? `<span class="last-score">上次得分：${lastScore}</span>` : ''}
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
    const levelQuestions = (QUESTION_BANK[nodeCode] && QUESTION_BANK[nodeCode][currentLevel]) ? QUESTION_BANK[nodeCode][currentLevel] : [];
    
    currentQuestions = levelQuestions.slice(0, 5);
    currentQuestionIndex = 0;
    userAnswers = {}; 
    practiceStartTime = new Date(); // 紀錄開始時間
    
    if (currentQuestions.length === 0) {
        alert("目前該難度尚無題目。");
        return;
    }

    hideAllPages();
    practicePage.classList.add('active');
    
    const levelName = { 'beginner': '初級', 'intermediate': '中級', 'advanced': '高級' }[currentLevel];
    document.getElementById('current-node-title').textContent = `${nodeCode} (${levelName})`;
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
    if (Object.keys(userAnswers).length < currentQuestions.length) {
        alert("請完成所有題目後再完成練習。");
        return;
    }
    
    const endTime = new Date();
    const duration = Math.floor((endTime - practiceStartTime) / 1000); // 秒
    let correctCount = 0;
    currentQuestions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correct) correctCount++;
    });

    // 將該節點在該難度的狀態記為完成
    userProgress[`${currentNode}_${currentLevel}`] = true;
    userProgress[`${currentNode}_${currentLevel}_score`] = `${correctCount}/${currentQuestions.length}`;
    saveProgress();

    // 紀錄數據提供給教師後台
    saveQuizRecord(correctCount, currentQuestions.length, duration);

    alert(`恭喜完成！答對 ${correctCount} / ${currentQuestions.length} 題。`);
    showDashboard();
}

function saveQuizRecord(correct, total, seconds) {
    const records = JSON.parse(localStorage.getItem('quiz_total_records') || '[]');
    records.push({
        studentId: currentUser.id,
        name: currentUser.name,
        node: currentNode,
        level: currentLevel,
        score: `${correct}/${total}`,
        accuracy: Math.round((correct / total) * 100) + '%',
        duration: seconds,
        time: new Date().toLocaleString()
    });
    localStorage.setItem('quiz_total_records', JSON.stringify(records));
}

// 教師後台邏輯
function handleOdsUpload(file) {
    if (!file) return;
    const status = document.getElementById('upload-status');
    status.textContent = "正在處理檔案...";
    status.className = "status-msg";

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            // 解析邏輯 (兼容 sync_to_web.py 格式)
            // 尋找答對率為 0 的節點
            const newMapping = {};
            const headers = jsonData[2]; // 假設標題在第三列
            
            for (let i = 3; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;
                
                const nameStr = String(row[2]); // 姓名通常在第三欄
                const match = nameStr.match(/(\d+)號/);
                const id = match ? match[1] : `ID_${i}`;
                const name = nameStr.split('號').pop().trim();
                
                const weakNodes = [];
                for (let j = 3; j < row.length; j++) {
                    const cellValue = row[j];
                    if (cellValue === 0) {
                        const nodeCode = headers[j].split(' ')[0];
                        if (nodeCode.includes('-')) weakNodes.push(nodeCode);
                    }
                }
                
                newMapping[id] = {
                    name: name,
                    fullName: nameStr,
                    weakNodes: weakNodes
                };
            }

            customMapping = newMapping;
            localStorage.setItem('custom_student_mapping', JSON.stringify(newMapping));
            status.textContent = "✅ 名單更新成功！可在後台查看最新資料。";
            status.classList.add('success');
            renderTeacherDashboard();
        } catch (err) {
            console.error(err);
            status.textContent = "❌ 解析失敗，請檢查檔案格式。";
            status.classList.add('error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function renderTeacherDashboard() {
    renderProgressOverview();
    renderActivityLog();
}

function renderProgressOverview() {
    const tbody = document.getElementById('summary-tbody');
    const mapping = getMapping();
    if (!tbody) return;
    tbody.innerHTML = '';

    Object.keys(mapping).sort((a, b) => parseInt(a) - parseInt(b)).forEach(id => {
        const student = mapping[id];
        const studentWeakNodes = [...new Set(student.weakNodes || [])];
        const totalPossible = studentWeakNodes.length;
        
        // 載入該學生的進度
        const studentProgressStr = localStorage.getItem(`quiz_progress_${id}`);
        const progress = studentProgressStr ? JSON.parse(studentProgressStr) : {};
        
        let completedCount = 0;
        let bCount = 0, iCount = 0, aCount = 0;

        studentWeakNodes.forEach(node => {
            if (progress[`${node}_beginner`]) { completedCount++; bCount++; }
            if (progress[`${node}_intermediate`]) { completedCount++; iCount++; }
            if (progress[`${node}_advanced`]) { completedCount++; aCount++; }
        });

        const totalTasks = totalPossible * 3; // 三個難度
        const percent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${id}</td>
            <td>${student.name}</td>
            <td>${totalPossible} 個弱點</td>
            <td>${bCount} / ${iCount} / ${aCount}</td>
            <td>${percent}%</td>
            <td>
                <span class="progress-tag ${percent >= 80 ? 'high' : 'low'}">
                    ${percent >= 80 ? '表現優異' : percent >= 30 ? '穩定練習' : '尚未開始'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderActivityLog() {
    const tbody = document.getElementById('report-tbody');
    const search = document.getElementById('student-search').value.toLowerCase();
    const records = JSON.parse(localStorage.getItem('quiz_total_records') || '[]');
    
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // 過濾搜尋 (加上安全檢查)
    const filtered = records.filter(r => {
        const nameMatch = r.name && String(r.name).toLowerCase().includes(search);
        const idMatch = r.studentId && String(r.studentId).includes(search);
        return nameMatch || idMatch;
    }).reverse();

    filtered.forEach(r => {
        const tr = document.createElement('tr');
        const levelName = { 'beginner': '初級', 'intermediate': '中級', 'advanced': '高級' }[r.level];
        const nodeTitle = NODES_DESCRIPTIONS[r.node] || r.node;
        tr.innerHTML = `
            <td>${r.studentId}</td>
            <td>${r.name}</td>
            <td><span class="node-code" style="margin:0">${r.node}</span><br>${nodeTitle}</td>
            <td>${levelName}</td>
            <td>${r.accuracy} (${r.score})</td>
            <td>${formatDuration(r.duration)}</td>
            <td>${r.time}</td>
        `;
        tbody.appendChild(tr);
    });
}

function clearRecords() {
    if (confirm("確定要清空所有活動紀錄嗎？這不會影響學生的練習進度。")) {
        localStorage.removeItem('quiz_total_records');
        renderTeacherDashboard();
    }
}

function formatDuration(sec) {
    if (sec < 60) return sec + '秒';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${s}秒`;
}

function showError(msg) {
    loginError.textContent = msg;
    setTimeout(() => { loginError.textContent = ''; }, 3000);
}

init();
