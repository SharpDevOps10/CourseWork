'use strict';
const { createServer } = require('node:http');
const Router = require('/router');
const ecstatic = require('node:ecstatic');
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
  start(port) {
    this.server.listen(port);
  }
  stop() {
    this.server.close();
  }
}
const talkPath = /^\/talks\/([^\/]+)$/;
router.add('GET', talkPath, async (server, title) => {
  if (title in server.talks) {
    return { body: JSON.stringify(server.talks[title]),
      headers: { 'Content-Type': 'application/json' } };
  } else {
    return { status: 404, body: `No talk '${title}' found` };
  }
});
router.add('DELETE', talkPath, async (server, title) => {
  if (title in server.talks) {
    delete server.talks[title];
    server.update();
  }
  return { status: 204 };
});
const readStream = (stream) => new Promise((resolve, reject) => {
  let data = '';
  stream.on('error', reject);
  stream.on('data', (chunk) => data += chunk.toString());
  stream.on('end', () => resolve(data));
});
router.add('PUT', talkPath, async (server, title, request) => {
  const requestBody = await readStream(request);
  let talk;
  try {
    talk = JSON.parse(requestBody);
  } catch (_) {
    return { status: 400, body: 'Invalid JSON' };
  }
  const presenterType = typeof talk.presenter;
  const summaryType = typeof talk.summary;
  if (!talk || presenterType !== 'string' || summaryType !== 'string') {
    return { status: 400, body: 'Bad talk data' };
  }

  server.talks[title] = {
    title,
    presenter: talk.presenter,
    summary: talk.summary,
    comments: [],
  };
  server.updated();
  return { status: 204 };
});
const commentPath = /^\/talks\/([^\/]+)\/comments$/;
router.add('POST', commentPath, async (server, title, request) => {
  const requestBody = await readStream(request);
  let comment;
  try {
    comment = JSON.parse(requestBody);
  } catch (_) {
    return { status: 400, body: 'Invalid JSON' };
  }
  if (!comment ||
    typeof comment.author !== 'string' ||
    typeof comment.message !== 'string') {

    return { status: 400, body: 'Bad comment data' };
  } else if (title in server.talks) {
    server.talks[title].comments.push(comment);
    server.updated();
    return { status: 204 };
  } else {
    return { status: 404, body: `No talk '${title}' found` };
  }
});
SkillServer.prototype.talkResponse = function () {
  let talks = [];
  for (const title of Object.keys(this.talks)) {
    talks.push(this.talks[title]);
  }
  return {
    body : JSON.stringify(talks),
    headers : {
      'Content-Type' : 'application/json',
      'ETag' : `'${this.version}'`,
      'Cache-Control' : 'no-store',
    }
  };
};
router.add('GET', /^\/talks$/, async (server, request) => {
  const tag = /'(.*)'/.exec(request.headers['if-none-match']);
  const wait = /\bwait=(\d+)/.exec(request.headers['prefer']);
  if (!tag || tag[1] !== server.version) return server.talkResponse();
  else if (!wait) return {status : 304};
  else return server.waitForChanges(Number(wait[1]));
});
SkillServer.prototype.waitForChanges = function (time) {
  return new Promise((resolve) => {
    this.waiting.push(resolve);
    setTimeout(() => {
      if (!this.waiting.includes(resolve)) return;
      this.waiting = this.waiting.filter((r) => r!== resolve);
      resolve({status : 304});
    }, time * 1000);
  });
};


