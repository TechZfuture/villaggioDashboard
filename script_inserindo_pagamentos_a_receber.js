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
    const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?apitoken=${apiToken}`;
  
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
          `SELECT * FROM  WHERE  = ?`,
          []
        );
  
        if (existe.length > 0) {
          await connection.execute(
            `UPDATE  SET  WHERE `,
            [

            ]
          );
        } else {
          const query = `INSERT INTO   VALUES `;
          await connection.query(query, 
            [

            ]
            );
        }
      }
  
      console.log("Dados inseridos no banco de dados com sucesso.");
    } catch (error) {
      console.error("Erro ao inserir dados no banco de dados:", error);
    } finally {
      connection.end(); // Feche a conexão com o banco de dados
    }
  }