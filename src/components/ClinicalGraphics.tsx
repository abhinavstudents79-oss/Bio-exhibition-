import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { PathologyReport } from '../types/pathology';
import { encodeCode39Modules } from '../utils/localReportStorage';

export const DefaultClubEmblemSvg: React.FC<{
  accentColor: string;
  secondaryColor: string;
  className?: string;
}> = ({ accentColor, secondaryColor, className = 'w-12 h-12' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none">
    <circle
      cx="32"
      cy="32"
      r="28"
      fill={accentColor}
      fillOpacity="0.08"
      stroke={accentColor}
      strokeWidth="2.5"
    />
    <circle
      cx="32"
      cy="32"
      r="22"
      stroke={secondaryColor}
      strokeWidth="1.5"
      strokeDasharray="3 2"
    />
    <path
      d="M32 15L36.5 24.5L47 26L39.5 33.2L41.2 43.5L32 38.5L22.8 43.5L24.5 33.2L17 26L27.5 24.5L32 15Z"
      fill={secondaryColor}
      fillOpacity="0.2"
      stroke={accentColor}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M27 31H37M32 26V36"
      stroke={accentColor}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const DefaultSchoolCrestSvg: React.FC<{
  accentColor: string;
  secondaryColor: string;
  className?: string;
}> = ({ accentColor, secondaryColor, className = 'w-12 h-12' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none">
    <path
      d="M32 8L52 15V31C52 44.5 43.2 53.2 32 57C20.8 53.2 12 44.5 12 31V15L32 8Z"
      fill={accentColor}
      fillOpacity="0.08"
      stroke={accentColor}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M32 13L47 18.5V30.5C47 41 40.2 48.2 32 51.5C23.8 48.2 17 41 17 30.5V18.5L32 13Z"
      stroke={secondaryColor}
      strokeWidth="1.4"
    />
    <path
      d="M22 27C25 25.5 29 25.5 32 27.5C35 25.5 39 25.5 42 27V38C39 36.5 35 36.5 32 38.5C29 36.5 25 36.5 22 38V27Z"
      fill="#FFFFFF"
      stroke={accentColor}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <line
      x1="32"
      y1="27.5"
      x2="32"
      y2="38.5"
      stroke={accentColor}
      strokeWidth="1.8"
    />
  </svg>
);

export const CornerLogoSlot: React.FC<{
  side: 'left-club' | 'right-school';
  imageUrl?: string;
  label: string;
  accentColor: string;
  secondaryColor: string;
  isPreviewMode: boolean;
  onUploadLogo: (dataUrl: string) => void;
  onChangeLabel: (newLabel: string) => void;
}> = ({
  side,
  imageUrl,
  label,
  accentColor,
  secondaryColor,
  isPreviewMode,
  onUploadLogo,
  onChangeLabel,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center shrink-0 w-20 group relative">
      <div
        onClick={() => {
          if (!isPreviewMode) {
            fileInputRef.current?.click();
          }
        }}
        title={
          isPreviewMode
            ? label
            : `Click to upload ${side === 'left-club' ? 'Club Logo' : 'School Logo'}`
        }
        className={`w-16 h-16 rounded-md border-2 flex items-center justify-center bg-white overflow-hidden relative transition-all ${
          !isPreviewMode ? 'cursor-pointer hover:border-blue-600' : ''
        }`}
        style={{ borderColor: accentColor }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain p-1"
          />
        ) : side === 'left-club' ? (
          <DefaultClubEmblemSvg
            accentColor={accentColor}
            secondaryColor={secondaryColor}
          />
        ) : (
          <DefaultSchoolCrestSvg
            accentColor={accentColor}
            secondaryColor={secondaryColor}
          />
        )}

        {!isPreviewMode && (
          <div className="no-export no-print opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white text-[9px] font-medium text-center p-1">
            <Upload className="w-3.5 h-3.5 mb-0.5" />
            Upload Logo
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {side === 'left-club' && (
        <input
          type="text"
          value={label}
          readOnly={isPreviewMode}
          onChange={(e) => onChangeLabel(e.target.value)}
          aria-label="Club Logo Label"
          className="inline-edit-input font-display text-[9px] font-bold tracking-wider uppercase text-center text-slate-700 w-full mt-1 px-0.5"
        />
      )}
    </div>
  );
};

/**
 * Centered A4 Club Logo Watermark rendered behind the physical assessment table
 */
export const ClubWatermarkOverlay: React.FC<{
  clubLogoUrl?: string;
  clubName: string;
  accentColor: string;
  secondaryColor: string;
  opacity: number;
}> = ({ clubLogoUrl, clubName, accentColor, secondaryColor, opacity }) => {
  return (
    <div
      className="pointer-events-none select-none absolute inset-0 flex flex-col items-center justify-center z-0 overflow-hidden"
      style={{ opacity: Math.max(0.03, Math.min(0.3, opacity)) }}
    >
      {clubLogoUrl ? (
        <img
          src={clubLogoUrl}
          alt="Club Watermark"
          referrerPolicy="no-referrer"
          className="w-[320px] h-[320px] object-contain"
        />
      ) : (
        <DefaultClubEmblemSvg
          accentColor={accentColor}
          secondaryColor={secondaryColor}
          className="w-[310px] h-[310px]"
        />
      )}
      {clubName && (
        <span
          className="font-display text-2xl font-bold tracking-widest uppercase mt-2"
          style={{ color: accentColor }}
        >
          {clubName}
        </span>
      )}
    </div>
  );
};

/**
 * Auto-Generated Standard ISO Code-39 Scannable Linear Barcode driven by live Report Data
 */
export const AutoReportBarcode: React.FC<{
  report: PathologyReport;
  widthPx?: number;
  heightPx?: number;
}> = ({ report, widthPx = 164, heightPx = 32 }) => {
  const { cleanCode, modules, totalUnits } = encodeCode39Modules(
    report.patient.reportNo || 'REP-2026-101'
  );

  let cursor = 0;

  return (
    <div
      className="inline-flex flex-col items-center bg-white px-2.5 py-1.5 rounded border border-slate-300 shadow-2xs shrink-0"
      title={`Scannable Code-39 Barcode: *${cleanCode}*`}
    >
      <svg
        width={widthPx}
        height={heightPx}
        viewBox={`0 0 ${totalUnits} 32`}
        preserveAspectRatio="none"
        className="block"
      >
        <rect width={totalUnits} height={32} fill="#FFFFFF" />
        {modules.map((mod, idx) => {
          const x = cursor;
          cursor += mod.width;
          if (!mod.isBar) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={1}
              width={mod.width}
              height={30}
              fill="#000000"
            />
          );
        })}
      </svg>
      <span className="font-mono text-[9px] font-bold tracking-widest text-slate-800 mt-0.5 uppercase tabular-nums">
        *{cleanCode}*
      </span>
    </div>
  );
};

