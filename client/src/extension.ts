/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, languages, Diagnostic } from 'vscode';
import * as vscode from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

let client: LanguageClient;

let decorations = {};
let decorationStyles = {};
let highlightToggled = false;

function createDecorations() {

}

function removeDecorations(editor: vscode.TextEditor) {
	Object.keys(decorations).forEach(decor => {
		editor.setDecorations(decorationStyles[decor], []);
	});

	decorations = {};
}

function updateDecorations(editor: vscode.TextEditor) {
	Object.keys(decorations).forEach(decor => {
		console.log("   ", decorationStyles[decor], decorations[decor], decorationStyles[decor].backgroundColor);
		editor.setDecorations(decorationStyles[decor], decorations[decor]);
	});
}

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'plaintext' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();

	let disposable = vscode.commands.registerCommand('extension.toggleHighlight', () => {
		const editor = vscode.window.activeTextEditor;
		if(!editor) return;

		highlightToggled = !highlightToggled;

		if(!highlightToggled) {
			removeDecorations(editor);
			vscode.window.showInformationMessage('Removed highlight!');
			return;
		}

		let diags: [vscode.Uri, Diagnostic[]][] = languages.getDiagnostics();

		// const red = vscode.window.createTextEditorDecorationType({
		// 	backgroundColor: 'rgba(255, 0, 0, 0.4)'
		// });
		// const green = vscode.window.createTextEditorDecorationType({
		// 	backgroundColor: 'rgba(0, 255, 0, 0.4)'
		// });
		// const blue = vscode.window.createTextEditorDecorationType({
		// 	backgroundColor: 'rgba(0, 0, 255, 0.4)'
		// });

		// const decor = [red, green, blue]

		// let ranges = [[], [], []]
		// diags.forEach((val, i) => {
		// 	val[1].forEach((diag, i) => {
		// 		diag.relatedInformation.forEach((info, i) => {
		// 			if(info.message.startsWith('Color:')) {
		// 				ranges[parseInt(info.message.substr(6))].push(info.location);
		// 			}
		// 		});
		// 	});
		// });
		// decor.forEach((dec, i) => {
		// 	console.log(dec, ranges[i]);
		// 	editor.setDecorations(dec, ranges[i]);
		// });

		removeDecorations(editor);

		diags.forEach(elem => {
			elem[1].forEach(diag => {
				diag.relatedInformation.forEach(info => {
					if(info.message.startsWith('Color:')) {
						let colorStr = info.message.substr(6);
						let rgb = colorStr.split(',').map(s => parseInt(s));

						if(!decorationStyles[colorStr])
							decorationStyles[colorStr] = vscode.window.createTextEditorDecorationType({
								backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`
							});

						if(!decorations[colorStr]) 
							decorations[colorStr] = [];

						decorations[colorStr].push(info.location);
					}
				});
			});
		});

		updateDecorations(editor);

		vscode.window.showInformationMessage('Added highlight!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
