function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('message');
    messageDiv.style.color = isError ? 'red' : 'green'; 
    messageDiv.innerText = message;

    setTimeout(() => {
        messageDiv.innerText = '';
    }, 3000);
}

function saveSelectedSheetAndTab(sheetId, tabName) {
    localStorage.setItem('selectedSheet', sheetId);
    localStorage.setItem('selectedTab', tabName);
}

function loadSelectedSheetAndTab() {
    const savedSheet = localStorage.getItem('selectedSheet');
    const savedTab = localStorage.getItem('selectedTab');
    return { sheet: savedSheet, tab: savedTab };
}

function storeInputValues() {
    const values = {};
    document.querySelectorAll('#data-entry-fields input').forEach(input => {
        values[input.id] = input.value;
    });
    localStorage.setItem('dataEntryValues', JSON.stringify(values));
}

function loadInputValues() {
    const savedValues = localStorage.getItem('dataEntryValues');
    if (savedValues) {
        const values = JSON.parse(savedValues);
        document.querySelectorAll('#data-entry-fields input').forEach(input => {
            if (values[input.id]) {
                input.value = values[input.id];
            }
        });
    }
}

function clearInputFields() {
    localStorage.removeItem('dataEntryValues');
    document.querySelectorAll('#data-entry-fields input').forEach(input => {
        input.value = '';
    });
}

async function fetchAllSheets(token) {
    let allSheets = localStorage.getItem('cachedSheets'); 
    if (allSheets) {
        return JSON.parse(allSheets); 
    }

    let sheetsData = [];
    let nextPageToken = null;
    const baseURL = 'https://www.googleapis.com/drive/v3/files';
    const query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";

    try {
        do {
            const response = await fetch(`${baseURL}?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name)&pageSize=100${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error fetching sheets: ${response.status} ${response.statusText}\n${errorText}`);
                showMessage(`Error fetching sheets: ${response.status} ${response.statusText}`, true);
                throw new Error(`Error fetching sheets: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            sheetsData = sheetsData.concat(data.files);
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        localStorage.setItem('cachedSheets', JSON.stringify(sheetsData));

        return sheetsData;

    } catch (error) {
        console.error("Error fetching sheets:", error);
        showMessage(`Error fetching sheets: ${error.message}`, true);
        return [];
    }
}

async function fetchAllTabs(token, sheetId) {
    let cachedTabs = localStorage.getItem(`cachedTabs_${sheetId}`); 
    if (cachedTabs) {
        return JSON.parse(cachedTabs);
    }

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error fetching tabs: ${response.status} ${response.statusText}\n${errorText}`);
            showMessage(`Error fetching tabs: ${response.status} ${response.statusText}`, true);
            throw new Error(`Error fetching tabs: ${response.status} ${response.statusText}`);
        }

        const sheetData = await response.json();
        const tabs = sheetData.sheets.map(sheet => sheet.properties.title);

        localStorage.setItem(`cachedTabs_${sheetId}`, JSON.stringify(tabs));

        return tabs;
    } catch (error) {
        console.error("Error fetching tabs:", error);
        showMessage(`Error fetching tabs: ${error.message}`, true);
        return [];
    }
}

async function fetchColumns(token, sheetId, tabName) {
    const cacheKey = `cachedColumns_${sheetId}_${tabName}`;
    const cachedColumns = localStorage.getItem(cacheKey); 
    if (cachedColumns) {
        return JSON.parse(cachedColumns);
    }

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}!A1:Z1`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error fetching columns: ${response.status} ${response.statusText}\n${errorText}`);
            showMessage(`Error fetching columns: ${response.status} ${response.statusText}`, true);
            throw new Error(`Error fetching columns: ${response.status} ${response.statusText}`);
        }

        const columnData = await response.json();
        if (!columnData.values || columnData.values.length === 0) {
            return [];
        }

        localStorage.setItem(cacheKey, JSON.stringify(columnData.values[0]));

        return columnData.values[0];
    } catch (error) {
        console.error("Error fetching columns:", error);
        showMessage(`Error fetching columns: ${error.message}`, true);
        return [];
    }
}

function getCurrentDate() {
    const today = new Date();
    return today.toISOString().split('T')[0]; 
}

async function getActiveTabURL() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                resolve(tabs[0].url);
            } else {
                reject('No active tab found');
            }
        });
    });
}

async function updateDataEntrySection(columns) {
    const dataEntryFields = document.getElementById('data-entry-fields');
    dataEntryFields.innerHTML = ''; 

    const currentDate = getCurrentDate();
    const currentURL = await getActiveTabURL();

    columns.forEach(column => {
        const normalizedColumn = column.trim().toLowerCase(); 

        const field = document.createElement('div');
        if (normalizedColumn === 'date') {
            field.innerHTML = `<label>${column}: </label><input type="text" id="${column}" value="${currentDate}" readonly><br>`;
        } else if (normalizedColumn === 'url') {
            field.innerHTML = `<label>${column}: </label><input type="text" id="${column}" value="${currentURL}" readonly><br>`;
        } else {
            field.innerHTML = `<label>${column}: </label><input type="text" id="${column}"><br>`;
        }
        dataEntryFields.appendChild(field);
    });

    document.getElementById('data-entry-section').style.display = 'block'; 

    loadInputValues(); 
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const isLoggedOut = localStorage.getItem('isLoggedOut') === 'true';
        
        if (isLoggedOut) {
            document.getElementById('loginButton').style.display = 'block';
            document.getElementById('logoutButton').style.display = 'none';
            document.getElementById('sheet-dropdown').style.display = 'none';
            document.getElementById('tab-selection').style.display = 'none';
            document.getElementById('data-entry-section').style.display = 'none';
        } else {
            const token = await getOAuthToken(true);

            if (!token) {
                showMessage('Unable to obtain OAuth token', true);
                throw new Error('OAuth token not obtained');
            }

            document.getElementById('loginButton').style.display = 'none';
            document.getElementById('logoutButton').style.display = 'block';
            document.getElementById('sheet-dropdown').style.display = 'block';

            const sheets = await fetchAllSheets(token);
            const dropdown = document.getElementById('sheet-dropdown');
            const sheetList = document.getElementById('sheet-list');
            sheetList.innerHTML = ''; 

            const { sheet: savedSheet, tab: savedTab } = loadSelectedSheetAndTab(); 

            if (sheets.length === 0) {
                dropdown.style.display = 'none';
                showMessage('No Google Sheets files found in your Drive.', true);
            } else {
                dropdown.style.display = 'block'; 
                sheets.forEach(sheet => {
                    const option = document.createElement('option');
                    option.value = sheet.id; 
                    option.text = sheet.name;
                    if (savedSheet === sheet.id) {
                        option.selected = true; 
                    }
                    sheetList.appendChild(option);
                });

                document.getElementById('tab-selection').style.display = 'block';

                if (savedSheet) {
                    await populateTabs(savedSheet, savedTab); 
                } else {
                    const firstSheetId = sheets[0]?.id;
                    if (firstSheetId) {
                        await populateTabs(firstSheetId);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error initializing the page:", error);
        showMessage(`Error initializing the page: ${error.message}`, true);
    }
});

async function populateTabs(sheetId, savedTab = null) {
    try {
        const token = await getOAuthToken(true); 

        const tabs = await fetchAllTabs(token, sheetId);
        const tabDropdown = document.getElementById('tab-dropdown');
        tabDropdown.innerHTML = ''; 

        if (tabs.length === 0) {
            tabDropdown.style.display = 'none';
            showMessage('No tabs found in the selected sheet.', true);
        } else {
            let selectedTab = savedTab || tabs[0]; 

            tabs.forEach((tab, index) => {
                const option = document.createElement('option');
                option.value = tab;
                option.text = tab;
                if (tab === selectedTab) {
                    option.selected = true; 
                }
                tabDropdown.appendChild(option);
            });

            tabDropdown.style.display = 'block'; 

            const tabName = tabDropdown.value || selectedTab; 

            if (tabName) {
                const columns = await fetchColumns(token, sheetId, tabName); 
                if (columns.length > 0) {
                    updateDataEntrySection(columns); 
                } else {
                    showMessage('No columns found in the selected tab.', true);
                }

                saveSelectedSheetAndTab(sheetId, tabName); 
            } else {
                showMessage('No tab selected.', true);
            }
        }
    } catch (error) {
        console.error("Error populating tabs:", error);
        showMessage(`Error populating tabs: ${error.message}`, true);
    }
}

document.getElementById('sheet-list').addEventListener('change', async () => {
    const sheetId = document.getElementById('sheet-list').value;
    await populateTabs(sheetId); 
    saveSelectedSheetAndTab(sheetId, null); 
});

document.getElementById('tab-dropdown').addEventListener('change', async () => {
    try {
        const token = await getOAuthToken(true); 
        const sheetId = document.getElementById('sheet-list').value;
        const tabName = document.getElementById('tab-dropdown').value;

        if (!sheetId || !tabName) {
            showMessage('Please select both a sheet and a tab.', true);
            return;
        }

        saveSelectedSheetAndTab(sheetId, tabName); 

        const columns = await fetchColumns(token, sheetId, tabName);
        if (columns.length > 0) {
            updateDataEntrySection(columns);
        } else {
            showMessage('No columns found in the selected tab.', true);
        }
    } catch (error) {
        console.error("Error fetching columns:", error);
        showMessage(`Error fetching columns: ${error.message}`, true);
    }
});

document.getElementById('saveRow').addEventListener('click', async () => {
    try {
        const token = await getOAuthToken(true); 

        if (!token) {
            showMessage('Unable to obtain OAuth token', true);
            throw new Error('OAuth token not obtained');
        }

        const sheetId = document.getElementById('sheet-list').value;
        const tabName = document.getElementById('tab-dropdown').value;
        const values = {};

        document.querySelectorAll('#data-entry-fields input').forEach(input => {
            values[input.id] = input.value;
        });

        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tabName}!A1:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                range: `${tabName}!A1`,
                values: [Object.values(values)]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error saving data: ${response.status} ${response.statusText}\n${errorText}`);
            showMessage('Error saving data', true);
            throw new Error(`Error saving data: ${response.status} ${response.statusText}`);
        }

        showMessage('Data saved successfully!');
        clearInputFields(); 
    } catch (error) {
        console.error("Error saving data:", error);
        showMessage(`Error saving data: ${error.message}`, true);
    }
});

document.getElementById('data-entry-fields').addEventListener('input', storeInputValues);

document.getElementById('logoutButton').addEventListener('click', async () => {
    chrome.identity.getAuthToken({ interactive: false }, function (token) {
        if (token) {
            chrome.identity.removeCachedAuthToken({ token }, function () {
                console.log('Token revoked');
                
                fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
                .then(response => {
                    if (response.ok) {
                        console.log('Access revoked from Google');
                        showMessage('Logged out successfully.');

                        localStorage.removeItem('selectedSheet');
                        localStorage.removeItem('selectedTab');
                        localStorage.removeItem('dataEntryValues');
                        document.getElementById('data-entry-fields').innerHTML = '';
                        
                        document.getElementById('sheet-dropdown').style.display = 'none';
                        document.getElementById('tab-selection').style.display = 'none';
                        document.getElementById('data-entry-section').style.display = 'none';
                        document.getElementById('logoutButton').style.display = 'none';
                        document.getElementById('loginButton').style.display = 'block';

                        localStorage.setItem('isLoggedOut', 'true');
                    } else {
                        showMessage('Failed to revoke access from Google.', true);
                    }
                })
                .catch(error => {
                    console.error('Error revoking access:', error);
                    showMessage('Error revoking access.', true);
                });
            });
        } else {
            console.error('No token found to revoke.');
            showMessage('Error logging out.', true);
        }
    });
});

document.getElementById('loginButton').addEventListener('click', async () => {
    try {
        const token = await getOAuthToken(true); 
        if (!token) {
            showMessage('Unable to obtain OAuth token', true);
            throw new Error('OAuth token not obtained');
        }
        showMessage('Logged in successfully!');

        localStorage.removeItem('isLoggedOut');

        document.getElementById('loginButton').style.display = 'none';
        document.getElementById('logoutButton').style.display = 'block';
        document.getElementById('sheet-dropdown').style.display = 'block';

        const sheets = await fetchAllSheets(token); 
        const dropdown = document.getElementById('sheet-dropdown');
        const sheetList = document.getElementById('sheet-list');
        sheetList.innerHTML = ''; 

        const { sheet: savedSheet, tab: savedTab } = loadSelectedSheetAndTab(); 

        if (sheets.length === 0) {
            dropdown.style.display = 'none';
            showMessage('No Google Sheets files found in your Drive.', true);
        } else {
            dropdown.style.display = 'block'; 
            sheets.forEach(sheet => {
                const option = document.createElement('option');
                option.value = sheet.id; 
                option.text = sheet.name;
                if (savedSheet === sheet.id) {
                    option.selected = true; 
                }
                sheetList.appendChild(option);
            });

            document.getElementById('tab-selection').style.display = 'block';

            if (savedSheet) {
                await populateTabs(savedSheet, savedTab); 
            } else {
                const firstSheetId = sheets[0]?.id;
                if (firstSheetId) {
                    await populateTabs(firstSheetId);
                }
            }
        }
    } catch (error) {
        console.error("Error logging in:", error);
        showMessage(`Error logging in: ${error.message}`, true);
    }
});
