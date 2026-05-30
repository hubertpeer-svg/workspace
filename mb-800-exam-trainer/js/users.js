// ============================================
// MB-800 EXAM TRAINER - USER MANAGEMENT
// ============================================

// Global state
let activeUser = null;
let users = [];

// Topic and type names (for display)
const topicNames = {
  'Topic 1': 'Setup und Verwaltung',
  'Topic 2': 'Finanzbuchhaltung',
  'Topic 3': 'Einkauf',
  'Topic 4': 'Verkauf',
  'Topic 5': 'Sicherheit & Berechtigungen',
  'Topic 6': 'Berichte & Analysen',
  'Topic 7': 'Integration',
  'Topic 8': 'Datenmigration',
  'Topic 9': 'Workflow',
  'Topic 10': 'Bestandsverwaltung',
  'Topic 11': 'Projektmanagement',
  'Topic 12': 'Bank & Zahlungen'
};

const typeNames = {
  single: 'Single Choice',
  multi: 'Multi Choice',
  ordering: 'Sortieren',
  matching: 'Zuordnen',
  hotspot: 'Hotspot'
};

// Load users from localStorage
function loadUsers() {
  users = [];
  const saved = localStorage.getItem('mb800_users');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      users = Array.isArray(parsed) ? parsed : [];
    } catch(e) {
      users = [];
    }
  }
  if (!Array.isArray(users)) {
    users = [];
  }
  if (users.length === 0) {
    users = [{ name: 'Gast', stats: {}, created: Date.now() }];
    saveUsers();
  }
}

// Save users to localStorage
function saveUsers() {
  localStorage.setItem('mb800_users', JSON.stringify(users));
}

// Add a new user
function addUser(name) {
  if (!name || typeof name !== 'string' || !name.trim()) return false;
  if (users.some(u => u && u.name === name)) return false;
  users.push({ name: name.trim(), stats: {}, created: Date.now() });
  saveUsers();
  return true;
}

// Delete a user
function deleteUser(name) {
  users = users.filter(u => u && u.name !== name);
  if (activeUser && activeUser.name === name) activeUser = null;
  saveUsers();
}

// Set active user
function setActiveUser(name) {
  activeUser = users.find(u => u && u.name === name);
  if (activeUser) {
    localStorage.setItem('mb800_activeUser', name);
  }
}

// Get user stats
function getUserStats(user) {
  if (!user) return { correct: 0, incorrect: 0, questions: {}, topics: {}, types: {} };
  return user.stats || { correct: 0, incorrect: 0, questions: {}, topics: {}, types: {} };
}

// Record answer for a question
function recordAnswer(questionId, isCorrect) {
  if (!activeUser) return;
  
  const stats = getUserStats(activeUser);
  if (!stats.questions) stats.questions = {};
  stats.questions[questionId] = isCorrect;
  
  // Update topic stats
  const question = Q.find(q => q.id === questionId);
  if (question) {
    if (!stats.topics) stats.topics = {};
    if (!stats.topics[question.topic]) {
      stats.topics[question.topic] = { correct: 0, total: 0 };
    }
    stats.topics[question.topic].total++;
    if (isCorrect) stats.topics[question.topic].correct++;
    
    // Update type stats
    if (!stats.types) stats.types = {};
    if (!stats.types[question.type]) {
      stats.types[question.type] = { correct: 0, total: 0 };
    }
    stats.types[question.type].total++;
    if (isCorrect) stats.types[question.type].correct++;
  }
  
  users.find(u => u && u.name === activeUser.name).stats = stats;
  saveUsers();
}

// Logout
function logout() {
  activeUser = null;
  localStorage.removeItem('mb800_activeUser');
}
