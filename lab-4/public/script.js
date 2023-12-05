const SESSION_KEY = 'session';

const session = sessionStorage.getItem(SESSION_KEY);

let token;

try {
  token = JSON.parse(session).token;
} catch (e) {}

if (token) {
  axios
    .get('/api/current-user', {
      headers: {
        Authorization: token,
      },
    })
    .then((response) => {
      console.log({ response });
      const { username } = response.data;

      console.log(response.data);

      if (username) {
        const mainHolder = document.getElementById('main-holder');
        const loginHeader = document.getElementById('login-header');

        loginForm.remove();
        loginErrorMsg.remove();
        loginHeader.remove();

        mainHolder.append(`Hello ${username}`);
        logoutLink.style.opacity = 1;
      }
    })
    .catch((err) => {
      if (err.response.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
      }
    });
}

const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-form-submit');
const loginErrorMsg = document.getElementById('login-error-msg');
const logoutLink = document.getElementById('logout');

logoutLink.addEventListener('click', (e) => {
  e.preventDefault();
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});

loginButton.addEventListener('click', (e) => {
  e.preventDefault();
  const login = loginForm.login.value;
  const password = loginForm.password.value;

  axios({
    method: 'post',
    url: '/api/login',
    data: {
      login,
      password,
    },
  })
    .then((response) => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(response.data));
      location.reload();
    })
    .catch(() => {
      loginErrorMsg.style.opacity = 1;
    });
});
