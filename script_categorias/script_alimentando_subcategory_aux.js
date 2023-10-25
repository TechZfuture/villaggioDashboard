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
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/categories?apitoken=${apiToken}`;

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
      if (item.subgroupId != null) {
        const [existe] = await connection.execute(
          "SELECT * FROM subcategory_aux WHERE subgroup_id = ?",
          [item.subgroupId || null]
        );

        if (existe.length > 0) {
          await connection.execute(
            "UPDATE subcategory_aux SET subgroup_id = ? WHERE subgroup_id = ?",
            [item.subgroupId || null, item.subgroupId || null]
          );
        } else {
          const query = "INSERT INTO subcategory_aux (subgroup_id) VALUES (?)";
          await connection.query(query, [item.subgroupId || null]);
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

// Função para deletar dados que não existem mais na API
async function deletarDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Obter todos os registros existentes no banco de dados
    const [registrosNoBanco] = await connection.execute(
      "SELECT subgroup_id FROM subcategory_aux"
    );

    // Converter os resultados em um conjunto de subgroupId
    const subgroupIdSet = new Set(registrosNoBanco.map((item) => item.subgroup_id));

    // Verificar cada registro do banco de dados e excluir se não existir na API
    for (const subgroupId of subgroupIdSet) {
      if (!data.some((item) => item.subgroupId === subgroupId)) {
        await connection.execute(
          "DELETE FROM subcategory_aux WHERE subgroup_id = ?",
          [subgroupId]
        );
        console.log(`Registro com subgroup_id ${subgroupId} foi excluído.`);
      }
    }

    console.log("Dados deletados no banco de dados com sucesso.");
  } catch (error) {
    console.error("Erro ao deletar dados no banco de dados:", error);
  } finally {
    connection.end();
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
