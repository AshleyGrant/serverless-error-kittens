import { Context, HttpRequest } from '@azure/functions';
import { KittenInfo } from '../interfaces';

export default async function (context: Context, req: HttpRequest, kittens: KittenInfo[]) {
  try {
    context.log('Time to send someone a random error kitten...');
    const randomIndex = getRandomInt(kittens.length);

    const { uri, description } = kittens[randomIndex];

    if (req.query.uri) {
      context.res = {
        body: {
          uri,
          description: JSON.parse(description)
        }
      };
    } else {
      context.res = {
        status: 303,
        headers: {
          Location: uri
        }
      };
    }
  } catch (error) {
    context.log(error);
    context.res = {
      status: 500,

      body: {
        message: 'An error has occurred...'
      }
    };
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
