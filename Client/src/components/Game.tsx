import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

import Star from '../assets/star.svg';
import HalfStar from '../assets/half-star.svg';
import ArrowDown from '../assets/arrow-down.svg';
import ArrowBack from '../assets/arrow-back.svg';
import Bolt from '../assets/bolt.svg';

const serverURL = 'https://precision-server.vercel.app/3001'; // URL do servidor WebSocket

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

const Game: React.FC = () => {
  const [user, setUser] = useState<Player>();
  const [playerName, setPlayerName] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [ranking, setRanking] = useState<Player[]>([]);
  const [randomNum, setRandomNum] = useState<number>(0);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [isJoined, setJoined] = useState<boolean>(false);
  const [playerTurn, setPlayerTurn] = useState<string>('');

  const socketRef = React.useRef<Socket | null>(null);

  useEffect(() => {
    // Cria uma conexão com o servidor WebSocket
    socketRef.current = io(serverURL);

    // Lida com atualizações do estado do jogo
    socketRef.current.on('gameState', (gameState: GameState) => {
      setPlayers(gameState.players);
      setRandomNum(gameState.randomNum);
      setPlayerTurn(gameState.playerTurn);
      setRanking(gameState.ranking);
    });
    
    socketRef.current.on('roundEnd', (gameState: GameState) => {
      window.alert("Round terminado");
      setPlayers(gameState.players);
      setRandomNum(gameState.randomNum);
      setPlayerTurn(gameState.playerTurn);
      setRanking(gameState.ranking);
    });

    // Lida com a chegada de novos jogadores
    socketRef.current.on('playerJoined', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    // Lida com a saída de jogadores
    socketRef.current.on('playerLeft', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    // Lida com atualizações de pontuação
    socketRef.current.on('playerScoreUpdate', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      // Fecha a conexão com o servidor ao desmontar o componente
      if (socketRef.current) {
        socketRef.current.disconnect();
        setJoined(false);
      }
    };
  }, []);

  const handleJoinGame = (event: any) => {
    event.preventDefault();
    if (playerName) {
      // Envia o nome do jogador para o servidor
      socketRef.current?.emit('joinGame', playerName);

      socketRef.current?.on('loginSettings', (login: Player) => {
        setUser(login);
        setJoined(true);
      })
    }
  };

  const getPlayerTag = (player: Player, PlayerList: Player[]) => {
    const playerIndex: number = 1 + PlayerList.indexOf(player);

    switch (playerIndex) {
      case 1:
        return <img alt='Título de primeiro colocado' src={Star} />
      case PlayerList.length:
        return <img alt='Último colocado' src={ArrowDown} />
      case 2:
        return <img alt='Título de segundo colocado' src={HalfStar} />
      default:
        break;
    }
  }

  const handlePlayerAction = (event: any) => {
    event.preventDefault();
    // Envia a pontuação do jogador para o servidor
    socketRef.current?.emit('playerAction', playerScore);
  };

  return (
    <div id='game'>
      <header><h1>Multiplayer Game</h1></header>
      <div className='support-game container'>
        <aside id='support-players'>
          {!isJoined ? (
            <form className='support-login'>
              <h2>Entre no jogo</h2>
              <label>
                <input type="text" placeholder='Nome de usuário' value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
              </label>
              <button onClick={(evt) => handleJoinGame(evt)}>Entrar no Jogo</button>
            </form>
          ) : null}
          <div className='support-list'>
            <h2>Jogadores nesta partida</h2>
            <section className='players-list'>
              {players.map((player) => (
                <article className='player' key={player.id}>
                  <span>{playerTurn === player.id ? 'Vez de:' : null} {player.playerName} {player.playerName === user?.playerName ? '(Você)' : ''} - {player.score}</span>
                  {getPlayerTag(player, players)}
                </article>
              ))}
            </section>
          </div>
        </aside>
        <main>
          <form className='guess-support'>
            <h2>Faça sua jogada</h2>
            <input
              type="number"
              step="0.01"
              value={playerScore}
              disabled={playerTurn !== user?.id}
              onChange={(e) => setPlayerScore(parseFloat(e.target.value))}
            />
            <button disabled={playerTurn !== user?.id} onClick={(evt) => handlePlayerAction(evt)}>Enviar Pontuação</button>
          </form>
        </main>
        <aside id='support-players'>
          <div className='support-list'>
            <h2>Ranking geral</h2>
            <section className='players-list'>
              {ranking.map((player) => (
                <article className='player' key={player.id}>
                  <span>{player.playerName} {player.playerName === user?.playerName ? '(Você)' : ''} - {player.wins} vitórias</span>
                </article>
              ))}
            </section>
            {randomNum}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Game;
