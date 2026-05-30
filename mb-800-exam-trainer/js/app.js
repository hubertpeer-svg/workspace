// ============================================
// MB-800 EXAM TRAINER - MAIN APPLICATION
// ============================================

// State
let state = { mode: 'menu', screen: 'login' };
let pool = [...Q];
let currentIndex = 0;
let userAnswers = {};
let score = 0;
let timer = null;
let timeLeft = 0;
let examMode = false;
let examStartTime = null;

// Configuration
const config = {
  shuffle: true,
  showExplain: true,
  questionCount: 10,
  topics: [],
  types: [],
  smartMode: null
};

// Initialize the app
function init() {
  loadUsers();
  applyUTF8ToQuestions(Q);
  
  const savedUser = localStorage.getItem('mb800_activeUser');
  if (savedUser) {
    setActiveUser(savedUser);
  }
  
  state.screen = 'login';
  render();
}

// ============================================
// RENDERING
// ============================================

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  
  switch(state.screen) {
    case 'login': renderLogin(); break;
    case 'menu': renderMenu(); break;
    case 'quiz': renderQuiz(); break;
    case 'review': renderReview(); break;
    case 'stats': renderStats(); break;
    case 'smart': renderSmartModes(); break;
  }
}

// ============================================
// LOGIN SCREEN
// ============================================

function renderLogin() {
  const userListHtml = Array.isArray(users) ? users.map(u => {
    if (!u || !u.name) return '';
    const stats = getUserStats(u);
    const total = Object.keys(stats.questions || {}).length;
    const correct = Object.values(stats.questions || {}).filter(a => a).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return `
      <div class="user-btn" onclick="selectUser('${u.name.replace(/'/g, "\\'")}')">
        <div class="user-avatar">${u.name.charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${u.name}</div>
          <div class="user-stats-line">${total} Fragen • ${correct} richtig (${pct}%)</div>
        </div>
        <button class="delete-user" onclick="event.stopPropagation(); deleteUserPrompt('${u.name.replace(/'/g, "\\'")}')">🗑️</button>
      </div>
    `;
  }).join('') : '';

  const html = `
    <div class="login-wrap">
      <h1 class="login-title">MB-800 <span class="accent">Exam Trainer</span></h1>
      <p class="login-sub">Dynamics 365 Business Central</p>

      <div class="changelog-toggle mb-4">
        <button class="btn btn-secondary btn-full" onclick="toggleChangelog()">
          📋 Was ist neu? <span id="changelog-arrow">▼</span>
        </button>
        <div id="changelog-content" class="changelog-content" style="display:none;">
          <h3>MB-800 Exam Trainer v8</h3>
          <ul>
            <li>Modulare Struktur (HTML, CSS, JS getrennt)</li>
            <li>286 Fragen + Korrekturen aus v7</li>
            <li>Hotspot-Fragen unterstützt</li>
            <li>Benutzerverwaltung mit Statistiken</li>
            <li>Smart Modes (Neue Fragen, Häufige Fehler)</li>
          </ul>
        </div>
      </div>

      <div class="user-list">
        ${userListHtml}
      </div>

      <div class="new-user-row">
        <input type="text" class="new-user-input" id="newUserInput" placeholder="Neuer Benutzer..." onkeypress="if(event.key==='Enter') addNewUser()">
        <button class="btn btn-primary" onclick="addNewUser()">+</button>
      </div>

      <div style="margin-top:24px;">
        <button class="btn btn-primary btn-full" onclick="startWithActiveUser()" ${!activeUser ? 'disabled' : ''}>Weiter</button>
      </div>
    </div>
  `;

  if (app) app.innerHTML = html;

  if (activeUser && Array.isArray(users)) {
    const activeBtn = document.querySelector(`.user-btn[onclick="selectUser('${activeUser.name.replace(/'/g, "\\'")}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
}

function toggleChangelog() {
  const content = document.getElementById('changelog-content');
  const arrow = document.getElementById('changelog-arrow');
  if (!content || !arrow) return;
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.textContent = '▲';
  } else {
    content.style.display = 'none';
    arrow.textContent = '▼';
  }
}

function selectUser(name) {
  setActiveUser(name);
  renderLogin();
}

function addNewUser() {
  const input = document.getElementById('newUserInput');
  if (!input) return;
  const name = input.value.trim();
  if (addUser(name)) {
    setActiveUser(name);
    input.value = '';
    renderLogin();
  } else {
    alert('Benutzername existiert bereits oder ist ungültig.');
  }
}

function deleteUserPrompt(name) {
  if (confirm(`Benutzer "${name}" wirklich löschen?`)) {
    deleteUser(name);
    if (activeUser && activeUser.name === name) activeUser = null;
    renderLogin();
  }
}

function startWithActiveUser() {
  if (!activeUser && Array.isArray(users) && users.length > 0) {
    setActiveUser(users[0].name);
  }
  if (activeUser) {
    state.screen = 'menu';
    render();
  }
}

// ============================================
// MENU SCREEN
// ============================================

function renderMenu() {
  if (!activeUser) {
    state.screen = 'login';
    render();
    return;
  }

  const stats = getUserStats(activeUser);
  const totalQuestions = Q.length;
  const answered = Object.keys(stats.questions || {}).length;
  const correct = Object.values(stats.questions || {}).filter(a => a).length;
  const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  const topicCounts = {};
  Q.forEach(q => {
    topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
  });

  const typeCounts = {};
  Q.forEach(q => {
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
  });

  const html = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <h1>MB-800 <span class="accent">Exam Trainer</span></h1>
          <p class="subtitle">Angemeldet als: <strong>${activeUser.name}</strong></p>
        </div>
        <button class="btn btn-secondary" onclick="logout();render();">↩ Abmelden</button>
      </div>

      <div class="stat-grid mb-6">
        <div class="stat-card">
          <div class="stat-val">${totalQuestions}</div>
          <div class="stat-label">Fragen gesamt</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${answered}</div>
          <div class="stat-label">Beantwortet</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:var(--green);">${correct}</div>
          <div class="stat-label">Richtig</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${pct}%</div>
          <div class="stat-label">Erfolgsquote</div>
        </div>
      </div>

      <div class="start-grid mb-6">
        <button class="start-btn practice" onclick="startSmartMode()">
          <div class="title">🎯 Intelligentes Üben</div>
          <div class="desc">Empfohlene Fragen</div>
        </button>
        <button class="start-btn practice" onclick="startPractice()">
          <div class="title">📚 Übungsmodus</div>
          <div class="desc">Mit Feedback</div>
        </button>
        <button class="start-btn exam" onclick="startExam()">
          <div class="title">📝 Prüfungssimulation</div>
          <div class="desc">100 Minuten Timer</div>
        </button>
        <button class="start-btn practice" onclick="showStats()">
          <div class="title">📊 Statistiken</div>
          <div class="desc">Auswertung</div>
        </button>
      </div>

      <div class="settings mb-6">
        <div class="section-title mb-3">Themen Filter</div>
        <div class="topic-grid">
          ${Object.entries(topicNames).map(([key, name]) => {
            const count = topicCounts[key] || 0;
            const isActive = config.topics.includes(key);
            return `
              <button class="topic-btn ${isActive ? 'active' : ''}" onclick="toggleTopic('${key}')">
                <div class="topic-row">
                  <span class="name">${name}</span>
                  <span class="count">${count}</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="settings mb-6">
        <div class="section-title mb-3">Fragetypen Filter</div>
        <div class="filter-row">
          ${Object.entries(typeNames).map(([key, name]) => {
            const count = typeCounts[key] || 0;
            const isActive = config.types.includes(key);
            return `
              <span class="badge badge-${key} badge-filter ${isActive ? 'active' : ''}" onclick="toggleType('${key}')">
                ${name} (${count})
              </span>
            `;
          }).join('')}
        </div>
      </div>

      <div class="settings mb-6">
        <div class="section-title mb-3">Einstellungen</div>
        <label>
          <input type="checkbox" ${config.shuffle ? 'checked' : ''} onclick="config.shuffle=!config.shuffle;renderMenu()">
          Fragen mischen
        </label>
        <label>
          <input type="checkbox" ${config.showExplain ? 'checked' : ''} onclick="config.showExplain=!config.showExplain">
          Erklärungen anzeigen
        </label>
        <label>
          Fragenanzahl:
          <select onchange="config.questionCount=parseInt(this.value)">
            <option value="10" ${config.questionCount===10?'selected':''}>10</option>
            <option value="20" ${config.questionCount===20?'selected':''}>20</option>
            <option value="50" ${config.questionCount===50?'selected':''}>50</option>
            <option value="999" ${config.questionCount===999?'selected':''}>Alle (${Q.length})</option>
          </select>
        </label>
      </div>

      <div style="margin-top:24px;">
        <button class="btn btn-secondary btn-full" onclick="resetAll()">🔄 Alle Filter zurücksetzen</button>
      </div>
    </div>
  `;

  if (document.getElementById('app')) {
    document.getElementById('app').innerHTML = html;
  }
}

function toggleTopic(topic) {
  const idx = config.topics.indexOf(topic);
  if (idx > -1) config.topics.splice(idx, 1);
  else config.topics.push(topic);
  renderMenu();
}

function toggleType(type) {
  const idx = config.types.indexOf(type);
  if (idx > -1) config.types.splice(idx, 1);
  else config.types.push(type);
  renderMenu();
}

function resetAll() {
  config.topics = [];
  config.types = [];
  config.shuffle = true;
  config.showExplain = true;
  config.questionCount = 10;
  renderMenu();
}

// ============================================
// SMART MODES
// ============================================

function renderSmartModes() {
  const stats = getUserStats(activeUser);

  const modes = [
    {
      id: 'new',
      name: '🆕 Neue Fragen',
      desc: 'Noch nicht beantwortet',
      icon: '🆕',
      getQuestions: () => Q.filter(q => !stats.questions[q.id])
    },
    {
      id: 'errors',
      name: '🔴 Häufigste Fehler',
      desc: 'Am häufigsten falsch',
      icon: '🔴',
      getQuestions: () => {
        const wrong = Object.entries(stats.questions || {}).filter(([id, correct]) => !correct).map(([id]) => parseInt(id));
        return Q.filter(q => wrong.includes(q.id));
      }
    }
  ];

  let html = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h1>Intelligente Übungsmodi</h1>
        <button class="btn btn-secondary" onclick="state.screen='menu';render()">↩ Zurück</button>
      </div>
      <div class="smart-grid">
  `;

  modes.forEach(mode => {
    const questions = mode.getQuestions();
    const count = Math.min(questions.length, config.questionCount === 999 ? questions.length : config.questionCount);
    const disabled = count === 0;
    html += `
        <button class="smart-btn ${disabled ? 'disabled' : ''}" onclick="${disabled ? '' : `startSmart('${mode.id}')`}">
          <div class="s-icon">${mode.icon}</div>
          <div class="s-title">${mode.name}</div>
          <div class="s-desc">${mode.desc} (${count} Fragen)</div>
        </button>
    `;
  });

  html += `
      </div>
      <div style="margin-top:24px;">
        <button class="btn btn-secondary btn-full" onclick="state.screen='menu';render()">Abbrechen</button>
      </div>
    </div>
  `;

  if (document.getElementById('app')) {
    document.getElementById('app').innerHTML = html;
  }
  state.screen = 'smart';
}

function startSmart(modeId) {
  config.smartMode = modeId;
  startQuiz();
}

// ============================================
// QUIZ LOGIC
// ============================================

function startPractice() {
  examMode = false;
  startQuiz();
}

function startExam() {
  examMode = true;
  examStartTime = Date.now();
  timeLeft = 60 * 100; // 100 minutes
  startQuiz();
  startExamTimer();
}

function startQuiz() {
  let filtered = [...Q];

  if (config.topics.length > 0) {
    filtered = filtered.filter(q => config.topics.includes(q.topic));
  }

  if (config.types.length > 0) {
    filtered = filtered.filter(q => config.types.includes(q.type));
  }

  if (config.smartMode) {
    const modes = {
      'new': () => filtered.filter(q => !getUserStats(activeUser).questions[q.id]),
      'errors': () => {
        const stats = getUserStats(activeUser);
        const wrong = Object.entries(stats.questions || {}).filter(([id, c]) => !c).map(([id]) => parseInt(id));
        return filtered.filter(q => wrong.includes(q.id));
      }
    };
    if (modes[config.smartMode]) {
      filtered = modes[config.smartMode]();
    }
  }

  if (config.questionCount !== 999) {
    filtered = filtered.slice(0, config.questionCount);
  }

  if (config.shuffle) {
    filtered = shuffleArray(filtered);
  }

  pool = filtered;
  currentIndex = 0;
  userAnswers = {};
  score = 0;
  state.mode = 'quiz';
  state.screen = 'quiz';

  loadQuestion();
}

function loadQuestion() {
  if (currentIndex >= pool.length) {
    finishQuiz();
    return;
  }

  currentQ = pool[currentIndex];
  const stats = getUserStats(activeUser);
  const prevAnswer = (stats.questions || {})[currentQ?.id];

  let html = `
    <div>
      <div class="topbar">
        <button class="topbar-quit" onclick="confirmQuit()">↩ Abbrechen</button>
        <div class="topbar-score ${score >= currentIndex * 0.7 ? 'good' : score >= currentIndex * 0.5 ? '' : 'mid'}">
          Frage ${currentIndex + 1} von ${pool.length} • ${score} Punkte
        </div>
        ${examMode ? '<div class="timer" id="examTimer">⏳ 100:00</div>' : ''}
      </div>

      <div class="progress-track">
        <div class="progress-fill" style="width:${(currentIndex / pool.length) * 100}%"></div>
      </div>

      <div id="question-container">
        <div class="question-text">${currentQ.text}</div>
      </div>

      <div id="options-container"></div>

      <div class="btn-row" style="margin-top:20px;">
        <button class="btn btn-secondary" onclick="previousQuestion()" ${currentIndex === 0 ? 'disabled' : ''}>← Zurück</button>
        <button class="btn btn-primary" onclick="checkAnswer()" id="submitBtn">Antwort prüfen</button>
        <button class="btn btn-secondary" onclick="nextQuestion()">Weiter →</button>
      </div>
    </div>
  `;

  if (document.getElementById('app')) {
    document.getElementById('app').innerHTML = html;
  }

  renderOptions(currentQ, prevAnswer);

  if (examMode) updateExamTimer();
}

function renderOptions(q, prevAnswer) {
  const container = document.getElementById('options-container');
  if (!container) return;

  switch(q.type) {
    case 'single':
      container.innerHTML = q.options.map(opt => {
        const isSelected = prevAnswer === opt.l;
        return `
          <div class="option ${isSelected ? 'selected' : ''}" onclick="selectOption('${q.id}', '${opt.l}')">
            <div class="option-letter">${opt.l}</div>
            <div class="option-text">${opt.t}</div>
          </div>
        `;
      }).join('');
      break;

    case 'multi':
      container.innerHTML = q.options.map(opt => {
        const isSelected = prevAnswer?.includes(opt.l);
        const isDimmed = userAnswers[q.id] && userAnswers[q.id].length >= q.answer.length && !isSelected;
        return `
          <div class="option ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}" onclick="toggleOption('${q.id}', '${opt.l}')">
            <div class="option-letter">${opt.l}</div>
            <div class="option-text">${opt.t}</div>
          </div>
        `;
      }).join('');
      break;

    case 'hotspot':
      container.innerHTML = `
        <div class="hotspot-container">
          ${q.image ? `<img src="${q.image}" class="hotspot-image" alt="Hotspot Question" />` : ''}
          ${q.hotspotAreas?.map(area => `
            <div class="hotspot-area" style="left:${area.x}px;top:${area.y}px;width:${area.width}px;height:${area.height}px;"
                 onclick="selectHotspot('${area.id}', '${q.id}')"
                 id="hotspot-${q.id}-${area.id}">
              <div class="hotspot-label" style="top:-20px;left:0;">${area.label}</div>
            </div>
          `).join('')}
        </div>
      `;
      break;

    case 'ordering':
      container.innerHTML = `
        <div id="ordering-container">
          ${q.options.map((opt, idx) => `
            <div class="ordering-item" data-order="${opt.l}" draggable="true">
              <div class="ordering-num">${idx + 1}</div>
              <div class="ordering-text">${opt.t}</div>
              <div class="drag-handle">☰</div>
            </div>
          `).join('')}
        </div>
        <script>
          // Initialize ordering state
          if (!state.ordering) state.ordering = [];
          if (state.ordering.length === 0) {
            state.ordering = [...q.options.map(o => o.l)].sort(() => Math.random() - 0.5);
          }
          
          // Re-render ordering items
          document.querySelectorAll('.ordering-item').forEach((item, idx) => {
            item.dataset.order = state.ordering[idx];
          });
          
          // Set up drag and drop
          let dragSrcIdx = null;
          document.querySelectorAll('.ordering-item').forEach(item => {
            item.addEventListener('dragstart', function(e) {
              if (state.answered) return;
              dragSrcIdx = state.ordering.indexOf(this.dataset.order);
              this.classList.add('dragging');
              e.dataTransfer.effectAllowed = 'move';
            });
            
            item.addEventListener('dragover', function(e) {
              e.preventDefault();
              this.classList.add('drag-over');
            });
            
            item.addEventListener('dragleave', function() {
              this.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', function(e) {
              e.preventDefault();
              if (dragSrcIdx === null) return;
              const dropIdx = state.ordering.indexOf(this.dataset.order);
              [state.ordering[dragSrcIdx], state.ordering[dropIdx]] = [state.ordering[dropIdx], state.ordering[dragSrcIdx]];
              dragSrcIdx = null;
              loadQuestion();
            });
            
            item.addEventListener('dragend', function() {
              this.classList.remove('dragging');
              document.querySelectorAll('.ordering-item').forEach(i => i.classList.remove('drag-over'));
            });
          });
        <\/script>
      `;
      break;

    case 'matching':
      container.innerHTML = `
        <div class="matching-container">
          <div class="section-title mb-3">Stems</div>
          <div id="matching-stems">
            ${q.stems.map((stem, idx) => `
              <div class="match-item" data-stem="${idx}" onclick="selectStem(${idx})">
                ${stem}
              </div>
            `).join('')}
          </div>
          <div class="section-title mb-3" style="margin-top:16px;">Options</div>
          <div id="matching-options">
            ${q.options.map((opt, idx) => `
              <div class="match-item" data-opt="${idx}" onclick="selectOptionForMatching(${idx})">
                ${opt.t}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      break;
  }
}

function selectOption(qId, option) {
  userAnswers[qId] = option;
  renderOptions(Q.find(q => q.id == qId), option);
}

function toggleOption(qId, option) {
  if (!userAnswers[qId]) userAnswers[qId] = [];
  const idx = userAnswers[qId].indexOf(option);
  if (idx > -1) {
    userAnswers[qId].splice(idx, 1);
  } else {
    if (userAnswers[qId].length < Q.find(q => q.id == qId).answer.length) {
      userAnswers[qId].push(option);
    }
  }
  renderOptions(Q.find(q => q.id == qId));
}

function selectHotspot(areaId, questionId) {
  if (!userAnswers[questionId]) userAnswers[questionId] = [];
  userAnswers[questionId] = [areaId];

  document.querySelectorAll('.hotspot-area').forEach(el => {
    el.classList.remove('selected');
  });
  const selectedEl = document.getElementById(`hotspot-${questionId}-${areaId}`);
  if (selectedEl) selectedEl.classList.add('selected');
}

function checkAnswer() {
  if (!currentQ) return;

  const q = currentQ;
  const userAnswer = userAnswers[q.id];
  const correctAnswer = q.answer;

  let isCorrect = isAnswerCorrect(q, userAnswer);

  recordAnswer(q.id, isCorrect);

  if (isCorrect) {
    score++;
    if (!examMode) {
      document.getElementById('options-container').innerHTML += `
        <div class="explain pass mb-4">
          <div class="explain-header">✅ Richtig!</div>
          <div class="explain-body">${q.explain || 'Deine Antwort ist korrekt.'}</div>
        </div>
      `;
    }
  } else {
    if (!examMode) {
      document.getElementById('options-container').innerHTML += `
        <div class="explain fail mb-4">
          <div class="explain-header">❌ Falsch</div>
          <div class="explain-body">${q.explain || 'Versuche es noch einmal.'}</div>
        </div>
      `;
    }
  }

  highlightAnswers(q, isCorrect);
  disableOptions();

  document.getElementById('submitBtn').disabled = true;
  document.getElementById('submitBtn').textContent = 'Weiter →';

  if (examMode) {
    setTimeout(() => nextQuestion(), 1500);
  }
}

function highlightAnswers(q, isCorrect) {
  switch(q.type) {
    case 'single':
      document.querySelectorAll('.option').forEach(opt => {
        const letter = opt.querySelector('.option-letter').textContent;
        if (q.answer.includes(letter)) {
          opt.classList.add('correct');
        } else if (userAnswers[q.id] === letter) {
          opt.classList.add('wrong');
        }
      });
      break;
    case 'multi':
      document.querySelectorAll('.option').forEach(opt => {
        const letter = opt.querySelector('.option-letter').textContent;
        if (q.answer.includes(letter)) {
          opt.classList.add('correct');
        } else if (userAnswers[q.id]?.includes(letter)) {
          opt.classList.add('wrong');
        }
      });
      break;
    case 'hotspot':
      document.querySelectorAll('.hotspot-area').forEach(area => {
        const areaId = area.id.split('-').pop();
        if (q.answer.includes(areaId)) {
          area.classList.add('correct');
        } else if (userAnswers[q.id]?.includes(areaId)) {
          area.classList.add('wrong');
        }
      });
      break;
  }
}

function disableOptions() {
  document.querySelectorAll('.option, .hotspot-area, .ordering-item').forEach(el => {
    el.classList.add('locked');
    el.style.cursor = 'default';
  });
}

function nextQuestion() {
  if (currentIndex < pool.length - 1) {
    currentIndex++;
    loadQuestion();
  } else {
    finishQuiz();
  }
}

function previousQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    loadQuestion();
  }
}

function confirmQuit() {
  if (confirm('Möchtest du die aktuelle Sitzung wirklich abbrechen?')) {
    if (timer) clearInterval(timer);
    state.screen = 'menu';
    state.mode = '';
    render();
  }
}

// ============================================
// EXAM TIMER
// ============================================

function startExamTimer() {
  timer = setInterval(() => {
    timeLeft--;
    updateExamTimer();
    if (timeLeft <= 0) {
      clearInterval(timer);
      finishQuiz();
    }
  }, 1000);
}

function updateExamTimer() {
  if (!examMode) return;
  const timerEl = document.getElementById('examTimer');
  if (!timerEl) return;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerEl.textContent = `⏳ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (timeLeft <= 300) { // 5 minutes left
    timerEl.classList.add('warning');
  }
}

// ============================================
// FINISH QUIZ
// ============================================

function finishQuiz() {
  state.mode = '';
  state.screen = 'review';

  if (examMode) {
    clearInterval(timer);
    const timeTaken = (Date.now() - examStartTime) / 1000 / 60;
    const examScore = Math.round((score / pool.length) * 1000);

    let html = `
      <div>
        <h1 class="text-center mb-4">Prüfung beendet!</h1>
        <div class="stat-grid mb-6">
          <div class="stat-card">
            <div class="stat-val">${score}</div>
            <div class="stat-label">Punkte</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${examScore}</div>
            <div class="stat-label">/ 1000</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${Math.round(timeTaken)}</div>
            <div class="stat-label">Minuten</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color:${examScore >= 700 ? 'var(--green)' : 'var(--red)'};">${examScore >= 700 ? 'Bestanden!' : 'Durchgefallen'}</div>
            <div class="stat-label">Ergebnis</div>
          </div>
        </div>
        <div class="text-center mb-6">
          <p style="font-size:16px;">
            ${examScore >= 700 ? 'Herzlichen Glückwunsch! Du hast die Prüfung bestanden.' : 'Leider nicht bestanden. Versuche es noch einmal.'}
          </p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary btn-full" onclick="state.screen='review';render();">Ergebnisse anzeigen</button>
        </div>
        <div class="btn-row" style="margin-top:12px;">
          <button class="btn btn-secondary btn-full" onclick="state.screen='menu';render();">Zurück zum Menü</button>
        </div>
      </div>
    `;
    if (document.getElementById('app')) {
      document.getElementById('app').innerHTML = html;
    }
    return;
  }

  renderReview();
}

// ============================================
// REVIEW SCREEN
// ============================================

function renderReview() {
  const stats = getUserStats(activeUser);
  const correctCount = Object.values(stats.questions || {}).filter(a => a).length;
  const totalCount = Object.keys(stats.questions || {}).length;
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  let html = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h1>Ergebnisse</h1>
        <button class="btn btn-secondary" onclick="state.screen='menu';render()">↩ Menü</button>
      </div>

      <div class="stat-grid mb-6">
        <div class="stat-card">
          <div class="stat-val">${score}</div>
          <div class="stat-label">Punkte</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${pool.length}</div>
          <div class="stat-label">Fragen</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:var(--green);">${Math.round((score / pool.length) * 100)}%</div>
          <div class="stat-label">Erfolgsquote</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${pct}%</div>
          <div class="stat-label">Gesamt</div>
        </div>
      </div>

      <div class="section-title mb-3">Fragenübersicht</div>
      <div id="review-list">
  `;

  pool.forEach((q, idx) => {
    const userAnswer = userAnswers[q.id];
    const isCorrect = isAnswerCorrect(q, userAnswer);

    let answerText = '';
    if (q.type === 'single' && userAnswer) {
      answerText = q.options.find(o => o.l === userAnswer)?.t || userAnswer;
    } else if (q.type === 'multi' && userAnswer?.length) {
      answerText = userAnswer.map(a => q.options.find(o => o.l === a)?.t || a).join(', ');
    } else if (q.type === 'hotspot' && userAnswer?.length) {
      answerText = q.hotspotAreas?.find(a => a.id === userAnswer[0])?.label || userAnswer[0];
    } else if (q.type === 'ordering' && userAnswer?.length) {
      answerText = userAnswer.join(', ');
    } else if (q.type === 'matching' && userAnswer?.length) {
      answerText = userAnswer.join(', ');
    }

    html += `
        <div class="review-item ${isCorrect ? 'pass' : 'fail'}" onclick="showReviewDetail(${q.id})">
          <div style="width:24px;height:24px;border-radius:6px;background:${isCorrect ? 'var(--green)' : 'var(--red)'};display:flex;align-items:center;justify-content:center;color:#09090b;font-weight:bold;">${isCorrect ? '✓' : '✗'}</div>
          <div style="flex:1;">
            <div class="review-text">${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}</div>
            <div class="review-answers">${answerText.substring(0, 50)}${answerText.length > 50 ? '...' : ''}</div>
          </div>
        </div>
    `;
  });

  html += `
      </div>

      <div id="review-detail" style="display:none;"></div>

      <div style="margin-top:24px;">
        <button class="btn btn-secondary btn-full" onclick="state.screen='menu';render();">Zurück zum Menü</button>
      </div>
    </div>
  `;

  if (document.getElementById('app')) {
    document.getElementById('app').innerHTML = html;
  }
}

function showReviewDetail(qId) {
  const q = Q.find(q => q.id === qId);
  if (!q) return;

  const userAnswer = userAnswers[q.id];
  const isCorrect = isAnswerCorrect(q, userAnswer);

  let answerDisplay = '';
  switch(q.type) {
    case 'single':
      answerDisplay = q.options.map(opt => {
        const selected = userAnswer === opt.l;
        const correct = q.answer.includes(opt.l);
        return `<div class="option ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${selected && !correct ? 'wrong' : ''} locked">
          <div class="option-letter">${opt.l}</div>
          <div class="option-text">${opt.t}</div>
        </div>`;
      }).join('');
      break;
    case 'multi':
      answerDisplay = q.options.map(opt => {
        const selected = userAnswer?.includes(opt.l);
        const correct = q.answer.includes(opt.l);
        return `<div class="option ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${selected && !correct ? 'wrong' : ''} locked">
          <div class="option-letter">${opt.l}</div>
          <div class="option-text">${opt.t}</div>
        </div>`;
      }).join('');
      break;
    case 'hotspot':
      answerDisplay = `
        <div class="hotspot-container">
          ${q.image ? `<img src="${q.image}" class="hotspot-image" alt="Hotspot Question" />` : ''}
          ${q.hotspotAreas?.map(area => {
            const isSelected = userAnswer?.[0] === area.id;
            const isCorrect = q.answer.includes(area.id);
            return `
              <div class="hotspot-area ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'wrong' : ''} locked"
                   style="left:${area.x}px;top:${area.y}px;width:${area.width}px;height:${area.height}px;">
                <div class="hotspot-label" style="top:-20px;left:0;">${area.label}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      break;
    case 'ordering':
      answerDisplay = q.options.map((opt, idx) => {
        const correctPos = q.answer.indexOf(opt.l);
        const userPos = userAnswer?.indexOf(opt.l);
        const isCorrect = userPos === correctPos;
        return `<div class="ordering-item locked ${isCorrect ? 'correct' : 'wrong'}">
          <div class="ordering-num">${idx + 1}</div>
          <div class="ordering-text">${opt.t}</div>
        </div>`;
      }).join('');
      break;
    case 'matching':
      answerDisplay = `<div>Matching-Ansicht (in Entwicklung)</div>`;
      break;
  }

  const html = `
    <div class="review-detail">
      <h3>Frage #${q.id} (${topicNames[q.topic] || q.topic})</h3>
      <div class="question-text">${q.text}</div>

      <div class="section-title mb-3">Deine Antwort${q.type === 'multi' ? 'en' : ''}</div>
      <div style="margin-bottom:16px;">${answerDisplay}</div>

      <div class="section-title mb-3">Erklärung</div>
      <div class="explain ${isCorrect ? 'pass' : 'fail'}">
        <div class="explain-body">${q.explain || 'Keine Erklärung verfügbar.'}</div>
      </div>

      <div style="margin-top:16px;">
        <button class="btn btn-secondary" onclick="document.getElementById('review-detail').style.display='none'">Schließen</button>
      </div>
    </div>
  `;

  document.getElementById('review-detail').innerHTML = html;
  document.getElementById('review-detail').style.display = 'block';
  document.getElementById('review-detail').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// STATS SCREEN
// ============================================

function showStats() {
  const stats = getUserStats(activeUser);

  const total = Object.keys(stats.questions || {}).length;
  const correct = Object.values(stats.questions || {}).filter(a => a).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const topicStats = {};
  Object.entries(stats.questions || {}).forEach(([qId, isCorrect]) => {
    const q = Q.find(q => q.id == qId);
    if (q) {
      if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, total: 0 };
      topicStats[q.topic].total++;
      if (isCorrect) topicStats[q.topic].correct++;
    }
  });

  const typeStats = {};
  Object.entries(stats.questions || {}).forEach(([qId, isCorrect]) => {
    const q = Q.find(q => q.id == qId);
    if (q) {
      if (!typeStats[q.type]) typeStats[q.type] = { correct: 0, total: 0 };
      typeStats[q.type].total++;
      if (isCorrect) typeStats[q.type].correct++;
    }
  });

  let html = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h1>Statistiken</h1>
        <button class="btn btn-secondary" onclick="state.screen='menu';render()">↩ Zurück</button>
      </div>

      <div class="stat-grid mb-6">
        <div class="stat-card">
          <div class="stat-val">${total}</div>
          <div class="stat-label">Beantwortet</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:var(--green);">${correct}</div>
          <div class="stat-label">Richtig</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${pct}%</div>
          <div class="stat-label">Erfolgsquote</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${Q.length}</div>
          <div class="stat-label">Fragen insgesamt</div>
        </div>
      </div>

      <div class="section-title mb-3">Erfolgsquote nach Thema</div>
      <div class="topic-grid mb-6">
  `;

  Object.entries(topicNames).forEach(([key, name]) => {
    const ts = topicStats[key] || { correct: 0, total: 0 };
    const tPct = ts.total > 0 ? Math.round((ts.correct / ts.total) * 100) : 0;
    const count = Q.filter(q => q.topic === key).length;
    html += `
        <div class="topic-btn">
          <div class="topic-row">
            <span class="name">${name}</span>
            <span class="count" style="color:${tPct >= 70 ? 'var(--green)' : tPct >= 50 ? 'var(--amber)' : 'var(--red)'};">${tPct}%</span>
          </div>
          <div style="font-size:11px;color:var(--text3);">${ts.correct}/${ts.total} • ${count} Fragen</div>
        </div>
    `;
  });

  html += `
      </div>

      <div class="section-title mb-3">Erfolgsquote nach Fragetyp</div>
      <div class="filter-row mb-6">
  `;

  Object.entries(typeNames).forEach(([key, name]) => {
    const ts = typeStats[key] || { correct: 0, total: 0 };
    const tPct = ts.total > 0 ? Math.round((ts.correct / ts.total) * 100) : 0;
    const count = Q.filter(q => q.type === key).length;
    html += `
        <span class="badge badge-${key}" style="margin-bottom:4px;display:block;">
          ${name}: ${tPct}% (${ts.correct}/${ts.total}) • ${count} Fragen
        </span>
    `;
  });

  html += `
      </div>

      <div style="margin-top:24px;">
        <button class="btn btn-secondary btn-full" onclick="state.screen='menu';render()">Zurück zum Menü</button>
      </div>
    </div>
  `;

  if (document.getElementById('app')) {
    document.getElementById('app').innerHTML = html;
  }
  state.screen = 'stats';
}

// ============================================
// INITIALIZE
// ============================================

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
