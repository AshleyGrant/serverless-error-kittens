import { Context, HttpRequest } from '@azure/functions';

const { parse } = require('querystring');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

export default async function (context: Context, req: HttpRequest, kittens) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const { Body: body } = parse(req.body);

  const twiml = new MessagingResponse();

  const outgoingMessage = twiml.message();

  const wantsAKitten = /send\s+.*kitt(ens?|ie|y)/.test(body.toLowerCase());

  if (wantsAKitten) {
    const randomIndex = getRandomInt(kittens.length);

    const { uri } = kittens[randomIndex];

    outgoingMessage.body(`You ask for a kitten, you get a kitten. Enjoy!`);
    outgoingMessage.media(uri);
  } else {
    outgoingMessage.body('Sorry! I only know how to send kittens😿');
  }

  context.res = {
    headers: {
      'Content-Type': 'text/xml'
    },
    body: twiml.toString()
  };
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
