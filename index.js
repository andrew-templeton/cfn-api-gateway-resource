
var AWS = require('aws-sdk');
var CfnLambda = require('cfn-lambda');

var APIG = new AWS.APIGateway({apiVersion: '2015-07-09'});

var Delete = CfnLambda.SDKAlias({
  returnPhysicalId: 'id',
  downcase: true,
  ignoreErrorCodes: [404],
  physicalIdAs: 'ResourceId',
  keys: ['RestApiId', 'ResourceId'],
  api: APIG,
  method: 'deleteResource'
});

var Create = CfnLambda.SDKAlias({
  returnPhysicalId: 'id',
  downcase: true,
  api: APIG,
  method: 'createResource',
  returnAttrs: []
});

exports.handler = CfnLambda({
  Create: Create,
  Update: Update,
  Delete: Delete,
  TriggersReplacement: ['RestApiId'],
  SchemaPath: [__dirname, 'schema.json']
});


function Update(physicalId, freshParams, oldParams, reply) {

  var params = {
    resourceId: physicalId,
    restApiId: freshParams.RestApiId,
    patchOperations: []
  };

  ['ParentId', 'PathPart'].forEach(patch);

  console.log('Sending PATCH to API Gateway Resource: %j', params);

  APIG.updateResource(params, function(err, resource) {
    if (err) {
      console.error('Failed to update resource: %j', err);
      return reply(err.message);
    }
    console.log('Got data back from API Gateway: %j', resource);
    reply(null, resource.id, {});
  });

  function patch(key) {
    var keyPath = '/' + key[0].toLowerCase() + key.slice(1, key.length);
    if (freshParams[key] === oldParams[key]) {
      return;
    }
    if (!oldParams[key]) {
      return params.patchOperations.push({
        op: 'add',
        path: keyPath,
        value: freshParams[key]
      });
    }
    if (!freshParams[key]) {
      return params.patchOperations.push({
        op: 'remove',
        path: keyPath
      });
    }
    params.patchOperations.push({
      op: 'replace',
      path: keyPath,
      value: freshParams[key]
    });
  }
}
