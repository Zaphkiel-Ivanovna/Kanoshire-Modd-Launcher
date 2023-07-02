/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

'use strict';

import { logger, database, changePanel } from '../utils.js';

const { Launch, Status } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');
const launch = new Launch();
const pkg = require('../package.json');
const fs = require('fs');
const { readForgeMod, ForgeModMetadata } = require('@xmcl/mod-parser');

const dataDirectory =
  process.env.APPDATA ||
  (process.platform == 'darwin'
    ? `${process.env.HOME}/Library/Application Support`
    : process.env.HOME);

class Home {
  static id = 'home';
  async init(config) {
    this.config = config;
    this.gameFolder = `${dataDirectory}/${
      process.platform == 'darwin'
        ? this.config.dataDirectory
        : `.${this.config.dataDirectory}`
    }`;
    this.database = await new database().init();
    this.initLaunch();
    this.initStatusServer();
    this.initBtn();
    this.initModList(this.gameFolder);
  }

  async initModList(gameFolder) {
    fs.readdir(`${gameFolder}/mods`, function (err, files) {
      if (err) {
        return console.log('Unable to scan directory: ' + err);
      }
      let table = document.querySelector('.table-style');
      files.forEach(async function (file) {
        try {
          const { modsToml } = await readForgeMod(`${gameFolder}/mods/${file}`);
          let row = document.createElement('tr');
          let modName = document.createElement('td');
          modName.textContent = modsToml[0].displayName;
          let modVersion = document.createElement('td');
          modVersion.textContent = modsToml[0].version;

          row.appendChild(modName);
          row.appendChild(modVersion);

          table.appendChild(row);
          console.log(modsToml[0]);
        } catch (error) {
          console.log(`Cannot get ${file} mod name`);
        }
      });
    });
  }

  async initLaunch() {
    document.querySelector('.play-btn').addEventListener('click', async () => {
      let urlpkg = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
      let uuid = (await this.database.get('1234', 'accounts-selected')).value;
      let account = (await this.database.get(uuid.selected, 'accounts')).value;
      let ram = (await this.database.get('1234', 'ram')).value;
      let Resolution = (await this.database.get('1234', 'screen')).value;
      let launcherSettings = (await this.database.get('1234', 'launcher'))
        .value;

      let playBtn = document.querySelector('.play-btn');
      let downloadSpeed = document.querySelector('.download-speed');
      let info = document.querySelector('.text-download');
      let progressBar = document.querySelector('.progress-bar');

      if (Resolution.screen.width == '<auto>') {
        screen = false;
      } else {
        screen = {
          width: Resolution.screen.width,
          height: Resolution.screen.height,
        };
      }

      let opts = {
        url:
          this.config.game_url === '' || this.config.game_url === undefined
            ? `${urlpkg}/files`
            : this.config.game_url,
        authenticator: account,
        timeout: 10000,
        path: `${dataDirectory}/${
          process.platform == 'darwin'
            ? this.config.dataDirectory
            : `.${this.config.dataDirectory}`
        }`,
        version: this.config.game_version,
        detached:
          launcherSettings.launcher.close === 'close-all' ? false : true,
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
          (progress / size) *
          100
        ).toFixed(0)}%`;
        ipcRenderer.send('main-window-progress', { progress, size });
        progressBar.value = progress;
        progressBar.max = size;
      });

      launch.on('check', (progress, size) => {
        progressBar.style.display = 'block';
        downloadSpeed.style.display = 'none';
        document.querySelector('.text-download').innerHTML = `Vérification ${(
          (progress / size) *
          100
        ).toFixed(0)}%`;
        progressBar.value = progress;
        progressBar.max = size;
      });

      launch.on('estimated', (time) => {
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time - hours * 3600) / 60);
        let seconds = Math.floor(time - hours * 3600 - minutes * 60);
        console.log(`${hours}h ${minutes}m ${seconds}s`);
      });

      launch.on('speed', (speed) => {
        console.log(`${(speed / 1067008).toFixed(2)} Mb/s`);
        downloadSpeed.style.display = 'block';
        document.querySelector(
          '.download-speed'
        ).innerHTML = `Vitesse de téléchargement : ${(speed / 1067008).toFixed(
          2
        )} Mb/s`;
      });

      launch.on('patch', (patch) => {
        console.log(patch);
        info.innerHTML = `Patch en cours...`;
      });

      launch.on('data', (e) => {
        new logger('Minecraft', '#36b030');
        if (launcherSettings.launcher.close === 'close-launcher')
          ipcRenderer.send('main-window-hide');
        ipcRenderer.send('main-window-progress-reset');
        progressBar.style.display = 'none';
        downloadSpeed.style.display = 'none';
        info.innerHTML = `Demarrage en cours...`;
        console.log(e);
      });

      launch.on('close', (code) => {
        if (launcherSettings.launcher.close === 'close-launcher')
          ipcRenderer.send('main-window-show');
        progressBar.style.display = 'none';
        info.style.display = 'none';
        playBtn.style.display = 'block';
        info.innerHTML = `Vérification`;
        new logger('Launcher', '#7289da');
        console.log('Close');
      });

      launch.on('error', (err) => {
        console.log(err);
      });
    });
  }

  async initStatusServer() {
    let nameServer = document.querySelector('.server-text .name');
    let serverMs = document.querySelector('.server-text .desc');
    let playersConnected = document.querySelector('.etat-text .text');
    let online = document.querySelector('.etat-text .online');
    let serverPing = await new Status(
      this.config.status.ip,
      this.config.status.port
    ).getStatus();

    nameServer.textContent = this.config.status.nameServer;

    if (!serverPing.error) {
      serverMs.innerHTML = `<span class="green">En ligne</span> - ${serverPing.ms}ms`;
      online.classList.toggle('off');
      playersConnected.textContent = serverPing.playersConnect;
    } else if (serverPing.error) {
      nameServer.textContent = 'Serveur indisponible';
      serverMs.innerHTML = `<span class="red">Hors ligne</span>`;
    }
  }

  initBtn() {
    document.querySelector('.settings-btn').addEventListener('click', () => {
      changePanel('settings');
    });
  }

  async getdate(e) {
    let date = new Date(e);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let allMonth = [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ];
    return { year: year, month: allMonth[month - 1], day: day };
  }
}
export default Home;
