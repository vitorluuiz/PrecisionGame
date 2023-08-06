import express from 'express';
import * as http from 'http';
import { Server as WebSocketServer } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new WebSocketServer(server, {
  cors: {
    origin: '*',
  },
});

interface Player {
  id: string;
  playerName: string;
  score: number;
  entryDate: Date;
  wins: number;
}

interface GameState {
  players: Player[];
  ranking: Player[];
  randomNum: number;
  playerTurn: string;
}

let gameState: GameState = {
  players: [],
  ranking: [],
  randomNum: getRandomFloat(1.0, 10.0, 2),
  playerTurn: '',
};

function getRandomFloat(min: number, max: number, decimalPlaces: number): number {
  const random = Math.random() * (max - min) + min;
  return parseFloat(random.toFixed(decimalPlaces));
}

const changeTurn = () => {
  let turn: number = gameState.players.findIndex((player) => player.id === gameState.playerTurn);

  if (turn === gameState.players.length - 1) {
    gameState.playerTurn = gameState.players[0].id;
  } else{
    gameState.playerTurn = gameState.players[turn + 1].id;
  }
  io.emit('gameState', gameState)
}

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  // Envie o estado do jogo para o jogador quando ele se conectar
  socket.emit('gameState', gameState);

  socket.on('joinGame', (playerName) => {
    // Adicione o jogador à lista de jogadores no estado do jogo
    const newPlayer = { id: socket.id, entryDate: new Date, playerName: playerName, score: 0, wins: 0 };
    if (gameState.playerTurn === '') {
      gameState.playerTurn = newPlayer.id;
    }
    gameState.players.push(newPlayer);
    socket.emit('loginSettings', newPlayer);
    socket.emit('gameState', gameState);

    console.log(`Jogador "${playerName}" (${socket.id}) entrou no jogo.`);

    // Notifique todos os jogadores sobre a atualização da lista de jogadores
    io.emit('playerJoined', gameState.players);

    // Lide com as ações do jogador durante o jogo
    socket.on('playerAction', (score) => {
      if (score === gameState.randomNum) {
        gameState.playerTurn = gameState.players[0].id;
        const winnerIndex = gameState.players.findIndex((a) => a.id === socket.id);
        gameState.players[winnerIndex].wins++;
        gameState.ranking = gameState.players.sort((a) => a.wins)

        gameState.randomNum = getRandomFloat(1.0, 10.0, 2),
        io.emit('roundEnd', gameState);
      } else{
        changeTurn();
      }
      // Atualize a pontuação do jogador no estado do jogo
      const playerIndex = gameState.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        gameState.players[playerIndex].score = score;
      }

      const playerDiff = Math.abs(gameState.randomNum - score);

    // Atualize o array de jogadores com as informações de ranking
    const rankedPlayers = gameState.players.map((player) => ({
      ...player,
      difference: Math.abs(gameState.randomNum - player.score),
    }));
  
      // Ordene o array de jogadores com base na diferença
      rankedPlayers.sort((a, b) => a.difference - b.difference);
      // Notifique todos os jogadores sobre a atualização da pontuação
      io.emit('playerScoreUpdate', rankedPlayers);
    });

    // Lidar com desconexão do jogador
    socket.on('disconnect', () => {
      // Remova o jogador da lista de jogadores no estado do jogo
      gameState.players = gameState.players.filter((p) => p.id !== socket.id);

      if (gameState.players.length === 0) {
        gameState.playerTurn = '';
      } else if (gameState.playerTurn === socket.id){
        changeTurn();
      }

      console.log(`Jogador "${playerName}" (${socket.id}) saiu do jogo.`);

      // Notifique todos os jogadores sobre a atualização da lista de jogadores
      io.emit('playerLeft', gameState.players);
    });
  });
});

const port = 4000; // Defina a porta em que a API será executada
server.listen(port, () => {
  console.log(`Servidor WebSocket em execução na porta ${port}.`);
});
