const mysql = require("mysql2/promise");

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "sistema",
};

// Função para buscar os dados da API - CATEGORIA PAI
async function buscarDadosDaAPI() {
  const apiToken = "0C1F3E7F408A4B6B95ADCA50E36BDE9B";
  const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/categories/groups?apitoken=${apiToken}`;

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
      const [existe] = await connection.execute(
        "SELECT * FROM parent_category WHERE parent_id = ?",
        [item.id]
      );

      if (existe.length > 0) {
        await connection.execute(
          "UPDATE parent_category SET id = ?, name = ?, reference_code = ? WHERE parent_id = ?",
          [item.referenceCode, item.name, item.referenceCode, item.id]
        );
      } else {
        const query =
          "INSERT INTO parent_category (id, parent_id, name, reference_code) VALUES (?, ?, ?, ?)";
        await connection.query(query, [item.referenceCode, item.id, item.name, item.referenceCode]);
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
    const [registrosNoBanco] = await connection.execute("SELECT parent_id FROM parent_category");

    // Criar um conjunto (Set) com os IDs dos registros obtidos na API
    const idsNaAPI = new Set(data.map((item) => item.id));

    // Iterar sobre os registros do banco de dados e excluir se o ID não estiver na API
    for (const registroNoBanco of registrosNoBanco) {
      if (!idsNaAPI.has(registroNoBanco.parent_id)) {
        await connection.execute(
          "DELETE FROM parent_category WHERE parent_id = ?",
          [registroNoBanco.parent_id]
        );
        console.log(`Registro com parent_id ${registroNoBanco.parent_id} foi excluído.`);
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
