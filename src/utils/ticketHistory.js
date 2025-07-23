const fs = require('fs');
const path = require('path');
const HISTORY_FILE = path.join(__dirname, 'ticketHistory.json');

let history = [];

// Carrega histórico do arquivo ao iniciar (mantém também em memória)
if (fs.existsSync(HISTORY_FILE)) {
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch (e) {
    history = [];
  }
}

// Salva histórico no arquivo (mantém em memória)
function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

// Adiciona um novo exemplo ao histórico (memória + arquivo)
function addTicketExample(input, output) {
  history.push({ input, output });
  // Limita o histórico a 20 exemplos mais recentes
  if (history.length > 20) history.shift();
  saveHistory();
}

// Recupera o histórico atual da memória (mais recentes primeiro)
function getTicketHistory() {
  return [...history].reverse();
}

// Recupera o histórico diretamente do arquivo (caso precise garantir persistência)
function getTicketHistoryFromFile() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')).reverse();
    } catch (e) {
      return [];
    }
  }
  return [];
}

module.exports = { addTicketExample, getTicketHistory, getTicketHistoryFromFile };
