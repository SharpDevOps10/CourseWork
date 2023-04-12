const { createServer } = require('node:http');
const Router = require('/router');
const ecstatic = require('ecstatic');
const router = new Router();
const defaultHeaders = { 'Content-Type': 'text/plain' };
class SkillServer {
  constructor(talks) {
    this.talks = talks;
    this.version = 0;
    this.waiting = [];
    const fileServer = ecstatic({ root: './public' });
    this.server = createServer((req, res) => {
      const resolved = router.resolve(this, req);
      if (resolved) {
        resolved.catch((error) => {
          if (error.status !== null) return error;
          return { body: String(error), status: 500 };
        }).then(({ body,
          status = 200,
          headers = defaultHeaders }) => {
          res.writeHead(status, headers);
          res.end(body);
        });
      } else {
        fileServer(req, res);
      }
    });

  }

}
