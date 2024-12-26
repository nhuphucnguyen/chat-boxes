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
        const id = Date.now().toString();
        
        // Create tab icon
        const tabIcon = document.createElement('div');
        tabIcon.className = 'tab-icon';
        tabIcon.innerHTML = this.tabs.size + 1;
        tabIcon.onclick = () => this.activateTab(id);
        this.sidebar.appendChild(tabIcon);

        // Create webview container
        const container = document.createElement('div');
        container.className = 'webview-container';
        const webview = document.createElement('webview');
        webview.src = url;
        container.appendChild(webview);
        this.content.appendChild(container);

        this.tabs.set(id, { tabIcon, container, webview });
        this.activateTab(id);
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

// Test URL for development
tabManager.createTab('https://www.google.com');
