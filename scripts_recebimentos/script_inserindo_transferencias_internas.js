const mysql = require("mysql2/promise");

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "sistema",
};

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiToken = "0C1F3E7F408A4B6B95ADCA50E36BDE9B";
  const apiUrl = `https://api.nibo.com.br/empresas/v1/receipts?apitoken=${apiToken}`;

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

// Função para inserir os dados no banco de dados
async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    for (const item of data) {

      if (item.isTransfer === true) {

        const [existe] = await connection.execute(
          "SELECT * FROM internal_incoming_bills WHERE entry_id = ?",
          [item.entryId]
        );

        if (existe.length > 0) {
          await connection.execute(`UPDATE internal_incoming_bills SET bank_balance_date_is_greater_than_entry_date = ?, is_virtual = ?, account_id = ?, account_name = ?,
            account_is_deleted = ?, date = ?, identifier = ?, value = ?, check_number = ?, is_reconciliated = ?, is_transfer = ?, is_flagged = ?
             WHERE entry_id = ?`, [
            item.bankBalanceDateIsGreaterThanEntryDate,
            item.isVirtual,
            item.account.id,
            item.account.name,
            item.account.isDeleted,
            item.date,
            item.identifier,
            item.value,
            item.checkNum || null,
            item.isReconciliated,
            item.isTransfer,
            item.isFlagged,
            item.entryId
          ]);
        } else {
          const query =
            `INSERT INTO internal_incoming_bills (entry_id, bank_balance_date_is_greater_than_entry_date, is_virtual, account_id, account_name, account_is_deleted, date, identifier, value, check_number,
                is_reconciliated, is_transfer, is_flagged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          await connection.query(query, [
            item.entryId,
            item.bankBalanceDateIsGreaterThanEntryDate,
            item.isVirtual,
            item.account.id,
            item.account.name,
            item.account.isDeleted,
            item.date,
            item.identifier,
            item.value,
            item.checkNum,
            item.isReconciliated,
            item.isTransfer,
            item.isFlagged
          ]);
        }
      }
    }

    console.log("Dados inseridos no banco de dados com sucesso.");
  } catch (error) {
    console.error("Erro ao inserir dados no banco de dados:", error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados
  }
}

async function deletarDadosExcedentesNoBanco(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Obtém todos os registros no banco de dados
    const [rows] = await connection.execute("SELECT entry_id FROM internal_incoming_bills");

    // Obtém os entry_id dos dados da API
    const entryIdsAPI = data.map(item => item.entryId);

    // Encontra entry_id no banco de dados que não estão na API
    const entryIdsNoAPI = rows.map(row => row.entry_id).filter(entryId => !entryIdsAPI.includes(entryId));

    if (entryIdsNoAPI.length > 0) {
      // Deleta os registros no banco que não estão mais na API
      await connection.execute("DELETE FROM internal_incoming_bills WHERE entry_id IN (?)", [entryIdsNoAPI]);
      console.log(`Foram excluídos ${entryIdsNoAPI.length} registros do banco.`);
    } else {
      console.log("Nenhum registro a ser excluído do banco.");
    }
  } catch (error) {
    console.error("Erro ao excluir dados excedentes do banco:", error);
  } finally {
    connection.end();
  }
}


(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI();
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI);
      await deletarDadosExcedentesNoBanco(dadosDaAPI);
    }
  } catch (error) {
    console.error("Erro no processo:", error);
  }
})();