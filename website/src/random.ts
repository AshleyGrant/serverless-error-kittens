import environment from './environment';

export class Random {
  apiUrl = environment.apiUrl;
  random = Math.random()
}
