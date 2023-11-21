const mysql = require("mysql2/promise");

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados");
const apitoken = require("../informacoesAPI/informacoes");

async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?apitoken=${apitoken}`;

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
        `SELECT * FROM paymentsReceivable id WHERE id = ?`,
        [item.categories[0].id]
      );

      const query =
        existe.length > 0
          ? `UPDATE paymentsReceivable SET categoryId = ?, categoryName = ?, value = ?, type = ?, parent = ?, parentId = ?, scheduleId = ?, typeOperation = ?, isEntry = ?, isBill = ?,
          isDebiteNote = ?, isFlagged = ?, isDued = ?, dueDate = ?, accrualDate = ?, scheduleDate = ?, createDate = ?, isPaid = ?, costCenterValueType = ?, paidValue = ?,
          openValue = ?, stakeholderId = ?, stakeholderType = ?, stakeholderName = ?, stakeholderIsDeleted = ?, description = ?, reference = ?, hasInstallment = ?, installmentId = ?,
          hasRecurrence = ?, hasOpenEntryPromise = ?, hasEntryPromise = ?, autoGenerateEntryPromise = ?, hasInvoice = ?, hasPendingInvoice = ?, hasScheduleInvoice = ?,
          autoGenerateNfseType = ?, isPaymentScheduled = ? WHERE id = ?`
          : `INSERT INTO paymentsReceivable (id, categoryId, categoryName, value, type, parent, parentId, scheduleId, typeOperation, isEntry, isBill, isDebiteNote, isFlagged,
            isDued, dueDate, accrualDate, scheduleDate, createDate, isPaid, costCenterValueType, paidValue, openValue, stakeholderId, stakeholderType, stakeholderName,
            stakeholderIsDeleted, description, reference, hasInstallment, installmentId, hasRecurrence, hasOpenEntryPromise, hasEntryPromise, autoGenerateEntryPromise,
            hasInvoice, hasPendingInvoice, hasScheduleInvoice, autoGenerateNfseType, isPaymentScheduled) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const params =
        existe.length > 0
          ? [
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
          : [item.categories[0].id || null,
             item.categories[0].categoryId || null,
             item.categories[0].categoryName || null,
             item.categories[0].value || null,
             item.categories[0].type || null,
             item.categories[0].parent || null,
             item.categories[0].parentId || null,
             item.scheduleId || null,
             item.type || null,
             item.isEntry || null,
             item.isBill || null,
             item.DebitNote || null,
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
             item.isPaymentScheduled || null
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

// Função para deletar dados que não existem mais na API
async function deletarDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const idsNoBanco = new Set(data.map((item) => item.scheduleId));
    const registrosNoBanco = (
      await connection.execute("SELECT scheduleId FROM paymentsReceivable")
    )[0];

    for (const { scheduleId } of registrosNoBanco) {
      if (!idsNoBanco.has(scheduleId)) {
        await connection.execute(
          "DELETE FROM paymentsReceivable WHERE scheduleId = ?",
          [scheduleId]
        );
        console.log(`Registro com idChild ${idChild.id} foi excluído.`);
      }
    }
  } catch (error) {
    console.error("Erro ao deletar dados no banco de dados:", error);
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
      await deletarDadosNoBancoDeDados(dadosDaAPI);
    }
  } catch (error) {
    console.error("Erro no processo:", error);
  }
})();