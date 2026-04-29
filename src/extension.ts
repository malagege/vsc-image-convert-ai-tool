import * as vscode from 'vscode';
import { ImageConvertTool, convertSelectedFiles } from './tools/imageConvertTool';
import { getOutputChannel, logMessage, showLogs } from './logging';

export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(getOutputChannel());

    // Register the AI language model tool so Copilot can invoke image conversion.
    context.subscriptions.push(
        vscode.lm.registerTool('imageConvert_convert', new ImageConvertTool(context))
    );

    // Command: convert the currently open file.
    context.subscriptions.push(
        vscode.commands.registerCommand('imageConvert.convertCurrentFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active file to convert.');
                return;
            }

            showLogs();
            const filePath = editor.document.uri.fsPath;
            const config = vscode.workspace.getConfiguration('imageConvert');
            logMessage(`Manual conversion requested for ${filePath}.`);
            const { convertImages } = await import('./imageConverter.js');
            const results = await convertImages(
                [filePath],
                config.get('defaultOutputFormat', 'webp'),
                config.get('defaultQuality', 80),
                config.get('defaultOutputDirectory', '') || undefined,
                config.get('forceOverwrite', false),
                message => logMessage(`[Command] ${message}`)
            );
            const r = results[0];
            if (r?.success) {
                logMessage(`Manual conversion succeeded for ${filePath}.`);
                vscode.window.showInformationMessage(
                    `Converted: ${r.original} → ${r.converted} (saved ${r.sizeReduction})`
                );
            } else if (r?.status === 'skipped') {
                logMessage(`Manual conversion skipped for ${filePath}: ${r.message ?? 'File skipped.'}`);
                vscode.window.showWarningMessage(r.message ?? 'File skipped.');
            } else {
                logMessage(`Manual conversion failed for ${filePath}: ${r?.error ?? 'unknown error'}`);
                vscode.window.showErrorMessage(`Conversion failed: ${r?.error ?? 'unknown error'}`);
            }
        })
    );

    // Command: open a file-picker and convert selected images.
    context.subscriptions.push(
        vscode.commands.registerCommand('imageConvert.convertWorkspaceImages', () =>
            convertSelectedFiles(context)
        )
    );
}

export function deactivate(): void {
    // Nothing to clean up.
}
