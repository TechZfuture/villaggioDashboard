create table balance(
	accountId varchar(50),
    accountName varchar(40),
    balance decimal (12,2),
    agency varchar(10),
    accountNumber varchar(30),
    isVirtual boolean,
    isReconcilable boolean,
    isPJBankVirtualAccountWaitingApprove boolean
);