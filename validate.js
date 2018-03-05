//@ts-check
var joi = require('joi');

var schema = joi.object().keys({
  name: joi.string().min(1).required(),
  path: joi.string().min(1).required(),
  type: joi.string().required(),
  nodeVersion: joi.string(),
  servers: joi.object().required().pattern(
    /[/s/S]*/,
    joi.object().keys()
  ),
  env: joi.object().pattern(
        /[/s/S]*/,
        [joi.string(), joi.number(), joi.bool()]
  ),
  docker: joi.object().keys({
    args: joi.array().items(joi.string()),
    networks: joi.array().items(joi.string())
  })
});

module.exports = function(config, utils) {
  var details = []

  details = utils.combineErrorDetails(
    details,
    joi.validate(config.app, schema, utils.VALIDATE_OPTIONS)
  );

  return details;
}
