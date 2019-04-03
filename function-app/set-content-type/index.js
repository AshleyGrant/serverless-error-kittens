module.exports = async function (context, image) {
  try {
    const { created, lastModified } = context.bindingData.properties;

    // only process new uploads
    if (created === lastModified) {
      const fileType = require('file-type');
      const storage = require('azure-storage');
      const { uri, blobName } = context.bindingData;
      const { mime } = fileType(image);

      const blobService = storage.createBlobService(process.env.ERROR_KITTENS_STORAGE);

      const resultOrError = await new Promise(resolve => blobService.setBlobProperties(process.env.IMAGE_CONTAINER, blobName, {
        contentType: mime
      }, resultOrError => resolve(resultOrError)));

      if (resultOrError !== null && typeof resultOrError === 'object') {
        throw resultOrError;
      }
      
      context.bindings.queueForAI = { uri, blobName };

      context.bindings.message = [{
        target: process.env.SIGNALR_MESSAGE_TARGET,
        arguments: [`Set content type of  blob ${blobName} to ${mime}...`]
      }];
    }
  } catch (error) {
    context.log(error);
    throw error;
  }
};
