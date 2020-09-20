const connection = require("../config/connection");
const sql = require("mssql");

class Transaction{
  constructor(transaction) {
    this.id = transaction.id;
    this.name = transaction.name
    this.amount = transaction.amount
    this.isExpense = transaction.isExpense
    this.date = transaction.date

    if (transaction.note) this.note = transaction.note

    this.user = {};
    this.user.id = transaction.user.id;
    this.user.firstName = transaction.user.firstName;
    this.user.lastName = transaction.user.lastName;
    this.user.username = transaction.user.username;
    
    if (transaction.source) {
      this.source = {}
      this.source.id = transaction.source.id
      this.source.name = transaction.source.name
    }

    //category to be added for container context
  }

  static create(transaction, user) {
  
  }

  static getAllSourceTransactions(sourceId) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const pool = await sql.connect(connection);
          const result = await pool.request()
            .input("SourceId", sql.Int, sourceId)
            .query(`
              SELECT
              TransactionId, TransactionName, TransactionDate, 
              TransactionAmount, TransactionIsExpense, TransactionNote,  
              bpTransaction.UserId, UserFirstName, UserLastName, LoginUsername
              FROM bpTransaction
              INNER JOIN bpSource
              ON bpTransaction.SourceId = bpSource.SourceId
              INNER JOIN bpUser
              ON bpTransaction.UserId = bpUser.UserId
              INNER JOIN bpLogin
              ON bpTransaction.UserId = bpLogin.UserId 
              WHERE bpTransaction.SourceId = @SourceId
            `);

          if (result.recordset.length <= 0)
            throw { status: 404, message: "No transactions found" };


          const transactions = [];
          result.recordset.forEach((record) => {
            const transactionObj = {
              id: record.TransactionId,
              name: record.TransactionName,
              amount: record.TransactionAmount,
              isExpense: record.TransactionIsExpense,
              date: record.TransactionDate,
              note: record.TransactionNote,
              user: {
                id: record.UserId,
                username: record.LoginUsername,
                firstName: record.UserFirstName,
                lastName: record.UserLastName
              }
            }

            transactions.push(new Transaction(transactionObj));
          });

          resolve(transactions);
        } catch (err) {
          console.log(err);
          reject(err);
        }
        sql.close();
      })();
    });
  }

  static getSourceTransaction(sourceId, transactionId) {

  }

  static getAllContainerTransactions(containerId) {

  }

  static getContainerTransaction(containerId, transactionId) {
    
  }
}

module.exports = Transaction
