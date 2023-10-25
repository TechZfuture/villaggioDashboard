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
  const apiUrl = `https://api.nibo.com.br/empresas/v1/stakeholders?apitoken=${apiToken}`;

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
        `SELECT * FROM stakeholder WHERE id = ?`,
        [item.id]
      );

      if (existe.length > 0) {
        await connection.execute(
          `UPDATE stakeholder SET is_deleted = ?, name = ?, email = ?, phone = ?, 
          document_type = ?, document_number = ?, 
          comunication_contact_name = ?, comunication_email = ?, comunication_phone = ?, comunication_cell_phone = ?, comunication_website = ?, 
          address_line1 = ?, address_line2 = ?, address_number = ?, address_district = ?, address_city = ?, address_state = ?, address_zip_code = ?, address_country = ?, address_ibge_code = ?, 
          bank_name = ?, bank_agency = ?, bank_account_number = ?, bank_account_type = ?, 
          company_name = ?, company_municipal_inscription = ? WHERE id = ?`,
          [
            item.isDeleted,
            item.name,
            item.email || null,
            item.phone || null,
            item.document.type || null,
            item.document.number || null,
            item.communication.contactName || null,
            item.communication.email || null,
            item.communication.phone || null,
            item.communication.cellPhone || null,
            item.communication.webSite || null,
            item.address.line1 || null,
            item.address.line2 || null,
            item.address.number || null,
            item.address.district || null,
            item.address.city || null,
            item.address.state || null,
            item.address.zipCode || null,
            item.address.country || null,
            item.address.ibgeCode || null,
            item.bankAccountInformation.bank || null,
            item.bankAccountInformation.agency || null,
            item.bankAccountInformation.accountNumber || null,
            item.bankAccountInformation.bankAccountType || null,
            item.companyInformation.companyName || null,
            item.companyInformation.municipalInscription || null,
            item.id
          ]
        );
      } else {
        const query = `INSERT INTO stakeholder (type, id, is_deleted, name, email, phone, document_type, document_number, comunication_contact_name, comunication_email, comunication_phone, comunication_cell_phone, comunication_website,
            address_line1, address_line2, address_number, address_district, address_city, address_state, address_zip_code, address_country, address_ibge_code, bank_name, bank_agency, bank_account_number,
            bank_account_type, company_name, company_municipal_inscription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.query(query, 
          [
            item.type, 
            item.id,
            item.isDeleted,
            item.name,
            item.email,
            item.phone,
            item.document.type,
            item.document.number,
            item.communication.contactName,
            item.communication.email,
            item.communication.phone,
            item.communication.cellphone,
            item.communication.webSite,
            item.address.line1,
            item.address.line2,
            item.address.number,
            item.address.district,
            item.address.city,
            item.address.state,
            item.address.zipCode,
            item.address.country,
            item.address.ibgeCode,
            item.bankAccountInformation.bank,
            item.bankAccountInformation.agency,
            item.bankAccountInformation.accountNumber,
            item.bankAccountInformation.bankAccountType,
            item.companyInformation.companyName,
            item.companyInformation.municipalInscription,
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

// Função para excluir registros que não existem na API
async function excluirRegistrosAusentesNoBancoDeDados(dataFromAPI) {
  const connection = await mysql.createConnection(dbConfig);

  try {
      // Passo 1: Buscar todos os IDs no banco de dados
      const [existingRecords] = await connection.execute("SELECT id FROM stakeholder");

      // Extrair os IDs dos registros no banco de dados
      const existingRecordIds = existingRecords.map(record => record.id);

      // Passo 2: Comparar os IDs com os IDs da API e excluir registros ausentes
      for (const id of existingRecordIds) {
          if (!dataFromAPI.some(item => item.id === id)) {
              // O registro não existe na resposta da API, então vamos excluí-lo do banco de dados
              await connection.execute("DELETE FROM stakeholder WHERE id = ?", [id]);
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

// Executa o processo
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