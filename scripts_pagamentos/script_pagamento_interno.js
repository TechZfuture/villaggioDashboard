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
  
        if (item.isTransfer === true) {
  
          const [existe] = await connection.execute(
            "SELECT * FROM internal_payments WHERE entry_id = ?",
            [item.entryId]
          );
  
          if (existe.length > 0) {
            await connection.execute(`UPDATE internal_payments SET bank_balance_date_is_greater_than_entry_date = ?, is_virtual = ?, account_id = ?, account_name = ?, account_is_deleted = ?, date = ?, identifier = ?, value = ?, is_reconciliated = ?,
            is_transfer = ?, is_flagged = ? 
               WHERE entry_id = ?`, [        
                item.bankBalanceDateIsGreaterThanEntryDate,
                item.isVirtual,
                item.account.id || null,
                item.account.name || null,
                item.account.isDeleted,
                item.date || null,
                item.identifier || null,
                item.value || null,
                item.isReconciliated,
                item.isTransfer,
                item.isFlagged,
                item.entryId || null
            ]);
          } else {
            const query =
              `INSERT INTO internal_payments (entry_id, bank_balance_date_is_greater_than_entry_date, is_virtual, account_id, account_name, account_is_deleted, date, identifier, value, is_reconciliated, is_transfer, is_flagged) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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