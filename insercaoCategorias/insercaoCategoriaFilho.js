const mysql = require('mysql2/promise')

const dbConfig = require('../informacoesBanco/informacoesBancoDeDados')
const apitoken = require('../../../informacoesAPI/villaggio')

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/categories?apitoken=${apitoken}`

  try {
    const data = await (await fetch(apiUrl)).json()
    return data.items || []
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error)
    return []
  }
}

// Função para inserir os dados no banco de dados
async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig)
  let [atualizadas, inseridas] = [0, 0]

  try {
    for (const item of data) {
      const [existe] = await connection.execute(
        'SELECT * FROM childCategory WHERE idChild = ?',
        [item.id]
      )

      const query =
        existe.length > 0
          ? 'UPDATE childCategory SET id = ?, name = ?, referenceCode = ?, type = ?, subgroupId = ?, subgroupName = ?, groupType = ?, referenceCodeKey = ? WHERE idChild = ?'
          : 'INSERT INTO childCategory (id, idChild, name, referenceCode, type, subgroupId, subgroupName, groupType, referenceCodeKey, codDRE, tipoCategoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'

      const params =
        existe.length > 0
          ? [
              item.order || null,
              item.name,
              item.referenceCode || null,
              item.type,
              item.subgroupId || null,
              item.subgroupName || null,
              item.groupType,
              item.group.id,
              item.id
            ]
          : [
              item.order || null,
              item.id,
              item.name,
              item.referenceCode || null,
              item.type,
              item.subgroupId || null,
              item.subgroupName || null,
              item.groupType,
              item.group.id,
              null,
              null
            ]

      const [result] = await connection.execute(query, params)

      existe.length > 0
        ? (atualizadas += result.changedRows)
        : (inseridas += result.affectedRows)
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

// Função para deletar dados que não existem mais na API
async function deletarDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig)

  try {
    const idsNaAPI = new Set(data.map(item => item.id))
    const registrosNoBanco = (
      await connection.execute('SELECT idChild FROM childCategory')
    )[0]

    // Iterar sobre os registros do banco de dados e excluir se o ID não estiver na API
    for (const { idChild } of registrosNoBanco) {
      if (!idsNaAPI.has(idChild)) {
        await connection.execute(
          'DELETE FROM childCategory WHERE idChild = ?',
          [idChild]
        )
        console.log(`Registro com idChild ${idChild.id} foi excluído.`)
      }
    }
  } catch (error) {
    console.error('Erro ao deletar dados no banco de dados:', error)
  } finally {
    connection.end()
  }
}

async function atualizarTipoCategoria() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    const [registros] = await connection.execute('SELECT * FROM childCategory')

    for (const registro of registros) {
      const novoTipoCategoria =
        registro.type === 'in' ? 2 : registro.type === 'out' ? 3 : null

      if (novoTipoCategoria !== null) {
        await connection.execute(
          'UPDATE childCategory SET tipoCategoria = ? WHERE idChild = ?',
          [novoTipoCategoria, registro.idChild]
        )
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar tipoCategoria:', error)
  } finally {
    connection.end()
  }
}

async function atualizarTipoCategoriaPorReferenceCodeKey() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    // Mapeia os referenceCodeKey para os respectivos tipoCategoria
    const referenciaTipoCategoriaMap = {
      '21d8a730-4bc1-4ce9-b878-bee19b659d5e': 1,
      '5e1f29e5-a12a-4ba9-9e66-8b0b8384ce09': 2,
      '29f70df2-0ac2-47ac-b2d7-402df781139a': 4,
      'ffcb3520-f4d6-45ee-97f0-644eb60896b5': 7,
      'ddfca14f-e90f-48da-91bb-f9f8ccceb90f': 6
    }

    const [registros] = await connection.execute('SELECT * FROM childCategory')

    for (const registro of registros) {
      const novoTipoCategoria =
        referenciaTipoCategoriaMap[registro.referenceCodeKey]

      if (novoTipoCategoria !== undefined) {
        await connection.execute(
          'UPDATE childCategory SET codDRE = ? WHERE idChild = ?',
          [novoTipoCategoria, registro.idChild]
        )
      }
    }
  } catch (error) {
    console.error(
      'Erro ao atualizar tipoCategoria por referenceCodeKey:',
      error
    )
  } finally {
    connection.end()
  }
}

async function teste(){
  const connection = await mysql.createConnection(dbConfig)
  const valores = [
    'Consultoria e compatibilização de projetos',
    'Custo manutenção terreno',
    'Orçamento',
    'Comercial Distribution Fee',
    'Despesas cartórarias',
    'Honorário advocatícios',
    'Despesas Financeiras'
  ];
  
  try {
    // Executar a consulta para selecionar as linhas
    const [rows, fields] = await connection.execute(`SELECT * FROM childCategory WHERE name IN (${valores.map(val => `'${val}'`).join(',')})`);
    
    // Iterar sobre os resultados
    for (const row of rows) {
      // Verificar cada nome e atualizar o ID correspondente
      if (row.name == "Consultoria e compatibilização de projetos") 
        await connection.execute(`UPDATE childCategory SET id = 76 WHERE name = ?`, [row.name]);
      else if (row.name == "Custo manutenção terreno")
        await connection.execute(`UPDATE childCategory SET id = 77 WHERE name = ?`, [row.name]);
      else if (row.name == "Orçamento")
        await connection.execute(`UPDATE childCategory SET id = 78 WHERE name = ?`, [row.name]);
      else if (row.name == "Comercial Distribution Fee")
        await connection.execute(`UPDATE childCategory SET id = 79 WHERE name = ?`, [row.name]);
      else if (row.name == "Despesas cartórarias")
        await connection.execute(`UPDATE childCategory SET id = 80 WHERE name = ?`, [row.name]);
      else if (row.name == "Honorário advocatícios")
        await connection.execute(`UPDATE childCategory SET id = 81 WHERE name = ?`, [row.name]);
      else if (row.name == "Despesas Financeiras")
        await connection.execute(`UPDATE childCategory SET id = 82 WHERE name = ?`, [row.name]);
    }
    console.log('\nAtualização concluída com sucesso.');
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
  } finally {
    // Fechar conexão com o banco de dados
    connection.end();
  }
}

// Executa o processo
;(async () => {
  try {
    const dadosDaAPI = await buscarDadosDaAPI()
    if (dadosDaAPI.length > 0) {
      await inserirDadosNoBancoDeDados(dadosDaAPI)
      await deletarDadosNoBancoDeDados(dadosDaAPI)
      await atualizarTipoCategoria()
      await atualizarTipoCategoriaPorReferenceCodeKey()
      await teste()
    }
  } catch (error) {
    console.error('Erro no processo:', error)
  }
})()
