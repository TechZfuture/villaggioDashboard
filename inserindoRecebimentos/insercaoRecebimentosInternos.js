const mysql = require("mysql2/promise");
const moment = require("moment");

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados");
const apitoken = require('../../../informacoesAPI/villaggio')

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/receipts?apitoken=${apitoken}`;

  try {
    const data = await (await fetch(apiUrl)).json();
    return data.items || [];
  } catch (error) {
    console.error("Erro ao buscar dados da API:", error);
    return [];
  }
}

function formatarDataParaMySQL(data) {
  return moment(data).format("YYYY-MM-DD HH:mm:ss");
}

// Função para inserir os dados no banco de dados
async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);
  let [atualizadas, inseridas] = [0, 0];

  try {
    for (const item of data) {
      if (item.isTransfer === true) {
        const [existe] = await connection.execute(
          "SELECT * FROM internalIncomingBills WHERE entryId = ?",
          [item.entryId]
        );

        const query = existe.length > 0
        ? `UPDATE internalIncomingBills SET bankBalanceDateIsGreaterThanEntryDate = ?, isVirtual = ?, accountId = ?, accountName = ?,
        accountIsDeleted = ?, date = ?, identifier = ?, value = ?, checkNumber = ?, isReconciliated = ?, isTransfer = ?, isFlagged = ?
         WHERE entryId = ?`
        : `INSERT INTO internalIncomingBills (entryId, bankBalanceDateIsGreaterThanEntryDate, isVirtual, accountId, accountName, accountIsDeleted, date, identifier, value, checkNumber,
          isReconciliated, isTransfer, isFlagged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = existe.length > 0
        ? [ item.bankBalanceDateIsGreaterThanEntryDate,
          item.isVirtual,
          item.account.id,
          item.account.name,
          item.account.isDeleted,
          formatarDataParaMySQL(item.date) || null,
          item.identifier,
          item.value,
          item.checkNum || null,
          item.isReconciliated,
          item.isTransfer,
          item.isFlagged,
          item.entryId]
        : [item.entryId || null,
          item.bankBalanceDateIsGreaterThanEntryDate || null,
          item.isVirtual || null,
          item.account.id || null,
          item.account.name || null,
          item.account.isDeleted || null,
          formatarDataParaMySQL(item.date) || null,
          item.identifier || null,
          item.value || null,
          item.checkNum || null,
          item.isReconciliated || null,
          item.isTransfer || null,
          item.isFlagged || null];

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

async function deletarDadosNaoPresentesNaAPI(data) {
  const connection = await mysql.createConnection(dbConfig);
  let excluidas = 0;

  try {
    // Busque todos os registros no banco de dados
    const [dbData] = await connection.execute(
      "SELECT entryId FROM internalIncomingBills"
    );

    // Crie um conjunto (Set) com os entry_ids dos registros no banco de dados
    const dbDataEntryIds = new Set(dbData.map((item) => item.entryId));

    // Crie um conjunto (Set) com os entry_ids dos registros da API
    const apiDataEntryIds = new Set(data.map((item) => item.entryId));

    // Encontre os entry_ids que estão no banco de dados, mas não na API
    const entryIdsToDelete = [...dbDataEntryIds].filter(
      (entryId) => !apiDataEntryIds.has(entryId)
    );

    // Deletar os registros que não existem mais na API
    for (const entryIdToDelete of entryIdsToDelete) {
      await connection.execute(
        "DELETE FROM internalIncomingBills WHERE entryId = ?",
        [entryIdToDelete]
      );
      excluidas++;
    }

    console.log(`${excluidas} => Pagamentos excluidos !`);
  } catch (error) {
    console.error("Erro ao deletar dados do banco de dados:", error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados
  }
}


(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI();
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI);
      await deletarDadosNaoPresentesNaAPI(dadosDaAPI);
    }
  } catch (error) {
    console.error("Erro no processo:", error);
  }
})();