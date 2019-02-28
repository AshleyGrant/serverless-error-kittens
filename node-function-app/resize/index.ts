import { Context } from '@azure/functions';

export default async function (context: Context, image) {
  try {
    const maxSize = parseInt(process.env.MAX_IMAGE_SIZE_BYTES);

    const {
      newImage,
      outputProperty
    } = await resizeImage(image, context.bindingData.name, context);

    if (newImage.length > maxSize) {
      context.bindings.needsFurtherScaling = newImage;
    } else {
      context.bindings[outputProperty] = newImage;
    }

    context.bindings.queueForDeletion = {
      container: process.env.UPLOAD_CONTAINER,
      blobName: context.bindingData.name
    };

    context.bindings.message = [{
      target: process.env.SIGNALR_MESSAGE_TARGET,
      arguments: [`Resized blob ${context.bindingData.name} in container ${process.env.UPLOAD_CONTAINER}...`]
    }];
  } catch (error) {
    context.log(error);
    throw error;
  }
}

async function resizeImage(image, name, context) {
  const jimp = require('jimp');
  const maxWidth = parseInt(process.env.MAX_IMAGE_WIDTH);
  const maxHeight = parseInt(process.env.MAX_IMAGE_HEIGHT);

  let newImage = image;
  let jimpInstance = await jimp.read(image);

  const [
    width, height, mime
  ] = await Promise.all([
    jimpInstance.getWidth(),
    jimpInstance.getHeight(),
    jimpInstance.getMIME()
  ]);

  let outputProperty;
  switch (mime) {
    case jimp.MIME_JPEG:
      outputProperty = 'jpegContent';
      break;
    case jimp.MIME_PNG:
      outputProperty = 'pngContent';
      break;
    default:
      await deleteImage(name);
      context.log('Unrecognized or unsupported image type');
      return;
  }

  const toWide = width > maxWidth;
  const toTall = height > maxHeight;

  if (toWide || toTall) {
    let newHeight = jimp.AUTO;
    let newWidth = jimp.AUTO;

    if (toWide && toTall) {
      newWidth = maxWidth;
      newHeight = maxHeight;
    } else if (toWide) {
      newWidth = maxWidth;
    } else {
      newHeight = maxHeight;
    }

    jimpInstance = await jimpInstance.scaleToFit(newWidth, newHeight);

    // context.log('Resized width: ', await jimpInstance.getWidth())
    // context.log('Resized height: ', await jimpInstance.getHeight())

    newImage = await jimpInstance.getBufferAsync(mime);
  }

  return {
    newImage,
    outputProperty
  };
}

async function deleteImage(blobName) {
  const storage = require('azure-storage');

  // delete original image
  const blobService = storage.createBlobService(process.env.ERROR_KITTENS_STORAGE);

  const resultOrError = await new Promise(resolve => blobService.deleteBlobIfExists(process.env.UPLOAD_CONTAINER, blobName, resultOrError => resolve(resultOrError)));

  if (resultOrError !== null && typeof resultOrError === 'object') {
    throw resultOrError;
  }
}
