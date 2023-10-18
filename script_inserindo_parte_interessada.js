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
        `SELECT * FROM stakeholder WHERE stakeholder_id = ?`,
        [item.id]
      );

      if (existe.length > 0) {
        await connection.execute(
          `UPDATE stakeholder SET is_deleted = ?, name = ?, email = ?, phone_number = ?, 
          document_type = ?, document_number = ?, 
          communication_name = ?, communication_email = ?, communication_phone = ?, communication_cell_phone = ?, communication_website = ?, 
          address_line1 = ?, address_line2 = ?, address_number = ?, address_district = ?, address_city = ?, address_state = ?, address_zip_code = ?, address_country = ?, address_ibge_code = ?, 
          bank_name = ?, bank_agency = ?, bank_account_number = ?, bank_account_type = ?, 
          company_name = ?, company_municipal_inscrition WHERE costCenterId = ?`,
          [
            item.isDeleted,
            item.name,
            item.email,
            item.phone,
            item.document.type,
            item.document.number,
            item.communication.contactName,
            item.communication.email,
            item.communication.phone,
            item.communication.cell_phone,
            item.communication.website,
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
            item.companyInformation.municipalInscription
          ]
        );
      } else {
        const query =
          "INSERT INTO cost_Center (costCenterId, description) VALUES (?, ?)";
        await connection.query(query, [item.costCenterId, item.description]);
      }
    }

    console.log("Dados inseridos no banco de dados com sucesso.");
  } catch (error) {
    console.error("Erro ao inserir dados no banco de dados:", error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados
  }
}
