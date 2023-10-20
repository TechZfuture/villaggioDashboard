create table stakeholder(
	type varchar(15),
    id varchar(40) key,
    is_deleted boolean,
    name varchar(50),
	email varchar(50),
    phone varchar(10),
    document_number varchar(14),
    document_type char(4),
    comunication_contact_name varchar(30),
    comunication_email varchar(50),
    comunication_phone varchar(11),
    comunication_cell_phone varchar(11),
    comunication_website varchar(30),
    address_line1 varchar(20),
    address_line2 varchar(20),
    address_number int,
    address_district varchar(20),
    address_city varchar(30),
	address_state char(2),
    address_zip_code varchar(10),
    address_country varchar(30),
    address_ibge_code varchar(30),
    bank_name varchar(20),
    bank_agency varchar(10),
    bank_account_number varchar(20),
    bank_account_type int,
    company_name varchar(50),
    company_municipal_inscription varchar(20)
);

select * from stakeholder;