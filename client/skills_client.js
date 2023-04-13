'use strict';
const fetchOK = (url, options) => fetch(url, options).then((response) => {
  if (response.status < 400) return response;
  else throw new Error(response.statusText);
});



