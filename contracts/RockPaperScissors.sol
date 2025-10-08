// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Rock Paper Scissors Game
/// @notice A privacy-preserving rock paper scissors game using Zama's fhEVM
/// @dev Uses Fully Homomorphic Encryption to keep moves private until both players commit
contract RockPaperScissors is SepoliaConfig {
    // Move encoding: 0 = Rock, 1 = Paper, 2 = Scissors
    
    struct Game {
        address player1;
        address player2;
        euint8 encryptedMove1;
        euint8 encryptedMove2;
        bool player1Committed;
        bool player2Committed;
        bool gameFinished;
        uint256 createdAt;
        EncryptedResult encryptedResults;
    }
    
    struct EncryptedResult {
        ebool isDraw;
        ebool player1Wins;
        bool resultsComputed;
    }
    
    mapping(uint256 => Game) public games;
    uint256 public gameCounter;
    
    event GameCreated(uint256 indexed gameId, address indexed player1);
    event MoveMade(uint256 indexed gameId, address indexed player, bool isPlayer1);
    event GameFinished(uint256 indexed gameId, address winner, bool isDraw);
    
    /// @notice Create a new game
    /// @return gameId The ID of the newly created game
    function createGame() external returns (uint256) {
        uint256 gameId = gameCounter++;
        
        games[gameId] = Game({
            player1: msg.sender,
            player2: address(0),
            encryptedMove1: FHE.asEuint8(0),
            encryptedMove2: FHE.asEuint8(0),
            player1Committed: false,
            player2Committed: false,
            gameFinished: false,
            createdAt: block.timestamp,
            encryptedResults: EncryptedResult({
                isDraw: FHE.asEbool(false),
                player1Wins: FHE.asEbool(false),
                resultsComputed: false
            })
        });
        
        emit GameCreated(gameId, msg.sender);
        return gameId;
    }
    
    /// @notice Join an existing game as player 2
    /// @param gameId The ID of the game to join
    function joinGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.player1 != address(0), "Game does not exist");
        require(game.player2 == address(0), "Game already has two players");
        require(game.player1 != msg.sender, "Cannot play against yourself");
        
        game.player2 = msg.sender;
    }
    
    /// @notice Submit an encrypted move
    /// @param gameId The ID of the game
    /// @param encryptedMove The encrypted move (0=rock, 1=paper, 2=scissors)
    /// @param inputProof The zero-knowledge proof for the encrypted input
    function makeMove(
        uint256 gameId,
        externalEuint8 encryptedMove,
        bytes calldata inputProof
    ) external {
        Game storage game = games[gameId];
        require(!game.gameFinished, "Game already finished");
        require(
            msg.sender == game.player1 || msg.sender == game.player2,
            "Not a player in this game"
        );
        
        // Validate and convert the encrypted input
        euint8 move = FHE.fromExternal(encryptedMove, inputProof);
        
        // Verify move is valid (0, 1, or 2)
        // Note: In production, add additional validation
        
        if (msg.sender == game.player1) {
            require(!game.player1Committed, "Player 1 already committed");
            game.encryptedMove1 = move;
            game.player1Committed = true;
            emit MoveMade(gameId, msg.sender, true);
        } else {
            require(!game.player2Committed, "Player 2 already committed");
            game.encryptedMove2 = move;
            game.player2Committed = true;
            emit MoveMade(gameId, msg.sender, false);
        }
        
        // If both players have committed, the game can be resolved
        if (game.player1Committed && game.player2Committed) {
            game.gameFinished = true;
        }
    }
    
    /// @notice Determine the winner using FHE operations
    /// @param gameId The ID of the game
    /// @return winner The address of the winner (or address(0) for draw)
    function determineWinner(uint256 gameId) external returns (address) {
        Game storage game = games[gameId];
        require(game.gameFinished, "Game not finished yet");
        
        euint8 move1 = game.encryptedMove1;
        euint8 move2 = game.encryptedMove2;
        
        // Check if moves are equal (draw)
        ebool isDraw = FHE.eq(move1, move2);
        
        // Rock (0) beats Scissors (2)
        // Paper (1) beats Rock (0)
        // Scissors (2) beats Paper (1)
        
        // Player 1 wins if:
        // (move1 == 0 && move2 == 2) || (move1 == 1 && move2 == 0) || (move1 == 2 && move2 == 1)
        ebool move1IsRock = FHE.eq(move1, FHE.asEuint8(0));
        ebool move2IsScissors = FHE.eq(move2, FHE.asEuint8(2));
        ebool rockBeatsScissors = FHE.and(move1IsRock, move2IsScissors);
        
        ebool move1IsPaper = FHE.eq(move1, FHE.asEuint8(1));
        ebool move2IsRock = FHE.eq(move2, FHE.asEuint8(0));
        ebool paperBeatsRock = FHE.and(move1IsPaper, move2IsRock);
        
        ebool move1IsScissors = FHE.eq(move1, FHE.asEuint8(2));
        ebool move2IsPaper = FHE.eq(move2, FHE.asEuint8(1));
        ebool scissorsBeatsPaper = FHE.and(move1IsScissors, move2IsPaper);
        
        ebool player1Wins = FHE.or(FHE.or(rockBeatsScissors, paperBeatsRock), scissorsBeatsPaper);
        
        // Store encrypted results for later decryption
        game.encryptedResults = EncryptedResult({
            isDraw: isDraw,
            player1Wins: player1Wins,
            resultsComputed: true
        });
        
        // Return placeholder - actual decryption happens via Gateway
        // The frontend will call decryptResult() to get the actual winner
        return address(0);
    }
    
    /// @notice Get encrypted result for decryption via Gateway
    /// @param gameId The ID of the game
    /// @return isDraw Encrypted boolean indicating if it's a draw
    /// @return player1Wins Encrypted boolean indicating if player 1 wins
    function getEncryptedResult(uint256 gameId) external returns (ebool, ebool) {
        Game storage game = games[gameId];
        require(game.encryptedResults.resultsComputed, "Results not computed yet");
        
        // Grant permission to view encrypted results
        FHE.allowTransient(game.encryptedResults.isDraw, msg.sender);
        FHE.allowTransient(game.encryptedResults.player1Wins, msg.sender);
        
        return (game.encryptedResults.isDraw, game.encryptedResults.player1Wins);
    }
    
    /// @notice Get encrypted move for a player (only callable by that player)
    /// @param gameId The ID of the game
    /// @return The encrypted move
    function getMyMove(uint256 gameId) external returns (euint8) {
        Game storage game = games[gameId];
        require(
            msg.sender == game.player1 || msg.sender == game.player2,
            "Not a player in this game"
        );
        
        if (msg.sender == game.player1) {
            // Grant permission to view own encrypted move
            FHE.allowTransient(game.encryptedMove1, msg.sender);
            return game.encryptedMove1;
        } else {
            FHE.allowTransient(game.encryptedMove2, msg.sender);
            return game.encryptedMove2;
        }
    }
    
    /// @notice Check if game is ready to be resolved
    /// @param gameId The ID of the game
    /// @return Whether both players have committed their moves
    function isGameReady(uint256 gameId) external view returns (bool) {
        Game storage game = games[gameId];
        return game.player1Committed && game.player2Committed;
    }
}
