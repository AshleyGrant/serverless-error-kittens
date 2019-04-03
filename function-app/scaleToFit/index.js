const sharp = require('sharp');

module.exports = async function (context, image) {
  try {
    const maxSize = parseInt(process.env.MAX_IMAGE_SIZE_BYTES);
    // context.log("Resizing image \n Name:", context.bindingData.name)
    // context.log("Blob Size:", image.length, "Bytes");

    let {
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
};

async function resizeImage(image, name, context) {
  const maxWidth = parseInt(process.env.MAX_IMAGE_WIDTH);
  const maxHeight = parseInt(process.env.MAX_IMAGE_HEIGHT);

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

  const toWide = width > maxWidth;
  const toTall = height > maxHeight;

  if (toWide || toTall) {

    newImage = await sharpInstance.resize(maxWidth, maxHeight, {
      fit: 'inside'
    }).toBuffer();
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

  const resultOrError = await new Promise(resolve => blobService.deleteBlobIfExists(process.env.SCALE_CONTAINER, blobName, resultOrError => resolve(resultOrError)));

  if (resultOrError !== null && typeof resultOrError === 'object') {
    throw resultOrError;
  }
}
