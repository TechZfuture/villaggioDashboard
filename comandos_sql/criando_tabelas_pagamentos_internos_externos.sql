create table internal_payments(
	entry_id varchar(40),
    bank_balance_date_is_greater_than_entry_date boolean,
    is_virtual boolean,
    account_id varchar(40),
    account_name varchar(50),
    account_is_deleted boolean,
    date datetime,
    identifier varchar(40),
    value decimal(12, 2),
    is_reconciliated boolean,
    is_transfer boolean,
    is_flagged boolean
);

create table external_payments(
	entry_id varchar(50),
    bank_balance_date_is_greater_than_entry_date boolean,
    schedule_id varchar(40),
    is_virtual boolean,
    account_id varchar(40),
    account_name varchar(50),
    account_is_deleted boolean,
    stakeholder_id varchar(40),
    stakeholder_name varchar(50),
    stakeholder_is_deleted boolean,
    category_id varchar(40),
    category_name varchar(50),
    category_is_deleted boolean,
    category_type char(3),
    category_parent_id varchar(40),
    category_parent_name varchar(50),
    date datetime,
    identifier varchar(50),
    value decimal (12, 2),
    description varchar(50),
    check_number varchar(20),
    is_reconciliated boolean,
    is_transfer boolean,
    is_flagged boolean, 
    cost_center_id varchar(40), 
    cost_center_name varchar(50),
    cost_center_percent decimal(12, 2),
    cost_center_value decimal(12, 2)
);

select count(*) from external_payments;
select count(*) from internal_payments;