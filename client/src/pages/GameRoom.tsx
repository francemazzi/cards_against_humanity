import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { initSocket, socket, gameService } from '../services/api';
import { useGameStore } from '../store/gameStore';
import { Card } from '../components/Card';
import { WinnerOverlay } from '../components/WinnerOverlay';
import { PlayerHistoryModal } from '../components/PlayerHistoryModal';
import type { GameResponse } from '../types';
import clsx from 'clsx';
import { PlayerSessionStorage } from '../services/PlayerSessionStorage';
import { GameJoinClient } from '../services/GameJoinClient';

export const GameRoom = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const {
    user, game, hand, setGame, setHand,
    winnerDisplay, setWinnerDisplay,
    roundHistory, addRoundHistory,
    selectedPlayerHistory, setSelectedPlayerHistory
  } = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [handCollapsed, setHandCollapsed] = useState(false);

  // Ref to capture judging state (table + black card) before winner is selected
  // This is needed because game_state update arrives before winner_selected
  const judgingStateRef = useRef<{
    round: number;
    blackCard: GameResponse['currentBlackCard'];
    table: GameResponse['table'];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socketInstance: ReturnType<typeof initSocket> | null = null;

    const bootstrap = async () => {
      if (!gameId || !user) {
        navigate('/');
        return;
      }

      try {
        const joinClient = new GameJoinClient();
        const { playerId: resolvedPlayerId } = await joinClient.joinGame(
          gameId,
          user.nickname
        );

        if (cancelled) return;

        PlayerSessionStorage.savePlayerId(gameId, resolvedPlayerId);
        setPlayerId(resolvedPlayerId);

        socketInstance = initSocket();
        
        socketInstance.on('connect', () => {
            console.log("Socket connected");
            setSocketConnected(true);
            setConnectionError(null);
            
            // Join game room upon connection
             socketInstance?.emit('join_game', {
                gameId,
                playerId: resolvedPlayerId,
                openaiKey: localStorage.getItem('openai_key')
              });
        });

        socketInstance.on('disconnect', () => {
            console.log("Socket disconnected");
            setSocketConnected(false);
        });

        socketInstance.on('connect_error', (err) => {
            console.error("Socket connection error:", err);
            setConnectionError("Connection to game server failed. Retrying...");
        });

        const refreshHandFor = async () => {
          try {
            const { hand } = await gameService.getHand(gameId, resolvedPlayerId);
            setHand(hand);
          } catch (e) {
            console.error("Could not fetch hand", e);
          }
        };

        socketInstance.on('game_state', (gameState: GameResponse) => {
          console.log('Game State Update:', gameState);
          setGame(gameState);
          refreshHandFor();
        });

        socketInstance.on('round_started', (gameState: GameResponse) => {
          console.log('Round Started:', gameState);
          setGame(gameState);
          refreshHandFor();
          setSelectedCards([]);
        });
        
        socketInstance.on('cards_played', (data: { playerId: string, cardsCount: number }) => {
            console.log('Cards Played:', data);
            // Optionally update UI to show animation or status
        });

        socketInstance.on('winner_selected', (data: { winnerId: string, winnerName: string, roundScore: number }) => {
            console.log('Winner Selected:', data);

            // Use the saved judging state (saved when judging started)
            const judgingState = judgingStateRef.current;

            if (judgingState?.blackCard && judgingState.table.length > 0) {
              // Find winning entry
              const winningEntry = judgingState.table.find(t => t.playerId === data.winnerId);

              // Save round history for all players
              addRoundHistory(
                judgingState.round,
                judgingState.blackCard,
                judgingState.table,
                data.winnerId
              );

              // Show winner overlay
              if (winningEntry) {
                setWinnerDisplay({
                  winnerId: data.winnerId,
                  winnerName: data.winnerName,
                  roundScore: data.roundScore,
                  blackCard: judgingState.blackCard,
                  winningCards: winningEntry.cards,
                  round: judgingState.round
                });
              }

              // Clear the ref after use
              judgingStateRef.current = null;
            }

            // Also show toast notification
            if (data.winnerId === resolvedPlayerId) {
              setNotification({ message: `You won this round!`, type: 'success' });
            } else {
              setNotification({ message: `${data.winnerName} won!`, type: 'info' });
            }
            setTimeout(() => setNotification(null), 3000);
        });

        socketInstance.on('judging_started', (gameState: GameResponse) => {
            console.log('Judging Started:', gameState);

            // Save the judging state for when winner is selected
            // This is needed because game_state may update before winner_selected arrives
            judgingStateRef.current = {
              round: gameState.round,
              blackCard: gameState.currentBlackCard,
              table: gameState.table
            };

            setGame(gameState);
            refreshHandFor();
        });

        socketInstance.on('game_over', (data: { winnerId: string, winnerName: string, finalScores: any[] }) => {
            console.log('Game Over:', data);
            // Optionally show game over screen
        });

        socketInstance.on('error', (err) => {
          console.error('Socket Error:', err);
        });

        const gameState = await gameService.getGame(gameId);
        if (cancelled) return;
        setGame(gameState);
        await refreshHandFor();
      } catch (e) {
        console.error("Failed to join game", e);
        alert("Could not join this game. Please return to the lobby.");
        navigate("/lobby");
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (socketInstance) {
        socketInstance.off('game_state');
        socketInstance.off('round_started');
        socketInstance.off('cards_played');
        socketInstance.off('winner_selected');
        socketInstance.off('judging_started');
        socketInstance.off('game_over');
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('connect_error');
        socketInstance.disconnect();
      }
    };
  }, [gameId, user, navigate, setGame, setHand]);

  // loadInitialState/refreshHand are now handled in the bootstrap flow above

  const handleStartGame = async () => {
    if (!gameId) return;
    try {
      await gameService.start(gameId);
    } catch (e) {
      console.error('Failed to start game', e);
      alert("Failed to start game");
    }
  };

  const toggleCardSelection = (cardId: string) => {
    if (!game?.currentBlackCard) return;
    
    const pickCount = game.currentBlackCard.pick || 1;
    
    if (selectedCards.includes(cardId)) {
      setSelectedCards(prev => prev.filter(id => id !== cardId));
    } else {
      if (selectedCards.length < pickCount) {
        setSelectedCards(prev => [...prev, cardId]);
      } else {
        // Replace last if full (optional UX) or just ignore
        setSelectedCards(prev => [...prev.slice(1), cardId]);
      }
    }
  };

  const playCards = () => {
    if (!gameId || !playerId) return;
    socket.emit('play_cards', {
      gameId,
      playerId,
      cardIds: selectedCards
    });
    setSelectedCards([]);
  };

  const judgeWinner = (winnerIndex: number) => {
    if (!gameId || !playerId) return;
    socket.emit('judge_winner', {
      gameId,
      playerId,
      winnerIndex
    });
  };

  if (!game) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const isCzar = game.czarId === playerId;
  const pickCount = game.currentBlackCard?.pick || 1;
  const canPlay = !isCzar && game.status === 'PLAYING_CARDS';
  const canJudge = isCzar && game.status === 'JUDGING';
  
  // Find self in players
  const me = game.players.find(p => p.id === playerId);

  // Sort players by score for leaderboard
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-[100dvh] bg-gray-200 flex relative">
      {/* Toast Notification */}
      {notification && (
        <div className={clsx(
          "fixed top-24 right-4 md:right-8 z-50 px-4 md:px-6 py-3 md:py-4 rounded-lg shadow-2xl font-bold text-base md:text-lg animate-bounce",
          notification.type === 'success' ? "bg-green-500 text-white" : "bg-blue-500 text-white"
        )}>
          {notification.message}
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Toggle Leaderboard Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-20 left-4 z-50 bg-yellow-500 text-black p-3 min-w-touch min-h-touch rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform lg:hidden flex items-center justify-center"
        aria-label="Toggle Leaderboard"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* Leaderboard Sidebar */}
      <div className={clsx(
        "fixed lg:relative w-72 xs:w-80 bg-gray-900 text-white flex flex-col shadow-2xl z-40 transition-transform duration-300 h-full",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="bg-black p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold">🏆 Leaderboard</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-400 transition-colors"
            aria-label="Close Leaderboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              onClick={() => setSelectedPlayerHistory(player.id)}
              className={clsx(
                "mb-2 md:mb-3 p-3 md:p-4 rounded-lg border-2 transition-all cursor-pointer hover:opacity-90",
                player.id === playerId
                  ? "bg-blue-900 border-blue-500 shadow-lg scale-105"
                  : "bg-gray-800 border-gray-700",
                player.id === game.czarId && "ring-2 ring-yellow-400"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className={clsx(
                    "text-xl md:text-2xl font-bold w-6 md:w-8 text-center flex-shrink-0",
                    index === 0 && "text-yellow-400",
                    index === 1 && "text-gray-400",
                    index === 2 && "text-orange-600"
                  )}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold flex items-center gap-1 md:gap-2 text-sm md:text-base truncate">
                      <span className="truncate">{player.name}</span>
                      {player.id === playerId && <span className="text-blue-400 text-xs flex-shrink-0">(You)</span>}
                      {player.isBot && <span className="text-gray-400 text-xs flex-shrink-0">🤖</span>}
                    </div>
                    {player.id === game.czarId && (
                      <div className="text-yellow-400 text-xs">👑 Czar</div>
                    )}
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold flex-shrink-0 ml-2">{player.score}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-black border-t border-gray-700">
          <div className="text-sm text-gray-400 text-center">
            First to {game.players[0]?.persona ? '10' : '10'} points wins!
          </div>
        </div>
      </div>

      {/* Main Game Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header / Info Bar */}
        <div className="bg-black text-white p-3 md:p-4 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="font-bold text-base md:text-xl flex items-center gap-2">
                <span className="hidden sm:inline">Room: {gameId?.substring(0, 8)}...</span>
                <span className="sm:hidden">Room</span>
                {!socketConnected && (
                    <span className="text-red-500 text-xs md:text-sm animate-pulse">
                        (Disconnected)
                    </span>
                )}
            </div>
            <div className="flex gap-3 md:gap-6 text-sm md:text-lg flex-wrap">
                <div>Round: <span className="font-bold">{game.round}</span></div>
                <div className="hidden sm:block">Czar: <span className="font-bold">{game.players.find(p => p.id === game.czarId)?.name}</span></div>
                <div>My Score: <span className="font-bold text-green-400">{me?.score || 0}</span></div>
            </div>
          </div>
        </div>
        
        {connectionError && (
            <div className="bg-red-500 text-white text-center p-2 text-sm">
                {connectionError}
            </div>
        )}

        {/* Main Game Area */}
        <div className={clsx(
          "flex-1 p-4 md:p-8 flex flex-col gap-4 md:gap-8 overflow-y-auto",
          // Add padding-bottom on mobile to account for fixed hand area
          game.status !== 'GAME_OVER' && "pb-52 lg:pb-8"
        )}>
          
          {/* Game Over Screen */}
          {game.status === 'GAME_OVER' && (
            <div className="flex items-center justify-center min-h-full px-4">
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-12 max-w-2xl w-full">
                <h1 className="text-3xl md:text-6xl font-bold text-center mb-6 md:mb-8">🎉 Game Over! 🎉</h1>
                
                <div className="mb-6 md:mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6">
                    {sortedPlayers[0]?.id === playerId ? (
                      <span className="text-green-600">🏆 You Won! 🏆</span>
                    ) : (
                      <span className="text-blue-600">Winner: {sortedPlayers[0]?.name}</span>
                    )}
                  </h2>
                </div>

                <div className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-center">Final Standings</h3>
                  {sortedPlayers.map((player, index) => (
                    <div 
                      key={player.id}
                      className={clsx(
                        "flex justify-between items-center p-3 md:p-4 rounded-lg",
                        index === 0 && "bg-yellow-100 border-2 border-yellow-400",
                        index === 1 && "bg-gray-100 border-2 border-gray-400",
                        index === 2 && "bg-orange-100 border-2 border-orange-400",
                        index > 2 && "bg-gray-50",
                        player.id === playerId && "ring-2 ring-blue-500"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-4">
                        <span className="text-2xl md:text-3xl font-bold w-8 md:w-12 text-center">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                        <span className="text-base md:text-xl font-bold">
                          {player.name}
                          {player.id === playerId && <span className="text-blue-600 text-xs md:text-sm ml-2">(You)</span>}
                        </span>
                      </div>
                      <span className="text-lg md:text-2xl font-bold whitespace-nowrap">{player.score} pts</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => navigate('/lobby')}
                    className="bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 min-h-touch rounded-full font-bold text-base md:text-xl hover:scale-105 active:scale-95 transition-transform"
                  >
                    Back to Lobby
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Normal Game UI - Only show if not game over */}
          {game.status !== 'GAME_OVER' && (
            <>
              {/* Status Message */}
              <div className="text-center text-lg md:text-2xl font-bold mb-3 md:mb-4 px-4">
                  {game.status === 'LOBBY' && "Waiting for players..."}
                  {game.status === 'PLAYING_CARDS' && (isCzar ? "Waiting for players to choose..." : "Choose your best card(s)!")}
                  {game.status === 'JUDGING' && (isCzar ? "Pick the winner!" : "The Czar is judging...")}
              </div>

              {/* Start Button (Lobby) */}
              {game.status === 'LOBBY' && (
                   <div className="text-center">
                      <button
                          onClick={handleStartGame}
                          className="bg-black text-white px-6 md:px-8 py-3 md:py-4 min-h-touch rounded-full font-bold text-base md:text-xl hover:scale-105 active:scale-95 transition-transform"
                      >
                          Start Game
                      </button>
                   </div>
              )}

              {/* Table Area */}
              <div className="flex flex-col items-center gap-4 md:gap-8 min-h-[200px] md:min-h-[300px]">
                   {/* Black Card */}
                   {game.currentBlackCard && (
                      <div className="mb-4 md:mb-8">
                          <Card card={game.currentBlackCard} isBlack size="lg" />
                      </div>
                   )}

                   {/* Played Cards (submissions) */}
                   <div className="flex flex-wrap justify-center gap-3 md:gap-4 px-2">
                      {game.table.map((submission, index) => (
                          <div 
                              key={index} 
                              className={clsx(
                                  "group relative transition-all duration-300",
                                  canJudge && "cursor-pointer hover:scale-105"
                              )}
                              onClick={() => canJudge && judgeWinner(index)}
                          >
                               {/* If multiple cards were played, stack them or show side-by-side. 
                                   For simplicity, just listing them vertical or stacked.
                                   Typically CAH plays are treated as a single unit. */}
                               <div className="flex gap-1 xs:gap-2">
                                   {submission.cards.map((card) => (
                                       <Card
                                          key={card.id}
                                          card={card}
                                          size="md"
                                          hidden={game.status === 'PLAYING_CARDS'}
                                          className={clsx(
                                            canJudge && "ring-2 ring-transparent group-hover:ring-yellow-400"
                                          )}
                                       />
                                   ))}
                               </div>
                               {/* Reveal player name only if round ended or we want to show who played what (usually anonymous until end) */}
                               {game.status === 'ROUND_ENDED' && submission.playerId && (
                                   <div className="text-center font-bold text-sm md:text-base mt-2 bg-white rounded px-2 py-1">
                                       {game.players.find(p => p.id === submission.playerId)?.name}
                                   </div>
                               )}
                          </div>
                      ))}
                      
                      {/* Placeholders for players who haven't played yet? 
                          The backend might not send incomplete table state. 
                          Usually we just wait. 
                      */}
                   </div>
              </div>
            </>
          )}
        </div>

        {/* Hand Area - Fixed on mobile, relative on desktop */}
        {game.status !== 'GAME_OVER' && (
          <div className={clsx(
            "bg-gray-800 shadow-inner-top safe-area-bottom transition-all duration-300",
            // Mobile: fixed bottom
            "fixed bottom-0 left-0 right-0 z-20",
            // Desktop: relative positioning
            "lg:relative lg:left-auto lg:right-auto lg:bottom-auto lg:z-auto",
            // Padding
            "p-3 md:p-6 landscape:p-2"
          )}>
            <div className="max-w-7xl mx-auto">
                {/* Header with toggle button */}
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-white font-bold text-sm md:text-base landscape:text-xs">
                    Your Hand {canPlay && `(Pick ${pickCount})`}
                  </h3>
                  {/* Toggle button - only on mobile */}
                  <button
                    onClick={() => setHandCollapsed(!handCollapsed)}
                    className="lg:hidden p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label={handCollapsed ? "Show hand" : "Hide hand"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={clsx("h-6 w-6 transition-transform", handCollapsed && "rotate-180")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </button>
                </div>

                {/* Collapsible content */}
                <div className={clsx(
                  "transition-all duration-300 overflow-hidden lg:!max-h-none lg:!opacity-100",
                  handCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                )}>
                  {/* Mini Black Card preview - only on mobile */}
                  {game.currentBlackCard && (
                    <div className="lg:hidden mb-2">
                      <div className="bg-black text-white p-2 rounded-lg text-sm">
                        <span className="line-clamp-2 font-bold">{game.currentBlackCard.text}</span>
                        {game.currentBlackCard.pick && game.currentBlackCard.pick > 1 && (
                          <span className="text-yellow-400 text-xs ml-2">(Pick {game.currentBlackCard.pick})</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 xs:gap-3 md:gap-4 landscape:gap-2 overflow-x-auto pb-3 md:pb-4 landscape:pb-2 px-2 snap-x scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                      {hand.map((card) => (
                          <div key={card.id} className="snap-center shrink-0">
                              <Card
                                  card={card}
                                  size="sm"
                                  onClick={() => canPlay && toggleCardSelection(card.id)}
                                  isSelected={selectedCards.includes(card.id)}
                                  disabled={!canPlay && game.status !== 'LOBBY'}
                              />
                          </div>
                      ))}
                  </div>
                </div>

                {canPlay && selectedCards.length === pickCount && (
                    <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-30">
                        <button
                            onClick={playCards}
                            className="bg-green-500 text-white font-bold py-3 px-6 md:py-4 md:px-8 min-h-touch rounded-full shadow-xl hover:bg-green-600 active:scale-95 animate-bounce text-sm md:text-base"
                        >
                            CONFIRM PLAY
                        </button>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Winner Overlay */}
      {winnerDisplay && (
        <WinnerOverlay
          data={winnerDisplay}
          onClose={() => setWinnerDisplay(null)}
          isMe={winnerDisplay.winnerId === playerId}
        />
      )}

      {/* Player History Modal */}
      {selectedPlayerHistory && (
        <PlayerHistoryModal
          playerName={game.players.find(p => p.id === selectedPlayerHistory)?.name || 'Player'}
          history={roundHistory[selectedPlayerHistory] || []}
          onClose={() => setSelectedPlayerHistory(null)}
        />
      )}
    </div>
  );
};
