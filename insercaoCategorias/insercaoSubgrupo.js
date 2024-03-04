const mysql = require("mysql2/promise");

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados");
const apitoken = require('../../../informacoesAPI/villaggio')

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/categories?apitoken=${apitoken}`;

  try {
    const data = await (await fetch(apiUrl)).json();
    return data.items || [];
  } catch (error) {
    console.error("Erro ao buscar dados da API:", error);
    return [];
  }
}

async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);
  let [atualizadas, inseridas] = [0, 0];

  try {
    for (const item of data) {
      if (item.subgroupId != null) {
        const [existe] = await connection.execute(
          "SELECT * FROM subcategory WHERE subgroupId = ?",
          [item.subgroupId || null]
        );

        const query =
          existe.length > 0
            ? "UPDATE subcategory SET name = ?, subgroupId = ? WHERE subgroupId = ?"
            : "INSERT INTO subcategory (name, subgroupId) VALUES (?, ?)";

        const params =
          existe.length > 0
            ? [
                item.subgroupName || null,
                item.subgroupId || null,
                item.subgroupId || null,
              ]
            : [item.subgroupName || null, item.subgroupId || null];

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
    console.error("Erro ao inserir dados no banco de dados:", error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados
  }
}

// Função para deletar dados que não existem mais na API
async function deletarDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const subgroupIdSet = new Set(data.map((item) => item.subgroupId));
    const registrosNoBanco = await connection.execute(
      "SELECT subgroupId FROM subcategory"
    );

    for (const { subgroupId } of registrosNoBanco) {
      if (!subgroupIdSet.has(subgroupId)) {
        await connection.execute(
          "DELETE FROM subcategory WHERE subgroupId = ?",
          [subgroupId]
        );
        console.log(
          `\nRegistro com subgroupId ${subgroupId.subgroupId} foi excluído.`
        );
      }
    }
  } catch (error) {
    console.error("Erro ao deletar dados no banco de dados:", error);
  } finally {
    connection.end();
  }
}

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
