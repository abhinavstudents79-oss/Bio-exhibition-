import React, { useEffect, useRef, useState } from 'react';
import { PathologyReport } from '../types/pathology';
import { AutoReportBarcode } from './ClinicalGraphics';
import {
  decodeCode39FromVisualSource,
  deleteReportFromVault,
  exportAllReportsVaultToLocalFile,
  exportReportToLocalFile,
  findReportByBarcodeOrQuery,
  importFromLocalJsonFile,
  normalizeBarcodeText,
} from '../utils/localReportStorage';
import {
  ScanLine,
  Camera,
  Upload,
  FolderDown,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Trash2,
  Database,
  ArrowRight,
  Barcode,
} from 'lucide-react';

interface BarcodeScannerCornerProps {
  currentReport: PathologyReport;
  vault: PathologyReport[];
  onLoadReportFromScan: (report: PathologyReport, message: string) => void;
  onSaveCurrentToVault: () => void;
  onVaultChange: (updatedVault: PathologyReport[]) => void;
}

export const BarcodeScannerCorner: React.FC<BarcodeScannerCornerProps> = ({
  currentReport,
  vault,
  onLoadReportFromScan,
  onSaveCurrentToVault,
  onVaultChange,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleBarcodeDetected = (rawCode: string, sourceLabel: string) => {
    const cleaned = normalizeBarcodeText(rawCode);
    const matched = findReportByBarcodeOrQuery(rawCode, vault);

    if (matched) {
      stopCamera();
      setScanStatus({
        type: 'success',
        text: `${sourceLabel}: Loaded ${
          matched.patient.patientName || 'Blank Sheet'
        } (*${matched.patient.reportNo}*)`,
      });
      onLoadReportFromScan(
        matched,
        `Scanned Barcode *${matched.patient.reportNo}* → Loaded ${
          matched.patient.patientName || 'Patient Report'
        }`
      );
      setIsScannerModalOpen(false);
    } else {
      setScanStatus({
        type: 'error',
        text: `No saved report found for barcode "${cleaned}". Save the report first or load its .json file.`,
      });
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    handleBarcodeDetected(scanInput.trim(), 'Barcode Scan');
  };

  const startCameraScanner = async () => {
    setScanStatus({
      type: 'info',
      text: 'Starting camera barcode scanner... Point camera at report barcode.',
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);

      // Set up periodic frame scanning using BarcodeDetector + built-in Code 39 1D decoder
      const hasNativeDetector = 'BarcodeDetector' in window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = hasNativeDetector ? new (window as any).BarcodeDetector({ formats: ['code_39', 'code_128', 'ean_13', 'qr_code'] }) : null;

      scanIntervalRef.current = window.setInterval(async () => {
        const videoEl = videoRef.current;
        if (!videoEl || videoEl.readyState < 2) return;

        // 1. Try native BarcodeDetector first
        if (detector) {
          try {
            const barcodes = await detector.detect(videoEl);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleBarcodeDetected(barcodes[0].rawValue, 'Camera Scan');
              return;
            }
          } catch {
            // Fall through to optical Code-39 scanline decoder
          }
        }

        // 2. Built-in Code 39 optical scanline decoder
        const opticalCode = decodeCode39FromVisualSource(videoEl);
        if (opticalCode) {
          handleBarcodeDetected(opticalCode, 'Optical Camera Scan');
        }
      }, 350);
    } catch (err) {
      console.warn('Camera access failed:', err);
      setScanStatus({
        type: 'error',
        text: 'Camera permission unavailable. Use "Scan Image / Local .json File" or type/scan barcode below.',
      });
      setIsCameraActive(false);
    }
  };

  const handleFileScanOrImport = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. If JSON local file -> import into vault and show patient report
      if (
        file.name.toLowerCase().endsWith('.json') ||
        file.type === 'application/json'
      ) {
        const { loadedReport, updatedVault, importedCount } =
          await importFromLocalJsonFile(file);
        onVaultChange(updatedVault);
        setScanStatus({
          type: 'success',
          text: `Loaded ${importedCount} report(s) from local file "${file.name}" (*${loadedReport.patient.reportNo}*)`,
        });
        onLoadReportFromScan(
          loadedReport,
          `Opened Local File: ${
            loadedReport.patient.patientName || loadedReport.patient.reportNo
          }`
        );
        setIsScannerModalOpen(false);
        e.target.value = '';
        return;
      }

      // 2. If Image file (PNG/JPG of barcode or A4 report) -> decode barcode optically
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        let detectedCode: string | null = null;

        // Try native BarcodeDetector on image
        if ('BarcodeDetector' in window) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detector = new (window as any).BarcodeDetector({
              formats: ['code_39', 'code_128', 'ean_13', 'qr_code'],
            });
            const results = await detector.detect(img);
            if (results && results.length > 0 && results[0].rawValue) {
              detectedCode = results[0].rawValue;
            }
          } catch {
            // Fallback below
          }
        }

        // Try built-in Code 39 1D scanline optical reader
        if (!detectedCode) {
          detectedCode = decodeCode39FromVisualSource(img);
        }

        URL.revokeObjectURL(imageUrl);

        if (detectedCode) {
          handleBarcodeDetected(detectedCode, 'Image Barcode Scan');
        } else {
          // Also check if filename matches a saved report's patient name or reportNo
          const baseName = file.name
            .replace(/\.(png|jpg|jpeg|webp)$/i, '')
            .replace(/physical-report-|-a4/gi, '');
          const byFile = findReportByBarcodeOrQuery(baseName, vault);
          if (byFile) {
            handleBarcodeDetected(
              byFile.patient.reportNo,
              'Report Image Match'
            );
          } else {
            setScanStatus({
              type: 'error',
              text: 'Could not detect a matching barcode in that image. Try uploading the .json local report file or scanning a clear barcode.',
            });
          }
        }
      };
      img.src = imageUrl;
    } catch (err) {
      setScanStatus({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Could not read local report file.',
      });
    }
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden input for Local File (.json) or Barcode Image (.png/.jpg) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json,image/*"
        onChange={handleFileScanOrImport}
        className="hidden"
      />

      {/* CORNER BARCODE SCANNER & LOCAL FILE SAVING WIDGET ON DASHBOARD */}
      <div className="flex flex-col justify-between gap-2.5 p-3.5 rounded-lg bg-slate-900 text-white border border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <ScanLine className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Corner Barcode Scanner & Local Vault</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Scan barcode or load <span className="font-mono text-amber-300">.json</span> local file to open patient report ({vault.length} saved).
            </p>
          </div>
          <div
            onClick={() => setIsScannerModalOpen(true)}
            className="cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            title="Click to open Barcode Scanner & Local Saved Reports"
          >
            <AutoReportBarcode
              report={currentReport}
              widthPx={112}
              heightPx={24}
            />
          </div>
        </div>

        {/* Quick Barcode Scan Input right in the Corner */}
        <form onSubmit={handleManualScanSubmit} className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Barcode className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan/Enter Barcode (e.g. PHY-2026-0104)..."
              aria-label="Scan or Enter Barcode"
              className="w-full pl-8 pr-2 py-1.5 min-h-[34px] text-[11px] font-mono bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shrink-0 transition-colors"
            title="Find and open patient report by barcode"
          >
            <Search className="w-3 h-3" />
            Scan
          </button>
        </form>

        {/* Action Row: Open Scanner Modal, Save Local File, Load Local File */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 min-h-[34px] text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded transition-colors whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            Scanner ({vault.length})
          </button>

          <button
            type="button"
            onClick={() => {
              onSaveCurrentToVault();
              exportReportToLocalFile(currentReport);
            }}
            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 min-h-[34px] text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded transition-colors whitespace-nowrap"
            title="Save current patient report to local .json file and local vault"
          >
            <Save className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            Save File
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 min-h-[34px] text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded transition-colors whitespace-nowrap"
            title="Load patient report from local .json file or scan barcode image"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Open File
          </button>
        </div>
      </div>

      {/* FULL INTERACTIVE BARCODE SCANNER & LOCAL SAVED REPORTS MODAL */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="font-display text-sm sm:text-base font-bold">
                    Barcode Scanner & Local Patient Reports Vault
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Scan any report barcode via Camera, Image, USB Scanner, or Local <span className="font-mono text-amber-300">.json</span> File
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsScannerModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Status Banner */}
              {scanStatus && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-medium ${
                    scanStatus.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : scanStatus.type === 'error'
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}
                >
                  {scanStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span>{scanStatus.text}</span>
                </div>
              )}

              {/* 1. Barcode Scanner Controls (Camera + Image/File Upload + Manual/USB Input) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={startCameraScanner}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Start Camera Scanner
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Stop Camera
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4 text-amber-800" />
                  Scan Barcode Image / .json
                </button>

                <button
                  type="button"
                  onClick={() =>
                    exportAllReportsVaultToLocalFile(vault, currentReport)
                  }
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                >
                  <FolderDown className="w-4 h-4 text-blue-700" />
                  Download All Reports (.json)
                </button>
              </div>

              {/* Live Camera Viewport when active */}
              {isCameraActive && (
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border-2 border-emerald-500 aspect-video max-h-60 mx-auto flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {/* Red Laser Scanline Overlay */}
                  <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.9)] animate-pulse" />
                  <div className="pointer-events-none absolute inset-4 border border-emerald-400/50 rounded-lg" />
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-mono text-emerald-300">
                    Align report barcode with red laser line...
                  </span>
                </div>
              )}

              {/* USB / Hardware Barcode Scanner or Manual Code Lookup */}
              <form
                onSubmit={handleManualScanSubmit}
                className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200"
              >
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan with USB Barcode Scanner or enter Report No. (e.g. PHY-2026-0104)..."
                    className="w-full pl-9 pr-3 py-2 min-h-[38px] text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[38px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  Find & Show Patient Report
                </button>
              </form>

              {/* Saved Local Reports Vault List (Click any barcode to simulate scan & open) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>
                      Saved Local Patient Reports ({vault.length} in Local Storage)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveCurrentToVault();
                      setScanStatus({
                        type: 'success',
                        text: `Saved current report (*${currentReport.patient.reportNo}*) to Local Vault.`,
                      });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <Save className="w-3.5 h-3.5" />
                    + Save Current Report to Vault
                  </button>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg max-h-64 overflow-y-auto bg-white">
                  {vault.map((rep) => (
                    <div
                      key={rep.patient.reportNo + rep.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AutoReportBarcode
                          report={rep}
                          widthPx={110}
                          heightPx={22}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {rep.patient.patientName || 'Blank Write-In Patient Sheet'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                            Barcode: *{rep.patient.reportNo}* · {rep.patient.ageSex || 'Age/Sex Blank'} · {rep.patient.date || 'No Date'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleBarcodeDetected(
                              rep.patient.reportNo,
                              'Vault Barcode Scan'
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-[#005493] hover:bg-[#003f70] rounded-md"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Show Report
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => exportReportToLocalFile(rep)}
                          className="p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-md"
                          title="Save this patient report as a local .json file"
                        >
                          <FolderDown className="w-3.5 h-3.5" />
                        </button>

                        {vault.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = deleteReportFromVault(
                                rep.patient.reportNo
                              );
                              onVaultChange(next);
                            }}
                            className="p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-md"
                            title="Delete from local vault"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
