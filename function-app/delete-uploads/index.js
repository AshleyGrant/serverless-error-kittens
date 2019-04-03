module.exports = async function (context, { container, blobName }) {
  deleteImage(container, blobName);

  context.bindings.message = [{
    target: process.env.SIGNALR_MESSAGE_TARGET,
    arguments: [`Deleted blob ${blobName} from container ${container}...`]
  }];
};

async function deleteImage(container, blobName) {
  try {
    const storage = require('azure-storage');

    // delete original image
    const blobService = storage.createBlobService(process.env.ERROR_KITTENS_STORAGE);

    const resultOrError = await new Promise(resolve => blobService.deleteBlobIfExists(container, blobName, resultOrError => resolve(resultOrError)));

    if (resultOrError !== null && typeof resultOrError === 'object') {
      throw resultOrError;
    }

  } catch (error) {
    context.log(error);
    context.bindings.tableStorage = [error];
    throw error;
  }
}
