// An HTTP trigger Azure Function that returns a SAS token for Azure Storage for the specified container. 
// You can also optionally specify a particular blob name and access permissions. 
// To learn more, see https://github.com/Azure-Samples/functions-dotnet-sas-token/blob/master/README.md

const azure = require('azure-storage');
const uuidv4 = require('uuid/v4');

module.exports = async function (context, req) {
  // The following values can be used for permissions: 
  // "a" (Add), "r" (Read), "w" (Write), "d" (Delete), "l" (List)
  // Concatenate multiple permissions, such as "rwa" = Read, Write, Add
  let container;

  switch (req.body.container) {
    case 'images':
      container = process.env.IMAGE_CONTAINER;
      break;
    case 'uploads':
      container = process.env.UPLOAD_CONTAINER;
      break;
    default:
      throw 'Unrecognized container';
  }

  let blobName = req.body.blobName;

  if (container) {
    if (req.body.count && req.body.count > 0) {
      const count = parseInt(req.body.count);

      context.res = {
        body: Array.from({ length: count }, () => generateSasToken(context, container, req.body.permissions, uuidv4()))
      };
    }
    else {
      if (req.body.permissions === azure.BlobUtilities.SharedAccessPermissions.WRITE) {
        blobName = uuidv4()
      }
      context.res = {
        body: generateSasToken(context, container, req.body.permissions, blobName)
      };
    }
  } else {
    context.res = {
      status: 500,
      body: {
        error: 'Unrecognized or missing container'
      }
    }
  }
};

function generateSasToken(context,
  container = process.env.IMAGE_CONTAINER,
  permissions = azure.BlobUtilities.SharedAccessPermissions.READ,
  blobName) {
  var connString = process.env.ERROR_KITTENS_STORAGE;
  var blobService = azure.createBlobService(connString);

  // Create a SAS token that expires in an hour
  // Set start time to five minutes ago to avoid clock skew.
  var startDate = new Date();
  startDate.setMinutes(startDate.getMinutes() - 5);
  var expiryDate = new Date(startDate);
  expiryDate.setMinutes(startDate.getMinutes() + 60);

  var sharedAccessPolicy = {
    AccessPolicy: {
      Permissions: permissions,
      Start: startDate,
      Expiry: expiryDate
    }
  };

  var sasToken = blobService.generateSharedAccessSignature(container, blobName, sharedAccessPolicy);

  return blobService.getUrl(container, blobName, sasToken, true);
}
