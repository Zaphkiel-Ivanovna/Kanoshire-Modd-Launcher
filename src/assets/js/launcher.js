import {
  getConfig, changePanel, addAccount, accountSelect,
} from './utils.js';
import Login from './panels/login.js';
import Home from './panels/home.js';
import Settings from './panels/settings.js';

// import Logger from './class/Logger.js';
import Database from './class/Database.js';

// eslint-disable-next-line import/no-unresolved
const { Microsoft, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');
const fs = require('fs');
const rpc = require('discord-rpc');

const client = new rpc.Client({ transport: 'ipc' });

let config;
let database;

function initLog() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key === 'I') || e.key === 'F12') {
      ipcRenderer.send('main-window-dev-tools');
    }
  });
  // new Logger('Launcher', '#7289da');
}

function initFrame() {
  console.log('Initializing Frame...');
  document.querySelector('.frame').classList.toggle('hide');
  document.querySelector('.dragbar').classList.toggle('hide');

  document.querySelector('#minimize').addEventListener('click', () => {
    ipcRenderer.send('main-window-minimize');
  });

  document.querySelector('#close').addEventListener('click', () => {
    ipcRenderer.send('main-window-close');
  });

  function resetIndexedDB() {
    const request = indexedDB.deleteDatabase('database');

    request.onerror = function (event) {
      console.error('Erreur lors de la suppression de la base de données :', event.target.error);
    };

    console.log('Base de données supprimée avec succès');
    window.location.reload();
  }
  document.querySelector('.reset-link').addEventListener('click', () => {
    resetIndexedDB();
  });
}

function createPanels(...panels) {
  const panelsElem = document.querySelector('.panels');
  panels.forEach((Panel) => {
    console.log(`Initializing ${Panel.name} Panel...`);
    const div = document.createElement('div');
    div.classList.add('panel', Panel.id);
    div.innerHTML = fs.readFileSync(`${__dirname}/panels/${Panel.id}.html`, 'utf8');
    panelsElem.appendChild(div);
    new Panel().init(config);
  });
}

async function getaccounts() {
  const accounts = await database.getAll('accounts');
  const selectaccount = (await database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'accounts-selected'))?.value?.selected;

  if (!accounts.length) {
    changePanel('login');
  } else {
    await accounts.reduce(async (previousPromise, account) => {
      await previousPromise;
      const accountValue = account.value;
      if (accountValue.meta.type === 'Xbox') {
        console.log(`Initializing Xbox account ${accountValue.name}...`);
        const refresh = await new Microsoft(config.client_id).refresh(accountValue);

        if (refresh.error) {
          database.delete(accountValue.uuid, 'accounts');
          database.delete(accountValue.uuid, 'profile');
          if (accountValue.uuid === selectaccount) database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ' }, 'accounts-selected');
          console.error(`[Account] ${accountValue.uuid}: ${refresh.errorMessage}`);
          return;
        }

        const refreshAccounts = {
          access_token: refresh.access_token,
          client_token: refresh.client_token,
          uuid: refresh.uuid,
          name: refresh.name,
          refresh_token: refresh.refresh_token,
          user_properties: refresh.user_properties,
          meta: refresh.meta,
        };

        const refreshProfile = {
          uuid: refresh.uuid,
        };

        database.update(refreshAccounts, 'accounts');
        database.update(refreshProfile, 'profile');
        addAccount(refreshAccounts);
        if (accountValue.uuid === selectaccount) accountSelect(refresh.uuid);
      } else if (accountValue.meta.type === 'Mojang') {
        if (accountValue.meta.offline) {
          console.log(`Initializing Crack account ${accountValue.name}...`);
          addAccount(accountValue);
          if (accountValue.uuid === selectaccount) accountSelect(accountValue.uuid);
          return;
        }

        const validate = await Mojang.validate(accountValue);
        if (!validate) {
          database.delete(accountValue.uuid, 'accounts');
          if (accountValue.uuid === selectaccount) database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ' }, 'accounts-selected');
          console.error(`[Account] ${accountValue.uuid}: Token is invalid.`);
          return;
        }

        const refresh = await Mojang.refresh(accountValue);
        console.log(`Initializing Mojang account ${accountValue.name}...`);

        if (refresh.error) {
          database.delete(accountValue.uuid, 'accounts');
          if (accountValue.uuid === selectaccount) database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ' }, 'accounts-selected');
          console.error(`[Account] ${accountValue.uuid}: ${refresh.errorMessage}`);
          return;
        }

        const refreshAccounts = {
          access_token: refresh.access_token,
          client_token: refresh.client_token,
          uuid: refresh.uuid,
          name: refresh.name,
          user_properties: refresh.user_properties,
          meta: {
            type: refresh.meta.type,
            offline: refresh.meta.offline,
          },
        };

        database.update(refreshAccounts, 'accounts');
        addAccount(refreshAccounts);
        if (accountValue.uuid === selectaccount) accountSelect(refresh.uuid);
      } else {
        database.delete(accountValue.uuid, 'accounts');
        if (accountValue.uuid === selectaccount) database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ' }, 'accounts-selected');
      }
    }, Promise.resolve());

    if (!(await database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'accounts-selected')).value.selected) {
      const uuid = (await database.getAll('accounts'))[0]?.value?.uuid;
      if (uuid) {
        database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', selected: uuid }, 'accounts-selected');
        accountSelect(uuid);
      }
    }

    if ((await database.getAll('accounts')).length === 0) {
      changePanel('login');
      document.querySelector('.preload-content').style.display = 'none';
      return;
    }
    changePanel('home');
  }
  document.querySelector('.preload-content').style.display = 'none';
}

(async () => {
  initLog();
  console.log('Initializing Launcher...');
  if (process.platform === 'win32') initFrame();
  config = await getConfig().then((res) => res);
  database = await Database.init();
  createPanels(Login, Home, Settings);
  await getaccounts();
  client.login({ clientId: config.discordRPC.ClientID }).catch(console.error);

  client.on('ready', () => {
    client.request('SET_ACTIVITY', {
      pid: process.pid,
      activity: {
        state: config.discordRPC.State,
        timestamps: {
          start: Date.now(),
        },
        assets: {
          large_image: config.discordRPC.LargeImage,
          large_text: config.discordRPC.LargeImageText,
        },
        buttons: [
          {
            label: config.discordRPC.Button1,
            url: config.discordRPC.Url1,
          },
        ],
      },
    });
  });
})();
