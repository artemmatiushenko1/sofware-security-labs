'use strict';

const loginButton = document.getElementById('form-submit');
const form = document.getElementById('form');
const errorMsg = document.getElementById('error-msg');

const SESSION_KEY = 'session';

const session = sessionStorage.getItem(SESSION_KEY);

if (session) {
  location.replace('/');
}

loginButton.addEventListener('click', (e) => {
  e.preventDefault();
  const email = form.email.value;
  const password = form.password.value;

  axios({
    method: 'POST',
    url: '/api/login',
    data: {
      email,
      password,
    },
  })
    .then((response) => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(response.data));
      location.replace('/');
    })
    .catch(() => {
      errorMsg.style.opacity = 1;
    });
});
