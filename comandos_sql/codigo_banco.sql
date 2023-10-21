CREATE TABLE parent_category(
	id INT,
    parent_id VARCHAR(40) KEY,
    name VARCHAR(100),
    referenceCode VARCHAR(10)
);

SELECT * FROM parent_category ORDER BY 1;

CREATE TABLE child_category(
	id INT,
    child_id VARCHAR(40),
    name VARCHAR(100),
    referenceCode VARCHAR(10),
    type CHAR(3),
    subgroupId VARCHAR(40),
    subgroupName VARCHAR(100),
    groupType INT,
    referenceCode_key VARCHAR(40),
    FOREIGN KEY (referenceCode_Key) REFERENCES parent_category(parent_id)
);

SELECT * FROM child_category;

CREATE TABLE subcategory_aux(
	subgroupId VARCHAR(40) KEY NOT NULL
);

CREATE TABLE subcategory(
	name VARCHAR(50),
    subgroupId VARCHAR(40),
    FOREIGN KEY (subgroupId) REFERENCES subcategory_aux(subgroupId)
);

CREATE TABLE cost_center(
	id INT NOT NULL AUTO_INCREMENT KEY,
	costCenterId VARCHAR(40),
    description VARCHAR(50)
);
















SELECT * FROM cost_center;

SELECT * FROM subcategory;

SELECT * FROM subcategory_aux;

SELECT * FROM child_category;

SELECT DISTINCT subgroupName FROM child_category;

SELECT parent_category.name AS name, parent_category.parent_id, child_category.name AS name, child_category.referenceCode_key
FROM parent_Category
INNER JOIN child_category
ON parent_category.parent_id = child_category.referenceCode_key;