create table internalPayments(
	entryId varchar(40),
    bankBalanceDateIsGreaterThanEntryDate boolean,
    isVirtual boolean,
    accountId varchar(40),
    accountName varchar(50),
    accountIsDeleted boolean,
    date datetime,
    identifier varchar(40),
    value decimal(12, 2),
    isReconciliated boolean,
    isTransfer boolean,
    isFlagged boolean
);

create table externalPayments(
	entryId varchar(50),
    bankBalanceDateIsGreaterThanEntryDate boolean,
    scheduleId varchar(40),
    isVirtual boolean,
    accountId varchar(40),
    accountName varchar(50),
    accountIsDeleted boolean,
    stakeholderId varchar(40),
    stakeholderName varchar(50),
    stakeholderIsDeleted boolean,
    categoryId varchar(40),
    categoryName varchar(50),
    categoryIsDeleted boolean,
    categoryType char(3),
    categoryParentId varchar(40),
    categoryParentName varchar(50),
    date datetime,
    identifier varchar(50),
    value decimal (12, 2),
    description varchar(50),
    checkNumber varchar(20),
    isReconciliated boolean,
    isTransfer boolean,
    isFlagged boolean, 
    costCenteId varchar(40), 
    costCenterName varchar(50),
    costCenterPercent decimal(12, 2),
    costCenterValue decimal(12, 2)
);