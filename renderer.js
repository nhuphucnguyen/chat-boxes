// Add UUID generation function at the top
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class TabManager {
    constructor() {
        console.log('TabManager constructor called');
        this.tabs = new Map();
        this.activeTabId = null;
        this.sidebar = document.getElementById('sidebar');
        this.content = document.getElementById('content');
    }

    createTab(url) {
        console.log('Creating tab with URL:', url);
        const id = generateUUID();
        
        // Find matching app for the URL to get its icon
        const apps = window.electron.getApps();
        const app = apps.find(app => app.url === url);
        const icon = app ? app.icon : '';

        // Create tab icon
        const tabIcon = document.createElement('div');
        tabIcon.className = 'tab-icon';
        tabIcon.innerHTML = `<img src="${icon}" alt="Tab Icon">`;
        tabIcon.onclick = () => this.activateTab(id);
        this.sidebar.appendChild(tabIcon);

        // Create webview container with unique partition
        const container = document.createElement('div');
        container.className = 'webview-container';
        const webview = this.createWebView(url);
        container.appendChild(webview);
        this.content.appendChild(container);

        this.tabs.set(id, { tabIcon, container, webview });
        this.activateTab(id);
    }

    createWebView(url) {
        const webview = document.createElement('webview');
        webview.setAttribute('src', url);
        // Use UUID for partition name
        const partition = `persist:tab_${generateUUID()}`;
        webview.setAttribute('partition', partition);
        // Add Chrome user agent to bypass WhatsApp's Electron detection
        webview.setAttribute('useragent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.137 Safari/537.36');
        // Set other necessary attributes
        webview.setAttribute('allowpopups', 'true');
        webview.setAttribute('webpreferences', 'nodeIntegration=false, contextIsolation=true');
        
        return webview;
    }

    activateTab(id) {
        console.log('Activating tab with ID:', id);
        if (this.activeTabId) {
            const oldTab = this.tabs.get(this.activeTabId);
            oldTab.tabIcon.classList.remove('active');
            oldTab.container.classList.remove('active');
        }

        const newTab = this.tabs.get(id);
        newTab.tabIcon.classList.add('active');
        newTab.container.classList.add('active');
        this.activeTabId = id;
    }
}

const tabManager = new TabManager();

window.electron.onCreateTab((url) => {
    console.log('Creating tab with URL:', url);
    tabManager.createTab(url);
});

function showUrlModal() {
    const modal = document.getElementById('urlModal');
    const appsGrid = document.getElementById('appsGrid');
    const cancelButton = document.getElementById('cancelButton');

    // Clear existing apps
    appsGrid.innerHTML = '';

    // Load apps from the exposed API
    const apps = window.electron.getApps();

    // Create app items
    apps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-item';
        appItem.innerHTML = `
            <img src="${app.icon}" class="app-icon" alt="${app.name}">
            <div class="app-name">${app.name}</div>
        `;
        appItem.onclick = () => {
            window.electron.createInstance(app.url);
            modal.classList.remove('show');
        };
        appsGrid.appendChild(appItem);
    });

    modal.classList.add('show');

    cancelButton.onclick = () => {
        modal.classList.remove('show');
    };
}

const newInstanceIcon = document.getElementById('new-instance-icon');
newInstanceIcon.onclick = showUrlModal;
