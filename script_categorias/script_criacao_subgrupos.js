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

async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    for (const item of data) {
      if (item.subgroupId != null) {
        const [existe] = await connection.execute(
          "SELECT * FROM subcategory WHERE subgroupId = ?",
          [item.subgroupId || null]
        );

        if (existe.length > 0) {
          await connection.execute(
            "UPDATE subcategory SET name = ?, subgroupId = ? WHERE subgroupId = ?",
            [
              item.subgroupName || null,
              item.subgroupId || null,
              item.subgroupId || null,
            ]
          );
        } else {
          const query =
            "INSERT INTO subcategory (name, subgroupId) VALUES (?, ?)";
          await connection.query(query, [
            item.subgroupName || null,
            item.subgroupId || null,
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

// Função para deletar dados que não existem mais na API
async function deletarDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Obter todos os registros existentes no banco de dados
    const [registrosNoBanco] = await connection.execute(
      "SELECT subgroupId FROM subcategory"
    );

    // Criar um conjunto (Set) com os subgroupId presentes na API
    const subgroupIdSet = new Set(data.map((item) => item.subgroupId));

    // Verificar cada registro do banco de dados e excluir se não existir na API
    for (const registroNoBanco of registrosNoBanco) {
      if (!subgroupIdSet.has(registroNoBanco.subgroup_id)) {
        await connection.execute(
          "DELETE FROM subcategory WHERE subgroupId = ?",
          [registroNoBanco.subgroupId]
        );
        console.log(
          `Registro com subgroupId ${registroNoBanco.subgroupId} foi excluído.`
        );
      }
    }

    console.log("Dados deletados no banco de dados com sucesso.");
  } catch (error) {
    console.error("Erro ao deletar dados no banco de dados:", error);
  } finally {
    connection.end();
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
