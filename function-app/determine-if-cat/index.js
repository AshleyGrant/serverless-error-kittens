module.exports = async function (context, { uri, blobName }, image) {
  const ComputerVisionClient = require('azure-cognitiveservices-computervision');
  const { CognitiveServicesCredentials } = require('ms-rest-azure');

  const KITTEN_FINDER_URI_BASE = process.env['KITTEN_FINDER_URI_BASE'];
  const KITTEN_FINDER_KEY = process.env['KITTEN_FINDER_KEY'];

  try {

    const storage = require('azure-storage');

    const blobService = storage.createBlobService(process.env.ERROR_KITTENS_STORAGE);
    const imageAsStream = blobService.createReadStream(process.env.IMAGE_CONTAINER, blobName);

    const credentials = new CognitiveServicesCredentials(KITTEN_FINDER_KEY);
    const client = new ComputerVisionClient(credentials, KITTEN_FINDER_URI_BASE);

    const {
      adult: {
        isAdultContent,
        isRacyContent
      },
      tags,
      description,
      metadata
    } = await client.analyzeImageInStream(imageAsStream, {
      visualFeatures: [
        'Categories',
        'Tags',
        'Description',
        'Adult'
      ]
    });

    const prettySureItsACat = tags.some(({ name, confidence }) => (name === 'cat' && confidence > 0.9));
    const isNaughty = isAdultContent || isRacyContent;

    const imageInfo = {
      PartitionKey: "ImageInfo",
      RowKey: blobName,
      uri,
      blobName,
      tags,
      description,
      metadata,
      isACat: prettySureItsACat,
      isSFW: !isNaughty,
      metadata
    };

    // context.log(imageInfo);

    context.bindings.tableStorage = [imageInfo];

    context.bindings.message = [{
      target: process.env.SIGNALR_MESSAGE_TARGET,
      arguments: [`Ran Azure Cognitive services on blob ${blobName}. prettySureItsACat: ${prettySureItsACat}, isNaughty: ${isNaughty}...`]
    }];

    if (!isNaughty && prettySureItsACat) {
      context.bindings.message.push({
        target: process.env.SIGNALR_KITTEN_TARGET,
        arguments: [uri, description]
      });
    }
  } catch (error) {
    context.log(error);

    if (error.message.substring(0, 10) === 'Rate limit') {
      const matches = error.message.match(/Try again in (\d+) seconds/);

      if (matches && matches.length === 2) {
        const waitTime = parseInt(matches[1])
        // wait a few seconds and then requeue
        await new Promise(resolve => {
          context.log(`Placing blob ${blobName} in Cognitive Services retry queue in ${waitTime} seconds...`);
          context.bindings.message = [{
            target: process.env.SIGNALR_MESSAGE_TARGET,
            arguments: [`Placing blob ${blobName} in Cognitive Services retry queue. Waited ${waitTime} second(s)...`]
          }];
          setTimeout(() => {
            context.bindings.retryQueue = { uri, blobName };
            resolve();
          }, waitTime * 1000);
        });
        return;
      }
    }
    throw error;
  }
};

// "Rate limit is exceeded. Try again in 34 seconds."
