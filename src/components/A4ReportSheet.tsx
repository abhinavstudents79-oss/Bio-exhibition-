import React from 'react';
import {
  DensityMode,
  PathologyReport,
  VitalSignBox,
} from '../types/pathology';
import {
  AutoReportBarcode,
  ClubWatermarkOverlay,
  CornerLogoSlot,
} from './ClinicalGraphics';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Calculator,
  Phone,
  Globe,
  MapPin,
  AlertCircle,
} from 'lucide-react';

interface A4ReportSheetProps {
  report: PathologyReport;
  isPreviewMode: boolean;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  onChange: (updated: PathologyReport) => void;
  onOpenCatalog: () => void;
}

export const A4ReportSheet: React.FC<A4ReportSheetProps> = ({
  report,
  isPreviewMode,
  sheetRef,
  onChange,
  onOpenCatalog,
}) => {
  const primaryColor = report.header.accentColor || '#005493';
  const secondaryColor = report.header.secondaryAccentColor || '#94A3B8';

  const rowPadding =
    report.density === DensityMode.COMPACT
      ? 'py-1'
      : report.density === DensityMode.SPACIOUS
      ? 'py-2.5'
      : 'py-1.5';

  const updateHeader = (
    key: keyof PathologyReport['header'],
    val: string | boolean | number
  ) => {
    onChange({
      ...report,
      header: { ...report.header, [key]: val },
    });
  };

  const updatePatient = (
    key: keyof PathologyReport['patient'],
    val: string
  ) => {
    onChange({
      ...report,
      patient: { ...report.patient, [key]: val },
    });
  };

  /* Vertical Physical Vitals Management */
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

  const addVitalRow = () => {
    const newVital: VitalSignBox = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: 'New Physical Parameter',
      value: '',
      unit: 'Unit',
      normalRange: 'Standard Range',
      remarks: '',
    };
    onChange({ ...report, vitals: [...report.vitals, newVital] });
  };

  const duplicateVitalRow = (vital: VitalSignBox, index: number) => {
    const copy: VitalSignBox = {
      ...vital,
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    const next = [...report.vitals];
    next.splice(index + 1, 0, copy);
    onChange({ ...report, vitals: next });
  };

  const deleteVitalRow = (id: string) => {
    onChange({
      ...report,
      vitals: report.vitals.filter((v) => v.id !== id),
    });
  };

  const moveVitalRow = (index: number, direction: -1 | 1) => {
    const next = [...report.vitals];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    onChange({ ...report, vitals: next });
  };

  const autoCalculateBmiNow = () => {
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
    <div
      ref={sheetRef}
      className={`a4-sheet mx-auto shadow-md border border-slate-300 flex flex-col justify-between overflow-hidden relative ${
        isPreviewMode ? 'exporting-pdf' : ''
      }`}
    >
      {/* CENTERED CLUB LOGO WATERMARK BEHIND A4 CONTENT */}
      {report.header.showClubWatermark && (
        <ClubWatermarkOverlay
          clubLogoUrl={report.header.leftClubLogoUrl}
          clubName={report.header.leftClubName}
          accentColor={primaryColor}
          secondaryColor={secondaryColor}
          opacity={report.header.watermarkOpacity ?? 0.08}
        />
      )}

      {/* Subtle A4 297mm Page 1 Height Marker (Only visible when editing) */}
      {!isPreviewMode && (
        <div
          className="no-export no-print pointer-events-none absolute left-0 right-0 border-b border-dashed border-blue-400/60 flex justify-end pr-2 z-20"
          style={{ top: '1122px' }}
        >
          <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-t">
            A4 Page 1 Fold (210mm × 297mm)
          </span>
        </div>
      )}

      {/* ================= TOP SECTION ================= */}
      <div className="relative z-10">
        {/* 1. CREATIVE CURVED BANNER HEADER (Top-Left Club Logo & Top-Right School Logo) */}
        <div className="relative pt-5 pb-3 px-7 flex items-center justify-between gap-4 border-b border-slate-200">
          {/* Decorative Right Blue Banner Curve */}
          <div
            className="absolute top-3 right-0 bottom-2 w-[44%] rounded-l-full pointer-events-none"
            style={{
              backgroundColor: primaryColor,
              clipPath: 'polygon(12% 0%, 100% 0%, 100% 100%, 0% 100%, 8% 50%)',
            }}
          />

          {/* Top-Left Corner: Club Logo + Main Title */}
          <div className="relative z-10 flex items-center gap-3.5 w-[56%] pr-2">
            <CornerLogoSlot
              side="left-club"
              imageUrl={report.header.leftClubLogoUrl}
              label={report.header.leftClubName || 'CLUB LOGO'}
              accentColor={primaryColor}
              secondaryColor={secondaryColor}
              isPreviewMode={isPreviewMode}
              onUploadLogo={(dataUrl) =>
                updateHeader('leftClubLogoUrl', dataUrl)
              }
              onChangeLabel={(val) => updateHeader('leftClubName', val)}
            />

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={report.header.labName}
                readOnly={isPreviewMode}
                onChange={(e) => updateHeader('labName', e.target.value)}
                aria-label="Main Report Title"
                className="inline-edit-input font-display text-xl font-bold tracking-tight w-full px-1 -ml-1"
                style={{ color: primaryColor }}
              />
              <input
                type="text"
                value={report.header.subtitle}
                readOnly={isPreviewMode}
                onChange={(e) => updateHeader('subtitle', e.target.value)}
                aria-label="Report Subtitle"
                className="inline-edit-input text-[11px] font-bold tracking-wider uppercase text-slate-700 w-full px-1 -ml-1 mt-0.5"
              />
              <input
                type="text"
                value={report.header.tagline}
                readOnly={isPreviewMode}
                onChange={(e) => updateHeader('tagline', e.target.value)}
                aria-label="Tagline"
                className="inline-edit-input text-[9.5px] tracking-widest uppercase text-slate-400 w-full px-1 -ml-1 mt-0.5"
              />
            </div>
          </div>

          {/* Top-Right Corner (Inside Blue Banner): Institution Info + School Logo */}
          <div className="relative z-10 flex items-center justify-end gap-3 w-[42%] pl-6 text-white">
            <div className="text-right flex-1 min-w-0">
              <input
                type="text"
                value={report.header.rightSchoolName}
                readOnly={isPreviewMode}
                onChange={(e) =>
                  updateHeader('rightSchoolName', e.target.value)
                }
                className="bg-transparent font-display text-xs font-bold tracking-wide text-white text-right w-full px-1 focus:outline-none focus:bg-white/10 rounded"
              />
              <input
                type="text"
                value={report.header.address}
                readOnly={isPreviewMode}
                onChange={(e) => updateHeader('address', e.target.value)}
                className="bg-transparent text-[10px] text-white/90 text-right w-full px-1 mt-0.5 focus:outline-none focus:bg-white/10 rounded"
              />
              <input
                type="text"
                value={report.header.phone}
                readOnly={isPreviewMode}
                onChange={(e) => updateHeader('phone', e.target.value)}
                className="bg-transparent font-mono text-[10px] text-white/90 text-right w-full px-1 mt-0.5 focus:outline-none focus:bg-white/10 rounded tabular-nums"
              />
            </div>

            <div className="bg-white p-1 rounded-md shadow-xs shrink-0">
              <CornerLogoSlot
                side="right-school"
                imageUrl={report.header.rightSchoolLogoUrl}
                label="SCHOOL LOGO"
                accentColor={primaryColor}
                secondaryColor={secondaryColor}
                isPreviewMode={isPreviewMode}
                onUploadLogo={(dataUrl) =>
                  updateHeader('rightSchoolLogoUrl', dataUrl)
                }
                onChangeLabel={(val) => updateHeader('rightSchoolName', val)}
              />
            </div>
          </div>
        </div>

        {/* 2. PATIENT DETAILS LINE (Patient Name, Age/Sex, Date, Report No.) */}
        <div className="px-8 pt-3.5 pb-2.5">
          <div className="grid grid-cols-12 gap-4 items-end text-xs text-slate-800">
            {/* Patient Name */}
            <div className="col-span-4 flex items-end gap-1.5">
              <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                Patient Name:
              </span>
              <input
                type="text"
                value={report.patient.patientName}
                readOnly={isPreviewMode}
                placeholder=""
                onChange={(e) => updatePatient('patientName', e.target.value)}
                className="w-full px-1.5 py-0.5 text-xs font-semibold text-slate-950 border-b-2 border-dotted border-slate-500 bg-transparent focus:outline-none focus:border-blue-600 focus:bg-blue-50/40"
              />
            </div>

            {/* Age / Sex */}
            <div className="col-span-3 flex items-end gap-1.5">
              <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                Age/Sex:
              </span>
              <input
                type="text"
                value={report.patient.ageSex}
                readOnly={isPreviewMode}
                placeholder=""
                onChange={(e) => updatePatient('ageSex', e.target.value)}
                className="w-full px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-950 border-b-2 border-dotted border-slate-500 bg-transparent focus:outline-none focus:border-blue-600 focus:bg-blue-50/40 tabular-nums"
              />
            </div>

            {/* Date */}
            <div className="col-span-2 flex items-end gap-1.5">
              <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                Date:
              </span>
              <input
                type="text"
                value={report.patient.date}
                readOnly={isPreviewMode}
                placeholder=""
                onChange={(e) => updatePatient('date', e.target.value)}
                className="w-full px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-950 border-b-2 border-dotted border-slate-500 bg-transparent focus:outline-none focus:border-blue-600 focus:bg-blue-50/40 tabular-nums"
              />
            </div>

            {/* Report No. */}
            <div className="col-span-3 flex items-end gap-1.5">
              <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                Report No.:
              </span>
              <input
                type="text"
                value={report.patient.reportNo}
                readOnly={isPreviewMode}
                placeholder=""
                onChange={(e) => updatePatient('reportNo', e.target.value)}
                className="w-full px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-950 border-b-2 border-dotted border-slate-500 bg-transparent focus:outline-none focus:border-blue-600 focus:bg-blue-50/40 tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* 3. ALL PHYSICAL PARAMETERS IN VERTICAL LAYOUT */}
        <div className="px-8 pt-1.5">
          {/* Vertical Table Section Banner */}
          <div
            className="px-3.5 py-2 rounded-t-sm flex items-center justify-between gap-2 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <input
              type="text"
              value={report.vitalsTitle}
              readOnly={isPreviewMode}
              onChange={(e) =>
                onChange({ ...report, vitalsTitle: e.target.value })
              }
              className="bg-transparent font-display text-xs font-bold tracking-wider uppercase text-white w-full focus:outline-none"
            />

            {!isPreviewMode && (
              <div className="no-export no-print flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={autoCalculateBmiNow}
                  title="Calculate BMI from Weight (kg) and Height (cm)"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-white/15 hover:bg-white/25 text-white rounded whitespace-nowrap"
                >
                  <Calculator className="w-3 h-3" />
                  Auto BMI
                </button>
                <button
                  type="button"
                  onClick={onOpenCatalog}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-white/15 hover:bg-white/25 text-white rounded whitespace-nowrap"
                >
                  + Catalog Item
                </button>
                <button
                  type="button"
                  onClick={addVitalRow}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  Add Row
                </button>
              </div>
            )}
          </div>

          {/* VERTICAL TABLE OF PHYSICAL PARAMETERS & BLANK BOXES */}
          <div className="border border-t-0 border-slate-300 rounded-b-sm overflow-hidden bg-white/75">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-300 text-[10.5px] font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-2 pl-3 pr-2 w-[8%]">S.No</th>
                  <th className="py-2 px-2 w-[34%]">Physical Parameter</th>
                  <th className="py-2 px-2 w-[22%] text-center">
                    Observed Value Box
                  </th>
                  <th className="py-2 px-2 w-[12%]">Unit</th>
                  {report.showReferenceColumn && (
                    <th className="py-2 pl-2 pr-3 w-[24%] text-right">
                      Standard Reference Range
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/90 text-xs">
                {report.vitals.map((vital, idx) => (
                  <tr
                    key={vital.id}
                    className="group hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Serial Number */}
                    <td
                      className={`${rowPadding} pl-3 pr-2 font-mono text-[11px] font-semibold text-slate-400 tabular-nums`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    {/* Physical Parameter Name */}
                    <td className={`${rowPadding} px-2`}>
                      <input
                        type="text"
                        value={vital.label}
                        readOnly={isPreviewMode}
                        onChange={(e) =>
                          updateVital(vital.id, { label: e.target.value })
                        }
                        className="inline-edit-input font-display text-xs font-bold text-slate-900 w-full px-1"
                      />
                    </td>

                    {/* Prominent Blank / Editable Box */}
                    <td className={`${rowPadding} px-2 text-center`}>
                      <input
                        type="text"
                        value={vital.value}
                        readOnly={isPreviewMode}
                        placeholder=""
                        onChange={(e) =>
                          updateVital(vital.id, { value: e.target.value })
                        }
                        aria-label={vital.label}
                        className="w-full h-7 px-2.5 font-mono text-xs font-bold text-slate-950 bg-white/90 border-2 border-slate-400 rounded-xs text-center focus:outline-none focus:border-blue-600 focus:bg-white tabular-nums"
                      />
                    </td>

                    {/* Unit */}
                    <td className={`${rowPadding} px-2`}>
                      <input
                        type="text"
                        value={vital.unit}
                        readOnly={isPreviewMode}
                        onChange={(e) =>
                          updateVital(vital.id, { unit: e.target.value })
                        }
                        className="inline-edit-input font-mono text-xs font-semibold text-slate-600 w-full px-1"
                      />
                    </td>

                    {/* Reference Range + Row Hover Controls */}
                    {report.showReferenceColumn && (
                      <td
                        className={`${rowPadding} pl-2 pr-3 text-right relative`}
                      >
                        <input
                          type="text"
                          value={vital.normalRange}
                          readOnly={isPreviewMode}
                          onChange={(e) =>
                            updateVital(vital.id, {
                              normalRange: e.target.value,
                            })
                          }
                          className="inline-edit-input font-mono text-[11px] text-slate-600 text-right w-full px-1 tabular-nums"
                        />

                        {!isPreviewMode && (
                          <div className="no-export no-print hidden group-hover:flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 bg-white border border-slate-300 shadow-xs rounded px-1 py-0.5 z-10">
                            <button
                              type="button"
                              onClick={() => moveVitalRow(idx, -1)}
                              disabled={idx === 0}
                              title="Move Up"
                              className="p-0.5 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveVitalRow(idx, 1)}
                              disabled={idx === report.vitals.length - 1}
                              title="Move Down"
                              className="p-0.5 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateVitalRow(vital, idx)}
                              title="Duplicate Row"
                              className="p-0.5 text-slate-500 hover:text-slate-900"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {report.vitals.length > 1 && (
                              <button
                                type="button"
                                onClick={() => deleteVitalRow(vital.id)}
                                title="Delete Row"
                                className="p-0.5 text-slate-500 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM SECTION (AUTO BARCODE + NOT FOR MEDICAL PURPOSE + CURVED WAVE FOOTER) ================= */}
      <div className="relative z-10 mt-3">
        {/* Remarks + Auto Barcode Row */}
        <div className="mx-8 mb-2.5 flex items-end justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* General Observation / Notes Box */}
            <div className="flex items-center gap-2 border border-slate-300 rounded-xs px-3 py-1.5 bg-slate-50/80">
              <span className="font-display text-xs font-bold text-slate-700 whitespace-nowrap shrink-0">
                General Remarks / Notes:
              </span>
              <input
                type="text"
                value={report.generalRemarks}
                readOnly={isPreviewMode}
                placeholder=""
                onChange={(e) =>
                  onChange({ ...report, generalRemarks: e.target.value })
                }
                className="w-full text-xs text-slate-800 bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Mandatory Non-Medical Purpose Banner */}
            <div className="px-3 py-1.5 bg-amber-50/95 border border-amber-300 rounded-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <input
                type="text"
                value={report.nonMedicalDisclaimer}
                readOnly={isPreviewMode}
                onChange={(e) =>
                  onChange({ ...report, nonMedicalDisclaimer: e.target.value })
                }
                aria-label="Non-medical purpose disclaimer"
                className="inline-edit-input font-display text-[10.5px] font-bold tracking-wide text-amber-950 w-full px-1"
              />
            </div>
          </div>

          {/* Auto-Created Barcode on Report */}
          {report.showBarcode && (
            <AutoReportBarcode report={report} widthPx={156} heightPx={32} />
          )}
        </div>

        {/* Curved Wave Footer (Inspired by Reference Image) */}
        <div className="relative pt-7 pb-3.5 px-8 text-white overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 794 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,28 C210,-10 490,65 794,14 L794,120 L0,120 Z"
              fill={secondaryColor}
              fillOpacity="0.55"
            />
            <path
              d="M0,36 C230,2 510,76 794,26 L794,120 L0,120 Z"
              fill={primaryColor}
            />
          </svg>

          <div className="relative z-10 flex items-end justify-between gap-4 pt-2">
            <div className="space-y-0.5 flex-1">
              <input
                type="text"
                value={report.header.labName}
                readOnly={isPreviewMode}
                onChange={(e) => updateHeader('labName', e.target.value)}
                className="bg-transparent font-display text-sm font-bold text-white w-full px-1 -ml-1 focus:outline-none focus:bg-white/10 rounded"
              />
              <div className="flex items-center gap-1.5 text-xs text-white/95">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <input
                  type="text"
                  value={report.header.phone}
                  readOnly={isPreviewMode}
                  onChange={(e) => updateHeader('phone', e.target.value)}
                  className="bg-transparent font-mono font-semibold text-white w-56 px-1 focus:outline-none focus:bg-white/10 rounded tabular-nums"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/90">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <input
                  type="text"
                  value={report.header.website}
                  readOnly={isPreviewMode}
                  onChange={(e) => updateHeader('website', e.target.value)}
                  className="bg-transparent text-white w-64 px-1 focus:outline-none focus:bg-white/10 rounded"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/90">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <input
                  type="text"
                  value={report.header.address}
                  readOnly={isPreviewMode}
                  onChange={(e) => updateHeader('address', e.target.value)}
                  className="bg-transparent text-white w-96 px-1 focus:outline-none focus:bg-white/10 rounded"
                />
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-1 rounded bg-white/15 font-mono text-[10px] font-bold tracking-wider uppercase text-white">
                THIS IS NOT FOR MEDICAL PURPOSE
              </span>
              <div className="font-mono text-[9.5px] text-white/75 mt-1 tabular-nums">
                ISO-A4 (210 × 297 mm)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
