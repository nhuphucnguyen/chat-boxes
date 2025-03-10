// Add UUID generation function at the top
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Simple hash function for PINs
function hashPin(pin) {
    // This is a simple hash for demonstration purposes
    // In a production app, use a more secure hashing algorithm
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
        const char = pin.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

class TabManager {
    constructor() {
        console.log('TabManager constructor called');
        this.tabs = new Map();
        this.activeTabId = null;
        this.pendingTabActivation = null;
        this.pendingPinRemoval = null; // New variable to track tab ID for PIN removal
        this.sidebar = document.getElementById('sidebar');
        this.content = document.getElementById('content');
        this.contextMenu = document.getElementById('tabContextMenu');
        this.deleteTabOption = document.getElementById('deleteTabOption');
        this.reloadTabOption = document.getElementById('reloadTabOption');
        this.setPinOption = document.getElementById('setPinOption');
        this.removePinOption = document.getElementById('removePinOption');
        
        // PIN setup modal elements
        this.pinSetupModal = document.getElementById('pinSetupModal');
        this.pinSetupInput = document.getElementById('pinSetupInput');
        this.cancelPinSetupButton = document.getElementById('cancelPinSetupButton');
        this.savePinButton = document.getElementById('savePinButton');
        
        // PIN entry modal elements
        this.pinEntryModal = document.getElementById('pinEntryModal');
        this.pinEntryInput = document.getElementById('pinEntryInput');
        this.cancelPinEntryButton = document.getElementById('cancelPinEntryButton');
        this.checkPinButton = document.getElementById('checkPinButton');
        
        this.setupContextMenu();
        this.setupPinModals();
        
        window.electron.onLoadTabs((tabs) => this.loadTabs(tabs));
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
    
    setupPinModals() {
        // PIN setup modal handlers
        this.cancelPinSetupButton.onclick = () => {
            this.pinSetupModal.classList.remove('show');
            this.pinSetupInput.value = '';
        };
        
        this.savePinButton.onclick = () => {
            const pin = this.pinSetupInput.value;
            if (pin.length === 6 && /^\d{6}$/.test(pin)) {
                this.setPinForTab(this.activeTabId, pin);
                this.pinSetupModal.classList.remove('show');
                this.pinSetupInput.value = '';
            } else {
                alert('Please enter a 6-digit PIN');
            }
        };
        
        // PIN entry modal handlers
        this.cancelPinEntryButton.onclick = () => {
            this.pinEntryModal.classList.remove('show');
            this.pinEntryInput.value = '';
            this.pendingTabActivation = null;
            this.pendingPinRemoval = null;
        };
        
        this.checkPinButton.onclick = () => {
            const pin = this.pinEntryInput.value;
            
            // Check if this is for PIN removal or tab activation
            if (this.pendingPinRemoval) {
                const tabId = this.pendingPinRemoval;
                
                if (this.verifyPinForTab(tabId, pin)) {
                    // PIN is correct, proceed with removal
                    this.pinEntryModal.classList.remove('show');
                    this.pinEntryInput.value = '';
                    
                    // Actually remove the PIN
                    this.performPinRemoval(tabId);
                } else {
                    alert('Incorrect PIN');
                    this.pinEntryInput.value = '';
                }
                
                // Reset the pending removal
                this.pendingPinRemoval = null;
            } 
            else if (this.pendingTabActivation) {
                const tabId = this.pendingTabActivation;
                
                if (this.verifyPinForTab(tabId, pin)) {
                    this.pinEntryModal.classList.remove('show');
                    this.pinEntryInput.value = '';
                    this.completeTabActivation(tabId);
                } else {
                    alert('Incorrect PIN');
                    this.pinEntryInput.value = '';
                }
            }
        };
    }
    
    loadTabs(tabs) {
        tabs.forEach(tab => {
            this.createTab(tab.url, tab.id, tab.icon, tab.pinHash);
        });
    }
    
    createTab(url, id = generateUUID(), icon = '', pinHash = null) {
        console.log('Creating tab with URL:', url);
        
        // Find matching app for the URL to get its icon if not provided
        if (!icon) {
            const apps = window.electron.getApps();
            const app = apps.find(app => app.url === url);
            icon = app ? app.icon : '';
        }
        
        // Create tab icon
        const tabIcon = document.createElement('div');
        tabIcon.className = 'tab-icon';
        if (pinHash) {
            tabIcon.classList.add('pin-protected');
        }
        tabIcon.innerHTML = `<img src="${icon}" alt="Tab Icon">`;
        tabIcon.onclick = () => this.activateTab(id);
        
        // Update context menu handling
        tabIcon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Position the context menu at cursor
            this.contextMenu.style.left = `${e.pageX}px`;
            this.contextMenu.style.top = `${e.pageY}px`;
            
            // Show/hide PIN options based on whether the tab has a PIN
            const tab = this.tabs.get(id);
            if (tab && tab.pinHash) {
                this.setPinOption.style.display = 'none';
                this.removePinOption.style.display = 'block';
            } else {
                this.setPinOption.style.display = 'block';
                this.removePinOption.style.display = 'none';
            }
            
            this.contextMenu.classList.add('show');
            
            // Update reload handler for this specific tab
            this.reloadTabOption.onclick = () => {
                this.contextMenu.classList.remove('show');
                this.reloadTab(id);
            };
            
            // Update set PIN handler for this specific tab
            this.setPinOption.onclick = () => {
                this.contextMenu.classList.remove('show');
                this.showPinSetupModal(id);
            };
            
            // Update remove PIN handler for this specific tab
            this.removePinOption.onclick = () => {
                this.contextMenu.classList.remove('show');
                this.showPinVerificationForRemoval(id);
            };
            
            // Update delete handler for this specific tab
            this.deleteTabOption.onclick = () => {
                this.contextMenu.classList.remove('show');
                if (confirm('Are you sure you want to remove this tab?')) {
                    this.removeTab(id);
                }
            };
        });
        
        this.sidebar.appendChild(tabIcon);
        
        // Create webview container with partition
        const container = document.createElement('div');
        container.className = 'webview-container';
        
        // Create partition name if it doesn't exist
        const partition = `persist:tab_${id}`;
        const webview = this.createWebView(url, partition);
        container.appendChild(webview);
        this.content.appendChild(container);
        
        this.tabs.set(id, { tabIcon, container, webview, pinHash });
        this.activateTab(id);
        this.saveTabs();
    }
    
    createWebView(url, partition) {
        const webview = document.createElement('webview');
        webview.setAttribute('src', url);
        webview.setAttribute('partition', partition);
        // Add Chrome user agent to bypass WhatsApp's Electron detection
        webview.setAttribute('useragent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.23 Safari/537.36');
        // Set other necessary attributes
        webview.setAttribute('allowpopups', 'true');
        webview.setAttribute('webpreferences', 'nodeIntegration=false, contextIsolation=true');
        
        return webview;
    }
    
    activateTab(id) {
        console.log('Activating tab with ID:', id);
        
        // Check if tab is PIN protected
        const tab = this.tabs.get(id);
        if (tab && tab.pinHash) {
            // Store the pending activation and show PIN entry modal
            this.pendingTabActivation = id;
            this.showPinEntryModal();
            return;
        }
        
        // If not PIN protected, activate the tab directly
        this.completeTabActivation(id);
    }
    
    completeTabActivation(id) {
        // Deactivate current active tab
        if (this.activeTabId) {
            const oldTab = this.tabs.get(this.activeTabId);
            oldTab.tabIcon.classList.remove('active');
            oldTab.container.classList.remove('active');
        }
        
        // Activate new tab
        const newTab = this.tabs.get(id);
        newTab.tabIcon.classList.add('active');
        newTab.container.classList.add('active');
        this.activeTabId = id;
    }
    
    showPinSetupModal() {
        this.pinSetupModal.classList.add('show');
        this.pinSetupInput.focus();
    }
    
    showPinEntryModal() {
        // Update modal title and message based on the operation
        const modalTitle = document.querySelector('#pinEntryModal h3');
        const modalMessage = document.querySelector('#pinEntryModal p');
        
        if (this.pendingPinRemoval) {
            modalTitle.textContent = 'Verify PIN';
            modalMessage.textContent = 'Enter the current PIN to remove protection';
        } else {
            modalTitle.textContent = 'Enter PIN';
            modalMessage.textContent = 'This tab is PIN protected';
        }
        
        this.pinEntryModal.classList.add('show');
        this.pinEntryInput.focus();
    }
    
    setPinForTab(id, pin) {
        const tab = this.tabs.get(id);
        if (tab) {
            const pinHash = hashPin(pin);
            tab.pinHash = pinHash;
            tab.tabIcon.classList.add('pin-protected');
            this.saveTabs();
        }
    }
    
    showPinVerificationForRemoval(id) {
        // Store the ID of the tab whose PIN we want to remove
        this.pendingPinRemoval = id;
        
        // Update the modal title and message to indicate PIN removal
        const modalTitle = document.querySelector('#pinEntryModal h3');
        const modalMessage = document.querySelector('#pinEntryModal p');
        
        modalTitle.textContent = 'Verify PIN';
        modalMessage.textContent = 'Enter the current PIN to remove protection';
        
        // Show the modal
        this.showPinEntryModal();
    }
    
    // New method to actually perform PIN removal after verification
    performPinRemoval(id) {
        const tab = this.tabs.get(id);
        if (tab) {
            tab.pinHash = null;
            tab.tabIcon.classList.remove('pin-protected');
            this.saveTabs();
        }
    }
    
    // Remove the direct PIN removal function since we now use verification
    removePinFromTab(id) {
        this.showPinVerificationForRemoval(id);
    }
    
    verifyPinForTab(id, pin) {
        const tab = this.tabs.get(id);
        if (tab && tab.pinHash) {
            const inputPinHash = hashPin(pin);
            return inputPinHash === tab.pinHash;
        }
        return false;
    }
    
    saveTabs() {
        const tabs = Array.from(this.tabs.entries()).map(([id, tab]) => ({
            url: tab.webview.getAttribute('src'),
            id: id,
            icon: tab.tabIcon.querySelector('img').src,
            partition: tab.webview.getAttribute('partition'),
            pinHash: tab.pinHash || null
        }));
        window.electron.saveTabs(tabs);
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
            this.saveTabs();
        }
    }
    
    reloadTab(id) {
        const tab = this.tabs.get(id);
        if (tab) {
            tab.webview.reload();
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

// Add keyboard event listeners for PIN input fields
document.getElementById('pinSetupInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('savePinButton').click();
    }
});

document.getElementById('pinEntryInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('checkPinButton').click();
    }
});
