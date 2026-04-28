import * as vscode from 'vscode';
import { ImageConvertTool, convertSelectedFiles } from './tools/imageConvertTool';

export function activate(context: vscode.ExtensionContext): void {
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
            const filePath = editor.document.uri.fsPath;
            const config = vscode.workspace.getConfiguration('imageConvert');
            const { convertImages } = await import('./imageConverter');
            const results = await convertImages(
                [filePath],
                config.get('defaultOutputFormat', 'webp'),
                config.get('defaultQuality', 80),
                config.get('defaultOutputDirectory', '') || undefined,
                config.get('forceOverwrite', false)
            );
            const r = results[0];
            if (r?.success) {
                vscode.window.showInformationMessage(
                    `Converted: ${r.original} → ${r.converted} (saved ${r.sizeReduction})`
                );
            } else if (r?.status === 'skipped') {
                vscode.window.showWarningMessage(r.message ?? 'File skipped.');
            } else {
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
