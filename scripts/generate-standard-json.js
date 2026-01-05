const fs = require('fs');
const path = require('path');

// Read the compiled artifacts
const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'RockPaperScissors.sol');
const contractArtifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, 'RockPaperScissors.json'), 'utf8'));

// Create Standard JSON input
const standardJsonInput = {
  language: "Solidity",
  sources: {
    "contracts/RockPaperScissors.sol": {
      content: fs.readFileSync(path.join(__dirname, '..', 'contracts', 'RockPaperScissors.sol'), 'utf8')
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    evmVersion: "cancun",
    viaIR: true,
    outputSelection: {
      "*": {
        "*": ["*"]
      }
    }
  }
};

// Write to file
fs.writeFileSync('standard-json-input.json', JSON.stringify(standardJsonInput, null, 2));

console.log('Standard JSON input generated: standard-json-input.json');
console.log('Contract bytecode:', contractArtifact.bytecode);
console.log('Contract ABI length:', contractArtifact.abi.length);





