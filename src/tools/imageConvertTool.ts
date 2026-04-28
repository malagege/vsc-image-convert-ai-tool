import * as vscode from 'vscode';
import { convertImages, OutputFormat, READING_FORMATS } from '../imageConverter';

interface ImageConvertInput {
    files: string[];
    outputFormat?: OutputFormat;
    quality?: number;
    outputDirectory?: string;
    forceOverwrite?: boolean;
}

/**
 * VS Code Language Model Tool for image conversion.
 * AI (Copilot) can invoke this tool to convert images to WebP or AVIF.
 */
export class ImageConvertTool implements vscode.LanguageModelTool<ImageConvertInput> {
    constructor(private readonly _context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ImageConvertInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const config = vscode.workspace.getConfiguration('imageConvert');
        const input = options.input;

        const outputFormat: OutputFormat =
            input.outputFormat ?? config.get<OutputFormat>('defaultOutputFormat', 'webp');
        const quality: number =
            typeof input.quality === 'number' ? input.quality : config.get<number>('defaultQuality', 80);
        const outputDirectory: string =
            input.outputDirectory ?? config.get<string>('defaultOutputDirectory', '');
        const forceOverwrite: boolean =
            typeof input.forceOverwrite === 'boolean'
                ? input.forceOverwrite
                : config.get<boolean>('forceOverwrite', false);

        const results = await convertImages(
            input.files,
            outputFormat,
            quality,
            outputDirectory || undefined,
            forceOverwrite
        );

        const summary = results.map(r => {
            if (r.status === 'skipped') {
                return `⏭ Skipped: ${r.file} — ${r.message}`;
            }
            if (r.success) {
                return `✅ ${r.original} → ${r.converted} (${r.originalSize} → ${r.newSize}, saved ${r.sizeReduction})`;
            }
            return `❌ Failed: ${r.original ?? 'unknown'} — ${r.error}`;
        }).join('\n');

        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(summary || 'No files were processed.'),
            new vscode.LanguageModelTextPart('\n\nRaw results:\n' + JSON.stringify(results, null, 2))
        ]);
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<ImageConvertInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const config = vscode.workspace.getConfiguration('imageConvert');
        const fmt = options.input.outputFormat ?? config.get<OutputFormat>('defaultOutputFormat', 'webp');
        const count = options.input.files?.length ?? 0;
        const fileWord = count === 1 ? 'file' : 'files';

        return {
            invocationMessage: `Converting ${count} image ${fileWord} to ${fmt.toUpperCase()}…`
        };
    }
}

/**
 * Prompt the user to pick image files, then convert them using the given settings.
 */
export async function convertSelectedFiles(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration('imageConvert');

    const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: true,
        filters: { Images: READING_FORMATS.map(f => f.replace('.', '')) },
        title: 'Select images to convert'
    });

    if (!uris || uris.length === 0) {
        return;
    }

    const files = uris.map(u => u.fsPath);
    const outputFormat = config.get<OutputFormat>('defaultOutputFormat', 'webp');
    const quality = config.get<number>('defaultQuality', 80);
    const outputDirectory = config.get<string>('defaultOutputDirectory', '') || undefined;
    const forceOverwrite = config.get<boolean>('forceOverwrite', false);

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Converting ${files.length} image(s) to ${outputFormat.toUpperCase()}…`,
            cancellable: false
        },
        async () => {
            const results = await convertImages(files, outputFormat, quality, outputDirectory, forceOverwrite);

            const succeeded = results.filter(r => r.success).length;
            const skipped = results.filter(r => r.status === 'skipped').length;
            const failed = results.filter(r => r.success === false && r.status !== 'skipped').length;

            const parts: string[] = [`Converted: ${succeeded}`];
            if (skipped > 0) { parts.push(`Skipped: ${skipped}`); }
            if (failed > 0) { parts.push(`Failed: ${failed}`); }

            const message = parts.join(' | ');
            if (failed > 0) {
                vscode.window.showWarningMessage(`Image conversion done — ${message}`);
            } else {
                vscode.window.showInformationMessage(`Image conversion done — ${message}`);
            }
        }
    );
}
