CREATE TABLE parentCategory(
	id INT,
    idParent VARCHAR(40) KEY,
    name VARCHAR(100),
    referenceCode VARCHAR(10)
);

CREATE TABLE childCategory(
	id INT,
    idChild VARCHAR(40),
    name VARCHAR(100),
    referenceCode VARCHAR(10),
    type CHAR(3),
    subgroupId VARCHAR(40),
    subgroupName VARCHAR(100),
    groupType INT,
    referenceCodeKey VARCHAR(40),
    codDRE INT,
    tipoCategoria INT,
    FOREIGN KEY (referenceCodeKey) REFERENCES parentCategory(idParent)
);

CREATE TABLE subcategory_aux(
	subgroupId VARCHAR(40) KEY NOT NULL
);

CREATE TABLE subcategory(
	name VARCHAR(50),
    subgroupId VARCHAR(40),
);

CREATE TABLE costCenter(
	costCenterId VARCHAR(40),
    description VARCHAR(50)
);
