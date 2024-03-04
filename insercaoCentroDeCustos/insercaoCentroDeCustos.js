const mysql = require("mysql2/promise");

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados");
const apitoken = require('../../../informacoesAPI/villaggio')

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/costcenters?apitoken=${apitoken}`;

  try {
    const data = await (await fetch(apiUrl)).json();
    return data.items || [];
  } catch (error) {
    console.error("Erro ao buscar dados da API:", error);
    return [];
  }
}

// Função para inserir os dados no banco de dados SQL Server
async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);
  let [atualizadas, inseridas] = [0, 0];

  try {
    for (const item of data) {
      if (item.costCenterId != null) {
        const [existe] = await connection.execute(
          "SELECT * FROM costCenter WHERE costCenterId = ?",
          [item.costCenterId || null]
        );

        const query =
          existe.length > 0
            ? "UPDATE costCenter SET description = ? WHERE costCenterId = ?"
            : "INSERT INTO costCenter (costCenterId, description) VALUES (?, ?)";

        const params =
          existe.length > 0
            ? [item.description || null, item.costCenterId || null]
            : [item.costCenterId || null, item.description || null];

        const [result] = await connection.execute(query, params);

        existe.length > 0
          ? (atualizadas += result.changedRows)
          : (inseridas += result.affectedRows);
      }
    }
    console.log(
      `\n${atualizadas} consultas atualizadas no banco de dados.\n${inseridas} consultas inseridas no banco de dados.`
    );
  } catch (error) {
  } finally {
    connection.end(); // Feche a conexão com o banco de dados SQL Server
  }
}

// Função para deletar dados do banco que não existem mais na API
async function deletarDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const dbDataIds = new Set(data.map((item) => item.costCenterId));
    const registrosNoBanco = (await connection.execute(
      "SELECT costCenterId FROM costCenter"
    ))[0];

    // Deletar os registros que não existem mais na API
    for (const { costCenterId } of registrosNoBanco) {
      if (!dbDataIds.has(costCenterId)) {
        await connection.execute(
          "DELETE FROM costCenter WHERE costCenterId = ?",
          [costCenterId]
        );
        console.log(`\nRegistro com subgroupId ${costCenterId} foi excluído.`);
      }
    }
  } catch (error) {
    console.error("Erro ao deletar dados do banco de dados:", error);
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
      await deletarDadosNoBancoDeDados(dadosDaAPI);
    }
  } catch (error) {
    console.error("Erro no processo:", error);
  }
})();
