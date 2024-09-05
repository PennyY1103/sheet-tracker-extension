document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['sheetId', 'sheetName', 'Title', 'Url', 'Description', 'status', 'notes'], (items) => {
        document.getElementById('sheetId').value = items.sheetId || '';
        document.getElementById('sheetName').value = items.sheetName || '';  
        document.getElementById('Title').value = items.Title || '';
        document.getElementById('Url').value = items.Url || '';
        document.getElementById('Description').value = items.Description || '';
        document.getElementById('status').value = items.status || '';
        document.getElementById('notes').value = items.notes || '';
    });

    document.getElementById('sheetId').addEventListener('input', saveData);
    document.getElementById('sheetName').addEventListener('input', saveData);  
    document.getElementById('Title').addEventListener('input', saveData);
    document.getElementById('Url').addEventListener('input', saveData);
    document.getElementById('Description').addEventListener('input', saveData);
    document.getElementById('status').addEventListener('input', saveData);
    document.getElementById('notes').addEventListener('input', saveData);

    document.getElementById('saveButton').addEventListener('click', () => {
        const sheetId = document.getElementById('sheetId').value;
        const sheetName = document.getElementById('sheetName').value;  
        const Title = document.getElementById('Title').value;
        const Url = document.getElementById('Url').value;
        const Description = document.getElementById('Description').value;
        const status = document.getElementById('status').value;
        const notes = document.getElementById('notes').value;

        if (sheetId && sheetName && Title && Url && Description) {
            saveToGoogleSheets(sheetId, sheetName, Title, Url, Description, status, notes);  
            chrome.storage.local.set({ sheetId, sheetName }); 
            chrome.storage.local.remove(['Title', 'Url', 'Description', 'status', 'notes']);
            
            document.getElementById('Title').value = '';
            document.getElementById('Url').value = '';
            document.getElementById('Description').value = '';
            document.getElementById('status').value = '';
            document.getElementById('notes').value = '';
            document.getElementById('applyFormattingCheckbox').checked = false;
        } else {
            showMessage('Please fill in all required fields.', 'error');
        }
    });

    document.getElementById('refreshButton').addEventListener('click', () => {
        document.getElementById('Title').value = '';
        document.getElementById('Url').value = '';
        document.getElementById('Description').value = '';
        document.getElementById('status').value = '';
        document.getElementById('notes').value = '';
        
        document.getElementById('applyFormattingCheckbox').checked = false; 
    
        showMessage('Fields refreshed and ready for new entry!', 'success');
    });

    document.getElementById('applyFormattingCheckbox').addEventListener('change', () => {
        if (document.getElementById('applyFormattingCheckbox').checked) {
            chrome.storage.local.get(['sheetId', 'sheetName'], (items) => {
                const { sheetId, sheetName } = items;
                if (sheetId && sheetName) {
                    chrome.identity.getAuthToken({ interactive: true }, function(token) {
                        applyConditionalFormatting(sheetId, sheetName, token);
                    });
                } else {
                    showMessage('Please provide both Sheet ID and Sheet Name.', 'error');
                }
            });
        } else {
            showMessage('Conditional formatting checkbox is not selected.', 'info');
        }
    });
});

function saveData() {
    const sheetId = document.getElementById('sheetId').value;
    const sheetName = document.getElementById('sheetName').value;  
    const Title = document.getElementById('Title').value;
    const Url = document.getElementById('Url').value;
    const Description = document.getElementById('Description').value;
    const status = document.getElementById('status').value;
    const notes = document.getElementById('notes').value;

    chrome.storage.local.set({
        sheetId,
        sheetName,  
        Title,
        Url,
        Description,
        status,
        notes
    });
}

function saveToGoogleSheets(sheetId, sheetName, Title, Url, Description, status, notes) {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
        const range = `'${sheetName}'!A1:E1`;

        const data = [
            [Title, Url, Description, status, notes]
        ];

        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                range: range,
                majorDimension: "ROWS",
                values: data
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Data saved:', data);
            showMessage('Data saved to Google Sheets!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('Failed to save data.', 'error');
        });
    });
}

function applyConditionalFormatting(sheetId, sheetName, token) {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=false`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const sheetInfo = data.sheets.find(sheet => sheet.properties.title === sheetName);
        if (!sheetInfo) {
            throw new Error(`Sheet with name "${sheetName}" not found.`);
        }
        const individualSheetId = sheetInfo.properties.sheetId;

        // Define conditional formatting rules
        const rules = [
            {
                "addConditionalFormatRule": {
                    "rule": {
                        "booleanRule": {
                            "condition": {
                                "type": "CUSTOM_FORMULA",
                                "values": [
                                    { "userEnteredValue": `=$D1="todo"` }
                                ]
                            },
                            "format": {
                                "backgroundColor": { "red": 0.9, "green": 0.9, "blue": 0.9 } 
                            }
                        },
                        "ranges": [
                            {
                                "sheetId": individualSheetId,
                                "startRowIndex": 0,
                                "endRowIndex": null, 
                                "startColumnIndex": 0, 
                                "endColumnIndex": 5 
                            }
                        ]
                    }
                }
            },
            {
                "addConditionalFormatRule": {
                    "rule": {
                        "booleanRule": {
                            "condition": {
                                "type": "CUSTOM_FORMULA",
                                "values": [
                                    { "userEnteredValue": `=$D1="submitted"` }
                                ]
                            },
                            "format": {
                                "backgroundColor": { "red": 0.7, "green": 0.85, "blue": 1 } 
                            }
                        },
                        "ranges": [
                            {
                                "sheetId": individualSheetId,
                                "startRowIndex": 0,
                                "endRowIndex": null, 
                                "startColumnIndex": 0, 
                                "endColumnIndex": 5 
                            }
                        ]
                    }
                }
            },
            {
                "addConditionalFormatRule": {
                    "rule": {
                        "booleanRule": {
                            "condition": {
                                "type": "CUSTOM_FORMULA",
                                "values": [
                                    { "userEnteredValue": `=$D1="qualified"` }
                                ]
                            },
                            "format": {
                                "backgroundColor": { "red": 0.85, "green": 0.8, "blue": 1 } 
                            }
                        },
                        "ranges": [
                            {
                                "sheetId": individualSheetId,
                                "startRowIndex": 0,
                                "endRowIndex": null, 
                                "startColumnIndex": 0, 
                                "endColumnIndex": 5 
                            }
                        ]
                    }
                }
            },
            {
                "addConditionalFormatRule": {
                    "rule": {
                        "booleanRule": {
                            "condition": {
                                "type": "CUSTOM_FORMULA",
                                "values": [
                                    { "userEnteredValue": `=$D1="passed"` }
                                ]
                            },
                            "format": {
                                "backgroundColor": { "red": 0.8, "green": 1, "blue": 0.8 } 
                            }
                        },
                        "ranges": [
                            {
                                "sheetId": individualSheetId,
                                "startRowIndex": 0,
                                "endRowIndex": null, 
                                "startColumnIndex": 0, 
                                "endColumnIndex": 5 
                            }
                        ]
                    }
                }
            },
            {
                "addConditionalFormatRule": {
                    "rule": {
                        "booleanRule": {
                            "condition": {
                                "type": "CUSTOM_FORMULA",
                                "values": [
                                    { "userEnteredValue": `=$D1="failed"` }
                                ]
                            },
                            "format": {
                                "backgroundColor": { "red": 1, "green": 0.8, "blue": 0.8 } 
                            }
                        },
                        "ranges": [
                            {
                                "sheetId": individualSheetId,
                                "startRowIndex": 0,
                                "endRowIndex": null, 
                                "startColumnIndex": 0, 
                                "endColumnIndex": 5 
                            }
                        ]
                    }
                }
            }
        ];

        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests: rules })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Conditional formatting applied:', data);
            showMessage('Conditional formatting applied!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('Failed to apply conditional formatting.', 'error');
        });
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Failed to fetch sheet details.', 'error');
    });
}

function showMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.style.backgroundColor = type === 'error' ? '#fdd' : '#dff0d8';
    messageElement.style.color = type === 'error' ? '#a94442' : '#3c763d';
    messageElement.style.display = 'block';
}
