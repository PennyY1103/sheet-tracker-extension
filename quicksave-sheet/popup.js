const sheetData = {
    "1lLT1zc4BEeg0leUaXsNhbPIR63t2f7NX9SKHK3jS4IY": {
        displayName: "Job Tracker",
        sheetNames: ["Job Application", "Company Website", "Career Website", "Network Contact", "Interview", "Project", "Other"]
    },
    "1vAgUfouhiH-NtlaEeGs1ZocrnPxVRYVF4jJqMd1LYOo": {
        displayName: "Study Tracker CS",
        sheetNames: ["LeetCode", "Resource"]
    }
};

function loadSheetIdDropdown() {
    const sheetIdSelect = document.getElementById('sheetId');
    sheetIdSelect.innerHTML = '<option value="">Select a File</option>'; 

    for (const sheetId in sheetData) {
        const option = document.createElement('option');
        option.value = sheetId;
        option.text = sheetData[sheetId].displayName; 
        sheetIdSelect.appendChild(option);
    }

    sheetIdSelect.addEventListener('change', function () {
        const selectedSheetId = this.value;
        loadSheetNameDropdown(selectedSheetId);
    });
}

function loadSheetNameDropdown(selectedSheetId) {
    const sheetNameSelect = document.getElementById('sheetName');
    sheetNameSelect.innerHTML = '<option value="">Select a Sheet Name</option>';

    if (selectedSheetId && sheetData[selectedSheetId]) {
        const sheetNames = sheetData[selectedSheetId].sheetNames;
        sheetNames.forEach(sheetName => {
            const option = document.createElement('option');
            option.value = sheetName;
            option.text = sheetName;
            sheetNameSelect.appendChild(option);
        });

        sheetNameSelect.addEventListener('change', function () {
            applyDescriptionTemplate(selectedSheetId, this.value);
        });
    }
}

function applyDescriptionTemplate(sheetId, sheetName) {
    const descriptionField = document.getElementById('Description');
    
    if (sheetId === "1lLT1zc4BEeg0leUaXsNhbPIR63t2f7NX9SKHK3jS4IY" && sheetName === "Job Application") {
        descriptionField.value = `Company:\nReqmt:\nSalary:\nLocation:\nPosted:\nSource:`;
    } else {
        descriptionField.value = ''; 
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadSheetIdDropdown();

    const currentDate = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = currentDate;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
            const currentTabUrl = tabs[0].url; 
            chrome.storage.local.set({ Url: currentTabUrl }); 
        }
    });

    chrome.storage.local.get(['sheetId', 'sheetName', 'Title', 'Description', 'status', 'notes'], (items) => {
        const sheetId = items.sheetId || '';
        const sheetName = items.sheetName || '';

        document.getElementById('sheetId').value = sheetId;
        document.getElementById('sheetName').value = sheetName;
        document.getElementById('Title').value = items.Title || '';
        document.getElementById('Description').value = items.Description || '';
        document.getElementById('status').value = items.status || '';
        document.getElementById('notes').value = items.notes || '';

        if (sheetId) {
            loadSheetNameDropdown(sheetId); 

            applyDescriptionTemplate(sheetId, sheetName);
        }
    });

    document.getElementById('sheetId').addEventListener('input', saveData);
    document.getElementById('sheetName').addEventListener('input', saveData);
    document.getElementById('Title').addEventListener('input', saveData);
    document.getElementById('Description').addEventListener('input', saveData);
    document.getElementById('status').addEventListener('input', saveData);
    document.getElementById('notes').addEventListener('input', saveData);

    document.getElementById('saveButton').addEventListener('click', () => {
        const sheetId = document.getElementById('sheetId').value;
        const sheetName = document.getElementById('sheetName').value;
        const Title = document.getElementById('Title').value;
        const Description = document.getElementById('Description').value;
        const status = document.getElementById('status').value;
        const notes = document.getElementById('notes').value;

        chrome.storage.local.get('Url', (items) => {
            const Url = items.Url;

            if (sheetId && sheetName && Title && Url && Description) {
                saveToGoogleSheets(sheetId, sheetName, Title, Url, Description, status, notes);
                chrome.storage.local.set({ sheetId, sheetName });
                chrome.storage.local.remove(['Title', 'Description', 'status', 'notes']);

                document.getElementById('Title').value = '';
                document.getElementById('Description').value = '';
                document.getElementById('status').value = '';
                document.getElementById('notes').value = '';
                document.getElementById('applyFormattingCheckbox').checked = false;
            } else {
                showMessage('Please fill in all required fields.', 'error');
            }
        });
    });

    document.getElementById('applyFormattingCheckbox').addEventListener('change', () => {
        const sheetId = document.getElementById('sheetId').value;
        const sheetName = document.getElementById('sheetName').value;
    
        if (document.getElementById('applyFormattingCheckbox').checked) {
            const formattingKey = `formattingApplied_${sheetId}_${sheetName}`;
            chrome.storage.local.get([formattingKey], (items) => {
                const formattingApplied = items[formattingKey];
    
                if (sheetId && sheetName && !formattingApplied) {
                    chrome.identity.getAuthToken({ interactive: true }, function (token) {
                        applyConditionalFormatting(sheetId, sheetName, token, formattingKey);
                    });
                } else if (formattingApplied) {
                    showMessage('Conditional formatting already applied for this sheet.', 'info');
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
    const Description = document.getElementById('Description').value;
    const status = document.getElementById('status').value;
    const notes = document.getElementById('notes').value;

    chrome.storage.local.set({
        sheetId,
        sheetName,
        Title,
        Description,
        status,
        notes
    });
}

function saveToGoogleSheets(sheetId, sheetName, Title, Url, Description, status, notes) {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
        const range = `'${sheetName}'!A1:F1`;
        const currentDate = new Date().toISOString().split('T')[0];

        const data = [
            [currentDate, Title, Url, Description, status, notes]
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

function applyConditionalFormatting(sheetId, sheetName, token, formattingKey) {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets(properties,conditionalFormats)&includeGridData=false`, {
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

        const existingRules = sheetInfo.conditionalFormats || [];

        const newRules = [
            {
                "booleanRule": {
                    "condition": {
                        "type": "CUSTOM_FORMULA",
                        "values": [{ "userEnteredValue": `=$E1="todo"` }]
                    },
                    "format": { "backgroundColor": { "red": 0.9, "green": 0.9, "blue": 0.9 } }
                },
                "ranges": [
                    {
                        "sheetId": individualSheetId,
                        "startRowIndex": 0,
                        "endRowIndex": null, 
                        "startColumnIndex": 0, 
                        "endColumnIndex": 6 
                    }
                ]
            },
            {
                "booleanRule": {
                    "condition": {
                        "type": "CUSTOM_FORMULA",
                        "values": [{ "userEnteredValue": `=$E1="submitted"` }]
                    },
                    "format": { "backgroundColor": { "red": 0.7, "green": 0.85, "blue": 1 } }
                },
                "ranges": [
                    {
                        "sheetId": individualSheetId,
                        "startRowIndex": 0,
                        "endRowIndex": null, 
                        "startColumnIndex": 0, 
                        "endColumnIndex": 6 
                    }
                ]
            },
            {
                "booleanRule": {
                    "condition": {
                        "type": "CUSTOM_FORMULA",
                        "values": [{ "userEnteredValue": `=$E1="qualified"` }]
                    },
                    "format": { "backgroundColor": { "red": 0.85, "green": 0.8, "blue": 1 } }
                },
                "ranges": [
                    {
                        "sheetId": individualSheetId,
                        "startRowIndex": 0,
                        "endRowIndex": null, 
                        "startColumnIndex": 0, 
                        "endColumnIndex": 6 
                    }
                ]
            },
            {
                "booleanRule": {
                    "condition": {
                        "type": "CUSTOM_FORMULA",
                        "values": [{ "userEnteredValue": `=$E1="passed"` }]
                    },
                    "format": { "backgroundColor": { "red": 0.8, "green": 1, "blue": 0.8 } }
                },
                "ranges": [
                    {
                        "sheetId": individualSheetId,
                        "startRowIndex": 0,
                        "endRowIndex": null, 
                        "startColumnIndex": 0, 
                        "endColumnIndex": 6 
                    }
                ]
            },
            {
                "booleanRule": {
                    "condition": {
                        "type": "CUSTOM_FORMULA",
                        "values": [{ "userEnteredValue": `=$E1="failed"` }]
                    },
                    "format": { "backgroundColor": { "red": 1, "green": 0.8, "blue": 0.8 } }
                },
                "ranges": [
                    {
                        "sheetId": individualSheetId,
                        "startRowIndex": 0,
                        "endRowIndex": null, 
                        "startColumnIndex": 0, 
                        "endColumnIndex": 6 
                    }
                ]
            }
        ];

        const rulesToAdd = newRules.filter(newRule => {
            return !existingRules.some(existingRule =>
                JSON.stringify(existingRule.booleanRule) === JSON.stringify(newRule.booleanRule)
            );
        });

        if (rulesToAdd.length === 0) {
            showMessage('Conditional formatting already applied.', 'info');
            chrome.storage.local.set({ [formattingKey]: true });
            return;
        }

        const requests = rulesToAdd.map(rule => ({
            "addConditionalFormatRule": { "rule": rule }
        }));

        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Conditional formatting applied:', data);
            showMessage('Conditional formatting applied!', 'success');
            chrome.storage.local.set({ [formattingKey]: true });
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

    if (type === 'error') {
        messageElement.style.backgroundColor = '#fdd';
        messageElement.style.color = '#a94442';
    } else {
        messageElement.style.backgroundColor = '#dff0d8';
        messageElement.style.color = '#3c763d';
    }

    messageElement.style.display = 'block'; 

    setTimeout(() => {
        messageElement.style.display = 'none'; 
    }, 2000);
}
