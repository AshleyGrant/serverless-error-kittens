import { Context, HttpRequest } from '@azure/functions';

export default function (context : Context, req: HttpRequest, connectionInfo : any) {
  context.res = { body: connectionInfo };
  context.done();
}
