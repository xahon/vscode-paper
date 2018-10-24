import { transform } from "babel-standalone";
import * as hbs from "handlebars";
import * as path from "path";
import * as striptags from "striptags";
import * as vscode from "vscode";

// interface IConfig {}
// const config: IConfig = vscode.workspace.getConfiguration("paper-config");
const outChannel: vscode.OutputChannel = vscode.window.createOutputChannel("VSCode Paper");

let template: hbs.TemplateDelegate;

export async function activate(context: vscode.ExtensionContext) {
    // Taken from https://stackoverflow.com/a/9405113/6119618
    hbs.registerHelper("ifStrEmpty", function(v1, options) {
        if (v1 === "") {
            // @ts-ignore
            return options.fn(this);
        }
        // @ts-ignore
        return options.inverse(this);
    });

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
    let userCode: string = "";
    let error: string = "";

    try {
        const transformed = transform(striptags(documentContent), { presets: ["es2015"] });
        userCode = transformed.code || "";
    } catch (e) {
        outChannel.append(`Error occurred: ${e}`);
        error = e.toString();
    }

    return template({ userCode, error });
}
