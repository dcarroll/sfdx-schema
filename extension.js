// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const converter = require('./lib/converter');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "dsave" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.convertToJson', function () {
        console.log(vscode.window.activeTextEditor.document.fileName);
        converter.toJson(vscode.window.activeTextEditor.document.fileName);
    });

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable2 = vscode.commands.registerCommand('extension.convertToXm[', function () {
        console.log(vscode.window.activeTextEditor.document.fileName);
        converter.toXml(vscode.window.activeTextEditor.document.fileName);
    });

    var watcher = vscode.workspace.createFileSystemWatcher("**/*-meta.json"); //glob search string
    watcher.ignoreChangeEvents = false;
    watcher.ignoreCreateEvents = true;
    watcher.ignoreDeleteEvents = true;
    
    watcher.onDidChange(function(event) {
        console.log("here: \n" + event);
        converter.toXml(event.path);
        vscode.window.showInformationMessage("ddod");
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;