create table parent_category(
	id int,
    parent_id varchar(40) key,
    name varchar(100),
    reference_code varchar(10)
);

create table child_category (
	id int,
    child_id varchar(40),
    name varchar(40),
    reference_code varchar(10),
    type char(3),
    subgroup_id varchar(40),
    subgroup_name varchar(50),
    group_type int,
    reference_code_key varchar(40),
    foreign key (reference_code_key) references parent_category(parent_id),
    foreign key (subgroup_id) references subcategory(subgroup_id)
);

create table subcategory_aux(
	subgroup_id varchar(40) key
);

create table subcategory(
	name varchar(50),
    subgroup_id varchar(40) key,
    foreign key (subgroup_id) references subcategory_aux(subgroup_id)
);
