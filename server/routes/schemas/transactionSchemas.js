const Joi = require('joi');
const { defaultUser } = require('./userSchemas');

const defaultTransaction = {
  id: Joi.number().integer().min(1).required(),
  name: Joi.string().min(1).max(255).required(),
  date: Joi.date().required(),
  amount: Joi.number().precision(4).required(),
  isExpense: Joi.bool().required(),
  note: Joi.string().min(1).max(255),
  user: Joi.object(defaultUser),
  source: Joi.object({
    id: Joi.number().integer().min(1).required(),
    name: Joi.string().min(1).max(255).required()
  })
}

const postTransactionInput = {
  name: Joi.string().min(1).max(255).required(),
  date: Joi.date().required(),
  amount: Joi.number().precision(4).required(),
  isExpense: Joi.bool().required(),
  note: Joi.string().min(1).max(255).empty(''),
  containerId: Joi.number().integer().min(1).required(),
  sourceId: Joi.number().integer().min(1).required(),
  categoryId: Joi.number().integer().min(1)
}

const patchTransactionInput = Joi.object({
  name: Joi.string().min(1).max(255),
  date: Joi.date(),
  amount: Joi.number().precision(4),
  isExpense: Joi.bool(),
  note: Joi.string().min(1).max(255).empty(''),
  categoryId: Joi.number().integer().min(1)
})

const defaultTransactionInput = Joi.object(postTransactionInput);
const defaultTransactionOutput = Joi.object(defaultTransaction);
const getAllTransactions = Joi.array().items(defaultTransactionOutput);

module.exports = {
  defaultTransaction,
  postTransactionInput,
  patchTransactionInput,
  defaultTransactionOutput,
  defaultTransactionInput,
  getAllTransactions
}