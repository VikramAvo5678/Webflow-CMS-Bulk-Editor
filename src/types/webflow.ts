export interface WebflowSite {
  id: string;
  workspaceId: string;
  displayName: string;
  shortName: string;
  previewUrl: string;
  timeZone: string;
  createdOn: string;
  lastUpdated: string;
  lastPublished?: string;
}

export interface WebflowCollection {
  id: string;
  siteId: string;
  displayName: string;
  singularName: string;
  slug: string;
  createdOn: string;
  lastUpdated: string;
  fields?: WebflowField[]; // embedded in collection detail response
}

export type FieldType =
  | "PlainText"
  | "RichText"
  | "Number"
  | "Email"
  | "Phone"
  | "Link"
  | "Date"
  | "Switch"
  | "Color"
  | "Option"
  | "ImageRef"
  | "Image"      // Webflow v2 API returns this for image fields
  | "FileRef"
  | "File"       // Webflow v2 API returns this for file fields
  | "ItemRef"
  | "ItemRefSet";

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  collectionId?: string; // for Reference fields
  options?: FieldOption[]; // for Option fields
}

export interface FieldOption {
  id: string;
  name: string;
}

export interface WebflowField {
  id: string;
  isEditable: boolean;
  isRequired: boolean;
  type: FieldType;
  slug: string;
  displayName: string;
  helpText?: string;
  validations?: FieldValidation;
}

export interface WebflowItem {
  id: string;
  cmsLocaleId: string;
  lastPublished?: string;
  lastUpdated: string;
  createdOn: string;
  isArchived: boolean;
  isDraft: boolean;
  fieldData: Record<string, unknown>;
}

export interface WebflowPaginatedResponse<T> {
  items: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface CreateCollectionPayload {
  displayName: string;
  singularName: string;
  slug: string;
}

export interface UpdateCollectionPayload {
  displayName?: string;
  singularName?: string;
  slug?: string;
}

export interface CreateFieldPayload {
  isRequired: boolean;
  type: FieldType;
  displayName: string;
  helpText?: string;
  validations?: FieldValidation;
}

export interface UpdateFieldPayload extends Partial<CreateFieldPayload> {
  slug?: string;
}

export interface CreateItemPayload {
  isArchived?: boolean;
  isDraft?: boolean;
  fieldData: Record<string, unknown>;
}

export interface UpdateItemPayload extends Partial<CreateItemPayload> {}

export interface ConnectionState {
  token: string | null;
  selectedSiteId: string | null;
  selectedSiteName: string | null;
  isConnected: boolean;
}
