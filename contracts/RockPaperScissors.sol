// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Rock Paper Scissors Game
/// @notice A privacy-preserving rock paper scissors game using Zama's FHEVM
/// @dev Uses Fully Homomorphic Encryption to keep moves private until both players commit
contract RockPaperScissors is SepoliaConfig {
    // Move encoding: 0 = Rock, 1 = Paper, 2 = Scissors
    
    enum GameStatus {
        WaitingForPlayers,
        WaitingForMoves,
        MovesCommitted,
        DecryptionInProgress,
        ResultsDecrypted
    }
    
    struct Game {
        address player1;
        address player2;
        euint8 encryptedMove1;
        euint8 encryptedMove2;
        bool player1Committed;
        bool player2Committed;
        GameStatus status;
        uint256 createdAt;
        uint256 requestId;
        
        // Decrypted results (only available after decryption)
        bool isDraw;
        bool player1Wins;
        bool resultsDecrypted;
    }
    
    mapping(uint256 => Game) public games;
    mapping(uint256 => uint256) public requestIdToGameId; // Map request ID to game ID
    uint256 public gameCounter;
    
    event GameCreated(uint256 indexed gameId, address indexed player1);
    event PlayerJoined(uint256 indexed gameId, address indexed player2);
    event MoveMade(uint256 indexed gameId, address indexed player, bool isPlayer1);
    event DecryptionRequested(uint256 indexed gameId, uint256 indexed requestId);
    event GameFinished(uint256 indexed gameId, address winner, bool isDraw);
    
    constructor() {
        // Initialize with any required setup
    }
    
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
            status: GameStatus.WaitingForPlayers,
            createdAt: block.timestamp,
            requestId: 0,
            isDraw: false,
            player1Wins: false,
            resultsDecrypted: false
        });
        
        // FHEVM v0.8 compliance: Allow encrypted variables for this contract
        FHE.allowThis(games[gameId].encryptedMove1);
        FHE.allowThis(games[gameId].encryptedMove2);
        
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
        require(game.status == GameStatus.WaitingForPlayers, "Game not in waiting state");
        
        game.player2 = msg.sender;
        game.status = GameStatus.WaitingForMoves;
        
        emit PlayerJoined(gameId, msg.sender);
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
        require(game.status == GameStatus.WaitingForMoves, "Game not accepting moves");
        require(
            msg.sender == game.player1 || msg.sender == game.player2,
            "Not a player in this game"
        );
        
        // Validate and convert the encrypted input
        euint8 move = FHE.fromExternal(encryptedMove, inputProof);
        
        // FHEVM v0.8 compliance: Allow the encrypted move for this contract
        FHE.allowThis(move);
        
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
        
        // If both players have committed, mark as ready for resolution
        if (game.player1Committed && game.player2Committed) {
            game.status = GameStatus.MovesCommitted;
        }
    }
    
    /// @notice Request decryption of game results using FHEVM v0.8 async pattern
    /// @param gameId The ID of the game
    function requestGameResolution(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.status == GameStatus.MovesCommitted, "Game not ready for resolution");
        require(
            msg.sender == game.player1 || msg.sender == game.player2,
            "Not a player in this game"
        );
        
        // Determine winner using FHE operations
        euint8 move1 = game.encryptedMove1;
        euint8 move2 = game.encryptedMove2;
        
        // Check if moves are equal (draw)
        ebool isDrawEncrypted = FHE.eq(move1, move2);
        
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
        
        ebool player1WinsEncrypted = FHE.or(FHE.or(rockBeatsScissors, paperBeatsRock), scissorsBeatsPaper);
        
        // FHEVM v0.8 compliance: Allow access to encrypted results for decryption
        FHE.allowTransient(isDrawEncrypted, msg.sender);
        FHE.allowTransient(player1WinsEncrypted, msg.sender);
        
        // FHEVM v0.8 compliance: Request async decryption
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(isDrawEncrypted);
        cts[1] = FHE.toBytes32(player1WinsEncrypted);
        
        uint256 requestId = FHE.requestDecryption(cts, this.gameResolutionCallback.selector);
        game.requestId = requestId;
        game.status = GameStatus.DecryptionInProgress;
        requestIdToGameId[requestId] = gameId;
        
        emit DecryptionRequested(gameId, requestId);
    }
    
    /// @notice FHEVM v0.8 compliant callback function for game resolution decryption
    /// @param requestId The request ID from the decryption request
    /// @param cleartexts The decrypted results
    /// @param decryptionProof The decryption proof
    function gameResolutionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Find the game using the request ID mapping
        uint256 gameId = requestIdToGameId[requestId];
        require(gameId != 0 || games[0].requestId == requestId, "Request ID not found");
        
        Game storage game = games[gameId];
        
        // FHEVM v0.8 compliance: Verify the decryption signatures
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        // Decode the results
        (bool isDraw, bool player1Wins) = abi.decode(cleartexts, (bool, bool));
        
        // Store the decrypted results
        game.isDraw = isDraw;
        game.player1Wins = player1Wins;
        game.resultsDecrypted = true;
        game.status = GameStatus.ResultsDecrypted;
        
        // Determine the winner
        address winner = address(0);
        if (!game.isDraw) {
            winner = game.player1Wins ? game.player1 : game.player2;
        }
        
        emit GameFinished(gameId, winner, isDraw);
    }
    
    /// @notice Get game information
    /// @param gameId The ID of the game
    /// @return player1 Address of player 1
    /// @return player2 Address of player 2
    /// @return status Current game status
    /// @return player1Committed Whether player 1 has committed their move
    /// @return player2Committed Whether player 2 has committed their move
    /// @return resultsDecrypted Whether results have been decrypted
    function getGame(uint256 gameId) external view returns (
        address player1,
        address player2,
        GameStatus status,
        bool player1Committed,
        bool player2Committed,
        bool resultsDecrypted
    ) {
        Game storage game = games[gameId];
        require(game.player1 != address(0), "Game does not exist");
        
        return (
            game.player1,
            game.player2,
            game.status,
            game.player1Committed,
            game.player2Committed,
            game.resultsDecrypted
        );
    }
    
    /// @notice Get decrypted game results (only available after decryption)
    /// @param gameId The ID of the game
    /// @return isDraw Whether the game was a draw
    /// @return player1Wins Whether player 1 won
    /// @return winner The address of the winner (address(0) for draw)
    function getGameResults(uint256 gameId) external view returns (
        bool isDraw,
        bool player1Wins,
        address winner
    ) {
        Game storage game = games[gameId];
        require(game.player1 != address(0), "Game does not exist");
        require(game.resultsDecrypted, "Results not yet decrypted");
        
        address winnerAddress = address(0);
        if (!game.isDraw) {
            winnerAddress = game.player1Wins ? game.player1 : game.player2;
        }
        
        return (game.isDraw, game.player1Wins, winnerAddress);
    }
    
    /// @notice Check if game is ready to be resolved
    /// @param gameId The ID of the game
    /// @return Whether both players have committed their moves
    function isGameReady(uint256 gameId) external view returns (bool) {
        Game storage game = games[gameId];
        return game.player1Committed && game.player2Committed && game.status == GameStatus.MovesCommitted;
    }
    
    /// @notice Get the current game counter
    /// @return The current game counter value
    function getGameCounter() external view returns (uint256) {
        return gameCounter;
    }
    
    /// @notice Get the request ID for a game (for debugging)
    /// @param gameId The ID of the game
    /// @return The request ID for decryption
    function getGameRequestId(uint256 gameId) external view returns (uint256) {
        return games[gameId].requestId;
    }
}
        FHE.allowTransient(player1WinsEncrypted, msg.sender);
        
        // FHEVM v0.8 compliance: Request async decryption
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(isDrawEncrypted);
        cts[1] = FHE.toBytes32(player1WinsEncrypted);
        
        uint256 requestId = FHE.requestDecryption(cts, this.gameResolutionCallback.selector);
        game.requestId = requestId;
        game.status = GameStatus.DecryptionInProgress;
        requestIdToGameId[requestId] = gameId;
        
        emit DecryptionRequested(gameId, requestId);
    }
    
    /// @notice FHEVM v0.8 compliant callback function for game resolution decryption
    /// @param requestId The request ID from the decryption request
    /// @param cleartexts The decrypted results
    /// @param decryptionProof The decryption proof
    function gameResolutionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Find the game using the request ID mapping
        uint256 gameId = requestIdToGameId[requestId];
        require(gameId != 0 || games[0].requestId == requestId, "Request ID not found");
        
        Game storage game = games[gameId];
        
        // FHEVM v0.8 compliance: Verify the decryption signatures
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        // Decode the results
        (bool isDraw, bool player1Wins) = abi.decode(cleartexts, (bool, bool));
        
        // Store the decrypted results
        game.isDraw = isDraw;
        game.player1Wins = player1Wins;
        game.resultsDecrypted = true;
        game.status = GameStatus.ResultsDecrypted;
        
        // Determine the winner
        address winner = address(0);
        if (!game.isDraw) {
            winner = game.player1Wins ? game.player1 : game.player2;
        }
        
        emit GameFinished(gameId, winner, isDraw);
    }
    
    /// @notice Get game information
    /// @param gameId The ID of the game
    /// @return player1 Address of player 1
    /// @return player2 Address of player 2
    /// @return status Current game status
    /// @return player1Committed Whether player 1 has committed their move
    /// @return player2Committed Whether player 2 has committed their move
    /// @return resultsDecrypted Whether results have been decrypted
    function getGame(uint256 gameId) external view returns (
        address player1,
        address player2,
        GameStatus status,
        bool player1Committed,
        bool player2Committed,
        bool resultsDecrypted
    ) {
        Game storage game = games[gameId];
        require(game.player1 != address(0), "Game does not exist");
        
        return (
            game.player1,
            game.player2,
            game.status,
            game.player1Committed,
            game.player2Committed,
            game.resultsDecrypted
        );
    }
    
    /// @notice Get decrypted game results (only available after decryption)
    /// @param gameId The ID of the game
    /// @return isDraw Whether the game was a draw
    /// @return player1Wins Whether player 1 won
    /// @return winner The address of the winner (address(0) for draw)
    function getGameResults(uint256 gameId) external view returns (
        bool isDraw,
        bool player1Wins,
        address winner
    ) {
        Game storage game = games[gameId];
        require(game.player1 != address(0), "Game does not exist");
        require(game.resultsDecrypted, "Results not yet decrypted");
        
        address winnerAddress = address(0);
        if (!game.isDraw) {
            winnerAddress = game.player1Wins ? game.player1 : game.player2;
        }
        
        return (game.isDraw, game.player1Wins, winnerAddress);
    }
    
    /// @notice Check if game is ready to be resolved
    /// @param gameId The ID of the game
    /// @return Whether both players have committed their moves
    function isGameReady(uint256 gameId) external view returns (bool) {
        Game storage game = games[gameId];
        return game.player1Committed && game.player2Committed && game.status == GameStatus.MovesCommitted;
    }
    
    /// @notice Get the current game counter
    /// @return The current game counter value
    function getGameCounter() external view returns (uint256) {
        return gameCounter;
    }
    
    /// @notice Get the request ID for a game (for debugging)
    /// @param gameId The ID of the game
    /// @return The request ID for decryption
    function getGameRequestId(uint256 gameId) external view returns (uint256) {
        return games[gameId].requestId;
    }
}
        FHE.allowTransient(player1WinsEncrypted, msg.sender);
        
        // FHEVM v0.8 compliance: Request async decryption
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(isDrawEncrypted);
        cts[1] = FHE.toBytes32(player1WinsEncrypted);
        
        uint256 requestId = FHE.requestDecryption(cts, this.gameResolutionCallback.selector);
        game.requestId = requestId;
        game.status = GameStatus.DecryptionInProgress;
        requestIdToGameId[requestId] = gameId;
        
        emit DecryptionRequested(gameId, requestId);
    }
    
    /// @notice FHEVM v0.8 compliant callback function for game resolution decryption
    /// @param requestId The request ID from the decryption request
    /// @param cleartexts The decrypted results
    /// @param decryptionProof The decryption proof
    function gameResolutionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Find the game using the request ID mapping
        uint256 gameId = requestIdToGameId[requestId];
        require(gameId != 0 || games[0].requestId == requestId, "Request ID not found");
        
        Game storage game = games[gameId];
        
        // FHEVM v0.8 compliance: Verify the decryption signatures
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        // Decode the results
        (bool isDraw, bool player1Wins) = abi.decode(cleartexts, (bool, bool));
        
        // Store the decrypted results
        game.isDraw = isDraw;
        game.player1Wins = player1Wins;
        game.resultsDecrypted = true;
        game.status = GameStatus.ResultsDecrypted;
        
        // Determine the winner
        address winner = address(0);
        if (!game.isDraw) {
            winner = game.player1Wins ? game.player1 : game.player2;
        }
        
        emit GameFinished(gameId, winner, isDraw);
    }
    
    /// @notice Get game information
    /// @param gameId The ID of the game
    /// @return player1 Address of player 1
    /// @return player2 Address of player 2
    /// @return status Current game status
    /// @return player1Committed Whether player 1 has committed their move
    /// @return player2Committed Whether player 2 has committed their move
    /// @return resultsDecrypted Whether results have been decrypted
    function getGame(uint256 gameId) external view returns (
        address player1,
        address player2,
        GameStatus status,
        bool player1Committed,
        bool player2Committed,
        bool resultsDecrypted
    ) {
        Game storage game = games[gameId];
        require(game.player1 != address(0), "Game does not exist");
        
        return (
            game.player1,
            game.player2,
            game.status,
            game.player1Committed,
            game.player2Committed,
            game.resultsDecrypted
        );
    }
    
    /// @notice Get decrypted game results (only available after decryption)
    /// @param gameId The ID of the game
    /// @return isDraw Whether the game was a draw
    /// @return player1Wins Whether player 1 won
    /// @return winner The address of the winner (address(0) for draw)
    function getGameResults(uint256 gameId) external view returns (
        bool isDraw,
        bool player1Wins,
        address winner
    ) {
        Game storage game = games[gameId];
        require(game.player1 != address(0), "Game does not exist");
        require(game.resultsDecrypted, "Results not yet decrypted");
        
        address winnerAddress = address(0);
        if (!game.isDraw) {
            winnerAddress = game.player1Wins ? game.player1 : game.player2;
        }
        
        return (game.isDraw, game.player1Wins, winnerAddress);
    }
    
    /// @notice Check if game is ready to be resolved
    /// @param gameId The ID of the game
    /// @return Whether both players have committed their moves
    function isGameReady(uint256 gameId) external view returns (bool) {
        Game storage game = games[gameId];
        return game.player1Committed && game.player2Committed && game.status == GameStatus.MovesCommitted;
    }
    
    /// @notice Get the current game counter
    /// @return The current game counter value
    function getGameCounter() external view returns (uint256) {
        return gameCounter;
    }
    
    /// @notice Get the request ID for a game (for debugging)
    /// @param gameId The ID of the game
    /// @return The request ID for decryption
    function getGameRequestId(uint256 gameId) external view returns (uint256) {
        return games[gameId].requestId;
    }
}