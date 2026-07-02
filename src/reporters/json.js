import { writeFile } from 'fs/promises';

export async function saveJsonReport(report, outputPath) {
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
}
