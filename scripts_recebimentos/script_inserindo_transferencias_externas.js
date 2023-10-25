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

      if (item.isTransfer === false) {

        const [existe] = await connection.execute(
          "SELECT * FROM external_incoming_bills WHERE entry_id = ?",
          [item.entryId]
        );

        if (existe.length > 0) {
          await connection.execute(`UPDATE external_incoming_bills SET bank_balance_date_is_greater_than_entry_date = ?,
          schedule_id = ?, is_virtual = ?, account_id = ?, account_name = ?, account_is_deleted = ?, stakeholder_id = ?,
          stakeholder_name = ?, stakeholder_is_deleted = ?, category_id = ?, category_name = ?, category_is_deleted = ?, category_type = ?, category_parent_id = ?, category_parent_name = ?,
          date = ?, identifier = ?, value = ?, description = ?, check_number = ?, is_reconciliated = ?, is_transfer = ?, is_flagged = ?, cost_center_id = ?, cost_center_name = ?, cost_center_percent = ?, cost_center_value = ?
             WHERE entry_id = ?`, [
            item.bankBalanceDateIsGreaterThanEntryDate,
            item.scheduleId || null,
            item.isVirtual,
            item.account.id || null,
            item.account.name || null,
            item.account.isDeleted,
            item.stakeholder.id || null,
            item.stakeholder.name || null,
            item.stakeholder.isDeleted,
            item.category.id || null,
            item.category.name || null,
            item.category.isDeleted,
            item.category.type || null,
            item.categories[0].parentId || null,
            item.categories[0].parent || null,
            item.date || null,
            item.identifier || null,
            item.value || null,
            item.description || null,
            item.checkNum || null,
            item.isReconciliated || null,
            item.isTransfer,
            item.isFlagged,
            item.costCenter?.costCenterId ?? null,
            item.costCenter?.costCenterDescription ?? null,
            item.costCenters[0]?.percent ?? null,
            item.costCenters[0]?.value ?? null,
            item.entryId
          ]);
        } else {
          const query =
            `INSERT INTO external_incoming_bills (entry_id, bank_balance_date_is_greater_than_entry_date,
               schedule_id, is_virtual, account_id, account_name, account_is_deleted, stakeholder_id,
                stakeholder_name, stakeholder_is_deleted, category_id, category_name, category_is_deleted, category_type, category_parent_id, category_parent_name,
                date, identifier, value, description, check_number, is_reconciliated, is_transfer, is_flagged, cost_center_id, cost_center_name, cost_center_percent, cost_center_value) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          await connection.query(query, [
            item.entryId,
            item.bankBalanceDateIsGreaterThanEntryDate,
            item.scheduleId,
            item.isVirtual,
            item.account.id,
            item.account.name,
            item.account.isDeleted,
            item.stakeholder.id,
            item.stakeholder.name,
            item.stakeholder.isDeleted,
            item.category.id,
            item.category.name,
            item.category.isDeleted,
            item.category.type,
            item.categories[0].parentId,
            item.categories[0].parent,
            item.date,
            item.identifier,
            item.value,
            item.description,
            item.checkNum,
            item.isReconciliated,
            item.isTransfer,
            item.isFlagged,
            item.costCenter?.costCenterId ?? null,
            item.costCenter?.costCenterDescription ?? null,
            item.costCenters[0]?.percent ?? null,
            item.costCenters[0]?.value ?? null
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

// Função para deletar dados do banco de dados que não existem mais na API
async function deletarDadosNaoPresentesNaAPI(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Busque todos os registros no banco de dados
    const [dbData] = await connection.execute('SELECT entry_id FROM external_incoming_bills');

    // Crie um conjunto (Set) com os entry_ids dos registros no banco de dados
    const dbDataEntryIds = new Set(dbData.map((item) => item.entry_id));

    // Crie um conjunto (Set) com os entry_ids dos registros da API
    const apiDataEntryIds = new Set(data.map((item) => item.entryId));

    // Encontre os entry_ids que estão no banco de dados, mas não na API
    const entryIdsToDelete = [...dbDataEntryIds].filter((entryId) => !apiDataEntryIds.has(entryId));

    // Deletar os registros que não existem mais na API
    for (const entryIdToDelete of entryIdsToDelete) {
      await connection.execute('DELETE FROM external_incoming_bills WHERE entry_id = ?', [entryIdToDelete]);
    }

    console.log('Dados deletados do banco de dados com sucesso.');
  } catch (error) {
    console.error('Erro ao deletar dados do banco de dados:', error);
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