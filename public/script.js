const socket = io();
let myRole = null;
let currentTurn = null;
let selectedCellIndex = null;

const roleDisplay = document.querySelector('#roleDisplay span');
const turnDisplay = document.getElementById('turnDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const cells = document.querySelectorAll('.cell');
const modal = document.getElementById('inputModal');
const charInput = document.getElementById('characterInput');

socket.on('roleAssigned', (role) => {
    myRole = role;
    roleDisplay.innerText = role === 'P1' ? 'P1 (Vermelho)' : (role === 'P2' ? 'P2 (Azul)' : 'Espectador');
    roleDisplay.style.color = role === 'P1' ? '#ff4c4c' : '#4c4cff';
});

socket.on('updateBoard', (gameState) => {
    currentTurn = gameState.currentPlayer;
    
    // Atualiza Textos
    turnDisplay.innerText = `Vez de: ${currentTurn}`;
    turnDisplay.style.color = currentTurn === 'P1' ? '#ff4c4c' : '#4c4cff';

    // Atualiza Cabeçalhos Aleatórios
    for (let i=0; i<3; i++) {
        document.getElementById(`col${i}`).innerText = gameState.cols[i];
        document.getElementById(`row${i}`).innerText = gameState.rows[i];
    }

    // Atualiza Células
    cells.forEach((cell, i) => {
        const cellData = gameState.board[i];
        if (cellData) {
            cell.innerText = cellData.character;
            cell.className = `cell taken ${cellData.player.toLowerCase()}`;
        } else {
            cell.innerText = "";
            cell.className = "cell";
        }
    });
    
    modal.classList.remove('active');
});

socket.on('updateTimer', (time) => {
    timerDisplay.innerText = `Tempo: ${time}s`;
    if(time <= 10) timerDisplay.style.color = 'red';
    else timerDisplay.style.color = 'white';
});

socket.on('drawRequested', () => {
    if (confirm("Seu oponente pediu empate. Você aceita?")) {
        socket.emit('acceptDraw');
    }
});

socket.on('gameDrawn', () => {
    alert("O jogo terminou em Empate! Reiniciando...");
});

// Interações de Clique
cells.forEach(cell => {
    cell.addEventListener('click', () => {
        if (myRole !== currentTurn) return alert("Não é sua vez!");
        if (cell.classList.contains('taken')) return;

        selectedCellIndex = cell.getAttribute('data-index');
        charInput.value = "";
        modal.classList.add('active');
        charInput.focus();
    });
});

document.getElementById('btnSubmitMove').addEventListener('click', () => {
    const charName = charInput.value;
    if (charName.trim() !== "") {
        socket.emit('makeMove', { index: selectedCellIndex, character: charName, role: myRole });
    }
});

document.getElementById('btnCancelMove').addEventListener('click', () => {
    modal.classList.remove('active');
});

document.getElementById('btnSkip').addEventListener('click', () => {
    if (myRole === currentTurn) socket.emit('skipTurn', myRole);
});

document.getElementById('btnDraw').addEventListener('click', () => {
    socket.emit('proposeDraw', myRole);
});

// Envia com Enter no input
charInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btnSubmitMove').click();
});