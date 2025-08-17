const defaultWords = [
    'interrupt', 'destroy', 'damage', 'creation', 'importance', 'talkative', 'traditional',
    'definition', 'extraordinary', 'astonish', 'carry', 'carried', 'drop', 'dropped',
    'plan', 'planned', 'stop', 'stopped', 'hurry', 'hurried', 'beautiful', 'noisy',
    'cheerful', 'narrow', 'wide', 'rough', 'smooth', 'loud', 'quiet', 'clever',
    'planet', 'energy', 'animal', 'insect', 'water', 'desert', 'weather', 'recycle',
    'gravity', 'shadow', 'question', 'answer', 'creative', 'describe', 'favorite',
    'knowledge', 'example', 'imagine', 'remember', 'adventure'
];

let words = [];
let currentWordIndex = 0;
let score = 0;
let hintsUsed = 0;
let wordTimeLimit = 30;
let wordTimer = null;
let gameTimer = null;
let gameStartTime = null;
let wordStartTime = null;

const elements = {
    setupArea: document.getElementById('setup-area'),
    gameArea: document.getElementById('game-area'),
    startBtn: document.getElementById('start-game'),
    wordListInput: document.getElementById('word-list-input'),
    wordTimeSetting: document.getElementById('word-time-setting'),
    randomOrderCheckbox: document.getElementById('random-order'),
    playBtn: document.getElementById('play-word'),
    spellingInput: document.getElementById('spelling-input'),
    submitBtn: document.getElementById('submit-btn'),
    feedback: document.getElementById('feedback'),
    hintBtn: document.getElementById('hint-btn'),
    skipBtn: document.getElementById('skip-btn'),
    scoreDisplay: document.getElementById('score'),
    currentWordDisplay: document.getElementById('current-word'),
    totalWordsDisplay: document.getElementById('total-words'),
    gameTimerDisplay: document.getElementById('game-timer'),
    wordTimerDisplay: document.getElementById('word-timer'),
    gameOverDiv: document.getElementById('game-over'),
    finalScoreDisplay: document.getElementById('final-score'),
    finalTotalDisplay: document.getElementById('final-total'),
    finalTimeDisplay: document.getElementById('final-time'),
    restartBtn: document.getElementById('restart-btn'),
    definitionDiv: document.getElementById('definition')
};

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function parseWordList(input) {
    if (!input.trim()) return defaultWords;
    
    return input
        .split(/[,\n\r]+/)
        .map(word => word.trim())
        .filter(word => word.length > 0)
        .filter(word => /^[a-zA-Z]+$/.test(word));
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startGame() {
    const customWords = parseWordList(elements.wordListInput.value);
    words = elements.randomOrderCheckbox.checked ? shuffleArray(customWords) : customWords;
    wordTimeLimit = parseInt(elements.wordTimeSetting.value);
    
    currentWordIndex = 0;
    score = 0;
    hintsUsed = 0;
    gameStartTime = Date.now();
    
    elements.setupArea.style.display = 'none';
    elements.gameArea.style.display = 'block';
    
    startGameTimer();
    updateDisplay();
}

function startGameTimer() {
    gameTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        elements.gameTimerDisplay.textContent = formatTime(elapsed);
    }, 1000);
}

function startWordTimer() {
    clearInterval(wordTimer);
    wordStartTime = Date.now();
    let timeLeft = wordTimeLimit;
    elements.wordTimerDisplay.textContent = timeLeft;
    
    wordTimer = setInterval(() => {
        timeLeft--;
        elements.wordTimerDisplay.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            elements.wordTimerDisplay.style.color = '#e74c3c';
        } else {
            elements.wordTimerDisplay.style.color = '#2d3436';
        }
        
        if (timeLeft <= 0) {
            clearInterval(wordTimer);
            timeExpired();
        }
    }, 1000);
}

function timeExpired() {
    elements.feedback.textContent = `Time's up! The word was: ${words[currentWordIndex]}`;
    elements.feedback.className = 'feedback time-expired';
    
    setTimeout(() => {
        nextWord();
    }, 2000);
}

function speakWord(word) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.7;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
    }
}

function updateDisplay() {
    elements.currentWordDisplay.textContent = currentWordIndex + 1;
    elements.totalWordsDisplay.textContent = words.length;
    elements.scoreDisplay.textContent = score;
    elements.spellingInput.value = '';
    elements.feedback.textContent = '';
    elements.feedback.className = 'feedback';
    hintsUsed = 0;
    
    if (currentWordIndex < words.length) {
        speakWord(words[currentWordIndex]);
        startWordTimer();
    }
}

function showHint() {
    if (hintsUsed === 0) {
        const word = words[currentWordIndex];
        const hint = word.charAt(0) + '_ _ _';
        elements.feedback.textContent = `Hint: Starts with "${word.charAt(0).toUpperCase()}"`;
        elements.feedback.className = 'feedback hint';
        hintsUsed++;
    } else if (hintsUsed === 1) {
        const word = words[currentWordIndex];
        const hint = word.substring(0, 2) + '_ _ _';
        elements.feedback.textContent = `Hint: Starts with "${word.substring(0, 2).toUpperCase()}"`;
        elements.feedback.className = 'feedback hint';
        hintsUsed++;
    } else {
        elements.feedback.textContent = 'No more hints available for this word!';
        elements.feedback.className = 'feedback warning';
    }
}

function checkSpelling() {
    clearInterval(wordTimer);
    const userInput = elements.spellingInput.value.trim().toLowerCase();
    const correctWord = words[currentWordIndex].toLowerCase();
    
    if (userInput === correctWord) {
        score++;
        elements.feedback.textContent = 'Correct! Well done! 🎉';
        elements.feedback.className = 'feedback correct';
        
        setTimeout(() => {
            nextWord();
        }, 1500);
    } else {
        elements.feedback.textContent = `Incorrect. The correct spelling is: ${words[currentWordIndex]}`;
        elements.feedback.className = 'feedback incorrect';
        
        setTimeout(() => {
            nextWord();
        }, 3000);
    }
}

function nextWord() {
    currentWordIndex++;
    
    if (currentWordIndex >= words.length) {
        endGame();
    } else {
        updateDisplay();
    }
}

function skipWord() {
    clearInterval(wordTimer);
    elements.feedback.textContent = `Skipped. The word was: ${words[currentWordIndex]}`;
    elements.feedback.className = 'feedback skipped';
    
    setTimeout(() => {
        nextWord();
    }, 2000);
}

function endGame() {
    clearInterval(wordTimer);
    clearInterval(gameTimer);
    
    const totalTime = Math.floor((Date.now() - gameStartTime) / 1000);
    elements.finalScoreDisplay.textContent = score;
    elements.finalTotalDisplay.textContent = words.length;
    elements.finalTimeDisplay.textContent = formatTime(totalTime);
    elements.gameOverDiv.style.display = 'block';
    elements.gameArea.style.display = 'none';
}

function restartGame() {
    clearInterval(wordTimer);
    clearInterval(gameTimer);
    
    currentWordIndex = 0;
    score = 0;
    hintsUsed = 0;
    gameStartTime = null;
    wordStartTime = null;
    
    elements.gameOverDiv.style.display = 'none';
    elements.gameArea.style.display = 'none';
    elements.setupArea.style.display = 'block';
}

elements.startBtn.addEventListener('click', startGame);

elements.playBtn.addEventListener('click', () => {
    speakWord(words[currentWordIndex]);
});

elements.submitBtn.addEventListener('click', checkSpelling);

elements.spellingInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkSpelling();
    }
});

elements.hintBtn.addEventListener('click', showHint);
elements.skipBtn.addEventListener('click', skipWord);
elements.restartBtn.addEventListener('click', restartGame);