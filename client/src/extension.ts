'use strict';

import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

import * as path from 'path';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
	// We get activated if there is one or more elm.json file in the workspace
	// Start one server for each directory with an elm.json
	// and watch Elm files in those directories.
	let elmJsons = await workspace.findFiles('**/elm.json');
	for (let uri of elmJsons) {
		startClient(path.dirname(uri.fsPath), context);
	}
	// TODO: watch for addition and removal of 'elm.json' files
	// and start and stop clients for those directories.
}


let clients: Map<string, LanguageClient> = new Map();
function startClient(dir: string, context: ExtensionContext) {
	if (clients.has(dir)) {
		// Client was already started for this directory
		return;
	}

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
		// Register the server for Elm documents in the directory
		documentSelector: [
			{
				scheme: 'file',
				pattern: path.join(dir, '**', '*.elm')
			}
		],
		// Notify the server about file changes to 'elm.json'
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher(path.join(dir, 'elm.json'))
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'elmLanguageServer',
		'Elm Language Server',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
	client.info(`Starting language server for ${dir}`);
	clients.set(dir, client);
}

export function deactivate(): Thenable<void> {
	let promises: Thenable<void>[] = [];
	for (let client of clients.values()) {
		promises.push(client.stop());
	}
	return Promise.all(promises).then(() => undefined);
}