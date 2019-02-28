import { Context, HttpRequest } from '@azure/functions';
import { KittenInfo } from '../lib/interfaces';

export default async function (context: Context, req: HttpRequest, kittens: KittenInfo[] = []) {
  const recentCount = parseInt(process.env.RECENT_COUNT);

  try {
    context.res = {
      body: kittens.slice(0, recentCount).map(x => ({ uri: x.uri, description: JSON.parse(x.description) }))
    };
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
