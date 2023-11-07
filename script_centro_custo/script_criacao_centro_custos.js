const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sistema',
};

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiToken = "0C1F3E7F408A4B6B95ADCA50E36BDE9B";
  const apiUrl = `https://api.nibo.com.br/empresas/v1/costcenters?apitoken=${apiToken}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(
        `Erro na solicitação: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.items; // Retorna apenas o array de objetos "items"
  } catch (error) {
    console.error("Erro ao buscar dados da API:", error);
    return [];
  }
}

// Função para inserir os dados no banco de dados SQL Server
async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    for (const item of data) {
      const [existe] = await connection.execute(`SELECT * FROM cost_center WHERE costCenterId = ?`, [item.costCenterId|| null]);

      if (existe.length > 0) {
        await connection.execute(`
          UPDATE cost_center
          SET description = ?
          WHERE costCenterId = ?
        `, [
          item.description || null,
          item.costCenterId || null
        ]);
      } else {
        const query = `
          INSERT INTO cost_center (costCenterId, description)
          VALUES (?, ?)
        `;
        await connection.query(query, [item.costCenterId || null, item.description || null]);
      }
    }

    console.log('Dados inseridos no banco de dados com sucesso.');
  } catch (error) {
    console.error('Erro ao inserir dados no banco de dados:', error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados SQL Server
  }
}

// Função para deletar dados do banco que não existem mais na API
async function deletarDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Busque todos os registros no banco de dados
    const [dbData] = await connection.execute('SELECT costCenterId FROM cost_center');

    // Crie um conjunto (Set) com os IDs dos registros no banco de dados
    const dbDataIds = new Set(dbData.map((item) => item.costCenterId));

    // Encontre os IDs que estão no banco de dados, mas não na API
    const idsToDelete = [...dbDataIds].filter((id) => !data.some((item) => item.costCenterId === id));

    // Deletar os registros que não existem mais na API
    for (const idToDelete of idsToDelete) {
      await connection.execute('DELETE FROM cost_center WHERE costCenterId = ?', [idToDelete]);
    }

    console.log('Dados deletados do banco de dados com sucesso.');
  } catch (error) {
    console.error('Erro ao deletar dados do banco de dados:', error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados SQL Server
  }
}

// Executa o processo
(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI();
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI);
     //await deletarDadosNoBancoDeDados(dadosDaAPI);
    }
  } catch (error) {
    console.error('Erro no processo:', error);
  }
})();