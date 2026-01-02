const socket = io();

socket.on('connect', () => {
    console.log('Connected to server');
    const debugEl = document.getElementById('debug-info');
    if(debugEl) debugEl.innerText = 'Connected: ' + socket.id;
});

socket.on('playerMoved', (data) => {
    console.log('Another player moved:', data);
    // Handle other player movement in game.js
});
