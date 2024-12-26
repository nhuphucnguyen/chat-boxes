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
        this.contextMenu = document.getElementById('tabContextMenu');
        this.deleteTabOption = document.getElementById('deleteTabOption');
        this.setupContextMenu();
    }

    setupContextMenu() {
        // Close context menu when clicking outside
        document.addEventListener('click', () => {
            this.contextMenu.classList.remove('show');
        });
        
        // Prevent context menu from closing when clicking inside it
        this.contextMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
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
        
        // Update context menu handling
        tabIcon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Position the context menu at cursor
            this.contextMenu.style.left = `${e.pageX}px`;
            this.contextMenu.style.top = `${e.pageY}px`;
            this.contextMenu.classList.add('show');
            
            // Update delete handler for this specific tab
            this.deleteTabOption.onclick = () => {
                this.removeTab(id);
                this.contextMenu.classList.remove('show');
            };
        });

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

    removeTab(id) {
        const tab = this.tabs.get(id);
        if (tab) {
            // Remove DOM elements
            tab.tabIcon.remove();
            tab.container.remove();
            
            // Remove from tabs Map
            this.tabs.delete(id);

            // If this was the active tab, activate another one if available
            if (this.activeTabId === id) {
                this.activeTabId = null;
                const nextTab = this.tabs.keys().next().value;
                if (nextTab) {
                    this.activateTab(nextTab);
                }
            }
        }
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

// Add click handler to hide context menu when clicking anywhere else
document.addEventListener('click', () => {
    const contextMenu = document.getElementById('tabContextMenu');
    contextMenu.classList.remove('show');
});
