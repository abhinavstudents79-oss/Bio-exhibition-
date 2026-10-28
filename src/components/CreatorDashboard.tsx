import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DensityMode,
  PathologyReport,
  VitalSignBox,
} from '../types/pathology';
import {
  DEFAULT_VITALS_VERTICAL_BLANK,
  DEFAULT_VITALS_VERTICAL_SAMPLE,
  EXTRA_PHYSICAL_ITEMS,
} from '../data/presets';
import {
  AutoReportBarcode,
  DefaultClubEmblemSvg,
  DefaultSchoolCrestSvg,
} from './ClinicalGraphics';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Upload,
  Sparkles,
  Eraser,
  Calculator,
  Barcode,
  FileCheck2,
  Calendar,
  Hash,
  RotateCcw,
  Layers,
} from 'lucide-react';

interface CreatorDashboardProps {
  report: PathologyReport;
  onChange: (updated: PathologyReport) => void;
  onGenerateReport: () => void;
  isGenerating: boolean;
}

const THEME_OPTIONS = [
  {
    id: 'oracare_blue' as const,
    label: 'Royal Blue Wave',
    primary: '#005493',
    secondary: '#94A3B8',
  },
  {
    id: 'redcliffe' as const,
    label: 'Redcliffe Navy',
    primary: '#0A2540',
    secondary: '#E11D48',
  },
  {
    id: 'lalpath' as const,
    label: 'Lal PathLabs Blue',
    primary: '#004B8D',
    secondary: '#F59E0B',
  },
  {
    id: 'clinical' as const,
    label: 'Clinical Teal',
    primary: '#0F766E',
    secondary: '#10B981',
  },
  {
    id: 'monochrome' as const,
    label: 'Monochrome',
    primary: '#18181B',
    secondary: '#71717A',
  },
];

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  report,
  onChange,
  onGenerateReport,
  isGenerating,
}) => {
  const clubInputRef = useRef<HTMLInputElement | null>(null);
  const schoolInputRef = useRef<HTMLInputElement | null>(null);

  const primaryColor = report.header.accentColor || '#005493';
  const secondaryColor = report.header.secondaryAccentColor || '#94A3B8';

  const updateHeader = (patch: Partial<PathologyReport['header']>) => {
    onChange({
      ...report,
      header: { ...report.header, ...patch },
    });
  };

  const updatePatient = (patch: Partial<PathologyReport['patient']>) => {
    onChange({
      ...report,
      patient: { ...report.patient, ...patch },
    });
  };

  const handleLogoFile = (
    field: 'leftClubLogoUrl' | 'rightSchoolLogoUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateHeader({ [field]: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateVital = (id: string, patch: Partial<VitalSignBox>) => {
    const nextVitals = report.vitals.map((v) =>
      v.id === id ? { ...v, ...patch } : v
    );

    if (
      (id === 'v-weight' || id === 'v-height') &&
      patch.value !== undefined
    ) {
      const wBox = nextVitals.find(
        (v) => v.id === 'v-weight' || v.label.toLowerCase().includes('weight')
      );
      const hBox = nextVitals.find(
        (v) => v.id === 'v-height' || v.label.toLowerCase().includes('height')
      );
      const wVal = parseFloat(wBox?.value || '');
      const hVal = parseFloat(hBox?.value || '');
      if (!isNaN(wVal) && !isNaN(hVal) && hVal > 30 && wVal > 5) {
        const hMeters = hVal / 100;
        const bmi = (wVal / (hMeters * hMeters)).toFixed(1);
        const bmiIdx = nextVitals.findIndex(
          (v) => v.id === 'v-bmi' || v.label.toLowerCase().includes('bmi')
        );
        if (bmiIdx !== -1) {
          nextVitals[bmiIdx] = { ...nextVitals[bmiIdx], value: bmi };
        }
      }
    }

    onChange({ ...report, vitals: nextVitals });
  };

  const addBlankRow = () => {
    const newRow: VitalSignBox = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: 'Custom Physical Parameter',
      value: '',
      unit: 'Unit',
      normalRange: 'Normal Range',
      remarks: '',
    };
    onChange({ ...report, vitals: [...report.vitals, newRow] });
  };

  const addQuickParameter = (item: Omit<VitalSignBox, 'id'>) => {
    const newRow: VitalSignBox = {
      ...item,
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    onChange({ ...report, vitals: [...report.vitals, newRow] });
  };

  const removeRow = (id: string) => {
    onChange({
      ...report,
      vitals: report.vitals.filter((v) => v.id !== id),
    });
  };

  const duplicateRow = (vital: VitalSignBox, index: number) => {
    const copy: VitalSignBox = {
      ...vital,
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    const next = [...report.vitals];
    next.splice(index + 1, 0, copy);
    onChange({ ...report, vitals: next });
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const next = [...report.vitals];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    onChange({ ...report, vitals: next });
  };

  const clearAllValues = () => {
    onChange({
      ...report,
      patient: {
        patientName: '',
        ageSex: '',
        date: report.patient.date,
        reportNo: report.patient.reportNo,
      },
      vitals: report.vitals.map((v) => ({ ...v, value: '', remarks: '' })),
      generalRemarks: '',
    });
  };

  const fillSampleValues = () => {
    onChange({
      ...report,
      patient: {
        patientName: 'Aarav Verma',
        ageSex: '16 Yrs / Male',
        date: '28/10/2026',
        reportNo: 'PHY-2026-0104',
      },
      vitals: JSON.parse(JSON.stringify(DEFAULT_VITALS_VERTICAL_SAMPLE)),
      generalRemarks:
        'All physical parameters are within healthy athletic wellness range.',
    });
  };

  const calculateBmiNow = () => {
    const wBox = report.vitals.find(
      (v) => v.id === 'v-weight' || v.label.toLowerCase().includes('weight')
    );
    const hBox = report.vitals.find(
      (v) => v.id === 'v-height' || v.label.toLowerCase().includes('height')
    );
    const wVal = parseFloat(wBox?.value || '');
    const hVal = parseFloat(hBox?.value || '');
    if (!isNaN(wVal) && !isNaN(hVal) && hVal > 30) {
      const bmi = (wVal / Math.pow(hVal / 100, 2)).toFixed(1);
      onChange({
        ...report,
        vitals: report.vitals.map((v) =>
          v.id === 'v-bmi' || v.label.toLowerCase().includes('bmi')
            ? { ...v, value: bmi }
            : v
        ),
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-4 sm:space-y-5"
    >
      {/* 1. DASHBOARD HERO BAR WITH TOP-LEFT CLUB LOGO, TOP-RIGHT SCHOOL LOGO & AUTO BARCODE PREVIEW */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        {report.header.showClubWatermark && (
          <div
            className="pointer-events-none select-none absolute right-1/3 top-1/2 -translate-y-1/2 hidden md:block"
            style={{ opacity: 0.05 }}
          >
            {report.header.leftClubLogoUrl ? (
              <img
                src={report.header.leftClubLogoUrl}
                alt="Club Watermark"
                className="w-40 h-40 object-contain"
              />
            ) : (
              <DefaultClubEmblemSvg
                accentColor={primaryColor}
                secondaryColor={secondaryColor}
                className="w-40 h-40"
              />
            )}
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* Left Corner: Club Logo + Watermark Control */}
          <div className="md:col-span-4 flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div
              onClick={() => clubInputRef.current?.click()}
              className="w-16 h-16 rounded-md border-2 bg-white flex items-center justify-center shrink-0 cursor-pointer overflow-hidden hover:border-blue-600 transition-colors"
              style={{ borderColor: primaryColor }}
              title="Tap to upload Club Logo (also used as A4 Watermark)"
            >
              {report.header.leftClubLogoUrl ? (
                <img
                  src={report.header.leftClubLogoUrl}
                  alt="Club Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <DefaultClubEmblemSvg
                  accentColor={primaryColor}
                  secondaryColor={secondaryColor}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-mono font-bold uppercase text-blue-700">
                Top-Left & Watermark
              </div>
              <input
                type="text"
                value={report.header.leftClubName}
                onChange={(e) =>
                  updateHeader({ leftClubName: e.target.value })
                }
                placeholder="Club Name..."
                className="w-full min-h-[36px] text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2.5 py-1 mt-0.5"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => clubInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-[11px] font-medium bg-slate-900 text-white rounded hover:bg-slate-800 whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Club Logo
                </button>
                {report.header.leftClubLogoUrl && (
                  <button
                    type="button"
                    onClick={() => updateHeader({ leftClubLogoUrl: undefined })}
                    className="p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-500 hover:text-red-600 bg-white border border-slate-300 rounded"
                    title="Reset Club Logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <input
              ref={clubInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoFile('leftClubLogoUrl', e)}
              className="hidden"
            />
          </div>

          {/* Center: School Logo (Top-Right on Report) */}
          <div className="md:col-span-4 flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div
              onClick={() => schoolInputRef.current?.click()}
              className="w-16 h-16 rounded-md border-2 bg-white flex items-center justify-center shrink-0 cursor-pointer overflow-hidden hover:border-blue-600 transition-colors"
              style={{ borderColor: primaryColor }}
              title="Tap to upload School Logo (Top-Right Corner)"
            >
              {report.header.rightSchoolLogoUrl ? (
                <img
                  src={report.header.rightSchoolLogoUrl}
                  alt="School Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <DefaultSchoolCrestSvg
                  accentColor={primaryColor}
                  secondaryColor={secondaryColor}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-mono font-bold uppercase text-indigo-700">
                Top-Right School Logo
              </div>
              <input
                type="text"
                value={report.header.rightSchoolName}
                onChange={(e) =>
                  updateHeader({ rightSchoolName: e.target.value })
                }
                placeholder="School Name..."
                className="w-full min-h-[36px] text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2.5 py-1 mt-0.5"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => schoolInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-[11px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  School Logo
                </button>
                {report.header.rightSchoolLogoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      updateHeader({ rightSchoolLogoUrl: undefined })
                    }
                    className="p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-500 hover:text-red-600 bg-white border border-slate-300 rounded"
                    title="Reset School Logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <input
              ref={schoolInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoFile('rightSchoolLogoUrl', e)}
              className="hidden"
            />
          </div>

          {/* Right: Live Auto-Barcode Preview + Generate Report CTA */}
          <div className="md:col-span-4 flex flex-col justify-between gap-2.5 p-3.5 rounded-lg bg-slate-900 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Barcode className="w-3.5 h-3.5" />
                  Live Auto-Barcode
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Encodes Report No. & Patient ID onto the A4 sheet.
                </p>
              </div>
              <AutoReportBarcode report={report} widthPx={116} heightPx={24} />
            </div>
            <button
              type="button"
              onClick={onGenerateReport}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-md transition-colors whitespace-nowrap"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              {isGenerating ? 'Generating...' : 'Generate A4 Report →'}
            </button>
          </div>
        </div>

        {/* Watermark & Barcode Settings Strip */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700 min-h-[32px]">
              <input
                type="checkbox"
                checked={report.header.showClubWatermark}
                onChange={(e) =>
                  updateHeader({ showClubWatermark: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              Club Logo as A4 Watermark
            </label>

            {report.header.showClubWatermark && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">Opacity:</span>
                <input
                  type="range"
                  min={0.04}
                  max={0.22}
                  step={0.01}
                  value={report.header.watermarkOpacity}
                  onChange={(e) =>
                    updateHeader({
                      watermarkOpacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-24 accent-blue-600"
                />
                <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                  {Math.round(report.header.watermarkOpacity * 100)}%
                </span>
              </div>
            )}

            <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700 min-h-[32px]">
              <input
                type="checkbox"
                checked={report.showBarcode}
                onChange={(e) =>
                  onChange({ ...report, showBarcode: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              Auto-Barcode on Report
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 mr-1">
              Theme:
            </span>
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  updateHeader({
                    brandTheme: t.id,
                    accentColor: t.primary,
                    secondaryAccentColor: t.secondary,
                  })
                }
                className={`px-2.5 py-1.5 min-h-[32px] text-[11px] font-medium rounded border transition-colors ${
                  report.header.accentColor === t.primary
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. PATIENT & REPORT DETAILS + HEADER TEXT EDITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Patient & Report No. Card */}
        <div className="lg:col-span-6 bg-white border border-slate-300 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h3 className="font-display text-sm font-bold text-slate-900">
              1. Patient & Report Identification
            </h3>
            <span className="text-[11px] text-slate-500">
              A4 Line & Auto-Barcode
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Patient Name
              </label>
              <input
                type="text"
                value={report.patient.patientName}
                onChange={(e) =>
                  updatePatient({ patientName: e.target.value })
                }
                placeholder="Enter Patient Name (or leave blank)"
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Age / Sex
              </label>
              <input
                type="text"
                value={report.patient.ageSex}
                onChange={(e) => updatePatient({ ageSex: e.target.value })}
                placeholder="e.g. 16 Yrs / Male"
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Date</label>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(
                      d.getMonth() + 1
                    ).padStart(2, '0')}/${d.getFullYear()}`;
                    updatePatient({ date: formatted });
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                >
                  <Calendar className="w-3 h-3" />
                  Set Today
                </button>
              </div>
              <input
                type="text"
                value={report.patient.date}
                onChange={(e) => updatePatient({ date: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Report No.
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const rand = Math.floor(1000 + Math.random() * 9000);
                    updatePatient({ reportNo: `REP-2026-${rand}` });
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                >
                  <Hash className="w-3 h-3" />
                  Auto No.
                </button>
              </div>
              <input
                type="text"
                value={report.patient.reportNo}
                onChange={(e) => updatePatient({ reportNo: e.target.value })}
                placeholder="e.g. REP-2026-101"
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-md font-mono font-semibold focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Report Header & Footer Details Card */}
        <div className="lg:col-span-6 bg-white border border-slate-300 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h3 className="font-display text-sm font-bold text-slate-900">
              2. Letterhead Title & Wave Footer Contact Info
            </h3>
            <span className="text-[11px] text-slate-500">
              Header & Bottom Wave
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Main Report Heading
              </label>
              <input
                type="text"
                value={report.header.labName}
                onChange={(e) => updateHeader({ labName: e.target.value })}
                className="w-full min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-md font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Department / Subtitle
              </label>
              <input
                type="text"
                value={report.header.subtitle}
                onChange={(e) => updateHeader({ subtitle: e.target.value })}
                className="w-full min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone / WhatsApp
              </label>
              <input
                type="text"
                value={report.header.phone}
                onChange={(e) => updateHeader({ phone: e.target.value })}
                className="w-full min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={report.header.website}
                onChange={(e) => updateHeader({ website: e.target.value })}
                className="w-full min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Campus / Clinic Address
              </label>
              <input
                type="text"
                value={report.header.address}
                onChange={(e) => updateHeader({ address: e.target.value })}
                className="w-full min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. VERTICAL PHYSICAL PARAMETERS MANAGER (RESPONSIVE CARDS ON MOBILE + TABLE ON LAPTOP) */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">
              3. Vertical Physical Parameters ({report.vitals.length} Rows)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit parameter names, enter values (or leave empty for blank boxes on A4), reorder, or add rows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={calculateBmiNow}
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
            >
              <Calculator className="w-3.5 h-3.5" />
              Auto BMI
            </button>

            <button
              type="button"
              onClick={clearAllValues}
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear Boxes
            </button>

            <button
              type="button"
              onClick={fillSampleValues}
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sample Data
            </button>

            <button
              type="button"
              onClick={() =>
                onChange({
                  ...report,
                  vitals: JSON.parse(
                    JSON.stringify(DEFAULT_VITALS_VERTICAL_BLANK)
                  ),
                })
              }
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset 12
            </button>

            <button
              type="button"
              onClick={addBlankRow}
              className="inline-flex items-center gap-1 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Row
            </button>
          </div>
        </div>

        {/* Quick-Add Physical Parameter Buttons */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="block text-[11px] font-semibold text-slate-600 mb-2">
            Quick-Add Extra Vertical Parameters (Tap to append row):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {EXTRA_PHYSICAL_ITEMS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addQuickParameter(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-md transition-colors"
              >
                <Plus className="w-3 h-3 text-blue-600 shrink-0" />
                {item.label} ({item.unit})
              </button>
            ))}
          </div>
        </div>

        {/* A. MOBILE & SMALL TABLET CARD LIST (< 768px) */}
        <div className="md:hidden space-y-2.5">
          {report.vitals.map((vital, idx) => (
            <div
              key={vital.id}
              className="p-3 border border-slate-200 rounded-lg bg-slate-50/60 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-500">
                  Row #{String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveRow(idx, -1)}
                    disabled={idx === 0}
                    className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(idx, 1)}
                    disabled={idx === report.vitals.length - 1}
                    className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateRow(vital, idx)}
                    className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {report.vitals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(vital.id)}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center bg-white border border-slate-200 rounded text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-12">
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">
                    Parameter Name
                  </label>
                  <input
                    type="text"
                    value={vital.label}
                    onChange={(e) =>
                      updateVital(vital.id, { label: e.target.value })
                    }
                    className="w-full min-h-[38px] px-2.5 py-1.5 font-semibold text-slate-900 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">
                    Observed Value
                  </label>
                  <input
                    type="text"
                    value={vital.value}
                    placeholder="Blank Box"
                    onChange={(e) =>
                      updateVital(vital.id, { value: e.target.value })
                    }
                    className="w-full min-h-[38px] px-2.5 py-1.5 font-mono font-bold text-slate-950 bg-white border-2 border-slate-300 rounded text-center tabular-nums"
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={vital.unit}
                    onChange={(e) =>
                      updateVital(vital.id, { unit: e.target.value })
                    }
                    className="w-full min-h-[38px] px-2.5 py-1.5 font-mono text-slate-700 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="col-span-12">
                  <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">
                    Standard Reference Range
                  </label>
                  <input
                    type="text"
                    value={vital.normalRange}
                    onChange={(e) =>
                      updateVital(vital.id, { normalRange: e.target.value })
                    }
                    className="w-full min-h-[36px] px-2.5 py-1 font-mono text-slate-600 bg-white border border-slate-300 rounded tabular-nums"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* B. LAPTOP & DESKTOP TABLE VIEW (>= 768px) */}
        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                <th className="py-2.5 pl-3 pr-2 w-12">S.No</th>
                <th className="py-2.5 px-2">Physical Parameter Name</th>
                <th className="py-2.5 px-2 w-44">
                  Value (Empty = Blank Box)
                </th>
                <th className="py-2.5 px-2 w-28">Unit</th>
                <th className="py-2.5 px-2 w-48">Standard Reference Range</th>
                <th className="py-2.5 pl-2 pr-3 w-28 text-right">
                  Row Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              <AnimatePresence initial={false}>
                {report.vitals.map((vital, idx) => (
                  <motion.tr
                    key={vital.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="hover:bg-slate-50/80"
                  >
                    <td className="py-2 pl-3 pr-2 font-mono font-semibold text-slate-400 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={vital.label}
                        onChange={(e) =>
                          updateVital(vital.id, { label: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 font-semibold text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                      />
                    </td>

                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={vital.value}
                        placeholder="Blank Box on A4"
                        onChange={(e) =>
                          updateVital(vital.id, { value: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 font-mono font-bold text-slate-950 bg-slate-50 border border-slate-300 rounded text-center focus:outline-none focus:border-blue-600 focus:bg-white tabular-nums"
                      />
                    </td>

                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={vital.unit}
                        onChange={(e) =>
                          updateVital(vital.id, { unit: e.target.value })
                        }
                        className="w-full px-2 py-1.5 font-mono text-slate-700 border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                      />
                    </td>

                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={vital.normalRange}
                        onChange={(e) =>
                          updateVital(vital.id, {
                            normalRange: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1.5 font-mono text-slate-600 border border-slate-300 rounded focus:outline-none focus:border-blue-600 tabular-nums"
                      />
                    </td>

                    <td className="py-2 pl-2 pr-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveRow(idx, -1)}
                          disabled={idx === 0}
                          title="Move Row Up"
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRow(idx, 1)}
                          disabled={idx === report.vitals.length - 1}
                          title="Move Row Down"
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateRow(vital, idx)}
                          title="Duplicate Row"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {report.vitals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(vital.id)}
                            title="Remove Row"
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. REMARKS, NON-MEDICAL DISCLAIMER & GENERATE BUTTON */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
          <div className="md:col-span-6">
            <label className="block font-semibold text-slate-700 mb-1">
              General Remarks / Fitness Notes (Optional)
            </label>
            <input
              type="text"
              value={report.generalRemarks}
              onChange={(e) =>
                onChange({ ...report, generalRemarks: e.target.value })
              }
              placeholder="Leave blank for write-in line, or type remarks..."
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="md:col-span-6">
            <label className="block font-semibold text-amber-900 mb-1">
              Bottom Disclaimer ("This is not for medical purpose")
            </label>
            <input
              type="text"
              value={report.nonMedicalDisclaimer}
              onChange={(e) =>
                onChange({ ...report, nonMedicalDisclaimer: e.target.value })
              }
              className="w-full min-h-[40px] px-3 py-2 border border-amber-300 bg-amber-50/50 text-amber-950 font-semibold rounded-md focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <span>A4 Row Density:</span>
            {(
              [
                { id: DensityMode.COMPACT, label: 'Compact' },
                { id: DensityMode.STANDARD, label: 'Standard' },
                { id: DensityMode.SPACIOUS, label: 'Spacious' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onChange({ ...report, density: d.id })}
                className={`px-3 py-1.5 min-h-[34px] rounded text-xs font-medium border ${
                  report.density === d.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onGenerateReport}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] text-sm font-display font-bold text-white bg-[#005493] hover:bg-[#003f70] rounded-lg shadow-md transition-transform active:scale-98"
          >
            <FileCheck2 className="w-4 h-4" />
            Generate A4 Report & Barcode →
          </button>
        </div>
      </div>
    </motion.div>
  );
};
