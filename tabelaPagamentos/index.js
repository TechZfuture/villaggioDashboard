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
          "SELECT * FROM tabela_pagamentos WHERE id_entrada = ?",
          [item.entryId]
        );

        if (existe.length > 0) {
          await connection.execute(
            `UPDATE tabela_pagamentos SET id_conta_bancaria = ?, nome_conta_bancaria = ?, id_fornecedor = ?, nome_fornecedor = ?, id_categoria = ?, nome_categoria = ?, valor = ?,
             tipo = ?, categoria_pai = ?, id_categoria_pai = ?, descricao = ?, data = ?, category_type = ?, category_parent_id = ?, category_parent_name = ? data = ? where id_entrada = ?`,
            [
              item.entryId,
              item.account.id || null,
              item.account.name || null,
              item.stakeholder.id || null,
              item.stakeholder.name || null,
              item.category.id || null,
              item.category.name || null,
              item.value || null,
              item.category.type || null,
              item.categories[0].parent || null,
              item.categories[0].parentId || null,
              item.description || null,
              item.date || null,
              item.identifier || null,
              item.category.type || null,
            ]
          );
        } else {
          const query = `INSERT INTO tabela_pagamentos (id_entrada, id_conta_bancaria, nome_conta_bancaria, id_fornecedor, nome_fornecedor, id_categoria, nome_categoria, valor, 
            tipo, categoria_pai, id_categoria_pai, descricao, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

          await connection.query(query, [
            item.entryId,
            item.account.id || null,
            item.account.name || null,
            item.stakeholder.id || null,
            item.stakeholder.name || null,
            item.category.id || null,
            item.category.name || null,
            item.value || null,
            item.category.type || null,
            item.categories[0].parent || null,
            item.categories[0].parentId || null,
            item.description || null,
            item.date || null,
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

// Função para excluir registros que não existem na API
async function excluirRegistrosAusentesNoBancoDeDados(dataFromAPI) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Passo 1: Buscar todos os IDs no banco de dados
    const [existingRecords] = await connection.execute(
      "SELECT id_entrada FROM tabela_pagamentos"
    );

    // Extrair os IDs dos registros no banco de dados
    const existingRecordIds = existingRecords.map((record) => record.id);

    // Passo 2: Comparar os IDs com os IDs da API e excluir registros ausentes
    for (const id of existingRecordIds) {
      if (!dataFromAPI.some((item) => item.id_entrada === id)) {
        // O registro não existe na resposta da API, então vamos excluí-lo do banco de dados
        await connection.execute(
          "DELETE FROM tabela_pagamentos WHERE id_entrada = ?",
          [id]
        );
        console.log(`Registro com ID ${id} foi excluído.`);
      }
    }

    console.log("Conclusão da verificação e exclusão de registros ausentes.");
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
      await excluirRegistrosAusentesNoBancoDeDados(dadosDaAPI);
    }
  } catch (error) {
    console.error("Erro no processo:", error);
  }
})();
