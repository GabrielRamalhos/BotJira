require('dotenv').config();
const express = require('express');
const app = express();
const axios = require('axios');
const { createJiraTicket } = require('./services/jiraService');
const { analyzeTicketWithGemini } = require('./services/geminiService');
const errorHandler = require('./middlewares/errorHandler');
const { addTicketExample, getTicketHistory } = require('./utils/ticketHistory');

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('API do Bot Jira está rodando!');
});

function toADF(text) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: text
          }
        ]
      }
    ]
  };
};

// Mapeamento dos nomes de prioridade para IDs do Jira (ajuste conforme seu Jira)
const PRIORITY_MAP = {
  '1': '1', // Muito Alto
  '2': '2', // Alto
  '3': '3', // Médio
  '4': '4', // Baixo
  '5': '5', // Muito Baixo
  '10000': '10000' // War Room
};

// Mapeamento dos nomes de issuetype para IDs do Jira
const ISSUETYPE_MAP = {
  'Tarefa': '10024',
  'Subtarefa': '10025',
  'História': '10013',
  'Bug': '10026',
  'Epic': '10000'
};

// Função para traduzir prioridade PT->EN
function traduzirPrioridade(prioridade) {
  if (!prioridade) return undefined;
  const mapa = {
    'Highest': 'Highest',
    'High': 'High',
    'Medium': 'Medium',
    'Low': 'Low',
    'Lowest': 'Lowest'
  };
  return mapa[prioridade] || prioridade;
}

async function validarIssuetype(issuetype) {
  const JIRA_URL = process.env.JIRA_URL;
  const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  try {
    const response = await axios.get(`${JIRA_URL}/rest/api/3/issuetype/${issuetype}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
    return response.status === 200; // Retorna true se o issuetype existe
  } catch (error) {
    return false; // Retorna false se o issuetype não existe ou houve um erro na requisição
  }
}


app.post('/create-ticket', async (req, res, next) => {
  const { text, issuetype, priority } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    const err = new Error('O campo "text" é obrigatório e deve ter no mínimo 10 caracteres.');
    err.status = 400;
    return next(err);
  }
  
  // Corrigir: issuetype deve ser string (ID), não objeto
  if (!issuetype || typeof issuetype !== 'string') {
    const err = new Error('O tipo de ticket deve ser fornecido como ID.');
    err.status = 400;
    return next(err);
  }

  const issuetypeValido = await validarIssuetype(issuetype);
  if (!issuetypeValido) {
    const err = new Error('O tipo de ticket fornecido é inválido.');
    err.status = 400;
    return next(err);
  }
  try {
    // Recupera histórico recente para o prompt
    const history = getTicketHistory();

    // Passe o histórico para o Gemini
    let ticketData = await analyzeTicketWithGemini(text, history);

    // Se a IA retornar o nome, converte para ID
    if (ticketData.issuetype && ISSUETYPE_MAP[ticketData.issuetype]) {
      ticketData.issuetype = { id: ISSUETYPE_MAP[ticketData.issuetype] };
    } else {
      // fallback: usa o ID recebido do frontend
      ticketData.issuetype = { id: issuetype };
    }

    // Converte descrição para ADF se necessário
    if (typeof ticketData.description === 'string') {
      ticketData.description = toADF(ticketData.description);
    }

     // Prioridade: usuário tem preferência, senão usa IA
    let prioridadeFinal = priority || ticketData.priority;

    // Se prioridade for ID válida, já usa direto
    if (prioridadeFinal && PRIORITY_MAP[prioridadeFinal]) {
      ticketData.priority = { id: PRIORITY_MAP[prioridadeFinal] };
    } else {
      // Traduz a prioridade para inglês, se necessário
      ticketData.priority = traduzirPrioridade(prioridadeFinal);
      // Garante que só envie string ou undefined
      if (typeof ticketData.priority !== 'string' || !ticketData.priority.trim()) {
        delete ticketData.priority;
      }
      // Se houver prioridade, converte para ID do Jira
      if (ticketData.priority && PRIORITY_MAP[ticketData.priority]) {
        ticketData.priority = { id: PRIORITY_MAP[ticketData.priority] };
      } else {
        delete ticketData.priority;
      }
    }

    const jiraResponse = await createJiraTicket(ticketData);

    // Salva o exemplo no histórico após criar o ticket
    addTicketExample(text, ticketData);

    res.status(201).json({ message: 'Ticket criado com sucesso!', jiraResponse });
  } catch (error) {
    next(error);
  }
});

// Rota para buscar os tipos de issue do Jira
app.get('/tipos-de-issue', async (req, res, next) => {
  const JIRA_URL = process.env.JIRA_URL;
  const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  try {
    const response = await axios.get(`${JIRA_URL}/rest/api/3/issuetype`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
