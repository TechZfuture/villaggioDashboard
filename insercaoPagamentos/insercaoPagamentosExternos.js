const mysql = require('mysql2/promise')
const moment = require('moment')

const dbConfig = require('../informacoesBanco/informacoesBancoDeDados')
const apitoken = require('../../../informacoesAPI/villaggio')

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/payments?apitoken=${apitoken}`

  try {
    const data = await (await fetch(apiUrl)).json()
    return data.items || []
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error)
    return []
  }
}

function formatarDataParaMySQL(data) {
  return moment(data).format('YYYY-MM-DD HH:mm:ss')
}

// Função para inserir os dados no banco de dados
async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig)
  let [atualizadas, inseridas] = [0, 0]

  try {
    for (const item of data) {
      if (item.isTransfer === false) {
        const [existe] = await connection.execute(
          'SELECT * FROM externalPayments WHERE entryId = ?',
          [item.entryId]
        )

        const query =
          existe.length > 0
            ? `UPDATE externalPayments SET bankBalanceDateIsGreaterThanEntryDate = ?,
        scheduleId = ?, isVirtual = ?, accountid = ?, accountname = ?, accountisdeleted = ?, stakeholderid = ?,
        stakeholderName = ?, stakeholderIsDeleted = ?, categoryId = ?, categoryName = ?, categoryIsDeleted = ?, categoryType = ?, categoryParentId = ?, categoryParentName = ?,
        date = ?, identifier = ?, value = ?, description = ?, checkNumber = ?, isReconciliated = ?, isTransfer = ?, isFlagged = ?, costCenterId = ?, costCenterName = ?, costCenterPercent = ?, costCenterValue = ? where entryId = ?`
            : `INSERT INTO externalPayments (entryId, bankBalanceDateIsGreaterThanEntryDate,
              scheduleId, isVirtual, accountid, accountname, accountisdeleted, stakeholderid, stakeholderName, stakeholderIsDeleted, categoryId, categoryName, categoryIsDeleted, categoryType, categoryParentId, categoryParentName,
              date, identifier, value, description, checkNumber, isReconciliated, isTransfer, isFlagged, costCenterId, costCenterName, costCenterPercent, costCenterValue, negativo, status, recebidoPago) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

        const params =
          existe.length > 0
            ? [
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
                formatarDataParaMySQL(item.date) || null,
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
                item.entryId
              ]
            : [
                item.entryId || null,
                item.bankBalanceDateIsGreaterThanEntryDate || null,
                item.scheduleId || null,
                item.isVirtual || null,
                item.account.id || null,
                item.account.name || null,
                item.account.isDeleted || null,
                item.stakeholder.id || null,
                item.stakeholder.name || null,
                item.stakeholder.isDeleted || null,
                item.category.id || null,
                item.category.name || null,
                item.category.isDeleted || null,
                item.category.type || null,
                item.categories[0].parentId || null,
                item.categories[0].parent || null,
                formatarDataParaMySQL(item.date) || null,
                item.identifier || null,
                item.value || null,
                item.description || null,
                item.checkNum || null,
                item.isReconciliated || null,
                item.isTransfer || null,
                item.isFlagged || null,
                item.costCenter?.costCenterId || null,
                item.costCenter?.costCenterDescription || null,
                item.costCenters[0]?.percent || null,
                item.costCenters[0]?.value || null,
                null,
                null,
                null
              ]

        const [result] = await connection.execute(query, params)

        existe.length > 0
          ? (atualizadas += result.changedRows)
          : (inseridas += result.affectedRows)
      }
    }
    console.log(
      `\n${atualizadas} consultas atualizadas no banco de dados.\n${inseridas} consultas inseridas no banco de dados.`
    )
  } catch (error) {
    console.error('Erro ao inserir dados no banco de dados:', error)
  } finally {
    connection.end() // Feche a conexão com o banco de dados
  }
}

// Função para excluir registros que não existem na API
async function deletarDadosNaoPresentesNaAPI(data) {
  const connection = await mysql.createConnection(dbConfig)
  let excluidas = 0

  try {
    // Busque todos os registros no banco de dados
    const [dbData] = await connection.execute(
      'SELECT entryId FROM externalPayments'
    )

    // Crie um conjunto (Set) com os entry_ids dos registros no banco de dados
    const dbDataEntryIds = new Set(dbData.map(item => item.entryId))

    // Crie um conjunto (Set) com os entry_ids dos registros da API
    const apiDataEntryIds = new Set(data.map(item => item.entryId))

    // Encontre os entry_ids que estão no banco de dados, mas não na API
    const entryIdsToDelete = [...dbDataEntryIds].filter(
      entryId => !apiDataEntryIds.has(entryId)
    )

    // Deletar os registros que não existem mais na API
    for (const entryIdToDelete of entryIdsToDelete) {
      await connection.execute(
        'DELETE FROM externalPayments WHERE entryId = ?',
        [entryIdToDelete]
      )
      excluidas++
    }

    console.log(`${excluidas} => Pagamentos excluidos !`)
  } catch (error) {
    console.error('Erro ao deletar dados do banco de dados:', error)
  } finally {
    connection.end() // Feche a conexão com o banco de dados
  }
}

// Função para inserir o valor 'false' na coluna 'negativo' para todos os elementos
async function inserirNegativoEmTodosElementos() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    await connection.execute('UPDATE externalPayments SET negativo = ?', [true])
  } catch (error) {
    console.error('Erro ao inserir valor "false" na coluna "negativo":', error)
  } finally {
    connection.end() // Feche a conexão com o banco de dados
  }
}

async function inserirColunaPagoOuNaoPago(data){
  const connection = await mysql.createConnection(dbConfig)

  try {
    // Atualiza o status com base na diferença entre openValue e paidValue
    const query = `
      UPDATE externalPayments
      SET status = 'Realizados'
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
      UPDATE externalPayments
      SET valorCorreto = value
    `
    await connection.execute(query)
  } catch (error) {
    console.error('Erro ao inserir valor na coluna "status":', error)
  } finally {
    connection.end() // Fecha a conexão com o banco de dados
  }
}

async function inserirPagamentos(data){
  const connection = await mysql.createConnection(dbConfig)

  try {
    // Atualiza o status com base na diferença entre openValue e paidValue
    const query = `
      UPDATE externalPayments
      SET recebidoPago = 'Pagamentos'
    `
    await connection.execute(query)
  } catch (error) {
    console.error('Erro ao inserir valor na coluna "status":', error)
  } finally {
    connection.end() // Fecha a conexão com o banco de dados
  }
}

;(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI()
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI)
      await deletarDadosNaoPresentesNaAPI(dadosDaAPI)
      await inserirNegativoEmTodosElementos()
      await inserirColunaPagoOuNaoPago()
      await inserirValorCorreto()
      await inserirPagamentos()
    }
  } catch (error) {
    console.error('Erro no processo:', error)
  }
})()
