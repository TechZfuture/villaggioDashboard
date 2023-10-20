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
    const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?apitoken=${apiToken}`;
  
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
          `SELECT * FROM payments_receivable id WHERE id = ?`,
          [item.scheduleId]
        );
  
        if (existe.length > 0) {
          await connection.execute(
            `UPDATE payments_receivable SET category_id = ?, category_name = ?, value = ?, type = ?, parent = ?, parent_id = ?, schedule_id = ?, type_operation = ?, is_entry = ?, is_bill = ?,
            is_debite_node = ?, is_flagged = ?, is_dued = ?, due_date = ?, accrual_date = ?, schedule_date = ?, create_date = ?, is_paid = ?, cost_center_value_type = ?, paid_value = ?,
            open_value = ?, stakeholder_id = ?, stakeholder_type = ?, stakeholder_name = ?, stakeholder_is_deleted = ?, description = ?, reference = ?, has_installment = ?, installment_id = ?,
            has_recurrence = ?, has_open_entry_promise = ?, has_entry_promise = ?, auto_generate_entry_promise = ?, has_invoice = ?, has_pending_invoice = ?, has_schedule_invoice = ?,
            auto_generate_nfse_type = ?, is_payment_scheduled = ? WHERE id = ?`,
            [
              item.category.id || null,
              item.category.name || null,
              item.value || null,
              item.category.type || null,
              item.categories[0].parent || null,
              item.categories[0].parentId || null,
              item.scheduleId || null,
              item.type || null,
              item.isEntry || null,
              item.isBill || null,
              item.isDebitNote || null,
              item.isFlagged || null,
              item.isDued || null,
              item.dueDate || null,
              item.accrualDate || null,
              item.scheduleDate || null,
              item.createDate || null,
              item.isPaid || null,
              item.costCenterValueType || null,
              item.paidValue || null,
              item.openValue || null,
              item.stakeholder.id || null,
              item.stakeholder.type || null,
              item.stakeholder.name || null,
              item.stakeholder.isDeleted || null,
              item.description || null,
              item.reference || null,
              item.hasInstallment || null,
              item.installmentId || null,
              item.hasRecurrence || null,
              item.hasOpenEntryPromise || null,
              item.hasEntryPromise || null,
              item.autoGenerateEntryPromise || null,
              item.hasInvoice || null,
              item.hasPendingInvoice || null,
              item.hasScheduleInvoice || null,
              item.autoGenerateNFSeType || null,
              item.isPaymentScheduled || null,
              item.scheduledId || null,
            ]
          );
        } else {
          const query = `INSERT INTO payments_receivable (id, category_id, category_name, value, type, parent, parent_id, schedule_id, type_operation, is_entry, is_bill, is_debite_node, is_flagged,
            is_dued, due_date, accrual_date, schedule_date, create_date, is_paid, cost_center_value_type, paid_value, open_value, stakeholder_id, stakeholder_type, stakeholder_name,
            stakeholder_is_deleted, description, reference, has_installment, installment_id, has_recurrence, has_open_entry_promise, has_entry_promise, auto_generate_entry_promise,
            has_invoice, has_pending_invoice, has_schedule_invoice, auto_generate_nfse_type, is_payment_scheduled) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          await connection.query(query, 
            [
              item.scheduleId || null,
              item.category.id || null,
              item.category.name || null,
              item.value || null,
              item.category.type || null,
              item.categories[0].parent || null,
              item.categories[0].parentId || null,
              item.scheduleId || null,
              item.type || null,
              item.isEntry,
              item.isBill,
              item.isDebitNote,
              item.isFlagged,
              item.isDued,
              item.dueDate || null,
              item.accrualDate || null,
              item.scheduleDate || null,
              item.createDate || null,
              item.isPaid,
              item.costCenterValueType,
              item.paidValue,
              item.openValue || null,
              item.stakeholder.id || null,
              item.stakeholder.type || null,
              item.stakeholder.name || null,
              item.stakeholder.isDeleted,
              item.description || null,
              item.reference,
              item.hasInstallment,
              item.installmentId,
              item.hasRecurrence,
              item.hasOpenEntryPromise,
              item.hasEntryPromise,
              item.autoGenerateEntryPromise,
              item.hasInvoice,
              item.hasPendingInvoice,
              item.hasScheduleInvoice,
              item.autoGenerateNFSeType,
              item.isPaymentScheduled,
              item.id || null
            ]
            );
        }
      }
  
      console.log("Dados inseridos no banco de dados com sucesso.");
    } catch (error) {
      console.error("Erro ao inserir dados no banco de dados:", error);
    } finally {
      connection.end(); // Feche a conexão com o banco de dados
    }
  }

  // Executa o processo
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
