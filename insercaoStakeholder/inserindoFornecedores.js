const mysql = require("mysql2/promise");

const dbConfig = require("../informacoesBanco/informacoesBancoDeDados");
const apitoken = require("../informacoesAPI/informacoes");

// Função para buscar os dados da API
async function buscarDadosDaAPI() {
  const apiUrl = `https://api.nibo.com.br/empresas/v1/stakeholders?apitoken=${apitoken}`;

  try {
    const data = await (await fetch(apiUrl)).json();
    return data.items || [];
  } catch (error) {
    console.error("Erro ao buscar dados da API:", error);
    return [];
  }
}

// Função para inserir os dados no banco de dados
async function inserirDadosNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);
  let [atualizadas, inseridas] = [0, 0];

  try {
    for (const item of data) {
      if (item.id != null) {
        const [existe] = await connection.execute(
          `SELECT * FROM stakeholder WHERE id = ?`,
          [item.id]
        );

        const query =
          existe.length > 0
            ? `UPDATE stakeholder SET isDeleted = ?, name = ?, email = ?, phone = ?, 
        documentType = ?, documentNumber = ?, 
        comunicationContactName = ?, comunicationEmail = ?, comunicationPhone = ?, comunicationCellPhone = ?, comunicationWebsite = ?, 
        addressLine1 = ?, addressLine2 = ?, addressNumber = ?, addressDistrict = ?, addressCity = ?, addressState = ?, addressZipCode = ?, addressCountry = ?, addressIbgeCode = ?, 
        bankName = ?, bankAgency = ?, bankAccountNumber = ?, bankAccountType = ?, 
        companyName = ?, companyMunicipalInscription = ? WHERE id = ?`
            : `INSERT INTO stakeholder (type, id, isDeleted, name, email, phone, documentType, documentNumber, comunicationContactName, comunicationEmail, comunicationPhone, comunicationCellPhone, comunicationWebsite,
          addressLine1, addressLine2, addressNumber, addressDistrict, addressCity, addressState, addressZipCode, addressCountry, addressIbgeCode, bankName, bankAgency, bankAccountNumber,
          bankAccountType, companyName, companyMunicipalInscription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params =
          existe.length > 0
            ? [
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
                item.id,
              ]
            : [
                item.type || null,
                item.id || null,
                item.isDeleted || null,
                item.name || null,
                item.email || null,
                item.phone || null,
                item.document.type || null,
                item.document.number || null,
                item.communication.contactName || null,
                item.communication.email || null,
                item.communication.phone || null,
                item.communication.cellphone || null,
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
              ];

        const [result] = await connection.execute(query, params);

        existe.length > 0
          ? (atualizadas += result.changedRows)
          : (inseridas += result.affectedRows);
      }
    }
    console.log(
      `\n${atualizadas} consultas atualizadas no banco de dados.\n${inseridas} consultas inseridas no banco de dados.`
    );
  } catch (error) {
    console.error("Erro ao inserir dados no banco de dados:", error);
  } finally {
    connection.end(); // Feche a conexão com o banco de dados
  }
}

// Função para excluir registros que não existem na API
async function excluirRegistrosAusentesNoBancoDeDados(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const existingRecordIds = new Set(data.map((item) => item.id));
    const registrosNoBanco = (
      await connection.execute("SELECT id FROM stakeholder")
    )[0];

    // Passo 2: Comparar os IDs com os IDs da API e excluir registros ausentes
    for (const { id } of registrosNoBanco) {
      if (!existingRecordIds.has(id)) {
        await connection.execute("DELETE FROM stakeholder WHERE id = ?", [id]);
        console.log(`Registro com ID ${id} foi excluído.`);
      }
    }
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
