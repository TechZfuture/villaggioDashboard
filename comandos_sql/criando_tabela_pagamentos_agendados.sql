CREATE TABLE scheduled_payments (
    schedule_id VARCHAR(40),
    category_id VARCHAR(40),
    category_name VARCHAR(40),
    category_type CHAR(3),
    category_parent_id VARCHAR(40),
    category_parent_name VARCHAR(50),
    cost_center_id VARCHAR(40),
    cost_center_name VARCHAR(50),
    cost_center_percent DECIMAL(12 , 2 ),
    cost_center_is_deleted BOOLEAN,
    type CHAR(10),
    is_entry BOOLEAN,
    is_bill BOOLEAN,
    is_debit_note BOOLEAN,
    is_flagged BOOLEAN,
    is_dued BOOLEAN,
    due_date DATETIME,
    accrual_date DATETIME,
    schedule_date DATETIME,
    create_date DATETIME,
    value DECIMAL(12 , 2 ),
    is_paid BOOLEAN,
    cost_center_value_type INT,
    paid_value DECIMAL(12 , 2 ),
    open_value DECIMAL(12 , 2 ),
    stakeholder_type VARCHAR(20),
    stakeholder_id VARCHAR(40),
    stakeholder_name VARCHAR(50),
    stakeholder_is_deleted BOOLEAN,
    description VARCHAR(50),
    has_installment BOOLEAN,
    installment_id varchar(40),
    has_recurrence BOOLEAN,
    has_open_entry_promise BOOLEAN,
    has_entry_promise BOOLEAN,
    auto_generate_entry_promise BOOLEAN,
    has_invoice BOOLEAN,
    has_pending_invoice BOOLEAN,
    has_schedule_invoice BOOLEAN,
    auto_generate_nfse_type INT,
    is_payment_scheduled BOOLEAN
);

select count(*) from scheduled_payments;
