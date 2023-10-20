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
        const [existe] = await connection.execute(
          "SELECT * FROM bills_received WHERE entry_id = ?",
          [item.entryId]
        );
  
        if (existe.length > 0) {         
            await connection.execute(`UPDATE bills_received SET bank_balance_date_is_greater_than_entry_date = ?, is_virtual = ?, account_id = ?, account_name = ?
            , account_is_deleted = ?, category_id_bills_received = ?, category_id = ?, category_name = ?, value = ?, type = ?, parent = ?, parent_id = ?, date = ?, indentifier = ?,
            check_number = ?, is_reconciliated = ?, is_transfer = ?, is_flagged = ?, cost_center_id = ?, cost_center_percent = ?, cost_center_value = ?, cost_center_description = ?
             WHERE entry_id = ?`, [
              item.bankBalanceDateIsGreaterThanEntryDate,
              item.scheduleId,
              item.isVirtual,
              item.account.id,
              item.account.name,
              item.account.isDeleted,
              item.categories.id,
              item.categories.categoryId,
              item.categories.categoryName,
              item.value,
              item.categories.type,
              item.categories.parent,
              item.categories.parentId,
              item.date,
              item.identifier,
              item.checkNum,
              item.isReconciliated,
              item.isTransfer,
              item.isFlagged,
              item.costCenters.costCenterId,
              item.costCenters.percent,
              item.costCenters.value,
              item.costCenters.costCenterDescription,
              item.entryId,         
            ]);    
        } else {
          const query =
            `INSERT INTO bills_received (entry_id, bank_balance_date_is_greater_than_entry_date, schedule_id, is_virtual, account_id, 
                account_name, account_is_deleted, category_id, category_name, 
                value, type, parent, parent_id, date, indentifier, check_number, is_reconciliated, is_transfer, is_flagged, cost_center_id, cost_center_percent, 
                cost_center_value, cost_center_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          await connection.query(query, [
            item.entryId || null,
            item.bankBalanceDateIsGreaterThanEntryDate || null,
            item.scheduleId || null,
            item.isVirtual || null,
            item.account.id || null,
            item.account.name || null,
            item.account.isDeleted || null,
            item.category.id || null,
            item.category.name || null,
            item.value || null,
            item.category.type || null,
            item.categories.parent || null,
            item.categories.parentId || null,
            item.date || null,
            item.identifier || null,
            item.checkNum || null,
            item.isReconciliated || null,
            item.isTransfer || null,
            item.isFlagged || null,
            item.costCenters.costCenterId || null,
            item.costCenters.percent || null,
            item.costCenters.value || null,
            item.costCenters.costCenterDescription || null  
          ]);
        }
      }
  
      console.log("Dados inseridos no banco de dados com sucesso.");
    } catch (error) {
      console.error("Erro ao inserir dados no banco de dados:", error);
    } finally {
      connection.end(); // Feche a conexão com o banco de dados
    }
  }

  (async () => {
    try {
      const dadosDaAPI = await buscarDadosDaAPI();
      if (dadosDaAPI.length > 0) {
        await inserirDadosNoBancoDeDados(dadosDaAPI);
      }
    } catch (error) {
      console.error("Erro no processo:", error);
    }
  })();