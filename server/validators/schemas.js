const Joi = require("joi");

const textInputSchema = Joi.object({
  text: Joi.string().max(50000).required(),
});

const normalizeSchema = Joi.object({
  raw_tokens: Joi.array().items(Joi.string()).required(),
  currency_hint: Joi.string().optional(),
});

const classifySchema = Joi.object({
  normalized_amounts: Joi.array().items(Joi.number()).required(),
  original_text: Joi.string().optional(),
});

const finalizeSchema = Joi.object({
  amounts: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().required(),
        value: Joi.number().required(),
        source: Joi.string().optional(),
      })
    )
    .required(),
  currency_hint: Joi.string().optional(),
  original_text: Joi.string().optional(),
});

module.exports = {
  textInputSchema,
  normalizeSchema,
  classifySchema,
  finalizeSchema,
};
