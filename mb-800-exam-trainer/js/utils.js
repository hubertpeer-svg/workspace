// ============================================
// MB-800 EXAM TRAINER - UTILITY FUNCTIONS
// ============================================

// UTF-8 Validation (fixes encoding issues in questions)
function validateUTF8(text) {
  if (!text) return text;
  const replacements = [
    { from: /â€™/g, to: "'" },
    { from: /â€“/g, to: "-" },
    { from: /â€œ/g, to: '"' },
    { from: /â€¢/g, to: "•" },
    { from: /â€“/g, to: "—" },
    { from: /Ã¤/g, to: "ä" },
    { from: /Ã¶/g, to: "ö" },
    { from: /Ã¼/g, to: "ü" },
    { from: /ÃŸ/g, to: "ß" },
    { from: /Ã„/g, to: "Ä" },
    { from: /Ã–/g, to: "Ö" },
    { from: /Ãœ/g, to: "Ü" }
  ];
  let result = text;
  replacements.forEach(r => result = result.replace(r.from, r.to));
  return result;
}

// Apply UTF-8 validation to all questions
function applyUTF8ToQuestions(questions) {
  return questions.map(q => {
    q.text = validateUTF8(q.text);
    q.explain = validateUTF8(q.explain || '');
    if (q.options) {
      q.options.forEach(opt => opt.t = validateUTF8(opt.t));
    }
    if (q.stems) {
      q.stems.forEach(stem => stem = validateUTF8(stem));
    }
    return q;
  });
}

// Format time (e.g., for exam timer)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Check if answer is correct
function isAnswerCorrect(question, userAnswer) {
  if (!userAnswer || !question.answer) return false;
  
  switch(question.type) {
    case 'single':
      return userAnswer === question.answer[0];
    case 'multi':
      return userAnswer.sort().join(',') === question.answer.sort().join(',');
    case 'hotspot':
      return userAnswer[0] === question.answer[0];
    case 'ordering':
      return userAnswer.join(',') === question.answer.join(',');
    case 'matching':
      return userAnswer.join(',') === question.answer.join(',');
    default:
      return false;
  }
}
