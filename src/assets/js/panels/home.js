import { changePanel } from '../utils.js';
import Logger from '../class/Logger.js';
import Database from '../class/Database.js';

// eslint-disable-next-line import/no-unresolved
const { Launch, Status } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

const launch = new Launch();
const fs = require('fs');
const { readForgeMod } = require('@xmcl/mod-parser');
// eslint-disable-next-line import/no-unresolved
const pkg = require('../package.json');

const dataDirectory = process.env.APPDATA
  || (process.platform === 'darwin'
    ? `${process.env.HOME}/Library/Application Support`
    : process.env.HOME);

class Home {
  static id = 'home';

  async init(config) {
    this.config = config;
    this.gameFolder = `${dataDirectory}/${
      process.platform === 'darwin'
        ? this.config.dataDirectory
        : `.${this.config.dataDirectory}`
    }`;
    this.database = await Database.init();
    this.initLaunch();
    this.initStatusServer();

    document.querySelector('.settings-btn').addEventListener('click', () => {
      changePanel('settings');
    });

    fs.readdir(`${this.gameFolder}/mods`, (err, files) => {
      if (err) {
        return console.log(`Unable to scan directory: ${err}`);
      }
      const table = document.querySelector('.table-style');
      return files.forEach(async (file) => {
        try {
          const { modsToml } = await readForgeMod(`${this.gameFolder}/mods/${file}`);
          const row = document.createElement('tr');
          const modName = document.createElement('td');
          modName.textContent = modsToml[0].displayName;
          const modVersion = document.createElement('td');
          modVersion.textContent = modsToml[0].version;

          row.appendChild(modName);
          row.appendChild(modVersion);

          table.appendChild(row);
        } catch (error) {
          console.log(`Cannot get ${file} mod name`);
        }
      });
    });
  }

  async initLaunch() {
    document.querySelector('.play-btn').addEventListener('click', async () => {
      const urlpkg = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
      const uuid = (await this.database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'accounts-selected')).value;
      const account = (await this.database.get(uuid.selected, 'accounts')).value;
      const ram = (await this.database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'ram')).value;
      const launcherSettings = (await this.database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'launcher'))
        .value;

      const playBtn = document.querySelector('.play-btn');
      const downloadSpeed = document.querySelector('.download-speed');
      const info = document.querySelector('.text-download');
      const progressBar = document.querySelector('.progress-bar');

      const opts = {
        url:
          this.config.game_url === '' || this.config.game_url === undefined
            ? `${urlpkg}/files`
            : this.config.game_url,
        authenticator: account,
        timeout: 10000,
        path: `${dataDirectory}/${
          process.platform === 'darwin'
            ? this.config.dataDirectory
            : `.${this.config.dataDirectory}`
        }`,
        version: this.config.game_version,
        detached:
          launcherSettings.launcher.close !== 'close-all',
        downloadFileMultiple: 30,

        loader: {
          type: this.config.loader.type,
          build: this.config.loader.build,
          enable: this.config.loader.enable,
        },

        verify: this.config.verify,
        ignored: ['loader', ...this.config.ignored],

        java: true,

        memory: {
          min: `${ram.ramMin * 1024}M`,
          max: `${ram.ramMax * 1024}M`,
        },
      };

      playBtn.style.display = 'none';
      info.style.display = 'block';
      launch.Launch(opts);

      launch.on('extract', (extract) => {
        console.log(extract);
      });

      launch.on('progress', (progress, size) => {
        progressBar.style.display = 'block';
        document.querySelector('.text-download').innerHTML = `Téléchargement ${(
          (progress / size)
          * 100
        ).toFixed(0)}%`;
        ipcRenderer.send('main-window-progress', { progress, size });
        progressBar.value = progress;
        progressBar.max = size;
      });

      launch.on('check', (progress, size) => {
        progressBar.style.display = 'block';
        downloadSpeed.style.display = 'none';
        document.querySelector('.text-download').innerHTML = `Vérification ${(
          (progress / size)
          * 100
        ).toFixed(0)}%`;
        progressBar.value = progress;
        progressBar.max = size;
      });

      launch.on('estimated', (time) => {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time - hours * 3600) / 60);
        const seconds = Math.floor(time - hours * 3600 - minutes * 60);
        console.log(`${hours}h ${minutes}m ${seconds}s`);
      });

      launch.on('speed', (speed) => {
        console.log(`${(speed / 1067008).toFixed(2)} Mb/s`);
        downloadSpeed.style.display = 'block';
        document.querySelector(
          '.download-speed',
        ).innerHTML = `Vitesse de téléchargement : ${(speed / 1067008).toFixed(
          2,
        )} Mb/s`;
      });

      launch.on('patch', (patch) => {
        console.log(patch);
        info.innerHTML = 'Patch en cours...';
      });

      launch.on('data', (e) => {
        Logger('Minecraft', '#36b030');
        if (launcherSettings.launcher.close === 'close-launcher') ipcRenderer.send('main-window-hide');
        ipcRenderer.send('main-window-progress-reset');
        progressBar.style.display = 'none';
        downloadSpeed.style.display = 'none';
        info.innerHTML = 'Demarrage en cours...';
        console.log(e);
      });

      launch.on('close', () => {
        if (launcherSettings.launcher.close === 'close-launcher') ipcRenderer.send('main-window-show');
        progressBar.style.display = 'none';
        info.style.display = 'none';
        playBtn.style.display = 'block';
        info.innerHTML = 'Vérification';
        Logger('Launcher', '#7289da');
        console.log('Close');
      });

      launch.on('error', (err) => {
        console.log(err);
      });
    });
  }

  async initStatusServer() {
    const nameServer = document.querySelector('.server-text .name');
    const serverMs = document.querySelector('.server-text .desc');
    const playersConnected = document.querySelector('.etat-text .text');
    const online = document.querySelector('.etat-text .online');
    const serverPing = await new Status(
      this.config.status.ip,
      this.config.status.port,
    ).getStatus();

    nameServer.textContent = this.config.status.nameServer;

    if (!serverPing.error) {
      serverMs.innerHTML = `<span class="green">En ligne</span> - ${serverPing.ms}ms`;
      online.classList.toggle('off');
      playersConnected.textContent = serverPing.playersConnect;
    } else if (serverPing.error) {
      nameServer.textContent = 'Serveur indisponible';
      serverMs.innerHTML = '<span class="red">Hors ligne</span>';
    }
  }
}
export default Home;
