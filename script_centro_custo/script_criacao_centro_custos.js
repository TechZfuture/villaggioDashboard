const sql = require('mssql');
const fetch = require('node-fetch');

const dbConfig = {
  server: 'DESKTOP-SPTK1M6',
  user: 'lgusstavo',
  password: '!F1n@l12E*',
  database: 'sistema',
};

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiToken = '0C1F3E7F408A4B6B95ADCA50E36BDE9B';
  const apiUrl = `https://api.nibo.com.br/empresas/v1/costcenters?apitoken=${apiToken}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erro na solicitação: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items; // Retorna apenas o array de objetos "items"
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error);
    return [];
  }
}

// Função para inserir os dados no banco de dados SQL Server
async function inserirDadosNoBancoDeDados(data) {
  try {
    await sql.connect(dbConfig);

    for (const item of data) {
      const existe = await sql.query`SELECT * FROM cost_center WHERE cost_center_id = ${item.costCenterId}`;

      if (existe.recordset.length > 0) {
        await sql.query`
          UPDATE cost_center
          SET description = ${item.description}
          WHERE cost_center_id = ${item.costCenterId}
        `;
      } else {
        await sql.query`
          INSERT INTO cost_center (cost_center_id, description)
          VALUES (${item.costCenterId}, ${item.description})
        `;
      }
    }

    console.log('Dados inseridos no banco de dados com sucesso.');
  } catch (error) {
    console.error('Erro ao inserir dados no banco de dados:', error);
  } finally {
    await sql.close(); // Feche a conexão com o banco de dados SQL Server
  }
}

// Executa o processo
(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI();
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI);
    }
  } catch (error) {
    console.error('Erro no processo:', error);
  }
})();