import * as vscode from 'vscode';

const OUTPUT_CHANNEL_NAME = 'Image Convert AI Tool';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
    outputChannel ??= vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    return outputChannel;
}

export function logMessage(message: string): void {
    getOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function showLogs(preserveFocus: boolean = true): void {
    getOutputChannel().show(preserveFocus);
}
