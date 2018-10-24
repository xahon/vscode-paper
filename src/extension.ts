import * as hbs from "handlebars";
import * as path from "path";
import * as striptags from "striptags";
import * as vscode from "vscode";

// interface IConfig {}
// const outChannel: vscode.OutputChannel = vscode.window.createOutputChannel("VSCode Paper");
// const config: IConfig = vscode.workspace.getConfiguration("paper-config");

let template: hbs.TemplateDelegate;

export async function activate(context: vscode.ExtensionContext) {
    template = hbs.compile(
        (await vscode.workspace.openTextDocument(path.resolve(context.extensionPath, "webview/preview.hbs"))).getText()
    );

    const openPreviewCommandDisposable = vscode.commands.registerCommand("vscode-paper.openPreview", async () => {
        const draft = await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(vscode.Uri.parse("untitled:paper-draft.js")),
            {
                preserveFocus: true,
                viewColumn: vscode.ViewColumn.One,
            }
        );

        draft.edit((edit: vscode.TextEditorEdit) => {
            // prettier-ignore
            edit.insert(
                new vscode.Position(0,0),
`var path = new Path();
path.strokeColor = 'black';
var start = new Point(100, 100);
path.moveTo(start);
path.lineTo(start + [ 100, -50 ]);`
            );
        });

        const previewPanel: vscode.WebviewPanel = await vscode.window.createWebviewPanel(
            "paper-view",
            "Paper",
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
            }
        );

        previewPanel.webview.html = getHTML(draft.document.getText());

        vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
            if (e.document !== draft.document || previewPanel.webview.html === getHTML(e.document.getText())) {
                return;
            }

            previewPanel.webview.html = getHTML(e.document.getText());
        });
    });

    context.subscriptions.push(openPreviewCommandDisposable);
}

export function deactivate() {}

function getHTML(documentContent: string): string {
    return template({
        userCode: striptags(documentContent),
    });
}
