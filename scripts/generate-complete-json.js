const fs = require('fs');
const path = require('path');

// Read the flattened contract to get all the source code
const flattenedContent = fs.readFileSync('flattened-contract-clean.sol', 'utf8');

// Create Standard JSON input with the flattened content as a single source
const standardJsonInput = {
  language: "Solidity",
  sources: {
    "RockPaperScissors.sol": {
      content: flattenedContent
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
fs.writeFileSync('complete-standard-json.json', JSON.stringify(standardJsonInput, null, 2));

console.log('Complete Standard JSON input generated: complete-standard-json.json');
console.log('File size:', fs.statSync('complete-standard-json.json').size, 'bytes');





