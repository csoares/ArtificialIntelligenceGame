// ===================================
// DESAFIO DAS EMOÇÕES 2.0 - UFP
// Jogo com IA e Visão Computacional (face-api.js)
// ===================================

// ===================================
// CONSTANTS
// ===================================

// Emotions the player can be asked for (face-api.js also reports 'disgusted', which we never ask for)
const EMOTIONS = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'fearful'];

// Emotions used in the "Sequência relâmpago" (fearful is too hard to hold quickly)
const SEQUENCE_EMOTIONS = ['happy', 'sad', 'angry', 'surprised', 'neutral'];

const EMOTION_TRANSLATIONS = {
    happy: 'Feliz',
    sad: 'Triste',
    angry: 'Zangado',
    surprised: 'Surpreso',
    neutral: 'Neutro',
    fearful: 'Com Medo',
    disgusted: 'Enojado'
};

const EMOTION_EMOJI = {
    happy: '😄',
    sad: '😢',
    angry: '😠',
    surprised: '😲',
    neutral: '😐',
    fearful: '😨',
    disgusted: '🤢'
};

const ROUND_TYPES = {
    EMOTION: 'emotion',
    SEQUENCE: 'sequence',
    LIE: 'lie_detector',
    TRICK: 'trick',
    GESTURE: 'gesture',
    QUIZ: 'quiz'
};

const ROUND_TYPE_LABELS = {
    emotion: '😄 Mostra a emoção',
    sequence: '⚡ Sequência relâmpago',
    lie_detector: '🚨 Detetor de mentiras',
    trick: '🎭 Engana a IA',
    gesture: '✋ Gestos',
    quiz: '🧠 Pergunta'
};

// Intro card shown before each round (the lie detector has its own full-screen intro)
const ROUND_INTROS = {
    emotion: {
        emoji: '😄',
        title: 'Mostra a emoção',
        text: 'Faz a cara pedida e aguenta-a 1 segundo. Quanto mais depressa, mais pontos.'
    },
    sequence: {
        emoji: '⚡',
        title: 'Sequência relâmpago',
        text: '5 emoções seguidas, sem parar. És mais rápido do que a IA?'
    },
    gesture: {
        emoji: '✋',
        title: 'Gestos',
        text: 'Faz os 3 gestos pedidos com as mãos. A IA segue 21 pontos em cada mão!'
    },
    trick: {
        emoji: '🎭',
        title: 'Engana a IA',
        text: 'Mostra a emoção pedida, mas cumprindo a regra. Será que a IA cai?'
    },
    quiz: {
        emoji: '🧠',
        title: 'Pergunta',
        text: 'Escolhe a resposta certa antes de o tempo acabar.'
    }
};

// Order of rounds in one game (~5 minutes). Quiz questions are picked at random each game.
const GAME_PLAN = [
    ROUND_TYPES.EMOTION,
    ROUND_TYPES.GESTURE,       // always includes 👍
    ROUND_TYPES.QUIZ,
    ROUND_TYPES.SEQUENCE,
    ROUND_TYPES.LIE,
    ROUND_TYPES.QUIZ,
    ROUND_TYPES.GESTURE,       // always includes 🫶 (two-hand heart)
    ROUND_TYPES.TRICK,
    ROUND_TYPES.QUIZ,          // last quiz is always a code question
    ROUND_TYPES.LIE            // ends with the "reveal"
];

// Round durations (seconds)
const DURATION = {
    emotion: 30,
    trick: 30,
    sequence: 45,
    gesture: 40,
    quiz: 30,
    code: 45
};

// Round intro card (title + instructions + 3-2-1)
const INTRO_READ_MS_FIRST = 3500;     // first time a round type appears: time to read before the countdown
const INTRO_READ_MS = 1200;           // later times
const ROUND_RESULT_MS = 2600;         // how long the end-of-round feedback stays on screen

const MAX_POINTS_PER_ROUND = 100;
const MAX_POINTS = GAME_PLAN.length * MAX_POINTS_PER_ROUND;

// Detection tuning
const DETECTION_INTERVAL_MS = 80;     // pause between detections
const DETECTION_PERSISTENCE_MS = 500; // keep last detection to avoid flicker
const DETECTION_THRESHOLD = 0.5;      // confidence to count an emotion as shown
const HOLD_MS = 1000;                 // hold time for emotion/trick rounds
const SEQUENCE_LENGTH = 5;
const SEQUENCE_HOLD_MS = 600;         // hold time for each emotion in the sequence
const LIE_QUESTIONS_PER_ROUND = 3;
const LIE_QUESTION_MS = 10000;        // max time each question stays on screen while the AI watches
const LIE_CAUGHT_HOLD_MS = 4000;      // after "APANHADO!", stay on it to enjoy the reaction
const LIE_RESULT_MS = 2200;           // "Cara de poker" feedback before the next question
const LIE_INTRO_AUTOSTART_MS = 45000; // start anyway if nobody presses "Estou pronto"
const LIE_END_AUTOCONTINUE_MS = 7000;
const LIE_REVEAL_AUTOCONTINUE_MS = 35000;

// Gestures (MediaPipe Gesture Recognizer, runs offline from models/mediapipe)
const GESTURES_PER_ROUND = 3;
const GESTURE_HOLD_MS = 600;          // hold each gesture this long
const GESTURE_MIN_SCORE = 0.6;        // recognizer confidence needed
const GESTURE_INTERVAL_MS = 60;       // pause between recognitions

// Keys are MediaPipe's category names, except 'Heart', which we detect from two-hand landmarks
const GESTURES = {
    Thumb_Up: { emoji: '👍', label: 'Fixe', hint: 'Polegar para cima' },
    Thumb_Down: { emoji: '👎', label: 'Nada fixe', hint: 'Polegar para baixo' },
    Victory: { emoji: '✌️', label: 'Paz', hint: 'Indicador e médio em V' },
    Pointing_Up: { emoji: '☝️', label: 'Aponta para cima', hint: 'Só o indicador esticado, para cima' },
    Closed_Fist: { emoji: '✊', label: 'Punho', hint: 'Mão fechada' },
    Open_Palm: { emoji: '✋', label: 'Mão aberta', hint: 'Mão aberta, dedos esticados' },
    ILoveYou: { emoji: '🤟', label: 'Adoro-te', hint: 'Polegar, indicador e mindinho esticados' },
    Heart: { emoji: '🫶', label: 'Coração', hint: 'Junta as duas mãos em forma de coração' }
};
const SINGLE_HAND_GESTURES = Object.keys(GESTURES).filter(key => key !== 'Heart');

// MediaPipe hand skeleton (21 landmarks)
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];
// Reaction = how much an expression rises above the player's own resting face (measured during
// the 3-2-1). A raw "1 - neutral" doesn't work: resting faces are often read as 30-60% sad/angry.
const LIE_REACTION_THRESHOLD = 0.3;   // weighted rise above the resting face that counts as a reaction
const LIE_REACTION_HOLD_MS = 300;     // the reaction must last this long (ignores single-frame glitches)
const LIE_SMOOTHING = 0.5;            // exponential smoothing of expressions (0-1, higher = jumpier)
const LIE_GRACE_MS = 300;             // ignore the first frames of each question (the first reaction is the one that matters)
const LIE_CALIBRATION_MIN_FRAMES = 5; // frames needed to trust the resting-face measurement
const LIE_BASELINE_CAP = 0.25;        // max resting value for happy/surprised (smiling at 3-2-1 isn't "resting")
// Smiles and surprise are the typical reactions; sad/angry/disgusted are what resting faces get
// misread as, so they count less.
const LIE_REACTION_WEIGHTS = {
    happy: 1,
    surprised: 1,
    fearful: 0.6,
    angry: 0.4,
    sad: 0.4,
    disgusted: 0.4
};
const LIE_MIN_FACE_RATIO = 0.5;       // a question only counts if the face was visible in >= 50% of frames

// ===================================
// CONTENT
// ===================================

// New question pool for v2 (code questions are flagged with `code`)
const QUIZ_QUESTIONS = [
    {
        id: 'ml1',
        question: 'Como é que a IA "aprendeu" a reconhecer emoções?',
        options: [
            'Alguém escreveu uma regra para cada cara',
            'Treinou com milhares de fotos de caras já classificadas',
            'Lê os teus pensamentos',
            'Pergunta a uma pessoa em tempo real'
        ],
        correct: 1,
        explanation: 'Chama-se aprendizagem supervisionada: a IA vê muitos exemplos com a resposta certa e descobre os padrões sozinha.',
        educationalNote: 'Machine Learning é uma das áreas que estudas em Engenharia Informática!'
    },
    {
        id: 'bias1',
        question: 'Se uma IA só for treinada com fotos de adultos, o que pode acontecer com caras de crianças?',
        options: [
            'Funciona ainda melhor',
            'Pode errar mais, porque nunca viu caras de crianças',
            'Deixa de funcionar com adultos',
            'Nada, a IA adapta-se sempre'
        ],
        correct: 1,
        explanation: 'Isto chama-se enviesamento (bias): a IA só é tão boa quanto os dados com que foi treinada.',
        educationalNote: 'Bons engenheiros escolhem dados variados para a IA ser justa com toda a gente.'
    },
    {
        id: 'deepfake1',
        question: 'O que é um deepfake?',
        options: [
            'Um vídeo falso criado por IA que parece real',
            'Um tipo de vírus informático',
            'Uma câmara subaquática',
            'Um filtro que melhora a luz'
        ],
        correct: 0,
        explanation: 'Deepfakes usam redes neuronais para trocar caras ou vozes. Por isso, confirma sempre as fontes!',
        educationalNote: 'Também há engenheiros a criar IA que deteta deepfakes.'
    },
    {
        id: 'conf1',
        question: 'Quando a IA diz "Feliz 87%", o que significa o 87%?',
        options: [
            'Que estás 87% feliz',
            'A confiança da IA na sua resposta',
            'A qualidade da câmara',
            'A percentagem da cara que está visível'
        ],
        correct: 1,
        explanation: 'É a probabilidade que o modelo dá a essa resposta. Não mede o que sentes, mede o quanto a IA "acha" que acertou!',
        educationalNote: 'Viste estas percentagens nas barras de emoções ao lado do vídeo.'
    },
    {
        id: 'cover1',
        question: 'Porque é que tapar metade da cara pode confundir a IA?',
        options: [
            'A IA fica envergonhada',
            'Perde muitos dos pontos da cara que usa para decidir',
            'A câmara desliga-se',
            'Não confunde nada'
        ],
        correct: 1,
        explanation: 'O modelo analisa 68 pontos (olhos, sobrancelhas, boca...). Sem metade deles, tem de adivinhar com menos informação.',
        educationalNote: 'Testar onde a IA falha é uma parte importante do trabalho de um engenheiro.'
    },
    {
        id: 'feel1',
        question: 'Uma IA que reconhece emoções também sente emoções?',
        options: [
            'Sim, sente tudo o que deteta',
            'Não, só reconhece padrões na imagem',
            'Só sente alegria',
            'Só quando está ligada à internet'
        ],
        correct: 1,
        explanation: 'A IA faz cálculos com os números dos pixels. Reconhecer uma emoção não é o mesmo que senti-la!',
        educationalNote: 'Perceber o que a IA consegue (e não consegue) fazer é essencial para a usar bem.'
    },
    {
        id: 'use1',
        question: 'Qual destas é uma boa utilização da deteção de emoções?',
        options: [
            'Espiar pessoas sem saberem',
            'Detetar cansaço num condutor e sugerir uma pausa',
            'Decidir as notas dos alunos',
            'Escolher quem pode entrar numa loja'
        ],
        correct: 1,
        explanation: 'Alguns carros já detetam sinais de cansaço e avisam o condutor. A IA ao serviço da segurança!',
        educationalNote: 'Ética em IA: a mesma tecnologia pode ser usada bem ou mal. Os engenheiros têm de pensar nisso.'
    },
    {
        id: 'privacy1',
        question: 'O que é preciso antes de usar a câmara para analisar a cara de alguém?',
        options: [
            'Uma câmara 4K',
            'O consentimento da pessoa',
            'Internet rápida',
            'Nada'
        ],
        correct: 1,
        explanation: 'A imagem da tua cara é um dado pessoal. Na Europa, o RGPD protege-o: é preciso o teu consentimento.',
        educationalNote: 'Privacidade e segurança de dados também fazem parte de Engenharia Informática.'
    },
    {
        id: 'local1',
        question: 'O que faz este jogo com a imagem da tua cara?',
        options: [
            'Envia-a para a internet',
            'Analisa-a no computador, em tempo real, sem guardar fotos',
            'Imprime-a',
            'Guarda-a num álbum'
        ],
        correct: 1,
        explanation: 'A IA corre aqui mesmo, no computador. Analisa cada imagem e esquece-a logo a seguir.',
        educationalNote: 'Correr IA "no dispositivo" é mais rápido e protege a privacidade.'
    },
    {
        id: 'hands1',
        question: 'Quantos pontos a IA usa para seguir cada mão nos gestos?',
        options: ['5 (um por dedo)', '10', '21', '68'],
        correct: 2,
        explanation: 'São 21 pontos: o pulso e 4 articulações por dedo. Com eles, a IA percebe a posição de cada dedo!',
        educationalNote: 'É assim que funcionam os filtros com as mãos e o controlo por gestos em óculos de realidade virtual.'
    },
    {
        id: 'code1',
        code: true,
        question: 'Completa o código do "Detetor de Mentiras":',
        snippet: `se confianca_neutro < 0.35:
    resultado = ?`,
        options: ['"Cara de poker!"', '"APANHADO!"', '"Estás feliz"', '"Sem cara"'],
        correct: 1,
        explanation: 'Se a cara deixa de estar neutra, o "detetor" dispara. Repara: o código mede a cara, não a verdade!',
        educationalNote: 'Uma condição "se" (if) é das primeiras coisas que aprendes a programar.'
    },
    {
        id: 'code2',
        code: true,
        question: 'Quantas emoções é que este ciclo pede?',
        snippet: `para i de 1 até 5:
    pedir_emocao_aleatoria()`,
        options: ['1', '4', '5', '6'],
        correct: 2,
        explanation: 'Um ciclo repete instruções. De 1 até 5 são 5 repetições: é assim que funciona a Sequência Relâmpago!',
        educationalNote: 'Ciclos (loops) poupam-te a escrever a mesma coisa muitas vezes.'
    },
    {
        id: 'code3',
        code: true,
        question: 'O que acontece quando este código Python corre?',
        snippet: `emocoes = ["feliz", "triste", "zangado"]
print(emocoes[3])`,
        options: [
            'Mostra "zangado"',
            'Dá erro: a lista só tem as posições 0, 1 e 2',
            'Mostra "feliz"',
            'Mostra 3'
        ],
        correct: 1,
        explanation: 'Em programação conta-se a partir do 0! A posição 3 não existe nesta lista.',
        educationalNote: 'Encontrar erros destes (debugging) faz parte do dia a dia de um programador.'
    },
    {
        id: 'code4',
        code: true,
        question: 'Quanto vale "pontos" no fim?',
        snippet: `acertos = 3
pontos = acertos * 10 + 5`,
        options: ['18', '35', '45', '30'],
        correct: 1,
        explanation: 'Primeiro multiplica (3 × 10 = 30), depois soma 5. Tal como na matemática!',
        educationalNote: 'Os jogos calculam pontuações exatamente assim.'
    }
];

// "Engana a IA": the AI only checks the target emotion; the rule is the fun part (honour system)
const TRICK_CHALLENGES = [
    {
        target: 'surprised',
        rule: 'Sem abrir a boca! Só com os olhos e as sobrancelhas.',
        note: 'A IA dá muito peso à boca aberta. Será que chega mexer só nos olhos?'
    },
    {
        target: 'happy',
        rule: 'Sem mostrar os dentes!',
        note: 'Um sorriso não é só a boca: as bochechas e os olhos também contam.'
    },
    {
        target: 'angry',
        rule: 'Só com as sobrancelhas! A boca fica quieta.',
        note: 'Sobrancelhas franzidas são um dos sinais que a IA procura na raiva.'
    },
    {
        target: 'sad',
        rule: 'Com uma mão a tapar metade da cara!',
        note: 'Com metade dos 68 pontos tapados, a IA tem de adivinhar com menos informação.'
    },
    {
        target: 'surprised',
        rule: 'Com os olhos fechados!',
        note: 'Sem olhos abertos, a IA só tem a boca e as sobrancelhas para decidir.'
    }
];

// "Detetor de Mentiras": questions meant to get a reaction from 15-17 year-olds (with friends
// watching), but fine for a school event. The player just reads them and tries not to react.
// Statements the AI "accuses" the player of. Nobody answers: the player just reads in silence and
// tries not to react. Written to tease 15-17 year-olds, but they must stay fine for a school event.
const LIE_QUESTIONS = [
    'A IA tem a certeza: já fingiste estar doente para faltar a um teste. 🤒',
    'Os teus amigos contaram-nos que já copiaste num teste… 👀',
    '"Estou quase a chegar"… disseste tu, ainda deitado na cama. 🛏️',
    'Já mandaste uma mensagem sobre alguém… a essa mesma pessoa. 😬',
    'Sabemos que já viste o Instagram de alguém até às fotos de 2019. 🕵️',
    'Deste like sem querer numa foto antiga de alguém. E entraste em pânico. 😱',
    'A IA detetou: tens uma crush por alguém da tua turma. 💘',
    'Há alguém nesta sala de quem gostas. A IA já sabe quem é. 😏',
    'Aquele trabalho que entregaste… foi uma IA que o escreveu. 🤖',
    'Deixaste alguém no "visto" de propósito. Esta semana. 👁️',
    '"Vou só ver um vídeo"… e ficaste lá duas horas. ⏰',
    'Ontem às 3 da manhã ainda estavas a ver vídeos. 🌙',
    'Na última aula fingiste que estavas a prestar atenção. 🥱',
    'Já culpaste outra pessoa por uma coisa que foste tu a fazer. 🙊',
    'Fingiste que adoraste uma prenda… e afinal odiaste. 🎁',
    'Já disseste aos teus pais que estavas num sítio e estavas noutro. 📍',
    'Choraste a ver um filme de animação. A IA viu tudo. 😭',
    'Já ensaiaste uma conversa em frente ao espelho. Várias vezes. 🪞',
    'Tiraste 30 selfies para publicar só uma. 🤳',
    '"Vi agora a tua mensagem"… mentira, viste há três horas. 📱',
    'Já fingiste estar numa chamada para não falar com alguém. 📞',
    'Cantas no duche como se estivesses num concerto. 🎤',
    'Tens uma foto no telemóvel que ninguém pode ver. Nunca. 🙈',
    'Se a IA mostrasse agora o teu histórico de pesquisas… 🔍',
    'Já te riste numa situação em que não te podias mesmo rir. 🤭'
];

const LIE_REVEAL = 'Calma! A IA não detetou mentira nenhuma: só mediu se a tua cara saiu do neutro. ' +
    'Nenhuma IA consegue ler pensamentos. É por isso que o AI Act europeu proíbe usar IA para inferir ' +
    'emoções de pessoas em escolas e locais de trabalho (salvo por razões médicas ou de segurança).';

// ===================================
// GAME STATE
// ===================================

const gameState = {
    student: {
        firstName: '',
        lastName: '',
        school: ''
    },
    currentRound: 0,
    totalRounds: GAME_PLAN.length,
    score: 0,
    roundResults: [],
    isPlaying: false,
    plan: [],              // [{type, question?, trick?}]
    round: null,           // current round: {type, ended}
    roundTimer: null,
    timeRemaining: 0,
    detectionToken: 0,
    detectionTimeout: null,
    lastEmotion: null,
    lieQueue: [],
    roundTimers: [],       // extra timeouts owned by the current round
    rankingSaved: false
};

// ===================================
// UTILITIES
// ===================================

// Fisher-Yates shuffle
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function isKioskMode() {
    return typeof APP_CONFIG !== 'undefined' && APP_CONFIG.kioskMode === true;
}

function $(id) {
    return document.getElementById(id);
}

// Build this game's plan: assign random quiz questions (last quiz = code) and trick challenges
function createGamePlan() {
    const generalQuestions = shuffleArray(QUIZ_QUESTIONS.filter(q => !q.code));
    const codeQuestions = shuffleArray(QUIZ_QUESTIONS.filter(q => q.code));
    const tricks = shuffleArray(TRICK_CHALLENGES);

    // Emotion rounds never repeat an emotion, nor one that an "Engana a IA" round of this game asks for
    const trickCount = GAME_PLAN.filter(t => t === ROUND_TYPES.TRICK).length;
    const trickTargets = tricks.slice(-trickCount).map(t => t.target);
    const freshEmotions = shuffleArray(EMOTIONS.filter(e => !trickTargets.includes(e)));
    const emotionPool = [...freshEmotions, ...shuffleArray(EMOTIONS)]; // fallback if the plan has many emotion rounds
    const emotionRound = () => ({ type: ROUND_TYPES.EMOTION, target: emotionPool.shift() });

    const quizCount = GAME_PLAN.filter(t => t === ROUND_TYPES.QUIZ).length;
    let quizSeen = 0;

    // Gesture rounds: the first always has 👍, the second the two-hand 🫶; no gesture repeats
    const singles = shuffleArray(SINGLE_HAND_GESTURES.filter(g => g !== 'Thumb_Up'));
    const mustHave = ['Thumb_Up', 'Heart'];
    let gestureRound = 0;

    return GAME_PLAN.map(type => {
        if (type === ROUND_TYPES.GESTURE) {
            if (!gestureEngine.recognizer) return emotionRound(); // no hand tracking: fall back
            const first = mustHave[gestureRound++] || singles.pop();
            const gestures = [first, ...singles.splice(0, GESTURES_PER_ROUND - 1)];
            return { type, gestures: shuffleArray(gestures) };
        }
        if (type === ROUND_TYPES.QUIZ) {
            quizSeen++;
            const question = quizSeen === quizCount ? codeQuestions.pop() : generalQuestions.pop();
            return { type, question };
        }
        if (type === ROUND_TYPES.TRICK) {
            return { type, trick: tricks.pop() };
        }
        if (type === ROUND_TYPES.EMOTION) return emotionRound();
        return { type };
    }).map((round, i, plan) => {
        if (round.type === ROUND_TYPES.LIE) {
            round.reveal = !plan.slice(i + 1).some(r => r.type === ROUND_TYPES.LIE);
        }
        return round;
    });
}

// ===================================
// SOUND EFFECTS (Web Audio, no files needed)
// ===================================

const sfx = (() => {
    let ctx = null;

    function unlock() {
        try {
            if (!ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) ctx = new AudioCtx();
            }
            if (ctx && ctx.state === 'suspended') ctx.resume();
        } catch (e) {
            console.warn('Audio unavailable:', e);
        }
    }

    // Frequency sweep from f0 to f1 over `dur` seconds
    function tone(type, f0, f1, dur, vol = 0.15, delay = 0) {
        if (!ctx) return;
        try {
            const t = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(f0, t);
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        } catch (e) {
            // Sound is a nice-to-have; never break the game because of it
        }
    }

    const sounds = {
        boing: () => { tone('sine', 120, 600, 0.12, 0.25); tone('sine', 600, 180, 0.35, 0.2, 0.12); },
        honk: () => { tone('sawtooth', 330, 300, 0.18, 0.12); tone('sawtooth', 330, 280, 0.25, 0.12, 0.22); },
        slide: () => { tone('sine', 300, 1400, 0.45, 0.18); },
        wah: () => {
            tone('triangle', 392, 370, 0.3, 0.2);
            tone('triangle', 370, 349, 0.3, 0.2, 0.32);
            tone('triangle', 349, 262, 0.7, 0.2, 0.64);
        },
        pop: () => { tone('square', 900, 1500, 0.07, 0.08); },
        alarm: () => { [0, 0.25, 0.5].forEach(d => { tone('square', 880, 660, 0.22, 0.09, d); }); },
        tick: () => { tone('sine', 1200, 1200, 0.05, 0.06); },
        go: () => { tone('sine', 1600, 1600, 0.18, 0.08); },
        success: () => { tone('triangle', 523, 523, 0.12, 0.15); tone('triangle', 784, 784, 0.25, 0.15, 0.12); },
        fail: () => { tone('sawtooth', 220, 110, 0.4, 0.1); }
    };

    function play(name) {
        if (sounds[name]) sounds[name]();
    }

    return { unlock, play };
})();

// ===================================
// SCREEN MANAGEMENT
// ===================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    $(screenId).classList.add('active');
}

function showCameraStage() {
    $('camera-stage').style.display = '';
    $('quiz-container').style.display = 'none';
}

function showQuizStage() {
    $('camera-stage').style.display = 'none';
    $('quiz-container').style.display = 'flex';
}

// ===================================
// REGISTRATION / KIOSK START
// ===================================

$('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    sfx.unlock();

    gameState.student.firstName = $('firstName').value.trim();
    gameState.student.lastName = $('lastName').value.trim();
    gameState.student.school = $('school').value.trim();

    showScreen('loading-screen');
    await initializeGame();
});

window.addEventListener('DOMContentLoaded', () => {
    buildEmotionBars();
    renderRankings();
    showAppVersion();

    if (isKioskMode()) {
        // In kiosk mode, skip registration and show start screen
        gameState.student.firstName = 'Visitante';
        gameState.student.lastName = '';
        gameState.student.school = 'UFP';
        showScreen('kiosk-start-screen');
    }
});

$('kiosk-start-btn').addEventListener('click', async () => {
    sfx.unlock();
    showScreen('loading-screen');
    await initializeGame();
});

// Show the installed version on the start screens of the desktop app (makes auto-updates easy
// to confirm). The "2.0" in the title is part of the game's name, not the version. Not shown in
// the web version: the repo's package.json isn't bumped (CI stamps the version at build time).
async function showAppVersion() {
    if (!window.electronAPI || !window.electronAPI.getVersion) return;
    let version = null;
    try {
        version = await window.electronAPI.getVersion();
    } catch (e) {
        // Version is informational only
    }
    if (!version) return;
    document.querySelectorAll('.app-version').forEach(el => {
        el.textContent = `Versão ${version}`;
    });
}

// ===================================
// INITIALIZATION (models + camera)
// ===================================

function modelsLoaded() {
    return faceapi.nets.tinyFaceDetector.isLoaded &&
        faceapi.nets.faceLandmark68Net.isLoaded &&
        faceapi.nets.faceExpressionNet.isLoaded;
}

function cameraIsLive() {
    const stream = $('video').srcObject;
    return !!stream && stream.getVideoTracks().some(track => track.readyState === 'live');
}

async function initializeGame() {
    try {
        // In Electron, models are served through the custom app-resource:// protocol
        const MODEL_URL = window.electronAPI ? 'app-resource://models' : './models';

        if (!modelsLoaded()) {
            updateLoadingStatus('A carregar modelos de deteção facial...');
            console.log('Loading face detection models from:', MODEL_URL);

            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
            console.log('All face-api models loaded successfully!');
        }

        if (!gestureEngine.recognizer && !gestureEngine.failed) {
            updateLoadingStatus('A carregar deteção de gestos...');
            await loadGestureRecognizer(MODEL_URL);
        }

        const video = $('video');

        // In kiosk mode the camera stays on between games, so only start it when needed
        if (!cameraIsLive()) {
            updateLoadingStatus('A iniciar câmara...');

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            video.srcObject = stream;

            await new Promise(resolve => {
                video.onloadedmetadata = () => resolve();
            });
            await video.play();

            // Wait a bit for the video to actually start streaming
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const canvas = $('overlay');
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
        showScreen(isKioskMode() ? 'kiosk-start-screen' : 'registration-screen');
    }
}

function updateLoadingStatus(message) {
    $('loading-status').textContent = message;
}

// ===================================
// GAME FLOW
// ===================================

function startGame() {
    gameState.currentRound = 0;
    gameState.score = 0;
    gameState.roundResults = [];
    gameState.isPlaying = true;
    gameState.lastEmotion = null;
    gameState.round = null;
    gameState.plan = createGamePlan();
    gameState.lieQueue = shuffleArray(LIE_QUESTIONS);
    gameState.introSeen = new Set();

    updateScoreDisplay();
    nextRound();
}

function nextRound() {
    if (gameState.currentRound >= gameState.totalRounds) {
        endGame();
        return;
    }

    gameState.currentRound++;
    const roundConfig = gameState.plan[gameState.currentRound - 1];
    gameState.round = { type: roundConfig.type, ended: false };

    $('current-round').textContent = `Ronda: ${gameState.currentRound}/${gameState.totalRounds}`;
    $('round-type-label').textContent = ROUND_TYPE_LABELS[roundConfig.type];
    resetChallengeBox();

    // The lie detector has its own full-screen intro
    if (roundConfig.type === ROUND_TYPES.LIE) {
        startRoundOfType(roundConfig);
        return;
    }

    if (roundConfig.type === ROUND_TYPES.QUIZ) {
        showQuizStage();
    } else {
        showCameraStage();
    }
    const round = gameState.round;
    showRoundIntro(roundConfig.type).then(() => {
        if (gameState.round === round && !round.ended) startRoundOfType(roundConfig);
    });
}

function startRoundOfType(roundConfig) {
    switch (roundConfig.type) {
        case ROUND_TYPES.EMOTION:
            startEmotionRound(roundConfig.target);
            break;
        case ROUND_TYPES.TRICK:
            startTrickRound(roundConfig.trick);
            break;
        case ROUND_TYPES.SEQUENCE:
            startSequenceRound();
            break;
        case ROUND_TYPES.GESTURE:
            startGestureRound(roundConfig.gestures);
            break;
        case ROUND_TYPES.LIE:
            startLieDetectorRound(roundConfig.reveal);
            break;
        case ROUND_TYPES.QUIZ:
            startQuizRound(roundConfig.question);
            break;
    }
}

/**
 * Intro card: emoji, title, one-line instructions, then 3-2-1.
 * The first time a round type appears there is extra time to read.
 */
function showRoundIntro(type) {
    const intro = ROUND_INTROS[type];
    const first = !gameState.introSeen.has(type);
    gameState.introSeen.add(type);

    $('intro-emoji').textContent = intro.emoji;
    $('intro-title').textContent = intro.title;
    $('intro-text').textContent = intro.text;
    $('intro-countdown').textContent = '';
    $('round-intro').hidden = false;

    return new Promise(resolve => {
        const readMs = first ? INTRO_READ_MS_FIRST : INTRO_READ_MS;
        ['3', '2', '1'].forEach((n, i) => {
            gameState.roundTimers.push(setTimeout(() => {
                setCountdown($('intro-countdown'), n);
                sfx.play('tick');
            }, readMs + i * 1000));
        });
        gameState.roundTimers.push(setTimeout(() => {
            $('round-intro').hidden = true;
            sfx.play('go');
            resolve();
        }, readMs + 3000));
    });
}

function setCountdown(el, text) {
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth; // restart animation
    el.classList.add('pop');
}

// Hide every round-specific element so each round only shows what it needs
function resetChallengeBox() {
    $('round-intro').hidden = true;
    $('lie-stage').hidden = true;
    $('challenge-rule').style.display = 'none';
    $('sequence-track').style.display = 'none';
    $('sequence-track').innerHTML = '';
    $('challenge-title').textContent = '';
    $('target-emotion').textContent = '';
    $('educational-note').textContent = '';
    $('quiz-question').textContent = '';
    $('quiz-options').innerHTML = '';
    $('code-block').style.display = 'none';
    $('quiz-explanation').style.display = 'none';
    $('target-emotion').style.display = '';
    $('emotion-bars').style.display = '';
    $('target-emotion').classList.remove('is-win', 'is-lose');
    $('round-feedback').className = 'round-feedback';
    $('round-feedback').textContent = '';
    $('progress').style.width = '0%';
}

function updateScoreDisplay() {
    $('current-score').textContent = `Pontos: ${gameState.score}`;
}

/**
 * Finish the current round exactly once.
 * outcome: 'win' | 'lose' | 'neutral' (quiz rounds show their own feedback)
 */
function endRound({ label, success, points, outcome = 'neutral', message = '', delay = ROUND_RESULT_MS }) {
    const round = gameState.round;
    if (!round || round.ended) return;
    round.ended = true;

    stopDetectionLoop();
    clearInterval(gameState.roundTimer);
    clearRoundTimers();

    points = Math.max(0, Math.min(MAX_POINTS_PER_ROUND, Math.round(points)));
    gameState.score += points;
    updateScoreDisplay();

    gameState.roundResults.push({
        round: gameState.currentRound,
        type: round.type,
        label,
        success,
        points,
        timestamp: new Date().toISOString()
    });

    if (outcome !== 'neutral') {
        const targetEl = $('target-emotion');
        targetEl.classList.add(outcome === 'win' ? 'is-win' : 'is-lose');

        const feedback = $('round-feedback');
        feedback.textContent = `${message} +${points}`;
        feedback.className = `round-feedback show ${outcome}`;

        sfx.play(outcome === 'win' ? 'success' : 'fail');
    }

    setTimeout(nextRound, delay);
}

// ===================================
// ROUND TIMER
// ===================================

function startRoundTimer(duration, onTimeout) {
    clearInterval(gameState.roundTimer);
    gameState.timeRemaining = duration;
    updateTimerDisplay();

    gameState.roundTimer = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();

        const progress = ((duration - gameState.timeRemaining) / duration) * 100;
        $('progress').style.width = `${progress}%`;

        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.roundTimer);
            onTimeout();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const text = `${gameState.timeRemaining}s`;
    const urgent = gameState.timeRemaining <= 5;
    ['timer', 'quiz-timer'].forEach(id => {
        $(id).textContent = text;
        $(id).classList.toggle('urgent', urgent);
    });
}

// ===================================
// FACE DETECTION LOOP (shared by all camera rounds)
// ===================================

/**
 * Runs face detection continuously and calls onFrame(expressions, fresh) on every tick.
 * - expressions: face-api expressions object, or null when no face is visible
 * - fresh: true when the expressions come from this frame (false = reused for anti-flicker)
 * onFrame may return { state: 'match' | 'warn', progress: 0..1 } to colour the face marker.
 */
function startDetectionLoop(onFrame) {
    stopDetectionLoop();
    const token = gameState.detectionToken;

    const video = $('video');
    const canvas = $('overlay');

    if (!modelsLoaded()) {
        console.error('Face-api models not loaded!');
        $('detected-emotion').textContent = 'Erro: Modelos não carregados';
        return;
    }

    let lastValid = null;
    let lastValidTime = 0;
    let lastBox = null;

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 });

    const tick = async () => {
        if (token !== gameState.detectionToken || !gameState.isPlaying) return;

        // Video may not be ready yet
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            gameState.detectionTimeout = setTimeout(tick, 100);
            return;
        }

        let detection = null;
        try {
            detection = await faceapi
                .detectSingleFace(video, detectorOptions)
                .withFaceLandmarks()
                .withFaceExpressions();
        } catch (error) {
            console.error('Face detection error:', error);
        }

        // The round may have ended while we were waiting for the detector
        if (token !== gameState.detectionToken) return;

        const now = Date.now();
        let current = detection;
        if (detection) {
            lastValid = detection;
            lastValidTime = now;
        } else if (lastValid && now - lastValidTime < DETECTION_PERSISTENCE_MS) {
            current = lastValid;
        } else {
            lastValid = null;
            lastBox = null;
        }

        const feedback = onFrame(current ? current.expressions : null, !!detection) || {};
        if (token !== gameState.detectionToken) return; // onFrame ended the round

        // Draw face marker
        if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (current) {
            if (detection) {
                const resized = faceapi.resizeResults(detection, { width: video.videoWidth, height: video.videoHeight });
                lastBox = calculateFaceBoundingBox(resized.landmarks.positions);
            }
            if (lastBox) drawFaceMarker(ctx, lastBox, feedback);
        }

        // Live text + emotion bars
        if (detection) {
            const dominant = getDominantEmotion(detection.expressions);
            $('detected-emotion').textContent =
                `A IA vê: ${EMOTION_EMOJI[dominant]} ${EMOTION_TRANSLATIONS[dominant]} (${Math.round(detection.expressions[dominant] * 100)}%)`;
            updateEmotionBars(detection.expressions);
        } else if (!current) {
            $('detected-emotion').textContent = '👀 À procura da tua cara...';
            updateEmotionBars(null);
        }

        gameState.detectionTimeout = setTimeout(tick, DETECTION_INTERVAL_MS);
    };

    tick();
}

function stopDetectionLoop() {
    gameState.detectionToken++;
    clearTimeout(gameState.detectionTimeout);
    const canvas = $('overlay');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function drawFaceMarker(ctx, box, { state, progress = 0 }) {
    const cornerLength = Math.min(box.width, box.height) * 0.12;

    if (state === 'warn') {
        ctx.strokeStyle = '#ff5252';
    } else if (state === 'match') {
        ctx.strokeStyle = progress >= 1 ? '#00ff00' : '#ffeb3b';
    } else {
        ctx.strokeStyle = '#00ff88';
    }
    ctx.lineWidth = state ? 4 : 2;
    ctx.lineCap = 'round';

    const corners = [
        { x: box.x, y: box.y, dx: 1, dy: 1 },
        { x: box.x + box.width, y: box.y, dx: -1, dy: 1 },
        { x: box.x, y: box.y + box.height, dx: 1, dy: -1 },
        { x: box.x + box.width, y: box.y + box.height, dx: -1, dy: -1 }
    ];
    corners.forEach(corner => {
        ctx.beginPath();
        ctx.moveTo(corner.x, corner.y + corner.dy * cornerLength);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x + corner.dx * cornerLength, corner.y);
        ctx.stroke();
    });

    // Hold progress bar under the face
    if (progress > 0) {
        const barHeight = 6;
        const barY = box.y + box.height + 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(box.x, barY, box.width, barHeight);
        const gradient = ctx.createLinearGradient(box.x, 0, box.x + box.width, 0);
        gradient.addColorStop(0, '#ffeb3b');
        gradient.addColorStop(1, '#00ff00');
        ctx.fillStyle = gradient;
        ctx.fillRect(box.x, barY, box.width * Math.min(progress, 1), barHeight);
    }
}

function calculateFaceBoundingBox(landmarks) {
    // Landmarks: 17-26 eyebrows, 36-47 eyes, 48-67 mouth
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (let i = 36; i <= 59; i++) {
        if (landmarks[i]) {
            minX = Math.min(minX, landmarks[i].x);
            maxX = Math.max(maxX, landmarks[i].x);
        }
    }
    for (let i = 17; i <= 26; i++) {
        if (landmarks[i]) minY = Math.min(minY, landmarks[i].y);
    }
    for (let i = 57; i <= 59; i++) {
        if (landmarks[i]) maxY = Math.max(maxY, landmarks[i].y);
    }

    const faceWidth = maxX - minX;
    const foreheadSpace = faceWidth * 0.15;
    const chinSpace = faceWidth * 0.2;
    const sideSpace = faceWidth * 0.15;

    return {
        x: minX - sideSpace,
        y: minY - foreheadSpace,
        width: faceWidth + sideSpace * 2,
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
// LIVE EMOTION BARS
// ===================================

function buildEmotionBars() {
    const container = $('emotion-bars');
    container.innerHTML = '';
    EMOTIONS.forEach(emotion => {
        const row = document.createElement('div');
        row.className = 'emotion-bar-row';
        row.dataset.emotion = emotion;
        row.innerHTML = `
            <span class="emotion-bar-label">${EMOTION_EMOJI[emotion]} ${EMOTION_TRANSLATIONS[emotion]}</span>
            <span class="emotion-bar-track"><span class="emotion-bar-fill"></span></span>
            <span class="emotion-bar-value">0%</span>
        `;
        container.appendChild(row);
    });
}

function updateEmotionBars(expressions) {
    document.querySelectorAll('.emotion-bar-row').forEach(row => {
        const value = expressions ? (expressions[row.dataset.emotion] || 0) : 0;
        const pct = Math.round(value * 100);
        row.querySelector('.emotion-bar-fill').style.width = `${pct}%`;
        row.querySelector('.emotion-bar-value').textContent = `${pct}%`;
        row.classList.toggle('top', expressions !== null && value >= DETECTION_THRESHOLD);
    });
}

// ===================================
// HOLD DETECTOR (emotion, trick and sequence rounds)
// ===================================

// Returns a function that tracks how long `target` has been held on fresh frames
function createHoldTracker(holdMs) {
    let holdStart = null;
    return function track(expressions, fresh, target) {
        if (!expressions) {
            holdStart = null;
            return { matched: false, progress: 0, done: false };
        }
        const dominant = getDominantEmotion(expressions);
        const matched = dominant === target && expressions[dominant] > DETECTION_THRESHOLD;

        if (fresh) {
            if (matched) {
                if (holdStart === null) holdStart = Date.now();
            } else {
                holdStart = null;
            }
        }

        const progress = matched && holdStart !== null ? (Date.now() - holdStart) / holdMs : 0;
        const done = fresh && matched && progress >= 1;
        if (done) holdStart = null;
        return { matched, progress, done };
    };
}

function pickEmotion(pool) {
    const options = pool.filter(e => e !== gameState.lastEmotion);
    const emotion = pickRandom(options.length ? options : pool);
    gameState.lastEmotion = emotion;
    return emotion;
}

// ===================================
// ROUND: MOSTRA A EMOÇÃO / ENGANA A IA
// ===================================

function startEmotionRound(target) {
    gameState.lastEmotion = target;
    runHoldEmotionRound({
        target: target || pickEmotion(EMOTIONS),
        title: 'Mostra esta emoção:',
        note: 'A IA está a analisar 68 pontos no teu rosto!',
        duration: DURATION.emotion,
        type: ROUND_TYPES.EMOTION
    });
}

function startTrickRound(trick) {
    gameState.lastEmotion = trick.target;
    runHoldEmotionRound({
        target: trick.target,
        title: 'Engana a IA! Mostra:',
        rule: trick.rule,
        note: trick.note,
        duration: DURATION.trick,
        type: ROUND_TYPES.TRICK
    });
}

function runHoldEmotionRound({ target, title, rule, note, duration, type }) {
    showCameraStage();

    $('challenge-title').textContent = title;
    $('target-emotion').textContent = `${EMOTION_EMOJI[target]} ${EMOTION_TRANSLATIONS[target]}`;
    $('educational-note').textContent = note;
    if (rule) {
        $('challenge-rule').textContent = `Regra: ${rule}`;
        $('challenge-rule').style.display = 'block';
    }

    const label = type === ROUND_TYPES.TRICK
        ? `Engana a IA: ${EMOTION_TRANSLATIONS[target]}`
        : EMOTION_TRANSLATIONS[target];
    const track = createHoldTracker(HOLD_MS);

    startDetectionLoop((expressions, fresh) => {
        const { matched, progress, done } = track(expressions, fresh, target);
        if (done) {
            // Faster = more points (40 for just making it, up to 100)
            const points = 40 + 60 * (gameState.timeRemaining / duration);
            endRound({ label, success: true, points, outcome: 'win', message: '✔ Boa!' });
        }
        return { state: matched ? 'match' : null, progress };
    });

    startRoundTimer(duration, () => {
        endRound({ label, success: false, points: 0, outcome: 'lose', message: '⏱ Tempo esgotado!' });
    });
}

// ===================================
// ROUND: SEQUÊNCIA RELÂMPAGO
// ===================================

function startSequenceRound() {
    showCameraStage();

    // Each emotion at most once (repeats only if SEQUENCE_LENGTH is longer than the list)
    const sequence = [];
    while (sequence.length < SEQUENCE_LENGTH) {
        const next = shuffleArray(SEQUENCE_EMOTIONS).filter(e => e !== sequence[sequence.length - 1]);
        sequence.push(...next.slice(0, SEQUENCE_LENGTH - sequence.length));
    }

    $('challenge-title').textContent = `Faz as ${SEQUENCE_LENGTH} emoções o mais rápido possível!`;
    $('educational-note').textContent = 'A IA analisa cerca de 10 imagens por segundo. Consegues ser mais rápido do que ela?';

    const track = $('sequence-track');
    track.style.display = 'flex';
    sequence.forEach((emotion, i) => {
        const chip = document.createElement('div');
        chip.className = 'sequence-chip';
        chip.dataset.index = i;
        chip.innerHTML = `<span class="chip-emoji">${EMOTION_EMOJI[emotion]}</span><span class="chip-label">${EMOTION_TRANSLATIONS[emotion]}</span>`;
        track.appendChild(chip);
    });

    let index = 0;
    const holdTrack = createHoldTracker(SEQUENCE_HOLD_MS);

    const showCurrent = () => {
        track.querySelectorAll('.sequence-chip').forEach((chip, i) => {
            chip.classList.toggle('current', i === index);
            chip.classList.toggle('done', i < index);
        });
        if (index < sequence.length) {
            $('target-emotion').textContent = `${EMOTION_EMOJI[sequence[index]]} ${EMOTION_TRANSLATIONS[sequence[index]]}`;
        }
    };
    showCurrent();

    const label = 'Sequência relâmpago';

    startDetectionLoop((expressions, fresh) => {
        const { matched, progress, done } = holdTrack(expressions, fresh, sequence[index]);
        if (done) {
            index++;
            sfx.play('pop');
            showCurrent();
            if (index === sequence.length) {
                // 15 points per emotion + up to 25 time bonus
                const points = 15 * SEQUENCE_LENGTH + 25 * (gameState.timeRemaining / DURATION.sequence);
                endRound({ label: `${label} (${index}/${SEQUENCE_LENGTH})`, success: true, points, outcome: 'win', message: '⚡ Relâmpago!' });
            }
            return { state: 'match', progress: 1 };
        }
        return { state: matched ? 'match' : null, progress };
    });

    startRoundTimer(DURATION.sequence, () => {
        endRound({
            label: `${label} (${index}/${SEQUENCE_LENGTH})`,
            success: false,
            points: 15 * index,
            outcome: index > 0 ? 'win' : 'lose',
            message: `⏱ ${index}/${SEQUENCE_LENGTH} emoções`
        });
    });
}

// ===================================
// GESTURE ENGINE (MediaPipe Gesture Recognizer)
// ===================================

const gestureEngine = { recognizer: null, failed: false, lastTimestamp: 0 };

// Loads MediaPipe from models/mediapipe. Never throws: on failure gesture rounds become emotion rounds.
async function loadGestureRecognizer(modelUrl) {
    const base = `${modelUrl}/mediapipe`;
    try {
        const vision = await import(`${base}/vision_bundle.mjs`);
        const fileset = await vision.FilesetResolver.forVisionTasks(base);
        const options = delegate => ({
            baseOptions: { modelAssetPath: `${base}/gesture_recognizer.task`, delegate },
            runningMode: 'VIDEO',
            numHands: 2
        });
        try {
            gestureEngine.recognizer = await vision.GestureRecognizer.createFromOptions(fileset, options('GPU'));
        } catch (gpuError) {
            console.warn('Gesture recognizer: GPU unavailable, using CPU', gpuError);
            gestureEngine.recognizer = await vision.GestureRecognizer.createFromOptions(fileset, options('CPU'));
        }
        console.log('Gesture recognizer loaded');
    } catch (error) {
        console.error('Gesture recognizer unavailable, gesture rounds disabled:', error);
        gestureEngine.failed = true;
        gestureEngine.recognizer = null;
    }
}

// [{ gesture, score, landmarks: [{x, y}] in video pixels }]
function parseHands(result, width, height) {
    if (!result || !result.landmarks) return [];
    return result.landmarks.map((landmarks, i) => {
        const top = (result.gestures && result.gestures[i] && result.gestures[i][0]) || null;
        return {
            gesture: top ? top.categoryName : 'None',
            score: top ? top.score : 0,
            landmarks: landmarks.map(p => ({ x: p.x * width, y: p.y * height }))
        };
    });
}

// Two-hand heart 🫶: index fingertips touch at the top, thumb tips touch at the bottom,
// with a gap (the "hole" of the heart) between them.
function isHeart(hands) {
    if (hands.length < 2) return false;
    const [a, b] = hands.map(hand => hand.landmarks);
    const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    const handSize = (dist(a[0], a[9]) + dist(b[0], b[9])) / 2;
    if (!handSize) return false;

    const indexGap = dist(a[8], b[8]);
    const thumbGap = dist(a[4], b[4]);
    const indexY = (a[8].y + b[8].y) / 2;
    const thumbY = (a[4].y + b[4].y) / 2;

    return indexGap < 0.6 * handSize &&
        thumbGap < 0.6 * handSize &&
        thumbY - indexY > 0.35 * handSize; // thumbs below the index fingers (y grows downwards)
}

function handsShowGesture(hands, target) {
    if (target === 'Heart') return isHeart(hands);
    return hands.some(hand => hand.gesture === target && hand.score >= GESTURE_MIN_SCORE);
}

function describeHands(hands) {
    if (hands.length === 0) return '🖐️ Mostra as mãos à câmara...';
    if (isHeart(hands)) return `A IA vê: ${GESTURES.Heart.emoji} ${GESTURES.Heart.label}`;
    const seen = hands.map(hand => {
        const known = GESTURES[hand.gesture];
        return known && hand.score >= GESTURE_MIN_SCORE
            ? `${known.emoji} ${known.label} (${Math.round(hand.score * 100)}%)`
            : '🖐️ ?';
    });
    return `A IA vê: ${seen.join(' + ')}`;
}

/**
 * Same contract as startDetectionLoop, but for hands: calls onFrame(hands) on every tick and
 * draws the hand skeletons. Shares the detection token, so stopDetectionLoop() stops it too.
 */
function startGestureLoop(onFrame) {
    stopDetectionLoop();
    const token = gameState.detectionToken;
    const video = $('video');
    const canvas = $('overlay');

    const tick = () => {
        if (token !== gameState.detectionToken || !gameState.isPlaying) return;

        if (video.readyState < 2 || video.videoWidth === 0) {
            gameState.detectionTimeout = setTimeout(tick, 100);
            return;
        }

        let result = null;
        try {
            // VIDEO mode needs strictly increasing timestamps
            const timestamp = Math.max(performance.now(), gestureEngine.lastTimestamp + 1);
            gestureEngine.lastTimestamp = timestamp;
            result = gestureEngine.recognizer.recognizeForVideo(video, timestamp);
        } catch (error) {
            console.error('Gesture recognition error:', error);
        }

        const hands = parseHands(result, video.videoWidth, video.videoHeight);
        const feedback = onFrame(hands) || {};
        if (token !== gameState.detectionToken) return; // onFrame ended the round

        if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hands.forEach(hand => drawHand(ctx, hand.landmarks, feedback.state));

        $('detected-emotion').textContent = describeHands(hands);
        gameState.detectionTimeout = setTimeout(tick, GESTURE_INTERVAL_MS);
    };

    tick();
}

function drawHand(ctx, points, state) {
    const color = state === 'match' ? '#34c759' : '#f4c430';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.85;
    HAND_CONNECTIONS.forEach(([from, to]) => {
        ctx.beginPath();
        ctx.moveTo(points[from].x, points[from].y);
        ctx.lineTo(points[to].x, points[to].y);
        ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ===================================
// ROUND: GESTOS
// ===================================

function startGestureRound(gestureKeys) {
    showCameraStage();

    $('challenge-title').textContent = 'Faz este gesto com as mãos:';
    $('educational-note').textContent = 'A IA encontra 21 pontos em cada mão e reconhece o gesto pela posição dos dedos.';
    $('emotion-bars').style.display = 'none';

    const track = $('sequence-track');
    track.style.display = 'flex';
    gestureKeys.forEach(key => {
        const chip = document.createElement('div');
        chip.className = 'sequence-chip';
        chip.innerHTML = `<span class="chip-emoji">${GESTURES[key].emoji}</span><span class="chip-label">${GESTURES[key].label}</span>`;
        track.appendChild(chip);
    });

    let index = 0;
    let holdStart = null;

    const showCurrent = () => {
        track.querySelectorAll('.sequence-chip').forEach((chip, i) => {
            chip.classList.toggle('current', i === index);
            chip.classList.toggle('done', i < index);
        });
        if (index < gestureKeys.length) {
            const gesture = GESTURES[gestureKeys[index]];
            $('target-emotion').textContent = `${gesture.emoji} ${gesture.label}`;
            $('challenge-rule').textContent = gesture.hint;
            $('challenge-rule').style.display = 'block';
        }
    };
    showCurrent();

    const total = gestureKeys.length;
    const label = () => `Gestos (${index}/${total})`;
    const perGesture = 75 / total;

    startGestureLoop(hands => {
        const matched = handsShowGesture(hands, gestureKeys[index]);
        if (!matched) {
            holdStart = null;
            return {};
        }
        if (holdStart === null) holdStart = Date.now();
        if (Date.now() - holdStart < GESTURE_HOLD_MS) return { state: 'match' };

        holdStart = null;
        index++;
        sfx.play('pop');
        showCurrent();
        if (index === total) {
            // 25 per gesture + up to 25 time bonus
            const points = perGesture * total + 25 * (gameState.timeRemaining / DURATION.gesture);
            endRound({ label: label(), success: true, points, outcome: 'win', message: '🙌 Mãos de mestre!' });
        }
        return { state: 'match' };
    });

    startRoundTimer(DURATION.gesture, () => {
        endRound({
            label: label(),
            success: false,
            points: perGesture * index,
            outcome: index > 0 ? 'win' : 'lose',
            message: `⏱ ${index}/${total} gestos`
        });
    });
}

// ===================================
// ROUND: DETETOR DE MENTIRAS
// ===================================

/**
 * The AI "pretends" to be a lie detector, on a full-screen dark stage (no camera, no bars).
 * 1. Intro explains the rules; "Estou pronto" (or a timeout) starts a 3-2-1.
 * 2. During the 3-2-1 the AI measures the player's resting face (baseline). Each question then
 *    stays up to LIE_QUESTION_MS; after LIE_GRACE_MS of reading time, a weighted rise of any
 *    expression above the baseline (smoothed) beyond LIE_REACTION_THRESHOLD for
 *    LIE_REACTION_HOLD_MS -> "APANHADO!", which stays on screen LIE_CAUGHT_HOLD_MS so
 *    everyone can enjoy the reaction.
 * 3. The end panel shows the score; the last lie round of the game also shows LIE_REVEAL.
 */
function startLieDetectorRound(reveal) {
    const round = gameState.round;
    showCameraStage(); // the video keeps playing behind the stage, the AI still sees the player
    $('target-emotion').style.display = 'none';

    if (gameState.lieQueue.length < LIE_QUESTIONS_PER_ROUND) {
        gameState.lieQueue = shuffleArray(LIE_QUESTIONS);
    }
    const questions = gameState.lieQueue.splice(0, LIE_QUESTIONS_PER_ROUND);
    const results = [];        // 'pass' | 'caught' | 'noface'

    const stage = $('lie-stage');
    const showPanel = panel => { stage.dataset.panel = panel; };
    stage.classList.remove('alarm', 'passed');
    stage.hidden = false;
    showPanel('intro');
    $('lie-rule-count').textContent = questions.length;
    $('lie-dots').innerHTML = questions.map(() => '<span class="lie-dot"></span>').join('');

    let index = -1;
    let phase = 'intro';       // intro | countdown | asking | caught | result | done
    let framesTotal = 0;
    let framesWithFace = 0;
    let smoothed = null;       // smoothed expressions during the current question
    let reactionSince = null;
    let questionStart = 0;
    let questionTimer = null;
    let baseline = null;       // resting face, measured during the 3-2-1
    const calibration = { sums: {}, frames: 0 };

    const later = (fn, ms) => {
        const id = setTimeout(fn, ms);
        gameState.roundTimers.push(id);
        return id;
    };

    const setVerdict = (text, kind = '') => {
        $('lie-verdict').textContent = text;
        $('lie-verdict').className = `lie-verdict ${kind}`;
    };

    const markDot = (i, cls) => {
        const dot = $('lie-dots').children[i];
        if (dot) dot.className = `lie-dot ${cls}`;
    };

    const askQuestion = i => {
        if (round.ended) return;
        if (i >= questions.length) {
            finish();
            return;
        }
        index = i;
        phase = 'asking';
        framesTotal = 0;
        framesWithFace = 0;
        smoothed = null;
        reactionSince = null;
        questionStart = Date.now();

        stage.classList.remove('alarm', 'passed');
        const question = $('lie-question');
        question.textContent = questions[i];
        question.classList.remove('appear', 'pop'); // 'pop' is the giant 3-2-1 style
        void question.offsetWidth; // restart animation
        question.classList.add('appear');
        setVerdict('😐 Mantém a cara de poker…', 'hint');
        $('lie-status').textContent = 'A IA está a analisar a tua cara…';
        markDot(i, 'current');
        sfx.play('tick');

        questionTimer = later(resolveQuestion, LIE_QUESTION_MS);
    };

    const resolveQuestion = () => {
        if (phase !== 'asking') return;
        phase = 'result';
        const sawFace = framesTotal > 0 && framesWithFace / framesTotal >= LIE_MIN_FACE_RATIO;
        const result = sawFace ? 'pass' : 'noface';
        results.push(result);
        markDot(index, result);
        if (sawFace) {
            stage.classList.add('passed');
            setVerdict('😐 Cara de poker. Desta escapaste…', 'pass');
        } else {
            setVerdict('👀 Não te consegui ver. Esta não conta!', 'noface');
        }
        later(() => askQuestion(index + 1), LIE_RESULT_MS);
    };

    const caught = () => {
        phase = 'caught';
        clearTimeout(questionTimer);
        results.push('caught');
        markDot(index, 'caught');
        stage.classList.add('alarm');
        setVerdict('🚨 APANHADO! 🚨', 'caught');
        $('lie-status').textContent = 'A tua cara confessou tudo…';
        sfx.play('alarm');
        later(() => sfx.play('alarm'), 1300);
        later(() => askQuestion(index + 1), LIE_CAUGHT_HOLD_MS);
    };

    const addCalibrationFrame = expressions => {
        Object.entries(expressions).forEach(([emotion, value]) => {
            calibration.sums[emotion] = (calibration.sums[emotion] || 0) + value;
        });
        calibration.frames++;
    };

    const finishCalibration = () => {
        if (baseline || calibration.frames < LIE_CALIBRATION_MIN_FRAMES) return;
        baseline = {};
        Object.entries(calibration.sums).forEach(([emotion, sum]) => {
            baseline[emotion] = sum / calibration.frames;
        });
        baseline.happy = Math.min(baseline.happy || 0, LIE_BASELINE_CAP);
        baseline.surprised = Math.min(baseline.surprised || 0, LIE_BASELINE_CAP);
        console.log('Lie detector baseline:', baseline);
    };

    // Weighted rise of the strongest expression above the resting face
    const reactionLevel = () => Math.max(...Object.entries(LIE_REACTION_WEIGHTS).map(
        ([emotion, weight]) => weight * ((smoothed[emotion] || 0) - (baseline[emotion] || 0))
    ));

    const onFrame = (expressions, fresh) => {
        if (expressions && !fresh) return {}; // reused (anti-flicker) frame: ignore

        if (phase === 'countdown') {
            if (expressions) addCalibrationFrame(expressions);
            return {};
        }
        if (phase !== 'asking') return {};

        framesTotal++;
        if (!expressions) {
            $('lie-status').textContent = '👀 Não te estou a ver. Olha para a câmara!';
            reactionSince = null;
            return {};
        }
        framesWithFace++;
        $('lie-status').textContent = 'A IA está a analisar a tua cara…';

        smoothed = smoothed
            ? Object.fromEntries(Object.keys(expressions).map(emotion => [
                emotion, smoothed[emotion] + LIE_SMOOTHING * (expressions[emotion] - smoothed[emotion])
            ]))
            : { ...expressions };

        const now = Date.now();
        if (now - questionStart < LIE_GRACE_MS) {
            // Reading time. If the 3-2-1 didn't see the face, calibrate now instead.
            if (!baseline) addCalibrationFrame(expressions);
            return {};
        }
        finishCalibration();
        if (!baseline) return {};

        if (reactionLevel() > LIE_REACTION_THRESHOLD) {
            if (reactionSince === null) reactionSince = now;
            if (now - reactionSince >= LIE_REACTION_HOLD_MS) caught();
        } else {
            reactionSince = null;
        }
        return {};
    };

    const begin = () => {
        if (phase !== 'intro' || round.ended) return;
        phase = 'countdown';
        sfx.unlock();
        showPanel('play');
        stage.classList.remove('alarm', 'passed');
        setVerdict('');
        $('lie-status').textContent = 'A IA está a aprender a tua cara normal…';
        // The detection loop starts now so the 3-2-1 measures the resting face
        startDetectionLoop(onFrame);
        ['3', '2', '1'].forEach((n, i) => later(() => {
            setCountdown($('lie-question'), n);
            sfx.play('tick');
        }, i * 1000));
        later(() => {
            finishCalibration();
            askQuestion(0);
        }, 3000);
    };

    const finish = () => {
        phase = 'done';
        stopDetectionLoop();
        stage.classList.remove('alarm', 'passed');

        const passed = results.filter(r => r === 'pass').length;
        const total = questions.length;
        const win = passed >= Math.ceil(total / 2);

        $('lie-score-title').textContent = win ? '😐 Cara de poker!' : '🚨 Apanhado!';
        $('lie-score-detail').textContent = `${passed} de ${total} frases sem reagir`;
        $('lie-reveal').hidden = !reveal;
        if (reveal) $('lie-reveal').textContent = LIE_REVEAL;
        showPanel('end');
        sfx.play(win ? 'success' : 'fail');

        const done = () => {
            if (round.ended) return;
            stage.hidden = true;
            endRound({
                label: `Detetor de mentiras (${passed}/${total})`,
                success: win,
                points: (MAX_POINTS_PER_ROUND * passed) / total,
                delay: 300
            });
        };
        $('lie-continue-btn').onclick = done;
        later(done, reveal ? LIE_REVEAL_AUTOCONTINUE_MS : LIE_END_AUTOCONTINUE_MS);
    };

    $('lie-ready-btn').onclick = begin;
    later(begin, LIE_INTRO_AUTOSTART_MS);
}

function clearRoundTimers() {
    gameState.roundTimers.forEach(id => clearTimeout(id));
    gameState.roundTimers = [];
}

// ===================================
// ROUND: QUIZ
// ===================================

function startQuizRound(question) {
    showQuizStage();

    const duration = question.code ? DURATION.code : DURATION.quiz;

    $('quiz-question').textContent = question.question;
    $('quiz-educational-note').textContent = question.educationalNote;
    $('quiz-explanation').style.display = 'none';

    if (question.snippet) {
        $('code-block').style.display = 'block';
        $('code-content').textContent = question.snippet;
    } else {
        $('code-block').style.display = 'none';
    }

    // Shuffle options and remember where the correct one ended up
    const shuffled = shuffleArray(question.options.map((text, index) => ({ text, index })));
    const correctIndex = shuffled.findIndex(opt => opt.index === question.correct);

    const optionsContainer = $('quiz-options');
    optionsContainer.innerHTML = '';
    shuffled.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option-btn';
        button.textContent = option.text;
        button.onclick = () => answerQuiz(index, correctIndex, question);
        optionsContainer.appendChild(button);
    });

    startRoundTimer(duration, () => answerQuiz(-1, correctIndex, question));
}

function answerQuiz(selected, correct, question) {
    if (!gameState.round || gameState.round.ended) return;

    document.querySelectorAll('.quiz-option-btn').forEach((btn, index) => {
        btn.disabled = true;
        if (index === correct) {
            btn.classList.add('correct');
        } else if (index === selected) {
            btn.classList.add('incorrect');
        }
    });

    const success = selected === correct;
    const prefix = selected === -1 ? '⏱ Tempo esgotado! ' : (success ? '✔ Certo! ' : '✘ Errado. ');
    $('quiz-explanation').textContent = prefix + question.explanation;
    $('quiz-explanation').style.display = 'block';

    sfx.play(success ? 'success' : 'fail');

    endRound({
        label: question.code ? 'Desafio de código' : 'Pergunta',
        success,
        points: success ? MAX_POINTS_PER_ROUND : 0,
        delay: 4500
    });
}

// ===================================
// END GAME
// ===================================

function endGame() {
    gameState.isPlaying = false;
    gameState.round = null;
    stopDetectionLoop();
    clearInterval(gameState.roundTimer);
    clearRoundTimers();
    $('round-intro').hidden = true;
    $('lie-stage').hidden = true;

    showScreen('results-screen');

    const fullName = `${gameState.student.firstName} ${gameState.student.lastName}`.trim();
    $('student-name').textContent = fullName;
    $('student-school').textContent = gameState.student.school;
    $('final-score').textContent = gameState.score;
    $('score-max').textContent = `/ ${MAX_POINTS}`;
    $('score-message').textContent = getScoreMessage(gameState.score / MAX_POINTS);

    const roundResultsDiv = $('round-results');
    roundResultsDiv.innerHTML = '';
    gameState.roundResults.forEach(result => {
        const item = document.createElement('div');
        item.className = `round-result ${result.success ? 'success' : 'failure'}`;
        const label = document.createElement('span');
        label.textContent = `Ronda ${result.round}: ${result.label}`;
        const points = document.createElement('span');
        points.textContent = `${result.success ? '✓' : '✗'} ${result.points} pts`;
        item.append(label, points);
        roundResultsDiv.appendChild(item);
    });

    showRankingEntry();

    // Backend CSV keeps the original 0-5 scale
    saveResultToBackend(Math.round((gameState.score / MAX_POINTS) * 5));

    // In normal mode, stop the camera; in kiosk mode keep it running for the next game
    if (!isKioskMode()) {
        const stream = $('video').srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
    }
}

function getScoreMessage(ratio) {
    if (ratio >= 0.9) return 'Excelente! És um mestre das emoções e da IA!';
    if (ratio >= 0.7) return 'Muito bom! Tens grande potencial para Engenharia Informática!';
    if (ratio >= 0.5) return 'Bom trabalho! Continua a explorar o mundo da IA!';
    if (ratio >= 0.3) return 'Nada mal! Com prática vais dominar estas tecnologias!';
    return 'Tenta novamente! A prática leva à perfeição!';
}

// ===================================
// RANKING DO DIA (opt-in, initials only, stored on this computer)
// ===================================

const RANKING_VISIBLE = 10;
const RANKING_STORED = 100;

function rankingKey() {
    // Local date as YYYY-MM-DD, so the ranking resets every day
    return `desafio-ranking-${new Date().toLocaleDateString('sv-SE')}`;
}

function loadRanking() {
    try {
        const list = JSON.parse(localStorage.getItem(rankingKey()) || '[]');
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

function addRankingEntry(initials, points) {
    const list = loadRanking();
    const entry = { initials, points, at: Date.now() };
    list.push(entry);
    list.sort((a, b) => b.points - a.points || a.at - b.at);
    try {
        localStorage.setItem(rankingKey(), JSON.stringify(list.slice(0, RANKING_STORED)));
    } catch (e) {
        console.warn('Could not save ranking:', e);
    }
    return { entry, position: list.indexOf(entry) + 1 };
}

function renderRankings(highlightAt = null) {
    const top = loadRanking().slice(0, RANKING_VISIBLE);
    const medals = ['🥇', '🥈', '🥉'];

    document.querySelectorAll('.ranking-list').forEach(list => {
        list.innerHTML = '';
        if (top.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'ranking-empty';
            empty.textContent = 'Ainda ninguém. Sê o primeiro!';
            list.appendChild(empty);
            return;
        }
        top.forEach((entry, i) => {
            const li = document.createElement('li');
            if (entry.at === highlightAt) li.classList.add('me');
            const pos = document.createElement('span');
            pos.className = 'ranking-pos';
            pos.textContent = medals[i] || `${i + 1}.`;
            const name = document.createElement('span');
            name.className = 'ranking-initials';
            name.textContent = entry.initials;
            const pts = document.createElement('span');
            pts.className = 'ranking-points';
            pts.textContent = `${entry.points} pts`;
            li.append(pos, name, pts);
            list.appendChild(li);
        });
    });
}

function sanitizeInitials(value) {
    return value.toUpperCase().replace(/[^A-ZÀ-ÖØ-Ý]/g, '').slice(0, 3);
}

function showRankingEntry() {
    gameState.rankingSaved = false;
    $('ranking-entry').style.display = 'block';
    $('ranking-result').textContent = '';
    $('initials-input').value = '';
    renderRankings();
    setTimeout(() => $('initials-input').focus(), 300);
}

function saveInitials() {
    if (gameState.rankingSaved) return;
    const initials = sanitizeInitials($('initials-input').value);
    if (!initials) {
        $('initials-input').focus();
        $('initials-input').classList.add('shake');
        setTimeout(() => $('initials-input').classList.remove('shake'), 400);
        return;
    }
    gameState.rankingSaved = true;
    const { entry, position } = addRankingEntry(initials, gameState.score);
    $('ranking-entry').style.display = 'none';
    $('ranking-result').textContent = position <= RANKING_VISIBLE
        ? `🎉 ${initials}, estás em ${position}.º lugar hoje!`
        : `${initials}, ficaste em ${position}.º lugar hoje. Tenta outra vez para entrar no top ${RANKING_VISIBLE}!`;
    renderRankings(entry.at);
}

$('initials-input').addEventListener('input', (e) => {
    e.target.value = sanitizeInitials(e.target.value);
});
$('initials-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveInitials();
});
$('save-initials-btn').addEventListener('click', saveInitials);
$('skip-initials-btn').addEventListener('click', () => {
    $('ranking-entry').style.display = 'none';
});

// ===================================
// STORAGE - Backend API Communication
// ===================================

function setSaveNotice(text, color) {
    const notice = $('save-notice');
    notice.textContent = text;
    notice.style.color = color;
}

async function saveResultToBackend(finalScore) {
    // The Electron build has no server; results are exported from the menu instead
    if (window.electronAPI) return;

    const data = {
        firstName: gameState.student.firstName,
        lastName: gameState.student.lastName || '-',
        school: gameState.student.school,
        score: finalScore,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch('http://localhost:3000/api/save-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            setSaveNotice('✓ Resultados guardados com sucesso!', 'var(--success)');
        } else {
            console.error('Error saving result:', result.message);
            setSaveNotice('⚠ Erro ao guardar resultados. Verifica se o servidor está a correr.', 'var(--danger)');
        }
    } catch (error) {
        console.error('Error connecting to backend:', error);
        setSaveNotice('⚠ Não foi possível conectar ao servidor. Verifica se está a correr na porta 3000.', 'var(--danger)');
    }
}

async function exportCSV() {
    try {
        if (window.electronAPI) {
            const result = await window.electronAPI.exportCSV(generateCSVContent());
            if (result.success) {
                setSaveNotice(`Resultados guardados em: ${result.filePath}`, 'var(--success)');
            } else if (!result.cancelled) {
                alert('Erro ao guardar o ficheiro: ' + result.error);
            }
        } else {
            window.open('http://localhost:3000/api/download-results', '_blank');
        }
    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Erro ao exportar dados. Verifica se o servidor está a correr.');
    }
}

function generateCSVContent() {
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    let csv = 'Primeiro Nome,Último Nome,Escola,Ronda,Tipo,Desafio,Sucesso,Pontos,Data\n';

    gameState.roundResults.forEach(result => {
        csv += [
            gameState.student.firstName,
            gameState.student.lastName,
            gameState.student.school,
            result.round,
            result.type,
            result.label,
            result.success,
            result.points,
            result.timestamp
        ].map(escape).join(',') + '\n';
    });

    csv += `\nPontuação total: ${gameState.score}/${MAX_POINTS}\n`;
    return csv;
}

if (window.electronAPI && window.electronAPI.onMenuExportCSV) {
    window.electronAPI.onMenuExportCSV(() => exportCSV());
}

// ===================================
// PLAY AGAIN
// ===================================

$('play-again-btn').addEventListener('click', () => {
    renderRankings();
    if (isKioskMode()) {
        showScreen('kiosk-start-screen');
    } else {
        $('registration-form').reset();
        showScreen('registration-screen');
    }
});
