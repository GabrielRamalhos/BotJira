const axios = require('axios');

async function createJiraTicket({ issuetype, summary, description, priority }) {
  const JIRA_URL = process.env.JIRA_URL;
  const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  const payload = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary,
      description,
      issuetype
      // priority será adicionado abaixo se válido
    }
  };

  // Adiciona priority se for objeto { id: ... }
  if (priority && typeof priority === 'object' && priority.id) {
    payload.fields.priority = { id: priority.id };
  }

  console.log('Payload enviado ao Jira:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      `${JIRA_URL}/rest/api/3/issue`,
      payload,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('ERRO AO CRIAR ISSUE NO JIRA:');
    if (error.response) {
      try {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
        if (error.response.data && error.response.data.errors) {
          console.error('Errors:', JSON.stringify(error.response.data.errors, null, 2));
        }
        if (error.response.data && error.response.data.errorMessages) {
          console.error('ErrorMessages:', JSON.stringify(error.response.data.errorMessages, null, 2));
        }
      } catch (e) {
        console.error('Data (bruto):', error.response.data);
      }
    } else {
      console.error('Erro desconhecido:', error);
    }
    throw error;
  }
}

module.exports = { createJiraTicket };