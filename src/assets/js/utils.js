const fetch = require('node-fetch');

// eslint-disable-next-line import/no-unresolved
const pkg = require('../package.json');

const url = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;

const configPath = `${url}/launcher/config-launcher/config.json`;

async function getConfig() {
  return new Promise((resolve, reject) => {
    fetch(configPath)
      .then((config) => resolve(config.json()))
      .catch((error) => reject(error));
  });
}

function changePanel(id) {
  const panel = document.querySelector(`.${id}`);
  const active = document.querySelector('.active');
  if (active) active.classList.toggle('active');
  panel.classList.add('active');
}

function addAccount(data) {
  const div = document.createElement('div');
  div.classList.add('account');
  div.id = data.uuid;
  div.innerHTML = `
        <img class="account-image" src="https://minotar.net/helm/${data.name}/100">
        <div class="account-name">${data.name}</div>
        <div class="account-uuid">${data.uuid}</div>
        <div class="account-delete"><div class="icon-account-delete icon-account-delete-btn"></div></div>
    `;
  document.querySelector('.accounts').appendChild(div);
}

function accountSelect(uuid) {
  const account = document.getElementById(uuid);
  const pseudo = account.querySelector('.account-name').innerText;
  const activeAccount = document.querySelector('.active-account');

  if (activeAccount) activeAccount.classList.toggle('active-account');
  account.classList.add('active-account');
  document.querySelector('.player-head').style.backgroundImage = `url(https://minotar.net/helm/${pseudo}/100)`;
}

export {
  getConfig,
  changePanel,
  addAccount,
  accountSelect,
};
