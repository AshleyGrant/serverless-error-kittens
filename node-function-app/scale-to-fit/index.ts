import { Context } from '@azure/functions';
import * as sharp from 'sharp';

const storage = require('azure-storage');

export default async function (context: Context, image) {
  try {
    const maxSize = parseInt(process.env.MAX_IMAGE_SIZE_BYTES);
    // context.log("Resizing image \n Name:", context.bindingData.name)
    // context.log("Blob Size:", image.length, "Bytes");

    const {
      newImage,
      outputProperty
    } = await scaleImage(image, context.bindingData.name, context);

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

async function scaleImage(image, name, context) {
  const scalingFactor = 0.9;

  let newImage = image;
  const sharpInstance = sharp(image);

  const {
    height,
    width,
    format
  } = await sharpInstance.metadata();

  let outputProperty;

  switch (format) {
    case 'jpeg':
      outputProperty = 'jpegContent';
      break;
    case 'png':
      outputProperty = 'pngContent';
      break;
    default:
      await deleteImage(name);
      context.log('Unrecognized or unsupported image type');
      return;
  }

  newImage = await sharpInstance.resize(Math.floor(width * scalingFactor), Math.floor(height * scalingFactor), {
    fit: 'inside'
  }).toBuffer();

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
