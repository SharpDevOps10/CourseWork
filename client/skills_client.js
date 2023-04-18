'use strict';
const fetchOK = (url, options) => fetch(url, options).then((response) => {
  if (response.status < 400) return response;
  else throw new Error(response.statusText);
});

const talkURL = (title) => 'talks/' + encodeURIComponent(title);

const reportError = (error) => alert(String(error));
const handleAction = (state, action) => {
  if (action.type === 'setUser') {
    localStorage.setItem('userName', action.user);
    return Object.assign({}, state, { user: action.user });
  } else if (action.type === 'setTalks') {
    return Object.assign({}, state, { talks: action.talks });
  } else if (action.type === 'newTask') {
    fetchOK(talkURL(action.title), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presenter: state.user,
        summary: action.summary,
      })

    }).catch(reportError);

  } else if (action.type === 'deleteTask') {
    fetchOK(talkURL(action.talk), { method: 'DELETE' })
      .catch(reportError);
  } else if (action.type === 'newComment') {
    fetchOK(talkURL(action.talk) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: state.user,
        message: action.message
      })
    }).catch(reportError);
  }
  return state;

};
const elt = (type, props, ...children) => {
  const dom = document.createElement(type);
  if (props) Object.assign(dom, props);
  for (const child of children) {
    if (typeof child !== 'string') dom.appendChild(child);
    else dom.appendChild(document.createTextNode(child));
  }
  return dom;
};

const renderUserField = (name, dispatch) => elt('label', {}, 'Your name: ', elt('input'), {
  type: 'text',
  value: name,
  onchange(event) {
    dispatch({ type: 'setUser', user: event.target.value });
  }
});

const renderComment = (comment) => elt('p', { className: 'comment' },
  elt('strong', null, comment.author),
  ': ', comment.message);
const renderTalk = (talk, dispatch) => elt(
  'section', { className: 'talk' },
  elt('h2', null, talk.title, ' ', elt('button', {
    type: 'button',
    onclick() {
      dispatch({ type: 'deleteTalk', talk: talk.title });
    }
  }, 'Delete')),
  elt('div', null, 'by ',
    elt('strong', null, talk.presenter)),
  elt('p', null, talk.summary),
  ...talk.comments.map(renderComment),
  elt('form', {
    onsubmit(event) {
      event.preventDefault();
      const form = event.target;
      dispatch({ type: 'newComment',
        talk: talk.title,
        message: form.elements.comment.value });
      form.reset();
    }
  }, elt('input', { type: 'text', name: 'comment' }), ' ',
  elt('button', { type: 'submit' }, 'Add comment')));


const pollTalks = async (update) => {
  let tag = undefined;
  for (;;) {
    let response;
    try {
      response = await fetchOK('/talks', {
        headers: tag && { 'If-None-Match': tag,
          'Prefer': 'wait=90' }
      });
    } catch (e) {
      console.log('Request failed: ' + e);
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    if (response.status === 304) continue;
    tag = response.headers.get('ETag');
    update(await response.json());
  }
};

const renderTalkForm = (dispatch) => {
  const title = elt('input', {type: 'text'});
  const summary = elt('input', {type: 'text'});
  return elt('form', {
    onsubmit(event) {
      event.preventDefault();
      dispatch({
        type: 'newTalk',
        title: title.value,
        summary: summary.value});
      event.target.reset();
    }
  },
    elt('h3', null, 'Submit a Talk'),
    elt('label', null, 'Title: ', title),
    elt('label', null, 'Summary: ', summary),
    elt('button', {type: 'submit'}, 'Submit'));
};





