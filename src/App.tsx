/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  PathologyReport,
  VitalSignBox,
  WorkspaceViewMode,
} from './types/pathology';
import {
  DEFAULT_VITALS_VERTICAL_SAMPLE,
  PRESET_REPORTS,
} from './data/presets';
import { A4ReportSheet } from './components/A4ReportSheet';
import { CreatorDashboard } from './components/CreatorDashboard';
import { ActiveDrawer, DrawerPanels } from './components/DrawerPanels';
import {
  Download,
  Printer,
  Eye,
  Edit3,
  FileImage,
  CheckCircle2,
  Eraser,
  Sparkles,
  Upload,
  LayoutDashboard,
  FileText,
  Columns,
  Barcode,
  FolderKanban,
  Stamp,
  Save,
  FolderDown,
} from 'lucide-react';
import {
  ACTIVE_REPORT_STORAGE_KEY,
  exportReportToLocalFile,
  loadReportsVault,
  upsertReportInVault,
} from './utils/localReportStorage';

const LOCAL_STORAGE_KEY = ACTIVE_REPORT_STORAGE_KEY;

function loadInitialReportFromStorage(): PathologyReport {
  const fallback: PathologyReport = JSON.parse(
    JSON.stringify(PRESET_REPORTS.vertical_physical_blank)
  );
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PathologyReport>;
    if (!parsed || !parsed.header || !parsed.patient || !Array.isArray(parsed.vitals)) {
      return fallback;
    }
    return {
      ...fallback,
      ...parsed,
      header: {
        ...fallback.header,
        ...parsed.header,
      },
      patient: {
        ...fallback.patient,
        ...parsed.patient,
      },
      showBarcode: parsed.showBarcode ?? true,
    };
  } catch (err) {
    console.warn('Could not restore saved report from localStorage:', err);
    return fallback;
  }
}

export default function App() {
  const [report, setReport] = useState<PathologyReport>(() =>
    loadInitialReportFromStorage()
  );
  const [vault, setVault] = useState<PathologyReport[]>(() =>
    loadReportsVault()
  );
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1280
      ? WorkspaceViewMode.SPLIT_STUDIO
      : WorkspaceViewMode.DASHBOARD
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [zoomMode, setZoomMode] = useState<'auto' | number>('auto');
  const [autoScale, setAutoScale] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingEffect, setIsGeneratingEffect] = useState(false);
  const [exportStatusMessage, setExportStatusMessage] = useState<string | null>(
    null
  );
  const [lastSavedAt, setLastSavedAt] = useState<string>('Auto-saved');

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const a4ViewportWrapperRef = useRef<HTMLDivElement | null>(null);
  const leftClubInputRef = useRef<HTMLInputElement | null>(null);
  const rightSchoolInputRef = useRef<HTMLInputElement | null>(null);

  // Persist current report state to localStorage whenever report object changes
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(report));
      const now = new Date();
      setLastSavedAt(
        `Saved ${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`
      );
    } catch (err) {
      console.warn('localStorage quota or write error:', err);
    }
  }, [report]);

  // Automatically calculate scale so the 794px A4 sheet fits any mobile, tablet, or laptop container without clipping
  useEffect(() => {
    const updateScale = () => {
      if (zoomMode !== 'auto') {
        setAutoScale(zoomMode / 100);
        return;
      }
      const wrapperWidth =
        a4ViewportWrapperRef.current?.clientWidth ||
        Math.min(window.innerWidth - 24, 794);
      if (wrapperWidth < 794) {
        setAutoScale(Math.max(0.36, (wrapperWidth - 8) / 794));
      } else {
        setAutoScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [zoomMode, viewMode]);

  const handleCornerUpload = (
    field: 'leftClubLogoUrl' | 'rightSchoolLogoUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReport((prev) => ({
          ...prev,
          header: {
            ...prev.header,
            [field]: reader.result as string,
          },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCurrentToVault = () => {
    const nextVault = upsertReportInVault(report);
    setVault(nextVault);
    setExportStatusMessage(
      `Saved *${report.patient.reportNo}* to Local Vault`
    );
    setTimeout(() => setExportStatusMessage(null), 2800);
  };

  const handleLoadReportFromScan = (
    loaded: PathologyReport,
    message: string
  ) => {
    setReport(JSON.parse(JSON.stringify(loaded)));
    setExportStatusMessage(message);
    if (viewMode === WorkspaceViewMode.DASHBOARD && window.innerWidth >= 1280) {
      setViewMode(WorkspaceViewMode.SPLIT_STUDIO);
    } else {
      setViewMode(WorkspaceViewMode.A4_REPORT);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setExportStatusMessage(null), 4000);
  };

  const handleGenerateReportFromDashboard = () => {
    setIsGeneratingEffect(true);
    setExportStatusMessage('Generating & Saving A4 Report + Barcode...');
    setReport((prev) => {
      const d = new Date();
      const todayStr = `${String(d.getDate()).padStart(2, '0')}/${String(
        d.getMonth() + 1
      ).padStart(2, '0')}/${d.getFullYear()}`;
      const nextReport: PathologyReport = {
        ...prev,
        patient: {
          ...prev.patient,
          date: prev.patient.date || todayStr,
          reportNo:
            prev.patient.reportNo ||
            `REP-${d.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        },
        showBarcode: true,
        lastGeneratedAt: new Date().toLocaleTimeString(),
      };
      const updatedVault = upsertReportInVault(nextReport);
      setVault(updatedVault);
      return nextReport;
    });

    setTimeout(() => {
      setIsGeneratingEffect(false);
      setViewMode(WorkspaceViewMode.A4_REPORT);
      setExportStatusMessage('Report Saved Locally & Ready on A4');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setExportStatusMessage(null), 3200);
    }, 320);
  };

  const handleClearToBlankBoxes = () => {
    setReport((prev) => ({
      ...prev,
      patient: {
        patientName: '',
        ageSex: '',
        date: prev.patient.date,
        reportNo: prev.patient.reportNo,
      },
      vitals: prev.vitals.map((v) => ({ ...v, value: '', remarks: '' })),
      generalRemarks: '',
    }));
  };

  const handleFillSampleData = () => {
    setReport((prev) => ({
      ...prev,
      patient: {
        patientName: 'Aarav Verma',
        ageSex: '16 Yrs / Male',
        date: '28/10/2026',
        reportNo: 'PHY-2026-0104',
      },
      vitals: JSON.parse(JSON.stringify(DEFAULT_VITALS_VERTICAL_SAMPLE)),
      generalRemarks:
        'All physical parameters are within healthy athletic wellness range.',
    }));
  };

  const handleDownloadPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportStatusMessage('Calibrating A4 210×297mm PDF...');

    const previousView = viewMode;
    const previousPreview = isPreviewMode;
    const previousZoom = zoomMode;
    if (viewMode === WorkspaceViewMode.DASHBOARD) {
      setViewMode(WorkspaceViewMode.A4_REPORT);
    }
    setZoomMode(100);
    setIsPreviewMode(true);

    try {
      await new Promise((r) => setTimeout(r, 220));
      const el = sheetRef.current;
      if (!el) throw new Error('A4 Sheet element not ready');

      el.classList.add('exporting-pdf');

      const dataUrl = await toPng(el, {
        quality: 1.0,
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        width: 794,
      });

      el.classList.remove('exporting-pdf');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210;
      const pdfPageHeight = 297;
      const imgProps = pdf.getImageProperties(dataUrl);
      const renderedHeightMm = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = renderedHeightMm;
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, renderedHeightMm);
      heightLeft -= pdfPageHeight;

      while (heightLeft > 4) {
        position = heightLeft - renderedHeightMm;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, renderedHeightMm);
        heightLeft -= pdfPageHeight;
      }

      const safeName = (report.patient.patientName || 'blank-sheet')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      pdf.save(`physical-report-${safeName}-a4.pdf`);
      setExportStatusMessage('A4 PDF Downloaded');
      setTimeout(() => setExportStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setExportStatusMessage('PDF Export Failed');
      setTimeout(() => setExportStatusMessage(null), 3000);
    } finally {
      setZoomMode(previousZoom);
      setIsPreviewMode(previousPreview);
      if (previousView === WorkspaceViewMode.DASHBOARD) {
        setViewMode(WorkspaceViewMode.A4_REPORT);
      }
      setIsExporting(false);
    }
  };

  const handleDownloadPng = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportStatusMessage('Rendering High-DPI A4 PNG...');

    const previousPreview = isPreviewMode;
    const previousZoom = zoomMode;
    if (viewMode === WorkspaceViewMode.DASHBOARD) {
      setViewMode(WorkspaceViewMode.A4_REPORT);
    }
    setZoomMode(100);
    setIsPreviewMode(true);

    try {
      await new Promise((r) => setTimeout(r, 220));
      const el = sheetRef.current;
      if (!el) throw new Error('A4 Sheet element not ready');

      el.classList.add('exporting-pdf');

      const dataUrl = await toPng(el, {
        quality: 1.0,
        pixelRatio: 2.5,
        backgroundColor: '#FFFFFF',
        width: 794,
      });

      el.classList.remove('exporting-pdf');

      const a = document.createElement('a');
      const safeName = (report.patient.patientName || 'blank-sheet')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      a.href = dataUrl;
      a.download = `physical-report-${safeName}-a4.png`;
      a.click();
      setExportStatusMessage('A4 PNG Downloaded');
      setTimeout(() => setExportStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      setZoomMode(previousZoom);
      setIsPreviewMode(previousPreview);
      setIsExporting(false);
    }
  };

  const handleNativePrint = () => {
    if (viewMode === WorkspaceViewMode.DASHBOARD) {
      setViewMode(WorkspaceViewMode.A4_REPORT);
      setTimeout(() => window.print(), 180);
    } else {
      window.print();
    }
  };

  const handleAddVitalItem = (item: Omit<VitalSignBox, 'id'>) => {
    const newRow: VitalSignBox = {
      ...item,
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    setReport((prev) => ({
      ...prev,
      vitals: [...prev.vitals, newRow],
    }));
  };

  const containerMaxWidth =
    viewMode === WorkspaceViewMode.A4_REPORT
      ? 'max-w-[820px]'
      : viewMode === WorkspaceViewMode.DASHBOARD
      ? 'max-w-[1140px]'
      : 'max-w-[1440px]';

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 pb-20 md:pb-12">
      {/* Hidden File Inputs for Quick Top-Left Club & Top-Right School Logo Uploads */}
      <input
        ref={leftClubInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleCornerUpload('leftClubLogoUrl', e)}
        className="hidden"
      />
      <input
        ref={rightSchoolInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleCornerUpload('rightSchoolLogoUrl', e)}
        className="hidden"
      />

      {/* STRICT 3-ZONE TOP BAR CONTRACT (Responsive for Mobile, Tablet & Laptop) */}
      <div className="bg-white border-b border-slate-300 sticky top-0 z-30 no-print">
        <header
          className={`flex items-center justify-between gap-4 sm:gap-8 px-3.5 sm:px-5 h-[54px] mx-auto ${containerMaxWidth}`}
        >
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-base font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
          >
            PathoLab A4
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveDrawer('templates')}
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawer('catalog')}
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Add Parameters
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawer('branding')}
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Logos & Watermark
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawer('json')}
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              JSON Data
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 min-h-[38px] text-xs font-semibold text-white bg-[#005493] hover:bg-[#003f70] disabled:opacity-60 rounded-md shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Download A4 PDF'}
            </button>
          </div>
        </header>
      </div>

      {/* WORKSPACE CONTROL BAR (Adaptive across Mobile, Tablet & Laptop) */}
      <div className={`mx-auto mt-2.5 sm:mt-3 px-2.5 sm:px-5 no-print ${containerMaxWidth}`}>
        <div className="bg-slate-900 text-slate-100 rounded-t-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left: View Switcher */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center bg-slate-800 p-0.5 rounded-md w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode(WorkspaceViewMode.DASHBOARD)}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  viewMode === WorkspaceViewMode.DASHBOARD
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                1. Dashboard
              </button>
              <button
                type="button"
                onClick={() => setViewMode(WorkspaceViewMode.SPLIT_STUDIO)}
                className={`hidden xl:inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  viewMode === WorkspaceViewMode.SPLIT_STUDIO
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                Split View
              </button>
              <button
                type="button"
                onClick={() => setViewMode(WorkspaceViewMode.A4_REPORT)}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  viewMode === WorkspaceViewMode.A4_REPORT
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                2. A4 Report ({Math.round(autoScale * 100)}%)
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearToBlankBoxes}
                title="Clear all values to Blank Write-in Boxes"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap shrink-0"
              >
                <Eraser className="w-3 h-3" />
                Blank Boxes
              </button>

              <button
                type="button"
                onClick={handleFillSampleData}
                title="Fill sample values into Vertical Physical Boxes"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3 h-3" />
                Sample Data
              </button>
            </div>
          </div>

          {/* Center: Quick Club Logo & School Logo Upload + Generate */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => leftClubInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3 h-3 text-sky-400" />
              Club Logo (+Watermark)
            </button>

            <button
              type="button"
              onClick={() => rightSchoolInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3 h-3 text-amber-400" />
              School Logo
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveCurrentToVault();
                exportReportToLocalFile(report);
              }}
              title="Save current patient report to local .json file and local vault"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap shrink-0"
            >
              <FolderDown className="w-3.5 h-3.5 text-emerald-400" />
              Save Local File (.json)
            </button>

            <button
              type="button"
              onClick={handleGenerateReportFromDashboard}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 whitespace-nowrap shrink-0"
            >
              <Barcode className="w-3.5 h-3.5" />
              Generate Report & Barcode
            </button>
          </div>

          {/* Right: Auto-Save Indicator, Preview Toggle, PNG, Print & Zoom */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
            {exportStatusMessage ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 mr-1 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {exportStatusMessage}
              </span>
            ) : (
              <span
                className="hidden md:inline-flex items-center gap-1 text-[10.5px] font-mono text-slate-400 mr-1 tabular-nums"
                title="All changes are automatically persisted to browser localStorage"
              >
                <Save className="w-3 h-3 text-emerald-400" />
                {lastSavedAt}
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => setIsPreviewMode((p) => !p)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap shrink-0"
              >
                {isPreviewMode ? (
                  <>
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Clean View
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExporting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap shrink-0"
              >
                <FileImage className="w-3 h-3" />
                PNG
              </button>
              <button
                type="button"
                onClick={handleNativePrint}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap shrink-0"
              >
                <Printer className="w-3 h-3" />
                Print
              </button>
              {viewMode !== WorkspaceViewMode.DASHBOARD && (
                <select
                  value={zoomMode}
                  onChange={(e) =>
                    setZoomMode(
                      e.target.value === 'auto'
                        ? 'auto'
                        : Number(e.target.value)
                    )
                  }
                  aria-label="A4 Sheet Zoom"
                  className="bg-slate-800 text-slate-200 text-[11px] font-mono rounded px-2 py-1 border border-slate-700 tabular-nums shrink-0"
                >
                  <option value="auto">Fit Screen</option>
                  <option value={75}>75%</option>
                  <option value={100}>100% A4</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE CONTAINER (Mobile, Tablet & Laptop Responsive) */}
      <main className={`mx-auto mt-3 px-2.5 sm:px-5 ${containerMaxWidth}`}>
        <AnimatePresence mode="wait">
          {viewMode === WorkspaceViewMode.DASHBOARD && (
            <motion.div
              key="dashboard-only"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <CreatorDashboard
                report={report}
                vault={vault}
                onChange={setReport}
                onGenerateReport={handleGenerateReportFromDashboard}
                onLoadReportFromScan={handleLoadReportFromScan}
                onSaveCurrentToVault={handleSaveCurrentToVault}
                onVaultChange={setVault}
                isGenerating={isGeneratingEffect}
              />
            </motion.div>
          )}

          {viewMode === WorkspaceViewMode.SPLIT_STUDIO && (
            <motion.div
              key="split-studio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="grid grid-cols-12 gap-6 items-start"
            >
              <div className="col-span-12 xl:col-span-5 no-print">
                <CreatorDashboard
                  report={report}
                  vault={vault}
                  onChange={setReport}
                  onGenerateReport={handleGenerateReportFromDashboard}
                  onLoadReportFromScan={handleLoadReportFromScan}
                  onSaveCurrentToVault={handleSaveCurrentToVault}
                  onVaultChange={setVault}
                  isGenerating={isGeneratingEffect}
                />
              </div>

              <div
                ref={a4ViewportWrapperRef}
                className="col-span-12 xl:col-span-7 w-full flex justify-center xl:sticky xl:top-16 overflow-hidden"
              >
                <div
                  style={{
                    width: `${794 * autoScale}px`,
                    minHeight: `${1123 * autoScale}px`,
                  }}
                  className="relative"
                >
                  <div
                    style={{
                      transform:
                        autoScale !== 1 ? `scale(${autoScale})` : undefined,
                      transformOrigin: 'top left',
                    }}
                    className="transition-transform duration-150"
                  >
                    <A4ReportSheet
                      report={report}
                      isPreviewMode={isPreviewMode}
                      sheetRef={sheetRef}
                      onChange={setReport}
                      onOpenCatalog={() => setActiveDrawer('catalog')}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === WorkspaceViewMode.A4_REPORT && (
            <motion.div
              key="a4-report-only"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              ref={a4ViewportWrapperRef}
              className="w-full flex justify-center overflow-hidden"
            >
              <div
                style={{
                  width: `${794 * autoScale}px`,
                  minHeight: `${1123 * autoScale}px`,
                }}
                className="relative"
              >
                <div
                  style={{
                    transform:
                      autoScale !== 1 ? `scale(${autoScale})` : undefined,
                    transformOrigin: 'top left',
                  }}
                  className="transition-transform duration-150"
                >
                  <A4ReportSheet
                    report={report}
                    isPreviewMode={isPreviewMode}
                    sheetRef={sheetRef}
                    onChange={setReport}
                    onOpenCatalog={() => setActiveDrawer('catalog')}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (< 768px, Thumb-Zone Ergonomic & <15% Viewport Cap) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-300 grid grid-cols-4 items-center h-14 no-print"
      >
        <button
          type="button"
          onClick={() => setViewMode(WorkspaceViewMode.DASHBOARD)}
          className={`flex flex-col items-center justify-center h-full text-[10.5px] font-semibold transition-colors ${
            viewMode === WorkspaceViewMode.DASHBOARD
              ? 'text-[#005493]'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          Dashboard
        </button>

        <button
          type="button"
          onClick={handleGenerateReportFromDashboard}
          className={`flex flex-col items-center justify-center h-full text-[10.5px] font-semibold transition-colors ${
            viewMode === WorkspaceViewMode.A4_REPORT
              ? 'text-[#005493]'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          A4 Report
        </button>

        <button
          type="button"
          onClick={() => setActiveDrawer('branding')}
          className="flex flex-col items-center justify-center h-full text-[10.5px] font-semibold text-slate-500 hover:text-slate-900"
        >
          <Stamp className="w-4 h-4 mb-0.5" />
          Logos & Barcode
        </button>

        <button
          type="button"
          onClick={() => setActiveDrawer('templates')}
          className="flex flex-col items-center justify-center h-full text-[10.5px] font-semibold text-slate-500 hover:text-slate-900"
        >
          <FolderKanban className="w-4 h-4 mb-0.5" />
          Templates
        </button>
      </nav>

      {/* SLIDE-OVER DRAWERS */}
      <DrawerPanels
        activeDrawer={activeDrawer}
        report={report}
        onClose={() => setActiveDrawer(null)}
        onSelectPreset={(preset) => setReport(preset)}
        onAddVitalItem={handleAddVitalItem}
        onUpdateReport={setReport}
      />
    </div>
  );
}
