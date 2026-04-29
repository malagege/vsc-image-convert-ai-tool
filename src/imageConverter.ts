import { stat, access } from 'fs/promises';
import { constants } from 'fs';
import fg from 'fast-glob';
import * as path from 'path';
import sharp from 'sharp';

export const READING_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.avif', '.gif', '.svg'];
export const WRITING_FORMATS = ['webp', 'avif'] as const;
export type OutputFormat = typeof WRITING_FORMATS[number];
export type ConversionLogger = (message: string) => void;

export interface ConversionResult {
    success?: boolean;
    status?: string;
    original?: string;
    converted?: string;
    file?: string;
    originalSize?: string;
    newSize?: string;
    sizeReduction?: string;
    message?: string;
    error?: string;
}

/**
 * Check if a given path is a valid directory.
 */
async function isValidDirectory(directoryPath: string): Promise<boolean> {
    try {
        const stats = await stat(directoryPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Check if a file exists at the given path.
 */
async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Resolve file paths from an array of literal paths or glob patterns.
 */
async function resolveFilePaths(patterns: string[]): Promise<string[]> {
    const resolvedPaths = new Set<string>();

    for (const pattern of patterns) {
        const unixPattern = pattern.replace(/\\/g, '/');

        if (!fg.isDynamicPattern(unixPattern)) {
            // Literal path: check directly with fs.access
            try {
                const normalised = path.normalize(pattern);
                await access(normalised, constants.F_OK);
                const stats = await stat(normalised);
                if (stats.isFile()) {
                    resolvedPaths.add(normalised);
                }
            } catch {
                // File does not exist – skip silently
            }
        } else {
            // Glob pattern
            const matches = await fg(unixPattern, {
                absolute: true,
                onlyFiles: true,
                globstar: true
            });
            matches.forEach(match => resolvedPaths.add(path.normalize(match)));
        }
    }

    return Array.from(resolvedPaths);
}

/**
 * Convert images to the specified format.
 *
 * @param files - Array of file paths or glob patterns.
 * @param outputFormat - Target format: 'webp' or 'avif'.
 * @param quality - Conversion quality (1-100). Defaults to 80.
 * @param outputDirectory - Optional output directory. Defaults to same directory as source.
 * @param forceOverwrite - Whether to overwrite existing files.
 * @returns Array of ConversionResult objects.
 */
export async function convertImages(
    files: string[],
    outputFormat: OutputFormat,
    quality: number = 80,
    outputDirectory?: string,
    forceOverwrite: boolean = false,
    logger?: ConversionLogger
): Promise<ConversionResult[]> {
    logger?.(`Resolving ${files.length} input path(s) for ${outputFormat.toUpperCase()} conversion.`);
    const actualFiles = await resolveFilePaths(files);

    if (actualFiles.length === 0) {
        logger?.('No valid image files were resolved from the provided input.');
        return [{ success: false, error: 'No valid image files found for the provided paths or patterns.' }];
    }

    logger?.(`Resolved ${actualFiles.length} file(s): ${actualFiles.join(', ')}`);
    const results: ConversionResult[] = [];

    for (const filePath of actualFiles) {
        try {
            const statsOriginal = await stat(filePath);
            const sizeOriginalKB = (statsOriginal.size / 1024).toFixed(2);
            logger?.(`Preparing to convert ${filePath} (${sizeOriginalKB} KB).`);

            const useOutputDir = outputDirectory && await isValidDirectory(outputDirectory)
                ? outputDirectory
                : path.dirname(filePath);

            const fileName = path.basename(filePath, path.extname(filePath));
            const outputFilePath = path.join(useOutputDir, `${fileName}.${outputFormat}`);
            logger?.(`Output path resolved to ${outputFilePath}.`);

            const exists = await fileExists(outputFilePath);
            if (exists && !forceOverwrite) {
                logger?.(`Skipping ${filePath} because ${outputFilePath} already exists and overwrite is disabled.`);
                results.push({
                    status: 'skipped',
                    file: outputFilePath,
                    message: 'File already exists. Set forceOverwrite to true to replace it.'
                });
                continue;
            }

            logger?.(`Starting Sharp conversion for ${filePath} with quality ${quality}.`);
            await sharp(filePath)
                .toFormat(outputFormat, { quality })
                .toFile(outputFilePath);

            const statsNew = await stat(outputFilePath);
            const sizeNewKB = (statsNew.size / 1024).toFixed(2);
            const savingsPct = 100 - (statsNew.size / statsOriginal.size * 100);
            const sizeReduction = savingsPct >= 0
                ? `${savingsPct.toFixed(1)}%`
                : `+${(-savingsPct).toFixed(1)}% (larger than original)`;

            results.push({
                success: true,
                original: filePath,
                converted: outputFilePath,
                originalSize: `${sizeOriginalKB} KB`,
                newSize: `${sizeNewKB} KB`,
                sizeReduction
            });
            logger?.(`Finished converting ${filePath} -> ${outputFilePath} (${sizeOriginalKB} KB -> ${sizeNewKB} KB, ${sizeReduction}).`);
        } catch (err) {
            const e = err as Error;
            logger?.(`Conversion failed for ${filePath}: ${e.message}`);
            results.push({ success: false, original: filePath, error: e.message });
        }
    }

    logger?.(`Conversion completed with ${results.filter(result => result.success).length} success(es), ${results.filter(result => result.status === 'skipped').length} skipped, ${results.filter(result => result.success === false && result.status !== 'skipped').length} failure(s).`);
    return results;
}
