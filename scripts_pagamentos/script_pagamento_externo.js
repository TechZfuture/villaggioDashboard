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
  const apiUrl = `https://api.nibo.com.br/empresas/v1/payments?apitoken=${apiToken}`;

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
          "SELECT * FROM external_payments WHERE entry_id = ?",
          [item.entryId]
        );

        if (existe.length > 0) {
          await connection.execute(
            `UPDATE external_payments SET bank_balance_date_is_greater_than_entry_date = ?,
             schedule_id = ?, is_virtual = ?, account_id = ?, account_name = ?, account_is_deleted = ?, stakeholder_id = ?,
             stakeholder_name = ?, stakeholder_is_deleted = ?, category_id = ?, category_name = ?, category_is_deleted = ?, category_type = ?, category_parent_id = ?, category_parent_name = ?,
             date = ?, identifier = ?, value = ?, description = ?, check_number = ?, is_reconciliated = ?, is_transfer = ?, is_flagged = ?, cost_center_id = ?, cost_center_name = ?, cost_center_percent = ?, cost_center_value = ?, value_investiment = ? where entry_id = ?`,
            [
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
              item.costCenter?.costCenterId || null,
              item.costCenter?.costCenterDescription || null,
              item.costCenters[0]?.percent || null,
              item.costCenters[0]?.value || null,
              null,
              item.entryId,
            ]
          );
        } else {
          const query = `INSERT INTO external_payments (entry_id, bank_balance_date_is_greater_than_entry_date,
               schedule_id, is_virtual, account_id, account_name, account_is_deleted, stakeholder_id,
                stakeholder_name, stakeholder_is_deleted, category_id, category_name, category_is_deleted, category_type, category_parent_id, category_parent_name,
                date, identifier, value, description, check_number, is_reconciliated, is_transfer, is_flagged, cost_center_id, cost_center_name, cost_center_percent, cost_center_value, value_investiment) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

          await connection.query(query, [
            item.entryId,
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
            item.costCenter?.costCenterId || null,
            item.costCenter?.costCenterDescription || null,
            item.costCenters[0]?.percent || null,
            item.costCenters[0]?.value || null,
            null
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

// Função para excluir registros que não existem na API
async function excluirRegistrosAusentesNoBancoDeDados(dataFromAPI) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Passo 1: Buscar todos os IDs no banco de dados
    const [existingRecords] = await connection.execute(
      "SELECT id FROM stakeholder"
    );

    // Extrair os IDs dos registros no banco de dados
    const existingRecordIds = existingRecords.map((record) => record.id);

    // Passo 2: Comparar os IDs com os IDs da API e excluir registros ausentes
    for (const id of existingRecordIds) {
      if (!dataFromAPI.some((item) => item.id === id)) {
        // O registro não existe na resposta da API, então vamos excluí-lo do banco de dados
        await connection.execute("DELETE FROM stakeholder WHERE id = ?", [id]);
        console.log(`Registro com ID ${id} foi excluído.`);
      }
    }

    console.log("Conclusão da verificação e exclusão de registros ausentes.");
  } catch (error) {
    console.error("Erro ao verificar e excluir registros ausentes:", error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados
  }
}

(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI();
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI);
      await excluirRegistrosAusentesNoBancoDeDados(dadosDaAPI);
    }
  } catch (error) {
    console.error("Erro no processo:", error);
  }
})();
