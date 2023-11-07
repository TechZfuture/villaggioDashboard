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
      const [existe] = await connection.execute(
        "SELECT * FROM child_category WHERE child_id = ?",
        [item.id]
      );

      if (existe.length > 0) {         
          await connection.execute("UPDATE child_category SET id = ?, name = ?, referenceCode = ?, type = ?, subgroupId = ?, subgroupName = ?, groupType = ?, referenceCode_key = ? WHERE child_id = ?", [
            item.order || null,
            item.name,
            item.referenceCode || null,
            item.type,
            item.subgroupId || null,
            item.subgroupName || null,
            item.groupType,
            item.group.id,
            item.id
          ]);    
      } else {
        const query =
          "INSERT INTO child_category (id, child_id, name, referenceCode, type, subgroupId, subgroupName, groupType, referenceCode_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        await connection.query(query, [
          item.order,
          item.id,
          item.name,
          item.referenceCode || null,
          item.type,
          item.subgroupId || null,
          item.subgroupName || null,
          item.groupType,
          item.group.id
        ]);
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
    const [registrosNoBanco] = await connection.execute("SELECT child_id FROM child_category");

    // Criar um conjunto (Set) com os IDs dos registros obtidos na API
    const idsNaAPI = new Set(data.map((item) => item.id));

    // Iterar sobre os registros do banco de dados e excluir se o ID não estiver na API
    for (const registroNoBanco of registrosNoBanco) {
      if (!idsNaAPI.has(registroNoBanco.child_id)) {
        await connection.execute(
          "DELETE FROM child_category WHERE child_id = ?",
          [registroNoBanco.child_id]
        );
        console.log(`Registro com child_id ${registroNoBanco.child_id} foi excluído.`);
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
