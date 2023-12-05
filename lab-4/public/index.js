'use strict';

const SESSION_KEY = 'session';

const session = sessionStorage.getItem(SESSION_KEY);

let token;

try {
  token = JSON.parse(session)?.token;

  if (!token) {
    location.replace('/login');
  }
} catch (e) {}

const loadingEl = document.createElement('div');
loadingEl.textContent = 'Loading...';

if (token) {
  const mainHolder = document.getElementById('main-holder');
  mainHolder.appendChild(loadingEl);

  axios
    .get('/api/current-user', {
      headers: {
        Authorization: token,
      },
    })
    .then((response) => {
      const { username } = response.data;

      if (username) {
        mainHolder.removeChild(loadingEl);
        mainHolder.append(`Hello ${username}`);
        logoutLink.style.opacity = 1;
      }
    })
    .catch((err) => {
      if (err.response?.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        location.replace('/login');
      }
    });
}

const logoutLink = document.getElementById('logout');

logoutLink.addEventListener('click', (e) => {
  e.preventDefault();
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});
