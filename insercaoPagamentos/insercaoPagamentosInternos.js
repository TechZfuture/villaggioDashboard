const mysql = require("mysql2/promise");
const moment = require("moment");

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados");
const apitoken = require("../informacoesAPI/informacoes");

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/payments?apitoken=${apitoken}`;

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
          "SELECT * FROM internalPayments WHERE entryId = ?",
          [item.entryId]
        );

        const query =
          existe.length > 0
            ? `UPDATE internalPayments SET bankBalanceDateIsGreaterThanEntryDate = ?, isVirtual = ?, accountId = ?, accountName = ?, accountIsDeleted = ?, date = ?, identifier = ?, value = ?, isReconciliated = ?,
            isTransfer = ?, isFlagged = ? 
               WHERE entryId = ?`
            : `INSERT INTO internalPayments (entryId, bankBalanceDateIsGreaterThanEntryDate, isVirtual, accountId, accountName, accountIsDeleted, date, identifier, value, isReconciliated, isTransfer, isFlagged) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params =
          existe.length > 0
            ? [
                item.bankBalanceDateIsGreaterThanEntryDate,
                item.isVirtual,
                item.account.id || null,
                item.account.name || null,
                item.account.isDeleted,
                formatarDataParaMySQL(item.date) || null,
                item.identifier || null,
                item.value || null,
                item.isReconciliated,
                item.isTransfer,
                item.isFlagged,
                item.entryId || null,
              ]
            : [
                item.entryId,
                item.bankBalanceDateIsGreaterThanEntryDate,
                item.isVirtual,
                item.account.id,
                item.account.name,
                item.account.isDeleted,
                formatarDataParaMySQL(item.date) || null,
                item.identifier,
                item.value,
                item.isReconciliated,
                item.isTransfer,
                item.isFlagged,
              ];

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

// Função para deletar dados do banco de dados que não existem mais na API
async function deletarDadosNaoPresentesNaAPI(data) {
  const connection = await mysql.createConnection(dbConfig);
  let excluidas = 0;

  try {
    // Busque todos os registros no banco de dados
    const [dbData] = await connection.execute(
      "SELECT entryId FROM internalPayments"
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
        "DELETE FROM internalPayments WHERE entryId = ?",
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
