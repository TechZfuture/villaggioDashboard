const mysql = require('mysql2/promise')
const moment = require('moment')

const dbConfig = require('../informacoesBanco/informacoesBancoDeDados')
const apitoken = require('../informacoesAPI/informacoes')

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/receipts?apitoken=${apitoken}`

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
          'SELECT * FROM externalIncomingBills WHERE entryId = ?',
          [item.entryId]
        )

        const query =
          existe.length > 0
            ? `UPDATE externalIncomingBills SET bankBalanceDateIsGreaterThanEntryDate = ?,
        scheduleId = ?, isVirtual = ?, accountId = ?, accountName = ?, accountIsDeleted = ?, stakeholderId = ?,
        stakeholderName = ?, stakeholderIsDeleted = ?, categoryId = ?, categoryName = ?, categoryIsDeleted = ?, categoryType = ?, categoryParentId = ?, categoryParentName = ?,
        date = ?, identifier = ?, value = ?, description = ?, checkNumber = ?, isReconciliated = ?, isTransfer = ?, isFlagged = ?, costCenterId = ?, costCenterName = ?, costCenterPercent = ?, costCenterValue = ?
           WHERE entryId = ?`
            : `INSERT INTO externalIncomingBills (entryId, bankBalanceDateIsGreaterThanEntryDate,
          scheduleId, isVirtual, accountId, accountName, accountIsDeleted, stakeholderId,
           stakeholderName, stakeholderIsDeleted, categoryId, categoryName, categoryIsDeleted, categoryType, categoryParentId, categoryParentName,
           date, identifier, value, description, checkNumber, isReconciliated, isTransfer, isFlagged, costCenterId, costCenterName, costCenterPercent, costCenterValue, negativo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

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
                item.costCenter?.costCenterId ?? null,
                item.costCenter?.costCenterDescription ?? null,
                item.costCenters[0]?.percent ?? null,
                item.costCenters[0]?.value ?? null,
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
                item.costCenter?.costCenterId ?? null,
                item.costCenter?.costCenterDescription ?? null,
                item.costCenters[0]?.percent ?? null,
                item.costCenters[0]?.value ?? null,
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

// Função para deletar dados do banco de dados que não existem mais na API
async function deletarDadosNaoPresentesNaAPI(data) {
  const connection = await mysql.createConnection(dbConfig)
  let excluidas = 0

  try {
    // Busque todos os registros no banco de dados
    const [dbData] = await connection.execute(
      'SELECT entryId FROM externalIncomingBills'
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
        'DELETE FROM externalIncomingBills WHERE entryId = ?',
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
    await connection.execute('UPDATE externalIncomingBills SET negativo = ?', [
      false
    ])
  } catch (error) {
    console.error('Erro ao inserir valor "false" na coluna "negativo":', error)
  } finally {
    connection.end() // Feche a conexão com o banco de dados
  }
}

;(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI()
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI)
      await deletarDadosNaoPresentesNaAPI(dadosDaAPI)
      await inserirNegativoEmTodosElementos()
    }
  } catch (error) {
    console.error('Erro no processo:', error)
  }
})()
