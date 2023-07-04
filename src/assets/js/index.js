import { getConfig } from './utils.js';

const { ipcRenderer } = require('electron');

const dev = process.env.NODE_ENV === 'dev';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

(() => {
  const splash = document.querySelector('.splash');
  const splashMessage = document.querySelector('.splash-message');
  const splashAuthor = document.querySelector('.splash-author');
  const message = document.querySelector('.message');
  const progress = document.querySelector('progress');

  function setProgress(value, max) {
    progress.value = value;
    progress.max = max;
  }

  function setStatus(text) {
    message.innerHTML = text;
  }

  function toggleProgress() {
    if (progress.classList.toggle('show')) setProgress(0, 1);
  }

  function startLauncher() {
    setStatus('Démarrage du launcher');
    ipcRenderer.send('main-window-open');
    ipcRenderer.send('update-window-close');
  }

  function shutdown(text) {
    setStatus(`${text}<br>Arrêt dans 5s`);
    const i = 4;
    setInterval(() => {
      setStatus(`${text}<br>Arrêt dans ${i - 1}s`);
      if (i < 0) ipcRenderer.send('update-window-close');
    }, 1000);
  }

  async function maintenanceCheck() {
    getConfig()
      .then((res) => {
        if (res.maintenance) return shutdown(res.maintenance_message);
        startLauncher();
        return null; // This line is added to ensure a consistent return
      })
      .catch((e) => {
        console.error(e);
        return shutdown('Aucune connexion internet détectée,<br>veuillez réessayer ultérieurement.');
      });
  }

  async function checkUpdate() {
    if (dev) {
      startLauncher();
    } else {
      setStatus('Recherche de mise à jour...');

      ipcRenderer.invoke('update-app').then((err) => {
        if (err.error) {
          const error = err.message;
          shutdown(`erreur lors de la recherche de mise à jour :<br>${error}`);
        }
      });

      ipcRenderer.on('updateAvailable', () => {
        setStatus('Mise à jour disponible !');
        toggleProgress();
        ipcRenderer.send('start-update');
      });

      ipcRenderer.on('download-progress', (_, downloadProgress) => {
        setProgress(progress.transferred, downloadProgress.total);
      });

      ipcRenderer.on('update-not-available', () => {
        maintenanceCheck();
      });
    }
  }

  async function startAnimation() {
    const splashes = [
      { message: "C'est INTEMPESTIBLE !", author: 'Tom.exe' },
      { message: "J'vais te cramer le cul !", author: 'TITANx5' },
      { message: 'T bo', author: 'TontonDemon' },
      { message: "Le vrai mais pas l'acteur !", author: 'TontonDemon' },
    ];
    const splashMessages = splashes[Math.floor(Math.random() * splashes.length)];
    splashMessage.textContent = splashMessages.message;
    splashAuthor.children[0].textContent = `@${splashMessages.author}`;
    await sleep(100);
    document.querySelector('#splash').style.display = 'block';
    await sleep(500);
    splash.classList.add('opacity');
    await sleep(500);
    splash.classList.add('translate');
    splashMessage.classList.add('opacity');
    splashAuthor.classList.add('opacity');
    message.classList.add('opacity');
    await sleep(1000);
    checkUpdate();
  }

  function onKeyDown(e) {
    if ((e.ctrlKey && e.shiftKey && e.key === 'I') || e.key === 'F12') {
      ipcRenderer.send('update-window-dev-tools');
    }
  }

  document.addEventListener('DOMContentLoaded', startAnimation);
  document.addEventListener('keydown', onKeyDown);
})();
