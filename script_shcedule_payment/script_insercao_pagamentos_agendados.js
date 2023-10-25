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
    const apiUrl = `https://api.nibo.com.br/empresas/v1/schedules/debit?apitoken=${apiToken}`;

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
                "SELECT * FROM scheduled_payments WHERE schedule_id = ?",
                [item.scheduleId]
            );

            if (existe.length > 0) {
                await connection.execute(`UPDATE scheduled_payments SET category_id = ?, category_name = ?, category_type = ?, category_parent_id = ?, category_parent_name = ?, cost_center_id = ?, cost_center_percent = ?, cost_center_name = ?
                , cost_center_is_deleted = ?, schedule_id = ?, type = ?, is_entry = ?, is_bill = ?, is_debit_note = ?, is_flagged = ?, is_dued = ?, due_date = ?, accrual_date = ?, schedule_date = ?, create_date = ?, value = ?, is_paid = ?,
                 cost_center_value_type = ?, paid_value = ?, open_value = ?, stakeholder_id = ?, stakeholder_name = ?, stakeholder_type = ?, stakeholder_is_deleted = ?, description = ?, has_installment = ?,
                  installment_id = ?, has_recurrence = ?, has_open_entry_promise = ?, has_entry_promise = ?, auto_generate_entry_promise = ?, has_invoice = ?,
                has_pending_invoice = ?, has_schedule_invoice = ?, auto_generate_nfse_type = ?, is_payment_scheduled = ? where schedule_id = ?`, [
                    item.categories[0].categoryId,
                    item.categories[0].categoryName,
                    item.categories[0].type,
                    item.categories[0].parentId,
                    item.categories[0].parent,
                    item.costCenters[0]?.costCenterId ?? null,
                    item.costCenters[0]?.percent ?? null,
                    item.costCenters[0]?.costCenterDescription ?? null,
                    item.costCenter?.isDeleted ?? null,
                    item.scheduleId || null,
                    item.type || null,
                    item.isEntry || null,
                    item.isBill || null,
                    item.isDebitNote || null, 
                    item.isFlagged || null,
                    item.isDued || null,
                    item.dueDate || null,
                    item.accrualDate || null,
                    item.scheduleDate || null,
                    item.createDate || null,
                    item.value || null,
                    item.isPaid || null,
                    item.costCenterValueType || null,
                    item.paidValue || null,
                    item.openValue || null,
                    item.stakeholder.id || null,
                    item.stakeholder.name || null,
                    item.stakeholder.type || null,
                    item.stakeholder.isDeleted || null,
                    item.description || null,
                    item.hasInstallment || null,
                    item.installmentId || null,
                    item.hasRecurrence || null,
                    item.hasOpenEntryPromise || null,
                    item.hasEntryPromise || null,
                    item.autoGenerateEntryPromise || null,
                    item.hasInvoice || null,
                    item.hasPendingInvoice || null,
                    item.hasScheduleInvoice || null,
                    item.autoGenerateNFSeType || null,
                    item.isPaymentScheduled || null,
                    item.scheduleId || null
                ]);
            } else {
                const query =
                     `INSERT INTO scheduled_payments (schedule_id, category_id, category_name, category_type, category_parent_id, category_parent_name, cost_center_id, cost_center_percent, cost_center_name, cost_center_is_deleted, type,
                  is_entry, is_bill, is_debit_note, is_flagged, is_dued, due_date, accrual_date, schedule_date, create_date, value, is_paid, cost_center_value_type, paid_value, open_value, stakeholder_id, stakeholder_name,
                  stakeholder_type, stakeholder_is_deleted, description, has_installment, installment_id, has_recurrence, has_open_entry_promise, has_entry_promise, auto_generate_entry_promise, has_invoice,
                  has_pending_invoice, has_schedule_invoice, auto_generate_nfse_type, is_payment_scheduled) 
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                await connection.query(query, [
                    item.scheduleId || null,
                     item.categories[0].categoryId,
                     item.categories[0].categoryName,
                     item.categories[0].type,
                     item.categories[0].parentId,
                     item.categories[0].parent,
                     item.costCenters[0]?.costCenterId ?? null,
                     item.costCenters[0]?.percent ?? null,
                     item.costCenters[0]?.costCenterDescription ?? null,
                     item.costCenter?.isDeleted ?? null,
                     item.type || null,
                     item.isEntry || null,
                     item.isBill || null,
                     item.isDebitNote || null, 
                     item.isFlagged || null,
                     item.isDued || null,
                     item.dueDate || null,
                     item.accrualDate || null,
                     item.scheduleDate || null,
                     item.createDate || null,
                     item.value || null,
                     item.isPaid || null,
                     item.costCenterValueType || null,
                     item.paidValue || null,
                     item.openValue || null,
                     item.stakeholder.id || null,
                     item.stakeholder.name || null,
                     item.stakeholder.type || null,
                     item.stakeholder.isDeleted || null,
                     item.description || null,
                     item.reference || null,
                     item.hasInstallment || null,
                     item.installmentId || null,
                     item.hasRecurrence || null,
                     item.hasOpenEntryPromise || null,
                     item.hasEntryPromise || null,
                     item.autoGenerateEntryPromise || null,
                     item.hasInvoice || null,
                     item.hasPendingInvoice || null,
                     item.hasScheduleInvoice || null,
                     item.autoGenerateNFSeType || null,
                     item.isPaymentScheduled || null
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

// Função para excluir registros que não existem na API
async function excluirRegistrosAusentesNoBancoDeDados(dataFromAPI) {
    const connection = await mysql.createConnection(dbConfig);

    try {
        // Passo 1: Buscar todos os IDs no banco de dados
        const [existingRecords] = await connection.execute("SELECT schedule_id FROM scheduled_payments");

        // Extrair os IDs dos registros no banco de dados
        const existingRecordIds = existingRecords.map(record => record.schedule_id);

        // Passo 2: Comparar os IDs com os IDs da API e excluir registros ausentes
        for (const id of existingRecordIds) {
            if (!dataFromAPI.some(item => item.scheduleId === id)) {
                // O registro não existe na resposta da API, então vamos excluí-lo do banco de dados
                await connection.execute("DELETE FROM scheduled_payments WHERE schedule_id = ?", [id]);
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