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
let presentedWords = []; // Track words in the order they were presented
let currentWordIndex = 0;
let score = 0;
let hintsUsed = 0;
let wordTimeLimit = 30;
let wordTimer = null;
let gameTimer = null;
let gameStartTime = null;
let wordStartTime = null;
let isPaperMode = false;
let timerBarInterval = null;
let openaiApiKey = '';
let gameCompleted = false;
let allWordsCompleted = false;
let openaiValidationResults = null;

// Sound system
const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : null;

function playTone(frequency, duration, type = 'sine') {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playCorrectSound() {
    // Happy ascending melody
    playTone(523, 0.15); // C5
    setTimeout(() => playTone(659, 0.15), 100); // E5
    setTimeout(() => playTone(784, 0.3), 200); // G5
}

function playIncorrectSound() {
    // Descending disappointed sound
    playTone(330, 0.4, 'sawtooth'); // E4
}

function playClickSound() {
    playTone(800, 0.1, 'square');
}

function playTimerWarningSound() {
    playTone(1000, 0.1);
    setTimeout(() => playTone(1000, 0.1), 150);
}

function playGameStartSound() {
    // Rising excitement
    playTone(392, 0.2); // G4
    setTimeout(() => playTone(523, 0.2), 150); // C5
    setTimeout(() => playTone(659, 0.3), 300); // E5
}

const elements = {
    setupArea: document.getElementById('setup-area'),
    gameArea: document.getElementById('game-area'),
    startBtn: document.getElementById('start-game'),
    wordListInput: document.getElementById('word-list-input'),
    questionLimit: document.getElementById('question-limit'),
    wordTimeSetting: document.getElementById('word-time-setting'),
    randomOrderCheckbox: document.getElementById('random-order'),
    paperModeCheckbox: document.getElementById('paper-mode'),
    apiKeySection: document.getElementById('api-key-section'),
    openaiApiKeyInput: document.getElementById('openai-api-key'),
    playBtn: document.getElementById('play-word'),
    spellingInput: document.getElementById('spelling-input'),
    submitBtn: document.getElementById('submit-btn'),
    inputArea: document.getElementById('input-area'),
    paperModeArea: document.getElementById('paper-mode-area'),
    paperInstructions: document.getElementById('paper-instructions'),
    wordCounter: document.getElementById('word-counter'),
    totalCounter: document.getElementById('total-counter'),
    photoUploadSection: document.getElementById('photo-upload-section'),
    photoInput: document.getElementById('photo-input'),
    cameraBtn: document.getElementById('camera-btn'),
    uploadBtn: document.getElementById('upload-btn'),
    photoPreview: document.getElementById('photo-preview'),
    validationControls: document.getElementById('validation-controls'),
    validateBtn: document.getElementById('validate-btn'),
    validationStatus: document.getElementById('validation-status'),
    manualControls: document.getElementById('manual-controls'),
    nextWordBtn: document.getElementById('next-word-btn'),
    revealBtn: document.getElementById('reveal-btn'),
    finishPaperBtn: document.getElementById('finish-paper-btn'),
    timerBar: document.getElementById('timer-bar'),
    timerText: document.getElementById('timer-text'),
    feedback: document.getElementById('feedback'),
    hintBtn: document.getElementById('hint-btn'),
    skipBtn: document.getElementById('skip-btn'),
    endTestBtn: document.getElementById('end-test-btn'),
    scoreDisplay: document.getElementById('score'),
    currentWordDisplay: document.getElementById('current-word'),
    totalWordsDisplay: document.getElementById('total-words'),
    gameTimerDisplay: document.getElementById('game-timer'),
    wordTimerDisplay: document.getElementById('word-timer'),
    gameOverDiv: document.getElementById('game-over'),
    finalScoreDisplay: document.getElementById('final-score'),
    finalTotalDisplay: document.getElementById('final-total'),
    finalTimeDisplay: document.getElementById('final-time'),
    openaiResults: document.getElementById('openai-results'),
    openaiDetails: document.getElementById('openai-details'),
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
    // Initialize audio context on user interaction
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    playGameStartSound();
    
    let customWords = parseWordList(elements.wordListInput.value);
    
    // If no custom words, use default words with limit
    if (customWords === defaultWords) {
        const questionLimit = parseInt(elements.questionLimit.value);
        customWords = defaultWords.slice(0, questionLimit);
    }
    
    words = elements.randomOrderCheckbox.checked ? shuffleArray(customWords) : customWords;
    wordTimeLimit = parseInt(elements.wordTimeSetting.value);
    isPaperMode = elements.paperModeCheckbox.checked;
    openaiApiKey = elements.openaiApiKeyInput.value.trim();
    
    // No API key validation needed here - will validate when photo is uploaded
    
    currentWordIndex = 0;
    score = 0;
    hintsUsed = 0;
    presentedWords = []; // Reset presented words tracking
    gameStartTime = Date.now();
    gameCompleted = false;
    allWordsCompleted = false;
    
    elements.setupArea.style.display = 'none';
    elements.gameArea.style.display = 'block';
    
    // Toggle input/paper mode areas
    if (isPaperMode) {
        elements.inputArea.style.display = 'none';
        elements.paperModeArea.style.display = 'block';
        elements.photoUploadSection.style.display = 'none';
        elements.finishPaperBtn.style.display = 'inline-block'; // Show finish button from start
        // Hide hint button in paper mode since students write on paper
        elements.hintBtn.style.display = 'none';
        // Show next word button in paper mode
        elements.nextWordBtn.style.display = 'inline-block';
    } else {
        elements.inputArea.style.display = 'block';
        elements.paperModeArea.style.display = 'none';
        elements.hintBtn.style.display = 'inline-block';
        // Hide next word button in normal mode
        elements.nextWordBtn.style.display = 'none';
    }
    
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
    clearInterval(timerBarInterval);
    
    wordStartTime = Date.now();
    let timeLeft = wordTimeLimit;
    elements.wordTimerDisplay.textContent = timeLeft;
    elements.timerText.textContent = `${timeLeft}s`;
    elements.timerBar.style.width = '100%';
    elements.timerBar.classList.remove('warning');
    
    wordTimer = setInterval(() => {
        timeLeft--;
        elements.wordTimerDisplay.textContent = timeLeft;
        elements.timerText.textContent = `${timeLeft}s`;
        
        // Update progress bar
        const progress = (timeLeft / wordTimeLimit) * 100;
        elements.timerBar.style.width = `${progress}%`;
        
        if (timeLeft <= 5) {
            elements.wordTimerDisplay.style.color = '#e74c3c';
            elements.timerBar.classList.add('warning');
            if (timeLeft <= 3) {
                playTimerWarningSound();
            }
        } else {
            elements.wordTimerDisplay.style.color = '#2d3436';
            elements.timerBar.classList.remove('warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(wordTimer);
            clearInterval(timerBarInterval);
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
    
    // Update paper mode counters
    if (isPaperMode) {
        elements.wordCounter.textContent = currentWordIndex + 1;
        elements.totalCounter.textContent = words.length;
    }
    
    if (currentWordIndex < words.length) {
        // Track the word being presented in the order it's shown
        presentedWords.push(words[currentWordIndex]);
        
        speakWord(words[currentWordIndex]);
        if (isPaperMode) {
            startPaperWordTimer();
        } else {
            startWordTimer();
        }
    }
}

function startPaperWordTimer() {
    clearInterval(wordTimer);
    clearInterval(timerBarInterval);
    
    wordStartTime = Date.now();
    let timeLeft = wordTimeLimit;
    elements.wordTimerDisplay.textContent = timeLeft;
    elements.timerText.textContent = `${timeLeft}s`;
    elements.timerBar.style.width = '100%';
    elements.timerBar.classList.remove('warning');
    
    wordTimer = setInterval(() => {
        timeLeft--;
        elements.wordTimerDisplay.textContent = timeLeft;
        elements.timerText.textContent = `${timeLeft}s`;
        
        // Update progress bar
        const progress = (timeLeft / wordTimeLimit) * 100;
        elements.timerBar.style.width = `${progress}%`;
        
        if (timeLeft <= 5) {
            elements.wordTimerDisplay.style.color = '#e74c3c';
            elements.timerBar.classList.add('warning');
            if (timeLeft <= 3) {
                playTimerWarningSound();
            }
        } else {
            elements.wordTimerDisplay.style.color = '#2d3436';
            elements.timerBar.classList.remove('warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(wordTimer);
            clearInterval(timerBarInterval);
            paperWordTimeExpired();
        }
    }, 1000);
}

function paperWordTimeExpired() {
    // In paper mode, just move to next word when time expires
    currentWordIndex++;
    
    if (currentWordIndex >= words.length) {
        allWordsCompleted = true;
        elements.finishPaperBtn.style.display = 'inline-block';
        elements.feedback.textContent = 'All words completed! Click "Finished Writing" to upload your photo.';
        elements.feedback.className = 'feedback correct';
    } else {
        updateDisplay();
    }
}

function paperNextWord() {
    // Skip the timer and go to next word immediately in paper mode
    if (isPaperMode) {
        clearInterval(wordTimer);
        clearInterval(timerBarInterval);
        
        currentWordIndex++;
        
        if (currentWordIndex >= words.length) {
            allWordsCompleted = true;
            elements.finishPaperBtn.style.display = 'inline-block';
            elements.feedback.textContent = 'All words completed! Click "Finished Writing" to upload your photo.';
            elements.feedback.className = 'feedback correct';
        } else {
            updateDisplay();
        }
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
    clearInterval(timerBarInterval);
    
    const userInput = elements.spellingInput.value.trim().toLowerCase();
    const correctWord = words[currentWordIndex].toLowerCase();
    
    if (userInput === correctWord) {
        score++;
        playCorrectSound();
        elements.feedback.textContent = 'Correct! Well done! 🎉';
        elements.feedback.className = 'feedback correct';
        
        setTimeout(() => {
            nextWord();
        }, 1500);
    } else {
        playIncorrectSound();
        elements.feedback.textContent = `Incorrect. The correct spelling is: ${words[currentWordIndex]}`;
        elements.feedback.className = 'feedback incorrect';
        
        setTimeout(() => {
            nextWord();
        }, 3000);
    }
}

function revealAnswer() {
    if (isPaperMode) {
        elements.feedback.textContent = `The correct spelling is: ${words[currentWordIndex]}`;
        elements.feedback.className = 'feedback skipped';
        
        // In paper mode, show finish button after all words
        if (currentWordIndex === words.length - 1) {
            elements.finishPaperBtn.style.display = 'inline-block';
        }
        
        setTimeout(() => {
            nextWord();
        }, 3000);
    } else {
        clearInterval(wordTimer);
        clearInterval(timerBarInterval);
        
        elements.feedback.textContent = `The correct spelling is: ${words[currentWordIndex]}`;
        elements.feedback.className = 'feedback skipped';
        
        setTimeout(() => {
            nextWord();
        }, 3000);
    }
}

function nextWord() {
    currentWordIndex++;
    
    if (currentWordIndex >= words.length) {
        if (isPaperMode) {
            allWordsCompleted = true;
            showPhotoUploadSection();
        } else {
            endGame();
        }
    } else {
        updateDisplay();
    }
}

function showPhotoUploadSection() {
    console.log('showPhotoUploadSection called');
    clearInterval(wordTimer);
    clearInterval(timerBarInterval);
    
    console.log('Elements before showing photo section:', {
        paperInstructions: elements.paperInstructions?.style.display,
        photoUploadSection: elements.photoUploadSection?.style.display,
        finishPaperBtn: elements.finishPaperBtn?.style.display,
        revealBtn: elements.revealBtn?.style.display
    });
    
    elements.paperInstructions.style.display = 'none';
    elements.photoUploadSection.style.display = 'block';
    elements.finishPaperBtn.style.display = 'none';
    elements.revealBtn.style.display = 'none';
    elements.nextWordBtn.style.display = 'none';
    
    console.log('Photo upload section should now be visible');
}

function finishPaperMode() {
    console.log('finishPaperMode called');
    
    // If no words were presented yet, create a test case
    if (presentedWords.length === 0) {
        console.log('No words presented yet, creating test case');
        presentedWords = ['test', 'word', 'example'];
    }
    
    allWordsCompleted = true;
    showPhotoUploadSection();
}

function handlePhotoUpload(event) {
    console.log('handlePhotoUpload called', event);
    const file = event.target.files[0];
    console.log('Selected file:', file);
    if (file) {
        console.log('File details:', {
            name: file.name,
            size: file.size,
            type: file.type
        });
        displayPhoto(file);
    } else {
        console.log('No file selected');
    }
}

function displayPhoto(file) {
    console.log('displayPhoto called with file:', file);
    const reader = new FileReader();
    
    reader.onload = function(e) {
        console.log('FileReader onload triggered');
        console.log('Image data length:', e.target.result.length);
        elements.photoPreview.innerHTML = `<img src="${e.target.result}" alt="Uploaded spellings">`;
        elements.photoPreview.style.display = 'block';
        elements.validationControls.style.display = 'block';
        
        // Store the image data for validation
        window.uploadedImageData = e.target.result;
        console.log('Image stored successfully');
    };
    
    reader.onerror = function(e) {
        console.error('FileReader error:', e);
    };
    
    reader.readAsDataURL(file);
}

async function validateWithOpenAI() {
    console.log('validateWithOpenAI called');
    
    if (!window.uploadedImageData) {
        alert('Please upload a photo first.');
        return;
    }
    
    if (!openaiApiKey) {
        alert('Please enter your OpenAI API key first.');
        return;
    }
    
    elements.validateBtn.disabled = true;
    elements.validationStatus.textContent = 'Analyzing photo with AI...';
    elements.validationStatus.className = 'validation-status loading';
    elements.validationStatus.style.display = 'block';
    
    try {
        console.log('Starting OpenAI validation...');
        console.log('API Key (first 10 chars):', openaiApiKey.substring(0, 10) + '...');
        console.log('Image data length:', window.uploadedImageData.length);
        
        const base64Image = window.uploadedImageData.split(',')[1];
        console.log('Base64 image length:', base64Image.length);
        
        // Use the words in the order they were actually presented to the student
        const wordsToValidate = presentedWords.slice(); // Make a copy
        console.log('Words to validate:', wordsToValidate);
        
        const prompt = `You are a spelling checker. Analyze this image of handwritten spellings and validate them against the word list.

Word list in presentation order: ${wordsToValidate.map((word, index) => `${index + 1}. ${word}`).join(', ')}

Instructions:
1. Look for each word in the image
2. Check if each word is spelled correctly
3. Mark as incorrect if misspelled or not found

IMPORTANT: Respond ONLY with valid JSON in this exact format (no other text):

{
  "results": [
    {"word": "${wordsToValidate[0] || 'test'}", "correct": true, "written": "${wordsToValidate[0] || 'test'}"},
    {"word": "${wordsToValidate[1] || 'example'}", "correct": false, "written": "exampl"}
  ],
  "totalCorrect": 1,
  "totalWords": ${wordsToValidate.length}
}`;

        console.log('Prompt created, length:', prompt.length);

        const requestBody = {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: window.uploadedImageData,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        };
        
        console.log('Request body prepared');
        console.log('Making API request to OpenAI...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response received:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            
            let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
            
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error && errorJson.error.message) {
                    errorMessage += `\n${errorJson.error.message}`;
                }
            } catch (e) {
                console.log('Could not parse error as JSON');
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('API Response data:', data);
        
        const aiResponse = data.choices[0].message.content;
        console.log('AI Response content:', aiResponse);
        
        try {
            // Try to parse the response as JSON
            let validation;
            
            try {
                validation = JSON.parse(aiResponse);
            } catch (e) {
                console.log('Direct JSON parse failed, trying to extract JSON...');
                
                // Try to extract JSON from the response if it has extra text
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    console.log('Found JSON match:', jsonMatch[0]);
                    validation = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            }
            
            console.log('Parsed validation:', validation);
            
            // Validate the structure
            if (!validation.results || !Array.isArray(validation.results)) {
                throw new Error('Invalid validation structure: missing results array');
            }
            
            if (typeof validation.totalCorrect !== 'number' || typeof validation.totalWords !== 'number') {
                throw new Error('Invalid validation structure: missing totalCorrect or totalWords');
            }
            
            score = validation.totalCorrect;
            openaiValidationResults = validation; // Store results for game completion screen
            
            elements.validationStatus.innerHTML = `
                <strong>AI Validation Complete!</strong><br>
                Score: ${validation.totalCorrect} / ${validation.totalWords}<br>
                <details style="margin-top: 10px;">
                    <summary>View detailed results (in presentation order)</summary>
                    <div style="text-align: left; margin-top: 10px;">
                        ${validation.results.map((r, index) => 
                            `<div style="margin: 5px 0; padding: 5px; background: ${r.correct ? '#d4edda' : '#f8d7da'}; border-radius: 5px;">
                                <strong>#${index + 1} - ${r.word}:</strong> ${r.correct ? '✅ Correct' : '❌ Incorrect'} 
                                ${r.written !== r.word ? `(wrote: "${r.written}")` : ''}
                            </div>`
                        ).join('')}
                    </div>
                </details>
            `;
            elements.validationStatus.className = 'validation-status success';
            
            setTimeout(() => {
                endGame();
            }, 3000);
            
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.log('Raw AI Response that failed to parse:', aiResponse);
            
            // Fallback: Create a simple validation result
            console.log('Creating fallback validation result...');
            
            const fallbackValidation = {
                results: wordsToValidate.map((word, index) => ({
                    word: word,
                    correct: false, // Conservative: mark as incorrect if we can't parse
                    written: "Unable to parse AI response"
                })),
                totalCorrect: 0,
                totalWords: wordsToValidate.length
            };
            
            score = 0;
            
            elements.validationStatus.innerHTML = `
                <strong>Validation Error - Manual Review Required</strong><br>
                The AI response could not be parsed properly.<br>
                <details style="margin-top: 10px;">
                    <summary>View AI Response</summary>
                    <div style="text-align: left; margin-top: 10px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                        <pre style="white-space: pre-wrap; font-size: 0.9em;">${aiResponse}</pre>
                    </div>
                </details>
                <p style="margin-top: 10px;">Please manually review the spellings in your photo.</p>
            `;
            elements.validationStatus.className = 'validation-status error';
            
            setTimeout(() => {
                endGame();
            }, 5000);
            
            return; // Don't throw error, just show the fallback result
        }
        
    } catch (error) {
        console.error('Validation error:', error);
        
        // Provide more user-friendly error messages
        let userMessage = error.message;
        
        if (error.message.includes('401')) {
            userMessage = 'Invalid API key. Please check your OpenAI API key.';
        } else if (error.message.includes('402') || error.message.includes('quota')) {
            userMessage = 'API quota exceeded. Please check your OpenAI account billing.';
        } else if (error.message.includes('429')) {
            userMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
            userMessage = 'OpenAI servers are temporarily unavailable. Please try again later.';
        } else if (error.message.includes('Invalid response format')) {
            userMessage = 'AI response was not in expected format. Please try again.';
        }
        
        elements.validationStatus.textContent = `Error: ${userMessage}`;
        elements.validationStatus.className = 'validation-status error';
        elements.validateBtn.disabled = false;
    }
}

function skipWord() {
    clearInterval(wordTimer);
    clearInterval(timerBarInterval);
    
    elements.feedback.textContent = `Skipped. The word was: ${words[currentWordIndex]}`;
    elements.feedback.className = 'feedback skipped';
    
    setTimeout(() => {
        nextWord();
    }, 2000);
}

function endTestEarly() {
    const confirmEnd = confirm(`Are you sure you want to end the test early?\n\nCurrent progress: ${currentWordIndex} / ${words.length} words\nScore so far: ${score} / ${currentWordIndex}`);
    
    if (confirmEnd) {
        clearInterval(wordTimer);
        clearInterval(timerBarInterval);
        
        if (isPaperMode && currentWordIndex > 0) {
            // In paper mode, show photo upload for completed words
            allWordsCompleted = true;
            showPhotoUploadSection();
        } else {
            // End the game immediately
            endGame();
        }
    }
}

function endGame() {
    clearInterval(wordTimer);
    clearInterval(gameTimer);
    clearInterval(timerBarInterval);
    
    const totalTime = Math.floor((Date.now() - gameStartTime) / 1000);
    elements.finalScoreDisplay.textContent = score;
    elements.finalTotalDisplay.textContent = words.length;
    elements.finalTimeDisplay.textContent = formatTime(totalTime);
    
    // Show OpenAI validation results if available (from paper mode)
    if (openaiValidationResults && isPaperMode) {
        elements.openaiResults.style.display = 'block';
        elements.openaiDetails.innerHTML = `
            <div style="text-align: left; margin-top: 10px;">
                <p><strong>AI Analysis Summary:</strong></p>
                <p>✅ Correct: ${openaiValidationResults.totalCorrect} words</p>
                <p>❌ Incorrect: ${openaiValidationResults.totalWords - openaiValidationResults.totalCorrect} words</p>
                <details style="margin-top: 15px;">
                    <summary><strong>Detailed Word-by-Word Results</strong></summary>
                    <div style="margin-top: 10px;">
                        ${openaiValidationResults.results.map((r, index) => 
                            `<div style="margin: 8px 0; padding: 8px; background: ${r.correct ? '#d4edda' : '#f8d7da'}; border-radius: 5px; border-left: 4px solid ${r.correct ? '#28a745' : '#dc3545'};">
                                <div style="font-weight: bold;">#${index + 1} - "${r.word}"</div>
                                <div style="margin-top: 4px;">
                                    Status: ${r.correct ? '✅ Correct' : '❌ Incorrect'}
                                    ${r.written !== r.word ? `<br>You wrote: "${r.written}"` : ''}
                                </div>
                            </div>`
                        ).join('')}
                    </div>
                </details>
            </div>
        `;
    } else {
        elements.openaiResults.style.display = 'none';
    }
    
    elements.gameOverDiv.style.display = 'block';
    elements.gameArea.style.display = 'none';
}

function restartGame() {
    clearInterval(wordTimer);
    clearInterval(gameTimer);
    clearInterval(timerBarInterval);
    
    currentWordIndex = 0;
    score = 0;
    hintsUsed = 0;
    presentedWords = []; // Reset presentation tracking
    gameStartTime = null;
    wordStartTime = null;
    isPaperMode = false;
    gameCompleted = false;
    allWordsCompleted = false;
    openaiApiKey = '';
    openaiValidationResults = null;
    
    // Clear photo data
    if (window.uploadedImageData) {
        delete window.uploadedImageData;
    }
    
    elements.gameOverDiv.style.display = 'none';
    elements.gameArea.style.display = 'none';
    elements.setupArea.style.display = 'block';
}

elements.startBtn.addEventListener('click', startGame);

// Show/hide API key section based on paper mode selection
elements.paperModeCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        elements.apiKeySection.style.display = 'block';
    } else {
        elements.apiKeySection.style.display = 'none';
    }
});

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
elements.endTestBtn.addEventListener('click', endTestEarly);
elements.restartBtn.addEventListener('click', restartGame);

// Paper mode event listeners
elements.nextWordBtn.addEventListener('click', paperNextWord);
elements.revealBtn.addEventListener('click', revealAnswer);
elements.finishPaperBtn.addEventListener('click', finishPaperMode);

// Photo upload event listeners
elements.cameraBtn.addEventListener('click', () => {
    console.log('Camera button clicked');
    playClickSound();
    elements.photoInput.setAttribute('capture', 'environment');
    elements.photoInput.click();
});

elements.uploadBtn.addEventListener('click', () => {
    console.log('Upload button clicked');
    playClickSound();
    elements.photoInput.removeAttribute('capture');
    elements.photoInput.click();
});

elements.photoInput.addEventListener('change', handlePhotoUpload);
console.log('Photo upload event listeners added');
console.log('Photo elements check:', {
    cameraBtn: !!elements.cameraBtn,
    uploadBtn: !!elements.uploadBtn,
    photoInput: !!elements.photoInput,
    photoPreview: !!elements.photoPreview,
    validateBtn: !!elements.validateBtn,
    photoUploadSection: !!elements.photoUploadSection
});
elements.validateBtn.addEventListener('click', validateWithOpenAI);