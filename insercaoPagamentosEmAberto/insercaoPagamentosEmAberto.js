const mysql = require("mysql2/promise"); // Módulo para interagir com o banco de dados
const moment = require("moment"); // Módulo para manipulação de datas

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados"); // Importo as informações do banco
const apitoken = require("../informacoesAPI/informacoes"); // Importa a chave API



async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/debit/opened?apitoken=${apitoken}`;

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

async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);
  let [atualizadas, inseridas] = [0, 0];

  try {
    for (const item of data) {
      
      const [existe] = await connection.execute(
        "SELECT * FROM openPayments WHERE id = ?",
        [item.categories[0].id]
      );

      const query =
        existe.length > 0
          ? `UPDATE openPayments SET categoryId = ?, categoryName = ?, value = ?, type = ?, parent = ?, parentId = ?, scheduleId = ?, typeOperation = ?, isEntry = ?, isBill = ?, isDebiteNote = ?,
                isFlagged = ?, isDued = ?, dueDate = ?, accrualDate = ?, scheduleDate = ?, createDate = ?, isPaid = ?, costCenterValueType = ?, paidValue = ?, openValue = ?, stakeholderId = ?, stakeholderType = ?,
                stakeholderName = ?, stakeholderIsDeleted = ?, description = ?, reference = ?, hasInstallment = ?, hasRecurrence = ?,
                hasOpenEntryPromise = ?, autoGenerateEntryPromise = ?, hasInvoice = ?, hasPendingInvoice = ?, hasScheduleInvoice = ?, autoGenerateNfseType = ?, isPaymentScheduled = ?
                 WHERE id = ?`
          : `INSERT INTO openPayments (id, categoryId, categoryName, value, type, parent, parentId, scheduleId, typeOperation, isEntry, isBill, isDebiteNote, isFlagged, isDued, dueDate,
                accrualDate, scheduleDate, createDate, isPaid, costCenterValueType, paidValue, openValue, stakeholderId, stakeholderType, stakeholderName, stakeholderIsDeleted, 
                description, reference, hasInstallment, hasRecurrence, hasOpenEntryPromise, autoGenerateEntryPromise, hasInvoice, hasPendingInvoice, hasScheduleInvoice,
                autoGenerateNfseType, isPaymentScheduled, status, valorCorreto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) `;

      const params =
        existe.length > 0
          ? [
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
              item.isDebitNote || null,
              item.isFlagged || null,
              item.isDued || null,
              formatarDataParaMySQL(item.dueDate) || null,
              formatarDataParaMySQL(item.accrualDate) || null,
              formatarDataParaMySQL(item.scheduleDate) || null,
              formatarDataParaMySQL(item.createDate) || null,
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
              item.hasRecurrence || null,
              item.hasOpenEntryPromise || null,
              item.autoGenerateEntryPromise || null,
              item.hasInvoice || null,
              item.hasPendingInvoice || null,
              item.hasScheduleInvoice || null,
              item.autoGenerateNFSeType || null,
              item.isPaymentScheduled || null,
              item.categories[0].id || null,
            ]
          : [
              item.categories[0].id || null,
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
              item.isDebitNote || null,
              item.isFlagged || null,
              item.isDued || null,
              formatarDataParaMySQL(item.dueDate) || null,
              formatarDataParaMySQL(item.accrualDate) || null,
              formatarDataParaMySQL(item.scheduleDate) || null,
              formatarDataParaMySQL(item.createDate) || null,
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
              item.hasRecurrence || null,
              item.hasOpenEntryPromise || null,
              item.autoGenerateEntryPromise || null,
              item.hasInvoice || null,
              item.hasPendingInvoice || null,
              item.hasScheduleInvoice || null,
              item.autoGenerateNFSeType || null,
              item.isPaymentScheduled || null,
              null,
              null
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
    const idsNoBanco = new Set(data.map((item) => item.categories[0].id));
    const registrosNoBanco = (
      await connection.execute("SELECT id FROM openPayments")
    )[0];

    for (const { id } of registrosNoBanco) {
      if (!idsNoBanco.has(id)) {
        await connection.execute("DELETE FROM openPayments WHERE id = ?", [id]);
        console.log(`Registro com id ${id.id} foi excluído.`);
      }
    }
  } catch (error) {
    console.error("Erro ao deletar dados no banco de dados:", error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados
  }
}

async function inserirColunaPagoOuNaoPago(data){
  const connection = await mysql.createConnection(dbConfig)

  try {
    // Atualiza o status com base na diferença entre openValue e paidValue
    const query = `
      UPDATE openPayments
      SET status = "A realizar"
    `
    await connection.execute(query)
  } catch (error) {
    console.error('Erro ao inserir valor na coluna "status":', error)
  } finally {
    connection.end() // Fecha a conexão com o banco de dados
  }
}

async function inserirValorCorreto(data){
  const connection = await mysql.createConnection(dbConfig)

  try {
    // Atualiza o status com base na diferença entre openValue e paidValue
    const query = `
      UPDATE openPayments
      SET valorCorreto = CASE
      WHEN paidValue IS NOT NULL THEN value + paidValue
      ELSE value
      END;
    `
    await connection.execute(query)
  } catch (error) {
    console.error('Erro ao inserir valor na coluna "status":', error)
  } finally {
    connection.end() // Fecha a conexão com o banco de dados
  }
}

// Executa o processo
(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI();
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI);
      await deletarDadosNoBancoDeDados(dadosDaAPI);
      await inserirColunaPagoOuNaoPago()
      await inserirValorCorreto()
    }
  } catch (error) {
    console.error("Erro no processo:", error);
  }
})();
