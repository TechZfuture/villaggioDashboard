const mysql = require("mysql2/promise");

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados");
const apitoken = require("../informacoesAPI/informacoes");

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/debit/dued?apitoken=${apitoken}`;

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
        "SELECT * FROM pastDuePayments WHERE idPastDuePayment = ?",
        [item.categories[0].id]
      );

      const query =
        existe.length > 0
          ? `UPDATE pastDuePayments SET idCategory = ?, nameCategory = ?, typeCategory = ?, idParentCategory = ?, nameParentCategory = ?, idCostCenter = ?, percentCostCenter = ?, descriptionCostCenter = ?
        , costCenterIsDeleted = ?, idSchedule = ?, type = ?, isEntry = ?, isBill = ?, isDebitNote = ?, isFlagged = ?, isDued = ?, dueDate = ?, accrualDate = ?, scheduleDate = ?, createDate = ?, value = ?, isPaid = ?,
        costCenterValueType = ?, paidValue = ?, openValue = ?, idStakeholder = ?, nameStakeholder = ?, typeStakeholder = ?, stakeholderIsDeleted = ?, description = ?, reference = ?, hasInstallment = ?,
        idInstallment = ?, hasRecurrence = ?, hasOpenEntryPromise = ?, hasEntryPromise = ?, autoGenerateEntryPromise = ?, hasInvoice = ?,
        hasPendingInvoice = ?, hasScheduleInvoice = ?, autoGenerateNfseType = ?, isPaymentScheduled = ? where idPastDuePayment = ?`
          : `INSERT INTO pastDuePayments (idPastDuePayment, idCategory, nameCategory, typeCategory, idParentCategory, nameParentCategory, idCostCenter, percentCostCenter, descriptionCostCenter, costCenterIsDeleted, idSchedule, type,
            isEntry, isBill, isDebitNote, isFlagged, isDued, dueDate, accrualDate, scheduleDate, createDate, value, isPaid, costCenterValueType, paidValue, openValue, idStakeholder, nameStakeholder,
            typeStakeholder, stakeholderIsDeleted, description, reference, hasInstallment, idInstallment, hasRecurrence, hasOpenEntryPromise, hasEntryPromise, autoGenerateEntryPromise, hasInvoice,
            hasPendingInvoice, hasScheduleInvoice, autoGenerateNfseType, isPaymentScheduled) 
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

      const params =
        existe.length > 0
          ? [
              item.categories[0].categoryId || null,
              item.categories[0].categoryName || null,
              item.categories[0].type || null,
              item.categories[0].parentId || null,
              item.categories[0].parent || null,
              item.costCenters[0]?.costCenterId ?? null,
              item.costCenters[0]?.percent ?? null,
              item.costCenters[0]?.costCenterDescription ?? null,
              item.costCenter?.isDeleted ?? null,
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
              item.value || null,
              item.isPaid || null,
              item.costCenterValueType || null,
              item.paidValue || null,
              item.openValue || null,
              item.stakeholder.id || null,
              item.stakeholder.name || null,
              item.stakeholder.type || null,
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
              item.categories[0].id,
            ]
          : [
              item.categories[0].id,
              item.categories[0].categoryId || null,
              item.categories[0].categoryName || null,
              item.categories[0].type || null,
              item.categories[0].parentId || null,
              item.categories[0].parent || null,
              item.costCenters[0]?.costCenterId ?? null,
              item.costCenters[0]?.percent ?? null,
              item.costCenters[0]?.costCenterDescription ?? null,
              item.costCenter?.isDeleted ?? null,
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
              item.value || null,
              item.isPaid || null,
              item.costCenterValueType || null,
              item.paidValue || null,
              item.openValue || null,
              item.stakeholder.id || null,
              item.stakeholder.name || null,
              item.stakeholder.type || null,
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
  const connection = await mysql.createConnection(dbConfig);

  try {
    const existingRecordIds = new Set(data.map((item) => item.categories[0].id));
    const registrosNoBanco = (await connection.execute("SELECT idPastDuePayment FROM pastDuePayments"))[0];

    for (const { idPastDuePayment } of registrosNoBanco) {
      if (!existingRecordIds.has(idPastDuePayment)) {
        await connection.execute(
          "DELETE FROM pastDuePayments WHERE idPastDuePayment = ?",
          [idPastDuePayment]
        );
        console.log(`\nRegistro com ID ${id} foi excluído.`);
      }
    }
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
        await deletarDadosNoBancoDeDados(dadosDaAPI);
      }
    } catch (error) {
      console.error("Erro no processo:", error);
    }
  })();
