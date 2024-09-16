# sheet-tracker-extension

This project involves the development of a Chrome extension that integrates with Google Sheets to track various items, initially designed to automate my job application tracking process. Below is a demonstration of how I use the extension.

Currently, the extension is loaded as an unpacked version for personal use, so it is not available in the Chrome Web Store.

## Version 2
Driven by the idea of automating the retrieval of Google Sheets files and tabs, I’ve decided to move away from the initial version, which involved hardcoded values. Instead, I’ll focus on developing a new version that automatically fetches available Google Sheets and their corresponding tabs once the user logs into their Google Account. Additionally, the first row of each selected sheet will be automatically extracted and used as column headers for further operations.

### Demo
![demo](quicksave_demo_v2.gif)

### Upcoming Enhancements
- **New Sheet and Tab Creation**: Add functionality that allows users to create new sheets and tabs directly within the extension.
- **Conditional formatting with status tracking**: Introduce conditional formatting options for tracking statuses within the extension, such as color-coding rows or cells based on specific criteria.
- **Update a particular row and cell**: Provide the ability to update individual rows and cells in a sheet.

## Version 1

### Demo
![demo](quicksave_demo.gif)

### Current Core Features
- **Sheet selection**: Choose from a list of available Google Sheets.
- **Automated data entry**: Automatically input dates and website URLs.
- **Manual input**: Enter or paste titles, descriptions, and notes.
- **Status tracking**: Track progress with statuses (todo, submitted, qualified, passed, failed).
- **Conditional formatting**: Apply formatting based on the selected status when the "Apply Conditional Formatting" box is checked.

### Possible Improvements
- **User instructions**: Provide detailed steps for users to create their own version of the extension.
- **Custom formatting**: Enable users to define and apply their own conditional formatting rules.
- **Dynamic sheet IDs**: Allow users to dynamically select and specify sheet IDs, eliminating the need for hard-coded values.
- **File and sheet creation**: Add functionality for users to create new Google Sheets files and add new sheets with custom titles directly from the extension.