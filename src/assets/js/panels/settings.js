import { changePanel, accountSelect } from '../utils.js';
import Database from '../class/Database.js';
import Slider from '../class/Slider.js';

const dataDirectory = process.env.APPDATA
  || (process.platform === 'darwin' ? `${process.env.HOME}/Library/Application Support` : process.env.HOME);

const os = require('os');

class Settings {
  static id = 'settings';

  async init(config) {
    this.config = config;
    this.database = await Database.init();
    this.initSettingsDefault();
    this.initTab();
    this.initAccount();
    this.initRam();
    this.initLauncherSettings();
  }

  initAccount() {
    document.querySelector('.accounts').addEventListener('click', async (e) => {
      const accountUUID = e.target.id;
      const selectedaccount = await this.database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'accounts-selected');

      if (e.path[0].classList.contains('account')) {
        accountSelect(accountUUID);
        this.database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', selected: accountUUID }, 'accounts-selected');
      }

      if (e.target.classList.contains('account-delete')) {
        this.database.delete(e.path[1].id, 'accounts');

        document.querySelector('.accounts').removeChild(e.path[1]);
        if (!document.querySelector('.accounts').children.length) {
          changePanel('login');
          return;
        }

        if (e.path[1].id === selectedaccount.value.selected) {
          const { uuid } = (await this.database.getAll('accounts'))[0].value;
          this.database.update(
            {
              uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ',
              selected: uuid,
            },
            'accounts-selected',
          );
          accountSelect(uuid);
        }
      }
    });

    document.querySelector('.add-account').addEventListener('click', () => {
      document.querySelector('.cancel-login').style.display = 'contents';
      changePanel('login');
    });
  }

  async initRam() {
    const ramDatabase = (await this.database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'ram'))?.value;
    const totalMem = Math.trunc((os.totalmem() / 1073741824) * 10) / 10;
    const freeMem = Math.trunc((os.freemem() / 1073741824) * 10) / 10;

    document.getElementById('total-ram').textContent = `${totalMem} Go`;
    document.getElementById('free-ram').textContent = `${freeMem} Go`;

    const sliderDiv = document.querySelector('.memory-slider');
    sliderDiv.setAttribute('max', Math.trunc((80 * totalMem) / 100));

    const ram = ramDatabase || { ramMin: '1', ramMax: '2' };
    const slider = new Slider('.memory-slider', parseFloat(ram.ramMin), parseFloat(ram.ramMax));

    const minSpan = document.querySelector('.slider-touch-left span');
    const maxSpan = document.querySelector('.slider-touch-right span');

    minSpan.setAttribute('value', `${ram.ramMin} Go`);
    maxSpan.setAttribute('value', `${ram.ramMax} Go`);

    slider.on('change', (min, max) => {
      minSpan.setAttribute('value', `${min} Go`);
      maxSpan.setAttribute('value', `${max} Go`);
      this.database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', ramMin: `${min}`, ramMax: `${max}` }, 'ram');
    });
  }

  async initJavaPath() {
    const javaDatabase = (await this.database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'java-path'))?.value?.path;
    const javaPath = javaDatabase || 'Utiliser la version de java livre avec le launcher';
    document.querySelector('.info-path').textContent = `${dataDirectory.replace(/\\/g, '/')}/${
      process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`
    }/runtime`;

    const path = document.querySelector('.path');
    path.value = javaPath;
    const file = document.querySelector('.path-file');

    document.querySelector('.path-button').addEventListener('click', async () => {
      file.value = '';
      file.click();
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (file.value !== '') resolve(clearInterval(interval));
        }, 100);
      });

      if (file.value.replace('.exe', '').endsWith('java') || file.value.replace('.exe', '').endsWith('javaw')) {
        this.database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', path: file.value }, 'java-path');
        path.value = file.value.replace(/\\/g, '/');
      } else alert('Le nom du fichier doit être java ou javaw');
    });

    document.querySelector('.path-button-reset').addEventListener('click', () => {
      path.value = 'Utiliser la version de java livre avec le launcher';
      file.value = '';
      this.database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', path: false }, 'java-path');
    });
  }

  async initJavaArgs() {
    const javaArgsDatabase = (await this.database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'java-args'))?.value?.args;
    let argsInput = document.querySelector('.args-settings');

    if (javaArgsDatabase?.length) argsInput.value = javaArgsDatabase.join(' ');

    document.querySelector('.args-settings').addEventListener('change', () => {
      const args = [];
      try {
        if (argsInput.value.length) {
          argsInput = argsInput.value.trim().split(/\s+/);
          argsInput.forEach((arg) => {
            if (arg !== '' && arg !== '--server' && arg !== '--port') {
              args.push(arg);
            }
          });
        }
      } finally {
        this.database.update({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', args }, 'java-args');
      }
    });
  }

  async initLauncherSettings() {
    const launcherDatabase = (await this.database.get('KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', 'launcher'))?.value;
    const settingsLauncher = {
      uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ',
      launcher: {
        close: launcherDatabase?.launcher?.close || 'close-launcher',
      },
    };

    const closeLauncher = document.getElementById('launcher-close');
    const closeAll = document.getElementById('launcher-close-all');
    const openLauncher = document.getElementById('launcher-open');

    if (settingsLauncher.launcher.close === 'close-launcher') {
      closeLauncher.checked = true;
    } else if (settingsLauncher.launcher.close === 'close-all') {
      closeAll.checked = true;
    } else if (settingsLauncher.launcher.close === 'open-launcher') {
      openLauncher.checked = true;
    }

    closeLauncher.addEventListener('change', () => {
      if (closeLauncher.checked) {
        openLauncher.checked = false;
        closeAll.checked = false;
      }
      if (!closeLauncher.checked) closeLauncher.checked = true;
      settingsLauncher.launcher.close = 'close-launcher';
      this.database.update(settingsLauncher, 'launcher');
    });

    closeAll.addEventListener('change', () => {
      if (closeAll.checked) {
        closeLauncher.checked = false;
        openLauncher.checked = false;
      }
      if (!closeAll.checked) closeAll.checked = true;
      settingsLauncher.launcher.close = 'close-all';
      this.database.update(settingsLauncher, 'launcher');
    });

    openLauncher.addEventListener('change', () => {
      if (openLauncher.checked) {
        closeLauncher.checked = false;
        closeAll.checked = false;
      }
      if (!openLauncher.checked) openLauncher.checked = true;
      settingsLauncher.launcher.close = 'open-launcher';
      this.database.update(settingsLauncher, 'launcher');
    });
  }

  initTab() {
    const TabBtn = document.querySelectorAll('.tab-btn');
    const TabContent = document.querySelectorAll('.tabs-settings-content');

    for (let i = 0; i < TabBtn.length; i++) {
      TabBtn[i].addEventListener('click', () => {
        if (TabBtn[i].classList.contains('save-tabs-btn')) return;
        for (let j = 0; j < TabBtn.length; j++) {
          TabContent[j].classList.remove('active-tab-content');
          TabBtn[j].classList.remove('active-tab-btn');
        }
        TabContent[i].classList.add('active-tab-content');
        TabBtn[i].classList.add('active-tab-btn');
      });
    }

    document.querySelector('.save-tabs-btn').addEventListener('click', () => {
      document.querySelector('.default-tab-btn').click();
      changePanel('home');
    });
  }

  async initSettingsDefault() {
    if (!(await this.database.getAll('accounts-selected')).length) {
      this.database.add({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ' }, 'accounts-selected');
    }

    if (!(await this.database.getAll('java-path')).length) {
      this.database.add({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', path: false }, 'java-path');
    }

    if (!(await this.database.getAll('java-args')).length) {
      this.database.add({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', args: [] }, 'java-args');
    }

    if (!(await this.database.getAll('launcher')).length) {
      this.database.add(
        {
          uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ',
          launcher: {
            close: 'close-launcher',
          },
        },
        'launcher',
      );
    }

    if (!(await this.database.getAll('ram')).length) {
      this.database.add({ uuid: 'KanoshireModde-m6S0xQVDjtwj8BHf61KfGlXJ', ramMin: '1', ramMax: '2' }, 'ram');
    }
  }
}
export default Settings;
