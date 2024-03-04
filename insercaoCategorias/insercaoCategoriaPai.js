const mysql = require("mysql2/promise");

const dbConfig = require('../informacoesBanco/informacoesBancoDeDados');
const apitoken = require('../../../informacoesAPI/villaggio')

// Função para buscar os dados da API - CATEGORIA PAI
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/categories/groups?apitoken=${apitoken}`;
  
  try {
    const data = await (await fetch(apiUrl)).json();
    return data.items || [];
  } catch (error) {
    console.error("Erro ao buscar dados da API:", error);
    return [];
  }
}

// Função para inserir os dados no banco de dados
const inserirDadosNoBancoDeDados = async (data) => {
  const connection = await mysql.createConnection(dbConfig);
  let [atualizadas, inseridas] = [0, 0];

  try {
    for (const item of data) {
      const [existe] = await connection.execute(
        "SELECT * FROM parentcategory WHERE idParent = ?",
        [item.id]
      );

      const query = existe.length > 0
        ? "UPDATE parentcategory SET id = ?, name = ?, referenceCode = ? WHERE idParent = ?"
        : "INSERT INTO parentcategory (id, idParent, name, referenceCode) VALUES (?, ?, ?, ?)";

      const params = existe.length > 0
        ? [item.referenceCode, item.name, item.referenceCode, item.id]
        : [item.referenceCode, item.id, item.name, item.referenceCode];

      const [result] = await connection.execute(query, params);

      existe.length > 0 ? atualizadas += result.changedRows : inseridas += result.affectedRows;
    }
    console.log(`\n${atualizadas} consultas atualizadas no banco de dados.\n${inseridas} consultas inseridas no banco de dados.`);
  } catch (error) {
    console.error("ERRO ! DETALHES DO ERRO => ", error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados
  }
};

// Função para deletar dados que não existem mais na API
async function deletarDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const idsNaAPI = new Set(data.map((item) => item.id));
    const registrosNoBanco = (await connection.execute("SELECT idParent FROM parentCategory"))[0];

    // Iterar sobre os registros do banco de dados e excluir se o ID não estiver na API
    for (const { idParent } of registrosNoBanco) {
      if (!idsNaAPI.has(idParent)) {
        await connection.execute("DELETE FROM parentCategory WHERE idParent = ?", [idParent]);
        console.log(`\nRegistro com parent_id ${idParent.parent_id} foi excluído.`);
      }
    }
  } catch (error) {
    console.error("Erro ao deletar dados no banco de dados:", error);
  } finally {
    connection.end();
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
