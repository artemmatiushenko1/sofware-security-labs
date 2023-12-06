'use strict';

const SESSION_KEY = 'session';

const session = sessionStorage.getItem(SESSION_KEY);

let token;

try {
  token = JSON.parse(session)?.token;

  if (!token) {
    location.replace('/login');
  }
} catch (e) {
  sessionStorage.removeItem(SESSION_KEY);
  location.replace('/login');
}

const loadingEl = document.createElement('div');
loadingEl.textContent = 'Loading...';

const wait = () => new Promise((resolve) => setTimeout(() => resolve(), 10000));

const refreshAccessToken = () =>
  new Promise(async (resolve) => {
    try {
      const refreshToken = JSON.parse(session)?.refreshToken;
      if (!refreshToken) {
        return resolve(false);
      }

      const { data: tokens } = await axios({
        method: 'POST',
        url: '/api/refresh',
        data: {
          refreshToken,
        },
      });

      await wait();

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens));
      return resolve(true);
    } catch (err) {
      return resolve(false);
    }
  });

if (token) {
  const mainHolder = document.getElementById('main-holder');
  mainHolder.appendChild(loadingEl);

  const [, tokenPayloadBase64] = token.split('.');
  const decodedJsonPayload = atob(tokenPayloadBase64);
  const tokenPayload = JSON.parse(decodedJsonPayload);
  const tokenExpTimeMs = tokenPayload.exp * 1000;
  const currentTimeMs = Date.now();
  const tokenTimeLeftHr = (tokenExpTimeMs - currentTimeMs) / (1000 * 60 * 60);

  axios({
    method: 'GET',
    url: '/api/current-user',
    headers: {
      Authorization: token,
    },
  })
    .then((response) => {
      const { username } = response.data;

      if (username) {
        mainHolder.removeChild(loadingEl);
        mainHolder.append(`Hello ${username}`);
        mainHolder.append(document.createElement('br'));
        const timeLeftElement = document.createElement('div');
        timeLeftElement.innerText = `Access token will be valid for ${tokenTimeLeftHr.toFixed(
          2
        )} hours since now`;
        mainHolder.append(timeLeftElement);
        logoutLink.style.opacity = 1;
      }
    })
    .catch(async (err) => {
      if (err.response?.status === 401) {
        const hasRefreshedToken = await refreshAccessToken();

        if (hasRefreshedToken) {
          location.reload();
        } else {
          sessionStorage.removeItem(SESSION_KEY);
          location.replace('/login');
        }
      }
    });
}

const logoutLink = document.getElementById('logout');

logoutLink.addEventListener('click', (e) => {
  e.preventDefault();
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});
