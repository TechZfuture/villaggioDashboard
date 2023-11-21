const mysql = require("mysql2/promise");

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados");
const apitoken = require("../informacoesAPI/informacoes");

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/debit?apitoken=${apitoken}`;

  try {
    const data = await (await fetch(apiUrl)).json();
    return data.items || [];
  } catch (error) {
    console.error("Erro ao buscar dados da API:", error);
    return [];
  }
}

// Função para inserir os dados no banco de dados
async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);
  let [atualizadas, inseridas] = [0, 0];

  try {
    for (const item of data) {
      const [existe] = await connection.execute(
        "SELECT * FROM scheduledPayments WHERE scheduleId = ?",
        [item.scheduleId]
      );

      const query =
        existe.length > 0
          ? `UPDATE scheduledPayments SET categoryId = ?, categoryName = ?, categoryType = ?, categoryParentId = ?, categoryParentName = ?, costCenterId = ?, costCenterName = ?, costCenterPercent = ?
            , type = ?, isEntry = ?, isBill = ?, isDebitNote = ?, isFlagged = ?, isDued = ?, dueDate = ?, accrualDate = ?, scheduleDate = ?, deleteDate = ?, createDate = ?, value = ?, isPaid = ?,
             costCenterValueType = ?, paidValue = ?, openValue = ?, stakeholderType = ?, stakeholderId = ?, stakeholderName = ?, stakeholderIsDeleted = ?, description = ?, hasInstallment = ?,
              installmentId = ?, hasRecurrence = ?, hasOpenEntryPromise = ?, hasEntryPromise = ?, autoGenerateEntryPromise = ?, hasInvoice = ?,
            hasPendingInvoice = ?, hasScheduleInvoice = ?, autoGenerateNfseType = ?, isPaymentScheduled = ? where scheduleId = ?`
          : `INSERT INTO scheduledPayments (scheduleId, categoryId, categoryName, categoryType, categoryParentId, categoryParentName, costCenterId, costCenterName, costCenterPercent, type,
                isEntry, isBill, isDebitNote, isFlagged, isDued, dueDate, accrualDate, scheduleDate, deleteDate, createDate, value, isPaid, costCenterValueType, paidValue, openValue, stakeholderType, stakeholderId, stakeholderName,
                stakeholderIsDeleted, description, hasInstallment, installmentId, hasRecurrence, hasOpenEntryPromise, hasEntryPromise, autoGenerateEntryPromise, hasInvoice,
                hasPendingInvoice, hasScheduleInvoice, autoGenerateNfseType, isPaymentScheduled) 
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

      const params =
        existe.length > 0
          ? [
              item.categories[0].categoryId,
              item.categories[0].categoryName,
              item.categories[0].type,
              item.categories[0].parentId,
              item.categories[0].parent,
              item.costCenters[0]?.costCenterId ?? null,
              item.costCenters[0]?.costCenterDescription ?? null,
              item.costCenters[0]?.percent ?? null,
              item.type || null,
              item.isEntry || null,
              item.isBill || null,
              item.isDebitNote || null,
              item.isFlagged || null,
              item.isDued || null,
              item.dueDate || null,
              item.accrualDate || null,
              item.scheduleDate || null,
              item.deleteDate || null,
              item.createDate || null,
              item.value || null,
              item.isPaid || null,
              item.costCenterValueType || null,
              item.paidValue || null,
              item.openValue || null,
              item.stakeholder.type || null,
              item.stakeholder.id || null,
              item.stakeholder.name || null,
              item.stakeholder.isDeleted || null,
              item.description || null,
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
              item.scheduleId || null,
            ]
          : [
              item.scheduleId || null,
              item.categories[0].categoryId,
              item.categories[0].categoryName,
              item.categories[0].type,
              item.categories[0].parentId,
              item.categories[0].parent,
              item.costCenters[0]?.costCenterId ?? null,
              item.costCenters[0]?.costCenterDescription ?? null,
              item.costCenters[0]?.percent ?? null,
              item.type || null,
              item.isEntry || null,
              item.isBill || null,
              item.isDebitNote || null,
              item.isFlagged || null,
              item.isDued || null,
              item.dueDate || null,
              item.accrualDate || null,
              item.scheduleDate || null,
              item.deleteDate || null,
              item.createDate || null,
              item.value || null,
              item.isPaid || null,
              item.costCenterValueType || null,
              item.paidValue || null,
              item.openValue || null,
              item.stakeholder.type || null,
              item.stakeholder.id || null,
              item.stakeholder.name || null,
              item.stakeholder.isDeleted || null,
              item.description || null,
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
            ];

      const [result] = await connection.execute(query, params);

      existe.length > 0
        ? (atualizadas += result.changedRows)
        : (inseridas += result.affectedRows);
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

// Função para excluir registros que não existem na API
async function deletarDadosNoBancoDeDados(data) {
    const pool = await mysql.createPool(dbConfig);
    let excluidas = 0;

    try {
        const existingRecordIds = new Set(data.map((item) => String(item.scheduleId)));
        const [registrosNoBanco] = await pool.execute("SELECT scheduleId FROM scheduledPayments WHERE deleteDate IS NOT NULL");

        for (const { scheduleId } of registrosNoBanco) {
            if (existingRecordIds.has(String(scheduleId))) {
                await pool.execute(
                    "DELETE FROM scheduledPayments WHERE scheduleId = ?",
                    [scheduleId]
                );
                excluidas++;
            }
        }
        console.log(`\n${excluidas} pagamentos foram excluídos no NIBO !!`);
    } catch (error) {
        console.error("Erro ao verificar e excluir registros ausentes:", error);
    } finally {
        pool.end(); // O pool é encerrado, liberando a conexão para ser reutilizada
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
