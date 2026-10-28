export enum DensityMode {
  COMPACT = 'COMPACT',
  STANDARD = 'STANDARD',
  SPACIOUS = 'SPACIOUS',
}

export enum WorkspaceViewMode {
  DASHBOARD = 'DASHBOARD',
  SPLIT_STUDIO = 'SPLIT_STUDIO',
  A4_REPORT = 'A4_REPORT',
}

export type ReportBrandTheme =
  | 'oracare_blue'
  | 'redcliffe'
  | 'lalpath'
  | 'clinical'
  | 'monochrome';

export interface VitalSignBox {
  id: string;
  label: string;
  value: string;
  unit: string;
  normalRange: string;
  remarks?: string;
}

export interface LabHeaderConfig {
  labName: string;
  subtitle: string;
  tagline: string;
  address: string;
  phone: string;
  website: string;
  leftClubLogoUrl?: string;
  leftClubName: string;
  rightSchoolLogoUrl?: string;
  rightSchoolName: string;
  brandTheme: ReportBrandTheme;
  accentColor: string;
  secondaryAccentColor: string;
  showClubWatermark: boolean;
  watermarkOpacity: number;
}

export interface PatientDemographics {
  patientName: string;
  ageSex: string;
  date: string;
  reportNo: string;
}

export interface PathologyReport {
  id: string;
  templateName: string;
  header: LabHeaderConfig;
  patient: PatientDemographics;
  vitalsTitle: string;
  vitals: VitalSignBox[];
  generalRemarks: string;
  nonMedicalDisclaimer: string;
  showReferenceColumn: boolean;
  showBarcode: boolean;
  density: DensityMode;
  lastGeneratedAt?: string;
}
