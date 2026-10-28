import { PathologyReport } from '../types/pathology';
import { PRESET_REPORTS } from '../data/presets';

export const ACTIVE_REPORT_STORAGE_KEY = 'patholab_a4_saved_report_v2';
export const REPORTS_VAULT_STORAGE_KEY = 'patholab_a4_reports_vault_v1';

/**
 * ISO/IEC 16388 Code 39 standard 9-element patterns (5 bars, 4 spaces interleaved: B S B S B S B S B)
 * 'w' = wide (3 units), 'n' = narrow (1 unit)
 */
const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn', // Start/Stop character
};

const PATTERN_TO_CHAR: Record<string, string> = Object.fromEntries(
  Object.entries(CODE39_PATTERNS).map(([char, pat]) => [pat, char])
);

export function normalizeBarcodeText(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^\*+|\*+$/g, '')
    .replace(/[^0-9A-Z\-.\s$/+%]/g, '-')
    .trim();
}

export interface BarcodeModule {
  isBar: boolean;
  width: number;
}

/**
 * Generates standard ISO Code 39 scannable modules for any Report No.
 */
export function encodeCode39Modules(rawCode: string): {
  cleanCode: string;
  modules: BarcodeModule[];
  totalUnits: number;
} {
  const cleanCode = normalizeBarcodeText(rawCode || 'REP-2026-101') || 'REP-2026-101';
  const fullPayload = `*${cleanCode}*`;

  // Quiet zone on left (10 narrow units)
  const modules: BarcodeModule[] = [{ isBar: false, width: 10 }];

  for (let cIdx = 0; cIdx < fullPayload.length; cIdx++) {
    const ch = fullPayload[cIdx];
    const pattern = CODE39_PATTERNS[ch] || CODE39_PATTERNS['-'];
    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const width = pattern[i] === 'w' ? 3 : 1;
      modules.push({ isBar, width });
    }
    // Inter-character narrow space gap
    if (cIdx < fullPayload.length - 1) {
      modules.push({ isBar: false, width: 1 });
    }
  }

  // Quiet zone on right (10 narrow units)
  modules.push({ isBar: false, width: 10 });

  const totalUnits = modules.reduce((sum, m) => sum + m.width, 0);
  return { cleanCode, modules, totalUnits };
}

/**
 * Built-in optical 1D Code 39 scanline decoder from an HTMLImageElement or HTMLVideoElement
 * Works even when browser BarcodeDetector is unavailable
 */
export function decodeCode39FromVisualSource(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): string | null {
  try {
    const canvas = document.createElement('canvas');
    const width =
      source instanceof HTMLVideoElement
        ? source.videoWidth || 640
        : source.width || 640;
    const height =
      source instanceof HTMLVideoElement
        ? source.videoHeight || 480
        : source.height || 480;

    if (!width || !height) return null;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, width, height);

    // Sample horizontal scanlines across the image (especially bottom where report barcode sits, and center for camera)
    const scanYFractions = [
      0.5, 0.45, 0.55, 0.82, 0.85, 0.88, 0.9, 0.78, 0.35, 0.65, 0.25,
    ];

    for (const frac of scanYFractions) {
      const y = Math.floor(height * frac);
      const rowData = ctx.getImageData(0, y, width, 1).data;

      // Convert pixel row to luminance binary array
      const lum: number[] = [];
      let minL = 255;
      let maxL = 0;
      for (let x = 0; x < width; x++) {
        const idx = x * 4;
        const l =
          0.299 * rowData[idx] +
          0.587 * rowData[idx + 1] +
          0.114 * rowData[idx + 2];
        lum.push(l);
        if (l < minL) minL = l;
        if (l > maxL) maxL = l;
      }

      if (maxL - minL < 50) continue; // Low contrast line
      const threshold = (minL + maxL) / 2;

      // Extract run-length encoding of black (bar=true) and white (space=false)
      const runs: Array<{ isBar: boolean; len: number }> = [];
      let currentIsBar = lum[0] < threshold;
      let count = 1;
      for (let x = 1; x < width; x++) {
        const isBar = lum[x] < threshold;
        if (isBar === currentIsBar) {
          count++;
        } else {
          runs.push({ isBar: currentIsBar, len: count });
          currentIsBar = isBar;
          count = 1;
        }
      }
      runs.push({ isBar: currentIsBar, len: count });

      // Search runs for start '*' pattern
      for (let startIdx = 0; startIdx <= runs.length - 19; startIdx++) {
        if (!runs[startIdx].isBar) continue;

        const first9 = runs.slice(startIdx, startIdx + 9);
        if (first9.length < 9) break;

        const sortedLens = [...first9].map((r) => r.len).sort((a, b) => a - b);
        const narrowEst = (sortedLens[2] + sortedLens[3]) / 2;
        const wideEst = (sortedLens[6] + sortedLens[7]) / 2;
        if (narrowEst <= 0 || wideEst / narrowEst < 1.7 || wideEst / narrowEst > 4.5) {
          continue;
        }
        const splitThreshold = (narrowEst + wideEst) / 2;

        const toPattern = (slice: Array<{ isBar: boolean; len: number }>) =>
          slice.map((r) => (r.len > splitThreshold ? 'w' : 'n')).join('');

        if (toPattern(first9) !== CODE39_PATTERNS['*']) continue;

        // Decode subsequent characters
        let cursor = startIdx + 10; // 9 elements + 1 inter-char space
        let decoded = '';
        while (cursor + 9 <= runs.length) {
          const charRuns = runs.slice(cursor, cursor + 9);
          const pat = toPattern(charRuns);
          const ch = PATTERN_TO_CHAR[pat];
          if (!ch) break;
          if (ch === '*') {
            if (decoded.length >= 2) {
              return decoded;
            }
            break;
          }
          decoded += ch;
          cursor += 10;
        }
      }
    }
  } catch {
    // Ignore canvas security/read errors
  }
  return null;
}

/**
 * Load all saved patient reports from the local vault in localStorage
 */
export function loadReportsVault(): PathologyReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REPORTS_VAULT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read reports vault from localStorage:', err);
  }

  // Seed vault with sample report & blank preset so scanning works right away
  const sampleReport: PathologyReport = JSON.parse(
    JSON.stringify(PRESET_REPORTS.vertical_physical_sample)
  );
  sampleReport.lastGeneratedAt = new Date().toLocaleString();

  const redcliffeReport: PathologyReport = JSON.parse(
    JSON.stringify(PRESET_REPORTS.redcliffe_vertical)
  );
  redcliffeReport.patient = {
    patientName: 'Riya Sharma',
    ageSex: '15 Yrs / Female',
    date: '28/10/2026',
    reportNo: 'REP-2026-208',
  };
  redcliffeReport.lastGeneratedAt = new Date().toLocaleString();

  const initialVault = [sampleReport, redcliffeReport];
  saveReportsVault(initialVault);
  return initialVault;
}

export function saveReportsVault(vault: PathologyReport[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REPORTS_VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (err) {
    console.warn('Could not save reports vault to localStorage:', err);
  }
}

/**
 * Upsert a patient report into the Local Vault keyed by Report No.
 */
export function upsertReportInVault(report: PathologyReport): PathologyReport[] {
  const vault = loadReportsVault();
  const code = normalizeBarcodeText(report.patient.reportNo || 'REP-2026-101');
  const updatedReport: PathologyReport = {
    ...JSON.parse(JSON.stringify(report)),
    patient: {
      ...report.patient,
      reportNo: code,
    },
    lastGeneratedAt: new Date().toLocaleString(),
  };

  const existingIndex = vault.findIndex(
    (r) => normalizeBarcodeText(r.patient.reportNo) === code
  );

  let nextVault: PathologyReport[];
  if (existingIndex >= 0) {
    nextVault = [...vault];
    nextVault[existingIndex] = updatedReport;
  } else {
    nextVault = [updatedReport, ...vault];
  }

  saveReportsVault(nextVault);
  return nextVault;
}

export function deleteReportFromVault(reportNo: string): PathologyReport[] {
  const code = normalizeBarcodeText(reportNo);
  const vault = loadReportsVault().filter(
    (r) => normalizeBarcodeText(r.patient.reportNo) !== code
  );
  saveReportsVault(vault);
  return vault;
}

/**
 * Find a patient report in the Local Vault by scanned barcode string or patient name
 */
export function findReportByBarcodeOrQuery(
  scannedRaw: string,
  vault: PathologyReport[]
): PathologyReport | null {
  const cleaned = normalizeBarcodeText(scannedRaw);
  if (!cleaned) return null;

  // 1. Exact Report No. match
  const exact = vault.find(
    (r) => normalizeBarcodeText(r.patient.reportNo) === cleaned
  );
  if (exact) return exact;

  // 2. Partial Report No. match (e.g. scanning "0104" matches "PHY-2026-0104")
  const partialCode = vault.find(
    (r) =>
      normalizeBarcodeText(r.patient.reportNo).includes(cleaned) ||
      cleaned.includes(normalizeBarcodeText(r.patient.reportNo))
  );
  if (partialCode) return partialCode;

  // 3. Patient Name match
  const qLower = scannedRaw.trim().toLowerCase();
  const byName = vault.find((r) =>
    (r.patient.patientName || '').toLowerCase().includes(qLower)
  );
  return byName || null;
}

/**
 * Save a single patient report to a local .json file on the user's device
 */
export function exportReportToLocalFile(report: PathologyReport): void {
  const code = normalizeBarcodeText(report.patient.reportNo || 'REP-2026-101');
  const safePatient = (report.patient.patientName || 'patient')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const payload = {
    type: 'PATHOLAB_A4_SINGLE_REPORT',
    version: 2,
    savedAt: new Date().toISOString(),
    barcode: code,
    report,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${code.toLowerCase()}-${safePatient}.patholab.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Save all patient reports in the local vault to a single local .json database file
 */
export function exportAllReportsVaultToLocalFile(
  vault: PathologyReport[],
  currentReport?: PathologyReport
): void {
  let list = [...vault];
  if (currentReport) {
    const code = normalizeBarcodeText(currentReport.patient.reportNo);
    const idx = list.findIndex(
      (r) => normalizeBarcodeText(r.patient.reportNo) === code
    );
    if (idx >= 0) {
      list[idx] = currentReport;
    } else {
      list = [currentReport, ...list];
    }
  }

  const payload = {
    type: 'PATHOLAB_A4_REPORTS_VAULT',
    version: 2,
    exportedAt: new Date().toISOString(),
    count: list.length,
    reports: list,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `patholab-local-reports-database-${list.length}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse an uploaded local .json file (supports single report, raw PathologyReport, or full vault database)
 */
export async function importFromLocalJsonFile(file: File): Promise<{
  loadedReport: PathologyReport;
  updatedVault: PathologyReport[];
  importedCount: number;
}> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  // Case 1: Full Vault Database file
  if (
    parsed &&
    parsed.type === 'PATHOLAB_A4_REPORTS_VAULT' &&
    Array.isArray(parsed.reports) &&
    parsed.reports.length > 0
  ) {
    let vault = loadReportsVault();
    for (const rep of parsed.reports) {
      if (rep && rep.header && rep.patient && Array.isArray(rep.vitals)) {
        vault = upsertReportInVault(rep);
      }
    }
    return {
      loadedReport: parsed.reports[0],
      updatedVault: vault,
      importedCount: parsed.reports.length,
    };
  }

  // Case 2: Single wrapped report file
  if (
    parsed &&
    parsed.type === 'PATHOLAB_A4_SINGLE_REPORT' &&
    parsed.report &&
    parsed.report.header
  ) {
    const updatedVault = upsertReportInVault(parsed.report);
    return {
      loadedReport: parsed.report,
      updatedVault,
      importedCount: 1,
    };
  }

  // Case 3: Array of reports
  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].header) {
    let vault = loadReportsVault();
    for (const rep of parsed) {
      vault = upsertReportInVault(rep);
    }
    return {
      loadedReport: parsed[0],
      updatedVault: vault,
      importedCount: parsed.length,
    };
  }

  // Case 4: Direct PathologyReport object
  if (parsed && parsed.header && parsed.patient && Array.isArray(parsed.vitals)) {
    const updatedVault = upsertReportInVault(parsed as PathologyReport);
    return {
      loadedReport: parsed as PathologyReport,
      updatedVault,
      importedCount: 1,
    };
  }

  throw new Error('Unrecognized local report file format.');
}
