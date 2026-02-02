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
    totalRounds: 19,
    score: 0,
    roundResults: [],
    isPlaying: false,
    detectionInterval: null,
    roundTimer: null,
    timeRemaining: 15,
    usedEmotions: [],
    currentQuestionType: null,
    gameStructure: null // Will be populated with randomized structure at game start
};

// Emotions to challenge (face-api.js supports these)
const EMOTIONS = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'fearful'];

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
const EMOTION_ROUND_DURATION = 20; // seconds per emotion round
const QUIZ_ROUND_DURATION = 30; // seconds per quiz round
const CODE_ROUND_DURATION = 45; // seconds per code round
const DETECTION_THRESHOLD = 0.5; // confidence threshold for emotion detection
const SUCCESS_DURATION = 1000; // milliseconds to hold correct emotion

// ===================================
// QUIZ QUESTIONS DATABASE
// ===================================

const QUIZ_QUESTIONS = [
    // BLOCO 2: Como a IA Reconhece Emoções?
    {
        id: 'cv1',
        type: QUESTION_TYPES.VISUAL,
        question: 'Quantas faces vês nesta imagem?',
        image: 'faces',
        options: ['1 face', '2 faces', '3 faces', '4 faces'],
        correct: 2,
        explanation: 'A IA usa algoritmos de deteção de faces para identificar rostos em imagens!',
        educationalNote: 'Em Engenharia Informática, aprendes a criar sistemas que identificam e analisam expressões faciais para reconhecer emoções!'
    },
    {
        id: 'cv2',
        type: QUESTION_TYPES.QUIZ,
        question: 'Qual destas emoções é mais fácil para a IA detetar com precisão?',
        options: ['Neutro', 'Feliz (sorriso)', 'Medo subtil', 'Tristeza ligeira'],
        correct: 1,
        explanation: 'O sorriso tem padrões faciais muito distintos: boca curvada para cima, bochechas elevadas e olhos contraídos!',
        educationalNote: 'Machine Learning aprende padrões em milhares de imagens. Quanto mais expressiva a emoção, mais fácil é para a IA reconhecê-la!'
    },
    {
        id: 'cv3',
        type: QUESTION_TYPES.QUIZ,
        question: 'Quantos pontos de referência faciais a IA usa para detetar emoções?',
        options: ['10 pontos', '25 pontos', '68 pontos', '100 pontos'],
        correct: 2,
        explanation: 'A IA usa 68 pontos de referência (landmarks) no rosto: sobrancelhas, olhos, nariz, boca e contorno facial!',
        educationalNote: 'Estes pontos são coordenadas precisas que permitem à IA "entender" expressões faciais, uma aplicação fascinante de Visão Computacional!'
    },

    // BLOCO 3: Inteligência Emocional e Tecnologia
    {
        id: 'app1',
        type: QUESTION_TYPES.QUIZ,
        question: 'Porque é importante que um engenheiro informático compreenda emoções humanas?',
        options: ['Não é importante', 'Para criar interfaces mais intuitivas', 'Apenas para marketing', 'Para programar mais rápido'],
        correct: 1,
        explanation: 'A Inteligência Emocional ajuda engenheiros a criar sistemas que respondem melhor às necessidades dos utilizadores!',
        educationalNote: 'UX Design + Inteligência Emocional = Aplicações que as pessoas adoram usar! Em EI aprendes a equilibrar tecnologia e psicologia!'
    },
    {
        id: 'app2',
        type: QUESTION_TYPES.QUIZ,
        question: 'Qual destas aplicações usa reconhecimento de emoções para melhorar a experiência do utilizador?',
        options: ['Calculadora simples', 'Sistema que deteta stress em motoristas', 'Bloco de notas', 'Relógio digital'],
        correct: 1,
        explanation: 'Carros inteligentes podem detetar stress ou cansaço e sugerir pausas, aumentando a segurança rodoviária!',
        educationalNote: 'Inteligência Emocional Artificial pode salvar vidas! Engenheiros criam sistemas que "entendem" estados emocionais e reagem adequadamente!'
    },
    {
        id: 'app3',
        type: QUESTION_TYPES.QUIZ,
        question: 'Qual é uma preocupação ética importante em sistemas de reconhecimento de emoções?',
        options: ['Consumo de energia', 'Privacidade e consentimento dos utilizadores', 'Cor do interface', 'Velocidade do processador'],
        correct: 1,
        explanation: 'Engenheiros responsáveis devem garantir que sistemas de IA respeitam a privacidade e têm consentimento para analisar emoções!',
        educationalNote: 'Ética em IA é fundamental! Em Engenharia Informática aprendes a criar tecnologia responsável e respeitadora dos direitos humanos!'
    },

    // BLOCO 4: Programação e Lógica Emocional
    {
        id: 'code1',
        type: QUESTION_TYPES.CODE,
        question: 'Completa o código para detetar um sorriso:',
        code: `SE boca_curvada_para_cima E olhos_contraídos:
    emoção = ?`,
        options: ['Triste', 'Feliz', 'Zangado', 'Surpreso'],
        correct: 1,
        explanation: 'Boca curvada para cima + olhos contraídos (sorriso genuíno) = Feliz! Isto chama-se "Sorriso de Duchenne".',
        educationalNote: 'Isto é lógica de programação (IF statements) aplicada a emoções! Em EI aprendes a traduzir comportamentos humanos para código!'
    },
    {
        id: 'code2',
        type: QUESTION_TYPES.CODE,
        question: 'Ordena os passos de um sistema de deteção de emoções:',
        code: `1. ???
2. ???
3. ???
4. ???`,
        options: [
            '1.Capturar imagem → 2.Analisar pontos faciais → 3.Comparar com padrões → 4.Classificar emoção',
            '1.Classificar emoção → 2.Capturar imagem → 3.Analisar pontos faciais → 4.Comparar com padrões',
            '1.Comparar com padrões → 2.Classificar emoção → 3.Capturar imagem → 4.Analisar pontos faciais',
            '1.Analisar pontos faciais → 2.Capturar imagem → 3.Classificar emoção → 4.Comparar com padrões'
        ],
        correct: 0,
        explanation: 'Um sistema de IA emocional segue sempre esta pipeline: Capturar → Analisar → Comparar → Classificar!',
        educationalNote: 'Isto é um algoritmo - uma sequência lógica de passos. Em EI aprendes a desenhar pipelines de processamento de dados!'
    },
    {
        id: 'code3',
        type: QUESTION_TYPES.CODE,
        question: 'Encontra o erro neste código de análise de emoções:',
        code: `function analisarEmocao(expressao) {
    if (expressao.confianca > 0.8) {
        return expressao.emocao;
    }
    retornar "Incerto";
}`,
        options: ['Linha 2: falta ponto e vírgula', 'Linha 5: deve ser "return" em vez de "retornar"', 'Linha 2: "if" está errado', 'Não há erro'],
        correct: 1,
        explanation: 'Em JavaScript usa-se "return", não "retornar"! Misturar português e inglês no código causa erros de sintaxe.',
        educationalNote: 'Debugging é encontrar e corrigir erros - uma competência essencial! Bons engenheiros testam sistemas de IA para garantir precisão!'
    },

    // BLOCO 5: Aplicações e Futuro da IE
    {
        id: 'creative1',
        type: QUESTION_TYPES.QUIZ,
        question: 'Como pode a deteção de emoções ajudar em ambientes de aprendizagem?',
        options: ['Não pode ajudar', 'Detetar confusão e adaptar explicações', 'Substituir professores', 'Apenas para dar notas'],
        correct: 1,
        explanation: 'Sistemas educativos inteligentes podem detetar quando um aluno está confuso e ajustar o ritmo ou método de ensino!',
        educationalNote: 'Adaptive Learning usa IA + Inteligência Emocional para personalizar educação. Em EI podes criar sistemas que tornam a aprendizagem mais eficaz!'
    },
    {
        id: 'creative2',
        type: QUESTION_TYPES.QUIZ,
        question: 'Em que áreas da Engenharia Informática trabalhas com Inteligência Emocional e reconhecimento de emoções?',
        options: ['Apenas Bases de Dados', 'Inteligência Artificial e Human-Computer Interaction', 'Apenas Hardware', 'Design Gráfico tradicional'],
        correct: 1,
        explanation: 'Reconhecimento de emoções combina IA (Machine Learning, Computer Vision) com HCI (interação humano-computador)!',
        educationalNote: 'Na UFP tens cadeiras de IA, Machine Learning, Computer Vision e Interação Pessoa-Máquina onde aprendes estas tecnologias fascinantes!'
    }
];

// ===================================
// GAME ROUNDS STRUCTURE (19 rounds)
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

    // Rounds 18-19: Creative AI
    { round: 18, type: QUESTION_TYPES.QUIZ, questionId: 'creative1' },
    { round: 19, type: QUESTION_TYPES.QUIZ, questionId: 'creative2' }
];

// ===================================
// UTILITY FUNCTIONS
// ===================================

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Create a randomized game structure with shuffled quiz questions
function createRandomizedGameStructure() {
    // Copy the base structure
    const structure = JSON.parse(JSON.stringify(GAME_STRUCTURE));

    // Extract all quiz/code question IDs from rounds 9-19
    const questionIds = structure
        .slice(8, 19) // rounds 9-19
        .map(round => round.questionId);

    // Shuffle the question IDs
    const shuffledQuestionIds = shuffleArray(questionIds);

    // Reassign shuffled IDs back to rounds 9-19
    for (let i = 8; i < 19; i++) {
        structure[i].questionId = shuffledQuestionIds[i - 8];
    }

    return structure;
}

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
// KIOSK MODE AUTO-START
// ===================================

// Check if kiosk mode is enabled on page load
window.addEventListener('DOMContentLoaded', async () => {
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.kioskMode === true) {
        // In kiosk mode, skip registration and show start screen
        gameState.student.firstName = 'Visitante';
        gameState.student.lastName = '';
        gameState.student.school = 'UFP';

        // Show kiosk start screen instead of registration
        showScreen('kiosk-start-screen');
    }
});

// Kiosk start button handler
document.getElementById('kiosk-start-btn').addEventListener('click', async () => {
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

        console.log('Loading face detection models from:', MODEL_URL);

        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            console.log('✓ TinyFaceDetector loaded');
        } catch (e) {
            console.error('✗ TinyFaceDetector failed:', e);
            throw new Error('Falha ao carregar TinyFaceDetector');
        }

        try {
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            console.log('✓ FaceLandmark68Net loaded');
        } catch (e) {
            console.error('✗ FaceLandmark68Net failed:', e);
            throw new Error('Falha ao carregar FaceLandmark68Net');
        }

        try {
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
            console.log('✓ FaceExpressionNet loaded');
        } catch (e) {
            console.error('✗ FaceExpressionNet failed:', e);
            throw new Error('Falha ao carregar FaceExpressionNet');
        }

        console.log('All face-api models loaded successfully!');

        // Note: Handpose disabled to avoid conflicts with face-api.js
        // Gesture detection will use simplified method
        console.log('Handpose disabled - using simplified gesture detection');

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

        // Start playing the video
        await video.play();

        // Wait a bit for the video to actually start streaming
        await new Promise(resolve => setTimeout(resolve, 100));

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

    // Create randomized game structure for this playthrough
    gameState.gameStructure = createRandomizedGameStructure();

    nextRound();
}

function nextRound() {
    if (gameState.currentRound >= gameState.totalRounds) {
        endGame();
        return;
    }

    gameState.currentRound++;
    const roundConfig = gameState.gameStructure[gameState.currentRound - 1];

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

    // Clear any existing detection interval
    if (gameState.detectionInterval) {
        clearInterval(gameState.detectionInterval);
        gameState.detectionInterval = null;
    }

    // Check if models are loaded
    if (!faceapi.nets.tinyFaceDetector.isLoaded ||
        !faceapi.nets.faceLandmark68Net.isLoaded ||
        !faceapi.nets.faceExpressionNet.isLoaded) {
        console.error('Face-api models not loaded!');
        document.getElementById('detected-emotion').textContent = 'Erro: Modelos não carregados';
        return;
    }

    // Ensure video dimensions are valid
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn('Video dimensions not ready, waiting...');
        setTimeout(() => startEmotionDetection(targetEmotion), 100);
        return;
    }

    console.log('Starting emotion detection:', {
        targetEmotion,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        videoReadyState: video.readyState,
        modelsLoaded: {
            tinyFaceDetector: faceapi.nets.tinyFaceDetector.isLoaded,
            faceLandmark68Net: faceapi.nets.faceLandmark68Net.isLoaded,
            faceExpressionNet: faceapi.nets.faceExpressionNet.isLoaded
        }
    });

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    faceapi.matchDimensions(canvas, displaySize);

    let correctEmotionStartTime = null;
    let roundCompleted = false;
    let detectionAttempts = 0;

    // Anti-blink: store last valid detection and box coordinates
    let lastValidDetection = null;
    let lastValidTime = Date.now();
    let lastValidBox = null;
    const DETECTION_PERSISTENCE_MS = 500; // Keep last detection for 500ms

    // Draw a test indicator to verify canvas is working
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.fillRect(10, 10, 20, 20);
    console.log('Canvas test: green square drawn at top-left');

    gameState.detectionInterval = setInterval(async () => {
        if (!gameState.isPlaying || roundCompleted) return;

        const ctx = canvas.getContext('2d');

        try {
            detectionAttempts++;

            const detections = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                    inputSize: 416,
                    scoreThreshold: 0.3
                }))
                .withFaceLandmarks()
                .withFaceExpressions();

            // Log first few attempts for debugging
            if (detectionAttempts <= 5) {
                console.log(`Detection attempt ${detectionAttempts}:`, detections ? 'Face found!' : 'No face detected');
                if (detections) {
                    console.log('Detection details:', {
                        score: detections.detection.score,
                        box: detections.detection.box,
                        expressions: detections.expressions
                    });
                }
            }

            // Anti-blink: use current detection or last valid detection
            let currentDetection = detections;
            let useLastBox = false;

            if (detections) {
                lastValidDetection = detections;
                lastValidTime = Date.now();
            } else if (lastValidDetection && (Date.now() - lastValidTime) < DETECTION_PERSISTENCE_MS) {
                // Use last valid detection if it's recent enough
                currentDetection = lastValidDetection;
                useLastBox = true;
            }

            // Only clear canvas if we have something to draw (prevents blank frames)
            if (currentDetection || lastValidBox) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            if (currentDetection) {
            const resizedDetections = faceapi.resizeResults(currentDetection, displaySize);

            // Calculate tight bounding box from face landmarks
            const landmarks = resizedDetections.landmarks.positions;
            const box = useLastBox && lastValidBox ? lastValidBox : calculateFaceBoundingBox(landmarks);

            // Store box coordinates for next frame
            if (!useLastBox) {
                lastValidBox = box;
            }

            // Determine box color based on emotion match
            const expressions = currentDetection.expressions;
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

            // Only update emotion text if we have a fresh detection (prevents blinking)
            if (detections) {
                document.getElementById('detected-emotion').textContent =
                    `Detectado: ${EMOTION_TRANSLATIONS[dominantEmotion]} (${Math.round(confidence * 100)}%)`;
            }

            // Only process correct emotion detection with fresh detections
            if (detections && dominantEmotion === targetEmotion && confidence > DETECTION_THRESHOLD) {
                if (correctEmotionStartTime === null) {
                    correctEmotionStartTime = Date.now();
                }

                const holdDuration = Date.now() - correctEmotionStartTime;

                if (holdDuration >= SUCCESS_DURATION && !roundCompleted) {
                    roundCompleted = true;
                    roundSuccess(targetEmotion, gameState.timeRemaining, QUESTION_TYPES.EMOTION_CAMERA);
                }
            } else if (detections) {
                correctEmotionStartTime = null;
            }
        } else {
            // Only show "no face" message if detection has been lost for a while
            if (!lastValidDetection || (Date.now() - lastValidTime) >= DETECTION_PERSISTENCE_MS) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                lastValidBox = null;
                document.getElementById('detected-emotion').textContent = 'A detetar...';
                correctEmotionStartTime = null;
            }
        }
        } catch (error) {
            console.error('Face detection error:', error);
            document.getElementById('detected-emotion').textContent = 'Erro na deteção';
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

    // Create answer buttons with randomized positions
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';

    // Create array of options with their original indices
    const optionsWithIndices = question.options.map((option, index) => ({
        text: option,
        originalIndex: index
    }));

    // Shuffle the options
    const shuffledOptions = shuffleArray(optionsWithIndices);

    // Find the new position of the correct answer
    const newCorrectIndex = shuffledOptions.findIndex(opt => opt.originalIndex === question.correct);

    // Create buttons with shuffled options
    shuffledOptions.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option-btn';
        button.textContent = option.text;
        button.onclick = () => selectQuizAnswer(index, newCorrectIndex, question.explanation);
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
// ROUND TIMER
// ===================================

function startRoundTimer(duration) {
    clearInterval(gameState.roundTimer);

    gameState.roundTimer = setInterval(() => {
        gameState.timeRemaining--;

        // Update the appropriate timer element based on current question type
        const timerElement = (gameState.currentQuestionType === QUESTION_TYPES.EMOTION_CAMERA)
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

    // In normal mode, stop video stream
    // In kiosk mode, keep the camera running for next game
    if (typeof APP_CONFIG === 'undefined' || APP_CONFIG.kioskMode !== true) {
        const video = document.getElementById('video');
        const stream = video.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
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
        // Check if running in Electron
        if (window.electronAPI) {
            // Electron desktop app
            const csvContent = generateCSVContent();
            const result = await window.electronAPI.exportCSV(csvContent);

            if (result.success) {
                const saveNotice = document.getElementById('save-notice');
                saveNotice.textContent = `Resultados guardados em: ${result.filePath}`;
                saveNotice.style.color = '#4CAF50';
            } else if (!result.cancelled) {
                alert('Erro ao guardar o ficheiro: ' + result.error);
            }
        } else {
            // Web browser - download via server
            window.open('http://localhost:3000/api/download-results', '_blank');
        }
    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Erro ao exportar dados. Verifica se o servidor está a correr.');
    }
}

// Helper function to generate CSV content
function generateCSVContent() {
    let csv = 'Primeiro Nome,Último Nome,Escola,Ronda,Tipo,Resultado,Emocão/Pergunta,Data\n';

    gameState.roundResults.forEach(result => {
        csv += `${gameState.student.firstName},${gameState.student.lastName},${gameState.student.school},${result.round},${result.type},${result.success},${result.emotion},${result.timestamp}\n`;
    });

    // Add total score
    csv += `\nTotal Score: ${gameState.score}/${gameState.totalRounds}\n`;

    return csv;
}

// ===================================
// PLAY AGAIN
// ===================================

document.getElementById('play-again-btn').addEventListener('click', async () => {
    // Check if kiosk mode is enabled
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.kioskMode === true) {
        // In kiosk mode, return to start screen
        gameState.currentRound = 0;
        gameState.score = 0;
        gameState.roundResults = [];
        gameState.usedEmotions = [];
        gameState.lastEmotion = null;

        showScreen('kiosk-start-screen');
    } else {
        // In normal mode, go back to registration screen
        document.getElementById('registration-form').reset();
        showScreen('registration-screen');
    }
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
