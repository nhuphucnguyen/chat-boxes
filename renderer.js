const { ipcRenderer } = require('electron');

document.getElementById('launchBtn').addEventListener('click', () => {
    const select = document.getElementById('appSelect');
    const url = select.value;
    ipcRenderer.send('create-instance', url);
});
