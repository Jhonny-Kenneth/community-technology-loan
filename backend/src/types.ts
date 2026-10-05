/**
 * Shared domain and repository contracts.
 *
 * The REST API uses camelCase while the MySQL adapter is responsible for
 * mapping these properties to the database's snake_case column names.
 * Tenant IDs remain repository scope arguments and are intentionally not
 * exposed as fields on schema-backed resources.
 */

// -----------------------------------------------------------------------------
// Database enum values
// -----------------------------------------------------------------------------

export const DEVICE_TYPES = ["LAPTOP", "TABLET", "HOTSPOT"] as const;
export const DEVICE_STATUSES = ["AVAILABLE", "CHECKED_OUT", "MAINTENANCE"] as const;
export const LOAN_STATUSES = ["ACTIVE", "RETURNED", "OVERDUE"] as const;
export const MAINTENANCE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];
export type LoanStatus = (typeof LOAN_STATUSES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

// -----------------------------------------------------------------------------
// Schema-backed resources
// -----------------------------------------------------------------------------

/** API representation of a row from the devices table. */
export interface Device {
  deviceId: number;
  assetTag: string;
  serialNumber: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  status: DeviceStatus;
  centerId: number;
}

/** API representation of a row from the outreach_centers table. */
export interface OutreachCenter {
  centerId: number;
  centerName: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

/** API representation of a row from the loan_reasons table. */
export interface LoanReason {
  reasonId: number;
  reasonName: string;
}

/** API representation of a row from the loans table. */
export interface Loan {
  loanId: number;
  deviceId: number;
  centerId: number;
  reasonId: number;
  participantCode: string;
  checkoutDate: string;
  dueDate: string;
  returnDate: string | null;
  loanStatus: LoanStatus;
}

/** API representation of a row from the maintenance_records table. */
export interface MaintenanceRecord {
  maintenanceId: number;
  deviceId: number;
  issueDescription: string;
  serviceDate: string;
  resolvedDate: string | null;
  maintenanceStatus: MaintenanceStatus;
}

// -----------------------------------------------------------------------------
// Pagination and filter contracts
// -----------------------------------------------------------------------------

/** Cursor values are the last integer primary key returned by a page. */
export interface PageQuery {
  cursor?: number;
  limit: number;
}

export interface Page<T> {
  items: T[];
  nextCursor?: number;
}

export interface DeviceQuery extends PageQuery {
  deviceType?: DeviceType;
  status?: DeviceStatus;
  centerId?: number;
  assetTag?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  search?: string;
}

export interface CenterQuery extends PageQuery {
  isActive?: boolean;
  search?: string;
}

export interface LoanQuery extends PageQuery {
  loanStatus?: LoanStatus;
  centerId?: number;
  deviceId?: number;
  participantCode?: string;
  reasonId?: number;
  checkoutFrom?: string;
  checkoutTo?: string;
  dueFrom?: string;
  dueTo?: string;
}

export interface MaintenanceQuery extends PageQuery {
  deviceId?: number;
  maintenanceStatus?: MaintenanceStatus;
  serviceFrom?: string;
  serviceTo?: string;
  resolvedFrom?: string;
  resolvedTo?: string;
}

// -----------------------------------------------------------------------------
// Create and update inputs
// -----------------------------------------------------------------------------

export type CreateDevice = Omit<Device, "deviceId">;

/** Device status is excluded because loans and maintenance own transitions. */
export type UpdateDevice = Partial<Omit<Device, "deviceId" | "status">>;

export type CreateCenter = Pick<OutreachCenter, "centerName" | "address" | "phone" | "isActive">;
export type UpdateCenter = Partial<CreateCenter>;

/** Lifecycle fields are assigned by the checkout operation. */
export type CreateLoan = Pick<Loan, "deviceId" | "centerId" | "reasonId" | "participantCode" | "checkoutDate" | "dueDate">;

/** Loan lifecycle fields cannot be changed through the generic PATCH route. */
export type UpdateLoan = Pick<Partial<Loan>, "dueDate" | "reasonId">;

/** New maintenance records always begin with OPEN status. */
export type CreateMaintenance = Pick<MaintenanceRecord, "deviceId" | "issueDescription" | "serviceDate">;

/** RESOLVED is handled by the explicit resolve operation. */
export type UpdateMaintenance = {
  issueDescription?: string;
  maintenanceStatus?: "IN_PROGRESS";
};

// -----------------------------------------------------------------------------
// Repository boundary
// -----------------------------------------------------------------------------

/**
 * Persistence abstraction used by Fastify routes.
 *
 * Every operation receives a tenant ID to preserve the application's existing
 * tenant isolation. Implementations must not return records from another
 * tenant. MySQL implementations must make createLoan, returnLoan,
 * createMaintenance, and resolveMaintenance transactional.
 */
export interface InventoryRepository {
  listDevices(tenantId: string, query: DeviceQuery): Promise<Page<Device>>;
  getDevice(tenantId: string, deviceId: number): Promise<Device | undefined>;
  createDevice(tenantId: string, device: CreateDevice): Promise<Device>;
  updateDevice(tenantId: string, deviceId: number, patch: UpdateDevice): Promise<Device | undefined>;

  listCenters(tenantId: string, query: CenterQuery): Promise<Page<OutreachCenter>>;
  getCenter(tenantId: string, centerId: number): Promise<OutreachCenter | undefined>;
  createCenter(tenantId: string, center: CreateCenter): Promise<OutreachCenter>;
  updateCenter(tenantId: string, centerId: number, patch: UpdateCenter): Promise<OutreachCenter | undefined>;

  listLoans(tenantId: string, query: LoanQuery): Promise<Page<Loan>>;
  getLoan(tenantId: string, loanId: number): Promise<Loan | undefined>;
  createLoan(tenantId: string, loan: CreateLoan): Promise<Loan>;
  updateLoan(tenantId: string, loanId: number, patch: UpdateLoan): Promise<Loan | undefined>;
  returnLoan(tenantId: string, loanId: number, returnDate: string): Promise<Loan | undefined>;

  listLoanReasons(tenantId: string): Promise<LoanReason[]>;
  getLoanReason(tenantId: string, reasonId: number): Promise<LoanReason | undefined>;
  createLoanReason(tenantId: string, reasonName: string): Promise<LoanReason>;
  updateLoanReason(tenantId: string, reasonId: number, reasonName: string): Promise<LoanReason | undefined>;

  listMaintenance(tenantId: string, query: MaintenanceQuery): Promise<Page<MaintenanceRecord>>;
  getMaintenance(tenantId: string, maintenanceId: number): Promise<MaintenanceRecord | undefined>;
  createMaintenance(tenantId: string, record: CreateMaintenance): Promise<MaintenanceRecord>;
  updateMaintenance(tenantId: string, maintenanceId: number, patch: UpdateMaintenance): Promise<MaintenanceRecord | undefined>;
  resolveMaintenance(tenantId: string, maintenanceId: number, resolvedDate: string): Promise<MaintenanceRecord | undefined>;
}

// -----------------------------------------------------------------------------
// Safe repository errors handled by the API error handler
// -----------------------------------------------------------------------------

/** A uniqueness or invalid resource-state conflict safe to expose to clients. */
export class RepositoryConflict extends Error {
  statusCode = 409 as const;
}

/** A referenced or requested repository resource could not be found. */
export class RepositoryNotFound extends Error {
  statusCode = 404 as const;
}
