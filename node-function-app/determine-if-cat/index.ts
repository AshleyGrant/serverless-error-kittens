import { Context } from '@azure/functions';
import ComputerVisionClient from 'azure-cognitiveservices-computervision';
import { CognitiveServicesCredentials } from 'ms-rest-azure';

import * as  storage from 'azure-storage';

export default async function (context: Context, { uri, blobName }: InputParams) {

  const KITTEN_FINDER_URI_BASE = process.env['KITTEN_FINDER_URI_BASE'];
  const KITTEN_FINDER_KEY = process.env['KITTEN_FINDER_KEY'];

  try {

    const blobService = storage.createBlobService(process.env.ERROR_KITTENS_STORAGE);
    const imageAsStream = blobService.createReadStream(process.env.IMAGE_CONTAINER, blobName, null);

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
      PartitionKey: 'ImageInfo',
      RowKey: blobName,
      uri,
      blobName,
      tags,
      description,
      metadata,
      isACat: prettySureItsACat,
      isSFW: !isNaughty
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
        const waitTime = parseInt(matches[1]);
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
}

interface InputParams {
  uri: string;
  blobName: string;
}
