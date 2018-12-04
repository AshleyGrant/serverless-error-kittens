import { PLATFORM } from 'aurelia-pal';
import { RouteConfig, Router, activationStrategy } from 'aurelia-router';

export class App {
  router: Router;
  configureRouter(config: RouteConfig, router: Router) {
    config.title = 'Error Kittens';
    config.map([
      { route: ['', 'home'], name: 'home', moduleId: PLATFORM.moduleName('./home'), nav: true, title: 'Home' },
      {
        route: 'random',
        name: 'random',
        moduleId: PLATFORM.moduleName('./random'),
        nav: true,
        title: 'Random Kitten',
        activationStrategy: activationStrategy.replace
      }
    ]);

    this.router = router;
  }
}
