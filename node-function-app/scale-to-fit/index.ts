import { Context } from '@azure/functions';

const jimp = require('jimp');
const storage = require('azure-storage');

export default async function (context: Context, image) {
  try {
    const maxSize = parseInt(process.env.MAX_IMAGE_SIZE_BYTES);
    // context.log("Resizing image \n Name:", context.bindingData.name)
    // context.log("Blob Size:", image.length, "Bytes");

    const {
      newImage,
      outputProperty
    } = await resizeImage(image, context.bindingData.name, context);

    if (newImage.length > maxSize) {
      context.bindings.needsFurtherScaling = newImage;
    } else {
      context.bindings[outputProperty] = newImage;
    }

    // context.log("Resized image \n Name:", context.bindingData.name)
    // context.log("New Blob Size:", newImage.length, "Bytes");

    context.bindings.queueForDeletion = {
      container: process.env.SCALE_CONTAINER,
      blobName: context.bindingData.name
    };
  } catch (error) {
    context.log(error);
    throw error;
  }
}

async function resizeImage(image, name, context) {
  const scalingFactor = 0.9;

  let newImage = image;
  let jimpInstance = await jimp.read(image);

  const mime = await jimpInstance.getMIME();

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

  jimpInstance = await jimpInstance.scale(scalingFactor);

  newImage = await jimpInstance.getBufferAsync(mime);

  return {
    newImage,
    outputProperty
  };
}

async function deleteImage(blobName) {
  // delete original image
  const blobService = storage.createBlobService(process.env.ERROR_KITTENS_STORAGE);

  const resultOrError = await new Promise(resolve => blobService.deleteBlobIfExists(process.env.SCALE_CONTAINER, blobName, resultOrError => resolve(resultOrError)));

  if (resultOrError !== null && typeof resultOrError === 'object') {
    throw resultOrError;
  }
}
