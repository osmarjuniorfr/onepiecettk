const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// Banco de Dados Simulado (Você pode adicionar mais depois)
const dbOnePiece = {
    "LUFFY": ["CHAPÉUS DE PALHA", "USUÁRIO DE AKUMA NO MI", "PIOR GERAÇÃO", "HAKI DO REI", "EAST BLUE"],
    "ZORO": ["CHAPÉUS DE PALHA", "USA ESPADA", "PIOR GERAÇÃO", "HAKI DO REI", "EAST BLUE"],
    "SANJI": ["CHAPÉUS DE PALHA", "EAST BLUE", "HAKI DO ARMAMENTO"],
    "JINBE": ["CHAPÉUS DE PALHA", "SHICHIBUKAI", "HAKI DO ARMAMENTO"],
    "LAW": ["SHICHIBUKAI", "USUÁRIO DE AKUMA NO MI", "PIOR GERAÇÃO", "USA ESPADA"],
    "DOFLAMINGO": ["SHICHIBUKAI", "USUÁRIO DE AKUMA NO MI", "HAKI DO REI"],
    "MIHAWK": ["SHICHIBUKAI", "USA ESPADA", "HAKI DO ARMAMENTO"],
    "AKAINU": ["MARINHA", "USUÁRIO DE AKUMA NO MI", "HAKI DO ARMAMENTO"],
    "FUJITORA": ["MARINHA", "USUÁRIO DE AKUMA NO MI", "USA ESPADA"],
    "SHANKS": ["YONKOU", "USA ESPADA", "HAKI DO REI"],
    "KAIDOU": ["YONKOU", "USUÁRIO DE AKUMA NO MI", "HAKI DO REI"],
    "SMOKER": ["MARINHA", "USUÁRIO DE AKUMA NO MI", "EAST BLUE"],
    "BUGGY": ["SHICHIBUKAI", "YONKOU", "USUÁRIO DE AKUMA NO MI", "EAST BLUE"]
};

const allCategories = ["CHAPÉUS DE PALHA", "SHICHIBUKAI", "MARINHA", "YONKOU", "PIOR GERAÇÃO", "USA ESPADA", "USUÁRIO DE AKUMA NO MI", "HAKI DO REI", "EAST BLUE"];

// Estado do Jogo
let gameState = {
    board: Array(9).fill(null),
    currentPlayer: 'P1', // P1 (Vermelho) ou P2 (Azul)
    cols: [],
    rows: [],
    timeLeft: 60,
    playersConnected: 0
};

let timerInterval;

function startTimer() {
    clearInterval(timerInterval);
    gameState.timeLeft = 60;
    timerInterval = setInterval(() => {
        gameState.timeLeft--;
        io.emit('updateTimer', gameState.timeLeft);
        
        if (gameState.timeLeft <= 0) {
            // Tempo esgotou, passa a vez
            switchTurn();
        }
    }, 1000);
}

function switchTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 'P1' ? 'P2' : 'P1';
    startTimer();
    io.emit('updateBoard', gameState);
}

function initGame() {
    let shuffled = [...allCategories].sort(() => 0.5 - Math.random());
    gameState.cols = shuffled.slice(0, 3);
    gameState.rows = shuffled.slice(3, 6);
    gameState.board = Array(9).fill(null);
    gameState.currentPlayer = 'P1';
    startTimer();
    io.emit('updateBoard', gameState);
}

initGame(); // Inicia o jogo ao ligar o servidor

io.on('connection', (socket) => {
    gameState.playersConnected++;
    console.log('Jogador conectado. Total:', gameState.playersConnected);
    
    // Associa P1 e P2 baseado na ordem de chegada
    const playerRole = gameState.playersConnected === 1 ? 'P1' : (gameState.playersConnected === 2 ? 'P2' : 'Espectador');
    socket.emit('roleAssigned', playerRole);
    socket.emit('updateBoard', gameState);
    socket.emit('updateTimer', gameState.timeLeft);

    socket.on('makeMove', (data) => {
        // data = { index, character, role }
        if (data.role !== gameState.currentPlayer) return; // Bloqueia se não for a vez do jogador
        if (gameState.board[data.index] !== null) return; // Célula ocupada

        const charName = data.character.toUpperCase().trim();
        const traits = dbOnePiece[charName];

        const colIndex = data.index % 3;
        const rowIndex = Math.floor(data.index / 3);
        const requiredColTrait = gameState.cols[colIndex];
        const requiredRowTrait = gameState.rows[rowIndex];

        // Validação: Personagem existe E possui ambas as características?
        if (traits && traits.includes(requiredColTrait) && traits.includes(requiredRowTrait)) {
            gameState.board[data.index] = { character: charName, player: data.role };
        } 
        // Se errar a validação, não preenche a célula, mas a vez passa mesmo assim.
        
        switchTurn();
    });

    socket.on('skipTurn', (role) => {
        if (role === gameState.currentPlayer) switchTurn();
    });

    socket.on('proposeDraw', (role) => {
        socket.broadcast.emit('drawRequested');
    });

    socket.on('acceptDraw', () => {
        io.emit('gameDrawn');
        setTimeout(initGame, 3000); // Reinicia após 3 segundos
    });

    socket.on('disconnect', () => {
        gameState.playersConnected--;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));