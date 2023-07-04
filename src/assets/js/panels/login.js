import {
  changePanel, addAccount, accountSelect,
} from '../utils.js';
import Database from '../class/Database.js';

// eslint-disable-next-line import/no-unresolved
const { Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

class Login {
  static id = 'login';

  async init(config) {
    this.config = config;
    this.database = await Database.init();
    if (this.config.online) this.getOnline();
    else this.getOffline();
  }

  getOnline() {
    console.log('Initializing microsoft Panel...');
    console.log('Initializing mojang Panel...');
    this.loginMicrosoft();
    this.loginMojang();
    document.querySelector('.cancel-login').addEventListener('click', () => {
      document.querySelector('.cancel-login').style.display = 'none';
      changePanel('settings');
    });
  }

  getOffline() {
    console.log('Initializing microsoft Panel...');
    console.log('Initializing mojang Panel...');
    console.log('Initializing offline Panel...');
    this.loginMicrosoft();
    this.loginOffline();
    document.querySelector('.cancel-login').addEventListener('click', () => {
      document.querySelector('.cancel-login').style.display = 'none';
      changePanel('settings');
    });
  }

  loginMicrosoft() {
    const microsoftBtn = document.querySelector('.microsoft');
    const mojangBtn = document.querySelector('.mojang');
    const cancelBtn = document.querySelector('.cancel-login');

    microsoftBtn.addEventListener('click', () => {
      microsoftBtn.disabled = true;
      mojangBtn.disabled = true;
      cancelBtn.disabled = true;
      ipcRenderer.invoke('Microsoft-window', this.config.client_id).then((accountConnect) => {
        if (!accountConnect) {
          microsoftBtn.disabled = false;
          mojangBtn.disabled = false;
          cancelBtn.disabled = false;
          return;
        }

        const account = {
          access_token: accountConnect.access_token,
          client_token: accountConnect.client_token,
          uuid: accountConnect.uuid,
          name: accountConnect.name,
          refresh_token: accountConnect.refresh_token,
          user_properties: accountConnect.user_properties,
          meta: accountConnect.meta,
        };

        const profile = {
          uuid: accountConnect.uuid,
          skins: accountConnect.profile.skins || [],
          capes: accountConnect.profile.capes || [],
        };

        this.database.add(account, 'accounts');
        this.database.add(profile, 'profile');
        this.database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', selected: account.uuid }, 'accounts-selected');

        addAccount(account);
        accountSelect(account.uuid);
        changePanel('home');

        microsoftBtn.disabled = false;
        mojangBtn.disabled = false;
        cancelBtn.disabled = false;
        cancelBtn.style.display = 'none';
      }).catch((err) => {
        console.log(err);
        microsoftBtn.disabled = false;
        mojangBtn.disabled = false;
        cancelBtn.disabled = false;
      });
    });
  }

  async loginMojang() {
    const mailInput = document.querySelector('.Mail');
    const passwordInput = document.querySelector('.Password');
    const cancelMojangBtn = document.querySelector('.cancel-mojang');
    const infoLogin = document.querySelector('.info-login');
    const loginBtn = document.querySelector('.login-btn');
    const mojangBtn = document.querySelector('.mojang');

    mojangBtn.addEventListener('click', () => {
      document.querySelector('.login-card').style.display = 'none';
      document.querySelector('.login-card-mojang').style.display = 'block';
    });

    cancelMojangBtn.addEventListener('click', () => {
      document.querySelector('.login-card').style.display = 'block';
      document.querySelector('.login-card-mojang').style.display = 'none';
    });

    loginBtn.addEventListener('click', async () => {
      cancelMojangBtn.disabled = true;
      loginBtn.disabled = true;
      mailInput.disabled = true;
      passwordInput.disabled = true;
      infoLogin.innerHTML = 'Connexion en cours...';

      if (mailInput.value === '') {
        infoLogin.innerHTML = "Entrez votre adresse email / Nom d'utilisateur";
        cancelMojangBtn.disabled = false;
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        return;
      }

      if (passwordInput.value === '') {
        infoLogin.innerHTML = 'Entrez votre mot de passe';
        cancelMojangBtn.disabled = false;
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        return;
      }

      const accountConnect = await Mojang.login(mailInput.value, passwordInput.value);

      if (accountConnect == null || accountConnect.error) {
        cancelMojangBtn.disabled = false;
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        infoLogin.innerHTML = 'Adresse E-mail ou mot de passe invalide';
        return;
      }

      const account = {
        access_token: accountConnect.access_token,
        client_token: accountConnect.client_token,
        uuid: accountConnect.uuid,
        name: accountConnect.name,
        user_properties: accountConnect.user_properties,
        meta: {
          type: accountConnect.meta.type,
          offline: accountConnect.meta.offline,
        },
      };

      this.database.add(account, 'accounts');
      this.database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', selected: account.uuid }, 'accounts-selected');

      addAccount(account);
      accountSelect(account.uuid);
      changePanel('home');

      cancelMojangBtn.disabled = false;
      cancelMojangBtn.click();
      mailInput.value = '';
      loginBtn.disabled = false;
      mailInput.disabled = false;
      passwordInput.disabled = false;
      loginBtn.style.display = 'block';
      infoLogin.innerHTML = '&nbsp;';
    });
  }

  async loginOffline() {
    const mailInput = document.querySelector('.Mail');
    const passwordInput = document.querySelector('.Password');
    const cancelMojangBtn = document.querySelector('.cancel-mojang');
    const infoLogin = document.querySelector('.info-login');
    const loginBtn = document.querySelector('.login-btn');
    const mojangBtn = document.querySelector('.mojang');

    mojangBtn.innerHTML = 'Offline';

    mojangBtn.addEventListener('click', () => {
      document.querySelector('.login-card').style.display = 'none';
      document.querySelector('.login-card-mojang').style.display = 'block';
    });

    cancelMojangBtn.addEventListener('click', () => {
      document.querySelector('.login-card').style.display = 'block';
      document.querySelector('.login-card-mojang').style.display = 'none';
    });

    loginBtn.addEventListener('click', async () => {
      cancelMojangBtn.disabled = true;
      loginBtn.disabled = true;
      mailInput.disabled = true;
      passwordInput.disabled = true;
      infoLogin.innerHTML = 'Connexion en cours...';

      if (mailInput.value === '') {
        infoLogin.innerHTML = "Entrez votre adresse email / Nom d'utilisateur";
        cancelMojangBtn.disabled = false;
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        return;
      }

      if (mailInput.value.length < 3) {
        infoLogin.innerHTML = "Votre nom d'utilisateur doit avoir au moins 3 caractères";
        cancelMojangBtn.disabled = false;
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        return;
      }

      const accountConnect = await Mojang.login(mailInput.value, passwordInput.value);

      if (accountConnect == null || accountConnect.error) {
        cancelMojangBtn.disabled = false;
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        infoLogin.innerHTML = 'Adresse E-mail ou mot de passe invalide';
        return;
      }

      const account = {
        access_token: accountConnect.access_token,
        client_token: accountConnect.client_token,
        uuid: accountConnect.uuid,
        name: accountConnect.name,
        user_properties: accountConnect.user_properties,
        meta: {
          type: accountConnect.meta.type,
          offline: accountConnect.meta.offline,
        },
      };

      this.database.add(account, 'accounts');
      this.database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', selected: account.uuid }, 'accounts-selected');

      addAccount(account);
      accountSelect(account.uuid);
      changePanel('home');

      cancelMojangBtn.disabled = false;
      cancelMojangBtn.click();
      mailInput.value = '';
      loginBtn.disabled = false;
      mailInput.disabled = false;
      passwordInput.disabled = false;
      loginBtn.style.display = 'block';
      infoLogin.innerHTML = '&nbsp;';
    });
  }
}

export default Login;
