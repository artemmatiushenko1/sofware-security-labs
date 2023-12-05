'use strict';

const form = document.getElementById('form');
const registerButton = document.getElementById('form-submit');
const errorMsg = document.getElementById('error-msg');

const SESSION_KEY = 'session';

const session = sessionStorage.getItem(SESSION_KEY);

if (session) {
  location.replace('/');
}

registerButton.addEventListener('click', (e) => {
  e.preventDefault();
  const email = form.email.value;
  const password = form.password.value;

  axios({
    method: 'POST',
    url: '/api/register',
    data: {
      email,
      password,
    },
  })
    .then((response) => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(response.data));
      location.replace('/');
    })
    .catch((err) => {
      errorMsg.style.opacity = 1;
      errorMsg.innerText = err.response.data.message;
    });
});
