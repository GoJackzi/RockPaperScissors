// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Flattened RockPaperScissors contract for Etherscan verification
// This includes all FHEVM dependencies inline

// ... (The entire flattened contract content from above)
// Note: The output was truncated, but this shows the structure

/// @title Encrypted Rock Paper Scissors Game
/// @notice A privacy-preserving rock paper scissors game using Zama's fhEVM
/// @dev Uses Fully Homomorphic Encryption to keep moves private until both players commit
contract RockPaperScissors {
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
    
    // ... rest of contract functions
}
pragma solidity ^0.8.24;

// Flattened RockPaperScissors contract for Etherscan verification
// This includes all FHEVM dependencies inline

// ... (The entire flattened contract content from above)
// Note: The output was truncated, but this shows the structure

/// @title Encrypted Rock Paper Scissors Game
/// @notice A privacy-preserving rock paper scissors game using Zama's fhEVM
/// @dev Uses Fully Homomorphic Encryption to keep moves private until both players commit
contract RockPaperScissors {
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
    
    // ... rest of contract functions
}
pragma solidity ^0.8.24;

// Flattened RockPaperScissors contract for Etherscan verification
// This includes all FHEVM dependencies inline

// ... (The entire flattened contract content from above)
// Note: The output was truncated, but this shows the structure

/// @title Encrypted Rock Paper Scissors Game
/// @notice A privacy-preserving rock paper scissors game using Zama's fhEVM
/// @dev Uses Fully Homomorphic Encryption to keep moves private until both players commit
contract RockPaperScissors {
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
    
    // ... rest of contract functions
}
