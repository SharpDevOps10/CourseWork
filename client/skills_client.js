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

const renderUserField = (name, dispatch) => {
  return elt('label', {}, 'Your name: ', elt('input'), {
    type: 'text',
    value: name,
    onchange(event) {
      dispatch({type: 'setUser', user: event.target.value});
    }
  });
};

const renderTalk = (talk, dispatch) => {
  return elt(
    'section', {className: 'talk'},
    elt('h2', null, talk.title, ' ', elt('button', {
      type: 'button',
      onclick() {
        dispatch({type: 'deleteTalk', talk: talk.title});
      }
    },'Delete')),
    elt('div', null, talk.summary),
      elt('strong', null, talk.presenter),
    elt('p', null, talk.summary),
      ...talk.comments.map(renderComment),

  );


};





