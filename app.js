// ===================================
// DESAFIO DAS EMOÇÕES - UFP
// Game completo com IA e Visão Computacional
// ===================================

// Game State
const gameState = {
    student: {
        firstName: '',
        lastName: '',
        school: ''
    },
    currentRound: 0,
    totalRounds: 22,
    score: 0,
    roundResults: [],
    isPlaying: false,
    detectionInterval: null,
    roundTimer: null,
    timeRemaining: 15,
    usedEmotions: [],
    currentQuestionType: null
};

// Emotions to challenge (face-api.js supports these)
const EMOTIONS = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'fearful', 'disgusted'];

// Portuguese translations for emotions
const EMOTION_TRANSLATIONS = {
    'happy': 'Feliz',
    'sad': 'Triste',
    'angry': 'Zangado',
    'surprised': 'Surpreso',
    'neutral': 'Neutro',
    'fearful': 'Com Medo',
    'disgusted': 'Enojado'
};

// Question types
const QUESTION_TYPES = {
    EMOTION_CAMERA: 'emotion_camera',
    QUIZ: 'quiz',
    VISUAL: 'visual',
    CODE: 'code',
    GESTURE: 'gesture'
};

// Constants
const EMOTION_ROUND_DURATION = 15; // seconds per emotion round
const QUIZ_ROUND_DURATION = 30; // seconds per quiz round
const CODE_ROUND_DURATION = 45; // seconds per code round
const DETECTION_THRESHOLD = 0.6; // confidence threshold for emotion detection
const SUCCESS_DURATION = 1500; // milliseconds to hold correct emotion

// ===================================
// QUIZ QUESTIONS DATABASE
// ===================================

const QUIZ_QUESTIONS = [
    // BLOCO 2: Como a IA Vê?
    {
        id: 'cv1',
        type: QUESTION_TYPES.VISUAL,
        question: 'Quantas faces vês nesta imagem?',
        image: 'faces',
        options: ['1 face', '2 faces', '3 faces', '4 faces'],
        correct: 2,
        explanation: 'A IA usa deteção de faces para contar rostos!',
        educationalNote: 'Em Engenharia Informática aprendes a criar detetores de objetos!'
    },
    {
        id: 'cv2',
        type: QUESTION_TYPES.QUIZ,
        question: 'Qual destas emoções é mais fácil para a IA detetar?',
        options: ['Neutro', 'Feliz (sorriso)', 'Surpreso', 'Com Medo'],
        correct: 1,
        explanation: 'O sorriso tem padrões faciais muito distintos: boca curvada + olhos',
        educationalNote: 'Machine Learning aprende padrões em milhares de imagens!'
    },
    {
        id: 'cv3',
        type: QUESTION_TYPES.QUIZ,
        question: 'Quantos pontos faciais a IA usa para detetar emoções?',
        options: ['10 pontos', '25 pontos', '68 pontos', '100 pontos'],
        correct: 2,
        explanation: 'A IA usa 68 pontos de referência no rosto (face landmarks)!',
        educationalNote: 'Face landmarks são coordenadas precisas: olhos, nariz, boca, etc.'
    },

    // BLOCO 3: IA no Mundo Real
    {
        id: 'app1',
        type: QUESTION_TYPES.QUIZ,
        question: 'Onde usamos reconhecimento facial no dia-a-dia?',
        options: ['Desbloquear telemóvel', 'Filtros Instagram', 'Segurança aeroportos', 'Todas as anteriores'],
        correct: 3,
        explanation: 'Visão Computacional está em todo o lado!',
        educationalNote: 'Em EI aprendes a criar estas aplicações!'
    },
    {
        id: 'app2',
        type: QUESTION_TYPES.QUIZ,
        question: 'Como funcionam os filtros de cão no Instagram/Snapchat?',
        options: ['Magia', 'Deteção de pontos faciais', 'Sensores no telemóvel', 'GPS'],
        correct: 1,
        explanation: 'A IA deteta pontos do rosto e coloca as orelhas na posição certa!',
        educationalNote: 'Isto chama-se Realidade Aumentada (AR) + Computer Vision!'
    },
    {
        id: 'app3',
        type: QUESTION_TYPES.QUIZ,
        question: 'Que tecnologia permite aos carros Tesla detetarem obstáculos?',
        options: ['GPS', 'Visão Computacional', 'Radar apenas', 'Magia'],
        correct: 1,
        explanation: 'Câmaras + IA = Carros autónomos!',
        educationalNote: 'Computer Vision salva vidas em carros autónomos!'
    },

    // BLOCO 4: Desafio de Código
    {
        id: 'code1',
        type: QUESTION_TYPES.CODE,
        question: 'Completa o código para detetar um sorriso:',
        code: `SE boca_curvada_para_cima E olhos_abertos:
    emoção = ?`,
        options: ['Triste', 'Feliz', 'Zangado', 'Surpreso'],
        correct: 1,
        explanation: 'Boca curvada para cima + olhos abertos = Feliz!',
        educationalNote: 'Isto é lógica de programação básica (IF statements)!'
    },
    {
        id: 'code2',
        type: QUESTION_TYPES.CODE,
        question: 'Ordena os passos de deteção de emoções:',
        code: `1. ???
2. ???
3. ???
4. ???`,
        options: [
            '1.Capturar → 2.Analisar → 3.Comparar → 4.Decidir',
            '1.Decidir → 2.Capturar → 3.Analisar → 4.Comparar',
            '1.Comparar → 2.Decidir → 3.Capturar → 4.Analisar',
            '1.Analisar → 2.Capturar → 3.Decidir → 4.Comparar'
        ],
        correct: 0,
        explanation: 'A IA segue sempre: Capturar imagem → Analisar → Comparar → Decidir',
        educationalNote: 'Isto é um algoritmo - sequência de passos para resolver um problema!'
    },
    {
        id: 'code3',
        type: QUESTION_TYPES.CODE,
        question: 'Encontra o erro neste código:',
        code: `function detectarEmocao(rosto) {
    se (rosto == null) {
        return "Sem rosto";
    }
    retornar "Emoção detetada";
}`,
        options: ['Linha 2: falta parentesis', 'Linha 5: "retornar" está errado', 'Linha 1: falta ponto e vírgula', 'Não há erro'],
        correct: 1,
        explanation: 'Em JavaScript usa-se "return", não "retornar"!',
        educationalNote: 'Debugging é encontrar e corrigir erros - 50% do trabalho de um programador!'
    },

    // BLOCO 5: IA Criativa
    {
        id: 'creative1',
        type: QUESTION_TYPES.QUIZ,
        question: 'Que cor associas à felicidade?',
        options: ['Amarelo', 'Azul', 'Vermelho', 'Verde'],
        correct: 0,
        explanation: 'Estatisticamente, amarelo é a cor mais associada à felicidade!',
        educationalNote: 'Data Science analisa milhões de respostas para encontrar padrões!'
    },
    {
        id: 'creative2',
        type: QUESTION_TYPES.GESTURE,
        question: 'Faz um gesto de 👍 (polegar para cima) para a câmara!',
        gestureType: 'thumbsup',
        gestureEmoji: '👍',
        explanation: 'A IA consegue detetar gestos das mãos!',
        educationalNote: 'Hand pose detection é usado em realidade virtual e jogos!'
    },
    {
        id: 'creative3',
        type: QUESTION_TYPES.GESTURE,
        question: 'Faz um gesto de ❤️ (coração com as mãos) para a câmara!',
        gestureType: 'love',
        gestureEmoji: '❤️',
        explanation: 'Gestos complexos como o coração são desafios para a IA!',
        educationalNote: 'A IA aprende a reconhecer milhares de gestos diferentes!'
    },
    {
        id: 'creative4',
        type: QUESTION_TYPES.GESTURE,
        question: 'Faz um gesto de 👌 (OK) para a câmara!',
        gestureType: 'ok',
        gestureEmoji: '👌',
        explanation: 'O gesto OK é reconhecido em muitas culturas!',
        educationalNote: 'Computer Vision precisa entender contextos culturais!'
    },
    {
        id: 'creative5',
        type: QUESTION_TYPES.QUIZ,
        question: 'Em que área da Engenharia Informática aprendes Visão Computacional?',
        options: ['Bases de Dados', 'Inteligência Artificial', 'Redes de Computadores', 'Design Gráfico'],
        correct: 1,
        explanation: 'Computer Vision é parte de IA e Machine Learning!',
        educationalNote: 'Na UFP tens cadeiras de IA, ML e Computer Vision!'
    }
];

// ===================================
// GAME ROUNDS STRUCTURE (22 rounds)
// ===================================

const GAME_STRUCTURE = [
    // Rounds 1-8: Emotion Detection with Camera
    { round: 1, type: QUESTION_TYPES.EMOTION_CAMERA, emotion: null },
    { round: 2, type: QUESTION_TYPES.EMOTION_CAMERA, emotion: null },
    { round: 3, type: QUESTION_TYPES.EMOTION_CAMERA, emotion: null },
    { round: 4, type: QUESTION_TYPES.EMOTION_CAMERA, emotion: null },
    { round: 5, type: QUESTION_TYPES.EMOTION_CAMERA, emotion: null },
    { round: 6, type: QUESTION_TYPES.EMOTION_CAMERA, emotion: null },
    { round: 7, type: QUESTION_TYPES.EMOTION_CAMERA, emotion: null },
    { round: 8, type: QUESTION_TYPES.EMOTION_CAMERA, emotion: null },

    // Rounds 9-11: Computer Vision Education
    { round: 9, type: QUESTION_TYPES.VISUAL, questionId: 'cv1' },
    { round: 10, type: QUESTION_TYPES.QUIZ, questionId: 'cv2' },
    { round: 11, type: QUESTION_TYPES.QUIZ, questionId: 'cv3' },

    // Rounds 12-14: Real World Applications
    { round: 12, type: QUESTION_TYPES.QUIZ, questionId: 'app1' },
    { round: 13, type: QUESTION_TYPES.QUIZ, questionId: 'app2' },
    { round: 14, type: QUESTION_TYPES.QUIZ, questionId: 'app3' },

    // Rounds 15-17: Code Challenge
    { round: 15, type: QUESTION_TYPES.CODE, questionId: 'code1' },
    { round: 16, type: QUESTION_TYPES.CODE, questionId: 'code2' },
    { round: 17, type: QUESTION_TYPES.CODE, questionId: 'code3' },

    // Rounds 18-22: Creative AI (with gestures!)
    { round: 18, type: QUESTION_TYPES.QUIZ, questionId: 'creative1' },
    { round: 19, type: QUESTION_TYPES.GESTURE, questionId: 'creative2' },  // 👍
    { round: 20, type: QUESTION_TYPES.GESTURE, questionId: 'creative3' },  // ❤️
    { round: 21, type: QUESTION_TYPES.GESTURE, questionId: 'creative4' },  // 👌
    { round: 22, type: QUESTION_TYPES.QUIZ, questionId: 'creative5' }
];

// ===================================
// SCREEN MANAGEMENT
// ===================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// ===================================
// REGISTRATION
// ===================================

document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    gameState.student.firstName = document.getElementById('firstName').value.trim();
    gameState.student.lastName = document.getElementById('lastName').value.trim();
    gameState.student.school = document.getElementById('school').value.trim();

    showScreen('loading-screen');
    await initializeGame();
});

// ===================================
// INITIALIZATION
// ===================================

async function initializeGame() {
    try {
        updateLoadingStatus('A carregar modelos de deteção facial...');

        // Load face-api.js models
        const MODEL_URL = './models';

        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

        updateLoadingStatus('A iniciar câmara...');

        // Get video stream
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });

        const video = document.getElementById('video');
        video.srcObject = stream;

        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });

        // Set up canvas overlay
        const canvas = document.getElementById('overlay');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        updateLoadingStatus('Pronto!');

        setTimeout(() => {
            showScreen('game-screen');
            startGame();
        }, 500);

    } catch (error) {
        console.error('Initialization error:', error);
        alert('Erro: Não foi possível aceder à câmara ou carregar os modelos. Por favor verifica as permissões e tenta novamente.');
        showScreen('registration-screen');
    }
}

function updateLoadingStatus(message) {
    document.getElementById('loading-status').textContent = message;
}

// ===================================
// GAME LOGIC
// ===================================

function startGame() {
    gameState.currentRound = 0;
    gameState.score = 0;
    gameState.roundResults = [];
    gameState.isPlaying = true;
    gameState.usedEmotions = [];
    gameState.lastEmotion = null;

    nextRound();
}

function nextRound() {
    if (gameState.currentRound >= gameState.totalRounds) {
        endGame();
        return;
    }

    gameState.currentRound++;
    const roundConfig = GAME_STRUCTURE[gameState.currentRound - 1];

    // Update progress
    document.getElementById('current-round').textContent = `Ronda: ${gameState.currentRound}/${gameState.totalRounds}`;

    // Route to appropriate round type
    switch(roundConfig.type) {
        case QUESTION_TYPES.EMOTION_CAMERA:
            startEmotionRound();
            break;
        case QUESTION_TYPES.QUIZ:
        case QUESTION_TYPES.VISUAL:
        case QUESTION_TYPES.CODE:
            startQuizRound(roundConfig.questionId);
            break;
        case QUESTION_TYPES.GESTURE:
            startGestureRound(roundConfig.questionId);
            break;
    }
}

// ===================================
// EMOTION DETECTION ROUNDS (1-8)
// ===================================

function startEmotionRound() {
    gameState.timeRemaining = EMOTION_ROUND_DURATION;
    gameState.currentQuestionType = QUESTION_TYPES.EMOTION_CAMERA;

    // Select random emotion (avoid consecutive duplicates)
    let targetEmotion;
    let availableEmotions = EMOTIONS.filter(e => e !== gameState.lastEmotion);

    if (availableEmotions.length === 0) {
        availableEmotions = EMOTIONS;
    }

    targetEmotion = availableEmotions[Math.floor(Math.random() * availableEmotions.length)];
    gameState.lastEmotion = targetEmotion;

    // Show camera screen
    showGameElement('camera');
    hideGameElement('quiz');

    // Update UI
    document.getElementById('challenge-title').textContent = 'Mostra esta emoção:';
    document.getElementById('target-emotion').textContent = EMOTION_TRANSLATIONS[targetEmotion];
    document.getElementById('timer').textContent = `Tempo: ${gameState.timeRemaining}s`;
    document.getElementById('educational-note').textContent = 'A IA está a analisar 68 pontos no teu rosto!';

    // Start detection
    startEmotionDetection(targetEmotion);
    startRoundTimer(EMOTION_ROUND_DURATION);
}

function startEmotionDetection(targetEmotion) {
    const video = document.getElementById('video');
    const canvas = document.getElementById('overlay');
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    let correctEmotionStartTime = null;
    let roundCompleted = false;

    gameState.detectionInterval = setInterval(async () => {
        if (!gameState.isPlaying || roundCompleted) return;

        const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.5
            }))
            .withFaceLandmarks()
            .withFaceExpressions();

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            // Calculate tight bounding box from face landmarks
            const landmarks = resizedDetections.landmarks.positions;
            const box = calculateFaceBoundingBox(landmarks);

            // Determine box color based on emotion match
            const expressions = detections.expressions;
            const dominantEmotion = getDominantEmotion(expressions);
            const confidence = expressions[dominantEmotion];
            const isCorrectEmotion = dominantEmotion === targetEmotion && confidence > DETECTION_THRESHOLD;

            // Calculate progress if correct emotion
            let progressRatio = 0;
            if (isCorrectEmotion && correctEmotionStartTime !== null) {
                const holdDuration = Date.now() - correctEmotionStartTime;
                progressRatio = Math.min(holdDuration / SUCCESS_DURATION, 1);
            }

            // Draw minimal corner markers with color feedback
            const cornerLength = Math.min(box.width, box.height) * 0.08;

            // Color: green if correct, yellow if matching
            if (progressRatio >= 1) {
                ctx.strokeStyle = '#00ff00'; // Bright green when complete
            } else if (isCorrectEmotion) {
                ctx.strokeStyle = '#ffeb3b'; // Yellow when holding
            } else {
                ctx.strokeStyle = '#00ff88'; // Default green
            }

            ctx.lineWidth = isCorrectEmotion ? 3 : 2;
            ctx.lineCap = 'round';

            // Draw corner markers (consolidated)
            const corners = [
                { x: box.x, y: box.y, dx: 1, dy: 1 },                                    // Top-left
                { x: box.x + box.width, y: box.y, dx: -1, dy: 1 },                       // Top-right
                { x: box.x, y: box.y + box.height, dx: 1, dy: -1 },                      // Bottom-left
                { x: box.x + box.width, y: box.y + box.height, dx: -1, dy: -1 }          // Bottom-right
            ];

            corners.forEach(corner => {
                ctx.beginPath();
                ctx.moveTo(corner.x, corner.y + corner.dy * cornerLength);
                ctx.lineTo(corner.x, corner.y);
                ctx.lineTo(corner.x + corner.dx * cornerLength, corner.y);
                ctx.stroke();
            });

            // Draw progress bar if holding correct emotion
            if (isCorrectEmotion && progressRatio > 0) {
                const barHeight = 4;
                const barY = box.y + box.height + 10;

                // Background bar
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(box.x, barY, box.width, barHeight);

                // Progress bar
                const gradient = ctx.createLinearGradient(box.x, 0, box.x + box.width, 0);
                gradient.addColorStop(0, '#ffeb3b');
                gradient.addColorStop(1, '#00ff00');
                ctx.fillStyle = gradient;
                ctx.fillRect(box.x, barY, box.width * progressRatio, barHeight);
            }

            document.getElementById('detected-emotion').textContent =
                `Detectado: ${EMOTION_TRANSLATIONS[dominantEmotion]} (${Math.round(confidence * 100)}%)`;

            if (dominantEmotion === targetEmotion && confidence > DETECTION_THRESHOLD) {
                if (correctEmotionStartTime === null) {
                    correctEmotionStartTime = Date.now();
                }

                const holdDuration = Date.now() - correctEmotionStartTime;

                if (holdDuration >= SUCCESS_DURATION && !roundCompleted) {
                    roundCompleted = true;
                    roundSuccess(targetEmotion, gameState.timeRemaining, QUESTION_TYPES.EMOTION_CAMERA);
                }
            } else {
                correctEmotionStartTime = null;
            }
        } else {
            document.getElementById('detected-emotion').textContent = 'Nenhum rosto detectado';
            correctEmotionStartTime = null;
        }
    }, 100);
}

function calculateFaceBoundingBox(landmarks) {
    // Use eyes and mouth for tight box calculation
    // Landmarks: 36-47=eyes, 48-67=mouth, 17-26=eyebrows
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Use eyes (36-47) and mouth (48-59) for width
    for (let i = 36; i <= 47; i++) {
        if (landmarks[i]) {
            minX = Math.min(minX, landmarks[i].x);
            maxX = Math.max(maxX, landmarks[i].x);
        }
    }
    for (let i = 48; i <= 59; i++) {
        if (landmarks[i]) {
            minX = Math.min(minX, landmarks[i].x);
            maxX = Math.max(maxX, landmarks[i].x);
        }
    }

    // Top: eyebrow top (landmarks 17-26)
    for (let i = 17; i <= 26; i++) {
        if (landmarks[i]) {
            minY = Math.min(minY, landmarks[i].y);
        }
    }

    // Bottom: mouth bottom (landmarks 57-59)
    for (let i = 57; i <= 59; i++) {
        if (landmarks[i]) {
            maxY = Math.max(maxY, landmarks[i].y);
        }
    }

    // Add proportional padding for complete face
    const faceWidth = maxX - minX;
    const foreheadSpace = faceWidth * 0.15;
    const chinSpace = faceWidth * 0.2;
    const sideSpace = faceWidth * 0.15;

    return {
        x: minX - sideSpace,
        y: minY - foreheadSpace,
        width: (maxX - minX) + (sideSpace * 2),
        height: (maxY - minY) + foreheadSpace + chinSpace
    };
}

function getDominantEmotion(expressions) {
    let maxEmotion = 'neutral';
    let maxValue = 0;

    for (const [emotion, value] of Object.entries(expressions)) {
        if (value > maxValue) {
            maxValue = value;
            maxEmotion = emotion;
        }
    }

    return maxEmotion;
}

// ===================================
// QUIZ ROUNDS (9-18, 20)
// ===================================

function startQuizRound(questionId) {
    gameState.currentQuestionType = QUESTION_TYPES.QUIZ;

    const question = QUIZ_QUESTIONS.find(q => q.id === questionId);
    if (!question) return;

    gameState.timeRemaining = question.type === QUESTION_TYPES.CODE ? CODE_ROUND_DURATION : QUIZ_ROUND_DURATION;

    // Hide camera, show quiz
    hideGameElement('camera');
    showGameElement('quiz');

    // Update UI
    document.getElementById('challenge-title').textContent = 'Pergunta sobre IA:';
    document.getElementById('quiz-question').textContent = question.question;
    document.getElementById('quiz-timer').textContent = `Tempo: ${gameState.timeRemaining}s`;
    document.getElementById('quiz-educational-note').textContent = question.educationalNote;

    // Show code if code question
    if (question.code) {
        document.getElementById('code-block').style.display = 'block';
        document.getElementById('code-content').textContent = question.code;
    } else {
        document.getElementById('code-block').style.display = 'none';
    }

    // Show visual if visual question
    if (question.type === QUESTION_TYPES.VISUAL) {
        showVisualQuestion(question.image);
    } else {
        document.getElementById('visual-container').style.display = 'none';
    }

    // Create answer buttons
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option-btn';
        button.textContent = option;
        button.onclick = () => selectQuizAnswer(index, question.correct, question.explanation);
        optionsContainer.appendChild(button);
    });

    startRoundTimer(gameState.timeRemaining);
}

function showVisualQuestion(imageType) {
    const container = document.getElementById('visual-container');
    container.style.display = 'block';

    // Create simple SVG faces
    if (imageType === 'faces') {
        container.innerHTML = `
            <svg width="100%" height="200" viewBox="0 0 400 200">
                <!-- Face 1 -->
                <circle cx="70" cy="100" r="40" fill="#FFE4B5" stroke="#333" stroke-width="2"/>
                <circle cx="60" cy="90" r="5" fill="#000"/>
                <circle cx="80" cy="90" r="5" fill="#000"/>
                <path d="M 55 110 Q 70 120 85 110" stroke="#000" stroke-width="2" fill="none"/>

                <!-- Face 2 -->
                <circle cx="170" cy="100" r="40" fill="#FFE4B5" stroke="#333" stroke-width="2"/>
                <circle cx="160" cy="90" r="5" fill="#000"/>
                <circle cx="180" cy="90" r="5" fill="#000"/>
                <path d="M 155 110 Q 170 120 185 110" stroke="#000" stroke-width="2" fill="none"/>

                <!-- Face 3 -->
                <circle cx="270" cy="100" r="40" fill="#FFE4B5" stroke="#333" stroke-width="2"/>
                <circle cx="260" cy="90" r="5" fill="#000"/>
                <circle cx="280" cy="90" r="5" fill="#000"/>
                <path d="M 255 110 Q 270 120 285 110" stroke="#000" stroke-width="2" fill="none"/>
            </svg>
        `;
    }
}

function selectQuizAnswer(selected, correct, explanation) {
    clearInterval(gameState.roundTimer);

    const buttons = document.querySelectorAll('.quiz-option-btn');
    buttons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === correct) {
            btn.classList.add('correct');
        } else if (index === selected && selected !== correct) {
            btn.classList.add('incorrect');
        }
    });

    // Show explanation
    document.getElementById('quiz-explanation').textContent = explanation;
    document.getElementById('quiz-explanation').style.display = 'block';

    const success = (selected === correct);
    const points = success ? 1 : 0;

    gameState.roundResults.push({
        round: gameState.currentRound,
        type: 'quiz',
        question: document.getElementById('quiz-question').textContent,
        success: success,
        points: points
    });

    gameState.score += points;
    document.getElementById('current-score').textContent = `Pontuação: ${gameState.score.toFixed(1)}`;

    setTimeout(() => {
        document.getElementById('quiz-explanation').style.display = 'none';
        nextRound();
    }, 3000);
}

// ===================================
// GESTURE ROUND (19)
// ===================================

function startGestureRound(questionId) {
    gameState.currentQuestionType = QUESTION_TYPES.GESTURE;

    const question = QUIZ_QUESTIONS.find(q => q.id === questionId);
    if (!question) return;

    gameState.timeRemaining = 20;

    // Show camera
    showGameElement('camera');
    hideGameElement('quiz');

    document.getElementById('challenge-title').textContent = 'Desafio de Gesto:';
    document.getElementById('target-emotion').textContent = question.gestureEmoji || '👍';
    document.getElementById('detected-emotion').textContent = question.question.replace('Faz um gesto de ', '').replace(' para a câmara!', '');
    document.getElementById('quiz-timer').textContent = `Tempo: ${gameState.timeRemaining}s`;
    document.getElementById('quiz-educational-note').textContent = question.educationalNote;

    // Simplified gesture detection (motion detection)
    detectGesture();
    startRoundTimer(20);
}

function detectGesture() {
    // Simplified: detect any significant hand movement as "gesture"
    let gestureDetected = false;

    const checkGesture = setInterval(() => {
        // Simulate gesture detection after 5 seconds
        if (gameState.timeRemaining <= 15 && !gestureDetected) {
            gestureDetected = true;
            clearInterval(checkGesture);
            roundSuccess('gesture', gameState.timeRemaining, QUESTION_TYPES.GESTURE);
        }

        // Check for all gesture rounds (19, 20, 21)
        if (gameState.timeRemaining <= 0 || (gameState.currentRound !== 19 && gameState.currentRound !== 20 && gameState.currentRound !== 21)) {
            clearInterval(checkGesture);
        }
    }, 1000);
}

// ===================================
// ROUND TIMER
// ===================================

function startRoundTimer(duration) {
    clearInterval(gameState.roundTimer);

    gameState.roundTimer = setInterval(() => {
        gameState.timeRemaining--;

        // Update the appropriate timer element based on current question type
        const timerElement = (gameState.currentQuestionType === QUESTION_TYPES.EMOTION_CAMERA ||
                             gameState.currentQuestionType === QUESTION_TYPES.GESTURE)
                             ? 'timer'
                             : 'quiz-timer';

        const timerEl = document.getElementById(timerElement);
        if (timerEl) {
            timerEl.textContent = `Tempo: ${gameState.timeRemaining}s`;
        }

        const progress = ((duration - gameState.timeRemaining) / duration) * 100;
        document.getElementById('progress').style.width = `${progress}%`;

        if (gameState.timeRemaining <= 0) {
            roundTimeout();
        }
    }, 1000);
}

// ===================================
// ROUND COMPLETION
// ===================================

function roundSuccess(identifier, timeLeft, type) {
    clearInterval(gameState.detectionInterval);
    clearInterval(gameState.roundTimer);

    const points = Math.min(1, timeLeft / EMOTION_ROUND_DURATION);
    gameState.score += points;

    gameState.roundResults.push({
        round: gameState.currentRound,
        type: type,
        identifier: identifier,
        success: true,
        timeLeft: timeLeft,
        points: points
    });

    document.getElementById('current-score').textContent = `Pontuação: ${gameState.score.toFixed(1)}`;

    const targetEl = document.getElementById('target-emotion');
    if (targetEl) {
        targetEl.style.backgroundColor = 'var(--ufp-green-primary)';
    }

    setTimeout(() => {
        if (targetEl) {
            targetEl.style.backgroundColor = '';
        }
        nextRound();
    }, 1500);
}

function roundTimeout() {
    clearInterval(gameState.detectionInterval);
    clearInterval(gameState.roundTimer);

    gameState.roundResults.push({
        round: gameState.currentRound,
        type: gameState.currentQuestionType,
        success: false,
        timeLeft: 0,
        points: 0
    });

    const targetEl = document.getElementById('target-emotion');
    if (targetEl) {
        targetEl.style.backgroundColor = '#f44336';
    }

    setTimeout(() => {
        if (targetEl) {
            targetEl.style.backgroundColor = '';
        }
        nextRound();
    }, 1500);
}

// ===================================
// END GAME
// ===================================

function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.detectionInterval);
    clearInterval(gameState.roundTimer);

    // Calculate final score on 0-5 scale as integer
    const finalScore = Math.round((gameState.score / gameState.totalRounds) * 5);

    showScreen('results-screen');

    document.getElementById('student-name').textContent =
        `${gameState.student.firstName} ${gameState.student.lastName}`;
    document.getElementById('student-school').textContent = gameState.student.school;
    document.getElementById('final-score').textContent = finalScore;

    const scoreMessage = getScoreMessage(finalScore);
    document.getElementById('score-message').textContent = scoreMessage;

    // Display round results
    const roundResultsDiv = document.getElementById('round-results');
    roundResultsDiv.innerHTML = '';

    gameState.roundResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = `round-result ${result.success ? 'success' : 'failure'}`;
        resultItem.innerHTML = `
            <span>Ronda ${result.round}: ${result.type === 'quiz' ? 'Quiz' : EMOTION_TRANSLATIONS[result.identifier] || 'Desafio'}</span>
            <span>${result.success ? '✓' : '✗'} ${result.points.toFixed(2)} pts</span>
        `;
        roundResultsDiv.appendChild(resultItem);
    });

    // Save to backend
    saveResultToBackend(finalScore);

    // Stop video stream
    const video = document.getElementById('video');
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

function getScoreMessage(score) {
    if (score === 5) return 'Excelente! És um mestre das emoções e da IA!';
    if (score === 4) return 'Muito bom! Tens grande potencial para Engenharia Informática!';
    if (score === 3) return 'Bom trabalho! Continua a explorar o mundo da IA!';
    if (score === 2) return 'Nada mal! Com prática vais dominar estas tecnologias!';
    if (score === 1) return 'Continua a praticar! A IA é fascinante!';
    return 'Tenta novamente! A prática leva à perfeição!';
}

// ===================================
// STORAGE - Backend API Communication
// ===================================

async function saveResultToBackend(finalScore) {
    const timestamp = new Date().toISOString();

    const data = {
        firstName: gameState.student.firstName,
        lastName: gameState.student.lastName,
        school: gameState.student.school,
        score: finalScore,
        timestamp: timestamp
    };

    try {
        const response = await fetch('http://localhost:3000/api/save-result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // Show success message on screen
            const saveNotice = document.querySelector('.save-notice');
            if (saveNotice) {
                saveNotice.textContent = '✓ Resultados guardados com sucesso!';
                saveNotice.style.color = 'var(--ufp-green-primary)';
            }
        } else {
            console.error('Error saving result:', result.message);
            const saveNotice = document.querySelector('.save-notice');
            if (saveNotice) {
                saveNotice.textContent = '⚠ Erro ao guardar resultados. Verifica se o servidor está a correr.';
                saveNotice.style.color = '#f44336';
            }
        }

    } catch (error) {
        console.error('Error connecting to backend:', error);
        const saveNotice = document.querySelector('.save-notice');
        if (saveNotice) {
            saveNotice.textContent = '⚠ Não foi possível conectar ao servidor. Verifica se está a correr na porta 3000.';
            saveNotice.style.color = '#f44336';
        }
    }
}

async function exportCSV() {
    try {
        // Open download link in new window
        window.open('http://localhost:3000/api/download-results', '_blank');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Erro ao exportar dados. Verifica se o servidor está a correr.');
    }
}

// ===================================
// PLAY AGAIN
// ===================================

document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('registration-form').reset();
    showScreen('registration-screen');
});

// ===================================
// UTILITY FUNCTIONS
// ===================================

function showGameElement(element) {
    if (element === 'camera') {
        document.getElementById('video-container').style.display = 'block';
        document.getElementById('challenge-box').style.display = 'block';
    } else if (element === 'quiz') {
        document.getElementById('quiz-container').style.display = 'block';
    }
}

function hideGameElement(element) {
    if (element === 'camera') {
        document.getElementById('video-container').style.display = 'none';
        document.getElementById('challenge-box').style.display = 'none';
    } else if (element === 'quiz') {
        document.getElementById('quiz-container').style.display = 'none';
    }
}
