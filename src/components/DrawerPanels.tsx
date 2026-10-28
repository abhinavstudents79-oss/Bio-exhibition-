import React, { useState } from 'react';
import {
  DensityMode,
  PathologyReport,
  VitalSignBox,
} from '../types/pathology';
import {
  DEFAULT_VITALS_VERTICAL_BLANK,
  EXTRA_PHYSICAL_ITEMS,
  PRESET_REPORTS,
} from '../data/presets';
import { X, Search, Plus, Upload, Check, Copy, Download, Trash2 } from 'lucide-react';

export type ActiveDrawer = 'templates' | 'catalog' | 'branding' | 'json' | null;

interface DrawerPanelsProps {
  activeDrawer: ActiveDrawer;
  report: PathologyReport;
  onClose: () => void;
  onSelectPreset: (preset: PathologyReport) => void;
  onAddVitalItem: (item: Omit<VitalSignBox, 'id'>) => void;
  onUpdateReport: (updated: PathologyReport) => void;
}

const BRAND_THEMES = [
  {
    id: 'oracare_blue' as const,
    name: 'Classic Letterhead Royal Blue & Silver Wave',
    primary: '#005493',
    secondary: '#94A3B8',
  },
  {
    id: 'redcliffe' as const,
    name: 'Redcliffe Smart Navy & Coral',
    primary: '#0A2540',
    secondary: '#E11D48',
  },
  {
    id: 'lalpath' as const,
    name: 'Lal PathLabs Blue & Gold',
    primary: '#004B8D',
    secondary: '#F59E0B',
  },
  {
    id: 'clinical' as const,
    name: 'Wellness Emerald Teal',
    primary: '#0F766E',
    secondary: '#10B981',
  },
  {
    id: 'monochrome' as const,
    name: 'Monochrome Laser Print',
    primary: '#18181B',
    secondary: '#71717A',
  },
];

export const DrawerPanels: React.FC<DrawerPanelsProps> = ({
  activeDrawer,
  report,
  onClose,
  onSelectPreset,
  onAddVitalItem,
  onUpdateReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(report, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!activeDrawer) return null;

  const filteredCatalog = EXTRA_PHYSICAL_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImageUpload = (
    field: 'leftClubLogoUrl' | 'rightSchoolLogoUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateReport({
          ...report,
          header: {
            ...report.header,
            [field]: reader.result,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex justify-end no-print">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              {activeDrawer === 'templates' &&
                'Vertical Physical Report Templates'}
              {activeDrawer === 'catalog' &&
                'Add Physical & Body Composition Parameters'}
              {activeDrawer === 'branding' &&
                'Club Logo, School Logo, Watermark & Barcode'}
              {activeDrawer === 'json' && 'Report JSON Schema Import / Export'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeDrawer === 'templates' &&
                'Switch between Blank Write-In Boxes or Sample Filled Vertical Physical Report.'}
              {activeDrawer === 'catalog' &&
                'Add extra vertical physical rows (Hydration, Bone Mass, Waist/Hip, Vision, etc.).'}
              {activeDrawer === 'branding' &&
                'Upload your Top-Left Club Logo (also A4 Watermark), Top-Right School Logo, and Barcode settings.'}
              {activeDrawer === 'json' &&
                'Save or restore structured report data.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* 1. TEMPLATES DRAWER */}
          {activeDrawer === 'templates' && (
            <div className="space-y-3">
              {Object.values(PRESET_REPORTS).map((preset) => (
                <div
                  key={preset.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-slate-400 transition-colors bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        {preset.templateName}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        {preset.vitals.length} Vertical Physical Rows (Weight,
                        Height, BMI, Pulse, BP, Blood Group, Body Fat, SpO₂,
                        Temp, Visceral Fat, Muscle, BMR)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPreset(JSON.parse(JSON.stringify(preset)));
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md whitespace-nowrap shrink-0"
                    >
                      Load Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. EXTRA PHYSICAL PARAMETER CATALOG DRAWER */}
          {activeDrawer === 'catalog' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search physical parameter (e.g., Hydration, Bone Mass, Waist, Vision)..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {filteredCatalog.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 tabular-nums">
                        Unit: {item.unit} · Ref: {item.normalRange}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddVitalItem(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Vertical Row
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. TOP-LEFT CLUB LOGO, WATERMARK, TOP-RIGHT SCHOOL LOGO & BRAND THEME */}
          {activeDrawer === 'branding' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {/* Left Corner: Club Logo */}
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/60 space-y-2">
                  <span className="block text-xs font-bold text-slate-800">
                    Top-Left & Watermark: Club Logo
                  </span>
                  <input
                    type="text"
                    value={report.header.leftClubName}
                    onChange={(e) =>
                      onUpdateReport({
                        ...report,
                        header: {
                          ...report.header,
                          leftClubName: e.target.value,
                        },
                      })
                    }
                    placeholder="Club Name / Label"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Club Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageUpload('leftClubLogoUrl', e)
                        }
                        className="hidden"
                      />
                    </label>
                    {report.header.leftClubLogoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateReport({
                            ...report,
                            header: {
                              ...report.header,
                              leftClubLogoUrl: undefined,
                            },
                          })
                        }
                        className="p-1.5 text-slate-500 hover:text-red-600 border border-slate-300 rounded bg-white"
                        title="Reset to Default Club Emblem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Corner: School Logo */}
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/60 space-y-2">
                  <span className="block text-xs font-bold text-slate-800">
                    Top-Right Corner: School Logo
                  </span>
                  <input
                    type="text"
                    value={report.header.rightSchoolName}
                    onChange={(e) =>
                      onUpdateReport({
                        ...report,
                        header: {
                          ...report.header,
                          rightSchoolName: e.target.value,
                        },
                      })
                    }
                    placeholder="School Name / Label"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Upload School Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageUpload('rightSchoolLogoUrl', e)
                        }
                        className="hidden"
                      />
                    </label>
                    {report.header.rightSchoolLogoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateReport({
                            ...report,
                            header: {
                              ...report.header,
                              rightSchoolLogoUrl: undefined,
                            },
                          })
                        }
                        className="p-1.5 text-slate-500 hover:text-red-600 border border-slate-300 rounded bg-white"
                        title="Reset to Default School Shield"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Watermark & Auto Barcode Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center justify-between p-2.5 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
                  <span className="text-xs font-medium text-slate-700">
                    Show Club Logo as Centered A4 Watermark
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(report.header.showClubWatermark)}
                    onChange={(e) =>
                      onUpdateReport({
                        ...report,
                        header: {
                          ...report.header,
                          showClubWatermark: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-slate-300 text-blue-600"
                  />
                </label>

                {report.header.showClubWatermark && (
                  <div className="flex items-center justify-between px-2.5 py-2 border border-slate-200 rounded-md bg-slate-50">
                    <span className="text-xs text-slate-700">
                      Club Logo Watermark Opacity
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0.04}
                        max={0.25}
                        step={0.01}
                        value={report.header.watermarkOpacity}
                        onChange={(e) =>
                          onUpdateReport({
                            ...report,
                            header: {
                              ...report.header,
                              watermarkOpacity: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-28 accent-blue-600"
                      />
                      <span className="font-mono text-xs text-slate-700 tabular-nums">
                        {Math.round(report.header.watermarkOpacity * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                <label className="flex items-center justify-between p-2.5 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
                  <span className="text-xs font-medium text-slate-700">
                    Auto-Create Linear Barcode on A4 Report
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(report.showBarcode)}
                    onChange={(e) =>
                      onUpdateReport({
                        ...report,
                        showBarcode: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-blue-600"
                  />
                </label>
              </div>

              {/* Letterhead Theme Palette */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  Letterhead Wave & Header Theme
                </label>
                <div className="space-y-2">
                  {BRAND_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() =>
                        onUpdateReport({
                          ...report,
                          header: {
                            ...report.header,
                            brandTheme: theme.id,
                            accentColor: theme.primary,
                            secondaryAccentColor: theme.secondary,
                          },
                        })
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md border ${
                        report.header.accentColor === theme.primary
                          ? 'border-blue-600 bg-blue-50/60 text-slate-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{theme.name}</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-4 h-4 rounded-xs"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <span
                          className="w-4 h-4 rounded-xs"
                          style={{ backgroundColor: theme.secondary }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Restore Default 12 Vertical Rows */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  Restore Default 12 Vertical Physical Rows
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateReport({
                      ...report,
                      vitals: JSON.parse(
                        JSON.stringify(DEFAULT_VITALS_VERTICAL_BLANK)
                      ),
                    })
                  }
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded text-slate-800 shrink-0"
                >
                  Restore 12 Rows
                </button>
              </div>

              {/* Row Spacing Density */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  Vertical Table Row Spacing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: DensityMode.COMPACT, label: 'Compact' },
                      { id: DensityMode.STANDARD, label: 'Standard A4' },
                      { id: DensityMode.SPACIOUS, label: 'Spacious' },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onUpdateReport({ ...report, density: d.id })}
                      className={`px-3 py-2 text-xs font-medium rounded-md border ${
                        report.density === d.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. JSON IMPORT / EXPORT DRAWER */}
          {activeDrawer === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  Structured Report JSON
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(jsonText);
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy JSON
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([jsonText], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${report.patient.reportNo || 'physical-report'}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save .json
                  </button>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError(null);
                }}
                rows={18}
                className="w-full font-mono text-[11px] p-3 border border-slate-300 rounded-md bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-600"
              />

              {jsonError && (
                <p className="text-xs text-red-600 font-medium">{jsonError}</p>
              )}

              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(jsonText) as PathologyReport;
                    if (
                      !parsed.header ||
                      !parsed.patient ||
                      !Array.isArray(parsed.vitals)
                    ) {
                      throw new Error(
                        'Missing required header, patient, or vitals fields.'
                      );
                    }
                    onUpdateReport(parsed);
                    onClose();
                  } catch (err) {
                    setJsonError(
                      err instanceof Error
                        ? err.message
                        : 'Invalid JSON structure.'
                    );
                  }
                }}
                className="w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Apply Imported JSON to A4 Sheet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
